import { describe, expect, it } from "vitest";
import { assertValidCrossPostResearch } from "./validate.js";

const runId = "11111111-1111-4111-8111-111111111111";
const deepIds = Array.from({ length: 12 }, (_, index) => `deep-${index + 1}`);
const surfaceIds = Array.from({ length: 9 }, (_, index) => `surface-${index + 1}`);

function fixture() {
  const ids = [...deepIds, ...surfaceIds];
  const selection = {
    schemaVersion: "1.0.0", runId, generatedAt: "2026-09-14T00:00:00.000Z",
    sourceCorpusArtifactRef: `/artifacts/${runId}/corpus.json`, ruleVersion: "four-groups-3-each-v2",
    rules: { targetPerTier: 7, deepCandidatesPerTier: 3, high: "高", base: "中", low: "低", unknownMetricPolicy: "exclude_from_metric_tiering" },
    denominator: { discoveredPosts: 21, eligiblePosts: 21, selectedPosts: 21, excludedMissingLikes: 0 },
    anchors: { median: 10, mean: 10, medianNearPostId: "deep-5", meanNearPostId: "deep-8", meanGap: false, meanGapReason: null },
    tierCounts: { high: 7, base: 7, low: 7 },
    items: ids.map((externalId, index) => ({ externalId, url: `https://example.com/${externalId}`, title: externalId,
      visibleText: null, mediaType: "video", likesLabel: String(index), likes: index, tier: index < 7 ? "high" : index < 14 ? "base" : "low",
      tierRank: index % 7 + 1, anchors: [], selectionReason: "固定样本", deepCandidate: deepIds.includes(externalId),
      deepGroups: deepIds.includes(externalId) ? [index < 3 ? "high" : index < 6 ? "median" : index < 9 ? "mean" : "low"] : [],
      deepState: "pending", confounds: [] })), limitations: ["公开样本"]
  };
  const batch = { schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: "2026-09-14T00:00:00.000Z",
    requestedPosts: 12, builtPosts: 12, verifiedPosts: 12, readyPosts: 12, pendingPosts: 0, failedPosts: 0,
    items: deepIds.map((postExternalId, index) => ({ postExternalId, tier: index < 7 ? "high" : "base", tierRank: index + 1,
      state: "ready", evaluationPolicy: "single_pass@37a03aae", sourceMediaArtifactRef: `/media/${postExternalId}.mp4`,
      reconstructionArtifactRef: `/artifacts/${runId}/video-reconstructions/${postExternalId}/reconstruction.json`, articleArtifactRef: null,
      evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
      failedGateIds: [], message: "完成", updatedAt: "2026-09-14T00:00:00.000Z" })), limitations: [] };
  const support = deepIds.map((postExternalId) => ({ postExternalId, observation: "该帖提供了具体的中文观察。",
    evidenceRefs: [`/artifacts/${runId}/video-reconstructions/${postExternalId}/reconstruction.json#builderLenses`] }));
  const claim = { statement: "中文结论", factClass: "inference", confidence: "medium", evidenceRefs: ["artifact"], caveat: "中文边界" };
  const synthesis = { schemaVersion: "1.0.0", creatorRunId: runId, generatedAt: "2026-09-14T00:00:00.000Z",
    inputs: { portfolioArtifactRef: "portfolio", portfolioAnnotationsArtifactRef: null, selectionArtifactRef: "selection", detailArtifactRef: "detail", reconstructionBatchArtifactRef: "batch" },
    identity: { positioning: claim, audience: [claim], problemsAddressed: [claim], valueProvided: [claim], trustSources: [claim], lifecycleStage: claim, commercialPaths: [] },
    contentSystem: { topicClusters: [claim], formatClusters: [claim], visualLanguage: [claim], publishingRhythm: [], recurringStructure: [claim] },
    performance: { baseline: [claim], high: [claim], low: [claim], timing: [], confounds: ["后台未知"] },
    postAnalyses: ids.map((postExternalId, index) => ({ postExternalId, tier: index < 7 ? "high" : index < 14 ? "base" : "low", tierRank: index % 7 + 1,
      title: postExternalId, evidenceStatus: deepIds.includes(postExternalId) ? "deep_validated" : "surface_only", contentRole: "内容角色", contentForm: ["视频"],
      performanceInterpretation: "公开表现位置", evidenceRefs: ["artifact"], unknowns: ["后台未知"] })), boundaries: ["曝光、完播、转粉、投流和成交未知"],
    crossPostResearch: { sections: (["value", "knowledge", "patterns", "performance", "next_questions"] as const).map((id, index) => ({
      id, title: "中文标题", findings: [{ id: `${id}-1`, statement: "这是跨帖中文结论。", factClass: "inference", confidence: "medium",
        support: index === 0 ? support : [support[index]!], counterexamples: [], boundary: "当前证据未发现反例。", openQuestions: ["是否存在其他边界？"] }] })) }
  };
  return { selection, batch, synthesis };
}

describe("cross-post research validation", () => {
  it("accepts five sections that cover all 12 deep samples with their own artifacts", () => {
    const value = fixture();
    expect(() => assertValidCrossPostResearch(value)).not.toThrow();
  });

  it("rejects a no-counterexample sentence alongside an actual counterexample", () => {
    const value = fixture();
    const finding = value.synthesis.crossPostResearch.sections[0]!.findings[0]!;
    Object.assign(finding, { counterexamples: [finding.support[0]!] });
    finding.boundary = "当前未发现反例；反例只反对所有素材都能证明连续操作。";
    expect(() => assertValidCrossPostResearch(value)).toThrow(/cross_post_research_counterexample_boundary_conflict/);
    finding.boundary = "反例只反对所有素材都能证明连续操作，不反对常用口播结构。";
    expect(() => assertValidCrossPostResearch(value)).not.toThrow();
  });

  it("rejects evidence borrowed from another deep post", () => {
    const value = fixture();
    value.synthesis.crossPostResearch.sections[0]!.findings[0]!.support[0]!.evidenceRefs = [
      `/artifacts/${runId}/video-reconstructions/deep-2/reconstruction.json`
    ];
    expect(() => assertValidCrossPostResearch(value)).toThrow(/cross_post_research_foreign_deep_evidence/);
  });
});
