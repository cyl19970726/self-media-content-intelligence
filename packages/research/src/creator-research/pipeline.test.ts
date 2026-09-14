import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "./service.js";
import type { CreatorResearchRun } from "../../../contracts/index.js";
import { projectRunDossier } from "../../../../src/server/creator-dossier.js";
import { buildCreatorResearchPipeline } from "./pipeline.js";
import type { VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";

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
    worker: { state: "running", attempt: 1, jobId: "15f23d21-ded1-450f-b609-3cb7c1421e70", workerId: "creator-worker-video-1", lastHeartbeatAt: "2026-08-26T01:00:00.000Z" },
    inventoryArtifactRef: "/artifacts/inventory.json", portfolioArtifactRef: "/artifacts/portfolio.json",
    selectionArtifactRef: "/artifacts/selection.json", detailArtifactRef: "/artifacts/details.json",
    mediaManifestArtifactRef: "/artifacts/media.json", reconstructionBatchArtifactRef: "/artifacts/batch.json",
    synthesisArtifactRef: null, synthesisGateArtifactRef: null, browserTaskSpaceId: null,
    videoWork: { concurrencyLimit: 3, activePostExternalIds: ["video-2", "video-3", "video-4"], queuedPosts: 3, analyzedPosts: 1, failedPosts: 0 }
  };
}

function projectedAnalysis(corpusCompleteness: "observed_converged" | "bounded_partial", stopReason: "explicit_end" | "quiescent_incomplete" | "budget_reached", rate = 1) {
  return {
    schemaVersion: "1.0.0", runId: activeVideoRun().id, generatedAt: "2026-08-26T01:00:00.000Z",
    corpusArtifactRef: "/artifacts/corpus.json", selectionArtifactRef: "/artifacts/selection.json",
    metricCoverage: { known: rate === 1 ? 30 : 15, missing: rate === 1 ? 0 : 15, rate },
    likes: { min: 1, p25: 1, median: 1, mean: 1, p75: 1, max: 1 },
    tierCounts: { high: 10, base: 10, low: 10 },
    anchors: { median: 1, mean: 1, medianNearPostId: "post-1", meanNearPostId: "post-1", meanGap: false, meanGapReason: null },
    interpretationBoundary: "fixture", unknowns: [], corpusCompleteness, stopReason
  };
}

function versionedSelection(run: CreatorResearchRun) {
  const items = Array.from({ length: 21 }, (_, index) => ({
    externalId: `post-${index + 1}`, url: `https://www.xiaohongshu.com/explore/post-${index + 1}`, title: `作品 ${index + 1}`,
    visibleText: null, mediaType: "video" as const, likesLabel: String(index + 1), likes: index + 1,
    tier: index < 7 ? "high" as const : index < 14 ? "base" as const : "low" as const, tierRank: index % 7 + 1,
    anchors: [], selectionReason: "versioned fixture", deepCandidate: index < 7, deepGroups: [], deepState: "pending" as const, confounds: []
  }));
  return {
    schemaVersion: "1.0.0", runId: run.id, generatedAt: "2026-08-26T01:00:00.000Z", sourceCorpusArtifactRef: "/artifacts/corpus.json",
    ruleVersion: "ranked-7x3-v1", rules: { targetPerTier: 7, deepCandidatesPerTier: 3, high: "fixture", base: "fixture", low: "fixture", unknownMetricPolicy: "exclude_from_metric_tiering" },
    denominator: { discoveredPosts: 21, eligiblePosts: 21, selectedPosts: 21, excludedMissingLikes: 0 },
    anchors: { median: 11, mean: 11, medianNearPostId: "post-11", meanNearPostId: "post-11", meanGap: false, meanGapReason: null },
    tierCounts: { high: 7, base: 7, low: 7 }, items, limitations: []
  };
}

function versionedDossier(run = activeVideoRun()) {
  const service = { get: () => run, list: () => [run], portfolio: () => ({
    analysis: projectedAnalysis("bounded_partial", "budget_reached"), selection: versionedSelection(run)
  }) } as unknown as CreatorResearchService;
  const dossier = projectRunDossier(service, run.id);
  if (!dossier) throw new Error("versioned fixture did not project");
  return dossier;
}

