import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CreatorResearchService,
  type CreatorArtifactStore,
  type CreatorResearchRepository,
  type DeepMediaResolver,
  type ResearchJob,
  type VideoReconstructionExecutor,
  type CreatorSynthesisExecutor
} from "../../../../research/index.js";
import { SQLiteCreatorResearchRepository } from "./sqlite-creator-research-repository.js";

let directory: string;
let databaseFile: string;
let repository: SQLiteCreatorResearchRepository;
let service: CreatorResearchService;

function timestamp(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function enqueue(runId: string, nodeKey: ResearchJob["nodeKey"], suffix = randomUUID()): ResearchJob {
  const createdAt = timestamp();
  return repository.enqueue({
    id: randomUUID(), runId, nodeKey, status: "queued", idempotencyKey: `${runId}:${nodeKey}:${suffix}`,
    attempts: 0, maxAttempts: 3, availableAt: createdAt, leaseOwner: null, leaseExpiresAt: null,
    heartbeatAt: null, payload: {}, lastError: null, createdAt, updatedAt: createdAt
  });
}

function createRun(adapter: "redfox" | "ego-browser", slug: string = randomUUID()) {
  return service.create(`https://www.xiaohongshu.com/user/profile/${slug}`, adapter);
}

function completeAcquisition(runId: string, lane: "redfox" | "ego-browser"): void {
  const job = repository.claimNext("setup", timestamp(), timestamp(90_000), lane);
  expect(job?.runId).toBe(runId);
  repository.updateJobStatus({ jobId: job!.id, status: "succeeded", updatedAt: timestamp() });
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "creator-lanes-"));
  databaseFile = path.join(directory, "test.sqlite");
  repository = new SQLiteCreatorResearchRepository(databaseFile);
  service = new CreatorResearchService(
    repository as CreatorResearchRepository,
    {} as CreatorArtifactStore,
    {} as DeepMediaResolver,
    {} as VideoReconstructionExecutor,
    {} as CreatorSynthesisExecutor,
    3
  );
});

