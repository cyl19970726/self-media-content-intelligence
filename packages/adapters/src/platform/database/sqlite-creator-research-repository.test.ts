import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CreatorResearchService,
  type CreatorBrowserExecutor,
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

function enqueue(runId: string, nodeKey: ResearchJob["nodeKey"], suffix: string = randomUUID()): ResearchJob {
  const createdAt = timestamp();
  return repository.enqueue({
    id: randomUUID(), runId, nodeKey, status: "queued", idempotencyKey: `${runId}:${nodeKey}:${suffix}`,
    attempts: 0, maxAttempts: 3, availableAt: createdAt, leaseOwner: null, leaseExpiresAt: null,
    heartbeatAt: null, payload: {}, lastError: null, createdAt, updatedAt: createdAt
  });
}

function enqueueWorkflow(runId: string, workflowId: string,
  suffix: string = randomUUID(), workflowRevision: string | null = "v2"): ResearchJob {
  const createdAt = timestamp();
  return repository.enqueue({ id: randomUUID(), runId, nodeKey: "workflow.advance", status: "queued",
    idempotencyKey: `${runId}:workflow.advance:${suffix}`, attempts: 0, maxAttempts: 2,
    availableAt: createdAt, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
    payload: { workflowRunId: randomUUID(), workflowId, ...(workflowRevision ? { workflowRevision } : {}), generation: 1 }, lastError: null,
    createdAt, updatedAt: createdAt });
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
  it("constrains an optional run scope before selecting work in any lane", () => {
    const unrelated = createRun("redfox", "run-scope-unrelated");
    const target = createRun("redfox", "run-scope-target");

    expect(repository.claimNext("scoped-redfox", timestamp(), timestamp(90_000), "redfox", target.id)?.runId)
      .toBe(target.id);
    expect(repository.claimNext("scoped-any", timestamp(), timestamp(90_000), "any", target.id)).toBeNull();
    expect(repository.claimNext("unscoped", timestamp(), timestamp(90_000), "redfox")?.runId).toBe(unrelated.id);
  });

  it("forwards a run scope through the service and job processor", async () => {
    const unrelated = createRun("redfox", "service-scope-unrelated");
    const target = createRun("redfox", "service-scope-target");
    const acquiredRunIds: string[] = [];
    const executor = {
      async acquire(input) {
        acquiredRunIds.push(input.runId);
        return { state: "blocked" as const, finalUrl: input.profileUrl, taskSpaceId: null,
          code: "provider_unavailable" as const, message: "stop after scoped claim", retryable: false };
      },
      async enrich() { throw new Error("unexpected enrich"); }
    } satisfies CreatorBrowserExecutor;

    expect(await service.processNext("scoped-service", executor, "redfox", target.id)).toBe(true);
    expect(acquiredRunIds).toEqual([target.id]);
    expect(repository.claimNext("unscoped-after-service", timestamp(), timestamp(90_000), "redfox")?.runId)
      .toBe(unrelated.id);
  });

  it("leaves an unrelated exhausted lease untouched during a scoped claim", () => {
    const unrelated = createRun("redfox", "scope-exhausted-unrelated");
    const target = createRun("redfox", "scope-exhausted-target");
    const database = new DatabaseSync(databaseFile);
    database.prepare("UPDATE research_jobs SET max_attempts = 1 WHERE id = ?")
      .run(unrelated.worker.jobId!);
    const leasedAt = timestamp();
    const expiresAt = new Date(Date.parse(leasedAt) + 1).toISOString();
    const afterExpiry = new Date(Date.parse(leasedAt) + 2).toISOString();
    const unrelatedJob = repository.claimNext("unrelated-worker", leasedAt, expiresAt, "redfox", unrelated.id);
    expect(unrelatedJob?.runId).toBe(unrelated.id);

    expect(repository.claimNext("target-worker", afterExpiry, timestamp(90_000), "redfox", target.id)?.runId)
      .toBe(target.id);
    expect(database.prepare("SELECT status FROM research_jobs WHERE id = ?").get(unrelatedJob!.id))
      .toEqual({ status: "leased" });
    expect(repository.get(unrelated.id)?.status).toBe("queued");
    database.close();
  });

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

  it("claims two v2 post worker workflows concurrently and caps the third", () => {
    const run = createRun("redfox", "post-workflow-concurrency");
    completeAcquisition(run.id, "redfox");
    enqueueWorkflow(run.id, "post.build", "post-1");
    enqueueWorkflow(run.id, "post.review", "post-2");
    enqueueWorkflow(run.id, "post.repair-evaluation", "post-3");
    const first = repository.claimNext("post-1", timestamp(), timestamp(90_000), "video");
    const second = repository.claimNext("post-2", timestamp(), timestamp(90_000), "video");
    expect([first?.payload.workflowId, second?.payload.workflowId]).toEqual(["post.review", "post.repair-evaluation"]);
    expect(repository.claimNext("post-3", timestamp(), timestamp(90_000), "video")).toBeNull();
  });

  it("a waiting parent releases its queue job before child work is claimed", () => {
    const run = createRun("redfox", "waiting-parent-release");
    completeAcquisition(run.id, "redfox");
    const parent = enqueueWorkflow(run.id, "creator.analyze", "parent");
    expect(repository.claimNext("parent", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(parent.id);
    repository.updateJobStatus({ jobId: parent.id, status: "succeeded", updatedAt: timestamp() });
    const child = enqueueWorkflow(run.id, "post.build", "child");
    expect(repository.claimNext("child", timestamp(), timestamp(90_000), "video")?.id).toBe(child.id);
  });

  it("claims orchestration advances beside active post model work without consuming a model slot", () => {
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "1";
    const run = createRun("redfox", "control-beside-model");
    completeAcquisition(run.id, "redfox");
    const model = enqueueWorkflow(run.id, "post.build", "model");
    expect(repository.claimNext("post-model", timestamp(), timestamp(90_000), "video")?.id).toBe(model.id);

    const creatorControl = enqueueWorkflow(run.id, "creator.analyze", "creator-control");
    expect(repository.claimNext("creator-control", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(creatorControl.id);

    const postControl = enqueueWorkflow(run.id, "post.analyze", "post-control", "v2");
    expect(repository.claimNext("post-control", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(postControl.id);
    expect(repository.claimNext("another-model", timestamp(), timestamp(90_000), "video")).toBeNull();
  });

  it("treats v3 post and creator suite roots as slot-free orchestration advances", () => {
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "1";
    const run = createRun("redfox", "v3-control-beside-model");
    completeAcquisition(run.id, "redfox");
    const model = enqueueWorkflow(run.id, "post.build", "model");
    expect(repository.claimNext("post-model", timestamp(), timestamp(90_000), "video")?.id).toBe(model.id);

    for (const workflowId of ["post.analyze", "creator.synthesize", "creator.analyze"]) {
      const control = enqueueWorkflow(run.id, workflowId, `v3-${workflowId}`, "v3");
      expect(repository.claimNext(`v3-${workflowId}`, timestamp(), timestamp(90_000), "synthesis")?.id)
        .toBe(control.id);
    }
    expect(repository.claimNext("another-model", timestamp(), timestamp(90_000), "video")).toBeNull();
  });

  it.each(["v4", "v5"])("routes %s orchestration to control and source checking to the video model slot", (revision) => {
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "1";
    const run = createRun("redfox", "v4-source-check-lanes");
    completeAcquisition(run.id, "redfox");
    const control = enqueueWorkflow(run.id, "post.analyze", "v4-control", revision);
    expect(repository.claimNext("v4-control", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(control.id);
    const sourceCheck = enqueueWorkflow(run.id, "post.source-check", "source-check", "v1");
    expect(repository.claimNext("source-check", timestamp(), timestamp(90_000), "video")?.id).toBe(sourceCheck.id);
    const build = enqueueWorkflow(run.id, "post.build", "blocked-by-source-check", "v1");
    expect(repository.claimNext("second-video", timestamp(), timestamp(90_000), "video")).toBeNull();
    repository.updateJobStatus({ jobId: sourceCheck.id, status: "succeeded", updatedAt: timestamp() });
    expect(repository.claimNext("second-video", timestamp(), timestamp(90_000), "video")?.id).toBe(build.id);
  });

  it.each([
    ["post.analyze", "v7"],
    ["post.analyze", "v8"],
    ["post.analyze", "v9"],
    ["creator.synthesize", "v6"],
    ["creator.synthesize", "v7"],
  ])("claims current %s@%s control while two post models remain active", (workflowId, revision) => {
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "2";
    const run = createRun("redfox", `current-control-${workflowId}-${revision}`);
    completeAcquisition(run.id, "redfox");
    const first = enqueueWorkflow(run.id, "post.build", "model-1", "v1");
    const second = enqueueWorkflow(run.id, "post.build", "model-2", "v1");
    expect(repository.claimNext("model-1", timestamp(), timestamp(90_000), "video")?.id).toBe(first.id);
    expect(repository.claimNext("model-2", timestamp(), timestamp(90_000), "video")?.id).toBe(second.id);
    expect(repository.claimNext("model-limit", timestamp(), timestamp(90_000), "video")).toBeNull();

    const control = enqueueWorkflow(run.id, workflowId, "current-control", revision);
    expect(repository.claimNext("current-control", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(control.id);
  });

  it("reviews an existing candidate before an older queued build without widening model concurrency", () => {
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "2";
    const run = createRun("redfox", "review-before-build");
    completeAcquisition(run.id, "redfox");
    const olderBuild = enqueueWorkflow(run.id, "post.build", "older-build", "v1");
    const newerReview = enqueueWorkflow(run.id, "post.review", "newer-review", "v1");
    const secondBuild = enqueueWorkflow(run.id, "post.build", "second-build", "v1");

    expect(repository.claimNext("review-first", timestamp(), timestamp(90_000), "video")?.id).toBe(newerReview.id);
    expect(repository.claimNext("build-second", timestamp(), timestamp(90_000), "video")?.id).toBe(olderBuild.id);
    expect(repository.claimNext("model-limit", timestamp(), timestamp(90_000), "video")).toBeNull();
    expect(secondBuild.status).toBe("queued");
  });

  it("claims a newer workflow control before an older synthesis model job", () => {
    const run = createRun("redfox", "control-priority");
    completeAcquisition(run.id, "redfox");
    const olderModel = enqueueWorkflow(run.id, "creator.build", "older-model", "v1");
    const newerControl = enqueueWorkflow(run.id, "creator.synthesize", "newer-control", "v6");

    expect(repository.claimNext("control-first", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(newerControl.id);
    repository.updateJobStatus({ jobId: newerControl.id, status: "succeeded", updatedAt: timestamp() });
    expect(repository.claimNext("model-second", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(olderModel.id);
  });

  it("does not claim future work early and keeps ordinary queued jobs in availability order", () => {
    const run = createRun("redfox", "stable-ordinary-order");
    completeAcquisition(run.id, "redfox");
    const first = enqueue(run.id, "creator.portfolio", "ordinary-first");
    const createdAt = timestamp();
    const future = repository.enqueue({ id: randomUUID(), runId: run.id, nodeKey: "creator.portfolio", status: "queued",
      idempotencyKey: `${run.id}:future`, attempts: 0, maxAttempts: 3, availableAt: timestamp(60_000),
      leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null, payload: {}, lastError: null, createdAt, updatedAt: createdAt });

    expect(repository.claimNext("ordinary", timestamp(), timestamp(90_000), "portfolio")?.id).toBe(first.id);
    repository.updateJobStatus({ jobId: first.id, status: "succeeded", updatedAt: timestamp() });
    expect(repository.claimNext("future-too-early", timestamp(), timestamp(90_000), "portfolio")).toBeNull();
    expect(future.status).toBe("queued");
  });

  it("does not let control advances consume or block the synthesis model slot", () => {
    const run = createRun("redfox", "control-before-synthesis-model");
    completeAcquisition(run.id, "redfox");
    const control = enqueueWorkflow(run.id, "creator.synthesize", "suite-control", "v2");
    expect(repository.claimNext("suite-control", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(control.id);
    const model = enqueueWorkflow(run.id, "creator.build", "creator-model");
    expect(repository.claimNext("creator-model", timestamp(), timestamp(90_000), "synthesis")?.id).toBe(model.id);
  });

  it("routes every v2 workflow node to its executable lane", () => {
    const synthesisIds = ["post.analyze", "creator.analyze", "creator.synthesize", "creator.build", "creator.review", "creator.repair"];
    for (const workflowId of synthesisIds) {
      const run = createRun("redfox", `synthesis-${workflowId}`);
      completeAcquisition(run.id, "redfox");
      const job = enqueueWorkflow(run.id, workflowId);
      const claimed = repository.claimNext(`worker-${workflowId}`, timestamp(), timestamp(90_000), "synthesis");
      expect(claimed?.id, workflowId).toBe(job.id);
      repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: timestamp() });
    }
    const videoIds = ["post.source-check", "post.build", "post.review", "post.repair", "post.repair-evaluation"];
    for (const workflowId of videoIds) {
      const run = createRun("redfox", `video-${workflowId}`);
      completeAcquisition(run.id, "redfox");
      const job = enqueueWorkflow(run.id, workflowId);
      const claimed = repository.claimNext(`worker-${workflowId}`, timestamp(), timestamp(90_000), "video");
      expect(claimed?.id, workflowId).toBe(job.id);
      repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: timestamp() });
    }
  });

  it("keeps v1 and revisionless post orchestrators on the video lane", () => {
    for (const revision of ["v1", undefined]) {
      const run = createRun("redfox", `legacy-post-${revision ?? "missing"}`);
      completeAcquisition(run.id, "redfox");
      const job = enqueueWorkflow(run.id, "post.analyze", revision ?? "missing", revision ?? null);
      expect(repository.claimNext("synthesis", timestamp(), timestamp(90_000), "synthesis")).toBeNull();
      expect(repository.claimNext("video", timestamp(), timestamp(90_000), "video")?.id).toBe(job.id);
      repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: timestamp() });
    }
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

  it("stops reclaiming an expired job at its retry limit, records an actionable run failure, and keeps the lane moving", () => {
    const exhaustedRun = createRun("redfox", "retry-limit-exhausted");
    const first = repository.claimNext("expired-worker-1", timestamp(), timestamp(1_000), "redfox");
    expect(first?.runId).toBe(exhaustedRun.id);
    const second = repository.claimNext("expired-worker-2", timestamp(2_000), timestamp(3_000), "redfox");
    expect(second?.id).toBe(first?.id);
    const third = repository.claimNext("expired-worker-3", timestamp(4_000), timestamp(5_000), "redfox");
    expect(third?.id).toBe(first?.id);
    expect(third?.attempts).toBe(third?.maxAttempts);

    const unaffectedRun = createRun("redfox", "retry-limit-unaffected");
    const replacement = repository.claimNext("replacement-worker", timestamp(6_000), timestamp(96_000), "redfox");
    expect(replacement?.runId).toBe(unaffectedRun.id);

    const exhausted = repository.get(exhaustedRun.id)!;
    expect(exhausted.status).toBe("failed");
    expect(exhausted.blockers).toMatchObject([{ code: "retry_limit_exhausted", userActionRequired: false }]);
    expect(exhausted.nextAction).toContain("Dashboard");
    expect(repository.listEvents(exhaustedRun.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "run.failed", payload: expect.objectContaining({
        code: "retry_limit_exhausted", attempts: 3, maxAttempts: 3
      }) })
    ]));

    repository.updateJobStatus({ jobId: replacement!.id, status: "succeeded", updatedAt: timestamp(6_100) });
    const resumed = service.resume(exhaustedRun.id);
    expect(resumed.status).toBe("queued");
    expect(repository.claimNext("manual-retry", timestamp(7_000), timestamp(97_000), "redfox")?.id).toBe(first?.id);
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

  it("does not close a caller-owned SQLite connection", () => {
    const externalFile = path.join(directory, "external.sqlite");
    const external = new DatabaseSync(externalFile);
    const externalRepository = new SQLiteCreatorResearchRepository(external);
    externalRepository.close();
    expect(() => external.prepare("SELECT 1").get()).not.toThrow();
    external.close();
  });
});
