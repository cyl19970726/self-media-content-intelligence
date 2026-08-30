import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const importPattern = /(?:from\s+|import\s*\()(["'])([^"']+)\1/gu;
const layerRank = new Map([
  ["shared", 0],
  ["entities", 1],
  ["features", 2],
  ["routes", 3],
  ["app", 4]
]);

function layerOf(file) {
  return file.startsWith("apps/web/src/") ? file.split("/")[3] ?? null : null;
}

function resolveImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
}

export function validateFrontendArchitecture(files) {
  const failures = [];
  const frontendFiles = [...files.keys()].filter((file) =>
    file.startsWith("apps/web/src/") || file.startsWith("src/client/"));

  for (const file of frontendFiles) {
    if (file.startsWith("src/client/")) {
      failures.push(`${file}: transitional src/client ownership is forbidden`);
      continue;
    }
    const sourceLayer = layerOf(file);
    if (file !== "apps/web/src/main.tsx" && !layerRank.has(sourceLayer)) {
      failures.push(`${file}: source must belong to app, routes, features, entities, or shared`);
    }
    const contents = files.get(file) ?? "";
    for (const match of contents.matchAll(importPattern)) {
      const specifier = match[2];
      if (!specifier) continue;
      const resolved = resolveImport(file, specifier);
      if (!resolved) continue;
      if (resolved.startsWith("src/") || resolved.startsWith("apps/") && !resolved.startsWith("apps/web/src/")) {
        failures.push(`${file}: Web cannot import application or legacy source via ${specifier}`);
        continue;
      }
      if (!resolved.startsWith("apps/web/src/") || file === "apps/web/src/main.tsx") continue;
      const targetLayer = layerOf(resolved);
      if (!layerRank.has(sourceLayer) || !layerRank.has(targetLayer)) continue;
      if ((layerRank.get(targetLayer) ?? 99) > (layerRank.get(sourceLayer) ?? -1)) {
        failures.push(`${file}: ${sourceLayer} cannot depend upward on ${targetLayer} via ${specifier}`);
      }
      if (sourceLayer === "features" && targetLayer === "features") {
        const sourceFeature = file.split("/")[4];
        const targetFeature = resolved.split("/")[4];
        if (sourceFeature !== targetFeature) {
          failures.push(`${file}: feature internals cannot cross-import ${targetFeature} via ${specifier}`);
        }
      }
    }
  }
  return { checkedFiles: frontendFiles.length, failures };
}

function repositoryFrontendFiles(root) {
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8"
  }).split("\n").filter(Boolean)
    .filter((file) => /\.(?:ts|tsx)$/u.test(file))
    .filter((file) => fs.existsSync(path.join(root, file)));
  return new Map(paths.map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]));
}

function main() {
  const result = validateFrontendArchitecture(repositoryFrontendFiles(process.cwd()));
  if (result.failures.length > 0) {
    console.error("Frontend architecture violations:\n" + result.failures.map((item) => `- ${item}`).join("\n"));
    process.exit(1);
  }
  console.log(`Frontend architecture boundaries are valid (${result.checkedFiles} files checked).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
