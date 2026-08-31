import { randomUUID } from "node:crypto";
import {
  createCreatorResearchRunInputSchema,
  creatorResearchRunSchema,
  type CreatorResearchEvent,
  type CreatorResearchRun
} from "../../../contracts/index.js";
import type { CreatorResearchRepository, ResearchJobLane } from "./repository.js";
import type { CreatorArtifactStore } from "./artifact-store.js";
import {
  creatorPortfolioAnalysisSchema,
  creatorSelectionSchema,
  creatorDetailCollectionSchema,
  videoReconstructionBatchSchema,
  deepMediaManifestSchema,
  creatorSynthesisGateSchema,
  creatorSynthesisIndependentEvaluationSchema,
  creatorSynthesisSchema,
  combineCreatorSynthesisGates,
  validateCreatorSynthesis,
  creatorInventoryPostSchema,
  type CreatorBrowserExecutor,
  type DeepMediaResolver,
  type VideoReconstructionExecutor,
  type CreatorSynthesisExecutor,
  type CreatorResearchCompletionPort,
  type CreatorInventoryPost,
  type CreatorAcquisitionAdapter
} from "../../index.js";
import { buildCreatorResearchPipeline } from "./pipeline.js";
import { CreatorResearchJobProcessor } from "./job-processor.js";

const stages: CreatorResearchRun["stages"] = [
  { id: "preflight", label: "身份与登录预检", status: "pending", message: null },
  { id: "inventory", label: "全量作品清单", status: "pending", message: null },
  { id: "tiering", label: "High / Base / Low 分层", status: "pending", message: null },
  { id: "deep_capture", label: "重点视频内容还原", status: "pending", message: null },
  { id: "synthesis", label: "博主内容系统归纳", status: "pending", message: null },
  { id: "dashboard", label: "发布到原有 Dashboard", status: "pending", message: null }
];

function now(): string { return new Date().toISOString(); }

function synthesisCoverage(
  selection: ReturnType<typeof creatorSelectionSchema.parse>,
  batch: ReturnType<typeof videoReconstructionBatchSchema.parse>
): { allowed: boolean; boundedMediaGap: boolean } {
  if (batch.readyPosts === batch.requestedPosts) return { allowed: true, boundedMediaGap: false };
  const boundedMediaGap = batch.limitations.some((item) => item.startsWith("bounded_media_retry_once:"));
  const unavailable = batch.items.filter((item) => item.state !== "ready");
  if (!boundedMediaGap || unavailable.length === 0 || unavailable.some((item) =>
    item.state !== "blocked" || !item.failedGateIds.includes("media_verification"))) {
    return { allowed: false, boundedMediaGap: false };
  }
  const readyIds = new Set(batch.items.filter((item) => item.state === "ready").map((item) => item.postExternalId));
  const requiredGroups = ["high", "median", "mean", "low"] as const;
  const hasMinimumCoverage = requiredGroups.every((group) => selection.items.some((item) =>
    item.deepCandidate && item.deepGroups.includes(group) && readyIds.has(item.externalId)));
  return { allowed: hasMinimumCoverage, boundedMediaGap: hasMinimumCoverage };
}

function stage(run: CreatorResearchRun, id: CreatorResearchRun["stages"][number]["id"]) {
  const value = run.stages.find((entry) => entry.id === id);
  if (!value) throw new Error(`missing creator stage ${id}`);
  return value;
}

export function recoveredVideoWorkProjection(
  run: CreatorResearchRun,
  batch: ReturnType<typeof videoReconstructionBatchSchema.parse> | null,
  concurrencyLimit: number
): CreatorResearchRun["videoWork"] {
  const items = batch?.items ?? [];
  const derivedBuiltPosts = items.filter((item) => ["built_unevaluated", "verified", "ready"].includes(item.state)).length;
  return {
    concurrencyLimit,
    activePostExternalIds: [],
    queuedPosts: batch ? items.filter((item) => ["queued", "running"].includes(item.state)).length
      : run.videoWork.queuedPosts + run.videoWork.activePostExternalIds.length,
    analyzedPosts: batch ? Math.max(batch.builtPosts, derivedBuiltPosts)
      : run.videoWork.analyzedPosts,
    failedPosts: batch ? items.filter((item) => ["not_ready", "blocked"].includes(item.state)).length
      : run.videoWork.failedPosts
  };
}

export type ImportedCreatorSnapshot = {
  profileUrl: string;
  creatorId: string;
  creatorName: string;
  canonicalSlug?: string;
  capturedAt: string;
  taskSpaceId: number;
  stopReason: "explicit_end" | "quiescent_incomplete" | "budget_reached";
  posts: CreatorInventoryPost[];
  warnings: string[];
  sourceRefs: string[];
  publicProfile: {
    bio: string | null;
    followers: number | null;
    likesAndCollections: number | null;
    displayedPostCount: number | null;
    identityAnchors: Array<{ kind: string; value: string; source: string }>;
  };
};

