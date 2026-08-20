import { describe, expect, it } from "vitest";
import { compareCreatorPortfolios } from "./analyzer.js";

function member(id: string, name: string, median: number, mean: number, max: number, coverage = 1) {
  const runId = `${id.repeat(8)}-${id.repeat(4)}-4${id.repeat(3)}-8${id.repeat(3)}-${id.repeat(12)}`;
  return {
    creatorRunId: runId,
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

describe("compareCreatorPortfolios", () => {
  it("compares creator-relative distributions without inventing mechanisms", () => {
    const result = compareCreatorPortfolios([member("1", "甲", 100, 300, 3000), member("2", "乙", 200, 400, 4000)], "2026-08-20T01:00:00Z");
    expect(result.readiness).toBe("portfolio_only");
    expect(result.members[0]?.headToMedianRatio).toBe(30);
    expect(result.observations[0]?.classification).toBe("track_wide");
    expect(result.observations[0]?.boundary).toMatch(/不证明.*机制/);
    expect(result.limitations.join(" ")).toMatch(/不生成发帖建议/);
  });
});
