import { describe, expect, it } from "vitest";
import type { CreatorResearchRun } from "../../packages/contracts/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { loadCreatorDossier } from "./creator-dossier.js";

const runId = "00000000-0000-4000-8000-000000000071";

function run(): CreatorResearchRun {
  return {
    schemaVersion: "1.3.0", id: runId, platform: "xiaohongshu", profileUrl: "https://example.com/creator", status: "reviewable",
    currentStage: "dashboard", createdAt: "2026-09-14T00:00:00.000Z", updatedAt: "2026-09-14T00:00:00.000Z",
    creatorId: "fixture-creator", creatorName: "Fixture creator", dashboardPath: null,
    source: { kind: "live_collection", sourceRefs: [], importedAt: null }, canonicalSlug: "fixture-creator",
    publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: 5, identityAnchors: [] },
    stages: [], coverage: { discoveredPosts: 5, enrichedPosts: 0, comparisonPosts: 2, reconstructedPosts: 0 },
    collectionPolicy: { adapter: "redfox", browserProfile: null, readOnly: true, incremental: true, bypassChallenges: false,
      cacheTtlHours: 24, budgets: { maxScrollRounds: 30, maxDetailOpens: 24, maxMediaDownloads: 12 } },
    blockers: [], nextAction: "完成", lastSnapshotAt: "2026-09-14T00:00:00.000Z",
    worker: { state: "succeeded", attempt: 1, jobId: null, workerId: null, lastHeartbeatAt: null },
    videoWork: { concurrencyLimit: 3, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 0, failedPosts: 0 },
    inventoryArtifactRef: `/artifacts/${runId}/inventory.json`, portfolioArtifactRef: `/artifacts/${runId}/analysis.json`,
    selectionArtifactRef: `/artifacts/${runId}/selection.json`, detailArtifactRef: null, mediaManifestArtifactRef: `/artifacts/${runId}/media.json`,
    reconstructionBatchArtifactRef: null, synthesisArtifactRef: null, synthesisGateArtifactRef: null, portfolioAnnotationsArtifactRef: `/artifacts/${runId}/annotations.json`,
    browserTaskSpaceId: null
  };
}

function annotation(postExternalId: string, likes: number | null, mediaType: "video" | "image", topic: string, format: string) {
  return {
    postExternalId, likes, mediaType, classification: "classified", sourceUrl: `https://example.com/${postExternalId}`,
    title: topic, confidence: "medium", evidenceScope: ["title"], audienceProblems: [], promises: [], values: [], proofModes: [],
    visualSignals: [], contentArchitectureSignals: [], conflicts: [], unknowns: ["正文未知"],
    topics: [{ value: topic, evidenceRefs: [`inventory#/records/${postExternalId}/title`] }],
    formats: [{ value: format, evidenceRefs: [`inventory#/records/${postExternalId}/title`] }]
  };
}

