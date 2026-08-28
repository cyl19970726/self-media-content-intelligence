import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteContentKnowledgeRepository } from "../../platform/database/sqlite-content-knowledge-repository.js";
import { ResearchLearningService } from "../../server/research-learning.js";
import { ContentKnowledgeService } from "./service.js";

const directories: string[] = [];

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-knowledge-"));
  directories.push(directory);
  let sequence = 0;
  const research = new ResearchLearningService(
    () => `research-${++sequence}`,
    () => "2026-08-28T00:00:00.000Z"
  );
  const repository = new SQLiteContentKnowledgeRepository(path.join(directory, "knowledge.sqlite"));
  const knowledge = new ContentKnowledgeService(
    repository, research,
    () => "00000000-0000-4000-8000-" + String(++sequence).padStart(12, "0"),
    () => "2026-08-28T00:00:00.000Z"
  );
  return { knowledge, repository, research };
}

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("content knowledge compilation", () => {
  it("writes one manifest per analysis and remains idempotent", () => {
    const { knowledge } = fixture();
    const input = {
      operationKey: "compile:analysis-1",
      compilerPolicyVersion: "knowledge-compiler-v1",
      inputFingerprint: "sha256:analysis-1",
      analysis: {
        analysisRevisionId: "analysis-1", subjectType: "video" as const, subjectId: "video-1",
        creatorId: "creator-1", videoId: "video-1", deepReconstruction: true,
        lensGates: { contentRestoration: "ready" as const, directingLogic: "ready" as const, visualEditingLogic: "ready" as const },
        observations: [{
          concept: { slug: "proof-first", kind: "proof_mode" as const, name: "先证据后解释",
            definition: "先展示可检查结果，再解释过程。", exclusions: ["只喊结果口号。"] },
          relation: "confirm" as const, statement: "开头先展示完成结果。", evidenceRefs: ["frame:video-1:001"], confidence: "high" as const
        }]
      }
    };
    const first = knowledge.compile(input);
    const second = knowledge.compile(input);
    expect(first.manifest.status).toBe("accepted");
    expect(first.contributions).toHaveLength(1);
    expect(second.idempotent).toBe(true);
    expect(second.manifest.id).toBe(first.manifest.id);
    expect(knowledge.listKnowledge()).toHaveLength(1);
  });

  it("records an explicit no-new-knowledge result", () => {
    const { knowledge } = fixture();
    const result = knowledge.compile({
      operationKey: "compile:none", compilerPolicyVersion: "v1", inputFingerprint: "sha256:none",
      analysis: {
        analysisRevisionId: "analysis-none", subjectType: "creator", subjectId: "creator-1",
        creatorId: "creator-1", videoId: null, deepReconstruction: false,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" }, observations: []
      }
    });
    expect(result.manifest.status).toBe("accepted_no_new_knowledge");
    expect(result.contributions).toEqual([]);
  });
});

describe("creation and validation boundary", () => {
  it("pins a concept revision and partitions adjudicated first-party evidence", () => {
    const { knowledge, research } = fixture();
    const concept = research.createConcept({
      slug: "visible-proof", kind: "proof_mode", name: "可见证据", definition: "展示可检查证据。", exclusions: ["无证据口号。"]
    });
    const packageId = "10000000-0000-4000-8000-000000000001";
    const binding = knowledge.createBinding({
      operationKey: "binding-1", contentPackageId: packageId, contentPackageSnapshotId: "package:r1",
      targetType: "concept_revision", targetId: concept.currentRevision.id, usage: "test", rationale: "测试开头证据"
    });
    const hypothesis = knowledge.createHypothesis({
      operationKey: "hypothesis-1", contentPackageId: packageId, contentPackageSnapshotId: "package:r1",
      statement: "开头展示证据会提高收藏。", linkedBindingIds: [binding.id], expectedSignals: ["saves"],
      unavailableSignals: ["impressions"], baselineDeclaration: "同账号近 10 条收藏中位数", confounders: []
    });
    const validation = knowledge.createValidation({
      operationKey: "validation-1", publicationRunId: "20000000-0000-4000-8000-000000000001",
      contentPackageId: packageId, contentPackageSnapshotId: "package:r1", variantRevision: 1, hypothesisId: hypothesis.id,
      observedSignals: [{ name: "saves", value: 42, unit: "count", source: "manual-public", collectedAt: "2026-08-28T00:00:00.000Z" }],
      executionDeviations: [], confounders: []
    });
    const submitted = knowledge.submitValidation(validation.id, {
      operationKey: "validation-submit-1", proposedRelation: "confirm", targetConceptId: concept.concept.id,
      decisionReason: "收藏高于声明基线，但曝光未知。"
    });
    expect(submitted.status).toBe("adjudication_pending");
    const adjudicated = knowledge.adjudicateValidation(validation.id, {
      operationKey: "validation-adjudicate-1", promote: true, reason: "直接晋升"
    });
    expect(adjudicated.status).toBe("promoted");
    const read = research.get(concept.concept.id)!;
    expect(read.observations.at(-1)?.origin).toBe("first_party_practice");
    expect(read.counts.distinctEligibleVideos).toBe(0);
  });
});
