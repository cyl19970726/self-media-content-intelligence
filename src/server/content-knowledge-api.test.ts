import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalysisService } from "../core/service.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import type { ComparisonProjectService } from "../../packages/research/index.js";
import type { LearningLoopControlPlane } from "./learning-loop.js";
import { PublishingService } from "../../packages/creation/index.js";
import { ContentKnowledgeService, knowledgeCompilationProposalSchema, knowledgeConceptViewSchema, knowledgeContributionManifestSchema, knowledgeGapSchema, knowledgeInvalidationRecordSchema, practiceValidationSchema } from "../../packages/knowledge/index.js";
import { SQLiteContentKnowledgeRepository, SQLitePublishingRepository } from "../../packages/adapters/index.js";
import { RedFoxCreatorDiscoveryService } from "../../packages/adapters/index.js";
import { ResearchLearningService } from "./research-learning.js";
import { createApp } from "./app.js";

const directories: string[] = [];
const servers: Server[] = [];
const closeables: Array<{ close(): void }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  closeables.splice(0).forEach((value) => value.close());
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

async function fixtureServer() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-api-"));
  directories.push(directory);
  const research = new ResearchLearningService();
  const knowledge = new ContentKnowledgeService(new SQLiteContentKnowledgeRepository(path.join(directory, "knowledge.sqlite")), research);
  const mediaPath = path.join(directory, "video.mp4");
  fs.writeFileSync(mediaPath, "fixture");
  const publishingRepository = new SQLitePublishingRepository(path.join(directory, "publishing.sqlite"));
  const publishing = new PublishingService(publishingRepository, { exists: fs.existsSync });
  closeables.push(knowledge, publishing);
  const unused = {} as unknown;
  const app = createApp({
    analysis: unused as AnalysisService,
    creatorResearch: unused as CreatorResearchService,
    comparisons: unused as ComparisonProjectService,
    researchLearning: research,
    learningLoop: unused as LearningLoopControlPlane,
    publishing,
    creatorDiscovery: new RedFoxCreatorDiscoveryService(),
    contentKnowledge: knowledge,
    evidence: { resolve: async () => null, list: () => ({ entries: [], total: 0, offset: 0, limit: 30, summary: { manifestEntries: 0, storeConfigured: false, storeReadable: false, classifications: {}, declaredAvailability: {} } }), summary: () => ({ manifestEntries: 0, storeConfigured: false, storeReadable: false, classifications: {}, declaredAvailability: {} }) }
  });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  return { base: `http://127.0.0.1:${address.port}`, mediaPath, publishing, publishingRepository };
}

