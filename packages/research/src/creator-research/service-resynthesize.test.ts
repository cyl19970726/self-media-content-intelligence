import { expect, it } from "vitest";
import type { CreatorResearchEvent, CreatorResearchRun } from "../../../contracts/index.js";
import type { CreatorArtifactStore, DeepMediaResolver, ResearchJob,
  VideoReconstructionExecutor, CreatorSynthesisExecutor } from "../../index.js";
import type { CreatorResearchRepository } from "./repository.js";
import { CreatorResearchService } from "./service.js";

class MemoryRepository implements CreatorResearchRepository {
  jobs: ResearchJob[] = [];
  events: CreatorResearchEvent[] = [];
  constructor(readonly run: CreatorResearchRun) {}
  save(): void {}
  get(id: string): CreatorResearchRun | null { return id === this.run.id ? this.run : null; }
  list(): CreatorResearchRun[] { return [this.run]; }
  findLatestByProfileUrl(): CreatorResearchRun | null { return null; }
  findLatestByProfileUrlAndAdapter(): CreatorResearchRun | null { return null; }
  enqueue(job: ResearchJob): ResearchJob { this.jobs.push(job); return job; }
  requeueRun(): ResearchJob | null { return null; }
  claimNext(): ResearchJob | null { return null; }
  activeVideoPostExternalIds(): string[] { return []; }
  updateJobStatus(): void {}
  heartbeat(): boolean { return true; }
  appendEvent(event: Omit<CreatorResearchEvent, "sequence">): CreatorResearchEvent {
    const saved = { ...event, sequence: this.events.length + 1 } as CreatorResearchEvent;
    this.events.push(saved); return saved;
  }
  listEvents(): CreatorResearchEvent[] { return this.events; }
  close(): void {}
}

class MemoryArtifacts implements CreatorArtifactStore {
  readonly values = new Map<string, unknown>();
  write(_runId: string, filename: string, value: unknown): string { this.values.set(filename, value); return filename; }
  read(reference: string): unknown { return this.values.get(reference); }
  archiveReconstructionEvaluations(): void {}
  reconstructionProgress(): string { return "test"; }
}

function fixture() {
  const runId = "11111111-1111-4111-8111-111111111111";
  const timestamp = "2026-09-14T00:00:00.000Z";
  const groups = ["high", "median", "mean", "low"] as const;
  const selection = { schemaVersion: "1.0.0", runId, generatedAt: timestamp, sourceCorpusArtifactRef: "/corpus.json",
    ruleVersion: "four-groups-3-each-v2", rules: { targetPerTier: 7, deepCandidatesPerTier: 3, deepCandidatesPerGroup: 3,
      deepGroupContract: "test", high: "test", base: "test", low: "test", unknownMetricPolicy: "exclude_from_metric_tiering" },
    denominator: { discoveredPosts: 4, eligiblePosts: 4, selectedPosts: 4, excludedMissingLikes: 0 },
    anchors: { median: 2, mean: 2, medianNearPostId: "p1", meanNearPostId: "p2", meanGap: false, meanGapReason: null },
    tierCounts: { high: 1, base: 2, low: 1 }, limitations: [],
    items: groups.map((group, index) => ({ externalId: `p${index}`, url: `https://example.com/p${index}`, title: group,
      visibleText: null, mediaType: "video", likesLabel: null, likes: index + 1,
      tier: index === 0 ? "high" : index === 3 ? "low" : "base", tierRank: 1, anchors: [], selectionReason: "test",
      deepCandidate: true, deepGroups: [group], deepState: "pending", confounds: [] })) };
  const batch = { schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: timestamp,
    requestedPosts: 4, builtPosts: 4, verifiedPosts: 0, readyPosts: 0, pendingPosts: 0, failedPosts: 0, limitations: [],
    items: groups.map((_, index) => ({ postExternalId: `p${index}`, tier: index === 0 ? "high" : index === 3 ? "low" : "base",
      tierRank: 1, state: "built_unevaluated", evaluationPolicy: "skip@builder-fast-path-v1", sourceMediaArtifactRef: null,
      reconstructionArtifactRef: `/p${index}.json`, articleArtifactRef: null, evaluationArtifactRef: null,
      gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
      failedGateIds: [], message: "built", updatedAt: timestamp })) };
  const run = { id: runId, status: "reviewable", currentStage: "synthesis", selectionArtifactRef: "selection",
    reconstructionBatchArtifactRef: "batch", synthesisArtifactRef: "/old/synthesis.json",
    synthesisGateArtifactRef: "/old/gate.json", portfolioAnnotationsArtifactRef: "/annotations.json",
    worker: { state: "succeeded", attempt: 1, jobId: "old-job", workerId: null, lastHeartbeatAt: timestamp },
    stages: [{ id: "deep_capture", label: "deep", status: "complete", message: null },
      { id: "synthesis", label: "synthesis", status: "complete", message: null }], blockers: [], videoWork: {
      concurrencyLimit: 1, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 4, failedPosts: 0
    } } as unknown as CreatorResearchRun;
  const artifacts = new MemoryArtifacts(); artifacts.values.set("selection", selection); artifacts.values.set("batch", batch);
  const repository = new MemoryRepository(run);
  const service = new CreatorResearchService(repository, artifacts, {} as DeepMediaResolver,
    {} as VideoReconstructionExecutor, {} as CreatorSynthesisExecutor, 1);
  return { run, repository, service };
}

it("queues a source-bound rebuild while preserving last-good refs and deduplicates an active request", () => {
  const { run, repository, service } = fixture();
  const first = service.resynthesize(run.id);
  expect(first).toMatchObject({ synthesisArtifactRef: "/old/synthesis.json", synthesisGateArtifactRef: "/old/gate.json",
    currentStage: "synthesis", worker: { state: "queued" } });
  expect(repository.jobs).toHaveLength(1);
  expect(repository.jobs[0]?.payload).toMatchObject({ previousSynthesisArtifactRef: "/old/synthesis.json",
    previousSynthesisGateArtifactRef: "/old/gate.json" });
  expect(service.resynthesize(run.id)).toBe(first);
  expect(repository.jobs).toHaveLength(1);
});

it("clears creator review metadata when selection rebuild invalidates the synthesis", () => {
  const { run, service } = fixture();
  run.inventoryArtifactRef = "/inventory.json";
  run.coverage = { discoveredPosts: 4, enrichedPosts: 4, comparisonPosts: 4, reconstructedPosts: 4 };
  run.collectionPolicy = { adapter: "redfox", browserProfile: null, readOnly: true, incremental: true,
    bypassChallenges: false, cacheTtlHours: 24,
    budgets: { maxScrollRounds: 1, maxDetailOpens: 4, maxMediaDownloads: 4 } };
  run.stages = ["preflight", "inventory", "tiering", "deep_capture", "synthesis", "dashboard"].map((id) => ({
    id: id as CreatorResearchRun["stages"][number]["id"], label: id, status: "complete" as const, message: null
  }));
  run.researchReview = { schemaVersion: "research-review-state@1", reviewStatus: "completed_no_findings",
    candidateStatus: "original_reviewed", reviewArtifactRef: "/review.json", revisionRecordArtifactRef: null,
    candidateReportSha256: "a".repeat(64) };
  service.rebuildSelection(run.id);
  expect(run).toMatchObject({ synthesisArtifactRef: null, synthesisGateArtifactRef: null, researchReview: null });
});
