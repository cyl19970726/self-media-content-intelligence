import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CreatorResearchService } from "./creator-research-service.js";
import { CreatorResearchStore } from "./creator-research-store.js";
import type { CreatorBrowserExecutor } from "../modules/orchestration/contracts.js";
import type { CreatorArtifactStore } from "../modules/creator-research/artifact-store.js";
import type { DeepMediaResolver } from "../modules/media-resolution/contracts.js";
import type { VideoReconstructionExecutor } from "../modules/video-analysis/contracts.js";
import type { CreatorSynthesisExecutor } from "../modules/creator-synthesis/contracts.js";

const temporaryDirectories: string[] = [];

function serviceForTest(options: { values?: Map<string, unknown>; reconstruct?: VideoReconstructionExecutor["reconstruct"] } = {}): CreatorResearchService {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "creator-research-"));
  temporaryDirectories.push(directory);
  const values = options.values ?? new Map<string, unknown>();
  const artifacts: CreatorArtifactStore = {
    write(runId, filename, value) {
      const reference = `/artifacts/${runId}/${filename}`;
      values.set(reference, structuredClone(value));
      return reference;
    },
    read(reference) {
      const value = values.get(reference);
      if (value === undefined) throw new Error(`missing artifact ${reference}`);
      return structuredClone(value);
    }
  };
  const mediaResolver: DeepMediaResolver = {
    async resolve(input) {
      return {
        schemaVersion: "1.0.0", runId: input.runId, generatedAt: "2026-08-20T01:01:00.000Z",
        requestedPosts: input.posts.filter((post) => post.downloadVideo).length,
        readyPosts: input.posts.filter((post) => post.downloadVideo && post.videoCandidateUrl).length,
        requestedCovers: input.posts.length, readyCovers: input.posts.filter((post) => post.coverCandidateUrl).length,
        items: input.posts.map((post) => ({ externalId: post.externalId,
          videoRequested: post.downloadVideo,
          state: !post.downloadVideo ? "not_requested" as const : post.videoCandidateUrl ? "verified_complete" as const : "missing" as const,
          coverState: post.coverCandidateUrl ? "ready" as const : "missing" as const,
          coverMessage: post.coverCandidateUrl ? "ok" : "missing",
          videoArtifactRef: post.downloadVideo && post.videoCandidateUrl ? `/artifacts/${input.runId}/deep-media/${post.externalId}/source-video.mp4` : null,
          coverArtifactRef: post.coverCandidateUrl ? `/artifacts/${input.runId}/deep-media/${post.externalId}/cover.webp` : null,
          sha256: post.downloadVideo && post.videoCandidateUrl ? "a".repeat(64) : null,
          bytes: post.downloadVideo && post.videoCandidateUrl ? 100 : null, durationSeconds: post.downloadVideo && post.videoCandidateUrl ? 5 : null,
          width: post.downloadVideo && post.videoCandidateUrl ? 1080 : null, height: post.downloadVideo && post.videoCandidateUrl ? 1920 : null,
          hasAudio: post.downloadVideo && post.videoCandidateUrl ? true : null, message: post.videoCandidateUrl ? "ok" : "missing" })),
        unknowns: []
      };
    }
  };
  const videoReconstructor: VideoReconstructionExecutor = {
    async reconstruct(request, observeLifecycle) {
      if (options.reconstruct) return options.reconstruct(request, observeLifecycle);
      const root = `/artifacts/${request.creatorRunId}/video-reconstructions/${request.postExternalId}`;
      const childRunId = "11111111-1111-4111-8111-111111111111";
      const startedAt = "2026-08-20T01:02:00.000Z";
      observeLifecycle?.({ childRunId, role: "candidate", status: "started", startedAt,
        lastProgressAt: startedAt, inputRevision: request.sourceMediaArtifactRef,
        outputArtifactRevisions: {}, errorCode: null });
      const outcome = { state: "ready" as const, reconstructionArtifactRef: `${root}/reconstruction.json`, articleArtifactRef: `${root}/article.md`,
        evaluationArtifactRef: `${root}/evaluation.json`, gateReportArtifactRef: `${root}/gate-report.json`, gateCount: 22,
        threeLensEvaluationArtifactRef: `${root}/runtime-three-lens-evaluation.json`,
        threeLensGateReportArtifactRef: `${root}/runtime-three-lens-gate-report.json`, threeLensGateCount: 19 as const, failedGateIds: [],
        qualityWarningGateIds: [], evaluationMode: "single_pass" as const };
      observeLifecycle?.({ childRunId, role: "candidate", status: "completed", startedAt,
        lastProgressAt: "2026-08-20T01:02:01.000Z", inputRevision: request.sourceMediaArtifactRef,
        outputArtifactRevisions: { "reconstruction.json": "b".repeat(64) }, errorCode: null });
      return outcome;
    }
  };
  const synthesisExecutor: CreatorSynthesisExecutor = {
    async synthesize(request, observeLifecycle) {
      const startedAt = "2026-08-20T01:03:00.000Z";
      observeLifecycle?.({ childRunId: "33333333-3333-4333-8333-333333333333", role: "creator_synthesis",
        status: "started", startedAt, lastProgressAt: startedAt, inputRevision: "c".repeat(64),
        outputArtifactRevisions: {}, errorCode: null });
      observeLifecycle?.({ childRunId: "33333333-3333-4333-8333-333333333333", role: "creator_synthesis",
        status: "completed", startedAt, lastProgressAt: "2026-08-20T01:03:01.000Z", inputRevision: "c".repeat(64),
        outputArtifactRevisions: { "creator-analysis.json": "d".repeat(64) }, errorCode: null });
      observeLifecycle?.({ childRunId: "44444444-4444-4444-8444-444444444444", role: "creator_synthesis_evaluator",
        status: "started", startedAt: "2026-08-20T01:03:02.000Z", lastProgressAt: "2026-08-20T01:03:02.000Z",
        inputRevision: "d".repeat(64), outputArtifactRevisions: {}, errorCode: null });
      observeLifecycle?.({ childRunId: "44444444-4444-4444-8444-444444444444", role: "creator_synthesis_evaluator",
        status: "completed", startedAt: "2026-08-20T01:03:02.000Z", lastProgressAt: "2026-08-20T01:03:03.000Z",
        inputRevision: "d".repeat(64), outputArtifactRevisions: { "creator-synthesis-evaluation.json": "e".repeat(64) }, errorCode: null });
      return { state: "ready", synthesisArtifactRef: `/artifacts/${request.creatorRunId}/creator-synthesis/creator-analysis.json`,
        gateArtifactRef: `/artifacts/${request.creatorRunId}/creator-synthesis-gate.json` };
    }
  };
  return new CreatorResearchService(
    new CreatorResearchStore(path.join(directory, "test.sqlite")),
    artifacts,
    mediaResolver,
    videoReconstructor,
    synthesisExecutor
  );
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("CreatorResearchService", () => {
  it("creates and persists a transparent queued run", () => {
    const service = serviceForTest();
    const run = service.create("https://www.xiaohongshu.com/user/profile/creator-123");

    expect(run.status).toBe("queued");
    expect(run.currentStage).toBe("preflight");
    expect(run.collectionPolicy.browserProfile).toBe("hhh-01");
    expect(run.collectionPolicy.bypassChallenges).toBe(false);
    expect(run.worker.state).toBe("queued");
    expect(run.blockers).toEqual([]);
    expect(service.get(run.id)).toEqual(run);
    expect(service.list()).toEqual([run]);
    expect(service.events(run.id).map((event) => event.type)).toEqual(["run.created", "job.queued"]);
    service.close();
  });

  it("accepts a Xiaohongshu profile share link", () => {
    const service = serviceForTest();
    expect(service.create("https://xhslink.cn/m/example").platform).toBe("xiaohongshu");
    service.close();
  });

  it("imports a frozen public snapshot into the durable queue without reacquiring inventory", () => {
    const values = new Map<string, unknown>();
    const service = serviceForTest({ values });
    const run = service.importSnapshot({
      profileUrl: "https://www.xiaohongshu.com/user/profile/cyber-duck",
      creatorId: "cyber-duck", creatorName: "赛博鸭AIGC", canonicalSlug: "cyber-duck-aigc",
      capturedAt: "2026-08-21T06:07:54.517Z",
      taskSpaceId: 4, stopReason: "quiescent_incomplete",
      posts: [{ externalId: "post-1", url: "https://www.xiaohongshu.com/explore/post-1", title: "示例",
        visibleText: "示例", mediaType: "unknown", likesLabel: "5", likes: 5 }],
      warnings: ["displayed_count_gap:15"],
      sourceRefs: ["legacy:next-wave/cyber-duck/creator-corpus.json#sha256=abc"],
      publicProfile: { bio: "AI极客", followers: 92_000, likesAndCollections: 1_579_000, displayedPostCount: 334,
        identityAnchors: [{ kind: "stable_id", value: "cyber-duck", source: "profile" },
          { kind: "display_name", value: "赛博鸭AIGC", source: "profile" }] }
    });

    expect(run.source.kind).toBe("legacy_import");
    expect(run.canonicalSlug).toBe("cyber-duck-aigc");
    expect(run.inventoryArtifactRef).toMatch(/creator-inventory\.json$/);
    expect(run.currentStage).toBe("tiering");
    expect(run.coverage.discoveredPosts).toBe(1);
    expect(run.browserTaskSpaceId).toBe(4);
    expect(service.events(run.id).map((event) => event.type)).toEqual(["run.created", "artifact.produced", "job.queued"]);
    expect(JSON.stringify(values.get(run.inventoryArtifactRef!))).toContain("displayed_count_gap:15");
    service.close();
  });

  it("rejects search pages and unsupported hosts", () => {
    const service = serviceForTest();
    expect(() => service.create("https://www.xiaohongshu.com/search_result?keyword=ai")).toThrow(/博主主页/);
    expect(() => service.create("https://example.com/user/profile/creator-123")).toThrow(/博主主页/);
    service.close();
  });

  it("leases a queued job and persists a reviewable inventory result", async () => {
    const values = new Map<string, unknown>();
    const service = serviceForTest({ values });
    const run = service.create("https://www.xiaohongshu.com/user/profile/creator-ready");
    const executor: CreatorBrowserExecutor = {
      async acquire() {
        return {
          state: "ready",
          finalUrl: "https://www.xiaohongshu.com/user/profile/creator-ready",
          creatorId: "creator-ready",
          creatorName: "测试博主",
          taskSpaceId: 18,
          stopReason: "quiescent_incomplete",
          diagnostics: [{ round: 1, globalCountBefore: 0, globalCountAfter: 1, newGlobalIds: ["post-1"],
            heightBefore: 0, heightAfter: 1000, heightDelta: 1000, scrollTopBefore: 0, scrollTopAfter: 0,
            scrollDelta: 0, atBottom: true, waitElapsedMs: 0, waitReason: "new_global_ids", action: "advance" as const }],
          posts: [{
            externalId: "post-1",
            url: "https://www.xiaohongshu.com/explore/post-1",
            title: "第一条内容",
            visibleText: "第一条内容\n123",
            mediaType: "video",
            likesLabel: "123",
            likes: 123
          }],
          warnings: []
        };
      },
      async enrich(input) {
        return {
          state: "ready",
          taskSpaceId: 19,
          posts: input.posts.map((post) => ({
            externalId: post.externalId,
            finalUrl: post.url,
            title: "第一条内容",
            description: "正文",
            publishedLabel: "2026-08-20",
            mediaType: "video" as const,
            videoCandidateUrl: "https://sns-video.example.xhscdn.com/example.mp4?sign=private",
            coverCandidateUrl: "https://sns-webpic.example.xhscdn.com/example.webp?sign=private",
            inspectedAt: "2026-08-20T01:00:00.000Z",
            warnings: []
          })),
          warnings: []
        };
      }
    };

    expect(await service.processNext("test-worker", executor)).toBe(true);
    const updated = service.get(run.id);
    expect(updated?.status).toBe("collecting");
    expect(updated?.creatorName).toBe("测试博主");
    expect(updated?.coverage.discoveredPosts).toBe(1);
    expect(updated?.inventoryArtifactRef).toMatch(/creator-inventory\.json$/);
    expect((values.get(updated!.inventoryArtifactRef!) as { crawlDiagnostics?: unknown[] }).crawlDiagnostics).toHaveLength(1);
    expect(updated?.stages.find((entry) => entry.id === "inventory")?.status).toBe("complete");
    expect(service.events(run.id).at(-1)?.type).toBe("job.queued");

    expect(await service.processNext("test-worker", executor)).toBe(true);
    const portfolio = service.get(run.id);
    expect(portfolio?.status).toBe("collecting");
    expect(portfolio?.portfolioArtifactRef).toMatch(/corpus-analysis\.json$/);
    expect(portfolio?.selectionArtifactRef).toMatch(/creator-selection\.json$/);
    expect(portfolio?.coverage.comparisonPosts).toBe(1);
    expect(portfolio?.stages.find((entry) => entry.id === "tiering")?.status).toBe("complete");
    expect(service.events(run.id).at(-1)?.type).toBe("job.queued");

    expect(await service.processNext("test-worker", executor)).toBe(true);
    const detailed = service.get(run.id);
    expect(detailed?.status).toBe("collecting");
    expect(detailed?.detailArtifactRef).toMatch(/creator-details\.json$/);
    expect(detailed?.mediaManifestArtifactRef).toMatch(/deep-media-manifest\.json$/);
    expect(detailed?.coverage.enrichedPosts).toBe(1);
    expect(await service.processNext("test-worker", executor)).toBe(true);
    const reconstructed = service.get(run.id);
    expect(reconstructed?.status).toBe("collecting");
    expect(reconstructed?.coverage.reconstructedPosts).toBe(1);
    expect(reconstructed?.currentStage).toBe("synthesis");
    const childEvents = service.events(run.id).filter((event) => event.type.startsWith("child."));
    expect(childEvents.map((event) => event.type)).toEqual(["child.started", "child.completed"]);
    expect(childEvents[0]?.payload).toMatchObject({
      postExternalId: "post-1",
      childRunId: "11111111-1111-4111-8111-111111111111",
      role: "candidate",
      inputRevision: `/artifacts/${run.id}/deep-media/post-1/source-video.mp4`
    });
    expect(childEvents[1]?.payload).toMatchObject({
      outputArtifactRevisions: { "reconstruction.json": "b".repeat(64) }
    });
    expect(await service.processNext("test-worker", executor)).toBe(true);
    const synthesized = service.get(run.id);
    expect(synthesized?.status).toBe("ready");
    expect(synthesized?.synthesisArtifactRef).toMatch(/creator-analysis\.json$/);
    const synthesisChildEvents = service.events(run.id).filter((event) =>
      ["creator_synthesis", "creator_synthesis_evaluator"].includes(String(event.payload.role))
    );
    expect(synthesisChildEvents.map((event) => event.type)).toEqual([
      "child.started", "child.completed", "child.started", "child.completed"
    ]);
    expect(synthesisChildEvents.at(-1)?.payload).toMatchObject({
      role: "creator_synthesis_evaluator",
      inputRevision: "d".repeat(64),
      outputArtifactRevisions: { "creator-synthesis-evaluation.json": "e".repeat(64) }
    });
    service.close();
  });

  it("never persists transient signed media URLs in public JSON artifacts", async () => {
    const values = new Map<string, unknown>();
    const service = serviceForTest({ values });
    const run = service.create("https://www.xiaohongshu.com/user/profile/creator-private-url");
    const secret = "super-secret-signature";
    const executor: CreatorBrowserExecutor = {
      async acquire() {
        return { state: "ready", finalUrl: run.profileUrl, creatorId: "creator-private-url", creatorName: "测试",
          taskSpaceId: 22, stopReason: "quiescent_incomplete", warnings: [], posts: [{ externalId: "post-1",
            url: "https://www.xiaohongshu.com/explore/post-1", title: "测试", visibleText: "测试\\n1",
            mediaType: "video", likesLabel: "1", likes: 1 }] };
      },
      async enrich(input) {
        return { state: "ready", taskSpaceId: 22, warnings: [], posts: input.posts.map((post) => ({
          externalId: post.externalId, finalUrl: post.url, title: "测试", description: "正文", publishedLabel: "08-20",
          mediaType: "video" as const, videoCandidateUrl: `https://sns-video.example.xhscdn.com/a.mp4?sign=${secret}`,
          coverCandidateUrl: `https://sns-webpic.example.xhscdn.com/a.webp?sign=${secret}`,
          inspectedAt: "2026-08-20T01:00:00.000Z", warnings: [] })) };
      }
    };
    await service.processNext("worker", executor);
    await service.processNext("worker", executor);
    await service.processNext("worker", executor);
    expect(JSON.stringify([...values.values()])).not.toContain(secret);
    service.close();
  });

  it("stops for human handoff and resumes the same durable job", async () => {
    const service = serviceForTest();
    const run = service.create("https://www.xiaohongshu.com/user/profile/creator-login");
    const executor: CreatorBrowserExecutor = {
      async acquire() {
        return {
          state: "needs_user",
          finalUrl: "https://www.xiaohongshu.com/user/profile/creator-login",
          taskSpaceId: 21,
          code: "login_required",
          message: "需要登录"
        };
      },
      async enrich() { throw new Error("not reached"); }
    };

    await service.processNext("test-worker", executor);
    expect(service.get(run.id)?.status).toBe("needs_user");
    expect(service.get(run.id)?.browserTaskSpaceId).toBe(21);
    const resumed = service.resume(run.id);
    expect(resumed.status).toBe("queued");
    expect(resumed.worker.jobId).toBe(run.worker.jobId);
    expect(service.events(run.id).at(-1)?.type).toBe("run.resumed");
    service.close();
  });

  it("atomically preserves video outcomes that complete out of lease order", async () => {
    const values = new Map<string, unknown>();
    const pending: Array<{ postExternalId: string; resolve: (value: Awaited<ReturnType<VideoReconstructionExecutor["reconstruct"]>>) => void }> = [];
    const service = serviceForTest({ values, reconstruct: (request) => new Promise((resolve) => {
      pending.push({ postExternalId: request.postExternalId, resolve });
    }) });
    const run = service.importSnapshot({
      profileUrl: "https://www.xiaohongshu.com/user/profile/concurrent-creator", creatorId: "concurrent-creator",
      creatorName: "并发博主", capturedAt: "2026-08-21T06:07:54.517Z", taskSpaceId: 4,
      stopReason: "quiescent_incomplete", warnings: [], sourceRefs: ["legacy:concurrent"],
      publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: 12, identityAnchors: [] },
      posts: Array.from({ length: 12 }, (_, index) => ({ externalId: `post-${index + 1}`,
        url: `https://www.xiaohongshu.com/user/profile/concurrent-creator/post-${index + 1}`, title: `视频 ${index + 1}`,
        visibleText: `视频 ${index + 1}\n${index + 1}`, mediaType: "video" as const,
        likesLabel: String(index + 1), likes: index + 1 }))
    });
    const executor: CreatorBrowserExecutor = {
      async acquire() { throw new Error("inventory must not be reacquired"); },
      async enrich(input) {
        return { state: "ready", taskSpaceId: 4, warnings: [], posts: input.posts.map((post) => ({
          externalId: post.externalId, finalUrl: post.url, title: post.title ?? null, description: "正文", publishedLabel: "08-20",
          mediaType: "video" as const, videoCandidateUrl: `https://video.example/${post.externalId}.mp4`,
          coverCandidateUrl: `https://image.example/${post.externalId}.webp`, inspectedAt: "2026-08-25T00:00:00.000Z", warnings: []
        })) };
      }
    };
    for (let step = 0; step < 8 && !service.get(run.id)?.reconstructionBatchArtifactRef; step += 1) {
      await service.processNext("serial", executor, "serial");
    }
    const initialRun = service.get(run.id)!;
    expect(initialRun.reconstructionBatchArtifactRef, JSON.stringify(initialRun)).not.toBeNull();
    const normalizedSelection = values.get(initialRun.selectionArtifactRef!) as { items: Array<{ externalId: string; url: string }> };
    expect(normalizedSelection.items.every((item) => item.url === `https://www.xiaohongshu.com/explore/${item.externalId}`)).toBe(true);
    const initialBatch = values.get(initialRun.reconstructionBatchArtifactRef!) as { pendingPosts: number };
    expect(initialBatch.pendingPosts).toBeGreaterThanOrEqual(3);

    const jobs = [1, 2, 3].map((slot) => service.processNext(`video-${slot}`, executor, "video"));
    await Promise.resolve();
    expect(pending).toHaveLength(3);
    expect(service.get(run.id)?.videoWork.activePostExternalIds).toHaveLength(3);
    const outcome = (postExternalId: string) => {
      const root = `/artifacts/${run.id}/video-reconstructions/${postExternalId}`;
      return { state: "ready" as const, reconstructionArtifactRef: `${root}/reconstruction.json`, articleArtifactRef: `${root}/article.md`,
        evaluationArtifactRef: `${root}/evaluation.json`, gateReportArtifactRef: `${root}/gate-report.json`, gateCount: 22,
        threeLensEvaluationArtifactRef: `${root}/runtime-three-lens-evaluation.json`,
        threeLensGateReportArtifactRef: `${root}/runtime-three-lens-gate-report.json`, threeLensGateCount: 19 as const,
        failedGateIds: [], qualityWarningGateIds: [], evaluationMode: "single_pass" as const };
    };
    for (const index of [2, 0, 1]) {
      const entry = pending[index]!;
      entry.resolve(outcome(entry.postExternalId));
      await jobs[index];
    }

    const completedRun = service.get(run.id)!;
    const completedBatch = values.get(completedRun.reconstructionBatchArtifactRef!) as {
      revision: number; readyPosts: number; pendingPosts: number; items: Array<{ state: string }>;
    };
    expect(completedBatch.revision).toBe(3);
    expect(completedBatch.readyPosts).toBe(3);
    expect(completedBatch.pendingPosts).toBe(initialBatch.pendingPosts - 3);
    expect(completedBatch.items.filter((item) => item.state === "ready")).toHaveLength(3);
    expect(completedRun.videoWork).toMatchObject({ activePostExternalIds: [], analyzedPosts: 3,
      queuedPosts: initialBatch.pendingPosts - 3, failedPosts: 0 });
    expect(service.events(run.id).filter((event) => event.message.includes("博主级研究归纳已进入持久队列"))).toHaveLength(0);
    service.close();
  });

  it("keeps a navigation redirect internal and allows only one task-level retry", async () => {
    const service = serviceForTest();
    const run = service.importSnapshot({
      profileUrl: "https://www.xiaohongshu.com/user/profile/redirect-creator", creatorId: "redirect-creator",
      creatorName: "重定向博主", capturedAt: "2026-08-21T06:07:54.517Z", taskSpaceId: 4,
      stopReason: "quiescent_incomplete", warnings: [], sourceRefs: ["legacy:redirect"],
      publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: 1, identityAnchors: [] },
      posts: [{ externalId: "post-redirect", url: "https://www.xiaohongshu.com/user/profile/redirect-creator/post-redirect",
        title: "重定向", visibleText: "重定向\n1", mediaType: "video", likesLabel: "1", likes: 1 }]
    });
    const executor: CreatorBrowserExecutor = {
      async acquire() { throw new Error("inventory must not be reacquired"); },
      async enrich() {
        return { state: "blocked", finalUrl: run.profileUrl, taskSpaceId: 4, code: "page_shape_unknown",
          message: "canonical 与 fallback 均重定向", retryable: true,
          navigationDiagnostic: { postExternalId: "post-redirect",
            inputUrl: `${run.profileUrl}/post-redirect`, canonicalUrl: "https://www.xiaohongshu.com/explore/post-redirect",
            failureClass: "navigation_redirect", challengeType: null, phase: "bounded_navigation_exhausted", fallbackAttempted: true } };
      }
    };
    await service.processNext("worker", executor, "serial");
    await service.processNext("worker", executor, "serial");
    const backoff = service.get(run.id)!;
    expect(backoff.status).toBe("backoff");
    expect(backoff.blockers[0]).toMatchObject({ code: "page_shape_unknown", userActionRequired: false });
    expect(service.events(run.id).at(-1)).toMatchObject({ type: "node.progress",
      payload: { navigationDiagnostic: { failureClass: "navigation_redirect", postExternalId: "post-redirect" } } });

    await service.processNext("worker", executor, "serial");
    expect(service.get(run.id)?.status).toBe("failed");
    service.close();
  });

  it("requeues only failed video reconstructions without reacquiring the inventory", async () => {
    const values = new Map<string, unknown>();
    const service = serviceForTest({ values, reconstruct: async (request) => {
      const root = `/artifacts/${request.creatorRunId}/video-reconstructions/${request.postExternalId}`;
      return { state: "not_ready", reconstructionArtifactRef: `${root}/reconstruction.json`,
        evaluationArtifactRef: `${root}/evaluation.json`, gateReportArtifactRef: `${root}/gate-report.json`,
        threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["unchecked_channels"], message: "OCR transient failure" };
    } });
    const run = service.importSnapshot({
      profileUrl: "https://www.xiaohongshu.com/user/profile/retry-creator", creatorId: "retry-creator",
      creatorName: "重试博主", capturedAt: "2026-08-21T06:07:54.517Z", taskSpaceId: 4,
      stopReason: "quiescent_incomplete", warnings: [], sourceRefs: ["legacy:retry"],
      publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: 1, identityAnchors: [] },
      posts: [{ externalId: "post-retry", url: "https://www.xiaohongshu.com/explore/post-retry", title: "重试",
        visibleText: "重试\n1", mediaType: "video", likesLabel: "1", likes: 1 }]
    });
    const executor: CreatorBrowserExecutor = {
      async acquire() { throw new Error("inventory must not be reacquired"); },
      async enrich(input) {
        return { state: "ready", taskSpaceId: 4, warnings: [], posts: input.posts.map((post) => ({
          externalId: post.externalId, finalUrl: post.url, title: post.title ?? null, description: "正文", publishedLabel: "08-20",
          mediaType: "video" as const, videoCandidateUrl: "https://video.example/source.mp4",
          coverCandidateUrl: "https://image.example/cover.webp", inspectedAt: "2026-08-25T00:00:00.000Z", warnings: []
        })) };
      }
    };
    await service.processNext("worker", executor);
    await service.processNext("worker", executor);
    await service.processNext("worker", executor);
    const failed = service.get(run.id);
    expect(failed?.blockers[0]?.code).toBe("video_reconstruction_incomplete");
    const retried = service.retryFailedReconstructions(run.id);
    expect(retried.status).toBe("collecting");
    expect(retried.coverage.discoveredPosts).toBe(1);
    expect(retried.nextAction).toContain("仅重试 1 条未通过视频");
    const retryBatch = values.get(retried.reconstructionBatchArtifactRef!) as { pendingPosts: number; failedPosts: number; items: Array<{ state: string }> };
    expect(retryBatch.pendingPosts).toBe(1);
    expect(retryBatch.failedPosts).toBe(0);
    expect(retryBatch.items[0]?.state).toBe("queued");
    expect(service.events(run.id).filter((event) => event.type === "run.resumed").at(-1)?.message).toContain("仅重新排队未通过项");
    service.close();
  });
});
