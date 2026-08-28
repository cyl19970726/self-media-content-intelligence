import { execFileSync } from "node:child_process";

const root = process.cwd();
const baseline = { files: 0, bytes: 0 };

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

function artifactTreeish() {
  try {
    execFileSync("git", ["diff", "--cached", "--quiet", "--", "artifacts"], { cwd: root, stdio: "ignore" });
    return "HEAD";
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 1) return git(["write-tree"]);
    throw error;
  }
}

const rows = git(["ls-tree", "-rl", artifactTreeish(), "artifacts"]).split("\n").filter(Boolean).map((line) => {
  const match = line.match(/^\d+\s+blob\s+[0-9a-f]+\s+(\d+)\t(.+)$/u);
  if (!match) throw new Error(`cannot parse artifact tree entry: ${line}`);
  return { bytes: Number(match[1]), path: match[2] };
});
const totals = { files: rows.length, bytes: rows.reduce((sum, row) => sum + row.bytes, 0) };
const failures = [];
if (totals.files > baseline.files) failures.push(`tracked artifact count grew from ${baseline.files} to ${totals.files}`);
if (totals.bytes > baseline.bytes) failures.push(`tracked artifact bytes grew from ${baseline.bytes} to ${totals.bytes}`);

const base = process.env.REPOSITORY_POLICY_BASE?.trim();
if (base && !/^0+$/u.test(base)) {
  const added = git(["diff", "--diff-filter=A", "--name-only", `${base}...HEAD`, "--", "artifacts"])
    .split("\n").filter(Boolean);
  for (const file of added) failures.push(`${file}: new research Evidence must use the external Evidence contract`);
}

if (failures.length > 0) {
  console.error("Artifact budget violations:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Artifact budget is non-growing (${totals.files} files, ${totals.bytes} bytes).`);
