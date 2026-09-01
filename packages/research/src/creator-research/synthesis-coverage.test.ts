import { describe, expect, it } from "vitest";
import { creatorSelectionSchema } from "../portfolio/contracts.js";
import { videoReconstructionBatchSchema } from "../video-analysis/batch-contracts.js";
import { creatorSynthesisCoverage } from "./synthesis-coverage.js";

function fixtures(states: Array<"built_unevaluated" | "evaluated_with_findings" | "verified" | "blocked">) {
  const groups = ["high", "median", "mean", "low"] as const;
  const selection = creatorSelectionSchema.parse({
    schemaVersion: "1.0.0", runId: "11111111-1111-4111-8111-111111111111", generatedAt: new Date(0).toISOString(),
    sourceCorpusArtifactRef: "/artifacts/corpus.json", ruleVersion: "four-groups-3-each-v2",
    rules: { targetPerTier: 7, deepCandidatesPerTier: 3, deepCandidatesPerGroup: 3, deepGroupContract: "test",
      high: "test", base: "test", low: "test", unknownMetricPolicy: "exclude_from_metric_tiering" },
    denominator: { discoveredPosts: 4, eligiblePosts: 4, selectedPosts: 4, excludedMissingLikes: 0 },
    anchors: { median: 2, mean: 2, medianNearPostId: "p1", meanNearPostId: "p2", meanGap: false, meanGapReason: null },
    tierCounts: { high: 1, base: 2, low: 1 },
    items: groups.map((group, index) => ({ externalId: `p${index}`, url: `https://example.com/p${index}`, title: group,
      visibleText: null, mediaType: "video", likesLabel: null, likes: index + 1, tier: index === 0 ? "high" : index === 3 ? "low" : "base",
      tierRank: 1, anchors: [], selectionReason: "test", deepCandidate: true, deepGroups: [group], deepState: "pending", confounds: [] })),
    limitations: []
  });
  const batch = videoReconstructionBatchSchema.parse({ schemaVersion: "1.0.0", creatorRunId: selection.runId, revision: 1,
    generatedAt: new Date(0).toISOString(), requestedPosts: 4, builtPosts: 0, verifiedPosts: 0, readyPosts: 0,
    pendingPosts: 0, failedPosts: 0, limitations: [], items: states.map((state, index) => ({ postExternalId: `p${index}`,
      tier: index === 0 ? "high" : index === 3 ? "low" : "base", tierRank: 1, state,
      evaluationPolicy: "skip@builder-fast-path-v1", sourceMediaArtifactRef: null, reconstructionArtifactRef: null,
      articleArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
      threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null, failedGateIds: state === "blocked" ? ["media_verification"] : [],
      message: "test", updatedAt: new Date(0).toISOString() })) });
  return { selection, batch };
}

describe("creatorSynthesisCoverage", () => {
  it("allows provisional synthesis from four-group Builder coverage without promoting Wiki", () => {
    const { selection, batch } = fixtures(["built_unevaluated", "evaluated_with_findings", "built_unevaluated", "evaluated_with_findings"]);
    expect(creatorSynthesisCoverage(selection, batch)).toMatchObject({ provisionalAllowed: true, formalAllowed: false, allowed: false });
  });

  it("allows formal synthesis for verified and legacy ready-compatible states", () => {
    const { selection, batch } = fixtures(["verified", "verified", "verified", "verified"]);
    expect(creatorSynthesisCoverage(selection, batch)).toMatchObject({ provisionalAllowed: true, formalAllowed: true, allowed: true });
  });

  it("does not mistake a normal blocked item for bounded media coverage", () => {
    const { selection, batch } = fixtures(["verified", "verified", "verified", "blocked"]);
    batch.limitations.push("bounded_media_retry_once:p3");
    expect(creatorSynthesisCoverage(selection, batch)).toMatchObject({ formalAllowed: false, missingFormalGroups: ["low"] });
  });
});
