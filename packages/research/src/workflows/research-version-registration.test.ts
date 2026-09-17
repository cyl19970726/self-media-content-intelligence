import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { creatorResearchRunSchema, type CreatorResearchEvent, type CreatorResearchRun } from "../../../contracts/index.js";
import type { CreatorArtifactStore } from "../creator-research/artifact-store.js";
import type { AppendEventInput, CreatorResearchRepository } from "../creator-research/repository.js";
import type { ResearchJob } from "../orchestration/contracts.js";
import type { VideoReconstructionOutcome } from "../video-analysis/contracts.js";
import { RepositoryResearchVersionRegistrar, type FrozenPostVersionSource } from "./research-version-registration.js";

class MemoryArtifacts implements CreatorArtifactStore {
  private readonly values = new Map<string, unknown>();
  readonly dependencies = new Map<string, string[]>();
  write(runId: string, filename: string, value: unknown, dependencies: string[] = []): string {
    const ref = `/artifacts/${runId}/${filename}-${this.values.size}.json`;
    this.values.set(ref, structuredClone(value));
    this.dependencies.set(ref, [...dependencies]);
    return ref;
  }
  read(reference: string): unknown { return structuredClone(this.values.get(reference)); }
  archiveReconstructionEvaluations(): void {}
  reconstructionProgress(): string { return "test"; }
}

class MemoryRepository implements CreatorResearchRepository {
  readonly events: AppendEventInput[] = [];
  constructor(public run: CreatorResearchRun) {}
  save(run: CreatorResearchRun): void { this.run = structuredClone(run); }
  get(id: string): CreatorResearchRun | null { return id === this.run.id ? structuredClone(this.run) : null; }
  list(): CreatorResearchRun[] { return [this.get(this.run.id)!]; }
  findLatestByProfileUrl(): CreatorResearchRun | null { return this.get(this.run.id); }
  findLatestByProfileUrlAndAdapter(): CreatorResearchRun | null { return this.get(this.run.id); }
  enqueue(job: ResearchJob): ResearchJob { return job; }
  requeueRun(): ResearchJob | null { return null; }
  claimNext(): ResearchJob | null { return null; }
  activeVideoPostExternalIds(): string[] { return []; }
  updateJobStatus(): void {}
  heartbeat(): boolean { return true; }
  appendEvent(event: AppendEventInput): CreatorResearchEvent {
    this.events.push(event);
    return { ...event, sequence: this.events.length };
  }
  listEvents(): CreatorResearchEvent[] { return []; }
  close(): void {}
}

function run(id: string): CreatorResearchRun {
  return creatorResearchRunSchema.parse({ schemaVersion: "1.3.0", id, platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/test", status: "collecting", currentStage: "deep_capture",
    createdAt: "2026-09-16T00:00:00.000Z", updatedAt: "2026-09-16T00:00:00.000Z", creatorId: "creator",
    creatorName: "Creator", dashboardPath: null, stages: ["preflight", "inventory", "tiering", "deep_capture", "synthesis", "dashboard"]
      .map((stageId) => ({ id: stageId, label: stageId, status: stageId === "synthesis" || stageId === "dashboard" ? "pending" : "complete", message: null })),
    coverage: { discoveredPosts: 2, enrichedPosts: 2, comparisonPosts: 2, reconstructedPosts: 0 },
    collectionPolicy: { adapter: "ego-browser", browserProfile: "hhh-01", readOnly: true, incremental: true,
      bypassChallenges: false, cacheTtlHours: 24, budgets: { maxScrollRounds: 1, maxDetailOpens: 2, maxMediaDownloads: 2 } },
    blockers: [], nextAction: "", lastSnapshotAt: null, inventoryArtifactRef: "/inventory.json",
    portfolioArtifactRef: "/portfolio.json", portfolioAnnotationsArtifactRef: "/annotations.json",
    selectionArtifactRef: "/selection.json", detailArtifactRef: "/detail.json", mediaManifestArtifactRef: "/media.json",
    reconstructionBatchArtifactRef: null, synthesisArtifactRef: null, synthesisGateArtifactRef: null, browserTaskSpaceId: null });
}

function source(batchRef: string, mediaRef: string): FrozenPostVersionSource {
  return { reconstructionBatchArtifactRef: batchRef, selectionArtifactRef: "/selection.json", detailArtifactRef: "/detail.json",
    mediaManifestArtifactRef: "/media.json", sourceMediaArtifactRef: mediaRef };
}

function built(ref: string): VideoReconstructionOutcome {
  return { state: "built_unevaluated", reconstructionArtifactRef: ref, articleArtifactRef: null,
    builderValidationArtifactRef: `${ref}.validation`, evaluationMode: "skipped" };
}

