import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const projectRoot = path.resolve(import.meta.dirname, "..");
const runId = process.argv[2];
if (!runId) throw new Error("Usage: node scripts/render-report-preview.mjs <run-id>");
const reportPath = path.join(projectRoot, ".runtime", "runs", runId, "report.json");
if (!fs.existsSync(reportPath)) throw new Error(`Report not found: ${reportPath}`);
const bundlePath = path.join(projectRoot, ".runtime", "qa", "report-preview-bundle.mjs");
const outputPath = path.join(projectRoot, ".runtime", "qa", `report-v2-${runId}.html`);
fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
await build({
  entryPoints: [path.join(projectRoot, "apps", "web", "src", "features", "single-post", "report-preview-entry.tsx")],
  outfile: bundlePath,
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic"
});
const { renderReportPreview } = await import(`${pathToFileURL(bundlePath).href}?v=${Date.now()}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const inlineArtifact = (ref) => {
  if (typeof ref !== "string" || !ref.startsWith("/artifacts/")) return ref;
  const localPath = path.join(projectRoot, ".runtime", "runs", ref.slice("/artifacts/".length));
  if (!fs.existsSync(localPath)) return ref;
  const mimeType = localPath.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${mimeType};base64,${fs.readFileSync(localPath).toString("base64")}`;
};
if (report.mediaBreakdown) {
  report.mediaBreakdown.contactSheetRef = inlineArtifact(report.mediaBreakdown.contactSheetRef);
  for (const shot of report.mediaBreakdown.shots ?? []) shot.frameRef = inlineArtifact(shot.frameRef);
}
const css = fs.readFileSync(path.join(projectRoot, "apps", "web", "src", "shared", "styles", "global.css"), "utf8");
const body = renderReportPreview(report);
fs.writeFileSync(outputPath, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report v2 QA</title><style>${css}</style></head><body>${body}</body></html>`);
console.log(outputPath);
