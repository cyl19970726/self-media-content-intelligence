import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  createCreatorResearchRunInputSchema,
  creatorResearchRunSchema,
  type CreatorResearchEvent,
  type CreatorResearchRun
} from "../../shared/schema.js";
import type { CreatorAcquisitionResult, CreatorBrowserExecutor, CreatorDetailResult, ResearchJob } from "../orchestration/contracts.js";
import type { CreatorResearchRepository, ResearchJobLane } from "./repository.js";
import { SQLiteCreatorResearchRepository } from "../../platform/database/sqlite-creator-research-repository.js";
import type { CreatorArtifactStore } from "./artifact-store.js";
import { LocalCreatorArtifactStore } from "../../platform/artifacts/local-creator-artifact-store.js";
import { buildCreatorPortfolio, refineDeepSelectionForVerifiedVideos } from "../portfolio/analyzer.js";
import { creatorPortfolioAnalysisSchema, creatorSelectionSchema } from "../portfolio/contracts.js";
import { creatorDetailCollectionSchema } from "../creator-detail/contracts.js";
import type { DeepMediaResolver } from "../media-resolution/contracts.js";
import { LocalDeepMediaResolver } from "../../platform/media/local-deep-media-resolver.js";
import type {
  VideoReconstructionExecutor,
  VideoReconstructionLifecycleEvent,
  VideoReconstructionOutcome
} from "../video-analysis/contracts.js";
import { videoReconstructionRequestSchema } from "../video-analysis/contracts.js";
import { videoReconstructionBatchSchema } from "../video-analysis/batch-contracts.js";
import { CodexVideoReconstructionExecutor } from "../../platform/video/codex-video-reconstruction-executor.js";
import type { CreatorSynthesisExecutor, CreatorSynthesisLifecycleEvent } from "../creator-synthesis/contracts.js";
import { CodexCreatorSynthesisExecutor } from "../../platform/synthesis/codex-creator-synthesis-executor.js";
import { deepMediaManifestSchema } from "../media-resolution/contracts.js";
import {
  creatorSynthesisGateSchema,
  creatorSynthesisIndependentEvaluationSchema,
  creatorSynthesisSchema
} from "../creator-synthesis/contracts.js";
import { combineCreatorSynthesisGates, validateCreatorSynthesis } from "../creator-synthesis/validate.js";
import { runArtifactDir, videoConcurrency } from "../../core/config.js";
import { buildCreatorResearchPipeline } from "./pipeline.js";
import { creatorInventoryPostSchema, type CreatorInventoryPost } from "../portfolio/contracts.js";
import type { CreatorAcquisitionAdapter } from "../orchestration/contracts.js";

const stages: CreatorResearchRun["stages"] = [
  { id: "preflight", label: "身份与登录预检", status: "pending", message: null },
  { id: "inventory", label: "全量作品清单", status: "pending", message: null },
  { id: "tiering", label: "High / Base / Low 分层", status: "pending", message: null },
  { id: "deep_capture", label: "重点视频内容还原", status: "pending", message: null },
  { id: "synthesis", label: "博主内容系统归纳", status: "pending", message: null },
  { id: "dashboard", label: "发布到原有 Dashboard", status: "pending", message: null }
];

function now(): string { return new Date().toISOString(); }

function leaseUntil(seconds = 90): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function canonicalXhsPostUrl(externalId: string): string {
  return `https://www.xiaohongshu.com/explore/${encodeURIComponent(externalId)}`;
}

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

const videoChildRoleLabel: Record<VideoReconstructionLifecycleEvent["role"], string> = {
  candidate: "候选重建",
  generic_evaluator: "通用独立评估",
  generic_repair: "通用定向修复",
  content_restoration_evaluator: "内容还原评估",
  directing_logic_evaluator: "导演逻辑评估",
  visual_editing_evaluator: "视觉剪辑评估",
  runtime_repair: "三镜头定向修复",
  generic_recheck: "修复后通用复评"
};

const videoChildStatusLabel: Record<VideoReconstructionLifecycleEvent["status"], string> = {
  started: "已启动",
  progress: "有新进展",
  stale: "超过预期静默时长",
  completed: "已完成",
  failed: "已失败"
};

const synthesisChildRoleLabel: Record<CreatorSynthesisLifecycleEvent["role"], string> = {
  creator_synthesis: "博主综合候选",
  creator_synthesis_evaluator: "博主综合独立评估"
};