function setup() {
  const id = randomUUID();
  const artifacts = new MemoryArtifacts();
  const initial = { schemaVersion: "1.0.0" as const, creatorRunId: id, revision: 1,
    generatedAt: "2026-09-16T00:00:00.000Z", requestedPosts: 2, builtPosts: 0, verifiedPosts: 0,
    readyPosts: 0, pendingPosts: 2, failedPosts: 0, limitations: [], items: ["a", "b"].map((postExternalId, index) => ({
      postExternalId, tier: index ? "base" as const : "high" as const, tierRank: 1, state: "queued" as const,
      evaluationPolicy: "skip@builder-fast-path-v1" as const, sourceMediaArtifactRef: `/media-${postExternalId}.mp4`,
      reconstructionArtifactRef: null, articleArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
      threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null, failedGateIds: [], message: "queued",
      updatedAt: "2026-09-16T00:00:00.000Z" })) };
  const initialRef = artifacts.write(id, "batch-r1.json", initial);
  const repository = new MemoryRepository({ ...run(id), reconstructionBatchArtifactRef: initialRef });
  const registrar = new RepositoryResearchVersionRegistrar(repository, artifacts, { run: (_id, operation) => operation() },
    () => "2026-09-16T01:00:00.000Z");
  const registeredBy = { workflowRunId: "workflow", stepRunId: "step", attemptId: "attempt" };
  return { id, artifacts, repository, registrar, initialRef, registeredBy };
}

