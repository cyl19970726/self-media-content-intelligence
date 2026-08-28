import { randomUUID } from "node:crypto";
import { EgoBrowserCreatorExecutor, LocalDeepMediaResolver } from "../packages/adapters/index.js";

const [profileUrl, externalId, postUrl] = process.argv.slice(2);
if (!profileUrl || !externalId || !postUrl) {
  throw new Error("usage: tsx scripts/validate-real-media.ts <profile-url> <post-id> <post-url>");
}

const runId = randomUUID();
const browser = new EgoBrowserCreatorExecutor();
const details = await browser.enrich({ runId, profileUrl, posts: [{ externalId, url: postUrl, resolveMedia: true }], taskSpaceId: null });
if (details.state !== "ready" || details.posts.length !== 1) {
  throw new Error(`real detail smoke failed: ${details.state}`);
}
const detail = details.posts[0];
if (!detail) throw new Error("real detail smoke returned no post");
const manifest = await new LocalDeepMediaResolver().resolve({ runId, posts: [{ externalId,
  videoCandidateUrl: detail.videoCandidateUrl, coverCandidateUrl: detail.coverCandidateUrl, downloadVideo: true }] });
const item = manifest.items[0];
process.stdout.write(`${JSON.stringify({ runId, detailIdentityMatched: detail.externalId === externalId,
  sanitizedFinalUrl: detail.finalUrl, videoState: item?.state, coverState: item?.coverState,
  coverMessage: item?.coverMessage,
  detailWarnings: detail.warnings,
  videoArtifactRef: item?.videoArtifactRef, coverArtifactRef: item?.coverArtifactRef,
  bytes: item?.bytes, durationSeconds: item?.durationSeconds, width: item?.width, height: item?.height,
  signedUrlsPersisted: false })}\n`);