function service(adaptive = false, reconstructionStates?: Record<string, string | {
  state: string;
  researchReview: { reviewStatus: "completed_no_findings" | "completed_with_findings" | "failed";
    candidateStatus: "original_reviewed" | "revised_unverified" | "review_incomplete" };
}>) {
  const currentRun = run();
  if (adaptive) currentRun.synthesisArtifactRef = `/artifacts/${runId}/creator-synthesis/creator-analysis.json`;
  const claim = { statement: "fixture", factClass: "observed", confidence: "medium", evidenceRefs: ["/evidence"], caveat: null };
  const synthesis = adaptive ? {
    inputs: { reconstructionBatchArtifactRef: "/batch.json" },
    identity: { positioning: claim, audience: [claim], problemsAddressed: [claim], valueProvided: [claim], trustSources: [claim], lifecycleStage: claim, commercialPaths: [] },
    contentSystem: { topicClusters: [claim], formatClusters: [claim], visualLanguage: [claim], publishingRhythm: [], recurringStructure: [claim] },
    performance: { baseline: [claim], high: [claim], low: [claim], timing: [], confounds: ["fixture"] },
    postAnalyses: [
      { postExternalId: "ready-video", contentRole: "不应作为分类", contentForm: ["不应作为形式"] },
      { postExternalId: "missing-video", contentRole: "旧角色", contentForm: ["旧形式"] }
    ],
    portfolioClassification: {
      observedPosts: 5,
      labelRegistry: [
        { id: "hardware", axis: "topic", name: "AI 硬件", definition: "硬件产品", evidenceRefs: ["corpus#/records/0/title"], boundary: "标题表层" },
        { id: "wearable", axis: "topic", name: "智能穿戴", definition: "佩戴产品", evidenceRefs: ["corpus#/records/0/title"], boundary: "标题表层" },
        { id: "review", axis: "format", name: "产品报道", definition: "报道形式", evidenceRefs: ["corpus#/records/0/title"], boundary: "标题表层" }
      ],
      rows: [
        { postExternalId: "ready-video", memberships: [
          { labelId: "hardware", sourceLevel: "surface_title", evidenceRefs: ["corpus#/records/0/title"], boundary: "标题明确提到硬件" },
          { labelId: "wearable", sourceLevel: "deep_builder", evidenceRefs: ["/ready/reconstruction.json"], boundary: "内容展示佩戴关系" },
          { labelId: "review", sourceLevel: "surface_title", evidenceRefs: ["corpus#/records/0/title"], boundary: "标题采用产品报道措辞" }
        ], unknowns: [] },
        { postExternalId: "missing-video", memberships: [{ labelId: "hardware", sourceLevel: "surface_title", evidenceRefs: ["corpus#/records/1/title"], boundary: "标题明确提到硬件" }], unknowns: [] },
        { postExternalId: "image", memberships: [], unknowns: ["未知"] },
        { postExternalId: "another-video", memberships: [], unknowns: ["未知"] },
        { postExternalId: "unknown", memberships: [], unknowns: ["未知"] }
      ], boundaries: ["模型自适应多标签；占比可重叠。"]
    },
    boundaries: ["fixture"]
  } : null;
  return {
    get: (id: string) => id === runId ? currentRun : null,
    list: () => [currentRun],
    portfolio: () => ({
      analysis: {
        metricCoverage: { known: 4, missing: 1, rate: 0.8 }, likes: { median: 25, mean: 25, max: 40, p25: 17.5, p75: 32.5 },
        interpretationBoundary: "公开点赞只描述已观察表现。", unknowns: [], stopReason: "explicit_end", corpusCompleteness: "observed_converged"
      },
      annotations: {
        denominator: { observedPosts: 5, annotatedPosts: 5, classifiedPosts: 5, unclassifiedPosts: 0, parity: true },
        rows: [
          annotation("ready-video", 10, "video", "Agent", "教程"),
          annotation("missing-video", 20, "video", "Agent", "教程"),
          annotation("image", 30, "image", "工具", "对比"),
          annotation("another-video", 40, "video", "工具", "对比"),
          annotation("unknown", null, "image", "未归类主题", "图文（内容形式未知）")
        ]
      },
      selection: { items: [
        { externalId: "ready-video", title: "已就绪视频", url: "https://example.com/ready", mediaType: "video", likes: 10, tier: "high", tierRank: 1, anchors: [], deepCandidate: true, selectionReason: "fixture" },
        { externalId: "missing-video", title: "缺失视频", url: "https://example.com/missing", mediaType: "video", likes: 20, tier: "base", tierRank: 1, anchors: [], deepCandidate: true, selectionReason: "fixture" }
      ] },
      details: { posts: [] }, reconstructionBatch: reconstructionStates ? { items: Object.entries(reconstructionStates).map(([postExternalId, value]) =>
        typeof value === "string" ? { postExternalId, state: value } : { postExternalId, ...value }
      ) } : null, synthesis,
      mediaManifest: { items: [
        { externalId: "ready-video", state: "verified_complete", videoArtifactRef: `/artifacts/${runId}/deep-media/ready-video/source-video.mp4`, coverArtifactRef: null, durationSeconds: 12 },
        { externalId: "missing-video", state: "missing", videoArtifactRef: null, coverArtifactRef: null, durationSeconds: null }
      ] }
    })
  } as unknown as CreatorResearchService;
}

