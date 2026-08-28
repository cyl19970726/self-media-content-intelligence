import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = ["README.md", "docs"];
const markdownLink = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;

function markdownFiles(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return target.endsWith(".md") ? [absolute] : [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    return entry.isDirectory() ? markdownFiles(child) : entry.name.endsWith(".md") ? [path.join(root, child)] : [];
  });
}

function localTarget(rawTarget, source) {
  const withoutTitle = rawTarget.trim().replace(/^<|>$/g, "").split(/\s+["']/u, 1)[0];
  if (!withoutTitle || withoutTitle.startsWith("#")) return null;
  if (/^(?:[a-z]+:|\/\/)/iu.test(withoutTitle)) return null;
  const decoded = decodeURIComponent(withoutTitle.split("#", 1)[0]);
  return path.resolve(path.dirname(source), decoded);
}

const failures = [];
if (fs.existsSync(path.join(root, "specs"))) {
  failures.push("specs/: initiative records must be classified under docs/initiatives/active or completed");
}

for (const required of [
  "docs/product/current-product.md",
  "docs/architecture/package-boundaries.md",
  "docs/initiative-inventory.md",
  "docs/initiatives/README.md"
]) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`${required}: required documentation truth source is missing`);
}

const completedRoot = path.join(root, "docs/initiatives/completed");
if (fs.existsSync(completedRoot)) {
  for (const entry of fs.readdirSync(completedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const taskFile = path.join(completedRoot, entry.name, "tasks.md");
    if (!fs.existsSync(taskFile)) {
      failures.push(`docs/initiatives/completed/${entry.name}: completed initiative requires tasks.md`);
      continue;
    }
    if (/^- \[ \]/mu.test(fs.readFileSync(taskFile, "utf8"))) {
      failures.push(`docs/initiatives/completed/${entry.name}/tasks.md: unchecked work belongs in an active initiative or Issue`);
    }
  }
}

for (const file of roots.flatMap(markdownFiles)) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(markdownLink)) {
    const target = localTarget(match[1], file);
    if (target && !fs.existsSync(target)) {
      const line = content.slice(0, match.index).split("\n").length;
      failures.push(`${path.relative(root, file)}:${line} -> ${match[1]}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Broken local Markdown links:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Documentation links resolve.");
