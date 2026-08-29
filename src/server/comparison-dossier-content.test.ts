import { describe, expect, it } from "vitest";
import type { ComparisonProjectService, CreatorResearchService } from "../../packages/research/index.js";
import { loadComparisonDossier } from "./comparison-dossier.js";

describe("comparison dossier content-validated projection", () => {
  it("keeps pinned member count and exposes governed patterns even when creator dossiers are unavailable", () => {
    const comparisons = { get: () => ({ project: { id: "comparison-1", name: "Pinned content comparison", status: "ready",
      updatedAt: "2026-08-30T00:00:00.000Z", members: [
        { creatorRunId: "run-a", creatorId: "creator-a" }, { creatorRunId: "run-b", creatorId: "creator-b" }
      ], error: null }, comparison: { observations: [], limitations: [], exceptions: [], gaps: [],
        contentPatterns: [{ role: "先展示结果", classification: "conditional", statement: "两个固定博主综合出现共同角色。",
          boundary: "不声明因果。", creatorIds: ["creator-a", "creator-b"], condition: { format: "口播" }, support: [] }] } }) } as unknown as ComparisonProjectService;
    const creators = { list: () => [], get: () => null } as unknown as CreatorResearchService;
    const dossier = loadComparisonDossier(comparisons, creators, "comparison-1");
    expect(dossier?.scope.memberCount).toBe(2);
    expect(dossier?.ledger).toEqual([expect.objectContaining({ classification: "conditional", statement: "两个固定博主综合出现共同角色。" })]);
  });
});
