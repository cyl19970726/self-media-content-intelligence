import { describe, expect, it } from "vitest";
import {
  createCreatorResearchBatchInputSchema,
  creatorResearchRunSchema,
  type CreatorResearchBatch,
  type CreatorResearchRun
} from "../../../contracts/index.js";
import type { CreatorResearchBatchRepository } from "./batch-repository.js";
import {
  CreatorResearchBatchService,
  type CreatorResearchRunIntake,
  type CreatorResearchRunReader
} from "./batch-service.js";

class MemoryBatchRepository implements CreatorResearchBatchRepository {
  private readonly batches = new Map<string, CreatorResearchBatch>();
  private readonly operations = new Map<string, { hash: string; batchId: string }>();

  getByOperationKey(operationKey: string, commandHash: string): CreatorResearchBatch | null {
    const operation = this.operations.get(operationKey);
    if (!operation) return null;
    if (operation.hash !== commandHash) throw new Error(`idempotency conflict for operation ${operationKey}`);
    return this.batches.get(operation.batchId) ?? null;
  }

  create(batch: CreatorResearchBatch, operationKey: string, commandHash: string): CreatorResearchBatch {
    const prior = this.getByOperationKey(operationKey, commandHash);
    if (prior) return prior;
    this.batches.set(batch.id, batch);
    this.operations.set(operationKey, { hash: commandHash, batchId: batch.id });
    return batch;
  }

  get(batchId: string): CreatorResearchBatch | null { return this.batches.get(batchId) ?? null; }
  list(limit = 50): CreatorResearchBatch[] { return [...this.batches.values()].slice(0, limit); }
  close(): void {}
}

function createRun(id: string, profileUrl: string): CreatorResearchRun {
  const timestamp = "2026-08-31T00:00:00.000Z";
  return creatorResearchRunSchema.parse({
    schemaVersion: "1.3.0",
    id,
    platform: "xiaohongshu",
    profileUrl,
    status: "queued",
    currentStage: "preflight",
    createdAt: timestamp,
    updatedAt: timestamp,
    creatorId: null,
    creatorName: null,
    dashboardPath: null,
    stages: [],
    coverage: { discoveredPosts: 0, enrichedPosts: 0, comparisonPosts: 0, reconstructedPosts: 0 },
    collectionPolicy: {
      adapter: "redfox",
      browserProfile: null,
      readOnly: true,
      incremental: true,
      bypassChallenges: false,
      cacheTtlHours: 24,
      budgets: { maxScrollRounds: 10, maxDetailOpens: 24, maxMediaDownloads: 12 }
    },
    blockers: [],
    nextAction: "等待采集",
    lastSnapshotAt: null
  });
}

class MemoryRuns implements CreatorResearchRunIntake, CreatorResearchRunReader {
  readonly values = new Map<string, CreatorResearchRun>();
  calls = 0;

  create(profileUrl: string): CreatorResearchRun {
    this.calls += 1;
    const id = `00000000-0000-4000-8000-${String(this.calls).padStart(12, "0")}`;
    const run = createRun(id, profileUrl);
    this.values.set(id, run);
    return run;
  }

  get(runId: string): CreatorResearchRun | null { return this.values.get(runId) ?? null; }
}

function profile(index: number): string {
  return `https://www.xiaohongshu.com/user/profile/creator-${index}`;
}

describe("creator research batch contract", () => {
  it("accepts one to twenty unique creators and defaults to RedFox", () => {
    const parsed = createCreatorResearchBatchInputSchema.parse({
      operationKey: "batch:20",
      creators: Array.from({ length: 20 }, (_, index) => ({ profileUrl: profile(index + 1) }))
    });
    expect(parsed.creators).toHaveLength(20);
    expect(parsed.creators.every((creator) => creator.adapter === "redfox")).toBe(true);
  });

  it("rejects appending-shaped oversized or duplicate membership", () => {
    expect(() => createCreatorResearchBatchInputSchema.parse({
      operationKey: "batch:21",
      creators: Array.from({ length: 21 }, (_, index) => ({ profileUrl: profile(index + 1) }))
    })).toThrow();
    expect(() => createCreatorResearchBatchInputSchema.parse({
      operationKey: "batch:duplicate",
      creators: [{ profileUrl: profile(1) }, { profileUrl: profile(1) }]
    })).toThrow("同一批次不能重复添加同一个博主");
    expect(() => createCreatorResearchBatchInputSchema.parse({
      operationKey: "batch:duplicate-across-provider",
      creators: [
        { profileUrl: `${profile(1)}?xsec_token=temporary`, adapter: "redfox" },
        { profileUrl: `${profile(1)}/#fragment`, adapter: "ego-browser" }
      ]
    })).toThrow("同一批次不能重复添加同一个博主");
  });
});

