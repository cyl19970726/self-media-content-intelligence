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

  it("projects legacy video evidence into the unified video research contract", () => {
    const video = loadVideoResearch(emptyCreatorService, "ai-red-witch", "6801c0750000000007037156");
    expect(video).not.toBeNull();
    expect(video?.creatorId).toBe("ai-red-witch");
    expect(video?.transcript.length).toBeGreaterThan(0);
    expect(video?.knowledgeUnits.length).toBeGreaterThan(0);
    expect(video?.frames.sparse.length).toBeGreaterThan(0);
    expect(video?.gate.ready).toBe(false);
    expect(video?.gate.failedGateIds).toContain("legacy_evidence_projection");
  });

  it("does not invent a record for an unknown video", () => {
    expect(loadVideoResearch(emptyCreatorService, "ai-red-witch", "missing-video")).toBeNull();
  });

  it("projects pinned comparison members without reviving the legacy benchmark", () => {
    const comparisonService = { get: () => ({
      project: {
        id: "comparison-fixture", name: "Fixture comparison", status: "ready", updatedAt: "2026-08-20T00:00:00Z",
        members: [
          { creatorRunId: "ai-red-witch", creatorName: "AI红发魔女" },
          { creatorRunId: "human-director", creatorName: "人类最强编导" }
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
