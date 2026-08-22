import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "./service.js";
import { loadCreatorDossier } from "../../server/creator-dossier.js";

const emptyCreatorService = { list: () => [], get: () => null } as unknown as CreatorResearchService;

describe("creator research pipeline projection", () => {
  it("exposes the complete 13-stage Skill and runtime ledger", () => {
    const dossier = loadCreatorDossier(emptyCreatorService, "cyber-duck-aigc");
    expect(dossier?.pipeline?.stages.map((stage) => stage.id)).toEqual([
      "run_contract", "identity_verification", "inventory_acquisition", "detail_enrichment",
      "portfolio_annotation", "corpus_statistics", "sample_selection", "media_verification",
      "video_reconstruction", "video_evaluation", "creator_synthesis", "creator_evaluation",
      "dashboard_projection"
    ]);
    expect(dossier?.pipeline?.stages.every((stage) => stage.workerKind.length > 0)).toBe(true);
    expect(dossier?.pipeline?.stages.find((stage) => stage.id === "corpus_statistics")?.skillId).toBeNull();
    expect(dossier?.pipeline?.stages.find((stage) => stage.id === "video_reconstruction")?.skillId).toBe("video-content-reconstruction");
  });

  it("keeps Cyber Duck partial when detail, evaluation and synthesis evidence are incomplete", () => {
    const pipeline = loadCreatorDossier(emptyCreatorService, "cyber-duck-aigc")?.pipeline;
    expect(pipeline?.ready).toBe(false);
    expect(pipeline?.state).toBe("partial");
    expect(pipeline?.stages.find((stage) => stage.id === "inventory_acquisition")?.state).toBe("partial");
    expect(pipeline?.stages.find((stage) => stage.id === "detail_enrichment")?.missingInputs.some((item) => /^发布时间：\d+\/319$/.test(item))).toBe(true);
    expect(pipeline?.stages.find((stage) => stage.id === "sample_selection")?.missingInputs.some((item) => /^代表深度样本：\d+\/9$/.test(item))).toBe(true);
    expect(pipeline?.stages.find((stage) => stage.id === "video_reconstruction")?.state).toBe("partial");
    expect(pipeline?.stages.find((stage) => stage.id === "video_evaluation")?.missingInputs.some((item) => /^独立三镜头硬闸：\d+\/9$/.test(item))).toBe(true);
    expect(pipeline?.stages.find((stage) => stage.id === "creator_evaluation")?.state).toBe("pending");
    expect(pipeline?.stages.find((stage) => stage.id === "dashboard_projection")?.state).toBe("partial");
  });

  it("does not confuse a visible dashboard with a completed research run", () => {
    const pipeline = loadCreatorDossier(emptyCreatorService, "xiaohui-doctor")?.pipeline;
    expect(pipeline?.stages.find((stage) => stage.id === "dashboard_projection")?.artifactRefs).toContain("route:/creators/xiaohui-doctor");
    expect(pipeline?.stages.find((stage) => stage.id === "dashboard_projection")?.gateState).toBe("partial");
    expect(pipeline?.ready).toBe(false);
  });
});
