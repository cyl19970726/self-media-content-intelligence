import { expect, it } from "vitest";
import type { CreatorResearchEvent, CreatorResearchRun } from "../../../contracts/index.js";
import type { CreatorArtifactStore, CreatorSynthesisExecutor, DeepMediaResolver,
  ResearchJob, VideoReconstructionExecutor } from "../../index.js";
import type { ResearchWorkflowExecutor, WorkflowQueueReceipt } from "../workflows/contracts.js";
import type { CreatorResearchRepository } from "./repository.js";
import { CreatorResearchService } from "./service.js";

const runId = "11111111-1111-4111-8111-111111111111";
const receipt: WorkflowQueueReceipt = {
  creatorRunId: runId, workflowRunId: "workflow-1", workflowId: "post", workflowRevision: "v1",
  generation: 1, state: "queued"
};

const legacyEntrypoints: Array<[string, (service: CreatorResearchService) => unknown]> = [
  ["resume", (service) => service.resume(runId)],
  ["revalidateSynthesis", (service) => service.revalidateSynthesis(runId)],
  ["evaluateBuiltVideos", (service) => service.evaluateBuiltVideos(runId, ["p1"])],
  ["annotatePortfolio", (service) => service.annotatePortfolio(runId)],
  ["continueWithBoundedMediaGaps", (service) => service.continueWithBoundedMediaGaps(runId)],
  ["rebuildSelection", (service) => service.rebuildSelection(runId)]
];

class MemoryRepository implements CreatorResearchRepository {
  jobs: ResearchJob[] = [];
  events: CreatorResearchEvent[] = [];
  cancelCalls = 0;
  constructor(readonly run: CreatorResearchRun) {}
  save(): void {}
  get(id: string): CreatorResearchRun | null { return id === runId ? this.run : null; }
  list(): CreatorResearchRun[] { return [this.run]; }
  findLatestByProfileUrl(): CreatorResearchRun | null { return null; }
  findLatestByProfileUrlAndAdapter(): CreatorResearchRun | null { return null; }
  enqueue(job: ResearchJob): ResearchJob { this.jobs.push(job); return job; }
  cancelWorkflowJobs(): number { this.cancelCalls += 1; return 1; }
  requeueRun(): ResearchJob | null { return null; }
  claimNext(): ResearchJob | null { return null; }
  activeVideoPostExternalIds(): string[] { return []; }
  updateJobStatus(): void {}
  heartbeat(): boolean { return true; }
  appendEvent(event: Omit<CreatorResearchEvent, "sequence">): CreatorResearchEvent {
    const saved = { ...event, sequence: this.events.length + 1 } as CreatorResearchEvent;
    this.events.push(saved);
    return saved;
  }
  listEvents(): CreatorResearchEvent[] { return this.events; }
  close(): void {}
}

class MemoryArtifacts implements CreatorArtifactStore {
  write(): string { return "artifact"; }
  read(reference?: string): unknown { void reference; return null; }
  archiveReconstructionEvaluations(): void {}
  reconstructionProgress(): string { return "test"; }
}

function fixture() {
  const timestamp = "2026-09-16T00:00:00.000Z";
  const run = {
    schemaVersion: "1.3.0", id: runId, platform: "xiaohongshu", profileUrl: "https://www.xiaohongshu.com/user/profile/test",
    status: "reviewable", currentStage: "synthesis", createdAt: timestamp, updatedAt: timestamp,
    creatorId: "creator", creatorName: "creator", source: { kind: "live_collection", sourceRefs: [], importedAt: null },
    publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: null, identityAnchors: [] },
    dashboardPath: null, stages: [{ id: "deep_capture", label: "deep", status: "complete", message: null }],
    coverage: { discoveredPosts: 1, enrichedPosts: 1, comparisonPosts: 1, reconstructedPosts: 1 },
    collectionPolicy: { adapter: "redfox", browserProfile: null, readOnly: true, incremental: true, bypassChallenges: false,
      cacheTtlHours: 24, budgets: { maxScrollRounds: 1, maxDetailOpens: 1, maxMediaDownloads: 1 } },
    blockers: [{ code: "existing_blocker", message: "keep", userActionRequired: false }], nextAction: "continue",
    lastSnapshotAt: timestamp, worker: { state: "succeeded", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: null },
    videoWork: { concurrencyLimit: 1, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 1, failedPosts: 0 },
    inventoryArtifactRef: null, portfolioArtifactRef: null, portfolioAnnotationsArtifactRef: null, selectionArtifactRef: null,
    detailArtifactRef: null, mediaManifestArtifactRef: null, reconstructionBatchArtifactRef: null,
    synthesisArtifactRef: null, synthesisGateArtifactRef: null, browserTaskSpaceId: null
  } as unknown as CreatorResearchRun;
  const repository = new MemoryRepository(run);
  const calls = { retry: 0, cancel: 0 };
  const executor = {
    createPost: async () => receipt,
    createSynthesis: async () => receipt,
    createAnalysis: async () => receipt,
    advance: async () => receipt,
    prepareRetry: async () => { calls.retry += 1; return receipt; },
    cancel: async () => { calls.cancel += 1; },
    snapshot: async () => receipt
  } as ResearchWorkflowExecutor;
  const service = new CreatorResearchService(repository, new MemoryArtifacts(), {} as DeepMediaResolver,
    {} as VideoReconstructionExecutor, {} as CreatorSynthesisExecutor, 1, undefined, undefined, executor);
  return { run, repository, calls, service };
}

