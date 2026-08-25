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
    async reconstruct(request) {
      if (options.reconstruct) return options.reconstruct(request);
      const root = `/artifacts/${request.creatorRunId}/video-reconstructions/${request.postExternalId}`;
      return { state: "ready", reconstructionArtifactRef: `${root}/reconstruction.json`, articleArtifactRef: `${root}/article.md`,
        evaluationArtifactRef: `${root}/evaluation.json`, gateReportArtifactRef: `${root}/gate-report.json`, gateCount: 22,
        threeLensEvaluationArtifactRef: `${root}/runtime-three-lens-evaluation.json`,
        threeLensGateReportArtifactRef: `${root}/runtime-three-lens-gate-report.json`, threeLensGateCount: 19, failedGateIds: [] };
    }
  };
  const synthesisExecutor: CreatorSynthesisExecutor = {
    async synthesize(request) {
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
    expect(await service.processNext("test-worker", executor)).toBe(true);
    const synthesized = service.get(run.id);
    expect(synthesized?.status).toBe("ready");
    expect(synthesized?.synthesisArtifactRef).toMatch(/creator-analysis\.json$/);
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