describe("creator dossier projection", () => {
  it("keeps independent evaluation findings separate from Builder work that has not been evaluated", () => {
    const dossier = loadCreatorDossier(service(false, {
      "ready-video": "evaluated_with_findings", "missing-video": "built_unevaluated"
    }), runId)!;
    expect(dossier.portfolio.items.find((item) => item.id === "ready-video")?.evidenceStatus)
      .toBe("deep_evaluated_with_findings");
    expect(dossier.portfolio.items.find((item) => item.id === "missing-video")?.evidenceStatus)
      .toBe("deep_built");
  });

  it("projects current Reviewer outcomes ahead of legacy Evaluator states", () => {
    const dossier = loadCreatorDossier(service(false, {
      "ready-video": { state: "built_unevaluated", researchReview: { reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" } },
      "missing-video": { state: "built_unevaluated", researchReview: { reviewStatus: "completed_with_findings", candidateStatus: "revised_unverified" } }
    }), runId)!;
    expect(dossier.portfolio.items.find((item) => item.id === "ready-video")?.evidenceStatus).toBe("deep_reviewed_no_findings");
    expect(dossier.portfolio.items.find((item) => item.id === "missing-video")?.evidenceStatus).toBe("deep_revised_unverified");
  });

  it("projects Reviewer findings and technical failures without calling either verified", () => {
    const withFindings = loadCreatorDossier(service(false, {
      "ready-video": { state: "verified", researchReview: { reviewStatus: "completed_with_findings", candidateStatus: "original_reviewed" } }
    }), runId)!;
    const failed = loadCreatorDossier(service(false, {
      "ready-video": { state: "built_unevaluated", researchReview: { reviewStatus: "failed", candidateStatus: "review_incomplete" } }
    }), runId)!;
    expect(withFindings.portfolio.items.find((item) => item.id === "ready-video")?.evidenceStatus).toBe("deep_reviewed_with_findings");
    expect(failed.portfolio.items.find((item) => item.id === "ready-video")?.evidenceStatus).toBe("deep_review_failed");
  });

  it("projects deterministic corpus statistics and annotation clusters", () => {
    const dossier = loadCreatorDossier(service(), runId)!;
    expect(dossier.corpus).toMatchObject({ videoCount: 3, percentiles: { p25: 17.5, p75: 32.5 } });
    expect(dossier.corpus.distribution).toEqual([
      { label: "低于 P25", count: 1, share: 0.25 }, { label: "P25–P75", count: 2, share: 0.5 }, { label: "高于 P75", count: 1, share: 0.25 }
    ]);
    expect(dossier.contentSystem.topicClusters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Agent", count: 2, share: 0.4, measuredCount: 2, medianLikes: 15, highCount: null })
    ]));
    expect(dossier.contentSystem.formatClusters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "教程", count: 2, meanLikes: 15 })
    ]));
    expect(dossier.corpus.annotationCoverage).toMatchObject({ method: "title_rules", classifiedPosts: 5,
      unclassifiedPosts: 0, artifactRef: `/artifacts/${runId}/annotations.json` });
  });

  it("only exposes a verified, run-local source-video artifact", () => {
    const dossier = loadCreatorDossier(service(), runId)!;
    expect(dossier.portfolio.items.find((item) => item.id === "ready-video")?.localVideoHref)
      .toBe(`/artifacts/${runId}/deep-media/ready-video/source-video.mp4`);
    expect(dossier.portfolio.items.find((item) => item.id === "missing-video")?.localVideoHref).toBeNull();
  });

  it("projects adaptive multi-label memberships and distinct-post corpus rollups", () => {
    const dossier = loadCreatorDossier(service(true), runId)!;
    expect(dossier.contentSystem.topicClusters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "AI 硬件", count: 2, share: 0.4 }),
      expect.objectContaining({ name: "智能穿戴", count: 1, share: 0.2 })
    ]));
    const item = dossier.portfolio.items.find((entry) => entry.id === "ready-video")!;
    expect(item).toMatchObject({ topics: ["AI 硬件", "智能穿戴"], formats: ["产品报道"],
      topic: "AI 硬件", format: "产品报道", classificationSources: ["surface_title", "deep_builder"] });
    expect(item.classificationDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "智能穿戴", membershipBoundary: "内容展示佩戴关系", registryBoundary: "标题表层" })
    ]));
    expect(dossier.corpus.annotationCoverage).toMatchObject({ method: "builder_adaptive", observedPosts: 5,
      annotatedPosts: 5, classifiedPosts: 2, unclassifiedPosts: 3,
      artifactRef: `/artifacts/${runId}/creator-synthesis/creator-analysis.json` });
    expect(item.topic).not.toBe("不应作为分类");
    expect(dossier.boundaries).toContain("模型自适应多标签；占比可重叠。");
  });
});
