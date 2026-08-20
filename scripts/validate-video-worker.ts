import { CodexVideoReconstructionExecutor } from "../src/platform/video/codex-video-reconstruction-executor.js";

const [creatorRunId, postExternalId, sourceMediaArtifactRef, sourceUrl] = process.argv.slice(2);
if (!creatorRunId || !postExternalId || !sourceMediaArtifactRef || !sourceUrl) {
  throw new Error("usage: tsx scripts/validate-video-worker.ts <creator-run-id> <post-id> <source-media-ref> <source-url>");
}

const outcome = await new CodexVideoReconstructionExecutor().reconstruct({
  runId: crypto.randomUUID(), creatorRunId, postExternalId, sourceUrl, sourceMediaArtifactRef,
  evidencePackArtifactRef: null, contractVersion: "video-content-reconstruction@1"
});
process.stdout.write(`${JSON.stringify(outcome)}\n`);