describe("CreatorResearchBatchService", () => {
  it("creates fixed run references and is idempotent before run intake", () => {
    const repository = new MemoryBatchRepository();
    const runs = new MemoryRuns();
    const service = new CreatorResearchBatchService(repository, runs, runs);
    const input = {
      operationKey: "batch:create:one",
      name: "20 个 AI 博主",
      creators: [{ profileUrl: profile(1) }, { profileUrl: profile(2) }]
    };

    const first = service.create(input);
    const repeated = service.create(input);

    expect(repeated.batch.id).toBe(first.batch.id);
    expect(first.batch.runIds).toHaveLength(2);
    expect(runs.calls).toBe(2);
    expect(first.status).toBe("queued");
    expect(first.counts.queued).toBe(2);
  });

  it("rejects reuse of an operation key for another command", () => {
    const repository = new MemoryBatchRepository();
    const runs = new MemoryRuns();
    const service = new CreatorResearchBatchService(repository, runs, runs);
    service.create({ operationKey: "batch:conflict", creators: [{ profileUrl: profile(1) }] });

    expect(() => service.create({
      operationKey: "batch:conflict",
      creators: [{ profileUrl: profile(2) }]
    })).toThrow("idempotency conflict for operation batch:conflict");
    expect(runs.calls).toBe(1);
  });

  it("projects current run states without copying them into the batch", () => {
    const repository = new MemoryBatchRepository();
    const runs = new MemoryRuns();
    const service = new CreatorResearchBatchService(repository, runs, runs);
    const created = service.create({
      operationKey: "batch:live-projection",
      creators: [{ profileUrl: profile(1) }, { profileUrl: profile(2) }]
    });
    const firstId = created.batch.runIds[0]!;
    const secondId = created.batch.runIds[1]!;
    const first = runs.get(firstId)!;
    const second = runs.get(secondId)!;
    runs.values.set(firstId, creatorResearchRunSchema.parse({
      ...first,
      status: "ready",
      currentStage: "dashboard",
      creatorName: "博主一",
      synthesisArtifactRef: "/artifacts/creator-one/creator-analysis.json",
      coverage: { discoveredPosts: 100, enrichedPosts: 21, comparisonPosts: 21, reconstructedPosts: 12 },
      updatedAt: "2026-08-31T01:00:00.000Z"
    }));
    runs.values.set(secondId, creatorResearchRunSchema.parse({
      ...second,
      status: "failed",
      blockers: [{ code: "provider_unavailable", message: "暂不可用", userActionRequired: false }],
      updatedAt: "2026-08-31T00:30:00.000Z"
    }));

    const projected = service.get(created.batch.id)!;
    expect(Object.keys(projected.batch)).toEqual(["schemaVersion", "id", "name", "runIds", "createdAt"]);
    expect(projected.status).toBe("partial");
    expect(projected.completedRuns).toBe(2);
    expect(projected.successfulRuns).toBe(1);
    expect(projected.progressPercent).toBe(100);
    expect(projected.dossierReadyRuns).toBe(1);
    expect(projected.wikiReadyRuns).toBe(1);
    expect(projected.dossierProgressPercent).toBe(50);
    expect(projected.items[0]!).toMatchObject({ creatorName: "博主一", status: "ready", maturity: "wiki_ready" });
    expect(projected.items[1]!.maturity).toBe("incomplete");
    expect(projected.items[1]!.blockerCodes).toEqual(["provider_unavailable"]);
    expect(projected.updatedAt).toBe("2026-08-31T01:00:00.000Z");
  });

  it("does not count a terminal reviewable run without a synthesis artifact as a completed dossier", () => {
    const repository = new MemoryBatchRepository();
    const runs = new MemoryRuns();
    const service = new CreatorResearchBatchService(repository, runs, runs);
    const created = service.create({ operationKey: "batch:truth", creators: [{ profileUrl: profile(1) }] });
    const runId = created.batch.runIds[0]!;
    const run = runs.get(runId)!;
    runs.values.set(runId, creatorResearchRunSchema.parse({
      ...run,
      status: "reviewable",
      currentStage: "deep_capture",
      coverage: { discoveredPosts: 100, enrichedPosts: 21, comparisonPosts: 21, reconstructedPosts: 2 },
      blockers: [{ code: "video_reconstruction_incomplete", message: "2/12", userActionRequired: false }]
    }));

    const projected = service.get(created.batch.id)!;
    expect(projected.status).toBe("partial");
    expect(projected.completedRuns).toBe(1);
    expect(projected.successfulRuns).toBe(0);
    expect(projected.dossierReadyRuns).toBe(0);
    expect(projected.dossierProgressPercent).toBe(0);
    expect(projected.items[0]!.maturity).toBe("incomplete");
  });
});
