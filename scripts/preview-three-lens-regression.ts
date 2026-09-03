import fs from "node:fs";
import path from "node:path";
import express from "express";
import { artifactRef, runArtifactDir, runtimeDir } from "../packages/adapters/index.js";
import type { CreatorResearchService } from "../packages/research/index.js";
import { loadVideoResearch } from "../src/server/video-research.js";

function option(name: string, fallback?: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function optionalOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function numericOption(name: string): number | null {
  const value = optionalOption(name);
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid ${name}`);
  return parsed;
}

const creatorRunId = option("--creator-run");
const postExternalId = option("--post");
const creatorId = option("--creator", "three-lens-preview");
const creatorName = option("--name", "三镜头回归样本");
const port = Number(option("--port", "4311"));
const profileUrl = option("--profile", "https://www.xiaohongshu.com");
const sourceUrl = option("--source-url", `https://www.xiaohongshu.com/explore/${postExternalId}`);
const sourceTitle = optionalOption("--title");
const sourceCaption = optionalOption("--caption");
const publishedLabel = optionalOption("--published");
const likes = numericOption("--likes");
const collections = numericOption("--collections");
const comments = numericOption("--comments");
const shares = numericOption("--shares");
const relativeRoot = `video-reconstructions/${postExternalId}`;
const root = path.join(runArtifactDir(creatorRunId), relativeRoot);
const has = (name: string) => fs.existsSync(path.join(root, name));
if (!has("reconstruction.json")) throw new Error(`Missing reconstruction: ${root}`);

const evaluation = has("runtime-three-lens-gate-report.json")
  ? JSON.parse(fs.readFileSync(path.join(root, "runtime-three-lens-gate-report.json"), "utf8")) as { ready?: boolean }
  : null;
const state = evaluation?.ready ? "verified" : has("evaluation.json") ? "evaluated_with_findings" : "built_unevaluated";
const ref = (name: string) => has(name) ? artifactRef(creatorRunId, `${relativeRoot}/${name}`) : null;
const run = {
  id: creatorRunId, creatorId, creatorName, profileUrl,
  lastSnapshotAt: new Date().toISOString(), inventoryArtifactRef: null, detailArtifactRef: null, mediaManifestArtifactRef: null
};
const portfolio = {
  reconstructionBatch: { items: [{
    postExternalId, state, message: "真实三镜头回归预览", failedGateIds: [],
    reconstructionArtifactRef: ref("reconstruction.json"), articleArtifactRef: ref("article.md"),
    builderValidationArtifactRef: ref("builder-validation.json"), evaluationArtifactRef: ref("evaluation.json"),
    gateReportArtifactRef: ref("gate-report.json"), threeLensEvaluationArtifactRef: ref("runtime-three-lens-evaluation.json"),
    threeLensGateReportArtifactRef: ref("runtime-three-lens-gate-report.json")
  }] },
  selection: { items: [{ externalId: postExternalId, title: sourceTitle, visibleText: sourceCaption, url: sourceUrl, mediaType: "video", likes,
    collections, comments, shares, publishedLabel, tier: likes === null ? "unknown" : "high" }] },
  details: { posts: [{ externalId: postExternalId, finalUrl: sourceUrl, title: sourceTitle, description: sourceCaption,
    publishedLabel, mediaType: "video", imageCount: 0, inspectedAt: new Date().toISOString(), warnings: [] }] },
  mediaManifest: { items: [] }, synthesis: { postAnalyses: [] }, analysis: null
};
const service = { list: () => [run], get: () => run, portfolio: () => portfolio } as unknown as CreatorResearchService;
const projection = loadVideoResearch(service, creatorId, postExternalId, creatorRunId);
if (!projection) throw new Error("Unable to project regression artifact");

const app = express();
app.get(`/api/v1/creators/${encodeURIComponent(creatorId)}/videos/${encodeURIComponent(postExternalId)}`, (_request, response) => response.json(projection));
app.get("/api/v1/knowledge/contributions", (_request, response) => response.json({ manifests: [] }));
app.use("/artifacts", express.static(path.join(runtimeDir(), "runs")));
app.listen(port, "127.0.0.1", () => process.stdout.write(`Three-lens preview API: http://127.0.0.1:${port}\n`));