export class CreatorResearchService {
  private readonly jobProcessor: CreatorResearchJobProcessor;

  constructor(
    private readonly repository: CreatorResearchRepository,
    private readonly artifacts: CreatorArtifactStore,
    mediaResolver: DeepMediaResolver,
    videoReconstructor: VideoReconstructionExecutor,
    synthesisExecutor: CreatorSynthesisExecutor,
    private readonly videoConcurrencyLimit: number,
    completionPort?: CreatorResearchCompletionPort
  ) {
    this.jobProcessor = new CreatorResearchJobProcessor(
      repository,
      artifacts,
      mediaResolver,
      videoReconstructor,
      synthesisExecutor,
      videoConcurrencyLimit,
      completionPort
    );
    this.recoverLocalWorkerProjection();
  }

  private recoverLocalWorkerProjection(): void {
    for (const run of this.repository.list(100)) {
      if (run.videoWork.activePostExternalIds.length === 0) continue;
      const recoveredActivePostExternalIds = [...run.videoWork.activePostExternalIds];
      let batch: ReturnType<typeof videoReconstructionBatchSchema.parse> | null = null;
      if (run.reconstructionBatchArtifactRef) {
        try {
          batch = videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef));
        } catch {
          // Keep the durable projection counts when an old batch cannot be read during startup recovery.
        }
      }
      const recoveredAt = now();
      run.videoWork = recoveredVideoWorkProjection(run, batch, this.videoConcurrencyLimit);
      if (run.worker.state === "running") {
        run.worker = { state: "queued", attempt: run.worker.attempt, jobId: run.worker.jobId,
          workerId: null, lastHeartbeatAt: run.worker.lastHeartbeatAt };
      }
      run.updatedAt = recoveredAt;
      this.repository.save(run);
      this.repository.appendEvent({
        runId: run.id,
        jobId: run.worker.jobId,
        type: "run.resumed",
        createdAt: recoveredAt,
        message: "本地 Worker 启动时已清理上次进程遗留的运行中投影；持久任务按租约继续恢复。",
        payload: { recoveredActivePostExternalIds, pendingPosts: run.videoWork.queuedPosts }
      });
    }
  }

  create(profileUrl: string, adapter: CreatorAcquisitionAdapter = "ego-browser"): CreatorResearchRun {
    const input = createCreatorResearchRunInputSchema.parse({ profileUrl, adapter });
    const existing = this.repository.findLatestByProfileUrlAndAdapter(input.profileUrl, input.adapter);
    if (existing) {
      const active = ["queued", "preflight", "collecting", "needs_user", "backoff"].includes(existing.status);
      const snapshotTime = existing.lastSnapshotAt ? Date.parse(existing.lastSnapshotAt) : Number.NaN;
      const reusable = ["reviewable", "ready"].includes(existing.status) && Number.isFinite(snapshotTime) &&
        Date.now() - snapshotTime < existing.collectionPolicy.cacheTtlHours * 60 * 60 * 1000;
      if (active || reusable) return existing;
    }

    const timestamp = now();
    const run = creatorResearchRunSchema.parse({
      schemaVersion: "1.3.0",
      id: randomUUID(),
      platform: "xiaohongshu",
      profileUrl: input.profileUrl,
      status: "queued",
      currentStage: "preflight",
      createdAt: timestamp,
      updatedAt: timestamp,
      creatorId: null,
      creatorName: null,
      source: { kind: "live_collection", sourceRefs: [], importedAt: null },
      publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: null, identityAnchors: [] },
      dashboardPath: null,
      stages: stages.map((entry) => ({ ...entry })),
      coverage: { discoveredPosts: 0, enrichedPosts: 0, comparisonPosts: 0, reconstructedPosts: 0 },
      collectionPolicy: {
        adapter: input.adapter,
        browserProfile: input.adapter === "ego-browser" ? "hhh-01" : null,
        readOnly: true,
        incremental: true,
        bypassChallenges: false,
        cacheTtlHours: 24,
        budgets: { maxScrollRounds: input.adapter === "redfox" ? 10 : 30, maxDetailOpens: 24, maxMediaDownloads: 12 }
      },
      blockers: [],
      nextAction: input.adapter === "ego-browser"
        ? "账号态 Worker 已排队，将自动完成登录预检和公开作品清单采集。"
        : "红狐 Worker 已排队，将通过公开数据接口获取账号和作品清单。",
      lastSnapshotAt: null,
      worker: { state: "queued", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: null },
      inventoryArtifactRef: null,
      portfolioArtifactRef: null,
      selectionArtifactRef: null,
      detailArtifactRef: null,
      mediaManifestArtifactRef: null,
      reconstructionBatchArtifactRef: null,
      synthesisArtifactRef: null,
      synthesisGateArtifactRef: null,
      browserTaskSpaceId: null
    });
    this.repository.save(run);
    this.repository.appendEvent({
      runId: run.id, jobId: null, type: "run.created", createdAt: timestamp,
      message: "博主研究任务已创建。", payload: { profileUrl: run.profileUrl }
    });
    const job = this.repository.enqueue({
      id: randomUUID(), runId: run.id, nodeKey: "creator.acquire", status: "queued",
      idempotencyKey: `${run.id}:creator.acquire:${input.adapter}:v2`, attempts: 0, maxAttempts: 3,
      availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
      payload: { profileUrl: run.profileUrl }, lastError: null, createdAt: timestamp, updatedAt: timestamp
    });
    run.worker.jobId = job.id;
    this.repository.save(run);
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "job.queued", createdAt: timestamp,
      message: `${input.adapter} 采集任务已进入持久队列。`, payload: { nodeKey: job.nodeKey, adapter: input.adapter }
    });
    return run;
  }

  importSnapshot(input: ImportedCreatorSnapshot): CreatorResearchRun {
    const profileUrl = createCreatorResearchRunInputSchema.parse({ profileUrl: input.profileUrl }).profileUrl;
    const posts = input.posts.map((post) => creatorInventoryPostSchema.parse(post));
    const existing = this.repository.findLatestByProfileUrl(profileUrl);
    if (existing?.inventoryArtifactRef) {
      if (input.canonicalSlug && existing.canonicalSlug !== input.canonicalSlug) {
        existing.canonicalSlug = input.canonicalSlug;
        existing.updatedAt = now();
        this.repository.save(existing);
      }
      return existing;
    }

    const timestamp = now();
    const run = creatorResearchRunSchema.parse({
      schemaVersion: "1.2.0",
      id: randomUUID(),
      platform: "xiaohongshu",
      profileUrl,
      status: "collecting",
      currentStage: "tiering",
      createdAt: timestamp,
      updatedAt: timestamp,
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      canonicalSlug: input.canonicalSlug ?? null,
      source: { kind: "legacy_import", sourceRefs: input.sourceRefs, importedAt: timestamp },
      publicProfile: input.publicProfile,
      dashboardPath: null,
      stages: stages.map((entry) => ({ ...entry })),
      coverage: { discoveredPosts: posts.length, enrichedPosts: 0, comparisonPosts: 0, reconstructedPosts: 0 },
      collectionPolicy: {
        adapter: "ego-browser", browserProfile: "hhh-01", readOnly: true, incremental: true,
        bypassChallenges: false, cacheTtlHours: 24,
        budgets: { maxScrollRounds: 30, maxDetailOpens: 24, maxMediaDownloads: 12 }
      },
      blockers: [],
      nextAction: "既有公开快照已登记为版本化输入；Portfolio Worker 将从冻结清单继续，不重抓基本盘。",
      lastSnapshotAt: input.capturedAt,
      worker: { state: "queued", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: null },
      inventoryArtifactRef: null, portfolioArtifactRef: null, selectionArtifactRef: null, detailArtifactRef: null,
      mediaManifestArtifactRef: null, reconstructionBatchArtifactRef: null, synthesisArtifactRef: null,
      synthesisGateArtifactRef: null, browserTaskSpaceId: input.taskSpaceId
    });
    this.repository.save(run);
    const inventoryRef = this.artifacts.write(run.id, "creator-inventory.json", {
      schemaVersion: "1.1.0", runId: run.id, capturedAt: input.capturedAt, sourceUrl: profileUrl,
      finalUrl: profileUrl, creatorId: input.creatorId, creatorName: input.creatorName,
      stopReason: input.stopReason, crawlDiagnostics: [], posts, warnings: input.warnings
    }, input.sourceRefs);
    const job = this.repository.enqueue({
      id: randomUUID(), runId: run.id, nodeKey: "creator.portfolio", status: "queued",
      idempotencyKey: `${run.id}:creator.portfolio:ranked-7x3-v1`, attempts: 0, maxAttempts: 3,
      availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
      payload: { inventoryArtifactRef: inventoryRef }, lastError: null, createdAt: timestamp, updatedAt: timestamp
    });
    run.inventoryArtifactRef = inventoryRef;
    run.worker.jobId = job.id;
    stage(run, "preflight").status = "complete";
    stage(run, "preflight").message = "身份由已核验快照的多个公开锚点导入。";
    stage(run, "inventory").status = "complete";
    stage(run, "inventory").message = `导入 ${posts.length} 条公开作品；原始缺口与阻塞保持可见。`;
    stage(run, "tiering").status = "pending";
    stage(run, "tiering").message = "等待从版本化清单复算统计和选择集。";
    this.repository.save(run);
    this.repository.appendEvent({ runId: run.id, jobId: null, type: "run.created", createdAt: timestamp,
      message: "既有赛博鸭公开快照已迁入正式运行控制面。", payload: { sourceRefs: input.sourceRefs } });
    this.repository.appendEvent({ runId: run.id, jobId: null, type: "artifact.produced", createdAt: timestamp,
      message: "版本化作品清单已登记。", payload: { artifactRef: inventoryRef, dependencies: input.sourceRefs, postCount: posts.length } });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "job.queued", createdAt: timestamp,
      message: "Portfolio 分析节点已进入持久队列。", payload: { nodeKey: job.nodeKey } });
    return run;
  }

  get(id: string): CreatorResearchRun | null { return this.projectRun(this.repository.get(id)); }
  list(limit?: number): CreatorResearchRun[] { return this.repository.list(limit).map((run) => this.projectRun(run)!); }
  events(id: string, afterSequence = 0): CreatorResearchEvent[] {
    return this.repository.listEvents(id, afterSequence);
  }

  portfolio(id: string) {
    const run = this.projectRun(this.repository.get(id));
    if (!run) return null;
    if (!run.portfolioArtifactRef || !run.selectionArtifactRef) return { run, pipeline: buildCreatorResearchPipeline(run), analysis: null, selection: null, details: null,
      mediaManifest: null, reconstructionBatch: null, synthesis: null, synthesisGate: null };
    return {
      run,
      pipeline: buildCreatorResearchPipeline(run),
      analysis: creatorPortfolioAnalysisSchema.parse(this.artifacts.read(run.portfolioArtifactRef)),
      selection: creatorSelectionSchema.parse(this.artifacts.read(run.selectionArtifactRef)),
      details: run.detailArtifactRef ? creatorDetailCollectionSchema.parse(this.artifacts.read(run.detailArtifactRef)) : null,
      mediaManifest: run.mediaManifestArtifactRef ? deepMediaManifestSchema.parse(this.artifacts.read(run.mediaManifestArtifactRef)) : null,
      reconstructionBatch: run.reconstructionBatchArtifactRef
        ? videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef)) : null,
      synthesis: run.synthesisArtifactRef ? creatorSynthesisSchema.parse(this.artifacts.read(run.synthesisArtifactRef)) : null,
      synthesisGate: run.synthesisGateArtifactRef ? creatorSynthesisGateSchema.parse(this.artifacts.read(run.synthesisGateArtifactRef)) : null
    };
  }

  private projectRun(run: CreatorResearchRun | null): CreatorResearchRun | null {
    if (!run) return null;
    run.videoWork.concurrencyLimit = this.videoConcurrencyLimit;
    if (!run.reconstructionBatchArtifactRef) return run;
    try {
      const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef));
      run.videoWork.analyzedPosts = Math.max(
        batch.builtPosts,
        batch.items.filter((item) => ["built_unevaluated", "verified", "ready"].includes(item.state)).length
      );
      run.videoWork.failedPosts = batch.failedPosts;
      run.videoWork.queuedPosts = Math.max(0, batch.pendingPosts - run.videoWork.activePostExternalIds.length);
    } catch {
      // Keep the persisted projection when an old or externally removed artifact cannot be read.
    }
    return run;
  }

  resume(id: string): CreatorResearchRun {
    const run = this.repository.get(id);
    if (!run) throw new Error("博主分析任务不存在");
    const retryableSynthesis = run.status === "reviewable"
      && run.blockers.some((blocker) => blocker.code === "creator_synthesis_not_ready");
    if (!["needs_user", "backoff", "failed"].includes(run.status) && !retryableSynthesis) return run;
    const timestamp = now();
    const job = this.repository.requeueRun(run.id, timestamp);
    if (!job) throw new Error("任务缺少可恢复的工作节点");
    const resumedStage = job.nodeKey === "creator.portfolio" ? "tiering"
      : ["creator.enrich", "video.reconstruct"].includes(job.nodeKey) ? "deep_capture"
        : job.nodeKey === "creator.synthesize" ? "synthesis" : "preflight";
    run.status = "queued";
    run.currentStage = resumedStage;
    run.updatedAt = timestamp;
    run.blockers = [];
    run.nextAction = job.nodeKey === "creator.portfolio"
      ? "已重新排队，后台 Worker 将从冻结清单重算 Portfolio。"
      : job.nodeKey === "creator.enrich" ? "已重新排队，后台 Worker 将继续补齐选择集详情。"
        : job.nodeKey === "video.reconstruct" ? "已重新排队，后台 Worker 将从保留的媒体与证据状态恢复视频重建。"
          : job.nodeKey === "creator.synthesize" ? "已重新排队，后台 Worker 将从已验证重建重新生成博主归纳。"
        : "已收到继续指令，后台 Worker 将从登录预检恢复。";
    run.worker = { state: "queued", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: null };
    stage(run, resumedStage).status = "pending";
    stage(run, resumedStage).message = null;
    this.repository.save(run);
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "run.resumed", createdAt: timestamp,
      message: "用户已确认继续，任务重新进入队列。", payload: {}
    });
    return run;
  }

  rebuildSelection(id: string): CreatorResearchRun {
    const run = this.repository.get(id);
    if (!run) throw new Error("博主分析任务不存在");
    if (!run.inventoryArtifactRef) throw new Error("任务缺少可复算的版本化清单");
    const timestamp = now();
    const invalidated = [run.portfolioArtifactRef, run.selectionArtifactRef, run.detailArtifactRef,
      run.mediaManifestArtifactRef, run.reconstructionBatchArtifactRef, run.synthesisArtifactRef,
      run.synthesisGateArtifactRef].filter((ref): ref is string => Boolean(ref));
    const job = this.repository.enqueue({
      id: randomUUID(), runId: run.id, nodeKey: "creator.portfolio", status: "queued",
      idempotencyKey: `${run.id}:creator.portfolio:four-groups-3-each-v2:${timestamp}`, attempts: 0, maxAttempts: 3,
      availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
      payload: { inventoryArtifactRef: run.inventoryArtifactRef, invalidated }, lastError: null,
      createdAt: timestamp, updatedAt: timestamp
    });
    run.status = "queued";
    run.currentStage = "tiering";
    run.updatedAt = timestamp;
    run.coverage = { ...run.coverage, enrichedPosts: 0, comparisonPosts: 0, reconstructedPosts: 0 };
    run.collectionPolicy.budgets.maxMediaDownloads = 12;
    run.portfolioArtifactRef = null;
    run.selectionArtifactRef = null;
    run.detailArtifactRef = null;
    run.mediaManifestArtifactRef = null;
    run.reconstructionBatchArtifactRef = null;
    run.synthesisArtifactRef = null;
    run.synthesisGateArtifactRef = null;
    run.worker = { state: "queued", attempt: 0, jobId: job.id, workerId: null, lastHeartbeatAt: null };
    run.blockers = [];
    run.nextAction = "选样合同已升级；从登记清单重算四组各 3 条深度候选，旧 Artifact 保留但不再投影。";
    for (const stageId of ["tiering", "deep_capture", "synthesis", "dashboard"] as const) {
      stage(run, stageId).status = "pending";
      stage(run, stageId).message = stageId === "tiering" ? "等待四组深度选样 v2。" : null;
    }
    this.repository.save(run);
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "run.resumed", createdAt: timestamp,
      message: "上游选样合同变化，已失效旧下游引用并从版本化清单重算。", payload: { invalidated, ruleVersion: "four-groups-3-each-v2" } });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "job.queued", createdAt: timestamp,
      message: "四组深度选样重算已进入持久队列。", payload: { nodeKey: job.nodeKey } });
    return run;
  }

  retryFailedReconstructions(id: string): CreatorResearchRun {
    const run = this.repository.get(id);
    if (!run) throw new Error("博主分析任务不存在");
    if (!run.reconstructionBatchArtifactRef) throw new Error("任务缺少视频重建批次");
    const previousBatchRef = run.reconstructionBatchArtifactRef;
    const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(previousBatchRef));
    const orphanedMediaItems = run.status === "failed"
      ? batch.items.filter((item) => ["queued", "running"].includes(item.state) && !item.sourceMediaArtifactRef)
      : [];
    for (const item of orphanedMediaItems) Object.assign(item, {
      state: "blocked", failedGateIds: ["media_verification"],
      message: "旧版本曾把缺少媒体的项目错误排入视频队列；现转回定向媒体补取。"
    });
    if (orphanedMediaItems.length > 0) {
      batch.pendingPosts = batch.items.filter((item) => ["queued", "running"].includes(item.state)).length;
      batch.failedPosts = batch.items.filter((item) => ["not_ready", "blocked"].includes(item.state)).length;
    }
    if (batch.pendingPosts > 0 || batch.items.some((item) => ["queued", "running"].includes(item.state))) {
      throw new Error("视频重建批次仍在运行，暂不能重试失败项");
    }
    const failedItems = batch.items.filter((item) => ["not_ready", "blocked"].includes(item.state));
    if (failedItems.length === 0) throw new Error("当前批次没有可重试的失败视频");
    const mediaRefreshItems = failedItems.filter((item) =>
      !item.sourceMediaArtifactRef || item.failedGateIds.includes("media_verification"));
    const reconstructionRetryItems = failedItems.filter((item) => !mediaRefreshItems.includes(item));
    const timestamp = now();
    for (const item of failedItems) {
      this.artifacts.archiveReconstructionEvaluations(
        run.id, item.postExternalId, batch.revision + 1, randomUUID()
      );
      const needsMediaRefresh = mediaRefreshItems.includes(item);
      Object.assign(item, {
        state: needsMediaRefresh ? "blocked" : "queued", reconstructionArtifactRef: null, articleArtifactRef: null,
        evaluationArtifactRef: null, gateReportArtifactRef: null,
        threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: needsMediaRefresh ? ["media_verification"] : [],
        message: needsMediaRefresh
          ? "媒体核验失败项已进入一次定向补取；不会重抓基本盘或重跑已通过视频。"
          : "基础设施或证据闭环修复后重新排队；保留原媒体、候选与历史评审。",
        updatedAt: timestamp
      });
    }
    batch.revision += 1;
    batch.generatedAt = timestamp;
    if (mediaRefreshItems.length > 0) batch.limitations = [...new Set([
      ...batch.limitations,
      `bounded_media_retry_once:${mediaRefreshItems.map((item) => item.postExternalId).join(",")}`
    ])];
    batch.readyPosts = batch.items.filter((item) => item.state === "ready").length;
    batch.pendingPosts = reconstructionRetryItems.length;
    batch.failedPosts = mediaRefreshItems.length;
    const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${batch.revision}.json`, batch, [previousBatchRef]);
    run.reconstructionBatchArtifactRef = batchRef;
    if (mediaRefreshItems.length > 0) {
      const mediaIds = mediaRefreshItems.map((item) => item.postExternalId);
      const firstBatch = mediaIds.slice(0, 3);
      const remainingMediaIds = mediaIds.slice(3);
      const job = this.repository.enqueue({ id: randomUUID(), runId: run.id, nodeKey: "creator.enrich", status: "queued",
        idempotencyKey: `${run.id}:creator.enrich:media-refresh:retry:${batch.revision}:0`,
        attempts: 0, maxAttempts: 3, availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
        payload: { mode: "media_refresh", mediaIds: firstBatch, remainingMediaIds, batchIndex: 0 },
        lastError: null, createdAt: timestamp, updatedAt: timestamp });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "job.queued", createdAt: timestamp,
        message: "媒体核验失败项已进入一次定向补取。", payload: { nodeKey: job.nodeKey, postExternalIds: mediaIds } });
    }
    for (const item of reconstructionRetryItems) {
      const job = this.repository.enqueue({ id: randomUUID(), runId: run.id, nodeKey: "video.reconstruct", status: "queued",
        idempotencyKey: `${run.id}:video.reconstruct:retry:${batch.revision}:${item.postExternalId}:${item.sourceMediaArtifactRef}`,
        attempts: 0, maxAttempts: 2, availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
        payload: { postExternalId: item.postExternalId, sourceUrl: `https://www.xiaohongshu.com/explore/${item.postExternalId}`,
          sourceMediaArtifactRef: item.sourceMediaArtifactRef }, lastError: null, createdAt: timestamp, updatedAt: timestamp });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "job.queued", createdAt: timestamp,
        message: "未通过视频已保留证据并重新进入持久队列。", payload: { nodeKey: job.nodeKey, postExternalId: item.postExternalId } });
    }
    run.status = "collecting";
    run.currentStage = "deep_capture";
    run.updatedAt = timestamp;
    run.coverage.reconstructedPosts = batch.readyPosts;
    run.videoWork = { concurrencyLimit: this.videoConcurrencyLimit, activePostExternalIds: [], queuedPosts: reconstructionRetryItems.length,
      analyzedPosts: batch.readyPosts, failedPosts: mediaRefreshItems.length };
    run.worker = { state: "queued", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: null };
    run.blockers = [];
    run.nextAction = `仅重试 ${failedItems.length} 条未通过视频（媒体补取 ${mediaRefreshItems.length}，视频重试 ${reconstructionRetryItems.length}）；已通过 ${batch.readyPosts} 条不会重跑。`;
    stage(run, "deep_capture").status = "running";
    stage(run, "deep_capture").message = run.nextAction;
    this.repository.save(run);
    this.repository.appendEvent({ runId: run.id, jobId: null, type: "run.resumed", createdAt: timestamp,
      message: "视频基础设施修复后，仅重新排队未通过项。", payload: { previousBatchRef, batchRef, retriedPosts: failedItems.map((item) => item.postExternalId) } });
    return run;
  }

  continueWithBoundedMediaGaps(id: string): CreatorResearchRun {
    const run = this.repository.get(id);
    if (!run) throw new Error("博主分析任务不存在");
    if (!run.reconstructionBatchArtifactRef || !run.selectionArtifactRef) throw new Error("任务缺少视频批次或选择集");
    const previousBatchRef = run.reconstructionBatchArtifactRef;
    const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(previousBatchRef));
    if (batch.pendingPosts > 0 || batch.items.some((item) => ["queued", "running"].includes(item.state))) {
      throw new Error("视频重建批次仍在运行，不能提前接受媒体缺口");
    }
    const unavailable = batch.items.filter((item) => item.state !== "ready");
    if (unavailable.length === 0 || unavailable.some((item) =>
      item.state !== "blocked" || !item.failedGateIds.includes("media_verification"))) {
      throw new Error("当前批次不存在可接受的纯媒体不可得缺口");
    }
    const retriedIds = new Set(this.repository.listEvents(run.id).flatMap((event) => {
      const ids = event.type === "job.queued" && event.message === "媒体核验失败项已进入一次定向补取。"
        ? event.payload.postExternalIds : null;
      return Array.isArray(ids) ? ids.filter((value): value is string => typeof value === "string") : [];
    }));
    if (unavailable.some((item) => !retriedIds.has(item.postExternalId))) {
      throw new Error("媒体缺口尚未完成一次定向补取，不能提前降级");
    }
    const timestamp = now();
    batch.revision += 1;
    batch.generatedAt = timestamp;
    batch.limitations = [...new Set([
      ...batch.limitations,
      `bounded_media_retry_once:${unavailable.map((item) => item.postExternalId).join(",")}`,
      `${unavailable.length} 条注册深度样本经一次定向补取仍无可核验媒体；只保留 surface_only，视频内容保持未知。`
    ])];
    const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${batch.revision}.json`, batch, [previousBatchRef]);
    run.reconstructionBatchArtifactRef = batchRef;
    run.updatedAt = timestamp;
    run.coverage.reconstructedPosts = batch.readyPosts;
    run.videoWork = { concurrencyLimit: this.videoConcurrencyLimit, activePostExternalIds: [], queuedPosts: 0,
      analyzedPosts: batch.readyPosts, failedPosts: batch.failedPosts };
    const selection = creatorSelectionSchema.parse(this.artifacts.read(run.selectionArtifactRef));
    if (!this.queueSynthesis(run, batchRef, batch, selection, timestamp)) {
      throw new Error("可用视频尚未覆盖高、中位、均值和低表现四组，不能进入博主综合");
    }
    this.repository.save(run);
    this.repository.appendEvent({ runId: run.id, jobId: null, type: "run.resumed", createdAt: timestamp,
      message: "一次媒体补取仍不可得的样本已固化为未知边界；博主综合继续。",
      payload: { previousBatchRef, batchRef, unavailablePostExternalIds: unavailable.map((item) => item.postExternalId) } });
    return run;
  }

  revalidateSynthesis(id: string): CreatorResearchRun {
    const run = this.repository.get(id);
    if (!run) throw new Error("博主分析任务不存在");
    if (!run.portfolioArtifactRef || !run.selectionArtifactRef || !run.detailArtifactRef
      || !run.reconstructionBatchArtifactRef || !run.synthesisArtifactRef || !run.synthesisGateArtifactRef) {
      throw new Error("任务缺少可重验的博主综合 artifact");
    }
    const previousGate = creatorSynthesisGateSchema.parse(this.artifacts.read(run.synthesisGateArtifactRef));
    if (!previousGate.candidateRevisionFingerprint || !previousGate.independentEvaluationArtifactRef) {
      throw new Error("旧 gate 未绑定独立评估 revision，不能只做确定性重验");
    }
    const checkedAt = now();
    const deterministicGate = validateCreatorSynthesis({ creatorRunId: run.id,
      selection: this.artifacts.read(run.selectionArtifactRef),
      batch: this.artifacts.read(run.reconstructionBatchArtifactRef),
      synthesis: this.artifacts.read(run.synthesisArtifactRef), checkedAt });
    const independentEvaluation = creatorSynthesisIndependentEvaluationSchema.parse(
      this.artifacts.read(previousGate.independentEvaluationArtifactRef));
    const gate = combineCreatorSynthesisGates({ deterministicGate, independentEvaluation,
      candidateRevisionFingerprint: previousGate.candidateRevisionFingerprint,
      independentEvaluationArtifactRef: previousGate.independentEvaluationArtifactRef, checkedAt });
    const previousGateRef = run.synthesisGateArtifactRef;
    const gateRef = this.artifacts.write(run.id, "creator-synthesis-gate.json", gate,
      [run.synthesisArtifactRef, previousGate.independentEvaluationArtifactRef, previousGateRef]);
    run.synthesisGateArtifactRef = gateRef;
    run.updatedAt = checkedAt;
    if (!gate.ready) {
      run.status = "reviewable";
      run.blockers = [{ code: "creator_synthesis_not_ready",
        message: `博主归纳确定性重验仍未通过 (${gate.failedGateIds.join(", ")})`, userActionRequired: false }];
      run.nextAction = "候选与独立评估均保留；只处理仍失败的具体 gate。";
      stage(run, "synthesis").status = "failed";
      stage(run, "synthesis").message = run.blockers[0]?.message ?? null;
    } else {
      run.status = "ready";
      run.worker = { state: "succeeded", attempt: run.worker.attempt, jobId: null, workerId: null, lastHeartbeatAt: checkedAt };
      run.blockers = [];
      run.nextAction = "单博主研究已发布到同一个 Dashboard；创作建议仍属于独立工作区。";
      run.dashboardPath = `/creators/${encodeURIComponent(run.creatorId ?? run.id)}`;
      stage(run, "synthesis").status = "complete";
      stage(run, "synthesis").message = "同一候选 revision 与独立评估已通过修正后的确定性边界。";
      stage(run, "dashboard").status = "complete";
      stage(run, "dashboard").message = "动态 Dashboard projection 已可读取。";
    }
    this.repository.save(run);
    this.repository.appendEvent({ runId: run.id, jobId: null, type: "artifact.produced", createdAt: checkedAt,
      message: "博主综合 gate 已在不重跑候选或 evaluator 的情况下重验。",
      payload: { previousGateRef, gateRef, candidateRevisionFingerprint: previousGate.candidateRevisionFingerprint,
        ready: gate.ready, failedGateIds: gate.failedGateIds } });
    this.repository.appendEvent({ runId: run.id, jobId: null, type: "node.completed", createdAt: checkedAt,
      message: gate.ready ? "博主级归纳通过修正后的确定性硬闸。" : "博主级归纳重验仍未发布。",
      payload: { state: gate.ready ? "ready" : "not_ready", reusedIndependentEvaluation: true } });
    return run;
  }

  async processNext(workerId: string, executor: CreatorBrowserExecutor, lane: ResearchJobLane | "serial" = "any"): Promise<boolean> {
    return this.jobProcessor.processNext(workerId, executor, lane === "serial" ? "any" : lane);
  }

  private queueSynthesis(
    run: CreatorResearchRun,
    batchRef: string,
    batch: ReturnType<typeof videoReconstructionBatchSchema.parse>,
    selection: ReturnType<typeof creatorSelectionSchema.parse>,
    queuedAt: string
  ): boolean {
    const coverage = synthesisCoverage(selection, batch);
    if (!coverage.allowed) return false;
    const synthesisJob = this.repository.enqueue({ id: randomUUID(), runId: run.id, nodeKey: "creator.synthesize", status: "queued",
      idempotencyKey: `${run.id}:creator.synthesize:${batchRef}`, attempts: 0, maxAttempts: 2, availableAt: queuedAt,
      leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null, payload: { reconstructionBatchArtifactRef: batchRef },
      lastError: null, createdAt: queuedAt, updatedAt: queuedAt });
    run.status = "collecting";
    run.currentStage = "synthesis";
    run.worker = { state: "queued", attempt: 0, jobId: synthesisJob.id, workerId: null, lastHeartbeatAt: queuedAt };
    run.blockers = [];
    run.nextAction = coverage.boundedMediaGap
      ? `${batch.readyPosts}/${batch.requestedPosts} 条公开媒体完成单轮分析；其余媒体经一次定向补取仍不可得，作为未知证据进入综合。`
      : "四组深度内容均完成单轮还原与独立评估；博主级综合归纳已进入队列。";
    stage(run, "deep_capture").status = "complete";
    stage(run, "deep_capture").message = coverage.boundedMediaGap
      ? `${batch.readyPosts}/${batch.requestedPosts} 条完成；${batch.failedPosts} 条媒体不可得，禁止据此推断视频内容。`
      : `${batch.readyPosts}/${batch.requestedPosts} 条全部完成单轮分析；质量提醒继续保留。`;
    stage(run, "synthesis").status = "pending";
    stage(run, "synthesis").message = "等待从规范比较集、可用视频与显式未知边界生成研究归纳。";
    this.repository.appendEvent({ runId: run.id, jobId: synthesisJob.id, type: "job.queued", createdAt: queuedAt,
      message: coverage.boundedMediaGap ? "带媒体不可得边界的博主级研究归纳已进入持久队列。" : "博主级研究归纳已进入持久队列。",
      payload: { nodeKey: synthesisJob.nodeKey, boundedMediaGap: coverage.boundedMediaGap,
        readyPosts: batch.readyPosts, requestedPosts: batch.requestedPosts } });
    return true;
  }

  close(): void { this.repository.close(); }
}
