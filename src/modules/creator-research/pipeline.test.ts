import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "./service.js";
import type { CreatorResearchRun } from "../../shared/schema.js";
import { loadCreatorDossier } from "../../server/creator-dossier.js";
import { buildCreatorResearchPipeline } from "./pipeline.js";

const emptyCreatorService = { list: () => [], get: () => null } as unknown as CreatorResearchService;

function activeVideoRun(): CreatorResearchRun {
  return {
    schemaVersion: "1.1.0", id: "05f23d21-ded1-450f-b609-3cb7c1421e70", platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/tester", status: "collecting", currentStage: "deep_capture",
    createdAt: "2026-08-26T00:00:00.000Z", updatedAt: "2026-08-26T01:00:00.000Z", creatorId: "tester", creatorName: "测试博主",
    dashboardPath: "/creator-runs/tester", source: { kind: "live_collection", sourceRefs: [], importedAt: null },
    publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: null, identityAnchors: [] },
    stages: [
      { id: "preflight", label: "预检", status: "complete", message: null },
      { id: "inventory", label: "清单", status: "complete", message: null },
      { id: "tiering", label: "分层", status: "complete", message: null },
      { id: "deep_capture", label: "深度重建", status: "running", message: "正在重建代表视频。" },
      { id: "synthesis", label: "综合", status: "pending", message: null },
      { id: "dashboard", label: "发布", status: "pending", message: null }
    ],
    coverage: { discoveredPosts: 30, enrichedPosts: 21, comparisonPosts: 21, reconstructedPosts: 1 },
    collectionPolicy: { adapter: "ego-browser", browserProfile: "hhh-01", readOnly: true, incremental: true, bypassChallenges: false,
      cacheTtlHours: 24, budgets: { maxScrollRounds: 30, maxDetailOpens: 24, maxMediaDownloads: 12 } },
    blockers: [], nextAction: "正在重建深度视频。", lastSnapshotAt: "2026-08-26T00:30:00.000Z",
    worker: { state: "running", attempt: 1, jobId: "video-job", workerId: "creator-worker-video-1", lastHeartbeatAt: "2026-08-26T01:00:00.000Z" },
    inventoryArtifactRef: "/artifacts/inventory.json", portfolioArtifactRef: "/artifacts/portfolio.json",
    selectionArtifactRef: "/artifacts/selection.json", detailArtifactRef: "/artifacts/details.json",
    mediaManifestArtifactRef: "/artifacts/media.json", reconstructionBatchArtifactRef: "/artifacts/batch.json",
    synthesisArtifactRef: null, synthesisGateArtifactRef: null, browserTaskSpaceId: null,
    videoWork: { concurrencyLimit: 3, activePostExternalIds: ["video-2", "video-3", "video-4"], queuedPosts: 3, analyzedPosts: 1, failedPosts: 0 }
  };
}

describe("creator research pipeline projection", () => {
  it("exposes the complete 13-stage Skill and runtime ledger", () => {
    const dossier = loadCreatorDossier(emptyCreatorService, "cyber-duck-aigc");
    expect(dossier?.pipeline?.stages.map((stage) => stage.id)).toEqual([
      "run_contract", "identity_verification", "inventory_acquisition", "detail_enrichment",
      "portfolio_annotation", "corpus_statistics", "sample_selection", "media_verification",
      "video_reconstruction", "video_evaluation", "creator_synthesis", "creator_evaluation",
      "dashboard_projection"
    ]);
    expect(dossier?.pipeline?.stages.every((stage) => stage.workerKind.length > 0)).toBe(true);
    expect(dossier?.pipeline?.stages.find((stage) => stage.id === "corpus_statistics")?.skillId).toBeNull();
    expect(dossier?.pipeline?.stages.find((stage) => stage.id === "video_reconstruction")?.skillId).toBe("video-content-reconstruction");
  });

  it("keeps Cyber Duck partial when detail, evaluation and synthesis evidence are incomplete", () => {
    const pipeline = loadCreatorDossier(emptyCreatorService, "cyber-duck-aigc")?.pipeline;
    expect(pipeline?.ready).toBe(false);
    expect(pipeline?.state).toBe("partial");
    expect(pipeline?.stages.find((stage) => stage.id === "inventory_acquisition")?.state).toBe("partial");
    expect(pipeline?.stages.find((stage) => stage.id === "detail_enrichment")?.missingInputs.some((item) => /^发布时间：\d+\/319$/.test(item))).toBe(true);
    expect(pipeline?.stages.find((stage) => stage.id === "sample_selection")?.missingInputs.some((item) => /^代表深度样本：\d+\/12$/.test(item))).toBe(true);
    expect(pipeline?.stages.find((stage) => stage.id === "video_reconstruction")?.state).toBe("partial");
    expect(pipeline?.stages.find((stage) => stage.id === "video_evaluation")?.missingInputs.some((item) => /^单轮独立评估：\d+\/12$/.test(item))).toBe(true);
    expect(pipeline?.stages.find((stage) => stage.id === "creator_evaluation")?.state).toBe("pending");
    expect(pipeline?.stages.find((stage) => stage.id === "dashboard_projection")?.state).toBe("partial");
  });

  it("does not confuse a visible dashboard with a completed research run", () => {
    const pipeline = loadCreatorDossier(emptyCreatorService, "xiaohui-doctor")?.pipeline;
    expect(pipeline?.stages.find((stage) => stage.id === "dashboard_projection")?.artifactRefs).toContain("route:/creators/xiaohui-doctor");
    expect(pipeline?.stages.find((stage) => stage.id === "dashboard_projection")?.gateState).toBe("partial");
    expect(pipeline?.ready).toBe(false);
  });

  it("projects active video work onto video stages instead of stale detail enrichment", () => {
    const base = loadCreatorDossier(emptyCreatorService, "cyber-duck-aigc")!;
    const items = base.portfolio.items.map((item, index) => ({
      ...item,
      deepSample: index < 7,
      evidenceStatus: index === 0 ? "deep_validated" as const : index < 7 ? "deep_pending" as const : "surface_only" as const
    }));
    const projected = buildCreatorResearchPipeline(activeVideoRun(), {
      ...base,
      portfolio: { ...base.portfolio, items, deepCount: 7 }
    });

    expect(projected.currentStageId).toBe("video_reconstruction");
    expect(projected.stages.find((stage) => stage.id === "detail_enrichment")?.state).not.toBe("running");
    expect(projected.stages.find((stage) => stage.id === "media_verification")?.state).toBe("complete");
    expect(projected.stages.find((stage) => stage.id === "video_reconstruction")?.state).toBe("running");
    expect(projected.stages.find((stage) => stage.id === "video_reconstruction")?.missingInputs).toContain("完成三镜头分析：1/7");
    expect(projected.stages.find((stage) => stage.id === "video_evaluation")?.missingInputs).toContain("单轮独立评估：1/7");
  });
});
