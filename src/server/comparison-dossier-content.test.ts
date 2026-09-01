import { describe, expect, it } from "vitest";
import type { ComparisonProjectService, CreatorResearchService } from "../../packages/research/index.js";
import { loadComparisonDossier } from "./comparison-dossier.js";

describe("comparison dossier content-validated projection", () => {
  it("keeps pinned member count and exposes governed patterns even when creator dossiers are unavailable", () => {
    const claim = { statement: "固定版本结论", factClass: "observed", confidence: "high", evidenceRefs: ["artifact:pinned"], caveat: null };
    const comparisons = { get: () => ({ project: { id: "comparison-1", name: "Pinned content comparison", status: "ready",
      updatedAt: "2026-08-30T00:00:00.000Z", members: [
        { creatorRunId: "run-a", creatorId: "creator-a", creatorName: "甲" }, { creatorRunId: "run-b", creatorId: "creator-b", creatorName: "乙" }
      ], inputArtifactRef: "artifact:input", error: null }, comparison: { observations: [], limitations: [], exceptions: [], gaps: [],
        members: [
          { creatorRunId: "run-a", discoveredPosts: 20, likesCoverage: 1, medianLikes: 10, meanLikes: 20, maxLikes: 100, meanToMedianRatio: 2, headToMedianRatio: 10, selectedCounts: { high: 7, base: 7, low: 6 } },
          { creatorRunId: "run-b", discoveredPosts: 21, likesCoverage: 0.9, medianLikes: 20, meanLikes: 40, maxLikes: 200, meanToMedianRatio: 2, headToMedianRatio: 10, selectedCounts: { high: 7, base: 7, low: 7 } }
        ],
        comparability: { platform: "小红书", timeWindowAligned: false, warnings: [], members: [], metricBasis: "公开点赞" },
        creatorProfiles: ["run-a", "run-b"].map((runId, index) => ({ creatorRunId: runId, creatorId: `creator-${index ? "b" : "a"}`, creatorName: index ? "乙" : "甲",
          positioning: claim, audience: [claim], values: [claim], trustSources: [claim], lifecycle: claim, commercialPaths: [claim],
          topics: [claim], formats: [claim], visualLanguage: [claim], recurringStructures: [claim], high: [claim], baseline: [claim], low: [claim] })),
        contentPatterns: [{ role: "先展示结果", classification: "conditional", statement: "两个固定博主综合出现共同角色。",
          boundary: "不声明因果。", creatorIds: ["creator-a", "creator-b"], condition: { format: "口播" }, support: [] }] } }) } as unknown as ComparisonProjectService;
    const creators = { list: () => [], get: () => null } as unknown as CreatorResearchService;
    const dossier = loadComparisonDossier(comparisons, creators, "comparison-1");
    expect(dossier?.scope.memberCount).toBe(2);
    expect(dossier?.members[0]).toMatchObject({ name: "甲", postCount: 20, positioning: { statement: "固定版本结论" } });
    expect(dossier?.matrices.topics[0]?.statements[0]?.evidenceRefs).toEqual(["artifact:pinned"]);
    expect(dossier?.ledger).toEqual([expect.objectContaining({ classification: "conditional", statement: "两个固定博主综合出现共同角色。" })]);
  });
});