it("persists a source identity blocker without replacing other blockers and records its evidence", () => {
  const { run, repository, service } = fixture();
  service.recordSourceIdentityConflict(runId, {
    postExternalId: "6a916dbf000000000302829c", message: "详情元数据与下载媒体不一致", evidenceRef: "/diagnostics/redfox.json"
  });
  expect(run.blockers).toEqual(expect.arrayContaining([
    { code: "existing_blocker", message: "keep", userActionRequired: false },
    expect.objectContaining({ code: "source_identity_conflict", userActionRequired: true })
  ]));
  expect(run.nextAction).toContain("独立核对媒体");
  expect(run).toMatchObject({ status: "needs_user", currentStage: "deep_capture", worker: { state: "needs_user" } });
  expect(run.stages.find((entry) => entry.id === "deep_capture")).toMatchObject({ status: "blocked", message: expect.stringContaining("独立核对媒体") });
  expect(repository.events).toHaveLength(1);
  expect(repository.events[0]).toMatchObject({ type: "handoff.required", payload: {
    blockerCode: "source_identity_conflict", postExternalId: "6a916dbf000000000302829c", evidenceRef: "/diagnostics/redfox.json"
  } });
  service.recordSourceIdentityConflict(runId, {
    postExternalId: "another-post", message: "another mismatch", evidenceRef: "/diagnostics/another.json"
  });
  expect(run.blockers.filter((blocker) => blocker.code === "source_identity_conflict")).toHaveLength(2);
});

it("blocks all new downstream starts and retries, while reads and cancellation remain available", async () => {
  const { repository, calls, service } = fixture();
  service.recordSourceIdentityConflict(runId, { postExternalId: "p1", message: "mismatch", evidenceRef: "/evidence" });
  await expect(service.startPostWorkflow(runId, "p1")).rejects.toThrow("来源身份冲突");
  await expect(service.startCreatorSynthesisWorkflow(runId)).rejects.toThrow("来源身份冲突");
  await expect(service.startCreatorAnalysisWorkflow(runId)).rejects.toThrow("来源身份冲突");
  await expect(service.retryWorkflowStep(runId, "workflow-1", "repair")).rejects.toThrow("来源身份冲突");
  expect(() => service.resynthesize(runId)).toThrow("来源身份冲突");
  expect(() => service.retryFailedReconstructions(runId)).toThrow("来源身份冲突");
  expect(calls.retry).toBe(0);
  await expect(service.getWorkflowQueue(runId, "workflow-1")).resolves.toEqual(receipt);
  await expect(service.cancelWorkflow(runId, "workflow-1")).resolves.toEqual(receipt);
  expect(calls.cancel).toBe(1);
  expect(repository.cancelCalls).toBe(1);
});

it("allows an ordinary workflow retry when no source identity blocker exists", async () => {
  const { calls, service } = fixture();
  await expect(service.retryWorkflowStep(runId, "workflow-1", "repair")).resolves.toMatchObject({ state: "queued" });
  expect(calls.retry).toBe(1);
});