afterEach(() => {
  delete process.env.SELF_MEDIA_REDFOX_CONCURRENCY;
  delete process.env.SELF_MEDIA_VIDEO_CONCURRENCY;
  repository.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe("SQLiteCreatorResearchRepository Pipeline V2 claims", () => {
  it("routes acquisition and enrichment by provider, and compute jobs by node", () => {
    const redfox = createRun("redfox", "redfox-route");
    const ego = createRun("ego-browser", "ego-route");

    expect(repository.claimNext("redfox-1", timestamp(), timestamp(90_000), "redfox")?.runId).toBe(redfox.id);
    expect(repository.claimNext("redfox-2", timestamp(), timestamp(90_000), "redfox")).toBeNull();
    expect(repository.claimNext("ego-1", timestamp(), timestamp(90_000), "ego-browser")?.runId).toBe(ego.id);

    const portfolio = enqueue(redfox.id, "creator.portfolio");
    expect(repository.claimNext("portfolio-1", timestamp(), timestamp(90_000), "portfolio")).toBeNull();
    repository.updateJobStatus({ jobId: redfox.worker.jobId!, status: "succeeded", updatedAt: timestamp() });
    expect(repository.claimNext("portfolio-1", timestamp(), timestamp(90_000), "portfolio")?.id).toBe(portfolio.id);
  });

  it("allows only one active non-video job for the same run", () => {
    const run = createRun("redfox", "nonvideo-mutex");
    enqueue(run.id, "creator.portfolio");

    expect(repository.claimNext("redfox", timestamp(), timestamp(90_000), "redfox")?.nodeKey).toBe("creator.acquire");
    expect(repository.claimNext("portfolio", timestamp(), timestamp(90_000), "portfolio")).toBeNull();
  });

  it("prevents video and synthesis from overlapping in either claim order", () => {
    const videoFirst = createRun("redfox", "video-first");
    completeAcquisition(videoFirst.id, "redfox");
    enqueue(videoFirst.id, "video.reconstruct");
    enqueue(videoFirst.id, "creator.synthesize");
    expect(repository.claimNext("video", timestamp(), timestamp(90_000), "video")?.runId).toBe(videoFirst.id);
    expect(repository.claimNext("synthesis", timestamp(), timestamp(90_000), "synthesis")).toBeNull();

    const synthesisFirst = createRun("redfox", "synthesis-first");
    completeAcquisition(synthesisFirst.id, "redfox");
    enqueue(synthesisFirst.id, "creator.synthesize");
    enqueue(synthesisFirst.id, "video.reconstruct");
    expect(repository.claimNext("synthesis", timestamp(), timestamp(90_000), "synthesis")?.runId).toBe(synthesisFirst.id);
    expect(repository.claimNext("video", timestamp(), timestamp(90_000), "video")).toBeNull();
  });

  it("does not start video beside active acquisition, or non-video beside active video", () => {
    const acquisitionFirst = createRun("redfox", "acquisition-first");
    enqueue(acquisitionFirst.id, "video.reconstruct");
    expect(repository.claimNext("redfox", timestamp(), timestamp(90_000), "redfox")?.runId).toBe(acquisitionFirst.id);
    expect(repository.claimNext("video", timestamp(), timestamp(90_000), "video")).toBeNull();

    const videoFirst = createRun("redfox", "video-before-portfolio");
    completeAcquisition(videoFirst.id, "redfox");
    enqueue(videoFirst.id, "video.reconstruct");
    enqueue(videoFirst.id, "creator.portfolio");
    expect(repository.claimNext("video", timestamp(), timestamp(90_000), "video")?.runId).toBe(videoFirst.id);
    expect(repository.claimNext("portfolio", timestamp(), timestamp(90_000), "portfolio")).toBeNull();
  });

  it("does not claim stale queued work from a completed run", () => {
    const run = createRun("redfox", "already-ready");
    run.status = "ready";
    repository.save(run);
    expect(repository.claimNext("redfox", timestamp(), timestamp(90_000), "redfox")).toBeNull();
  });

  it("finds the latest run for the exact profile and acquisition adapter", () => {
    const profileUrl = "https://www.xiaohongshu.com/user/profile/same-profile";
    const redfox = service.create(profileUrl, "redfox");
    const ego = service.create(profileUrl, "ego-browser");
    expect(repository.findLatestByProfileUrlAndAdapter(profileUrl, "redfox")?.id).toBe(redfox.id);
    expect(repository.findLatestByProfileUrlAndAdapter(profileUrl, "ego-browser")?.id).toBe(ego.id);
  });

  it("enforces the configured global video lease limit transactionally", () => {
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "1";
    const first = createRun("redfox", "video-limit-one");
    completeAcquisition(first.id, "redfox");
    const second = createRun("redfox", "video-limit-two");
    completeAcquisition(second.id, "redfox");
    enqueue(first.id, "video.reconstruct");
    enqueue(second.id, "video.reconstruct");

    expect(repository.claimNext("video-1", timestamp(), timestamp(90_000), "video")?.nodeKey).toBe("video.reconstruct");
    expect(repository.claimNext("video-2", timestamp(), timestamp(90_000), "video")).toBeNull();
  });

  it("resumes expired video leases before starting untouched queued videos", () => {
    const staleRun = createRun("redfox", "expired-video");
    completeAcquisition(staleRun.id, "redfox");
    const stale = enqueue(staleRun.id, "video.reconstruct");
    const leasedAt = timestamp();
    expect(repository.claimNext("old-video-worker", leasedAt, timestamp(1_000), "video")?.id).toBe(stale.id);
    repository.updateJobStatus({ jobId: stale.id, status: "running", updatedAt: leasedAt });

    const queuedRun = createRun("redfox", "untouched-video");
    completeAcquisition(queuedRun.id, "redfox");
    const oldAvailableAt = new Date(Date.now() - 86_400_000).toISOString();
    repository.enqueue({
      id: randomUUID(), runId: queuedRun.id, nodeKey: "video.reconstruct", status: "queued",
      idempotencyKey: `${queuedRun.id}:video.reconstruct:older-queue`, attempts: 0, maxAttempts: 3,
      availableAt: oldAvailableAt, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
      payload: {}, lastError: null, createdAt: timestamp(), updatedAt: timestamp()
    });

    const recovered = repository.claimNext("new-video-worker", timestamp(2_000), timestamp(92_000), "video");
    expect(recovered?.id).toBe(stale.id);
    expect(recovered?.attempts).toBe(2);
  });

  it("normalizes every expired lease before filling the available worker slots", () => {
    const runs = [createRun("redfox", "expired-many-1"), createRun("redfox", "expired-many-2")];
    for (const run of runs) completeAcquisition(run.id, "redfox");
    const jobs = runs.map((run) => enqueue(run.id, "video.reconstruct"));
    const leasedAt = timestamp();
    for (let index = 0; index < jobs.length; index += 1) {
      const claimed = repository.claimNext(`old-video-${index}`, leasedAt, timestamp(1_000), "video");
      expect(claimed?.id).toBe(jobs[index]?.id);
      repository.updateJobStatus({ jobId: claimed!.id, status: "running", updatedAt: leasedAt });
    }

    const recovered = repository.claimNext("new-video", timestamp(2_000), timestamp(92_000), "video");
    expect(jobs.map((job) => job.id)).toContain(recovered?.id);
    const waitingId = jobs.find((job) => job.id !== recovered?.id)!.id;
    const inspection = new DatabaseSync(databaseFile, { readOnly: true });
    const waiting = inspection.prepare(`
      SELECT status, lease_owner, lease_expires_at, heartbeat_at, last_error
      FROM research_jobs WHERE id = ?
    `).get(waitingId) as Record<string, unknown>;
    inspection.close();
    expect(waiting).toMatchObject({
      status: "backoff", lease_owner: null, lease_expires_at: null,
      heartbeat_at: null, last_error: "lease_expired"
    });
  });

  it("advances a twenty-creator RedFox queue four at a time without head-of-line blocking", () => {
    process.env.SELF_MEDIA_REDFOX_CONCURRENCY = "4";
    const runs = Array.from({ length: 20 }, (_, index) => createRun("redfox", `batch-20-${index + 1}`));
    const claimed = Array.from({ length: 4 }, (_, index) =>
      repository.claimNext(`redfox-${index + 1}`, timestamp(), timestamp(90_000), "redfox"));

    expect(claimed.every(Boolean)).toBe(true);
    expect(new Set(claimed.map((job) => job?.runId)).size).toBe(4);
    expect(repository.claimNext("redfox-over-limit", timestamp(), timestamp(90_000), "redfox")).toBeNull();

    const failedJob = claimed[0]!;
    const failedRun = runs.find((run) => run.id === failedJob.runId)!;
    failedRun.status = "failed";
    repository.save(failedRun);
    repository.updateJobStatus({ jobId: failedJob.id, status: "failed", updatedAt: timestamp(), lastError: "fixture failure" });

    const replacement = repository.claimNext("redfox-replacement", timestamp(), timestamp(90_000), "redfox");
    expect(replacement).not.toBeNull();
    expect(replacement?.runId).not.toBe(failedRun.id);
  });
});