describe("content knowledge API", () => {
  it("stages a frozen proposal and requires an explicit review before compilation", async () => {
    const { base } = await fixtureServer();
    const body = { operationKey: "compile-proposal-api-1", compilerPolicyVersion: "proposal-v1", inputFingerprint: "sha256:proposal-api-1",
      analysis: { analysisRevisionId: "analysis-proposal-api-1", subjectType: "video", subjectId: "video-proposal-api-1",
        creatorId: "creator-api-1", videoId: "video-api-1", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "review-first", kind: "proof_mode", name: "先审核再入库", definition: "提案先由人审核。", exclusions: ["未审核输入。"] },
          relation: "confirm", statement: "当前输入已冻结。", evidenceRefs: ["frame:review:1"], confidence: "high" }] } };
    const staged = await fetch(`${base}/api/v1/knowledge/proposals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(staged.status).toBe(201);
    const proposal = knowledgeCompilationProposalSchema.parse((await staged.json() as { proposal: unknown }).proposal);
    expect(proposal.status).toBe("pending_review");
    expect((await fetch(`${base}/api/v1/knowledge`).then((response) => response.json()) as { concepts: unknown[] }).concepts).toHaveLength(0);
    const reviewed = await fetch(`${base}/api/v1/knowledge/proposals/${proposal.id}/adjudicate`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationKey: "review-proposal-api-1", expectedFingerprint: proposal.inputFingerprint,
        decision: "apply", reason: "证据和边界已核对。", reviewerId: "api-reviewer" }) });
    expect(reviewed.status).toBe(202);
    expect(knowledgeCompilationProposalSchema.parse((await reviewed.json() as { proposal: unknown }).proposal).status).toBe("applied");
    expect((await fetch(`${base}/api/v1/knowledge`).then((response) => response.json()) as { concepts: unknown[] }).concepts).toHaveLength(1);
  });

  it("accepts a quarantined cognitive-loop observation without promoting it", async () => {
    const { base } = await fixtureServer();
    const response = await fetch(`${base}/api/v1/research-analysis-revisions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        analysisRevisionId: "quality-loop-video-1", subjectType: "video", subjectId: "video-1",
        creatorId: "creator-1", videoId: "video-1", deepReconstruction: true,
        lensGates: { contentRestoration: "partial", directingLogic: "partial", visualEditingLogic: "ready" },
        observations: [{
          concept: { slug: "quantified-promise-closure", kind: "failure_mode", name: "数量承诺闭环",
            definition: "开头承诺若干项时，后文需要逐项对应；证据不足则保留未知。",
            exclusions: ["不把相邻编号自动当作开头承诺的对应项。"] },
          relation: "confirm", statement: "样本的两项承诺没有形成可核验的一一对应。",
          evidenceRefs: ["artifact:reconstruction", "artifact:evaluation"], confidence: "medium"
        }]
      })
    });
    expect(response.status).toBe(201);
    const value = await response.json() as { sourceGateState: string; observations: Array<{ eligibility: string }> };
    expect(value.sourceGateState).toBe("partial");
    expect(value.observations[0]?.eligibility).not.toBe("eligible");
    const concepts = await fetch(`${base}/api/v1/research-concepts`).then((item) => item.json()) as { concepts: unknown[] };
    expect(concepts.concepts).toHaveLength(1);
  });

  it("compiles, lists, searches, and resolves lineage without duplicate ingestion", async () => {
    const { base } = await fixtureServer();
    const body = {
      operationKey: "compile-api-1", compilerPolicyVersion: "v1", inputFingerprint: "sha256:api-1",
      analysis: {
        analysisRevisionId: "analysis-api-1", subjectType: "video", subjectId: "video-api-1",
        creatorId: "creator-api-1", videoId: "video-api-1", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "api-proof", kind: "proof_mode", name: "API 证据优先", definition: "先给证据。", exclusions: ["无证据。"] },
          relation: "confirm", statement: "先给结果证据。", evidenceRefs: ["frame:api:1"], confidence: "high" }]
      }
    };
    const post = () => fetch(`${base}/api/v1/knowledge/compilations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const first = await post();
    expect(first.status).toBe(201);
    const firstValue = await first.json() as { manifest: unknown; idempotent: boolean };
    const manifest = knowledgeContributionManifestSchema.parse(firstValue.manifest);
    const secondValue = await post().then((response) => response.json()) as { manifest: unknown; idempotent: boolean };
    expect(knowledgeContributionManifestSchema.parse(secondValue.manifest).id).toBe(manifest.id);
    expect(secondValue.idempotent).toBe(true);

    const list = await fetch(`${base}/api/v1/knowledge?q=证据`).then((response) => response.json()) as { concepts: unknown[] };
    const concept = knowledgeConceptViewSchema.parse(list.concepts[0]);
    expect(concept.research.counts.confirm).toBe(1);
    const lineage = await fetch(`${base}/api/v1/knowledge/${concept.research.concept.id}/lineage`);
    expect(lineage.status).toBe(200);
    expect(await lineage.json()).toMatchObject({ conceptId: concept.research.concept.id });

    const invalidationResponse = await fetch(`${base}/api/v1/knowledge/invalidations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        operationKey: "invalidate-api-1", targetType: "analysis_revision", targetId: "analysis-api-1",
        reason: "API 测试发现来源完整性失败。", actorId: "api-reviewer"
      })
    });
    expect(invalidationResponse.status).toBe(202);
    const invalidation = knowledgeInvalidationRecordSchema.parse(await invalidationResponse.json());
    expect(invalidation.affectedManifestIds).toContain(manifest.id);
    const invalidations = await fetch(`${base}/api/v1/knowledge/invalidations?conceptId=${concept.research.concept.id}`).then((response) => response.json()) as { invalidations: unknown[] };
    expect(knowledgeInvalidationRecordSchema.array().parse(invalidations.invalidations)).toHaveLength(1);
    const lint = await fetch(`${base}/api/v1/knowledge/lint`).then((response) => response.json()) as { items: unknown[] };
    expect(knowledgeGapSchema.array().parse(lint.items).some((item) => item.code === "orphan-concept")).toBe(false);
  });

  it("freezes package knowledge decisions into the variant and publication lineage", async () => {
    const { base, mediaPath, publishing, publishingRepository } = await fixtureServer();
    const request = async (route: string, body: object) => {
      const response = await fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { response, value: await response.json() as Record<string, unknown> };
    };
    await request("/api/v1/knowledge/compilations", {
      operationKey: "compile-binding-api", compilerPolicyVersion: "v1", inputFingerprint: "sha256:binding-api",
      analysis: { analysisRevisionId: "analysis-binding-api", subjectType: "video", subjectId: "video-binding-api",
        creatorId: "creator-binding-api", videoId: "video-binding-api", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "binding-api", kind: "proof_mode", name: "绑定 API", definition: "固定知识版本。", exclusions: ["漂移引用。"] },
          relation: "confirm", statement: "固定 revision。", evidenceRefs: ["frame:binding:1"], confidence: "high" }] }
    });
    const concepts = await fetch(`${base}/api/v1/knowledge`).then((response) => response.json()) as { concepts: unknown[] };
    const concept = knowledgeConceptViewSchema.parse(concepts.concepts[0]);
    const createdPackage = await request("/api/v1/content-packages", { name: "决策闭环", brief: "API", sourceRefs: ["legacy:kept"] });
    const packageId = String(createdPackage.value.id);
    const detail = await fetch(`${base}/api/v1/content-packages/${packageId}`).then((response) => response.json()) as { snapshots: Array<{ id: string; status: string }> };
    const snapshotId = detail.snapshots[0]!.id;

    const binding = await request(`/api/v1/content-packages/${packageId}/snapshots/${snapshotId}/knowledge-bindings`, {
      operationKey: "binding-api", targetType: "concept_revision", targetId: concept.research.currentRevision.id,
      usage: "test", rationale: "验证这个知识是否适合我们的内容"
    });
    expect(binding.response.status).toBe(201);
    const hypothesis = await request(`/api/v1/content-packages/${packageId}/snapshots/${snapshotId}/hypotheses`, {
      operationKey: "hypothesis-api", statement: "证据前置会提高收藏。", linkedBindingIds: [binding.value.id],
      expectedSignals: ["saves"], unavailableSignals: ["impressions"], baselineDeclaration: "近十条收藏中位数", confounders: []
    });
    expect(hypothesis.response.status).toBe(201);
    const outcomeHypotheses = await Promise.all(["inconclusive", "blocked", "invalidated"].map((outcome) => request(`/api/v1/content-packages/${packageId}/snapshots/${snapshotId}/hypotheses`, {
      operationKey: `hypothesis-api-${outcome}`, statement: `${outcome} 结果假设。`, linkedBindingIds: [binding.value.id],
      expectedSignals: ["saves"], unavailableSignals: outcome === "inconclusive" ? ["impressions"] : [], baselineDeclaration: "近十条中位数", confounders: []
    })));
    expect(outcomeHypotheses.every((item) => item.response.status === 201)).toBe(true);

    const variant = await request(`/api/v1/content-packages/${packageId}/variants`, {
      contentPackageSnapshotId: snapshotId, platform: "douyin", title: "知识快照发布", body: "正文", contentType: "video",
      media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }], tags: [], visibility: "private", scheduledAt: null,
      platformOptions: { douyin: { declaration: "self_made" } }
    });
    expect(variant.response.status).toBe(201);
    expect(variant.value.contentPackageSnapshotId).toBe(snapshotId);
    const frozen = await fetch(`${base}/api/v1/content-packages/${packageId}/snapshots`).then((response) => response.json()) as { snapshots: Array<{ id: string; status: string }> };
    expect(frozen.snapshots[0]).toMatchObject({ id: snapshotId, status: "frozen" });

    const frozenWrite = await request(`/api/v1/content-packages/${packageId}/snapshots/${snapshotId}/knowledge-bindings`, {
      operationKey: "binding-after-freeze", targetType: "concept_revision", targetId: concept.research.currentRevision.id,
      usage: "adopt", rationale: "不应改写历史"
    });
    expect(frozenWrite.response.status).toBe(409);

    const nextSnapshot = await request(`/api/v1/content-packages/${packageId}/snapshots`, {});
    expect(nextSnapshot.value).toMatchObject({ sequence: 2, status: "working" });
    const crossSnapshot = await request(`/api/v1/content-packages/${packageId}/snapshots/${nextSnapshot.value.id}/hypotheses`, {
      operationKey: "cross-snapshot-api", statement: "不允许跨快照。", linkedBindingIds: [binding.value.id],
      expectedSignals: ["saves"], unavailableSignals: [], baselineDeclaration: "基线", confounders: []
    });
    expect(crossSnapshot.response.status).toBe(400);

    const run = await request("/api/v1/publications", { variantId: variant.value.id });
    expect(run.response.status).toBe(201);
    expect(run.value.contentPackageSnapshotId).toBe(snapshotId);

    const premature = await request(`/api/v1/publications/${run.value.id}/practice-validations`, {
      operationKey: "validation-before-execution", hypothesisId: hypothesis.value.id, observedSignals: [], unavailableMetrics: [], executionDeviations: [], confounders: []
    });
    expect(premature.response.status).toBe(409);

    const frozenRun = publishing.getRun(String(run.value.id))!;
    publishingRepository.saveRun({ ...frozenRun, status: "published", currentStage: "平台已验证发布",
      receipt: { externalId: "post-api-1", externalUrl: "https://example.com/post-api-1", platformState: "published", verifiedAt: "2026-08-28T00:00:00.000Z" },
      updatedAt: "2026-08-28T00:00:00.000Z" });

    const validationInputs = [
      { key: "promoted", hypothesisId: hypothesis.value.id, observedSignals: [{ name: "saves", value: 42, unit: "count", source: "manual-public", collectedAt: "2026-08-28T00:00:00.000Z" }], unavailableMetrics: [] },
      { key: "inconclusive", hypothesisId: outcomeHypotheses[0]!.value.id, observedSignals: [], unavailableMetrics: [{ name: "impressions", reason: "平台未开放私有分母", source: "declared-platform-gap", recordedAt: "2026-08-28T00:00:00.000Z" }] },
      { key: "blocked", hypothesisId: outcomeHypotheses[1]!.value.id, observedSignals: [{ name: "saves", value: 8, unit: "count", source: "manual-public", collectedAt: "2026-08-28T00:00:00.000Z" }], unavailableMetrics: [] },
      { key: "invalidated", hypothesisId: outcomeHypotheses[2]!.value.id, observedSignals: [{ name: "saves", value: 2, unit: "count", source: "manual-public", collectedAt: "2026-08-28T00:00:00.000Z" }], unavailableMetrics: [] }
    ];
    const validations = [];
    for (const input of validationInputs) {
      const created = await request(`/api/v1/publications/${run.value.id}/practice-validations`, {
        operationKey: `validation-api-${input.key}`, hypothesisId: input.hypothesisId,
        observedSignals: input.observedSignals, unavailableMetrics: input.unavailableMetrics,
        executionDeviations: input.key === "blocked" ? ["临时更换封面"] : [], confounders: []
      });
      expect(created.response.status).toBe(201);
      validations.push(practiceValidationSchema.parse(created.value));
    }
    expect(validations[1]?.unavailableMetrics[0]).toMatchObject({ name: "impressions", reason: "平台未开放私有分母" });

    const submitCases = [
      { relation: "confirm", target: concept.research.concept.id },
      { relation: "inconclusive", target: null },
      { relation: "qualify", target: concept.research.concept.id },
      { relation: "contradict", target: concept.research.concept.id }
    ] as const;
    for (const [index, validation] of validations.entries()) {
      const submitted = await request(`/api/v1/practice-validations/${validation.id}/submit`, {
        operationKey: `submit-api-${validationInputs[index]!.key}`, proposedRelation: submitCases[index]!.relation,
        targetConceptId: submitCases[index]!.target, decisionReason: "API 集成候选。", submittedBy: "content-reviewer"
      });
      expect(submitted.response.status).toBe(202);
    }
    const decisions = ["promote", "complete_no_promotion", "block", "invalidate"] as const;
    for (const [index, validation] of validations.entries()) {
      const adjudicated = await request(`/api/v1/practice-validations/${validation.id}/adjudicate`, {
        operationKey: `adjudicate-api-${validationInputs[index]!.key}`, decision: decisions[index],
        reason: "API 独立裁决。", adjudicatorId: "knowledge-adjudicator"
      });
      expect(adjudicated.response.status).toBe(202);
      expect(practiceValidationSchema.parse(adjudicated.value).status).toBe(["promoted", "completed_no_promotion", "blocked", "invalidated"][index]);
    }
    const learned = await fetch(`${base}/api/v1/knowledge/${concept.research.concept.id}`).then((response) => response.json());
    const learnedView = knowledgeConceptViewSchema.parse(learned);
    expect(learnedView.research.counts.distinctEligibleVideos).toBe(1);
    expect(learnedView.research.counts.byOrigin.firstPartyPractice.confirm).toBe(1);
  });
});
