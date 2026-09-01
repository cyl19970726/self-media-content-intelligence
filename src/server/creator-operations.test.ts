import { describe, expect, it } from "vitest";
import type { CreatorResearchRun } from "../../packages/contracts/index.js";
import { buildCreatorRunOperation, buildCreatorRunOperations } from "./creator-operations.js";

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

  it("closes remaining failed videos after the single targeted retry", () => {
    const operation = buildCreatorRunOperation(run(), {
      reconstructionBatch: { requestedPosts: 12, pendingPosts: 0, items: [{ state: "not_ready", failedGateIds: ["runner_execution"] }] },
      synthesisGate: null,
      events: [{ sequence: 1, runId: run().id, jobId: null, type: "run.resumed", createdAt: "2026-08-21T01:00:00.000Z",
        message: "视频基础设施修复后，仅重新排队未通过项。", payload: {} }]
    });
    expect(operation).toMatchObject({ action: "none", resolutionState: "provisional", terminal: true });
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

  it("closes synthesis as provisional after deterministic revalidation still fails", () => {
    const reviewable = run({ blockers: [{ code: "creator_synthesis_not_ready", message: "deep_9_ready", userActionRequired: false }] });
    const operation = buildCreatorRunOperation(reviewable, { reconstructionBatch: null, synthesisGate: null, events: [{
      sequence: 3, runId: reviewable.id, jobId: null, type: "artifact.produced", createdAt: "2026-08-21T03:00:00.000Z",
      message: "博主综合 gate 已在不重跑候选或 evaluator 的情况下重验。", payload: { ready: false }
    }] });
    expect(operation).toMatchObject({ action: "none", resolutionState: "provisional", terminal: true });
  });

  it("keeps the latest ready run canonical while classifying newer refresh and older history", () => {
    const canonical = run({ id: "11111111-1111-4111-8111-111111111111", status: "ready", updatedAt: "2026-08-20T00:00:00.000Z", blockers: [] });
    const candidate = run({ id: "22222222-2222-4222-8222-222222222222", updatedAt: "2026-08-22T00:00:00.000Z", blockers: [] });
    const history = run({ id: "33333333-3333-4333-8333-333333333333", status: "failed", updatedAt: "2026-08-18T00:00:00.000Z" });
    const operations = buildCreatorRunOperations([candidate, canonical, history], () => ({
      reconstructionBatch: null, synthesisGate: null, events: []
    }));
    expect(operations.find((item) => item.runId === canonical.id)).toMatchObject({
      authorityState: "canonical", resolutionState: "ready", terminal: true
    });
    expect(operations.find((item) => item.runId === candidate.id)).toMatchObject({
      authorityState: "candidate", resolutionState: "provisional", canonicalRunId: canonical.id, lastGoodRunId: canonical.id, terminal: true
    });
    expect(operations.find((item) => item.runId === history.id)).toMatchObject({
      authorityState: "superseded", supersededByRunId: canonical.id, terminal: true
    });
  });
});
