import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CreatorSynthesis, CreatorSynthesisWorkflowStartInput } from "../../packages/research/index.js";

const artifactPaths = vi.hoisted(() => new Map<string, string>());
vi.mock("../../packages/adapters/index.js", () => ({ artifactPath: (reference: string) => artifactPaths.get(reference) ?? reference }));

import { loadWorkflowCreatorReader } from "./workflow-creator-reader.js";

const runId = "00000000-0000-4000-8000-000000000071";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-creator-reader-"));
const source: CreatorSynthesisWorkflowStartInput = {
  creatorRunId: runId,
  portfolioArtifactRef: "/artifacts/frozen/analysis.json",
  portfolioAnnotationsArtifactRef: "/artifacts/frozen/annotations.json",
  selectionArtifactRef: "/artifacts/frozen/selection.json",
  detailArtifactRef: "/artifacts/frozen/details.json",
  reconstructionBatchArtifactRef: "/artifacts/frozen/batch.json",
  previousSynthesisArtifactRef: null,
  previousSynthesisGateArtifactRef: null
};
const claim = { statement: "面向新手", factClass: "observed", confidence: "high", evidenceRefs: ["/frozen/evidence"], caveat: null } as const;

function write(reference: string, value: unknown) {
  const file = path.join(root, `${artifactPaths.size}.json`);
  fs.writeFileSync(file, JSON.stringify(value)); artifactPaths.set(reference, file);
}

function report(): CreatorSynthesis {
  return {
    inputs: { ...source }, identity: { audience: [claim] },
    crossPostResearch: { sections: [{ id: "value", title: "价值", findings: [{ id: "value-1", statement: "原始综合结论", factClass: "inference", confidence: "medium", support: [{ postExternalId: "post-1", observation: "原始观察", evidenceRefs: ["/frozen/evidence"] }], counterexamples: [], boundary: "边界", openQuestions: [] }] }] }
  } as unknown as CreatorSynthesis;
}

function writeFrozenInputs() {
  write(source.portfolioArtifactRef, { schemaVersion: "1.0.0", runId, generatedAt: "2026-09-16T00:00:00.000Z", corpusArtifactRef: "/corpus", selectionArtifactRef: source.selectionArtifactRef,
    metricCoverage: { known: 2, missing: 1, rate: 2 / 3 }, likes: { min: 1, p25: 1, median: 2, mean: 2, p75: 3, max: 3 }, tierCounts: { high: 1, base: 1, low: 1 }, anchors: { median: 2, mean: 2, medianNearPostId: "post-1", meanNearPostId: "post-1", meanGap: false, meanGapReason: null }, interpretationBoundary: "冻结口径", unknowns: [] });
  write(source.portfolioAnnotationsArtifactRef, { schemaVersion: "portfolio-annotations@1", runId, annotationRevision: "1", generatedAt: "2026-09-16T00:00:00.000Z", sourceCorpusArtifactRef: "/corpus", denominator: { observedPosts: 1, annotatedPosts: 1, classifiedPosts: 1, unclassifiedPosts: 0, parity: true }, rows: [{ postExternalId: "post-1", sourceUrl: "https://example.com/original", title: "旧标题", mediaType: "video", likes: 1, classification: "classified", confidence: "medium", evidenceScope: ["title"], topics: [], formats: [], audienceProblems: [], promises: [], values: [], proofModes: [], visualSignals: [], contentArchitectureSignals: [], conflicts: [], unknowns: ["未知"] }], boundaries: ["冻结边界"] });
  write(source.selectionArtifactRef, { schemaVersion: "1.0.0", runId, generatedAt: "2026-09-16T00:00:00.000Z", sourceCorpusArtifactRef: "/corpus", ruleVersion: "ranked-7x3-v1", rules: { targetPerTier: 7, deepCandidatesPerTier: 3, high: "high", base: "base", low: "low", unknownMetricPolicy: "exclude_from_metric_tiering" }, denominator: { discoveredPosts: 3, eligiblePosts: 3, selectedPosts: 1, excludedMissingLikes: 0 }, anchors: { median: 2, mean: 2, medianNearPostId: "post-1", meanNearPostId: "post-1", meanGap: false, meanGapReason: null }, tierCounts: { high: 1, base: 0, low: 0 }, items: [{ externalId: "post-1", url: "https://example.com/selection", title: "选择标题", visibleText: null, mediaType: "video", likesLabel: "10", likes: 10, collections: 4, comments: 2, tier: "high", tierRank: 1, anchors: [], selectionReason: "冻结样本", deepCandidate: true, deepState: "pending", confounds: [] }], limitations: [] });
  write(source.detailArtifactRef, { schemaVersion: "1.0.0", runId, generatedAt: "2026-09-16T00:00:00.000Z", sourceSelectionArtifactRef: source.selectionArtifactRef, requestedPosts: 1, inspectedPosts: 1, posts: [{ externalId: "post-1", finalUrl: "https://example.com/detail", title: "冻结详情标题", description: null, publishedLabel: "2026-09-15", mediaType: "video", imageCount: 0, inspectedAt: "2026-09-16T00:00:00.000Z", warnings: [] }], warnings: [], unknowns: [] });
  write(source.reconstructionBatchArtifactRef, { schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: "2026-09-16T00:00:00.000Z", requestedPosts: 1, builtPosts: 0, verifiedPosts: 0, readyPosts: 0, pendingPosts: 1, failedPosts: 0, items: [{ postExternalId: "post-1", tier: "high", tierRank: 1, state: "queued", sourceMediaArtifactRef: null, reconstructionArtifactRef: null, articleArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null, failedGateIds: [], message: "等待", updatedAt: "2026-09-16T00:00:00.000Z" }], limitations: [] });
}

afterEach(() => { artifactPaths.clear(); fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root); });

describe("workflow creator reader projection", () => {
  it("reads only frozen source artifacts and does not fabricate a current post reader", () => {
    writeFrozenInputs();
    const data = loadWorkflowCreatorReader({ report: report(), source, creatorName: "冻结博主" });
    expect(data).toMatchObject({ creatorName: "冻结博主", corpus: { postCount: 3, likesKnown: 2 }, audience: [claim] });
    expect(data.portfolio).toEqual([{ id: "post-1", title: "冻结详情标题", sourceHref: "https://example.com/detail", evidenceHref: null, deepSample: true, likes: 10, collections: 4, comments: 2, shares: null, publishedLabel: "2026-09-15" }]);
    expect(data.crossPostResearch?.sections[0]?.findings[0]?.statement).toBe("原始综合结论");
  });

  it("rejects a report whose source refs differ from the registered frozen input", () => {
    writeFrozenInputs();
    const changed = report();
    changed.inputs.selectionArtifactRef = "/artifacts/other/selection.json";
    expect(() => loadWorkflowCreatorReader({ report: changed, source, creatorName: null })).toThrow("CREATOR_CANDIDATE_SOURCE_MISMATCH: selection");
  });

  it("uses only an explicitly resolved pinned workflow candidate link", () => {
    writeFrozenInputs();
    const evidenceHrefByPost = new Map([["post-1", "/workflow-runs/post-run#artifact-candidate"]]);
    const data = loadWorkflowCreatorReader({ report: report(), source, creatorName: null, evidenceHrefByPost });
    expect(data.portfolio[0]?.evidenceHref).toBe("/workflow-runs/post-run#artifact-candidate");
  });
});
