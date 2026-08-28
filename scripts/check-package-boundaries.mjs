import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceFiles = execFileSync("git", ["ls-files", "*.ts", "*.tsx"], {
  cwd: root,
  encoding: "utf8"
}).split("\n").filter(Boolean);
const failures = [];
const importPattern = /(?:from\s+|import\s*\()(["'])([^"']+)\1/gu;

function resolvedImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
}

for (const file of sourceFiles) {
  const contents = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of contents.matchAll(importPattern)) {
    const specifier = match[2];
    if (!specifier) continue;
    const resolved = resolvedImport(file, specifier);

    if (file.startsWith("packages/") && !file.endsWith(".test.ts") && resolved) {
      if (resolved.startsWith("src/") || resolved.startsWith("apps/")) {
        failures.push(`${file}: domain package imports legacy/application code via ${specifier}`);
      }
      const ownPackage = file.split("/").slice(0, 2).join("/");
      if (resolved.startsWith("packages/") && !resolved.startsWith(`${ownPackage}/`)
        && !/^packages\/[^/]+\/(?:index|contracts)(?:\.js)?$/u.test(resolved)) {
        failures.push(`${file}: cross-package imports must use the package public index (${specifier})`);
      }
    }

    if (!file.startsWith("packages/") && resolved && /^packages\/[^/]+\/src\//u.test(resolved)) {
      failures.push(`${file}: package internals are private; import its public index (${specifier})`);
    }

    if ((file.startsWith("src/client/") || file.startsWith("apps/web/")) && resolved?.startsWith("packages/")) {
      const browserSafe = /^packages\/contracts\/(?:index(?:\.js)?)?$/u.test(resolved)
        || /^packages\/(?:research|knowledge|creation)\/contracts(?:\.js)?$/u.test(resolved);
      if (!browserSafe) failures.push(`${file}: Web code may import only browser-safe contract entrypoints (${specifier})`);
    }

    if (specifier.includes("modules/content-knowledge") || specifier.includes("modules/publishing")
      || specifier.includes("shared/research-learning")) {
      failures.push(`${file}: imports a removed compatibility path (${specifier})`);
    }
  }
}

for (const packageName of ["contracts", "knowledge", "creation", "runtime", "research", "adapters", "testkit"]) {
  const packageRoot = path.join(root, "packages", packageName);
  if (!fs.existsSync(path.join(packageRoot, "package.json")) || !fs.existsSync(path.join(packageRoot, "index.ts"))) {
    failures.push(`packages/${packageName}: workspace requires package.json and public index.ts`);
  }
}

if (failures.length > 0) {
  console.error("Package boundary violations:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Package boundaries satisfy the protected dependency rules.");
