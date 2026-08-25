import { describe, expect, it } from "vitest";
import { completionNotice, failureReason, findExistingCreatorRun, taskEstimateLabel, taskPhases, validateCreatorProfileUrl } from "./creator-task-state";
import type { CreatorResearchRun } from "../shared/schema";

function run(overrides: Partial<CreatorResearchRun> = {}): CreatorResearchRun {
  return {
    schemaVersion: "1.1.0", id: "37f23a1b-60a3-4c8f-bb41-01c4a477e3e5", platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/tester", status: "queued", currentStage: "preflight",
    createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z", creatorId: null, creatorName: null, dashboardPath: null,
    source: { kind: "live_collection", sourceRefs: [], importedAt: null },
    publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: null, identityAnchors: [] },
    stages: [
      { id: "preflight", label: "身份与登录预检", status: "pending", message: null },
      { id: "inventory", label: "全量作品清单", status: "pending", message: null },
      { id: "tiering", label: "分层", status: "pending", message: null },
      { id: "deep_capture", label: "深度重建", status: "pending", message: null },
      { id: "synthesis", label: "合成", status: "pending", message: null },
      { id: "dashboard", label: "发布", status: "pending", message: null }
    ],
    coverage: { discoveredPosts: 0, enrichedPosts: 0, comparisonPosts: 0, reconstructedPosts: 0 },
    collectionPolicy: { adapter: "ego-browser", browserProfile: "hhh-01", readOnly: true, incremental: true, bypassChallenges: false,
      cacheTtlHours: 24, budgets: { maxScrollRounds: 30, maxDetailOpens: 24, maxMediaDownloads: 9 } },
    blockers: [], nextAction: "等待接管", lastSnapshotAt: null,
    worker: { state: "queued", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: null },
    inventoryArtifactRef: null, portfolioArtifactRef: null, selectionArtifactRef: null, detailArtifactRef: null, mediaManifestArtifactRef: null,
    reconstructionBatchArtifactRef: null, synthesisArtifactRef: null, synthesisGateArtifactRef: null, browserTaskSpaceId: null,
    ...overrides
  };
}

describe("creator task state contract", () => {
  it("only accepts supported Xiaohongshu creator links and normalizes harmless URL noise", () => {
    expect(validateCreatorProfileUrl("https://www.xiaohongshu.com/user/profile/abc/?xsec_token=secret#fragment")).toEqual({
      valid: true, normalizedUrl: "https://www.xiaohongshu.com/user/profile/abc"
    });
    expect(validateCreatorProfileUrl("https://www.xiaohongshu.com/search_result?keyword=ai").valid).toBe(false);
  });

  it("finds existing task only for the same normalized submitted link", () => {
    const existing = run();
    expect(findExistingCreatorRun([existing], "https://www.xiaohongshu.com/user/profile/tester/?xsec_token=another")).toBe(existing);
    expect(findExistingCreatorRun([existing], "https://xhslink.cn/m/different")).toBeNull();
  });

  it("maps actual run stages to the six user-facing phases without invented estimates", () => {
    const phases = taskPhases(run({ status: "collecting", stages: run().stages.map((item) => item.id === "tiering" ? { ...item, status: "running" } : item.id === "preflight" || item.id === "inventory" ? { ...item, status: "complete" } : item) }));
    expect(phases.map((phase) => phase.label)).toEqual(["排队", "采集", "分层", "深度重建", "合成", "完成"]);
    expect(phases.find((phase) => phase.id === "tiering")?.state).toBe("running");
    expect(taskEstimateLabel()).toContain("未知");
  });

  it("keeps missing failure detail visibly unknown and only announces published completion", () => {
    expect(failureReason(run({ status: "failed" }))).toContain("没有返回具体失败原因");
    const published = run({ status: "ready", stages: run().stages.map((item) => ({ ...item, status: "complete" })) });
    expect(completionNotice(published)).toBe("研究已完成并发布到同一工作台。");
    expect(completionNotice(run({ status: "reviewable" }))).toContain("尚未宣称");
  });
});