function projectionService(run: CreatorResearchRun, analysis: unknown): CreatorResearchService {
  return { get: () => run, list: () => [run], portfolio: () => ({ analysis }) } as unknown as CreatorResearchService;
}

describe("creator research pipeline evaluation truth", () => {
  it("does not call Builder-only videos independently evaluated", () => {
    const run = activeVideoRun();
    run.status = "reviewable";
    run.videoWork = { concurrencyLimit: 3, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 12, failedPosts: 0 };
    const batch = { items: Array.from({ length: 12 }, (_, index) => ({
      state: index < 2 ? "verified" : index === 2 ? "evaluated_with_findings" : "built_unevaluated",
      evaluationArtifactRef: index < 3 ? `artifact:evaluation:${index}` : null
    })) } as unknown as VideoReconstructionBatch;

    const projected = buildCreatorResearchPipeline(run, undefined, batch);
    expect(projected.stages.find((stage) => stage.id === "video_reconstruction")?.state).toBe("complete");
    expect(projected.stages.find((stage) => stage.id === "video_evaluation")).toMatchObject({
      state: "partial", gateState: "partial", missingInputs: ["单轮独立评估：3/12"]
    });
  });

  it("names the actual incomplete stages when a historic gate has passed", () => {
    const run = activeVideoRun();
    run.status = "ready";
    run.worker.jobId = null;
    run.synthesisArtifactRef = "/artifacts/synthesis.json";
    run.synthesisGateArtifactRef = "/artifacts/gate.json";
    const pipeline = buildCreatorResearchPipeline(run);
    const missing = pipeline.stages.find(item => item.id === "dashboard_projection")?.missingInputs;
    expect(missing).toContain("逐帖详情、日期、指标与评论");
    expect(missing).not.toContain("全部上游阶段通过");
  });

  it("keeps a fully liked bounded corpus partial and preserves full status for converged collection", () => {
    const run = activeVideoRun();
    run.worker.jobId = null;
    const bounded = projectRunDossier(projectionService(run, projectedAnalysis("bounded_partial", "budget_reached")), run.id);
    expect(bounded?.corpus.coverageRate).toBe(1);
    expect(bounded?.corpus.health.status).toBe("partial");
    expect(bounded?.corpus.health.reason).toContain("预算");

    const complete = projectRunDossier(projectionService(run, projectedAnalysis("observed_converged", "explicit_end")), run.id);
    expect(complete?.corpus.health.status).toBe("full");

    const incompleteLikes = projectRunDossier(projectionService(run, projectedAnalysis("observed_converged", "explicit_end", 0.5)), run.id);
    expect(incompleteLikes?.corpus.health.status).toBe("partial");
    expect(incompleteLikes?.corpus.health.reason).toContain("80%");
  });
});