describe("RepositoryResearchVersionRegistrar", () => {
  it("stores simple Reviewer state without turning the Builder candidate into a verified evaluation", async () => {
    const context = setup();
    const researchReview = { schemaVersion: "research-review-state@1" as const,
      reviewStatus: "completed_with_findings" as const, candidateStatus: "revised_unverified" as const,
      reviewArtifactRef: "/artifacts/review.json", revisionRecordArtifactRef: "/artifacts/revision.json",
      candidateReportSha256: "a".repeat(64) };
    const legacyReview = { state: "verified" as const, reconstructionArtifactRef: "/legacy-reviewed.json",
      articleArtifactRef: null, builderValidationArtifactRef: "/legacy.validation", evaluationArtifactRef: "/evaluation.json",
      gateReportArtifactRef: "/gate.json", threeLensEvaluationArtifactRef: "/three-lens.json",
      threeLensGateReportArtifactRef: "/three-lens-gate.json", threeLensGateCount: 19 as const, gateCount: 20,
      failedGateIds: [] as [], qualityWarningGateIds: [], evaluationMode: "single_pass" as const };
    const result = await context.registrar.registerPostVersion({ creatorRunId: context.id, postExternalId: "a",
      source: source(context.initialRef, "/media-a.mp4"), candidate: built("/candidate.json"), review: legacyReview,
      researchReview, registeredBy: context.registeredBy });
    const batch = context.artifacts.read(result.reconstructionBatchArtifactRef) as { items: Array<Record<string, unknown>> };
    expect(batch.items[0]).toMatchObject({ state: "built_unevaluated", reconstructionArtifactRef: "/candidate.json", researchReview });
    expect(context.artifacts.dependencies.get(result.reconstructionBatchArtifactRef)).toEqual(expect.arrayContaining([
      "/artifacts/review.json", "/artifacts/revision.json"
    ]));
  });

  it("merges two post completions into the latest batch without losing either item", async () => {
    const context = setup();
    await Promise.all(["a", "b"].map((post) => context.registrar.registerPostVersion({ creatorRunId: context.id,
      postExternalId: post, source: source(context.initialRef, `/media-${post}.mp4`), candidate: built(`/reconstruction-${post}.json`),
      registeredBy: context.registeredBy })));
    const batch = context.artifacts.read(context.repository.run.reconstructionBatchArtifactRef!) as { revision: number; items: Array<{ reconstructionArtifactRef: string | null }> };
    expect(batch.revision).toBe(3);
    expect(batch.items.map((item) => item.reconstructionArtifactRef)).toEqual(["/reconstruction-a.json", "/reconstruction-b.json"]);
  });

  it("is idempotent for the same output and rejects an older workflow overwriting the same post", async () => {
    const context = setup();
    const input = { creatorRunId: context.id, postExternalId: "a", source: source(context.initialRef, "/media-a.mp4"),
      candidate: built("/reconstruction-a.json"), registeredBy: context.registeredBy };
    await expect(context.registrar.registerPostVersion(input)).resolves.toMatchObject({ state: "registered" });
    await expect(context.registrar.registerPostVersion(input)).resolves.toMatchObject({ state: "already_registered" });
    await expect(context.registrar.registerPostVersion({ ...input, candidate: built("/stale-output.json") }))
      .rejects.toThrow("STALE_WORKFLOW_SOURCE");
  });

  it("retains the last good synthesis and distinguishes provisional from verified promotion", async () => {
    const context = setup();
    context.repository.run.synthesisArtifactRef = "/last-good.json";
    context.repository.run.synthesisGateArtifactRef = "/last-good-gate.json";
    const common = { creatorRunId: context.id,
      source: { reconstructionBatchArtifactRef: context.initialRef, portfolioArtifactRef: "/portfolio.json",
        portfolioAnnotationsArtifactRef: "/annotations.json", selectionArtifactRef: "/selection.json", detailArtifactRef: "/detail.json",
        previousSynthesisArtifactRef: "/last-good.json", previousSynthesisGateArtifactRef: "/last-good-gate.json" },
      registeredBy: context.registeredBy };
    await expect(context.registrar.registerCreatorVersion({ ...common,
      candidate: { state: "not_ready", synthesisArtifactRef: "/candidate.json", gateArtifactRef: "/candidate-gate.json",
        failedGateIds: ["deep_evidence_binding"], message: "not ready" } })).resolves.toMatchObject({
          state: "retained_last_good", synthesisArtifactRef: "/last-good.json", publication: "not_promoted" });
    await expect(context.registrar.registerCreatorVersion({ ...common,
      candidate: { state: "provisional", synthesisArtifactRef: "/provisional.json", gateArtifactRef: "/provisional-gate.json",
        failedGateIds: ["deep_9_ready"] } })).resolves.toMatchObject({ publication: "provisional" });
    await expect(context.registrar.registerCreatorVersion({ ...common,
      candidate: { state: "provisional", synthesisArtifactRef: "/provisional.json", gateArtifactRef: "/provisional-gate.json",
        failedGateIds: ["deep_9_ready"] } })).resolves.toMatchObject({ state: "already_registered", publication: "provisional" });
    expect(context.repository.run).toMatchObject({ status: "reviewable", synthesisArtifactRef: "/provisional.json" });
    await expect(context.registrar.registerCreatorVersion({ ...common,
      candidate: { state: "ready", synthesisArtifactRef: "/older-ready.json", gateArtifactRef: "/older-ready-gate.json" } }))
      .rejects.toThrow("STALE_WORKFLOW_SOURCE");
  });

  it("rejects creator promotion after portfolio or annotation sources change", async () => {
    const context = setup();
    const request = { creatorRunId: context.id,
      source: { reconstructionBatchArtifactRef: context.initialRef, portfolioArtifactRef: "/portfolio.json",
        portfolioAnnotationsArtifactRef: "/annotations.json", selectionArtifactRef: "/selection.json", detailArtifactRef: "/detail.json",
        previousSynthesisArtifactRef: null, previousSynthesisGateArtifactRef: null }, registeredBy: context.registeredBy,
      candidate: { state: "ready" as const, synthesisArtifactRef: "/ready.json", gateArtifactRef: "/ready-gate.json" } };
    context.repository.run.portfolioArtifactRef = "/new-portfolio.json";
    await expect(context.registrar.registerCreatorVersion(request)).rejects.toThrow("STALE_WORKFLOW_SOURCE");
    context.repository.run.portfolioArtifactRef = "/portfolio.json";
    context.repository.run.portfolioAnnotationsArtifactRef = "/new-annotations.json";
    await expect(context.registrar.registerCreatorVersion(request)).rejects.toThrow("STALE_WORKFLOW_SOURCE");
  });

  it("registers a Builder-only creator synthesis as provisional when simple review metadata is present", async () => {
    const context = setup();
    const researchReview = { schemaVersion: "research-review-state@1" as const,
      reviewStatus: "completed_no_findings" as const, candidateStatus: "original_reviewed" as const,
      reviewArtifactRef: "/artifacts/creator-review.json", revisionRecordArtifactRef: null,
      candidateReportSha256: "b".repeat(64) };
    await expect(context.registrar.registerCreatorVersion({ creatorRunId: context.id,
      source: { reconstructionBatchArtifactRef: context.initialRef, portfolioArtifactRef: "/portfolio.json",
        portfolioAnnotationsArtifactRef: "/annotations.json", selectionArtifactRef: "/selection.json", detailArtifactRef: "/detail.json",
        previousSynthesisArtifactRef: null, previousSynthesisGateArtifactRef: null },
      candidate: { state: "not_ready", synthesisArtifactRef: "/builder-synthesis.json", gateArtifactRef: null,
        failedGateIds: ["program_validation_only"], message: "legacy gate not used" }, researchReview,
      registeredBy: context.registeredBy })).resolves.toMatchObject({ state: "registered", publication: "provisional",
        synthesisArtifactRef: "/builder-synthesis.json", synthesisGateArtifactRef: null });
    expect(context.repository.run).toMatchObject({ status: "reviewable", synthesisArtifactRef: "/builder-synthesis.json",
      synthesisGateArtifactRef: null, researchReview });
  });
});
