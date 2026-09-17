import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { writeArtifact } from "../../core/artifacts.js";
import { assembleReuseCandidate, buildReuseMaterialIndex, creatorSynthesisChildFixedFieldsSchema, creatorSynthesisResearchDraftSchema, loadReuseBase, prepareReuseFixedFields } from "./creator-synthesis-reuse.js";

const runId = "11111111-1111-4111-8111-111111111111";
let temporary: string | null = null;
afterEach(() => { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); temporary = null; });

function claim() { return { statement: "中文观察", factClass: "observed", confidence: "high", evidenceRefs: ["artifact"], caveat: null }; }
function candidate() {
  const item = (index: number) => ({ postExternalId: `post-${index}`, tier: index < 8 ? "high" : index < 15 ? "base" : "low", tierRank: index % 7 + 1,
    title: `帖${index}`, evidenceStatus: "surface_only", contentRole: "内容角色", contentForm: ["视频"], performanceInterpretation: "公开表现", evidenceRefs: ["artifact"], unknowns: ["未知"] });
  const shared = claim();
  return { schemaVersion: "1.0.0", creatorRunId: runId, generatedAt: "2026-09-15T00:00:00.000Z",
    inputs: { portfolioArtifactRef: "portfolio", portfolioAnnotationsArtifactRef: null, selectionArtifactRef: "selection", detailArtifactRef: "detail", reconstructionBatchArtifactRef: "batch" },
    identity: { positioning: shared, audience: [shared], problemsAddressed: [shared], valueProvided: [shared], trustSources: [shared], lifecycleStage: shared, commercialPaths: [] },
    contentSystem: { topicClusters: [shared], formatClusters: [shared], visualLanguage: [shared], publishingRhythm: [], recurringStructure: [shared] },
    performance: { baseline: [shared], high: [shared], low: [shared], timing: [], confounds: ["未知"] },
    postAnalyses: Array.from({ length: 21 }, (_, index) => item(index + 1)),
    portfolioClassification: { schemaVersion: "creator-portfolio-classification@1", sourceCorpusArtifactRef: "corpus", observedPosts: 1,
      labelRegistry: [{ id: "topic", axis: "topic", name: "主题", definition: "定义", evidenceRefs: ["corpus#/records/0/title"], boundary: "边界" }],
      rows: [{ postExternalId: "post-1", memberships: [{ labelId: "topic", sourceLevel: "surface_title", evidenceRefs: ["corpus#/records/0/title"], boundary: "边界" }], unknowns: [] }], boundaries: ["边界"] },
    boundaries: ["曝光未知"] };
}

function request() { return { creatorRunId: runId, creatorName: null, portfolioArtifactRef: "portfolio",
  portfolioAnnotationsArtifactRef: null, selectionArtifactRef: "selection", detailArtifactRef: "detail", reconstructionBatchArtifactRef: "batch", mode: "provisional" as const }; }

it("reuses only identical frozen inputs and keeps fixed fields program-owned", () => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-reuse-"));
  const source = path.join(temporary, "candidate.json");
  fs.writeFileSync(source, JSON.stringify(candidate()));
  const base = loadReuseBase(source, request());
  const draft = creatorSynthesisResearchDraftSchema.parse({
    identity: candidate().identity, contentSystem: candidate().contentSystem, performance: candidate().performance, boundaries: ["新研究边界"]
  });
  const assembled = assembleReuseCandidate({ request: request(), base, draft, generatedAt: "2026-09-16T00:00:00.000Z" });
  expect(assembled.creatorRunId).toBe(request().creatorRunId);
  expect(assembled.postAnalyses).toEqual(base.candidate.postAnalyses);
  expect(assembled.portfolioClassification).toEqual(base.candidate.portfolioClassification);
  expect(assembled.boundaries).toEqual(["新研究边界"]);
  expect(() => loadReuseBase(source, { ...request(), detailArtifactRef: "changed" })).toThrow("CREATOR_SYNTHESIS_REUSE_INPUT_MISMATCH");
  expect(() => loadReuseBase(source, { ...request(), creatorRunId: "22222222-2222-4222-8222-222222222222" })).toThrow("CREATOR_SYNTHESIS_REUSE_RUN_MISMATCH");
});

it("changes only research fields while preserving classification and post-analysis prose byte-for-byte", () => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-repair-reuse-"));
  const source = path.join(temporary, "candidate.json");
  const prior = candidate();
  fs.writeFileSync(source, JSON.stringify(prior));
  const base = loadReuseBase(source, request());
  const draft = creatorSynthesisResearchDraftSchema.parse({
    identity: { ...prior.identity, positioning: { ...prior.identity.positioning, statement: "修复后的具体定位" } },
    contentSystem: prior.contentSystem,
    performance: prior.performance,
    boundaries: ["修复后的研究边界"]
  });
  const assembled = assembleReuseCandidate({ request: request(), base, draft, generatedAt: "2026-09-16T01:00:00.000Z" });

  expect(JSON.stringify(assembled.portfolioClassification)).toBe(JSON.stringify(prior.portfolioClassification));
  expect(JSON.stringify(assembled.postAnalyses)).toBe(JSON.stringify(prior.postAnalyses));
  expect(assembled.identity.positioning.statement).toBe("修复后的具体定位");
});

