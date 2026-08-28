import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = ["README.md", "docs", "specs"];
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
