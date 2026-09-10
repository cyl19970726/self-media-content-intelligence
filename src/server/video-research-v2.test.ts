import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runArtifactDir } from "../../packages/adapters/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { loadVideoResearch } from "./video-research.js";

const runIds: string[] = [];
const originalRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
let testRuntime: string;
beforeEach(() => {
  testRuntime = fs.mkdtempSync(path.join(os.tmpdir(), "video-projection-test-"));
  process.env.SELF_MEDIA_RUNTIME_DIR = testRuntime;
});

afterEach(() => {
  for (const runId of runIds.splice(0)) fs.rmSync(runArtifactDir(runId), { recursive: true, force: true });
  fs.rmSync(testRuntime, { recursive: true, force: true });
  if (originalRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
  else process.env.SELF_MEDIA_RUNTIME_DIR = originalRuntime;
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
    const rawLenses = reconstruction.builderLenses as Record<string, Record<string, unknown>>;
    const opening = { duration: 10, inspectionBasis: "原样保留 Builder 的时间冲突", unknowns: ["声音未知"], segments: [{
      id: "opening-1", timeRange: {start:0,end:10}, boundaryReason: "字幕变化", spokenWords: "ASR 原文含错字",
      burnedCaptions: "画面原文不同", composition: "竖屏", motion: "未判断", audioRole: "未知", evidenceArrival: "尚无结果",
      viewerQuestion: "是否兑现？", meaningChange: "提出主张", alignmentStatus: "ASR 错时，未改写", evidenceRefs: ["TARGET-0001"],
      frameRefs: ["TARGET-0001", "TARGET-0002", "TARGET-0004"], unknowns: ["确切切点未知"] }] };
    rawLenses.visualEditing!.openingAnalysis = opening;
    const lenses = reconstruction.builderLenses as { contentRestoration: { blocks: Array<Record<string, unknown>> } };
    lenses.contentRestoration.blocks[0]!.visuals = [{
      ref: "TARGET-0002", role: "during", focus: "操作中的界面", proves: "中间状态可见", cannotProve: "隐藏点击未知"
    }];
    lenses.contentRestoration.blocks.push({
      id: "BLOCK-002", type: "operation_sequence", title: "操作步骤", body: "三个可见状态组成操作序列。",
      timeRange: { start: 0, end: 10 }, evidenceRefs: ["TARGET-0001", "TARGET-0004"],
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
    expect(result?.visualEditing.openingAnalysis).toEqual(opening);
    expect(result?.directingLogic.packagingAnalysis).toBeNull();
    expect(result?.performanceContext.observation?.metrics[0]?.median).toBeNull();
    expect(result?.contentBlocks).toHaveLength(2);
    expect(result?.contentUnknowns).toEqual(["隐藏设置没有展示"]);
    expect(result?.contentBlocks[0]?.type).toBe("before_after");
    expect(result?.contentBlocks[0]?.media.map((item) => item.ref)).toEqual(["TARGET-0001", "TARGET-0002", "TARGET-0004"]);
    expect(result?.contentBlocks[0]?.media.map((item) => item.role)).toEqual(["before", "during", "after"]);
    // A block-level frame that is not repeated in a step must remain reachable.
    expect(result?.contentBlocks[1]?.media.map(item => item.ref)).toEqual(["TARGET-0002"]);
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

    // An unavailable frame must not erase the Builder's explanation or step reference.
    lenses.contentRestoration.blocks[0]!.visuals = [{
      ref: "MISSING-CROP", role: "detail_crop", focus: "原始细节说明",
      proves: "原始支持范围", cannotProve: "原始证明边界",
      crop: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }
    }];
    lenses.contentRestoration.blocks[1]!.steps = [{ label: "未取得画面", description: "保留步骤说明", frameRefs: ["MISSING-STEP"] }];
    fs.writeFileSync(path.join(root, "reconstruction.json"), JSON.stringify(reconstruction));
    const missing = loadVideoResearch(service, "fixture-creator", videoId, runId);
    expect(missing?.contentBlocks[0]?.unresolvedVisuals).toEqual(lenses.contentRestoration.blocks[0]!.visuals);
    expect(missing?.contentBlocks[1]?.steps[0]?.unresolvedFrameRefs).toEqual(["MISSING-STEP"]);
    rawLenses.visualEditing!.carriers = [];
    rawLenses.visualEditing!.notes = ["部分字段尚缺，原始说明仍应可读"];
    fs.writeFileSync(path.join(root, "reconstruction.json"), JSON.stringify(reconstruction));
    const partial = loadVideoResearch(service, "fixture-creator", videoId, runId);
    expect(partial?.directingLogic.stages[0]?.label).toBe(result?.directingLogic.stages[0]?.label);
    expect(partial?.directingLogic.stages[0]?.viewerQuestion).toBe(result?.directingLogic.stages[0]?.viewerQuestion);
    expect(partial?.visualEditing.notes).toEqual(["部分字段尚缺，原始说明仍应可读"]);
  });
});

it("keeps legacy original reports and evidence readable without promoting incompatible evaluations", () => {
  const runId = '00000000-0000-4000-8000-000000000066';
  runIds.push(runId);
  const root = runArtifactDir(runId);
  fs.mkdirSync(path.join(root,'targeted-evidence'), {recursive:true});
  const article = '# 原文\n\n原文限定（HIRES-001）。';
  fs.writeFileSync(path.join(root,'article.md'),article);
  fs.writeFileSync(path.join(root,'reconstruction.json'),JSON.stringify({schemaVersion:'video-reconstruction-1.0'}));
  fs.writeFileSync(path.join(root,'targeted-evidence','hires-manifest.json'),JSON.stringify({frames:[{id:'HIRES-001',time:2,frame:'hires/ui.png'}]}));
  fs.writeFileSync(path.join(root,'evaluation.json'),JSON.stringify({schemaVersion:'runtime-three-lens-evaluation@1'}));
  const prefix = `/artifacts/${runId}/`;
  const service = {
    list:()=>[],get:()=>({id:runId,creatorId:'legacy',creatorName:'原作者',profileUrl:'https://example.com',lastSnapshotAt:null,inventoryArtifactRef:null}),
    portfolio:()=>({ reconstructionBatch:{items:[{postExternalId:'post',state:'ready',failedGateIds:[],evaluationArtifactRef:null,gateReportArtifactRef:null,reconstructionArtifactRef:`${prefix}reconstruction.json`,articleArtifactRef:`${prefix}article.md`,threeLensEvaluationArtifactRef:`${prefix}evaluation.json`,threeLensGateReportArtifactRef:`${prefix}evaluation.json`}]} })
  } as unknown as CreatorResearchService;
  const report = loadVideoResearch(service,'legacy','post',runId);
  expect(report?.reportFormat).toBe('legacy_report');
  expect(report?.article).toBe(article);
  expect(report?.contentBlocks).toEqual([]);
  expect(report?.quality.evaluationReadIssue).toContain('runtime-three-lens-evaluation@2');
  expect(report?.quality.promotionState).toBe('provisional');
  expect(report?.frames.dense).toContainEqual({id:'HIRES-001',time:2,src:`${prefix}targeted-evidence/hires/ui.png`,reason:null});
});