function externalCreatorId(finalUrl: string): string | null {
  try {
    const match = new URL(finalUrl).pathname.match(/^\/user\/profile\/([^/?#]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
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
  constructor(
    private readonly repository: CreatorResearchRepository = new SQLiteCreatorResearchRepository(),
    private readonly artifacts: CreatorArtifactStore = new LocalCreatorArtifactStore(),
    private readonly mediaResolver: DeepMediaResolver = new LocalDeepMediaResolver(),
    private readonly videoReconstructor: VideoReconstructionExecutor = new CodexVideoReconstructionExecutor(),
    private readonly synthesisExecutor: CreatorSynthesisExecutor = new CodexCreatorSynthesisExecutor(artifacts)
  ) {}

  create(profileUrl: string, adapter: CreatorAcquisitionAdapter = "ego-browser"): CreatorResearchRun {
    const input = createCreatorResearchRunInputSchema.parse({ profileUrl, adapter });
    const existing = this.repository.list(200).find((candidate) => candidate.profileUrl === input.profileUrl
      && candidate.collectionPolicy.adapter === input.adapter) ?? null;
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
    run.videoWork.concurrencyLimit = videoConcurrency();
    if (!run.reconstructionBatchArtifactRef) return run;
    try {
      const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef));
      run.videoWork.analyzedPosts = batch.readyPosts;
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
      const outputDir = path.join(runArtifactDir(run.id), "video-reconstructions", item.postExternalId);
      const historyDir = path.join(outputDir, "pipeline-retry-history", `revision-${batch.revision + 1}-${randomUUID()}`);
      const evaluatorOwned = ["evaluation.json", "evaluation.md", "gate-report.json",
        "runtime-three-lens-evaluation.json", "runtime-three-lens-gate-report.json"];
      const present = evaluatorOwned.filter((filename) => fs.existsSync(path.join(outputDir, filename)));
      if (present.length > 0) {
        fs.mkdirSync(historyDir, { recursive: true });
        for (const filename of present) fs.renameSync(path.join(outputDir, filename), path.join(historyDir, filename));
      }
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
    run.videoWork = { concurrencyLimit: videoConcurrency(), activePostExternalIds: [], queuedPosts: reconstructionRetryItems.length,
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
    run.videoWork = { concurrencyLimit: videoConcurrency(), activePostExternalIds: [], queuedPosts: 0,
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

  async processNext(workerId: string, executor: CreatorBrowserExecutor, lane: ResearchJobLane = "any"): Promise<boolean> {
    const leasedAt = now();
    const job = this.repository.claimNext(workerId, leasedAt, leaseUntil(), lane);
    if (!job) return false;
    const run = this.repository.get(job.runId);
    if (!run) {
      this.repository.updateJobStatus({ jobId: job.id, status: "failed", updatedAt: now(), lastError: "run_missing" });
      return true;
    }

    if (job.nodeKey === "creator.portfolio") {
      this.processPortfolio(run, job, workerId);
      return true;
    }
    if (job.nodeKey === "creator.enrich") {
      await this.processDetail(run, job, workerId, executor);
      return true;
    }
    if (job.nodeKey === "video.reconstruct") {
      await this.processVideoReconstruction(run, job, workerId);
      return true;
    }
    if (job.nodeKey === "creator.synthesize") {
      await this.processSynthesis(run, job, workerId);
      return true;
    }

    run.status = "preflight";
    run.currentStage = "preflight";
    run.updatedAt = leasedAt;
    run.blockers = [];
    run.nextAction = run.collectionPolicy.adapter === "ego-browser"
      ? "Worker 正在使用隔离的 ego-browser TaskSpace 验证登录和博主身份。"
      : "Worker 正在通过红狐公开数据接口验证博主身份与作品清单。";
    run.worker = { state: "running", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: leasedAt };
    stage(run, "preflight").status = "running";
    stage(run, "preflight").message = run.collectionPolicy.adapter === "ego-browser"
      ? "正在连接 hhh-01 登录态并验证主页。"
      : "正在调用红狐账号与作品接口；不会使用浏览器登录态。";
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: leasedAt });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "job.leased", createdAt: leasedAt,
      message: `任务由 ${workerId} 接管。`, payload: { attempt: job.attempts }
    });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "node.started", createdAt: leasedAt,
      message: "开始身份、登录与作品清单预检。", payload: { nodeKey: job.nodeKey }
    });

    const heartbeat = setInterval(() => {
      const at = now();
      this.repository.heartbeat(job.id, workerId, at, leaseUntil());
      const latest = this.repository.get(run.id);
      if (latest && latest.worker.jobId === job.id) {
        latest.worker.lastHeartbeatAt = at;
        latest.updatedAt = at;
        this.repository.save(latest);
      }
    }, 20_000);

    try {
      const result = await executor.acquire({
        adapter: run.collectionPolicy.adapter,
        runId: run.id,
        profileUrl: run.profileUrl,
        maxScrollRounds: run.collectionPolicy.budgets.maxScrollRounds,
        taskSpaceId: run.browserTaskSpaceId
      });
      this.applyAcquisitionResult(run, job, workerId, result);
    } catch (error) {
      this.failRun(run, job, workerId, error instanceof Error ? error.message : "采集 Worker 失败");
    } finally {
      clearInterval(heartbeat);
    }
    return true;
  }

  private applyAcquisitionResult(
    run: CreatorResearchRun,
    job: ResearchJob,
    workerId: string,
    result: CreatorAcquisitionResult
  ): void {
    const timestamp = now();
    if (result.state === "needs_user") {
      run.status = "needs_user";
      run.updatedAt = timestamp;
      run.worker = { state: "needs_user", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: timestamp };
      run.browserTaskSpaceId = result.taskSpaceId;
      run.blockers = [{ code: result.code, message: result.message, userActionRequired: true }];
      run.nextAction = "请在已交接的 ego-browser 页面完成登录或验证，然后回到这里点击继续。";
      stage(run, "preflight").status = "blocked";
      stage(run, "preflight").message = result.message;
      this.repository.save(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "needs_user", updatedAt: timestamp });
      this.repository.appendEvent({
        runId: run.id, jobId: job.id, type: "handoff.required", createdAt: timestamp,
        message: result.message, payload: { code: result.code, taskSpaceId: result.taskSpaceId }
      });
      return;
    }

    if (result.state === "blocked") {
      this.failRun(run, job, workerId, result.message, result.code);
      return;
    }

    const artifactRef = this.artifacts.write(run.id, "creator-inventory.json", {
      schemaVersion: "1.1.0",
      provider: result.provider ?? run.collectionPolicy.adapter,
      runId: run.id,
      capturedAt: timestamp,
      sourceUrl: run.profileUrl,
      finalUrl: result.finalUrl,
      creatorId: result.creatorId,
      creatorName: result.creatorName,
      stopReason: result.stopReason,
      crawlDiagnostics: result.diagnostics ?? [],
      posts: result.posts,
      warnings: result.warnings
    }, [`run:${run.id}`, ...(result.sourceRefs ?? [])]);
    const portfolioJob = this.repository.enqueue({
      id: randomUUID(), runId: run.id, nodeKey: "creator.portfolio", status: "queued",
      idempotencyKey: `${run.id}:creator.portfolio:ranked-7x3-v1`, attempts: 0, maxAttempts: 3,
      availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
      payload: { inventoryArtifactRef: artifactRef }, lastError: null, createdAt: timestamp, updatedAt: timestamp
    });
    run.status = "collecting";
    run.currentStage = "tiering";
    run.updatedAt = timestamp;
    run.creatorId = result.creatorId ?? externalCreatorId(result.finalUrl);
    run.creatorName = result.creatorName;
    if (result.publicProfile) run.publicProfile = result.publicProfile;
    run.coverage.discoveredPosts = result.posts.length;
    run.lastSnapshotAt = timestamp;
    run.inventoryArtifactRef = artifactRef;
    run.browserTaskSpaceId = result.taskSpaceId;
    run.worker = { state: "queued", attempt: 0, jobId: portfolioJob.id, workerId: null, lastHeartbeatAt: timestamp };
    run.blockers = [];
    run.nextAction = "公开作品清单已冻结；Portfolio Worker 正在计算基本盘与 High / Base / Low 统一样本。";
    stage(run, "preflight").status = "complete";
    stage(run, "preflight").message = (result.provider ?? run.collectionPolicy.adapter) === "ego-browser"
      ? "登录态与博主身份预检完成。"
      : "红狐公开账号与博主身份预检完成。";
    stage(run, "inventory").status = "complete";
    stage(run, "inventory").message = `发现 ${result.posts.length} 条公开作品；停止原因：${result.stopReason}。`;
    stage(run, "tiering").status = "pending";
    stage(run, "tiering").message = "等待从冻结清单复算统计与规范 21 条选择。";
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: timestamp });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: timestamp,
      message: "公开作品清单已写入证据仓。", payload: { artifactRef, postCount: result.posts.length }
    });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "node.completed", createdAt: timestamp,
      message: "身份预检与作品清单采集完成。", payload: { stopReason: result.stopReason }
    });
    this.repository.appendEvent({
      runId: run.id, jobId: portfolioJob.id, type: "job.queued", createdAt: timestamp,
      message: "Portfolio 分析节点已进入持久队列。", payload: { nodeKey: portfolioJob.nodeKey }
    });
  }

  private processPortfolio(run: CreatorResearchRun, job: ResearchJob, workerId: string): void {
    const timestamp = now();
    run.status = "collecting";
    run.currentStage = "tiering";
    run.updatedAt = timestamp;
    run.blockers = [];
    run.nextAction = "正在从冻结清单复算全量统计、基本盘锚点与统一 21 条选择。";
    run.worker = { state: "running", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: timestamp };
    stage(run, "tiering").status = "running";
    stage(run, "tiering").message = "统计已知点赞覆盖率；未知值不会按 0 处理。";
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: timestamp });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "job.leased", createdAt: timestamp,
      message: `Portfolio 节点由 ${workerId} 接管。`, payload: { attempt: job.attempts }
    });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "node.started", createdAt: timestamp,
      message: "开始计算表现分布与规范选择集。", payload: { nodeKey: job.nodeKey }
    });

    try {
      if (!run.inventoryArtifactRef) throw new Error("Portfolio 节点缺少作品清单 artifact");
      const inventory = this.artifacts.read(run.inventoryArtifactRef);
      const { corpus, selection } = buildCreatorPortfolio(inventory, run.inventoryArtifactRef, timestamp);
      for (const record of corpus.records) record.url = canonicalXhsPostUrl(record.externalId);
      for (const item of selection.items) item.url = canonicalXhsPostUrl(item.externalId);
      const corpusRef = this.artifacts.write(run.id, "creator-corpus.json", corpus, [run.inventoryArtifactRef]);
      selection.sourceCorpusArtifactRef = corpusRef;
      const selectionRef = this.artifacts.write(run.id, "creator-selection.json", selection, [corpusRef]);
      const analysis = creatorPortfolioAnalysisSchema.parse({
        schemaVersion: "1.0.0",
        runId: run.id,
        generatedAt: timestamp,
        corpusArtifactRef: corpusRef,
        selectionArtifactRef: selectionRef,
        metricCoverage: {
          known: corpus.denominator.likesKnown,
          missing: corpus.denominator.likesMissing,
          rate: corpus.denominator.likesCoverage
        },
        likes: corpus.likes,
        tierCounts: selection.tierCounts,
        anchors: selection.anchors,
        interpretationBoundary: "本节点回答表现分布与样本结构；内容为何爆发或失效必须等待逐条详情与视频证据。",
        unknowns: corpus.unknowns
      });
      const portfolioRef = this.artifacts.write(run.id, "corpus-analysis.json", analysis, [corpusRef, selectionRef]);
      const detailJob = this.repository.enqueue({
        id: randomUUID(), runId: run.id, nodeKey: "creator.enrich", status: "queued",
        idempotencyKey: `${run.id}:creator.enrich:${selectionRef}:0`, attempts: 0, maxAttempts: 3,
        availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
        payload: { selectionArtifactRef: selectionRef }, lastError: null, createdAt: timestamp, updatedAt: timestamp
      });
      run.status = "collecting";
      run.currentStage = "deep_capture";
      run.updatedAt = timestamp;
      run.coverage.comparisonPosts = selection.denominator.selectedPosts;
      run.portfolioArtifactRef = portfolioRef;
      run.selectionArtifactRef = selectionRef;
      run.dashboardPath = `/creator-runs/${run.id}`;
      run.worker = { state: "queued", attempt: 0, jobId: detailJob.id, workerId: null, lastHeartbeatAt: timestamp };
      run.blockers = [];
      run.nextAction = "21 条表现选择已生成；详情 Worker 正在按选择集补齐发布时间与页面正文。";
      stage(run, "tiering").status = "complete";
      stage(run, "tiering").message = `已选 ${selection.denominator.selectedPosts} 条：High ${selection.tierCounts.high} / Base ${selection.tierCounts.base} / Low ${selection.tierCounts.low}。`;
      stage(run, "deep_capture").status = "pending";
      stage(run, "deep_capture").message = `${selection.items.filter((item) => item.deepCandidate).length} 条深度候选等待内容还原。`;
      this.repository.save(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: timestamp });
      for (const [kind, artifactRef] of [["creator.corpus", corpusRef], ["creator.selection", selectionRef], ["creator.portfolio", portfolioRef]]) {
        this.repository.appendEvent({
          runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: timestamp,
          message: `${kind} artifact 已写入证据仓。`, payload: { kind, artifactRef }
        });
      }
      this.repository.appendEvent({
        runId: run.id, jobId: job.id, type: "node.completed", createdAt: timestamp,
        message: "全量统计与 High / Base / Low 规范选择完成。", payload: { selected: selection.denominator.selectedPosts }
      });
      this.repository.appendEvent({
        runId: run.id, jobId: detailJob.id, type: "job.queued", createdAt: timestamp,
        message: "选择集详情节点已进入持久队列。", payload: { nodeKey: detailJob.nodeKey }
      });
    } catch (error) {
      this.failRun(run, job, workerId, error instanceof Error ? error.message : "Portfolio 分析失败");
    }
  }

  private async processDetail(run: CreatorResearchRun, job: ResearchJob, workerId: string, executor: CreatorBrowserExecutor): Promise<void> {
    const timestamp = now();
    run.status = "collecting";
    run.currentStage = "deep_capture";
    run.updatedAt = timestamp;
    run.blockers = [];
    run.nextAction = "正在按 21 条选择集逐页补齐公开发布时间、正文和媒体类型。";
    run.worker = { state: "running", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: timestamp };
    stage(run, "deep_capture").status = "running";
    stage(run, "deep_capture").message = "详情采集限定为规范选择集，不打开全量作品。";
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: timestamp });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "job.leased", createdAt: timestamp,
      message: `详情节点由 ${workerId} 接管。`, payload: { attempt: job.attempts } });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.started", createdAt: timestamp,
      message: "开始选择集公开详情采集。", payload: { nodeKey: job.nodeKey } });
    const heartbeat = setInterval(() => {
      const at = now();
      this.repository.heartbeat(job.id, workerId, at, leaseUntil());
      const latest = this.repository.get(run.id);
      if (latest && latest.worker.jobId === job.id) {
        latest.worker.lastHeartbeatAt = at;
        latest.updatedAt = at;
        this.repository.save(latest);
      }
    }, 20_000);
    try {
      if (!run.selectionArtifactRef) throw new Error("详情节点缺少选择集 artifact");
      let selection = creatorSelectionSchema.parse(this.artifacts.read(run.selectionArtifactRef));
      const previousDetails = run.detailArtifactRef
        ? creatorDetailCollectionSchema.parse(this.artifacts.read(run.detailArtifactRef))
        : null;
      const completedIds = new Set(previousDetails?.posts.map((item) => item.externalId) ?? []);
      const pendingSelection = selection.items.filter((item) => !completedIds.has(item.externalId));
      const requestedMediaIds = Array.isArray(job.payload.mediaIds)
        ? job.payload.mediaIds.filter((value): value is string => typeof value === "string")
        : [];
      const remainingMediaIds = Array.isArray(job.payload.remainingMediaIds)
        ? job.payload.remainingMediaIds.filter((value): value is string => typeof value === "string")
        : [];
      const mediaRefresh = job.payload.mode === "media_refresh";
      const detailBatch = mediaRefresh
        ? selection.items.filter((item) => requestedMediaIds.includes(item.externalId))
        : pendingSelection.slice(0, 3);
      if (detailBatch.length === 0) throw new Error("详情节点没有待处理作品但仍被重新排队");
      let result: CreatorDetailResult = await executor.enrich({
        adapter: run.collectionPolicy.adapter,
        runId: run.id,
        profileUrl: run.profileUrl,
        creatorName: run.creatorName,
        posts: detailBatch.map((item) => ({ externalId: item.externalId, url: canonicalXhsPostUrl(item.externalId), title: item.title,
          resolveMedia: mediaRefresh || item.deepCandidate })),
        taskSpaceId: run.browserTaskSpaceId,
        closeWhenDone: mediaRefresh && remainingMediaIds.length === 0
      });
      const completedAt = now();
      if (result.state === "needs_user") {
        run.status = "needs_user";
        run.updatedAt = completedAt;
        run.browserTaskSpaceId = result.taskSpaceId;
        run.worker = { state: "needs_user", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [{ code: result.code, message: result.message, userActionRequired: true }];
        run.nextAction = result.code === "detail_navigation_required"
          ? result.message
          : "请完成详情页面的登录或验证，然后回到任务台继续。";
        stage(run, "deep_capture").status = "blocked";
        stage(run, "deep_capture").message = result.message;
        this.repository.save(run);
        this.repository.updateJobStatus({ jobId: job.id, status: "needs_user", updatedAt: completedAt });
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "handoff.required", createdAt: completedAt,
          message: result.message, payload: { code: result.code, taskSpaceId: result.taskSpaceId,
            navigationDiagnostic: result.navigationDiagnostic ?? null } });
        return;
      }
      if (result.state === "blocked") {
        if (result.retryable && job.attempts < 2) {
          run.status = "backoff";
          run.updatedAt = completedAt;
          run.worker = { state: "backoff", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: completedAt };
          run.blockers = [{ code: result.code, message: result.message, userActionRequired: false }];
          run.nextAction = "内部 canonical/fallback 导航将自动恢复一次；不要求用户接管，也不重抓基本盘。";
          stage(run, "deep_capture").status = "pending";
          stage(run, "deep_capture").message = result.message;
          this.repository.save(run);
          this.repository.updateJobStatus({ jobId: job.id, status: "backoff", updatedAt: completedAt, lastError: result.message });
          this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.progress", createdAt: completedAt,
            message: "详情导航归因为内部可恢复阻塞；将进行唯一一次任务级重试。",
            payload: { code: result.code, retry: 1, navigationDiagnostic: result.navigationDiagnostic ?? null } });
          return;
        }
        if (result.code === "page_shape_unknown" && result.navigationDiagnostic?.postExternalId && result.taskSpaceId !== null) {
          const navigationDiagnostic = result.navigationDiagnostic;
          const unavailable = detailBatch.find((item) => item.externalId === navigationDiagnostic.postExternalId) ?? detailBatch[0];
          if (!unavailable) throw new Error("详情导航失败但缺少对应选择记录");
          this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.progress", createdAt: completedAt,
            message: "目标详情在 canonical 与唯一一次 fallback 后仍不可访问；记录为未知并继续后续帖子。",
            payload: { code: result.code, navigationDiagnostic } });
          result = {
            state: "ready",
            provider: run.collectionPolicy.adapter,
            taskSpaceId: result.taskSpaceId,
            posts: [{ externalId: unavailable.externalId, finalUrl: canonicalXhsPostUrl(unavailable.externalId),
              title: unavailable.title, description: null, publishedLabel: null, mediaType: "unknown",
              videoCandidateUrl: null, coverCandidateUrl: null, inspectedAt: completedAt,
              warnings: ["detail_unavailable_after_canonical_and_single_fallback", `failure_phase:${navigationDiagnostic.phase}`] }],
            warnings: ["一条详情在有界自动恢复后仍不可访问；字段保持未知，未要求用户接管。"]
          };
        } else {
          this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.progress", createdAt: completedAt,
            message: "详情阻塞已归因，诊断随失败事件保留。",
            payload: { code: result.code, navigationDiagnostic: result.navigationDiagnostic ?? null } });
          this.failRun(run, job, workerId, result.message, result.code);
          return;
        }
      }
      const newDetailPosts = result.posts.map((post) => {
        const selected = selection.items.find((item) => item.externalId === post.externalId);
        return {
          externalId: post.externalId,
          finalUrl: post.finalUrl,
          title: post.title,
          description: post.description,
          publishedLabel: post.publishedLabel,
          mediaType: selected?.mediaType !== "unknown" ? selected?.mediaType ?? post.mediaType : post.mediaType,
          inspectedAt: post.inspectedAt,
          warnings: selected && selected.mediaType !== "unknown" && selected.mediaType !== post.mediaType
            ? [...post.warnings, `详情 DOM 判为 ${post.mediaType}，主页卡片判为 ${selected.mediaType}；暂以明确的主页播放标识为准。`]
            : post.warnings
        };
      });
      const newIds = new Set(newDetailPosts.map((item) => item.externalId));
      const mergedDetailPosts = [...(previousDetails?.posts.filter((item) => !newIds.has(item.externalId)) ?? []), ...newDetailPosts];
      const details = creatorDetailCollectionSchema.parse({
        schemaVersion: "1.0.0",
        runId: run.id,
        generatedAt: completedAt,
        sourceSelectionArtifactRef: run.selectionArtifactRef,
        requestedPosts: selection.items.length,
        inspectedPosts: mergedDetailPosts.length,
        posts: mergedDetailPosts,
        warnings: [...new Set([...(previousDetails?.warnings ?? []), ...result.warnings])],
        unknowns: [
          "公开视频详情仍不提供曝光、完播、转粉、投流和成交后台指标。",
          "封面本地证据与源视频仍需媒体解析节点单独获取和校验。"
        ]
      });
      const detailRef = this.artifacts.write(run.id, "creator-details.json", details,
        [run.selectionArtifactRef, run.detailArtifactRef].filter((ref): ref is string => Boolean(ref)));
      const deepIds = new Set(selection.items.filter((item) => item.deepCandidate).map((item) => item.externalId));
      const resolvedMedia = await this.mediaResolver.resolve({
        runId: run.id,
        posts: result.posts.map((post) => ({
          externalId: post.externalId,
          videoCandidateUrl: post.videoCandidateUrl,
          coverCandidateUrl: post.coverCandidateUrl,
          downloadVideo: deepIds.has(post.externalId)
        }))
      });
      const previousMedia = run.mediaManifestArtifactRef
        ? deepMediaManifestSchema.parse(this.artifacts.read(run.mediaManifestArtifactRef))
        : null;
      const resolvedIds = new Set(resolvedMedia.items.map((item) => item.externalId));
      const mergedMediaItems = [...(previousMedia?.items.filter((item) => !resolvedIds.has(item.externalId)) ?? []), ...resolvedMedia.items]
        .map((item) => deepIds.has(item.externalId) ? item : {
          ...item, videoRequested: false, state: "not_requested" as const, videoArtifactRef: null,
          verificationArtifactRef: null, sha256: null, bytes: null, durationSeconds: null,
          width: null, height: null, hasAudio: null,
          message: "详情核验后未进入四组深度视频集；旧版本证据保留但不再参与当前投影。"
        });
      const mediaManifest = deepMediaManifestSchema.parse({
        schemaVersion: "1.0.0", runId: run.id, generatedAt: completedAt,
        requestedPosts: mergedMediaItems.filter((item) => item.videoRequested).length,
        readyPosts: mergedMediaItems.filter((item) => item.videoRequested && item.state === "verified_complete").length,
        requestedCovers: mergedMediaItems.length,
        readyCovers: mergedMediaItems.filter((item) => item.coverState === "ready").length,
        items: mergedMediaItems,
        unknowns: [...new Set([...(previousMedia?.unknowns ?? []), ...resolvedMedia.unknowns])]
      });
      const mediaManifestRef = this.artifacts.write(run.id, "deep-media-manifest.json", mediaManifest, [detailRef]);
      if (!mediaRefresh && details.inspectedPosts < details.requestedPosts) {
        const nextJob = this.repository.enqueue({
          id: randomUUID(), runId: run.id, nodeKey: "creator.enrich", status: "queued",
          idempotencyKey: `${run.id}:creator.enrich:${run.selectionArtifactRef}:${details.inspectedPosts}`, attempts: 0, maxAttempts: 3,
          availableAt: completedAt, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
          payload: { selectionArtifactRef: run.selectionArtifactRef, completed: details.inspectedPosts }, lastError: null,
          createdAt: completedAt, updatedAt: completedAt
        });
        run.status = "collecting";
        run.updatedAt = completedAt;
        run.browserTaskSpaceId = result.taskSpaceId;
        run.detailArtifactRef = detailRef;
        run.mediaManifestArtifactRef = mediaManifestRef;
        run.coverage.enrichedPosts = details.inspectedPosts;
        run.worker = { state: "queued", attempt: 0, jobId: nextJob.id, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [];
        run.nextAction = `详情已分批保存 ${details.inspectedPosts}/${details.requestedPosts}；下一批从未完成作品继续。`;
        stage(run, "deep_capture").status = "pending";
        stage(run, "deep_capture").message = run.nextAction;
        this.repository.save(run);
        this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
          message: "详情批次与媒体证据已增量登记。", payload: { detailArtifactRef: detailRef, mediaManifestArtifactRef: mediaManifestRef, inspected: details.inspectedPosts } });
        this.repository.appendEvent({ runId: run.id, jobId: nextJob.id, type: "job.queued", createdAt: completedAt,
          message: "下一详情批次已进入持久队列。", payload: { nodeKey: nextJob.nodeKey, remaining: details.requestedPosts - details.inspectedPosts } });
        return;
      }
      if (!mediaRefresh) {
        const mediaTypes = new Map(details.posts.map((item) => [item.externalId, item.mediaType]));
        const refined = refineDeepSelectionForVerifiedVideos(selection, mediaTypes, completedAt);
        const refinedRef = this.artifacts.write(run.id, "creator-selection-video-refined.json", refined,
          [run.selectionArtifactRef, detailRef]);
        selection = refined;
        run.selectionArtifactRef = refinedRef;
        const currentMedia = new Map(mediaManifest.items.map((item) => [item.externalId, item]));
        const mediaIds = selection.items.filter((item) => item.deepCandidate && currentMedia.get(item.externalId)?.state !== "verified_complete")
          .map((item) => item.externalId);
        if (mediaIds.length > 0) {
          const [firstBatch, ...rest] = Array.from({ length: Math.ceil(mediaIds.length / 3) }, (_, index) => mediaIds.slice(index * 3, index * 3 + 3));
          const nextJob = this.repository.enqueue({
            id: randomUUID(), runId: run.id, nodeKey: "creator.enrich", status: "queued",
            idempotencyKey: `${run.id}:creator.enrich:media-refresh:${refinedRef}:0`, attempts: 0, maxAttempts: 3,
            availableAt: completedAt, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
            payload: { mode: "media_refresh", mediaIds: firstBatch ?? [], remainingMediaIds: rest.flat(), batchIndex: 0 },
            lastError: null, createdAt: completedAt, updatedAt: completedAt
          });
          run.status = "collecting";
          run.updatedAt = completedAt;
          run.browserTaskSpaceId = result.taskSpaceId;
          run.detailArtifactRef = detailRef;
          run.mediaManifestArtifactRef = mediaManifestRef;
          run.coverage.enrichedPosts = details.inspectedPosts;
          run.worker = { state: "queued", attempt: 0, jobId: nextJob.id, workerId: null, lastHeartbeatAt: completedAt };
          run.blockers = [];
          run.nextAction = `媒体类型已核验并重算四组深样本；正在补取 ${mediaIds.length} 条视频媒体。`;
          stage(run, "deep_capture").status = "pending";
          stage(run, "deep_capture").message = run.nextAction;
          this.repository.save(run);
          this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
          this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
            message: "详情核验后的四组视频选样已登记。", payload: { artifactRef: refinedRef, deepCount: mediaIds.length } });
          this.repository.appendEvent({ runId: run.id, jobId: nextJob.id, type: "job.queued", createdAt: completedAt,
            message: "深度视频媒体补取已进入持久队列。", payload: { nodeKey: nextJob.nodeKey, remaining: mediaIds.length } });
          return;
        }
      } else if (remainingMediaIds.length > 0) {
        const nextIds = remainingMediaIds.slice(0, 3);
        const rest = remainingMediaIds.slice(3);
        const batchIndex = typeof job.payload.batchIndex === "number" ? job.payload.batchIndex + 1 : 1;
        const nextJob = this.repository.enqueue({
          id: randomUUID(), runId: run.id, nodeKey: "creator.enrich", status: "queued",
          idempotencyKey: `${run.id}:creator.enrich:media-refresh:${run.selectionArtifactRef}:${batchIndex}`,
          attempts: 0, maxAttempts: 3, availableAt: completedAt, leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null,
          payload: { mode: "media_refresh", mediaIds: nextIds, remainingMediaIds: rest, batchIndex },
          lastError: null, createdAt: completedAt, updatedAt: completedAt
        });
        run.status = "collecting";
        run.updatedAt = completedAt;
        run.browserTaskSpaceId = result.taskSpaceId;
        run.detailArtifactRef = detailRef;
        run.mediaManifestArtifactRef = mediaManifestRef;
        run.worker = { state: "queued", attempt: 0, jobId: nextJob.id, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [];
        run.nextAction = `深度媒体分批保存；剩余 ${remainingMediaIds.length} 条继续补取。`;
        stage(run, "deep_capture").status = "pending";
        stage(run, "deep_capture").message = run.nextAction;
        this.repository.save(run);
        this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
        this.repository.appendEvent({ runId: run.id, jobId: nextJob.id, type: "job.queued", createdAt: completedAt,
          message: "下一媒体补取批次已进入持久队列。", payload: { nodeKey: nextJob.nodeKey, remaining: remainingMediaIds.length } });
        return;
      }
      const mediaById = new Map(mediaManifest.items.map((item) => [item.externalId, item]));
      const deepItems = selection.items.filter((item) => item.deepCandidate);
      const previousBatchRef = mediaRefresh ? run.reconstructionBatchArtifactRef : null;
      const previousBatch = previousBatchRef
        ? videoReconstructionBatchSchema.parse(this.artifacts.read(previousBatchRef))
        : null;
      const previousItems = new Map(previousBatch?.items.map((item) => [item.postExternalId, item]) ?? []);
      const batchItems = deepItems.map((item) => {
        const previous = previousItems.get(item.externalId);
        if (previous?.state === "ready") return previous;
        const media = mediaById.get(item.externalId);
        const verified = media?.state === "verified_complete" && Boolean(media.videoArtifactRef);
        return { postExternalId: item.externalId, tier: item.tier, tierRank: item.tierRank,
          state: verified ? "queued" as const : "blocked" as const, sourceMediaArtifactRef: media?.videoArtifactRef ?? null,
          reconstructionArtifactRef: null, articleArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
          threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
          failedGateIds: verified ? [] : ["media_verification"],
          message: verified ? "等待独立视频重建 Worker。" : media?.message ?? "深度候选缺少可验证媒体。", updatedAt: completedAt };
      });
      const revision = previousBatch ? previousBatch.revision + 1 : 0;
      const batch = videoReconstructionBatchSchema.parse({
        schemaVersion: "1.0.0", creatorRunId: run.id, revision, generatedAt: completedAt,
        requestedPosts: batchItems.length,
        readyPosts: batchItems.filter((item) => item.state === "ready").length,
        pendingPosts: batchItems.filter((item) => ["queued", "running"].includes(item.state)).length,
        failedPosts: batchItems.filter((item) => ["not_ready", "blocked"].includes(item.state)).length,
        items: batchItems,
        limitations: [...new Set([
          ...(previousBatch?.limitations ?? []),
          "每条视频只做一次独立评估；内容缺口保留为质量提醒，只有媒体或产物损坏才阻断。"
        ])]
      });
      const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${revision}.json`, batch,
        [run.selectionArtifactRef, detailRef, mediaManifestRef, previousBatchRef].filter((ref): ref is string => Boolean(ref)));
      const queuedJobs = batch.items.filter((item) => item.state === "queued").map((item) => {
        const selected = selection.items.find((candidate) => candidate.externalId === item.postExternalId);
        if (!selected || !item.sourceMediaArtifactRef) throw new Error(`视频任务 ${item.postExternalId} 缺少选择或媒体引用`);
        return this.repository.enqueue({
          id: randomUUID(), runId: run.id, nodeKey: "video.reconstruct", status: "queued",
          idempotencyKey: `${run.id}:video.reconstruct:${item.postExternalId}:${item.sourceMediaArtifactRef}`,
          attempts: 0, maxAttempts: 2, availableAt: completedAt, leaseOwner: null, leaseExpiresAt: null,
          heartbeatAt: null, payload: { postExternalId: item.postExternalId, sourceUrl: canonicalXhsPostUrl(item.postExternalId),
            sourceMediaArtifactRef: item.sourceMediaArtifactRef }, lastError: null, createdAt: completedAt, updatedAt: completedAt
        });
      });
      run.updatedAt = completedAt;
      run.browserTaskSpaceId = null;
      run.detailArtifactRef = detailRef;
      run.mediaManifestArtifactRef = mediaManifestRef;
      run.reconstructionBatchArtifactRef = batchRef;
      run.coverage.enrichedPosts = details.inspectedPosts;
      run.videoWork = { concurrencyLimit: videoConcurrency(), activePostExternalIds: [], queuedPosts: queuedJobs.length,
        analyzedPosts: batch.readyPosts, failedPosts: batch.failedPosts };
      const synthesisQueued = queuedJobs.length === 0 && this.queueSynthesis(run, batchRef, batch, selection, completedAt);
      if (!synthesisQueued) {
        run.status = queuedJobs.length > 0 ? "collecting" : "reviewable";
        run.worker = queuedJobs.length > 0
          ? { state: "queued", attempt: 0, jobId: queuedJobs[0]?.id ?? null, workerId: null, lastHeartbeatAt: completedAt }
          : { state: "succeeded", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: completedAt };
        run.blockers = [{ code: "video_reconstruction_pending",
          message: `${mediaManifest.readyPosts}/${mediaManifest.requestedPosts} 条深度候选已完成本地媒体验证；内容还原与机制分析仍未完成。`, userActionRequired: false }];
        run.nextAction = queuedJobs.length > 0
          ? `公开详情与媒体已经可复核；${queuedJobs.length} 条视频重建已进入持久队列。`
          : "没有新增深度候选通过媒体验证；不可得视频的内容原因保持未知。";
        stage(run, "deep_capture").status = "pending";
        stage(run, "deep_capture").message = `已补齐 ${details.inspectedPosts}/${details.requestedPosts} 条页面详情；媒体就绪 ${mediaManifest.readyPosts}/${mediaManifest.requestedPosts}，内容还原待执行。`;
      }
      this.repository.save(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
        message: "选择集详情 artifact 已写入证据仓。", payload: { artifactRef: detailRef, inspectedPosts: details.inspectedPosts } });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
        message: "深度候选本地媒体清单已写入证据仓。", payload: { artifactRef: mediaManifestRef, readyPosts: mediaManifest.readyPosts } });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
        message: "视频重建批次已经冻结。", payload: { artifactRef: batchRef, queuedPosts: queuedJobs.length } });
      for (const queued of queuedJobs) this.repository.appendEvent({ runId: run.id, jobId: queued.id, type: "job.queued", createdAt: completedAt,
        message: "深度视频重建已进入持久队列。", payload: { nodeKey: queued.nodeKey } });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: completedAt,
        message: "选择集公开详情采集完成。", payload: { requested: details.requestedPosts, inspected: details.inspectedPosts } });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "run.reviewable", createdAt: completedAt,
        message: "Portfolio 与公开详情已可复核；视频机制保持未完成。", payload: {} });
    } catch (error) {
      this.failRun(run, job, workerId, error instanceof Error ? error.message : "详情采集失败");
    } finally {
      clearInterval(heartbeat);
    }
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

  private async processVideoReconstruction(run: CreatorResearchRun, job: ResearchJob, workerId: string): Promise<void> {
    const startedAt = now();
    run = this.repository.get(run.id) ?? run;
    if (!run.reconstructionBatchArtifactRef) return this.failRun(run, job, workerId, "视频节点缺少批次 artifact");
    const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef));
    const postExternalId = typeof job.payload.postExternalId === "string" ? job.payload.postExternalId : null;
    const sourceUrl = typeof job.payload.sourceUrl === "string" ? job.payload.sourceUrl : null;
    const sourceMediaArtifactRef = typeof job.payload.sourceMediaArtifactRef === "string" ? job.payload.sourceMediaArtifactRef : null;
    const item = batch.items.find((candidate) => candidate.postExternalId === postExternalId);
    if (!postExternalId || !sourceUrl || !item) {
      return this.failRun(run, job, workerId, "视频节点 payload 与批次不一致");
    }
    if (!sourceMediaArtifactRef) {
      if (item.sourceMediaArtifactRef) return this.failRun(run, job, workerId, "视频节点 payload 与批次不一致");
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: startedAt,
        lastError: "superseded_by_media_refresh" });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: startedAt,
        message: "缺少媒体的旧视频任务已由定向媒体补取替代。",
        payload: { postExternalId, state: "superseded", idempotent: true } });
      return;
    }
    if (item.state === "ready") {
      run.videoWork = { ...run.videoWork,
        activePostExternalIds: run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId),
        analyzedPosts: batch.readyPosts, failedPosts: batch.failedPosts,
        queuedPosts: Math.max(0, batch.pendingPosts - run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId).length) };
      this.repository.save(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: startedAt });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: startedAt,
        message: "视频结果已存在，跳过重复执行。", payload: { postExternalId, state: "ready", idempotent: true } });
      return;
    }
    run.status = "collecting";
    run.currentStage = "deep_capture";
    run.updatedAt = startedAt;
    run.worker = { state: "running", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: startedAt };
    run.nextAction = `正在重建深度视频 ${postExternalId}；候选与独立 evaluator 分开运行。`;
    stage(run, "deep_capture").status = "running";
    stage(run, "deep_capture").message = `已通过硬闸 ${batch.readyPosts}/${batch.requestedPosts}；正在处理 ${postExternalId}。`;
    item.state = "running";
    item.updatedAt = startedAt;
    run.videoWork = {
      concurrencyLimit: videoConcurrency(),
      activePostExternalIds: [...new Set([...run.videoWork.activePostExternalIds, postExternalId])],
      queuedPosts: Math.max(0, batch.pendingPosts - new Set([...run.videoWork.activePostExternalIds, postExternalId]).size),
      analyzedPosts: batch.readyPosts,
      failedPosts: batch.failedPosts
    };
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: startedAt });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.started", createdAt: startedAt,
      message: "开始单轮视频内容还原与独立评测。", payload: { postExternalId } });
    let lastSubstage = "runner_start";
    const heartbeat = setInterval(() => {
      const at = now();
      this.repository.heartbeat(job.id, workerId, at, leaseUntil(180));
      const reconstructionRoot = path.join(runArtifactDir(run.id), "video-reconstructions", postExternalId);
      const substage = fs.existsSync(path.join(reconstructionRoot, "gate-report.json")) ? "gate_report"
        : fs.existsSync(path.join(reconstructionRoot, "evaluation.json")) ? "independent_evaluation"
          : fs.existsSync(path.join(reconstructionRoot, "reconstruction.json")) ? "structured_reconstruction"
            : fs.existsSync(path.join(reconstructionRoot, "targeted-evidence", "targeted-evidence.json")) ? "targeted_capture"
              : fs.existsSync(path.join(reconstructionRoot, "capture-protocol.json")) ? "capture_protocol"
                : fs.existsSync(path.join(reconstructionRoot, "probe.json")) ? "round_one_probe"
                  : fs.existsSync(path.join(reconstructionRoot, "evidence", "evidence-pack.json")) ? "evidence_pack" : "runner_start";
      if (substage !== lastSubstage) {
        lastSubstage = substage;
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.progress", createdAt: at,
          message: `视频重建进入 ${substage}。`, payload: { postExternalId, substage } });
      }
      const latest = this.repository.get(run.id);
      if (latest?.worker.jobId === job.id) {
        latest.worker.lastHeartbeatAt = at; latest.updatedAt = at;
        stage(latest, "deep_capture").message = `${postExternalId} · ${substage} · 已通过 ${latest.coverage.reconstructedPosts}/${batch.requestedPosts}`;
        this.repository.save(latest);
      }
    }, 20_000);
    try {
      const request = videoReconstructionRequestSchema.parse({ runId: job.id, creatorRunId: run.id,
        postExternalId, sourceUrl, sourceMediaArtifactRef, evidencePackArtifactRef: null,
        contractVersion: "video-content-reconstruction@1" });
      const outcome: VideoReconstructionOutcome = await this.videoReconstructor.reconstruct(request, (event) => {
        const eventType = `child.${event.status}` as CreatorResearchEvent["type"];
        this.repository.appendEvent({
          runId: run.id,
          jobId: job.id,
          type: eventType,
          createdAt: event.lastProgressAt,
          message: `${videoChildRoleLabel[event.role]}${videoChildStatusLabel[event.status]}。`,
          payload: {
            postExternalId,
            childRunId: event.childRunId,
            role: event.role,
            status: event.status,
            startedAt: event.startedAt,
            lastProgressAt: event.lastProgressAt,
            inputRevision: event.inputRevision,
            outputArtifactRevisions: event.outputArtifactRevisions,
            errorCode: event.errorCode
          }
        });
        const latest = this.repository.get(run.id);
        if (latest?.worker.jobId === job.id) {
          latest.updatedAt = event.lastProgressAt;
          stage(latest, "deep_capture").message = `${postExternalId} · ${videoChildRoleLabel[event.role]}${videoChildStatusLabel[event.status]} · 已通过 ${latest.coverage.reconstructedPosts}/${batch.requestedPosts}`;
          this.repository.save(latest);
        }
      });
      const completedAt = now();
      const latestRun = this.repository.get(run.id);
      if (!latestRun?.reconstructionBatchArtifactRef) throw new Error("视频批次在执行期间丢失注册指针");
      run = latestRun;
      const previousBatchRef = latestRun.reconstructionBatchArtifactRef;
      const latestBatch = videoReconstructionBatchSchema.parse(this.artifacts.read(previousBatchRef));
      for (const item of latestBatch.items) {
        if (item.message.startsWith("已完成单轮还原与评估")) item.evaluationPolicy = "single_pass@37a03aae";
      }
      const latestItem = latestBatch.items.find((candidate) => candidate.postExternalId === postExternalId);
      if (!latestItem) throw new Error("视频批次在执行期间丢失对应记录");
      const runtimeThreeLensComplete = outcome.state === "ready" && Boolean(
        outcome.threeLensEvaluationArtifactRef && outcome.threeLensGateReportArtifactRef && outcome.threeLensGateCount === 19
      );
      if (outcome.state === "ready" && runtimeThreeLensComplete) Object.assign(latestItem, { state: "ready", reconstructionArtifactRef: outcome.reconstructionArtifactRef,
        articleArtifactRef: outcome.articleArtifactRef, evaluationArtifactRef: outcome.evaluationArtifactRef,
        gateReportArtifactRef: outcome.gateReportArtifactRef,
        threeLensEvaluationArtifactRef: outcome.threeLensEvaluationArtifactRef ?? null,
        threeLensGateReportArtifactRef: outcome.threeLensGateReportArtifactRef ?? null,
        evaluationPolicy: "single_pass@37a03aae", failedGateIds: outcome.qualityWarningGateIds,
        message: outcome.qualityWarningGateIds.length > 0
          ? `已完成单轮还原与评估；${outcome.qualityWarningGateIds.length} 项质量提醒保留在研究边界中。`
          : "已完成单轮还原与评估；未发现质量提醒。", updatedAt: completedAt });
      else if (outcome.state === "ready") Object.assign(latestItem, { state: "not_ready",
        reconstructionArtifactRef: outcome.reconstructionArtifactRef, articleArtifactRef: outcome.articleArtifactRef,
        evaluationArtifactRef: outcome.evaluationArtifactRef, gateReportArtifactRef: outcome.gateReportArtifactRef,
        threeLensEvaluationArtifactRef: outcome.threeLensEvaluationArtifactRef ?? null,
        threeLensGateReportArtifactRef: outcome.threeLensGateReportArtifactRef ?? null,
        failedGateIds: ["runtime_three_lens_artifacts_missing"],
        message: "通用视频评测已通过，但运行时三镜头评测 artifact 不完整；该视频保持未就绪。", updatedAt: completedAt });
      else if (outcome.state === "not_ready") Object.assign(latestItem, { state: "not_ready",
        reconstructionArtifactRef: outcome.reconstructionArtifactRef, evaluationArtifactRef: outcome.evaluationArtifactRef,
        gateReportArtifactRef: outcome.gateReportArtifactRef ?? null,
        threeLensEvaluationArtifactRef: outcome.threeLensEvaluationArtifactRef ?? null,
        threeLensGateReportArtifactRef: outcome.threeLensGateReportArtifactRef ?? null,
        failedGateIds: outcome.failedGateIds, message: outcome.message, updatedAt: completedAt });
      else Object.assign(latestItem, { state: "blocked", failedGateIds: [outcome.code], message: outcome.message, updatedAt: completedAt });
      latestBatch.revision += 1;
      latestBatch.generatedAt = completedAt;
      latestBatch.readyPosts = latestBatch.items.filter((candidate) => candidate.state === "ready").length;
      latestBatch.pendingPosts = latestBatch.items.filter((candidate) => ["queued", "running"].includes(candidate.state)).length;
      latestBatch.failedPosts = latestBatch.items.filter((candidate) => ["not_ready", "blocked"].includes(candidate.state)).length;
      const batchDependencies = [previousBatchRef, ...latestBatch.items.flatMap((item) => [
        item.reconstructionArtifactRef, item.evaluationArtifactRef, item.gateReportArtifactRef,
        item.threeLensEvaluationArtifactRef, item.threeLensGateReportArtifactRef
      ])].filter((ref): ref is string => Boolean(ref));
      const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${latestBatch.revision}.json`, latestBatch,
        batchDependencies);
      run.reconstructionBatchArtifactRef = batchRef;
      run.coverage.reconstructedPosts = latestBatch.readyPosts;
      run.updatedAt = completedAt;
      const activePostExternalIds = run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId);
      run.videoWork = {
        concurrencyLimit: videoConcurrency(),
        activePostExternalIds,
        queuedPosts: Math.max(0, latestBatch.pendingPosts - activePostExternalIds.length),
        analyzedPosts: latestBatch.readyPosts,
        failedPosts: latestBatch.failedPosts
      };
      this.repository.updateJobStatus({ jobId: job.id, status: outcome.state === "blocked" && outcome.userActionRequired ? "needs_user" : "succeeded",
        updatedAt: completedAt, lastError: outcome.state === "ready" ? null : outcome.message });
      if (outcome.state === "blocked" && outcome.userActionRequired) {
        run.status = "needs_user";
        run.worker = { state: "needs_user", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [{ code: outcome.code, message: outcome.message, userActionRequired: true }];
        run.nextAction = "请恢复本地 Codex Runner 后点击继续；已完成的视频不会重跑。";
        stage(run, "deep_capture").status = "blocked";
      } else if (latestBatch.pendingPosts > 0) {
        run.status = "collecting";
        run.worker = { state: "queued", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [];
        run.nextAction = `深度视频已通过 ${latestBatch.readyPosts}/${latestBatch.requestedPosts}，后台继续处理剩余 ${latestBatch.pendingPosts} 条。`;
        stage(run, "deep_capture").message = run.nextAction;
      } else {
        run.status = "reviewable";
        run.worker = { state: "succeeded", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: completedAt };
        const selection = run.selectionArtifactRef
          ? creatorSelectionSchema.parse(this.artifacts.read(run.selectionArtifactRef))
          : null;
        if (!selection || !this.queueSynthesis(run, batchRef, latestBatch, selection, completedAt)) {
          run.blockers = [{ code: "video_reconstruction_incomplete",
            message: `${latestBatch.readyPosts}/${latestBatch.requestedPosts} 条通过；${latestBatch.failedPosts} 条未通过，不能发布完整机制归纳。`, userActionRequired: false }];
          run.nextAction = "请查看未通过视频的 failedGateIds；修复后才进入博主综合归纳。";
          stage(run, "deep_capture").status = "blocked";
          stage(run, "deep_capture").message = run.blockers[0]?.message ?? null;
        }
      }
      this.repository.save(run);
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
        message: "视频重建批次 revision 已更新。", payload: { artifactRef: batchRef, postExternalId, state: outcome.state } });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: completedAt,
        message: outcome.state === "ready" ? "视频已完成单轮还原与独立评估。" : "视频未进入下游机制归纳。",
        payload: { postExternalId, state: outcome.state } });
    } catch (error) {
      this.recordVideoExecutionFailure(run.id, job, workerId, postExternalId,
        error instanceof Error ? error.message : "视频重建节点失败");
    } finally { clearInterval(heartbeat); }
  }

  private recordVideoExecutionFailure(runId: string, job: ResearchJob, workerId: string, postExternalId: string, message: string): void {
    const timestamp = now();
    const run = this.repository.get(runId);
    if (!run?.reconstructionBatchArtifactRef) return this.failRun(run ?? this.repository.get(job.runId)!, job, workerId, message);
    const previousBatchRef = run.reconstructionBatchArtifactRef;
    const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(previousBatchRef));
    const item = batch.items.find((candidate) => candidate.postExternalId === postExternalId);
    if (!item) return this.failRun(run, job, workerId, message);
    Object.assign(item, { state: "not_ready", failedGateIds: ["video_execution_failed"],
      message: `视频执行基础设施失败：${message}`, updatedAt: timestamp });
    batch.revision += 1;
    batch.generatedAt = timestamp;
    batch.readyPosts = batch.items.filter((candidate) => candidate.state === "ready").length;
    batch.pendingPosts = batch.items.filter((candidate) => ["queued", "running"].includes(candidate.state)).length;
    batch.failedPosts = batch.items.filter((candidate) => ["not_ready", "blocked"].includes(candidate.state)).length;
    const dependencies = [previousBatchRef, ...batch.items.flatMap((candidate) => [
      candidate.reconstructionArtifactRef, candidate.evaluationArtifactRef, candidate.gateReportArtifactRef,
      candidate.threeLensEvaluationArtifactRef, candidate.threeLensGateReportArtifactRef
    ])].filter((ref): ref is string => Boolean(ref));
    const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${batch.revision}.json`, batch, dependencies);
    const activePostExternalIds = run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId);
    run.reconstructionBatchArtifactRef = batchRef;
    run.coverage.reconstructedPosts = batch.readyPosts;
    run.updatedAt = timestamp;
    run.videoWork = { concurrencyLimit: videoConcurrency(), activePostExternalIds,
      queuedPosts: Math.max(0, batch.pendingPosts - activePostExternalIds.length), analyzedPosts: batch.readyPosts, failedPosts: batch.failedPosts };
    run.blockers = [{ code: "video_reconstruction_incomplete",
      message: `${batch.readyPosts}/${batch.requestedPosts} 条完成；${batch.failedPosts} 条基础设施失败。`, userActionRequired: false }];
    if (batch.pendingPosts > 0) {
      run.status = "collecting";
      run.worker = { state: "queued", attempt: 0, jobId: null, workerId: null, lastHeartbeatAt: timestamp };
      run.nextAction = `${batch.readyPosts} 条完成，${batch.pendingPosts} 条继续执行；失败项稍后可单独重试。`;
      stage(run, "deep_capture").status = "running";
    } else {
      run.status = "reviewable";
      run.worker = { state: "failed", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: timestamp };
      run.nextAction = "仅重试失败视频；已完成视频不会重跑。";
      stage(run, "deep_capture").status = "blocked";
    }
    stage(run, "deep_capture").message = run.blockers[0]?.message ?? message;
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "failed", updatedAt: timestamp, lastError: message });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: timestamp,
      message: "视频失败状态已原子合并到新批次 revision。", payload: { artifactRef: batchRef, postExternalId, state: "not_ready" } });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: timestamp,
      message: "视频执行失败；其他视频继续，当前项可独立重试。", payload: { postExternalId, state: "not_ready" } });
  }

  private async processSynthesis(run: CreatorResearchRun, job: ResearchJob, workerId: string): Promise<void> {
    const startedAt = now();
    if (!run.portfolioArtifactRef || !run.selectionArtifactRef || !run.detailArtifactRef || !run.reconstructionBatchArtifactRef) {
      return this.failRun(run, job, workerId, "博主归纳缺少固定输入 artifact");
    }
    run.status = "collecting";
    run.currentStage = "synthesis";
    run.updatedAt = startedAt;
    run.worker = { state: "running", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: startedAt };
    run.blockers = [];
    run.nextAction = "正在归纳账号定位、用户价值、内容系统与 High / Base / Low 表现差异。";
    stage(run, "synthesis").status = "running";
    stage(run, "synthesis").message = "研究区不会生成我们的发帖建议。";
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: startedAt });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.started", createdAt: startedAt,
      message: "开始博主级证据归纳。", payload: { nodeKey: job.nodeKey } });
    const heartbeat = setInterval(() => {
      const at = now();
      this.repository.heartbeat(job.id, workerId, at, leaseUntil(180));
      const latest = this.repository.get(run.id);
      if (latest?.worker.jobId === job.id) { latest.worker.lastHeartbeatAt = at; latest.updatedAt = at; this.repository.save(latest); }
    }, 20_000);
    try {
      const outcome = await this.synthesisExecutor.synthesize({ creatorRunId: run.id, creatorName: run.creatorName,
        portfolioArtifactRef: run.portfolioArtifactRef, selectionArtifactRef: run.selectionArtifactRef,
        detailArtifactRef: run.detailArtifactRef, reconstructionBatchArtifactRef: run.reconstructionBatchArtifactRef }, (event) => {
        const eventType = `child.${event.status}` as CreatorResearchEvent["type"];
        this.repository.appendEvent({
          runId: run.id,
          jobId: job.id,
          type: eventType,
          createdAt: event.lastProgressAt,
          message: `${synthesisChildRoleLabel[event.role]}${videoChildStatusLabel[event.status]}。`,
          payload: {
            childRunId: event.childRunId,
            role: event.role,
            status: event.status,
            startedAt: event.startedAt,
            lastProgressAt: event.lastProgressAt,
            inputRevision: event.inputRevision,
            outputArtifactRevisions: event.outputArtifactRevisions,
            errorCode: event.errorCode
          }
        });
        const latest = this.repository.get(run.id);
        if (latest?.worker.jobId === job.id) {
          latest.updatedAt = event.lastProgressAt;
          stage(latest, "synthesis").message = `${synthesisChildRoleLabel[event.role]}${videoChildStatusLabel[event.status]}。`;
          this.repository.save(latest);
        }
      });
      const completedAt = now();
      run.updatedAt = completedAt;
      if (outcome.state === "ready") {
        run.status = "ready";
        run.synthesisArtifactRef = outcome.synthesisArtifactRef;
        run.synthesisGateArtifactRef = outcome.gateArtifactRef;
        run.worker = { state: "succeeded", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: completedAt };
        run.blockers = [];
        run.nextAction = "单博主研究已发布到同一个 Dashboard；创作建议仍属于独立工作区。";
        run.dashboardPath = `/creators/${encodeURIComponent(run.creatorId ?? run.id)}`;
        stage(run, "synthesis").status = "complete";
        stage(run, "synthesis").message = "21 条逐条分析与账号级归纳通过研究硬闸。";
        stage(run, "dashboard").status = "complete";
        stage(run, "dashboard").message = "动态 Dashboard projection 已可读取。";
        this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
          message: "博主级归纳与 gate 已写入证据仓。", payload: { synthesisArtifactRef: outcome.synthesisArtifactRef, gateArtifactRef: outcome.gateArtifactRef } });
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "run.reviewable", createdAt: completedAt,
          message: "单博主研究闭环已通过并发布。", payload: {} });
      } else if (outcome.state === "blocked" && outcome.userActionRequired) {
        run.status = "needs_user";
        run.worker = { state: "needs_user", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [{ code: "synthesis_runner_unavailable", message: outcome.message, userActionRequired: true }];
        run.nextAction = "请恢复本地 Codex Runner 后继续；视频重建与媒体不会重跑。";
        stage(run, "synthesis").status = "blocked";
        stage(run, "synthesis").message = outcome.message;
        this.repository.updateJobStatus({ jobId: job.id, status: "needs_user", updatedAt: completedAt, lastError: outcome.message });
      } else {
        const failed = outcome.state === "not_ready" ? outcome.failedGateIds : ["synthesis_blocked"];
        const message = outcome.state === "not_ready" ? outcome.message : outcome.message;
        run.status = "reviewable";
        if (outcome.state === "not_ready") {
          run.synthesisArtifactRef = outcome.synthesisArtifactRef;
          run.synthesisGateArtifactRef = outcome.gateArtifactRef;
        }
        run.worker = { state: "failed", attempt: job.attempts, jobId: job.id, workerId: null, lastHeartbeatAt: completedAt };
        run.blockers = [{ code: "creator_synthesis_not_ready", message: `${message} (${failed.join(", ")})`, userActionRequired: false }];
        run.nextAction = "博主归纳没有发布；请按 failedGateIds 修复证据或研究边界。";
        stage(run, "synthesis").status = "failed";
        stage(run, "synthesis").message = message;
        this.repository.updateJobStatus({ jobId: job.id, status: "failed", updatedAt: completedAt, lastError: message });
      }
      this.repository.save(run);
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: completedAt,
        message: outcome.state === "ready" ? "博主级归纳通过硬闸。" : "博主级归纳未发布。", payload: { state: outcome.state } });
    } catch (error) {
      this.failRun(run, job, workerId, error instanceof Error ? error.message : "博主归纳节点失败");
    } finally { clearInterval(heartbeat); }
  }

  private failRun(run: CreatorResearchRun, job: ResearchJob, workerId: string, message: string, code = "worker_failed"): void {
    const timestamp = now();
    run.status = "failed";
    run.updatedAt = timestamp;
    run.worker = { state: "failed", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: timestamp };
    run.blockers = [{ code, message, userActionRequired: false }];
    run.nextAction = "失败状态已保留，可从 Dashboard 重试；系统没有补造采集结果。";
    const failedStage = job.nodeKey === "creator.portfolio" ? "tiering"
      : ["creator.enrich", "video.reconstruct"].includes(job.nodeKey) ? "deep_capture"
        : job.nodeKey === "creator.synthesize" ? "synthesis" : "preflight";
    stage(run, failedStage).status = "failed";
    stage(run, failedStage).message = message;
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "failed", updatedAt: timestamp, lastError: message });
    this.repository.appendEvent({
      runId: run.id, jobId: job.id, type: "run.failed", createdAt: timestamp,
      message, payload: { code }
    });
  }

  close(): void { this.repository.close(); }
}
