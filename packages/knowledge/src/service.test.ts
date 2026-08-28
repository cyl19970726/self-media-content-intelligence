import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteContentKnowledgeRepository } from "../../adapters/index.js";
import { ResearchLearningService } from "../../../src/server/research-learning.js";
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

  it("records no-new-knowledge for a later revision whose claim is already covered", () => {
    const { knowledge } = fixture();
    const observation = { concept: { slug: "covered", kind: "content_mechanism" as const, name: "已覆盖", definition: "相同判断不重复写入。", exclusions: ["语义不同的判断。"] }, relation: "confirm" as const, statement: "这个判断已经存在。", evidenceRefs: ["evidence:covered"], confidence: "high" as const };
    const common = { compilerPolicyVersion: "v1", evidenceGate: [{ ref: "evidence:covered", availability: "available" as const }] };
    knowledge.compile({ ...common, operationKey: "covered:1", inputFingerprint: "sha256:covered-1", analysis: { analysisRevisionId: "covered-1", subjectType: "video", subjectId: "video-1", creatorId: "creator-1", videoId: "video-1", deepReconstruction: true, lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" }, observations: [observation] } });
    const result = knowledge.compile({ ...common, operationKey: "covered:2", inputFingerprint: "sha256:covered-2", analysis: { analysisRevisionId: "covered-2", subjectType: "video", subjectId: "video-2", creatorId: "creator-1", videoId: "video-2", deepReconstruction: true, lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" }, observations: [observation] } });
    expect(result.manifest.status).toBe("accepted_no_new_knowledge");
    expect(result.contributions).toEqual([]);
  });

  it("quarantines candidates with a structured missing Evidence reason", () => {
    const { knowledge } = fixture();
    const result = knowledge.compile({
      operationKey: "missing-evidence", compilerPolicyVersion: "v1", inputFingerprint: "sha256:missing",
      evidenceGate: [{ ref: "evidence:missing", availability: "missing" }],
      analysis: { analysisRevisionId: "missing-evidence", subjectType: "video", subjectId: "video-missing", creatorId: "creator", videoId: "video-missing", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "missing-evidence", kind: "proof_mode", name: "缺失证据", definition: "缺失证据不得晋升。", exclusions: ["证据完整。"] }, relation: "confirm", statement: "不能接受。", evidenceRefs: ["evidence:missing"], confidence: "high" }] }
    });
    expect(result.manifest.status).toBe("quarantined");
    expect(result.manifest.quarantineReasons).toContain("evidence:missing:evidence:missing");
    expect(result.contributions[0]?.disposition).toBe("quarantined");
  });

  it("rebuilds every knowledge projection from the decision ledger without changing results", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-knowledge-rebuild-"));
    directories.push(directory);
    const repository = new SQLiteContentKnowledgeRepository(path.join(directory, "knowledge.sqlite"));
    const research = new ResearchLearningService(undefined, undefined, repository);
    const knowledge = new ContentKnowledgeService(repository, research);
    const result = knowledge.compile({
      operationKey: "compile:rebuild", compilerPolicyVersion: "v1", inputFingerprint: "sha256:rebuild",
      analysis: {
        analysisRevisionId: "analysis-rebuild", subjectType: "video", subjectId: "video-rebuild",
        creatorId: "creator-rebuild", videoId: "video-rebuild", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "rebuild-proof", kind: "proof_mode", name: "可重建证据", definition: "知识投影可从裁决账本恢复。", exclusions: ["仅存在于缓存中的状态。"] }, relation: "confirm", statement: "重建后贡献保持一致。", evidenceRefs: ["evidence:rebuild"], confidence: "high" }]
      }
    });
    const before = knowledge.projectionParity();
    const after = knowledge.rebuildProjections();
    expect(after).toEqual(before);
    expect(knowledge.listContributions("video", "video-rebuild")[0]?.manifest.id).toBe(result.manifest.id);
    expect(knowledge.listKnowledge({ query: "可重建" })).toHaveLength(1);
    knowledge.close();
  });

  it("rolls back research events and in-memory state when the manifest command conflicts", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-knowledge-atomic-"));
    directories.push(directory);
    const repository = new SQLiteContentKnowledgeRepository(path.join(directory, "knowledge.sqlite"));
    const research = new ResearchLearningService(undefined, undefined, repository);
    const knowledge = new ContentKnowledgeService(repository, research);
    const base = {
      operationKey: "same-operation", compilerPolicyVersion: "v1", inputFingerprint: "sha256:first",
      analysis: { analysisRevisionId: "atomic-1", subjectType: "video" as const, subjectId: "atomic-1", creatorId: "creator", videoId: "atomic-1", deepReconstruction: true,
        lensGates: { contentRestoration: "ready" as const, directingLogic: "ready" as const, visualEditingLogic: "ready" as const },
        observations: [{ concept: { slug: "atomic-one", kind: "proof_mode" as const, name: "Atomic one", definition: "First", exclusions: ["none"] }, relation: "confirm" as const, statement: "First", evidenceRefs: ["evidence:first"], confidence: "high" as const }] }
    };
    knowledge.compile(base);
    expect(() => knowledge.compile({ ...base, inputFingerprint: "sha256:second", analysis: { ...base.analysis, analysisRevisionId: "atomic-2", observations: [{ ...base.analysis.observations[0]!, concept: { ...base.analysis.observations[0]!.concept, slug: "atomic-two" } }] } })).toThrow(/idempotency conflict/u);
    expect(research.list().map((item) => item.concept.slug)).toEqual(["atomic-one"]);
    knowledge.close();
  });
});

