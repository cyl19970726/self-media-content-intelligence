import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../modules/creator-research/service.js";
import type { ComparisonProjectService } from "../modules/comparison/service.js";
import { loadCreatorConsole } from "./console.js";
import { projectLegacyDossier } from "./creator-dossier.js";
import { loadVideoResearch } from "./video-research.js";
import { loadComparisonDossier } from "./comparison-dossier.js";

const emptyCreatorService = { list: () => [], get: () => null } as unknown as CreatorResearchService;

describe("Creator Analysis OS V1 read projections", () => {
  it("projects a legacy creator artifact into the canonical 21-record dossier", () => {
    const legacy = loadCreatorConsole("ai-red-witch");
    expect(legacy).not.toBeNull();
    const dossier = projectLegacyDossier("ai-red-witch", legacy!);
    expect(dossier.canonicalId).toBe("ai-red-witch");
    expect(dossier.source).toBe("legacy_adapter");
    expect(dossier.portfolio.items).toHaveLength(21);
    expect(new Set(dossier.portfolio.items.map((item) => item.id)).size).toBe(21);
    expect(dossier.portfolio.items.filter((item) => item.deepSample)).toHaveLength(9);
    expect(dossier.tiers.map((tier) => tier.id)).toEqual(["high", "base", "low"]);
  });

  it("projects the deepest available legacy video evidence into the unified video research contract", () => {
    const video = loadVideoResearch(emptyCreatorService, "ai-red-witch", "6801c0750000000007037156");
    expect(video).not.toBeNull();
    expect(video?.creatorId).toBe("ai-red-witch");
    expect(video?.transcript.length).toBeGreaterThan(0);
    expect(video?.knowledgeUnits.length).toBeGreaterThan(0);
    expect(video?.frames.sparse.length).toBeGreaterThan(0);
    expect(video?.gate.ready).toBe(true);
    expect(video?.lensCoverage.contentRestoration.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.state).toBe("ready");
    expect(video?.lensCoverage.visualEditingLogic.state).toBe("ready");
    expect(video?.knowledgeUnits.length).toBeGreaterThan(10);
    expect(video?.directingLogic.stages.length).toBeGreaterThan(0);
  });

  it("does not invent a record for an unknown video", () => {
    expect(loadVideoResearch(emptyCreatorService, "ai-red-witch", "missing-video")).toBeNull();
  });

  it("projects a gate-passed next-wave reconstruction into the same video page", () => {
    const video = loadVideoResearch(emptyCreatorService, "cyber-duck-aigc", "67b012c40000000017038a99");
    expect(video).not.toBeNull();
    expect(video?.creatorName).toBe("赛博鸭AIGC");
    expect(video?.engagement.likes).toBe(65_000);
    expect(video?.engagement.collections).toBe(62_000);
    expect(video?.knowledgeUnits.length).toBeGreaterThan(20);
    expect(video?.transcript).toHaveLength(17);
    expect(video?.frames.sparse).toHaveLength(12);
    expect(video?.frames.dense).toHaveLength(174);
    expect(video?.lensCoverage.contentRestoration.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.state).toBe("ready");
    expect(video?.lensCoverage.directingLogic.rules).toHaveLength(6);
    expect(video?.lensCoverage.visualEditingLogic.state).toBe("ready");
    expect(video?.lensCoverage.visualEditingLogic.rules).toHaveLength(7);
    expect(video?.gate.ready).toBe(true);
    expect(video?.sourceHref).toBe("https://www.xiaohongshu.com/explore/67b012c40000000017038a99");
  });

  it("projects a reconstructed next-wave sample as reviewable before independent lens evaluation", () => {
    const video = loadVideoResearch(emptyCreatorService, "cyber-duck-aigc", "658bfdde000000001000fcea");
    expect(video).not.toBeNull();
    expect(video?.title).toContain("Gemini");
    expect(video?.engagement.likes).toBe(1_289);
    expect(video?.engagement.collections).toBe(2_223);
    expect(video?.knowledgeUnits.length).toBeGreaterThan(20);
    expect(video?.transcript).toHaveLength(21);
    expect(video?.frames.sparse).toHaveLength(0);
    expect(video?.lensCoverage.contentRestoration.state).toBe("partial");
    expect(video?.gate.ready).toBe(false);
    expect(video?.sourceHref).toBe("https://www.xiaohongshu.com/explore/658bfdde000000001000fcea");
  });

  it("projects pinned comparison members without reviving the legacy benchmark", () => {
    const comparisonService = { get: () => ({
      project: {
        id: "comparison-fixture", name: "Fixture comparison", status: "ready", updatedAt: "2026-08-20T00:00:00Z",
        members: [
          { creatorRunId: "legacy-member-red", creatorId: "ai-red-witch", creatorName: "AI红发魔女" },
          { creatorRunId: "legacy-member-director", creatorId: "human-director", creatorName: "人类最强编导" }
        ], error: null
      },
      comparison: { observations: [], limitations: ["fixture boundary"] }
    }) } as unknown as ComparisonProjectService;
    const dossier = loadComparisonDossier(comparisonService, emptyCreatorService, "comparison-fixture");
    expect(dossier?.members).toHaveLength(2);
    expect(dossier?.members.map((member) => member.creatorId)).toEqual(["ai-red-witch", "human-director"]);
    expect(dossier?.scope.windowLabel).toContain("固定任务快照");
    expect(dossier?.matrices.values).toHaveLength(2);
    expect(dossier?.tiers).toHaveLength(3);
  });
});
