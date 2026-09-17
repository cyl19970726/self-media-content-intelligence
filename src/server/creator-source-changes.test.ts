import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sourceDigest } from "./report-source-revision.js";
import { creatorSourceChanges } from "./creator-source-changes.js";

vi.mock("../../packages/adapters/index.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../packages/adapters/index.js")>(),
  artifactPath: (ref: string) => ref
}));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "creator-source-changes-"));
beforeEach(() => { fs.mkdirSync(root, { recursive: true }); });
afterEach(() => { vi.unstubAllEnvs(); fs.rmSync(root, { recursive: true, force: true }); });

it("flags hash-bound source revisions and fails visibly on tampering without changing originals", () => {
  vi.stubEnv("SELF_MEDIA_REPORT_REVISIONS_DIR", root);
  const source = path.join(root, "source.json");
  fs.writeFileSync(source, "original");
  const items = [{ postExternalId: "post", reconstructionArtifactRef: source }];
  expect(creatorSourceChanges(items)).toEqual([]);
  const directory = path.join(root, sourceDigest("original"));
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "revised-source"), "corrected");
  fs.writeFileSync(path.join(directory, "revision.json"), JSON.stringify({
    schemaVersion: "report-source-revision@1", originalSha256: sourceDigest("original"),
    revisedSha256: sourceDigest("corrected"), revisionId: "r1", reason: "补全知识"
  }));
  expect(creatorSourceChanges(items)).toEqual([{ postExternalId: "post", note: "r1：补全知识" }]);
  fs.writeFileSync(path.join(directory, "revised-source"), "tampered");
  expect(creatorSourceChanges(items)[0]?.note).toContain("无法核对");
  expect(fs.readFileSync(source, "utf8")).toBe("original");
});


it("clears the warning only when the displayed synthesis consumed the current revision", () => {
  vi.stubEnv("SELF_MEDIA_REPORT_REVISIONS_DIR", root);
  const source = path.join(root, "source.json");
  const original = JSON.stringify({ content: "old" });
  const revised = JSON.stringify({ content: "new" });
  fs.writeFileSync(source, original);
  const directory = path.join(root, sourceDigest(original));
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "revised-source"), revised);
  fs.writeFileSync(path.join(directory, "revision.json"), JSON.stringify({
    schemaVersion: "report-source-revision@1", originalSha256: sourceDigest(original),
    revisedSha256: sourceDigest(revised), revisionId: "r2", reason: "补全知识"
  }));
  const snapshot = path.join(root, "snapshot.json");
  fs.writeFileSync(snapshot, JSON.stringify({ content: "new" }, null, 2));
  const batchPath = path.join(root, "batch.json");
  const batch = { schemaVersion: "1.0.0", creatorRunId: "11111111-1111-4111-8111-111111111111",
    revision: 1, generatedAt: "2026-09-14T00:00:00.000Z", requestedPosts: 1, builtPosts: 1,
    verifiedPosts: 0, readyPosts: 0, pendingPosts: 0, failedPosts: 0, limitations: [],
    items: [{ postExternalId: "post", tier: "high", tierRank: 1, state: "built_unevaluated",
      sourceMediaArtifactRef: null, reconstructionArtifactRef: source, articleArtifactRef: null,
      builderValidationArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
      threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
      failedGateIds: [], message: "", updatedAt: "2026-09-14T00:00:00.000Z" }] };
  const items = [{ postExternalId: "post", reconstructionArtifactRef: source }];
  fs.writeFileSync(batchPath, JSON.stringify(batch));
  expect(creatorSourceChanges(items, batchPath)[0]?.note).toBe("r2：补全知识");
  batch.items[0]!.reconstructionArtifactRef = snapshot;
  fs.writeFileSync(batchPath, JSON.stringify(batch));
  expect(creatorSourceChanges(items, batchPath)).toEqual([]);
  fs.writeFileSync(snapshot, JSON.stringify({ content: "stale" }));
  expect(creatorSourceChanges(items, batchPath)).toHaveLength(1);
  fs.unlinkSync(batchPath);
  expect(creatorSourceChanges(items, batchPath)[0]?.note).toContain("无法核对");
});
