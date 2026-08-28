import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = process.env.REPOSITORY_POLICY_BASE?.trim();

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

function addedFiles() {
  if (base && !/^0+$/u.test(base)) {
    try {
      return git(["diff", "--diff-filter=A", "--name-only", `${base}...HEAD`]).split("\n").filter(Boolean);
    } catch {
      console.error(`Cannot compare repository policy with base ${base}.`);
      process.exit(1);
    }
  }

  const staged = git(["diff", "--cached", "--diff-filter=A", "--name-only"]).split("\n").filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  return [...new Set([...staged, ...untracked])];
}

const forbiddenTrees = [".runtime/", ".playwright-mcp/", "dist/", "dist-server/"];
const rootGenerated = /^(?:[^/]+\.(?:png|jpe?g|ya?ml)|handoff-[^/]+\.md)$/iu;
const failures = [];

for (const relative of addedFiles()) {
  const normalized = relative.replaceAll("\\", "/");
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  const bytes = fs.statSync(absolute).size;

  if (forbiddenTrees.some((prefix) => normalized.startsWith(prefix))) {
    failures.push(`${relative}: generated/runtime directory is not source controlled`);
  }
  if (rootGenerated.test(normalized)) {
    failures.push(`${relative}: generated captures and handoff files do not belong at repository root`);
  }
  if (normalized.startsWith("artifacts/")) {
    failures.push(`${relative}: artifacts/ is retired; use external Evidence, fixtures/, or examples/`);
  }
  if (bytes > 5 * 1024 * 1024) {
    failures.push(`${relative}: ${(bytes / 1024 / 1024).toFixed(1)} MiB exceeds the 5 MiB repository limit`);
  }
}

if (failures.length > 0) {
  console.error("Repository policy violations:\n" + failures.map((item) => `- ${item}`).join("\n"));
  console.error("See docs/architecture/evidence-storage.md for placement and migration rules.");
  process.exit(1);
}

console.log("New files satisfy repository policy.");
