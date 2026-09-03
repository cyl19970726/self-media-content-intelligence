import crypto from "node:crypto";
import path from "node:path";
import { CodexVideoReconstructionExecutor, runtimeDir } from "../packages/adapters/index.js";

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const creatorRunId = option("--creator-run");
  const postExternalId = option("--post");
  const sourceRelative = `deep-media/${postExternalId}/source-video.mp4`;
  const sourcePath = path.join(runtimeDir(), "runs", creatorRunId, sourceRelative);
  const lifecycle: unknown[] = [];
  const startedAt = Date.now();
  const outcome = await new CodexVideoReconstructionExecutor().reconstruct({
    runId: crypto.randomUUID(),
    creatorRunId,
    postExternalId,
    sourceUrl: `https://www.xiaohongshu.com/explore/${postExternalId}`,
    sourceMediaArtifactRef: `/artifacts/${creatorRunId}/${sourceRelative}`,
    evidencePackArtifactRef: null,
    evaluationPolicy: "single_pass",
    contractVersion: "video-content-reconstruction@2"
  }, (event) => lifecycle.push(event));
  process.stdout.write(`${JSON.stringify({ sourcePath, durationMs: Date.now() - startedAt, outcome, lifecycle }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