describe("creator research pipeline projection", () => {
  it("exposes the complete 13-stage Skill and runtime ledger", () => {
    const run = activeVideoRun();
    const pipeline = buildCreatorResearchPipeline(run, versionedDossier(run));
    expect(pipeline.stages.map((stage) => stage.id)).toEqual([
      "run_contract", "identity_verification", "inventory_acquisition", "detail_enrichment",
      "portfolio_annotation", "corpus_statistics", "sample_selection", "media_verification",
      "video_reconstruction", "video_evaluation", "creator_synthesis", "creator_evaluation",
      "dashboard_projection"
    ]);
    expect(pipeline.stages.every((stage) => stage.workerKind.length > 0)).toBe(true);
    expect(pipeline.stages.find((stage) => stage.id === "corpus_statistics")?.skillId).toBeNull();
    expect(pipeline.stages.find((stage) => stage.id === "video_reconstruction")?.skillId).toBe("video-content-reconstruction");
  });

  it("keeps a versioned partial run incomplete when detail, evaluation and synthesis evidence are missing", () => {
    const run = activeVideoRun();
    const pipeline = buildCreatorResearchPipeline(run, versionedDossier(run));
    expect(pipeline.ready).toBe(false);
    expect(pipeline.state).not.toBe("ready");
    expect(pipeline.stages.find((stage) => stage.id === "inventory_acquisition")?.state).toBe("partial");
    expect(pipeline.stages.find((stage) => stage.id === "detail_enrichment")?.missingInputs).toContain("发布时间：0/30");
    expect(pipeline.stages.find((stage) => stage.id === "video_reconstruction")?.state).toBe("running");
    expect(pipeline.stages.find((stage) => stage.id === "video_evaluation")?.missingInputs).toContain("单轮独立评估：0/7");
    expect(pipeline.stages.find((stage) => stage.id === "creator_evaluation")?.state).toBe("pending");
    expect(pipeline.stages.find((stage) => stage.id === "dashboard_projection")?.state).toBe("partial");
  });

  it("does not confuse a visible dashboard with a completed research run", () => {
    const run = activeVideoRun();
    const pipeline = buildCreatorResearchPipeline(run, versionedDossier(run));
    expect(pipeline.stages.find((stage) => stage.id === "dashboard_projection")?.artifactRefs).toContain("route:/creators/tester");
    expect(pipeline.stages.find((stage) => stage.id === "dashboard_projection")?.gateState).toBe("partial");
    expect(pipeline.ready).toBe(false);
  });

  it("projects active video work onto video stages instead of stale detail enrichment", () => {
    const base = versionedDossier();
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
    expect(projected.stages.find((stage) => stage.id === "video_reconstruction")?.missingInputs).toContain("完成 Builder 三镜头分析：1/7");
    expect(projected.stages.find((stage) => stage.id === "video_evaluation")?.missingInputs).toContain("单轮独立评估：1/7");
  });

  it("uses the registered video batch counts in the run-only API projection", () => {
    const projected = buildCreatorResearchPipeline(activeVideoRun());

    expect(projected.currentStageId).toBe("video_reconstruction");
    expect(projected.stages.find((stage) => stage.id === "media_verification")?.message).toBe("7/7 条深度样本已冻结到视频重建批次。");
    expect(projected.stages.find((stage) => stage.id === "video_reconstruction")?.missingInputs).toContain("完成 Builder 三镜头分析：1/7");
    expect(projected.stages.find((stage) => stage.id === "video_evaluation")?.missingInputs).toContain("单轮独立评估：1/7");
  });

  it("projects bounded media gaps as unavailable instead of passed or pending", () => {
    const base = versionedDossier();
    const items = base.portfolio.items.map((item, index) => ({
      ...item,
      deepSample: index < 6,
      evidenceStatus: index < 4 ? "deep_validated" as const : "surface_only" as const
    }));
    const run = activeVideoRun();
    run.status = "ready";
    run.currentStage = "synthesis";
    run.videoWork = { concurrencyLimit: 3, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 4, failedPosts: 2 };
    run.synthesisArtifactRef = "/artifacts/synthesis.json";
    run.synthesisGateArtifactRef = "/artifacts/synthesis-gate.json";
    const projected = buildCreatorResearchPipeline(run, {
      ...base,
      boundaries: [...base.boundaries, "bounded_media_retry_once：2 条媒体不可得"],
      portfolio: { ...base.portfolio, items, deepCount: 6 }
    });

    expect(projected.stages.find((stage) => stage.id === "media_verification")).toMatchObject({
      state: "partial", gateState: "partial", message: "4/6 条媒体通过核验；2 条经一次定向补取仍不可得，帖子内容保持未知。"
    });
    expect(projected.stages.find((stage) => stage.id === "video_reconstruction")?.message).toContain("2 条媒体不可得");
    expect(projected.stages.find((stage) => stage.id === "video_evaluation")?.message).toContain("2 条媒体不可得且未评估帖子内容");
    run.videoWork.analyzedPosts = 6;
    run.videoWork.failedPosts = 0;
    const recovered = buildCreatorResearchPipeline(run, {
      ...base, boundaries: ["bounded_media_retry_once：沿用采集策略"],
      portfolio: { ...base.portfolio, items, deepCount: 6 }
    });
    expect(recovered.stages.find((stage) => stage.id === "media_verification")).toMatchObject({ state: "complete", missingInputs: [], nextAction: null });
    expect(recovered.stages.find((stage) => stage.id === "video_reconstruction")?.message).toContain("不保证当前三部分字段齐全");
  });
});
