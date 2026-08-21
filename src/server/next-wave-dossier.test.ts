import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../modules/creator-research/service.js";
import { loadCreatorDossier } from "./creator-dossier.js";
import { loadNextWaveDossier } from "./next-wave-dossier.js";

const emptyCreatorService = { list: () => [], get: () => null } as unknown as CreatorResearchService;

describe("next-wave inventory dossier", () => {
  it("projects Xiaohui's partial inventory without inventing deep analysis", () => {
    const dossier = loadNextWaveDossier("xiaohui-doctor");
    expect(dossier).not.toBeNull();
    expect(dossier?.source).toBe("inventory_snapshot");
    expect(dossier?.identity.name).toBe("晓辉博士");
    expect(dossier?.corpus.postCount).toBe(240);
    expect(dossier?.corpus.likesKnown).toBe(240);
    expect(dossier?.corpus.coverageRate).toBe(1);
    expect(dossier?.corpus.health.status).toBe("partial");
    expect(dossier?.corpus.health.reason).toContain("已观察 240 条；主页显示 251 条，缺口 11 条");
    expect(dossier?.corpus.health.reason).toContain("发布时间 0%");
    expect(dossier?.corpus.health.reason).toContain("收藏/评论/分享分别为 0%/0%/0%");
    expect(dossier?.portfolio.items).toHaveLength(20);
    expect(dossier?.portfolio.deepCount).toBe(0);
    expect(dossier?.portfolio.items.every((item) => item.evidenceHref === null && item.deepSample === false)).toBe(true);
    expect(dossier?.contentSystem.topicClusters).toEqual([]);
    expect(dossier?.contentSystem.health.reason).toContain("未执行标题启发式聚类");
    expect(dossier?.growthEngines.health.status).toBe("missing");
    expect(dossier?.boundaries.join(" ")).toContain("不能判断内容机制");
  });

  it("supports Cyber Duck through the same artifact contract", () => {
    const dossier = loadNextWaveDossier("cyber-duck-aigc");
    expect(dossier).not.toBeNull();
    expect(dossier?.identity.name).toBe("赛博鸭AIGC");
    expect(dossier?.corpus.postCount).toBe(319);
    expect(dossier?.corpus.likesKnown).toBe(318);
    expect(dossier?.corpus.health.reason).toContain("主页显示 334 条，缺口 15 条");
    expect(dossier?.portfolio.items.filter((item) => item.tier === "high")).toHaveLength(5);
    expect(dossier?.portfolio.items.filter((item) => item.tier === "base")).toHaveLength(10);
    expect(dossier?.portfolio.items.filter((item) => item.tier === "low")).toHaveLength(5);
    expect(dossier?.portfolio.items.find((item) => item.id === "67b012c40000000017038a99")?.likes).toBe(65_000);
  });

  it("returns null for an unknown inventory instead of fabricating a dossier", () => {
    expect(loadNextWaveDossier("not-collected")).toBeNull();
    expect(loadNextWaveDossier("../xiaohui-doctor")).toBeNull();
  });

  it("is reachable through the canonical dossier loader", () => {
    expect(loadCreatorDossier(emptyCreatorService, "xiaohui-doctor")?.source).toBe("inventory_snapshot");
  });
});
