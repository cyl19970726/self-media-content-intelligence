import { describe, expect, it } from "vitest";
import type { VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";
import type { CreatorSynthesisIndependentEvaluation } from "./contracts.js";
import { combineCreatorSynthesisGates, validateCreatorSynthesis } from "./validate.js";

const runId = "11111111-1111-4111-8111-111111111111";
const checkedAt = "2026-08-20T02:00:00.000Z";

function selection() {
  const tiers = ["high", "base", "low"] as const;
  const items = tiers.flatMap((tier) => Array.from({ length: 7 }, (_, index) => ({
    externalId: `${tier}-${index + 1}`,
    url: `https://www.xiaohongshu.com/explore/${tier}-${index + 1}`,
    title: `${tier}-${index + 1}`,
    visibleText: null,
    mediaType: "video" as const,
    likesLabel: String(100 - index),
    likes: 100 - index,
    tier,
    tierRank: index + 1,
    anchors: index === 0 ? ["typical_form" as const] : [],
    selectionReason: "固定分层样本",
    deepCandidate: index < 3,
    deepState: "pending" as const,
    confounds: []
  })));
  return {
    schemaVersion: "1.0.0" as const,
    runId,
    generatedAt: checkedAt,
    sourceCorpusArtifactRef: `/artifacts/${runId}/corpus.json`,
    ruleVersion: "ranked-7x3-v1" as const,
    rules: {
      targetPerTier: 7 as const,
      deepCandidatesPerTier: 3 as const,
      high: "高表现",
      base: "基本盘",
      low: "低表现",
      unknownMetricPolicy: "exclude_from_metric_tiering" as const
    },
    denominator: { discoveredPosts: 21, eligiblePosts: 21, selectedPosts: 21, excludedMissingLikes: 0 },
    anchors: { median: 50, mean: 60, medianNearPostId: "base-1", meanNearPostId: "base-2", meanGap: false, meanGapReason: null },
    tierCounts: { high: 7, base: 7, low: 7 },
    items,
    limitations: ["只使用公开点赞"]
  };
}

function batch(): VideoReconstructionBatch {
  const deep = selection().items.filter((item) => item.deepCandidate);
  return {
    schemaVersion: "1.0.0" as const,
    creatorRunId: runId,
    revision: 1,
    generatedAt: checkedAt,
    requestedPosts: 9,
    readyPosts: 9,
    pendingPosts: 0,
    failedPosts: 0,
    items: deep.map((item) => ({
      postExternalId: item.externalId,
      tier: item.tier,
      tierRank: item.tierRank,
      state: "ready" as const,
      sourceMediaArtifactRef: `/artifacts/${runId}/deep-media/${item.externalId}/source-video.mp4`,
      reconstructionArtifactRef: `/artifacts/${runId}/video-reconstructions/${item.externalId}/reconstruction.json`,
      articleArtifactRef: `/artifacts/${runId}/video-reconstructions/${item.externalId}/article.md`,
      evaluationArtifactRef: `/artifacts/${runId}/video-reconstructions/${item.externalId}/evaluation.json`,
      gateReportArtifactRef: `/artifacts/${runId}/video-reconstructions/${item.externalId}/gate-report.json`,
      threeLensEvaluationArtifactRef: `/artifacts/${runId}/video-reconstructions/${item.externalId}/runtime-three-lens-evaluation.json`,
      threeLensGateReportArtifactRef: `/artifacts/${runId}/video-reconstructions/${item.externalId}/runtime-three-lens-gate-report.json`,
      failedGateIds: [],
      message: "硬闸通过",
      updatedAt: checkedAt
    })),
    limitations: []
  };
}

function claim(statement: string) {
  return { statement, factClass: "inference" as const, confidence: "medium" as const,
    evidenceRefs: [`/artifacts/${runId}/corpus.json`], caveat: "仅基于公开样本" };
}

function synthesis() {
  const selected = selection();
  const deepIds = new Set(selected.items.filter((item) => item.deepCandidate).map((item) => item.externalId));
  return {
    schemaVersion: "1.0.0" as const,
    creatorRunId: runId,
    generatedAt: checkedAt,
    inputs: {
      portfolioArtifactRef: `/artifacts/${runId}/portfolio.json`,
      selectionArtifactRef: `/artifacts/${runId}/selection.json`,
      detailArtifactRef: `/artifacts/${runId}/details.json`,
      reconstructionBatchArtifactRef: `/artifacts/${runId}/video-reconstruction-batch-r1.json`
    },
    identity: {
      positioning: claim("面向普通人的 AI 工具与应用解释者"),
      audience: [claim("关注 AI 实用价值的职场人")],
      problemsAddressed: [claim("降低工具理解与使用门槛")],
      valueProvided: [claim("提供工具用途与边界信息")],
      trustSources: [claim("持续演示与案例")],
      lifecycleStage: claim("增长期"),
      commercialPaths: [claim("可能存在工具合作，片内证据不足")]
    },
    contentSystem: {
      topicClusters: [claim("AI 工具")],
      formatClusters: [claim("口播加界面演示")],
      visualLanguage: [claim("竖屏人物与界面贴片")],
      publishingRhythm: [claim("发布时间分散")],
      recurringStructure: [claim("问题、演示、结论")]
    },
    performance: {
      baseline: [claim("中位附近构成公开表现基本盘")],
      high: [claim("部分工具解法进入高表现区")],
      low: [claim("部分观点内容处于低表现区")],
      timing: [claim("公开样本不足以确认发布时间规律")],
      confounds: ["粉丝规模、推荐分发和投流不可见"]
    },
    postAnalyses: selected.items.map((item) => ({
      postExternalId: item.externalId,
      tier: item.tier,
      tierRank: item.tierRank,
      title: item.title,
      evidenceStatus: deepIds.has(item.externalId) ? "deep_validated" as const : "surface_only" as const,
      contentRole: "工具解释",
      contentForm: ["竖屏"],
      performanceInterpretation: "相对于该账号公开样本的位置",
      evidenceRefs: deepIds.has(item.externalId)
        ? [`/artifacts/${runId}/video-reconstructions/${item.externalId}/reconstruction.json`]
        : [`/artifacts/${runId}/details.json#${item.externalId}`],
      unknowns: ["后台留存未知"]
    })),
    boundaries: ["公开数据不能判断曝光、完播、转粉、投流或成交。"]
  };
}

describe("validateCreatorSynthesis", () => {
  it("accepts a complete evidence-bound research synthesis", () => {
    const gate = validateCreatorSynthesis({ creatorRunId: runId, selection: selection(), batch: batch(), synthesis: synthesis(), checkedAt });
    expect(gate.ready).toBe(true);
    expect(gate.failedGateIds).toEqual([]);
  });

  it("rejects creation advice inside a research artifact", () => {
    const candidate = synthesis();
    candidate.performance.high[0]!.statement = "我们下一条应该直接复制这个标题公式";
    const gate = validateCreatorSynthesis({ creatorRunId: runId, selection: selection(), batch: batch(), synthesis: candidate, checkedAt });
    expect(gate.ready).toBe(false);
    expect(gate.failedGateIds).toContain("research_creation_separation");
  });

  it("rejects synthesis when any deep sample has not passed reconstruction", () => {
    const incomplete = batch();
    incomplete.items[0]!.state = "not_ready";
    incomplete.readyPosts = 8;
    incomplete.failedPosts = 1;
    const gate = validateCreatorSynthesis({ creatorRunId: runId, selection: selection(), batch: incomplete, synthesis: synthesis(), checkedAt });
    expect(gate.failedGateIds).toContain("deep_9_ready");
  });

  it("requires the fresh independent evaluator as well as deterministic gates", () => {
    const deterministicGate = validateCreatorSynthesis({
      creatorRunId: runId, selection: selection(), batch: batch(), synthesis: synthesis(), checkedAt
    });
    const ids = deterministicGate.gates.map((gate) => gate.id) as CreatorSynthesisIndependentEvaluation["gates"][number]["id"][];
    const independentEvaluation: CreatorSynthesisIndependentEvaluation = {
      schemaVersion: "creator-synthesis-independent-evaluation@1",
      creatorRunId: runId,
      candidateRevisionFingerprint: "a".repeat(64),
      evaluatorRunId: "22222222-2222-4222-8222-222222222222",
      independentOfCandidate: true,
      evaluatedAt: checkedAt,
      gates: ids.map((id) => ({
        id,
        pass: id !== "research_creation_separation",
        message: id === "research_creation_separation" ? "独立检查发现创作建议。" : "独立检查通过。",
        evidenceRefs: [`/artifacts/${runId}/creator-synthesis/creator-analysis.json`]
      })) as CreatorSynthesisIndependentEvaluation["gates"]
    };

    const gate = combineCreatorSynthesisGates({
      deterministicGate,
      independentEvaluation,
      candidateRevisionFingerprint: "a".repeat(64),
      independentEvaluationArtifactRef: `/artifacts/${runId}/creator-synthesis-evaluation.json`,
      checkedAt
    });

    expect(deterministicGate.ready).toBe(true);
    expect(gate.ready).toBe(false);
    expect(gate.failedGateIds).toEqual(["research_creation_separation"]);
    expect(gate.schemaVersion).toBe("1.1.0");
    expect(gate.evaluator?.independentOfCandidate).toBe(true);
  });

  it("rejects an independent evaluation bound to a stale synthesis revision", () => {
    const deterministicGate = validateCreatorSynthesis({
      creatorRunId: runId, selection: selection(), batch: batch(), synthesis: synthesis(), checkedAt
    });
    const independentEvaluation = {
      schemaVersion: "creator-synthesis-independent-evaluation@1" as const,
      creatorRunId: runId,
      candidateRevisionFingerprint: "b".repeat(64),
      evaluatorRunId: "22222222-2222-4222-8222-222222222222",
      independentOfCandidate: true as const,
      evaluatedAt: checkedAt,
      gates: deterministicGate.gates.map((gate) => ({
        id: gate.id as CreatorSynthesisIndependentEvaluation["gates"][number]["id"],
        pass: true,
        message: "通过",
        evidenceRefs: [`/artifacts/${runId}/creator-synthesis/creator-analysis.json`]
      })) as CreatorSynthesisIndependentEvaluation["gates"]
    };
    expect(() => combineCreatorSynthesisGates({
      deterministicGate,
      independentEvaluation,
      candidateRevisionFingerprint: "a".repeat(64),
      independentEvaluationArtifactRef: `/artifacts/${runId}/creator-synthesis-evaluation.json`,
      checkedAt
    })).toThrow("independent_synthesis_revision_mismatch");
  });
});
