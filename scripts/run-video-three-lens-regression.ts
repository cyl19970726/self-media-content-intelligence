import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CodexVideoReconstructionExecutor,
  LocalDeepMediaResolver,
  RedFoxCreatorExecutor,
  runtimeDir
} from "../packages/adapters/index.js";

type Result = {
  postExternalId: string;
  title: string | null;
  mediaState: string;
  durationMs: number | null;
  outcome: unknown;
  lifecycle: Array<{ role: string; status: string; at: string; errorCode: string | null }>;
  metrics: Record<string, unknown> | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readRecord(file: string): Record<string, unknown> {
  if (!fs.existsSync(file)) return {};
  return record(JSON.parse(fs.readFileSync(file, "utf8")) as unknown);
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function artifactMetrics(runId: string, postExternalId: string, startedAtMs: number, lifecycle: Result["lifecycle"]): Record<string, unknown> {
  const root = path.join(runtimeDir(), "runs", runId, "video-reconstructions", postExternalId);
  const protocol = readRecord(path.join(root, "capture-protocol.json"));
  const targeted = readRecord(path.join(root, "targeted-evidence", "targeted-evidence.json"));
  const ocr = readRecord(path.join(root, "targeted-evidence", "ocr-evidence.json"));
  const reconstruction = readRecord(path.join(root, "reconstruction.json"));
  const lenses = record(reconstruction.builderLenses);
  const content = record(lenses.contentRestoration);
  const directing = record(lenses.directingLogic);
  const visual = record(lenses.visualEditing);
  const deduplication = record(targeted.deduplication);
  const protocolActions = rows(protocol.captureActions);
  const artifactTimes = ["media-preparation.json", "probe.json", "capture-protocol.json", "targeted-evidence/targeted-evidence.json",
    "targeted-evidence/ocr-evidence.json", "reconstruction.json", "builder-validation.json", "article.md", "evaluation.json", "gate-report.json"]
    .flatMap((relative) => {
      const file = path.join(root, relative);
      return fs.existsSync(file) ? [{ artifact: relative, elapsedMs: Math.max(0, fs.statSync(file).mtimeMs - startedAtMs) }] : [];
    });
  const uniqueFrames = Number(deduplication.uniqueFrames ?? rows(targeted.frames).length);
  const reusedFrames = Number(deduplication.exactTimeReuses ?? 0) + Number(deduplication.exactContentReuses ?? 0);
  const declaredLensConsumers = protocolActions.reduce((sum, action) => sum + (Array.isArray(action.consumers) ? action.consumers.length : 0), 0);
  return {
    protocolActions: protocolActions.length,
    declaredLensConsumers,
    mergedCrossLensReuseRatio: declaredLensConsumers > 0 ? (declaredLensConsumers - protocolActions.length) / declaredLensConsumers : 0,
    uniqueFrames, reusedFrames, exactFrameReuseRatio: uniqueFrames + reusedFrames > 0 ? reusedFrames / (uniqueFrames + reusedFrames) : 0,
    ocrFrames: rows(ocr.frames).length,
    contentBlocks: rows(content.blocks).length,
    inlineVisuals: rows(content.blocks).reduce((sum, block) => sum + rows(block.visuals).length + (Array.isArray(block.frameRefs) ? block.frameRefs.length : 0), 0),
    directingStages: rows(directing.stages).length,
    visualClaims: rows(visual.claims).length,
    semanticSegments: rows(visual.shotSemantics).length,
    transitions: rows(visual.transitions).length,
    rhythmSegments: rows(visual.rhythm).length,
    missingBridges: rows(visual.missingBridges).length,
    candidateProcessCount: lifecycle.filter((event) => event.role === "candidate" && event.status === "started").length,
    artifactTimes
  };
}

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function requiredIds(): string[] {
  const values = (option("--ids") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!values.length) throw new Error("Usage: tsx scripts/run-video-three-lens-regression.ts --ids <id,id,id> [--builder-only]");
  return [...new Set(values)];
}

async function main() {
  const ids = requiredIds();
  const runId = crypto.randomUUID();
  const evaluationPolicy = process.argv.includes("--builder-only") ? "skip" as const : "single_pass" as const;
  const provider = new RedFoxCreatorExecutor();
  const details = await provider.enrich({
    adapter: "redfox", runId, profileUrl: "https://www.xiaohongshu.com",
    posts: ids.map((externalId) => ({
      externalId, url: `https://www.xiaohongshu.com/explore/${externalId}`, resolveMedia: true
    })),
    taskSpaceId: null
  });
  const detailPosts = details.state === "ready" ? details.posts : "partialPosts" in details ? details.partialPosts : [];
  const byId = new Map(detailPosts.map((post) => [post.externalId, post]));
  const media = await new LocalDeepMediaResolver().resolve({
    runId,
    posts: ids.map((externalId) => {
      const detail = byId.get(externalId);
      return {
        externalId,
        videoCandidateUrl: detail?.videoCandidateUrl ?? null,
        coverCandidateUrl: null,
        imageCandidateUrls: [],
        downloadVideo: true,
        downloadImages: false
      };
    })
  });
  const executor = new CodexVideoReconstructionExecutor();
  const results: Result[] = await Promise.all(media.items.map(async (item) => {
    const detail = byId.get(item.externalId);
    if (!item.videoArtifactRef) return {
      postExternalId: item.externalId, title: detail?.title ?? null, mediaState: item.state,
      durationMs: null, outcome: { state: "blocked", message: item.message }, lifecycle: [], metrics: null
    };
    const lifecycle: Result["lifecycle"] = [];
    const started = Date.now();
    const outcome = await executor.reconstruct({
      runId: crypto.randomUUID(), creatorRunId: runId, postExternalId: item.externalId,
      sourceUrl: `https://www.xiaohongshu.com/explore/${item.externalId}`,
      sourceMediaArtifactRef: item.videoArtifactRef, evidencePackArtifactRef: null,
      evaluationPolicy, contractVersion: "video-content-reconstruction@2"
    }, (event) => lifecycle.push({ role: event.role, status: event.status, at: event.lastProgressAt, errorCode: event.errorCode }));
    return { postExternalId: item.externalId, title: detail?.title ?? null, mediaState: item.state,
      durationMs: Date.now() - started, outcome, lifecycle, metrics: artifactMetrics(runId, item.externalId, started, lifecycle) };
  }));
  const report = {
    schemaVersion: "video-three-lens-regression@1", runId, generatedAt: new Date().toISOString(),
    evaluationPolicy, requested: ids.length, mediaReady: media.readyPosts, results
  };
  const reportDir = path.join(runtimeDir(), "regressions");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${runId}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ runId, reportPath, evaluationPolicy, requested: ids.length, mediaReady: media.readyPosts,
    results: results.map((result) => ({ postExternalId: result.postExternalId, mediaState: result.mediaState,
      durationMs: result.durationMs, outcomeState: typeof result.outcome === "object" && result.outcome && "state" in result.outcome
        ? (result.outcome as { state: unknown }).state : "unknown" })) }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
