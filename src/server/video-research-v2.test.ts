import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runArtifactDir } from "../../packages/adapters/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { loadVideoResearch } from "./video-research.js";

const runIds: string[] = [];

afterEach(() => {
  for (const runId of runIds.splice(0)) fs.rmSync(runArtifactDir(runId), { recursive: true, force: true });
});

describe("video reconstruction V2 projection", () => {
  it("projects multimodal content and direct Builder directing/editing lenses", () => {
    const runId = "00000000-0000-4000-8000-000000000064";
    const videoId = "video-v2-fixture";
    runIds.push(runId);
    const root = path.join(runArtifactDir(runId), "video-reconstructions", videoId);
    fs.mkdirSync(path.join(root, "targeted-evidence", "frames"), { recursive: true });
    fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
    const fixtureRoot = path.resolve(".agents/skills/video-content-reconstruction/tests/fixtures/valid");
    const reconstruction = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "reconstruction.json"), "utf8")) as Record<string, unknown>;
    reconstruction.schemaVersion = "video-reconstruction-2.0";
    reconstruction.builderLenses = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "builder-lenses-v2.json"), "utf8"));
    const lenses = reconstruction.builderLenses as { contentRestoration: { blocks: Array<Record<string, unknown>> } };
    lenses.contentRestoration.blocks[0]!.visuals = [{
      ref: "TARGET-0002", role: "during", focus: "操作中的界面", proves: "中间状态可见", cannotProve: "隐藏点击未知"
    }];
    lenses.contentRestoration.blocks.push({
      id: "BLOCK-002", type: "operation_sequence", title: "操作步骤", body: "三个可见状态组成操作序列。",
      timeRange: { start: 0, end: 10 }, evidenceRefs: ["TARGET-0001", "TARGET-0002", "TARGET-0004"],
      frameRefs: ["TARGET-0001", "TARGET-0002", "TARGET-0004"],
      steps: [
        { label: "打开设置", description: "先看到设置入口。", frameRefs: ["TARGET-0001"] },
        { label: "完成操作", description: "结果界面已经出现。", frameRefs: ["TARGET-0004"] }
      ]
    });
    fs.writeFileSync(path.join(root, "reconstruction.json"), JSON.stringify(reconstruction));
    fs.writeFileSync(path.join(root, "article.md"), "# Builder report\n\nFixture");
    fs.writeFileSync(path.join(root, "targeted-evidence", "targeted-evidence.json"), JSON.stringify({
      frames: [
        { id: "TARGET-0001", time: 1, frame: "frames/before.jpg", reason: "设置前" },
        { id: "TARGET-0002", time: 5, frame: "frames/during.jpg", reason: "操作中" },
        { id: "TARGET-0004", time: 9, frame: "frames/after.jpg", reason: "结果" }
      ]
    }));
    fs.writeFileSync(path.join(root, "evidence", "evidence-pack.json"), JSON.stringify({ frameIndex: [] }));
    fs.writeFileSync(path.join(root, "ocr-evidence.json"), JSON.stringify({ frames: [{ lines: [] }] }));
    const reconstructionArtifactRef = `/artifacts/${runId}/video-reconstructions/${videoId}/reconstruction.json`;
    const service = {
      list: () => [],
      get: (id: string) => id === runId ? {
        id: runId, creatorId: "fixture-creator", creatorName: "Fixture Creator",
        profileUrl: "https://example.com/creator", lastSnapshotAt: "2026-09-03T00:00:00.000Z",
        inventoryArtifactRef: null, detailArtifactRef: null, mediaManifestArtifactRef: null
      } : null,
      portfolio: () => ({
        reconstructionBatch: { items: [{
          postExternalId: videoId, state: "built_unevaluated", message: "Builder complete", failedGateIds: [],
          reconstructionArtifactRef, articleArtifactRef: `/artifacts/${runId}/video-reconstructions/${videoId}/article.md`,
          builderValidationArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
          threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null
        }] },
        selection: { items: [{ externalId: videoId, title: "Fixture video", url: "https://example.com/video", likes: 10, tier: "high" }] },
        details: { posts: [] }, mediaManifest: { items: [] }, synthesis: { postAnalyses: [] }, analysis: null
      })
    } as unknown as CreatorResearchService;

    const result = loadVideoResearch(service, "fixture-creator", videoId, runId);
    expect(result?.contentBlocks).toHaveLength(2);
    expect(result?.contentUnknowns).toEqual(["隐藏设置没有展示"]);
    expect(result?.contentBlocks[0]?.type).toBe("before_after");
    expect(result?.contentBlocks[0]?.media.map((item) => item.ref)).toEqual(["TARGET-0001", "TARGET-0002", "TARGET-0004"]);
    expect(result?.contentBlocks[0]?.media.map((item) => item.role)).toEqual(["before", "during", "after"]);
    expect(result?.contentBlocks[1]?.media).toEqual([]);
    expect(result?.contentBlocks[1]?.steps[0]?.media[0]).toMatchObject({ label: "打开设置" });
    expect(result?.directingLogic.stages).toHaveLength(2);
    expect(result?.directingLogic.activatedQuestion).toBe("入口在哪里？");
    expect(result?.visualEditing.shotSemantics).toHaveLength(1);
    expect(result?.visualEditing.transitions).toHaveLength(1);
    expect(result?.visualEditing.missingBridges).toHaveLength(1);
    expect(result?.lensCoverage.contentRestoration.note).toContain("尚未独立评估");
    expect(result?.quality.promotionState).toBe("provisional");
    expect(result?.readerSummary).toMatchObject({
      productState: "provisional",
      statusLabel: "分析尚未闭环",
      strengths: ["展示最短路径", "结果状态出现", "结果状态在操作后出现"],
      limitations: expect.arrayContaining(["隐藏参数未知", "隐藏设置没有展示"])
    });
    expect(result?.readerSummary.reusableStructure).toEqual(["提出问题", "展示结果"]);
    expect(result?.readerSummary.representativeFrame?.src).toContain("before.jpg");
    expect(result?.evidenceHealth.ocr).toBe(false);
    expect(result?.evidenceHealth.audio).toBe(false);
  });
});
