import { describe, expect, it } from "vitest";
import { compareCreatorPortfolios } from "./analyzer.js";

function member(id: string, name: string, median: number, mean: number, max: number, coverage = 1) {
  const runId = `${id.repeat(8)}-${id.repeat(4)}-4${id.repeat(3)}-8${id.repeat(3)}-${id.repeat(12)}`;
  return {
    creatorRunId: runId,
    creatorId: `creator-${id}`,
    sourceRunId: runId,
    revision: "fixture-r1",
    creatorName: name,
    portfolioRevision: "portfolio-v1",
    analysis: {
      schemaVersion: "1.0.0", runId, generatedAt: "2026-08-20T00:00:00Z",
      corpusArtifactRef: "/artifacts/corpus.json", selectionArtifactRef: "/artifacts/selection.json",
      metricCoverage: { known: Math.round(100 * coverage), missing: 100 - Math.round(100 * coverage), rate: coverage },
      likes: { min: 1, p25: 10, median, mean, p75: mean, max },
      tierCounts: { high: 7, base: 7, low: 7 },
      anchors: { median, mean, medianNearPostId: "m", meanNearPostId: "a", meanGap: false, meanGapReason: null },
      interpretationBoundary: "distribution only", unknowns: []
    },
    selection: {
      schemaVersion: "1.0.0", runId, generatedAt: "2026-08-20T00:00:00Z",
      sourceCorpusArtifactRef: "/artifacts/corpus.json", ruleVersion: "ranked-7x3-v1",
      rules: { targetPerTier: 7, deepCandidatesPerTier: 3, high: "h", base: "b", low: "l", unknownMetricPolicy: "exclude_from_metric_tiering" },
      denominator: { discoveredPosts: 100, eligiblePosts: Math.round(100 * coverage), selectedPosts: 21, excludedMissingLikes: 100 - Math.round(100 * coverage) },
      anchors: { median, mean, medianNearPostId: "m", meanNearPostId: "a", meanGap: false, meanGapReason: null },
      tierCounts: { high: 7, base: 7, low: 7 }, items: [], limitations: []
    }
  };
}

function contentMember(id: string, name: string) {
  const value = member(id, name, 100, 200, 1000);
  const claim = { statement: "可核验判断", factClass: "observed", confidence: "high", evidenceRefs: [`evidence:${id}`], caveat: null };
  return { ...value,
    synthesis: { schemaVersion: "1.0.0", creatorRunId: value.creatorRunId, generatedAt: "2026-08-20T00:00:00Z",
      inputs: { portfolioArtifactRef: "p", selectionArtifactRef: "s", detailArtifactRef: "d", reconstructionBatchArtifactRef: "r" },
      identity: { positioning: claim, audience: [claim], problemsAddressed: [claim], valueProvided: [claim], trustSources: [claim], lifecycleStage: claim, commercialPaths: [] },
      contentSystem: { topicClusters: [claim], formatClusters: [claim], visualLanguage: [claim], publishingRhythm: [], recurringStructure: [claim] },
      performance: { baseline: [claim], high: [claim], low: [claim], timing: [], confounds: ["unknown"] },
      postAnalyses: Array.from({ length: 21 }, (_, index) => ({ postExternalId: `${id}-post-${index + 1}`,
        tier: index < 7 ? "high" : index < 14 ? "base" : "low", tierRank: index % 7 + 1, title: null,
        evidenceStatus: index % 3 === 0 ? "deep_validated" : "surface_only", contentRole: index < 3 ? "先展示结果" : `local-${id}-${index}`,
        contentForm: ["口播"], performanceInterpretation: "只描述固定样本", evidenceRefs: [`evidence:${id}:${index}`], unknowns: [] })),
      boundaries: ["不声明因果。"] },
    synthesisGate: { schemaVersion: "1.1.0", creatorRunId: value.creatorRunId, ready: true, gates: [], failedGateIds: [], checkedAt: "2026-08-20T00:00:00Z",
      candidateRevisionFingerprint: "a".repeat(64), independentEvaluationArtifactRef: `evaluation:${id}`,
      evaluator: { evaluatorRunId: `${id.repeat(8)}-${id.repeat(4)}-4${id.repeat(3)}-8${id.repeat(3)}-${id.repeat(12)}`,
        independentOfCandidate: true, evaluatedAt: "2026-08-20T00:00:00Z" } }
  };
}

describe("compareCreatorPortfolios", () => {
  it("compares creator-relative distributions without inventing mechanisms", () => {
    const result = compareCreatorPortfolios([member("1", "甲", 100, 300, 3000), member("2", "乙", 200, 400, 4000)], "2026-08-20T01:00:00Z");
    expect(result.readiness).toBe("portfolio_only");
    expect(result.members[0]?.headToMedianRatio).toBe(30);
    expect(result.observations[0]?.classification).toBe("track_wide");
    expect(result.observations[0]?.boundary).toMatch(/不证明.*机制/);
    expect(result.limitations.join(" ")).toMatch(/不生成发帖建议/);
  });

  it("derives bounded conditional content patterns only from pinned ready syntheses", () => {
    const result = compareCreatorPortfolios([contentMember("1", "甲"), contentMember("2", "乙")], "2026-08-20T01:00:00Z");
    expect(result.readiness).toBe("content_validated");
    expect(result.contentPatterns).toHaveLength(1);
    expect(result.contentPatterns[0]).toMatchObject({ role: "先展示结果", classification: "conditional", condition: { format: "口播" } });
    expect(result.contentPatterns[0]?.support).toHaveLength(6);
    expect(result.exceptions.length).toBeGreaterThan(0);
  });
});
