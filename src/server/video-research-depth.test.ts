import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { loadVideoResearch } from "./video-research.js";

const describeWithExternalEvidence = process.env.SIGNAL_ROOM_EVIDENCE_ROOT ? describe : describe.skip;

const emptyService = { list: () => [], get: () => null } as unknown as CreatorResearchService;

describeWithExternalEvidence("legacy deep-video research projections", () => {
  it("restores the validated red-witch reconstruction instead of the shallow report adapter", () => {
    const video = loadVideoResearch(emptyService, "ai-red-witch", "6801c0750000000007037156");
    expect(video?.gate.ready).toBe(true);
    expect(video?.article?.length).toBeGreaterThan(2_000);
    expect(video?.knowledgeUnits).toHaveLength(20);
    expect(video?.relations).toHaveLength(12);
    expect(video?.directingLogic.stages).toHaveLength(7);
    expect(video?.directingLogic.stages.every((stage) => stage.proof && stage.evidenceRefs.length > 0)).toBe(true);
    expect(video?.directingLogic.informationDesign.length).toBeGreaterThanOrEqual(4);
    expect(video?.visualEditing.carriers.length).toBeGreaterThanOrEqual(8);
    expect(video?.frames.sparse).toHaveLength(8);
    expect(video?.frames.dense.length).toBeGreaterThan(100);
    expect(video?.transcript.every((cue) => cue.representativeFrame && cue.overlappingShots.length > 0)).toBe(true);
    expect(video?.performanceContext.creatorMedianLikes).toBe(324);
    expect(video?.lensCoverage.contentRestoration.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.state).toBe("ready");
    expect(video?.lensCoverage.visualEditingLogic.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.rules).toHaveLength(6);
    expect(video?.lensCoverage.visualEditingLogic.rules).toHaveLength(7);
    expect(video?.lensCoverage.directingLogic.evaluator?.id).toContain("independent");
    expect(video?.visualEditing.claims).toHaveLength(7);
    expect(video?.visualEditing.shotSemantics).toHaveLength(8);
  });

  it("restores Zhang Zala's full deepDive with independent three-lens evaluation", () => {
    const video = loadVideoResearch(emptyService, "zhang-zala", "69fe6f3a000000001a036be4");
    expect(video?.gate.ready).toBe(true);
    expect(video?.gate.failedGateIds).toEqual([]);
    expect(video?.article?.length).toBeGreaterThan(10_000);
    expect(video?.knowledgeUnits).toHaveLength(10);
    expect(video?.relations).toHaveLength(5);
    expect(video?.directingLogic.stages).toHaveLength(6);
    expect(video?.directingLogic.stages.every((stage) => stage.proof && stage.evidenceRefs.length > 0)).toBe(true);
    expect(video?.visualEditing.claims).toHaveLength(7);
    expect(video?.visualEditing.shotSemantics).toHaveLength(6);
    expect(video?.frames.dense.length).toBeGreaterThan(120);
    expect(video?.transcript).toHaveLength(47);
    expect(video?.performanceContext.percentileRank).toBe(100);
    expect(video?.lensCoverage.contentRestoration.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.state).toBe("ready");
    expect(video?.lensCoverage.visualEditingLogic.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.rules.every((rule) => rule.pass)).toBe(true);
    expect(video?.lensCoverage.visualEditingLogic.rules.every((rule) => rule.pass)).toBe(true);
    expect(video?.lensCoverage.contentRestoration.rules).toHaveLength(6);
  });

  it("restores the human-director validated content reconstruction with real analysis and evidence metrics", () => {
    const video = loadVideoResearch(emptyService, "human-director", "6a2fcd940000000007021a9f");
    expect(video?.gate.ready).toBe(true);
    expect(video?.lensCoverage.contentRestoration.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.state).toBe("ready");
    expect(video?.lensCoverage.visualEditingLogic.state).toBe("ready");
    expect(video?.article?.length).toBeGreaterThan(2_000);
    expect(video?.knowledgeUnits).toHaveLength(21);
    expect(video?.relations).toHaveLength(30);
    expect(video?.directingLogic.stages).toHaveLength(10);
    expect(video?.directingLogic.informationDesign).toHaveLength(10);
    expect(video?.visualEditing.claims).toHaveLength(8);
    expect(video?.visualEditing.shotSemantics).toHaveLength(10);
    expect(video?.transcript.every((cue) => cue.overlappingShots.length > 0)).toBe(true);
    expect(video?.lensCoverage.visualEditingLogic.rules).toHaveLength(7);
    expect(video?.visualEditing.shotCount).toBe(14);
    expect(video?.visualEditing.cutsPerMinute).toBe(4.8);
    expect(video?.transcript).toHaveLength(53);
    expect(video?.frames.dense).toHaveLength(53);
    expect(video?.performanceContext.creatorMedianLikes).toBe(1821);
  });

  it("does not invent a deep page outside the available creator artifacts", () => {
    expect(loadVideoResearch(emptyService, "zhang-zala", "missing-video")).toBeNull();
  });
});