it("passes explicit rebuild mode to every selected post in creator analysis", async () => {
  const { run, service } = fixture();
  const timestamp = "2026-09-16T00:00:00.000Z";
  Object.assign(run, { portfolioArtifactRef: "/portfolio", portfolioAnnotationsArtifactRef: "/annotations",
    selectionArtifactRef: "/selection", detailArtifactRef: "/details", mediaManifestArtifactRef: "/media",
    reconstructionBatchArtifactRef: "/batch", blockers: [] });
  const selection = { schemaVersion: "1.0.0", runId, generatedAt: timestamp, sourceCorpusArtifactRef: "/corpus",
    ruleVersion: "four-groups-3-each-v2", rules: { targetPerTier: 7, deepCandidatesPerTier: 3,
      deepCandidatesPerGroup: 3, deepGroupContract: "test", high: "test", base: "test", low: "test",
      unknownMetricPolicy: "exclude_from_metric_tiering" }, denominator: { discoveredPosts: 1, eligiblePosts: 1,
      selectedPosts: 1, excludedMissingLikes: 0 }, anchors: { median: 1, mean: 1, medianNearPostId: "p1",
      meanNearPostId: "p1", meanGap: false, meanGapReason: null }, tierCounts: { high: 1, base: 0, low: 0 },
    items: [{ externalId: "p1", url: "https://example.test/p1", title: "p1", visibleText: null, mediaType: "video",
      likesLabel: null, likes: 1, tier: "high", tierRank: 1, anchors: [], selectionReason: "test", deepCandidate: true,
      deepGroups: ["high"], deepState: "pending", confounds: [] }], limitations: [] };
  const supplemental = { postExternalId: "p2", tier: "base", tierRank: 1, state: "built_unevaluated",
    evaluationPolicy: "skip@builder-fast-path-v1", sourceMediaArtifactRef: "/video-2",
    reconstructionArtifactRef: "/old-candidate-2", articleArtifactRef: null, evaluationArtifactRef: null,
    gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
    failedGateIds: [], message: "supplemental", updatedAt: timestamp };
  const batch = { schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: timestamp, requestedPosts: 2,
    builtPosts: 2, verifiedPosts: 0, readyPosts: 0, pendingPosts: 0, failedPosts: 0, limitations: [], items: [{
      postExternalId: "p1", tier: "high", tierRank: 1, state: "built_unevaluated", evaluationPolicy: "skip@builder-fast-path-v1",
      sourceMediaArtifactRef: "/video", reconstructionArtifactRef: "/old-candidate", articleArtifactRef: null,
      evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
      threeLensGateReportArtifactRef: null, failedGateIds: [], message: "test", updatedAt: timestamp }, supplemental] };
  const media = { schemaVersion: "1.0.0", runId, generatedAt: timestamp, requestedPosts: 2, readyPosts: 2,
    requestedCovers: 0, readyCovers: 0, items: [{ externalId: "p1", videoRequested: true, state: "verified_complete",
      coverState: "missing", coverMessage: "none", videoArtifactRef: "/video", coverArtifactRef: null,
      sha256: "a".repeat(64), bytes: 1, durationSeconds: 1, width: 1, height: 1, hasAudio: true, message: "ready" },
    { externalId: "p2", videoRequested: true, state: "verified_complete", coverState: "missing", coverMessage: "none",
      videoArtifactRef: "/video-2", coverArtifactRef: null, sha256: "b".repeat(64), bytes: 1, durationSeconds: 1,
      width: 1, height: 1, hasAudio: true, message: "ready" }], unknowns: [] };
  let currentBatch: unknown = batch;
  const artifacts = (service as unknown as { artifacts: MemoryArtifacts }).artifacts;
  artifacts.read = (reference?: string) => reference
    ? ({ "/selection": selection, "/batch": currentBatch, "/media": media }[reference] ?? null) : null;
  let captured: unknown;
  const executor = (service as unknown as { workflowExecutor: ResearchWorkflowExecutor }).workflowExecutor;
  executor.createAnalysis = async (input) => { captured = input; return receipt; };

  await service.startCreatorAnalysisWorkflow(runId, { candidateMode: "rebuild" });

  expect(captured).toMatchObject({ posts: [{ postExternalId: "p1", candidateMode: "rebuild" }] });

  await service.startCreatorAnalysisWorkflow(runId, { candidateMode: "rebuild", scope: "available_deep" });
  expect(captured).toMatchObject({ posts: [
    { postExternalId: "p1", candidateMode: "rebuild" },
    { postExternalId: "p2", candidateMode: "rebuild" }
  ] });

  let capturedPost: unknown;
  executor.createPost = async (input) => { capturedPost = input; return receipt; };
  await service.startPostWorkflow(runId, "p1", { candidateMode: "rebuild" });
  expect(capturedPost).toMatchObject({ postExternalId: "p1", candidateMode: "rebuild" });
  await service.startPostWorkflow(runId, "p1");
  expect(capturedPost).not.toHaveProperty("candidateMode");

  currentBatch = { ...batch, items: [batch.items[0], { ...supplemental, sourceMediaArtifactRef: null }] };
  await expect(service.startCreatorAnalysisWorkflow(runId, { candidateMode: "rebuild", scope: "available_deep" }))
    .rejects.toThrow("单帖 p2 存在旧报告但缺少可冻结的媒体来源");
});

it.each(legacyEntrypoints)("does not let %s clear a source identity blocker", (_name, invoke) => {
  const { run, service } = fixture();
  service.recordSourceIdentityConflict(runId, { postExternalId: "p1", message: "mismatch", evidenceRef: "/evidence" });
  expect(() => invoke(service)).toThrow("来源身份冲突");
  expect(run.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: "source_identity_conflict" })]));
  expect(run.status).toBe("needs_user");
});