it("rejects an old full candidate masquerading as a research draft", () => {
  expect(() => creatorSynthesisResearchDraftSchema.parse(candidate())).toThrow();
});

it("keeps child-visible fixed context free of previous research fields and source paths", () => {
  const { schemaVersion, creatorRunId, inputs, portfolioClassification, postAnalyses } = candidate();
  const visible = creatorSynthesisChildFixedFieldsSchema.parse({ schemaVersion, creatorRunId, inputs, portfolioClassification, postAnalyses });
  const serialized = JSON.stringify(visible);
  expect(serialized).not.toContain('"identity"');
  expect(serialized).not.toContain('"contentSystem"');
  expect(serialized).not.toContain('"performance"');
  expect(serialized).not.toContain("candidate.json");
});

it("preserves complete three lenses and actual evaluator boundaries without embedding the reconstruction again", () => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-materials-"));
  const priorRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
  process.env.SELF_MEDIA_RUNTIME_DIR = temporary;
  try {
    const reconstructionRef = writeArtifact(runId, "reconstruction.json", { builderLenses: {
      contentRestoration: { blocks: ["完整内容"] }, directingLogic: { stages: ["完整编导"] }, visualEditing: { claims: ["完整剪辑"] }
    } });
    const evaluationRef = writeArtifact(runId, "evaluation.json", { boundaries: ["媒体边界"] });
    const batch = { schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: "2026-09-15T00:00:00.000Z",
      requestedPosts: 1, builtPosts: 1, verifiedPosts: 1, readyPosts: 1, pendingPosts: 0, failedPosts: 0, limitations: [], items: [{
        postExternalId: "deep-1", tier: "high", tierRank: 1, state: "ready", evaluationPolicy: "single_pass@37a03aae",
        sourceMediaArtifactRef: null, reconstructionArtifactRef: reconstructionRef, articleArtifactRef: null, evaluationArtifactRef: evaluationRef,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null, failedGateIds: [], message: "完成", updatedAt: "2026-09-15T00:00:00.000Z"
      }] };
    const index = buildReuseMaterialIndex({ request: { ...request(), reconstructionBatchArtifactRef: "batch" },
      readArtifact: (reference) => reference === "batch" ? batch : JSON.parse(fs.readFileSync(requirePath(reference), "utf8")) });
    const material = (index.deepMaterials as Array<Record<string, unknown>>)[0]!;
    expect(material.builderLenses).toEqual(JSON.parse(fs.readFileSync(requirePath(reconstructionRef), "utf8")).builderLenses);
    expect(material.evaluationBoundaries).toMatchObject([{ artifactRef: evaluationRef, boundary: ["媒体边界"] }]);
    expect(material).not.toHaveProperty("reconstruction");
  } finally { if (priorRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR; else process.env.SELF_MEDIA_RUNTIME_DIR = priorRuntime; }
});

it("supplements only each built post's own frozen evaluator and gate references", () => {
  const base = candidate();
  const batch = { schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: "2026-09-15T00:00:00.000Z",
    requestedPosts: 2, builtPosts: 1, verifiedPosts: 0, readyPosts: 0, pendingPosts: 1, failedPosts: 0, limitations: [], items: [
      { postExternalId: "post-1", tier: "high", tierRank: 1, state: "built_unevaluated", evaluationPolicy: "single_pass@37a03aae", sourceMediaArtifactRef: null, reconstructionArtifactRef: "/recon/1", articleArtifactRef: null, evaluationArtifactRef: "/eval/1", gateReportArtifactRef: "/gate/1", threeLensEvaluationArtifactRef: "/three/1", threeLensGateReportArtifactRef: "/three-gate/1", failedGateIds: [], message: "完成", updatedAt: "2026-09-15T00:00:00.000Z" },
      { postExternalId: "post-2", tier: "high", tierRank: 2, state: "queued", evaluationPolicy: "single_pass@37a03aae", sourceMediaArtifactRef: null, reconstructionArtifactRef: null, articleArtifactRef: null, evaluationArtifactRef: "/eval/2", gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null, failedGateIds: [], message: "等待", updatedAt: "2026-09-15T00:00:00.000Z" }
    ] };
  const fixed = prepareReuseFixedFields(base as Parameters<typeof prepareReuseFixedFields>[0], batch);
  expect(fixed.postAnalyses[0]!.evidenceRefs).toEqual(expect.arrayContaining(["/eval/1", "/gate/1", "/three/1", "/three-gate/1"]));
  expect(fixed.postAnalyses[1]!.evidenceRefs).not.toContain("/eval/2");
  expect(new Set(fixed.postAnalyses[0]!.evidenceRefs).size).toBe(fixed.postAnalyses[0]!.evidenceRefs.length);
});

function requirePath(reference: string): string { return path.join(process.env.SELF_MEDIA_RUNTIME_DIR!, "runs", runId, reference.split("/").pop()!); }
