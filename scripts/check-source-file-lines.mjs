import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const maxLines = 1000;
const sourceRoots = ["apps/", "packages/", "scripts/", "src/"];
const sourceExtensions = new Set([
  ".cjs", ".css", ".js", ".jsx", ".less", ".mjs", ".sass", ".scss", ".ts", ".tsx"
]);

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8"
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => fs.existsSync(path.join(root, file)))
  .filter((file) => sourceRoots.some((prefix) => file.startsWith(prefix)))
  .filter((file) => sourceExtensions.has(path.extname(file).toLowerCase()));

const failures = trackedFiles.flatMap((file) => {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  const lines = content.length === 0 ? 0 : content.split(/\r?\n/u).length;
  return lines > maxLines ? [`${file}: ${lines} lines (limit: ${maxLines})`] : [];
});

if (failures.length > 0) {
  console.error("Source file line-limit violations:\n" + failures.map((item) => `- ${item}`).join("\n"));
  console.error("Split by domain responsibility before merging.");
  process.exit(1);
}

console.log(`Source files satisfy the ${maxLines}-line limit (${trackedFiles.length} files checked).`);
