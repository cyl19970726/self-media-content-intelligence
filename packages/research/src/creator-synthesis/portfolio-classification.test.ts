import { describe, expect, it } from "vitest";
import { creatorCorpusSchema } from "../portfolio/contracts.js";
import { videoReconstructionBatchSchema } from "../video-analysis/batch-contracts.js";
import { portfolioClassificationSchema } from "./contracts.js";
import { validateAdaptivePortfolioClassification } from "./portfolio-classification.js";

const runId = "11111111-1111-4111-8111-111111111111";
const corpusRef = `/artifacts/${runId}/creator-corpus.hash.json`;
const reconstructionRef = `/artifacts/${runId}/video-reconstructions/deep/reconstruction.json`;

function fixtures() {
  const records = ["surface", "deep", "unknown"].map((externalId) => ({ externalId,
    url: `https://www.xiaohongshu.com/explore/${externalId}`, title: `${externalId} title`, visibleText: null,
    mediaType: "video" as const, likesLabel: null, likes: null }));
  const corpus = creatorCorpusSchema.parse({ schemaVersion: "1.0.0", runId, generatedAt: "2026-09-15T00:00:00Z",
    sourceArtifactRef: "/inventory.json", denominator: { discoveredPosts: 3, likesKnown: 0, likesMissing: 3,
      likesCoverage: 0, stopReason: "budget_reached", corpusCompleteness: "bounded_partial" },
    likes: { min: null, p25: null, median: null, mean: null, p75: null, max: null }, mediaTypes: { video: 3 }, records, unknowns: [] });
  const batch = videoReconstructionBatchSchema.parse({ schemaVersion: "1.0.0", creatorRunId: runId, revision: 1,
    generatedAt: "2026-09-15T00:00:00Z", requestedPosts: 1, builtPosts: 1, verifiedPosts: 0, readyPosts: 0,
    pendingPosts: 0, failedPosts: 0, limitations: [], items: [{ postExternalId: "deep", tier: "base", tierRank: 1,
      state: "built_unevaluated", evaluationPolicy: "skip@builder-fast-path-v1", sourceMediaArtifactRef: null,
      reconstructionArtifactRef: reconstructionRef, articleArtifactRef: null, builderValidationArtifactRef: null,
      evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
      threeLensGateReportArtifactRef: null, failedGateIds: [], message: "built", updatedAt: "2026-09-15T00:00:00Z" }] });
  const classification = portfolioClassificationSchema.parse({ schemaVersion: "creator-portfolio-classification@1",
    sourceCorpusArtifactRef: corpusRef, observedPosts: 3,
    labelRegistry: [
      { id: "wearable", axis: "topic", name: "智能穿戴", definition: "佩戴式产品", evidenceRefs: [`${corpusRef}#/records/0/title`], boundary: "只描述可见产品形态" },
      { id: "funding", axis: "commercial_signal", name: "融资叙事", definition: "标题提及融资", evidenceRefs: [`${corpusRef}#/records/0/title`], boundary: "不证明融资真实性" }
    ],
    rows: [
      { postExternalId: "surface", memberships: [
        { labelId: "wearable", sourceLevel: "surface_title", evidenceRefs: [`${corpusRef}#/records/0/title`], boundary: "标题层" },
        { labelId: "funding", sourceLevel: "surface_title", evidenceRefs: [`${corpusRef}#/records/0/title`], boundary: "标题层" }
      ], unknowns: [] },
      { postExternalId: "deep", memberships: [{ labelId: "wearable", sourceLevel: "deep_builder",
        evidenceRefs: [`${reconstructionRef}#/builderLenses/contentRestoration`], boundary: "仅该帖 Builder" }], unknowns: [] },
      { postExternalId: "unknown", memberships: [], unknowns: ["标题无法判断"] }
    ], boundaries: ["多标签占比可重叠"] });
  return { corpus, batch, classification };
}

describe("adaptive portfolio classification", () => {
  it("accepts multiple labels, honest unknowns, and evidence bound to each source level", () => {
    const input = fixtures();
    expect(() => validateAdaptivePortfolioClassification({ ...input, corpusArtifactRef: corpusRef,
      reconstructionBatch: input.batch })).not.toThrow();
  });

  it("rejects another post's surface evidence and another post's deep evidence", () => {
    const surface = fixtures();
    surface.classification.rows[0]!.memberships[0]!.evidenceRefs = [`${corpusRef}#/records/1/title`];
    expect(() => validateAdaptivePortfolioClassification({ classification: surface.classification, corpus: surface.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: surface.batch })).toThrow("surface_evidence_binding");

    const deep = fixtures();
    deep.classification.rows[1]!.memberships[0]!.evidenceRefs = [`${reconstructionRef.replace("/deep/", "/other/")}#x`];
    expect(() => validateAdaptivePortfolioClassification({ classification: deep.classification, corpus: deep.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: deep.batch })).toThrow("deep_evidence_binding");
  });

  it("rejects a lookalike pointer after the scalar title field", () => {
    const input = fixtures();
    input.classification.rows[0]!.memberships[0]!.evidenceRefs = [`${corpusRef}#/records/0/title_fake`];
    expect(() => validateAdaptivePortfolioClassification({ classification: input.classification, corpus: input.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: input.batch })).toThrow("surface_evidence_binding");
  });

  it("allows a post's mediaType only for its format membership", () => {
    const input = fixtures();
    input.classification.labelRegistry.push({ id: "video-post", axis: "format", name: "视频帖",
      definition: "语料记录为视频", evidenceRefs: [corpusRef], boundary: "只说明视频媒介，不说明剪辑风格" });
    input.classification.rows[0]!.memberships.push({ labelId: "video-post", sourceLevel: "surface_title",
      evidenceRefs: [`${corpusRef}#/records/0/mediaType`], boundary: "仅由该帖媒介类型归属" });
    expect(() => validateAdaptivePortfolioClassification({ classification: input.classification, corpus: input.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: input.batch })).not.toThrow();
  });

  it("rejects mediaType as a topic citation and annotations as registry evidence", () => {
    const topic = fixtures();
    topic.classification.rows[0]!.memberships[0]!.evidenceRefs = [`${corpusRef}#/records/0/mediaType`];
    expect(() => validateAdaptivePortfolioClassification({ classification: topic.classification, corpus: topic.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: topic.batch })).toThrow("surface_evidence_binding");

    const registry = fixtures();
    registry.classification.labelRegistry[0]!.evidenceRefs = ["/artifacts/run/portfolio-annotations.json#/rows"];
    expect(() => validateAdaptivePortfolioClassification({ classification: registry.classification, corpus: registry.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: registry.batch })).toThrow("registry_evidence_binding");
  });

  it("rejects duplicate display names on the same axis even when ids differ", () => {
    const input = fixtures();
    expect(() => portfolioClassificationSchema.parse({ ...input.classification,
      labelRegistry: [...input.classification.labelRegistry, {
        id: "wearable-alias", axis: "topic", name: "智能穿戴", definition: "重复名称",
        evidenceRefs: [`${corpusRef}#/records/0/title`], boundary: "测试"
      }]
    })).toThrow("同一分类轴不能登记重名标签");
  });

  it("rejects incomplete frozen-corpus coverage", () => {
    const input = fixtures();
    input.classification.rows.pop(); input.classification.observedPosts = 2;
    expect(() => validateAdaptivePortfolioClassification({ classification: input.classification, corpus: input.corpus,
      corpusArtifactRef: corpusRef, reconstructionBatch: input.batch })).toThrow("corpus_coverage");
  });
});
