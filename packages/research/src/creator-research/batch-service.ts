import { createHash, randomUUID } from "node:crypto";
import {
  createCreatorResearchBatchInputSchema,
  creatorResearchBatchProjectionSchema,
  creatorResearchBatchSchema,
  type CreateCreatorResearchBatchInput,
  type CreatorAcquisitionAdapter,
  type CreatorResearchBatch,
  type CreatorResearchBatchCounts,
  type CreatorResearchBatchItemMaturity,
  type CreatorResearchBatchProjection,
  type CreatorResearchBatchStatus,
  type CreatorResearchRun,
  type ParsedCreateCreatorResearchBatchInput
} from "../../../contracts/index.js";
import type { CreatorResearchBatchRepository } from "./batch-repository.js";

export interface CreatorResearchRunIntake {
  create(profileUrl: string, adapter: CreatorAcquisitionAdapter): CreatorResearchRun;
}

export interface CreatorResearchRunReader {
  get(runId: string): CreatorResearchRun | null;
}

function commandHash(input: ParsedCreateCreatorResearchBatchInput): string {
  return createHash("sha256")
    .update(JSON.stringify({ name: input.name, creators: input.creators }))
    .digest("hex");
}

function emptyCounts(): CreatorResearchBatchCounts {
  return {
    queued: 0,
    preflight: 0,
    collecting: 0,
    needsUser: 0,
    backoff: 0,
    reviewable: 0,
    ready: 0,
    failed: 0,
    stale: 0
  };
}

function increment(counts: CreatorResearchBatchCounts, status: CreatorResearchRun["status"]): void {
  if (status === "needs_user") counts.needsUser += 1;
  else counts[status] += 1;
}

function aggregateStatus(
  counts: CreatorResearchBatchCounts,
  total: number,
  dossierReadyRuns: number,
  wikiReadyRuns: number
): CreatorResearchBatchStatus {
  if (counts.queued === total) return "queued";
  if (wikiReadyRuns === total) return "ready";
  if (dossierReadyRuns === total) return "reviewable";
  if (counts.failed === total) return "failed";
  if (counts.stale === total) return "stale";

  const terminal = counts.reviewable + counts.ready + counts.failed + counts.stale;
  if (terminal === total) return "partial";
  if (counts.needsUser > 0) return "needs_user";
  return "running";
}

function runMaturity(run: CreatorResearchRun): CreatorResearchBatchItemMaturity {
  if (!run.synthesisArtifactRef) return "incomplete";
  if (run.status === "ready") return "wiki_ready";
  if (run.status === "reviewable" && !run.blockers.some((blocker) => blocker.code === "creator_synthesis_not_ready")) {
    return "dossier_ready";
  }
  return "incomplete";
}

export class CreatorResearchBatchService {
  constructor(
    private readonly batches: CreatorResearchBatchRepository,
    private readonly intake: CreatorResearchRunIntake,
    private readonly runs: CreatorResearchRunReader
  ) {}

  create(input: CreateCreatorResearchBatchInput): CreatorResearchBatchProjection {
    const parsed = createCreatorResearchBatchInputSchema.parse(input);
    const hash = commandHash(parsed);
    const prior = this.batches.getByOperationKey(parsed.operationKey, hash);
    if (prior) return this.project(prior);

    const runIds = parsed.creators.map((creator) => this.intake.create(creator.profileUrl, creator.adapter).id);
    const batch = creatorResearchBatchSchema.parse({
      schemaVersion: "creator-research-batch@1",
      id: randomUUID(),
      name: parsed.name,
      runIds,
      createdAt: new Date().toISOString()
    });
    return this.project(this.batches.create(batch, parsed.operationKey, hash));
  }

  get(batchId: string): CreatorResearchBatchProjection | null {
    const batch = this.batches.get(batchId);
    return batch ? this.project(batch) : null;
  }

  list(limit = 50): CreatorResearchBatchProjection[] {
    return this.batches.list(limit).map((batch) => this.project(batch));
  }

  private project(batch: CreatorResearchBatch): CreatorResearchBatchProjection {
    const counts = emptyCounts();
    const items = batch.runIds.map((runId, index) => {
      const run = this.runs.get(runId);
      if (!run) throw new Error(`creator research batch ${batch.id} references missing run ${runId}`);
      increment(counts, run.status);
      const maturity = runMaturity(run);
      return {
        position: index + 1,
        runId: run.id,
        profileUrl: run.profileUrl,
        adapter: run.collectionPolicy.adapter,
        creatorName: run.creatorName,
        status: run.status,
        maturity,
        currentStage: run.currentStage,
        coverage: run.coverage,
        blockerCodes: run.blockers.map((blocker) => blocker.code),
        nextAction: run.nextAction,
        dashboardPath: run.dashboardPath,
        updatedAt: run.updatedAt
      };
    });
    const totalRuns = items.length;
    const completedRuns = counts.reviewable + counts.ready + counts.failed + counts.stale;
    const dossierReadyRuns = items.filter((item) => item.maturity !== "incomplete").length;
    const wikiReadyRuns = items.filter((item) => item.maturity === "wiki_ready").length;
    const successfulRuns = dossierReadyRuns;
    const updatedAt = items.reduce(
      (latest, item) => Date.parse(item.updatedAt) > Date.parse(latest) ? item.updatedAt : latest,
      items[0]?.updatedAt ?? batch.createdAt
    );
    return creatorResearchBatchProjectionSchema.parse({
      batch,
      status: aggregateStatus(counts, totalRuns, dossierReadyRuns, wikiReadyRuns),
      counts,
      totalRuns,
      completedRuns,
      successfulRuns,
      progressPercent: Math.round(completedRuns / totalRuns * 100),
      dossierReadyRuns,
      wikiReadyRuns,
      dossierProgressPercent: Math.round(dossierReadyRuns / totalRuns * 100),
      items,
      updatedAt
    });
  }
}
