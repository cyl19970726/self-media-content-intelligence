import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root, encoding: "utf8"
}).split("\n").filter((file) => /\.(?:ts|tsx)$/u.test(file)
  && /^(?:apps|packages|src)\//u.test(file)
  && fs.existsSync(path.join(root, file))
  && !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file));

const failures = [];
const privilegedImports = new Set([
  "src/server/analysis-knowledge-compiler.ts",
  "src/server/research-knowledge-compiler.ts",
  "src/server/app.ts",
  "src/server/composition-root.ts",
  "src/server/content-knowledge.ts",
  "src/server/knowledge-backfill.ts",
  "src/server/knowledge-recovery.ts",
  "src/server/routes/knowledge.ts",
  "apps/cli/src/main.ts",
  "packages/adapters/src/platform/database/sqlite-content-knowledge-repository.ts",
  "packages/testkit/src/in-memory-content-knowledge-repository.ts"
]);
const forbiddenBrowserCommands = [
  "/api/v1/knowledge/compilations",
  "/api/v1/knowledge/legacy-manifests",
  "/api/v1/knowledge/edges/adjudications",
  "/api/v1/knowledge/projections/rebuild"
];

for (const file of files) {
  const contents = fs.readFileSync(path.join(root, file), "utf8");
  const importsKnowledgeAuthority = /ContentKnowledgeService|SQLiteContentKnowledgeRepository|createDurableKnowledgeSystem|KnowledgeCompilerPort/u.test(contents);
  if (importsKnowledgeAuthority && !file.startsWith("packages/knowledge/") && !privilegedImports.has(file)) {
    failures.push(`${file}: imports canonical Knowledge write authority outside the reviewed application boundary`);
  }
  if (file.startsWith("src/client/") || file.startsWith("apps/web/")) {
    for (const route of forbiddenBrowserCommands) {
      if (contents.includes(route)) failures.push(`${file}: browser code reaches privileged Knowledge command ${route}`);
    }
  }
  if ((file.includes("executor") || file.includes("model") || file.includes("llm"))
    && /\.compile\s*\(|\.recordLegacyUnverified\s*\(|\.adjudicateEdge\s*\(|\.invalidate\s*\(/u.test(contents)) {
    failures.push(`${file}: model/executor code calls a canonical Knowledge write method directly`);
  }
}

if (failures.length > 0) {
  console.error("Knowledge authority violations:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Knowledge writes remain behind reviewed compiler, adjudication, recovery, and application command boundaries.");
