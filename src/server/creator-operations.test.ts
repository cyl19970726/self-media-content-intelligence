import { describe, expect, it } from "vitest";
import type { CreatorResearchRun } from "../../packages/contracts/index.js";
import { buildCreatorRunOperation } from "./creator-operations.js";

function run(overrides: Partial<CreatorResearchRun> = {}): CreatorResearchRun {
  return {
    schemaVersion: "1.3.0", id: "37f23a1b-60a3-4c8f-bb41-01c4a477e3e5", platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/tester", status: "reviewable", currentStage: "deep_capture",
    createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z", creatorId: "tester", creatorName: "测试博主",
    dashboardPath: null, source: { kind: "live_collection", sourceRefs: [], importedAt: null }, canonicalSlug: "tester",
    publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: 30, identityAnchors: [] },
    stages: [
      { id: "preflight", label: "预检", status: "complete", message: null }, { id: "inventory", label: "清单", status: "complete", message: null },
      { id: "tiering", label: "分层", status: "complete", message: null }, { id: "deep_capture", label: "深度重建", status: "failed", message: null },
      { id: "synthesis", label: "合成", status: "pending", message: null }, { id: "dashboard", label: "发布", status: "pending", message: null }
    ],
    coverage: { discoveredPosts: 30, enrichedPosts: 21, comparisonPosts: 21, reconstructedPosts: 4 },
    collectionPolicy: { adapter: "redfox", browserProfile: null, readOnly: true, incremental: true, bypassChallenges: false,
      cacheTtlHours: 24, budgets: { maxScrollRounds: 30, maxDetailOpens: 24, maxMediaDownloads: 12 } },
    blockers: [{ code: "video_reconstruction_incomplete", message: "4/12 条通过", userActionRequired: false }],
    nextAction: "补齐视频证据", lastSnapshotAt: null,
    worker: { state: "succeeded", attempt: 1, jobId: null, workerId: null, lastHeartbeatAt: null },
    videoWork: { concurrencyLimit: 3, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 4, failedPosts: 8 },
    inventoryArtifactRef: null, portfolioArtifactRef: null, selectionArtifactRef: null, detailArtifactRef: null,
    mediaManifestArtifactRef: null, reconstructionBatchArtifactRef: null, synthesisArtifactRef: null,
    synthesisGateArtifactRef: null, browserTaskSpaceId: null,
    ...overrides
  };
}

describe("creator operations projection", () => {
  it("exposes complete denominators and retries only failed videos", () => {
    const operation = buildCreatorRunOperation(run(), {
      reconstructionBatch: { requestedPosts: 12, pendingPosts: 0, items: [
        { state: "ready", failedGateIds: [] }, { state: "not_ready", failedGateIds: ["evidence_coverage"] }
      ] }, synthesisGate: null, events: []
    });
    expect(operation.coverage).toMatchObject({ discovered: 30, discoveredTarget: 30, enriched: 21, enrichedTarget: 21,
      compared: 21, comparedTarget: 21, reconstructed: 4, reconstructedTarget: 12 });
    expect(operation.failedGateIds).toEqual(["evidence_coverage", "video_reconstruction_incomplete"]);
    expect(operation.action).toBe("retry_failed_videos");
  });

  it("only allows bounded gaps after a targeted media retry", () => {
    const evidence = { reconstructionBatch: { requestedPosts: 12, pendingPosts: 0, items: [
      { state: "blocked", failedGateIds: ["media_verification"] }
    ] }, synthesisGate: null, events: [] };
    expect(buildCreatorRunOperation(run(), evidence).action).toBe("retry_failed_videos");
    expect(buildCreatorRunOperation(run(), { ...evidence, events: [{
      sequence: 1, runId: run().id, jobId: null, type: "job.queued", createdAt: "2026-08-21T01:00:00.000Z",
      message: "媒体核验失败项已进入一次定向补取。", payload: {}
    }] }).action).toBe("continue_with_media_gaps");
  });

  it("maps provider failures to the resumable failed stage", () => {
    const operation = buildCreatorRunOperation(run({ status: "failed", blockers: [
      { code: "provider_unavailable", message: "数据源超时", userActionRequired: false }
    ] }), { reconstructionBatch: null, synthesisGate: null, events: [] });
    expect(operation.action).toBe("resume");
    expect(operation.terminal).toBe(false);
  });

  it("stops offering blind retries after the provider failed again", () => {
    const failed = run({ status: "failed", blockers: [
      { code: "provider_unavailable", message: "数据源超时", userActionRequired: false }
    ] });
    const operation = buildCreatorRunOperation(failed, { reconstructionBatch: null, synthesisGate: null, events: [{
      sequence: 2, runId: failed.id, jobId: null, type: "run.resumed", createdAt: "2026-08-21T02:00:00.000Z",
      message: "任务重新进入队列。", payload: {}
    }] });
    expect(operation.action).toBe("none");
    expect(operation.waitingReason).toContain("避免重复消耗请求");
  });
});