describe("creation and validation boundary", () => {
  it("rejects unresolved immutable targets and accepts analysis/evidence lineage from a manifest", () => {
    const { knowledge } = fixture();
    const packageId = "10000000-0000-4000-8000-000000000008";
    expect(() => knowledge.createBinding({ operationKey: "missing-analysis", contentPackageId: packageId,
      contentPackageSnapshotId: "snapshot-1", targetType: "analysis_revision", targetId: "missing-analysis",
      usage: "adopt", rationale: "不能引用不存在的分析" })).toThrow("analysis revision not found");
    expect(() => knowledge.createBinding({ operationKey: "missing-evidence", contentPackageId: packageId,
      contentPackageSnapshotId: "snapshot-1", targetType: "evidence", targetId: "missing-evidence",
      usage: "adopt", rationale: "不能引用不存在的证据" })).toThrow("evidence reference not found");

    knowledge.compile({ operationKey: "compile-binding-targets", compilerPolicyVersion: "v1", inputFingerprint: "sha256:binding-targets",
      analysis: { analysisRevisionId: "analysis-binding-targets", subjectType: "video", subjectId: "video-binding-targets",
        creatorId: "creator-a", videoId: "video-binding-targets", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "binding-targets", kind: "proof_mode", name: "引用目标", definition: "测试不可变引用。", exclusions: ["未解析引用。"] },
          relation: "confirm", statement: "目标存在。", evidenceRefs: ["evidence:binding-targets"], confidence: "high" }] }
    });
    expect(knowledge.createBinding({ operationKey: "bind-analysis", contentPackageId: packageId,
      contentPackageSnapshotId: "snapshot-1", targetType: "analysis_revision", targetId: "analysis-binding-targets",
      usage: "adapt", rationale: "引用完整分析 revision" }).status).toBe("current");
    expect(knowledge.createBinding({ operationKey: "bind-evidence", contentPackageId: packageId,
      contentPackageSnapshotId: "snapshot-1", targetType: "evidence", targetId: "evidence:binding-targets",
      usage: "test", rationale: "引用确切 Evidence" }).status).toBe("current");
  });

  it("rejects cross-snapshot hypotheses and marks an old pinned revision stale", () => {
    const { knowledge, research } = fixture();
    const concept = research.createConcept({
      slug: "revision-pinning", kind: "proof_mode", name: "固定 revision", definition: "固定当时采用的判断。", exclusions: ["跟随 latest 漂移。"]
    });
    const packageId = "10000000-0000-4000-8000-000000000009";
    const binding = knowledge.createBinding({
      operationKey: "pin-r1", contentPackageId: packageId, contentPackageSnapshotId: "snapshot-1",
      targetType: "concept_revision", targetId: concept.currentRevision.id, usage: "adopt", rationale: "保留当时判断"
    });
    expect(() => knowledge.createHypothesis({
      operationKey: "cross-snapshot", contentPackageId: packageId, contentPackageSnapshotId: "snapshot-2",
      statement: "错误地跨版本引用。", linkedBindingIds: [binding.id], expectedSignals: ["saves"], unavailableSignals: [],
      baselineDeclaration: "近十条中位数", confounders: []
    })).toThrow("another content package snapshot");

    for (const [index, videoId] of ["video-1", "video-2", "video-3"].entries()) {
      research.recordObservation({ conceptId: concept.concept.id, subjectType: "video", subjectId: videoId,
        creatorId: "creator-a", videoId, relation: "confirm", condition: { tier: index === 0 ? "high" : "base", format: "talking-head" },
        statement: `${videoId} 支持判断。`, evidenceRefs: [`cue:${videoId}`], analysisRevisionId: `analysis:${videoId}`,
        confidence: "high", sourceGateState: "ready", deepReconstruction: index === 0 });
    }
    research.promote(concept.concept.id, { targetScope: "creator_specific", creatorId: "creator-a", decision: "三条独立视频通过门槛。" });
    expect(knowledge.listBindings(packageId)[0]).toMatchObject({ targetId: concept.currentRevision.id, status: "stale_available" });
  });

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
    research.invalidateConcept(concept.concept.id, "upstream evidence withdrawn");
    expect(knowledge.listBindings(packageId)[0]?.status).toBe("invalidated");
  });
});
