import { randomUUID } from "node:crypto";
import {
  type CreatorResearchEvent,
  type CreatorResearchRun
} from "../../../contracts/index.js";
import type { CreatorResearchRepository } from "./repository.js";
import type { CreatorArtifactStore } from "./artifact-store.js";
import {
  creatorPortfolioAnalysisSchema,
  buildCreatorPortfolioAnnotations,
  creatorSelectionSchema,
  videoReconstructionRequestSchema,
  videoReconstructionBatchSchema,
  creatorSynthesisGateSchema,
  creatorSynthesisSchema,
  type ResearchJob,
  type VideoReconstructionExecutor,
  type VideoReconstructionLifecycleEvent,
  type VideoReconstructionOutcome,
  type CreatorSynthesisExecutor,
  type CreatorResearchCompletionPort,
  type CreatorSynthesisLifecycleEvent
} from "../../index.js";
import { creatorSynthesisCoverage } from "./synthesis-coverage.js";
function now(): string { return new Date().toISOString(); }

function leaseUntil(seconds = 90): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function stage(run: CreatorResearchRun, id: CreatorResearchRun["stages"][number]["id"]) {
  const value = run.stages.find((entry) => entry.id === id);
  if (!value) throw new Error(`missing creator stage ${id}`);
  return value;
}

function isVerifiedVideoState(state: string): boolean {
  return state === "verified" || state === "ready";
}

function isBuiltVideoState(state: string): boolean {
  return state === "built_unevaluated" || state === "evaluated_with_findings" || isVerifiedVideoState(state);
}

function refreshBatchCounts(batch: ReturnType<typeof videoReconstructionBatchSchema.parse>): void {
  batch.builtPosts = batch.items.filter((item) => isBuiltVideoState(item.state)).length;
  batch.verifiedPosts = batch.items.filter((item) => isVerifiedVideoState(item.state)).length;
  batch.readyPosts = batch.verifiedPosts;
  batch.pendingPosts = batch.items.filter((item) => ["queued", "running"].includes(item.state)).length;
  batch.failedPosts = batch.items.filter((item) => ["not_ready", "blocked"].includes(item.state)).length;
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
export class CreatorResearchVideoSynthesisProcessor {
  constructor(
    private readonly repository: CreatorResearchRepository,
    private readonly artifacts: CreatorArtifactStore,
    private readonly videoReconstructor: VideoReconstructionExecutor,
    private readonly synthesisExecutor: CreatorSynthesisExecutor,
    private readonly videoConcurrencyLimit: number,
    private readonly completionPort?: CreatorResearchCompletionPort
  ) {}

  private queueSynthesis(
    run: CreatorResearchRun,
    batchRef: string,
    batch: ReturnType<typeof videoReconstructionBatchSchema.parse>,
    selection: ReturnType<typeof creatorSelectionSchema.parse>,
    queuedAt: string
  ): boolean {
    const coverage = creatorSynthesisCoverage(selection, batch);
    if (!coverage.provisionalAllowed && !coverage.formalAllowed) return false;
    const mode = coverage.formalAllowed ? "formal" : "provisional";
    const synthesisJob = this.repository.enqueue({ id: randomUUID(), runId: run.id, nodeKey: "creator.synthesize", status: "queued",
      idempotencyKey: `${run.id}:creator.synthesize:${mode}:${batchRef}`, attempts: 0, maxAttempts: 2, availableAt: queuedAt,
      leaseOwner: null, leaseExpiresAt: null, heartbeatAt: null, payload: { reconstructionBatchArtifactRef: batchRef, mode },
      lastError: null, createdAt: queuedAt, updatedAt: queuedAt });
    run.status = "collecting";
    run.currentStage = "synthesis";
    run.worker = { state: "queued", attempt: 0, jobId: synthesisJob.id, workerId: null, lastHeartbeatAt: queuedAt };
    run.blockers = [];
    run.nextAction = mode === "provisional"
      ? `${batch.builtPosts}/${batch.requestedPosts} 条已完成 Builder；先生成可审阅的单博主完整报告，未验证结论保持 provisional。`
      : coverage.boundedMediaGap
      ? `${batch.readyPosts}/${batch.requestedPosts} 条公开媒体完成单轮分析；其余媒体经一次定向补取仍不可得，作为未知证据进入综合。`
      : "四组深度内容均完成单轮还原与独立评估；博主级综合归纳已进入队列。";
    stage(run, "deep_capture").status = "complete";
    stage(run, "deep_capture").message = mode === "provisional"
      ? `${batch.builtPosts}/${batch.requestedPosts} 条已构建，${batch.verifiedPosts} 条已正式验证。`
      : coverage.boundedMediaGap
      ? `${batch.readyPosts}/${batch.requestedPosts} 条完成；${batch.failedPosts} 条媒体不可得，禁止据此推断视频内容。`
      : `${batch.readyPosts}/${batch.requestedPosts} 条全部完成单轮分析；质量提醒继续保留。`;
    stage(run, "synthesis").status = "pending";
    stage(run, "synthesis").message = "等待从规范比较集、可用视频与显式未知边界生成研究归纳。";
    this.repository.appendEvent({ runId: run.id, jobId: synthesisJob.id, type: "job.queued", createdAt: queuedAt,
      message: mode === "provisional" ? "DOSSIER_READY 单博主报告已进入持久队列。"
        : coverage.boundedMediaGap ? "带媒体不可得边界的博主级研究归纳已进入持久队列。" : "博主级研究归纳已进入持久队列。",
      payload: { nodeKey: synthesisJob.nodeKey, mode, boundedMediaGap: coverage.boundedMediaGap,
        readyPosts: batch.readyPosts, requestedPosts: batch.requestedPosts } });
    return true;
  }

  async processVideoReconstruction(run: CreatorResearchRun, job: ResearchJob, workerId: string): Promise<void> {
    const startedAt = now();
    run = this.repository.get(run.id) ?? run;
    if (!run.reconstructionBatchArtifactRef) return this.failRun(run, job, workerId, "视频节点缺少批次 artifact");
    const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef));
    refreshBatchCounts(batch);
    const postExternalId = typeof job.payload.postExternalId === "string" ? job.payload.postExternalId : null;
    const sourceUrl = typeof job.payload.sourceUrl === "string" ? job.payload.sourceUrl : null;
    const sourceMediaArtifactRef = typeof job.payload.sourceMediaArtifactRef === "string" ? job.payload.sourceMediaArtifactRef : null;
    const evaluationOnly = job.payload.evaluationOnly === true;
    const evaluationPolicy = job.payload.evaluationPolicy === "single_pass" ? "single_pass" : "skip";
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
    if (isBuiltVideoState(item.state) && !evaluationOnly) {
      run.videoWork = { ...run.videoWork,
        activePostExternalIds: run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId),
        analyzedPosts: batch.builtPosts, failedPosts: batch.failedPosts,
        queuedPosts: Math.max(0, batch.pendingPosts - run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId).length) };
      this.repository.save(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: startedAt });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: startedAt,
        message: "视频 Builder 结果已存在，跳过重复执行。", payload: { postExternalId, state: item.state, idempotent: true } });
      return;
    }
    run.status = "collecting";
    run.currentStage = "deep_capture";
    run.updatedAt = startedAt;
    run.worker = { state: "running", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: startedAt };
    run.nextAction = evaluationOnly
      ? `正在复用 Builder 结果，为 ${postExternalId} 补做独立 Evaluator。`
      : `正在运行深度视频 Builder ${postExternalId}；独立 Evaluator 当前为可选阶段。`;
    stage(run, "deep_capture").status = "running";
    stage(run, "deep_capture").message = `已构建 ${batch.builtPosts}/${batch.requestedPosts}；正在处理 ${postExternalId}。`;
    item.state = "running";
    item.updatedAt = startedAt;
    run.videoWork = {
      concurrencyLimit: this.videoConcurrencyLimit,
      activePostExternalIds: [...new Set([...run.videoWork.activePostExternalIds, postExternalId])],
      queuedPosts: Math.max(0, batch.pendingPosts - new Set([...run.videoWork.activePostExternalIds, postExternalId]).size),
      analyzedPosts: batch.builtPosts,
      failedPosts: batch.failedPosts
    };
    this.repository.save(run);
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: startedAt });
    this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.started", createdAt: startedAt,
      message: "开始单视频 Builder 内容还原。", payload: { postExternalId } });
    let lastSubstage = "runner_start";
    const heartbeat = setInterval(() => {
      const at = now();
      this.repository.heartbeat(job.id, workerId, at, leaseUntil(180));
      const substage = this.artifacts.reconstructionProgress(run.id, postExternalId);
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
        evaluationPolicy,
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
      const verifiedOutcome = outcome.state === "verified" || outcome.state === "ready";
      const evaluatedOutcome = verifiedOutcome || outcome.state === "evaluated_with_findings";
      const runtimeThreeLensComplete = evaluatedOutcome && Boolean(
        outcome.threeLensEvaluationArtifactRef && outcome.threeLensGateReportArtifactRef && outcome.threeLensGateCount === 19
      );
      if (outcome.state === "built_unevaluated") Object.assign(latestItem, {
        state: "built_unevaluated",
        reconstructionArtifactRef: outcome.reconstructionArtifactRef,
        articleArtifactRef: outcome.articleArtifactRef,
        builderValidationArtifactRef: outcome.builderValidationArtifactRef,
        evaluationArtifactRef: null,
        gateReportArtifactRef: null,
        threeLensEvaluationArtifactRef: null,
        threeLensGateReportArtifactRef: null,
        evaluationPolicy: "skip@builder-fast-path-v1",
        failedGateIds: [],
        message: "Builder 与确定性校验已完成；独立 Evaluator 已跳过，结果仅作暂定分析。",
        updatedAt: completedAt
      });
      else if (outcome.state === "evaluated_with_findings" && runtimeThreeLensComplete) Object.assign(latestItem, {
        state: "evaluated_with_findings", reconstructionArtifactRef: outcome.reconstructionArtifactRef,
        articleArtifactRef: outcome.articleArtifactRef, evaluationArtifactRef: outcome.evaluationArtifactRef,
        builderValidationArtifactRef: outcome.builderValidationArtifactRef,
        gateReportArtifactRef: outcome.gateReportArtifactRef,
        threeLensEvaluationArtifactRef: outcome.threeLensEvaluationArtifactRef,
        threeLensGateReportArtifactRef: outcome.threeLensGateReportArtifactRef,
        evaluationPolicy: "single_pass@37a03aae", failedGateIds: outcome.qualityWarningGateIds,
        message: `Builder 结果可用；独立评估保留 ${outcome.qualityWarningGateIds.length} 项 findings，未晋升正式 Wiki。`,
        updatedAt: completedAt
      });
      else if (verifiedOutcome && runtimeThreeLensComplete) Object.assign(latestItem, { state: "verified", reconstructionArtifactRef: outcome.reconstructionArtifactRef,
        articleArtifactRef: outcome.articleArtifactRef, evaluationArtifactRef: outcome.evaluationArtifactRef,
        builderValidationArtifactRef: outcome.builderValidationArtifactRef ?? null,
        gateReportArtifactRef: outcome.gateReportArtifactRef,
        threeLensEvaluationArtifactRef: outcome.threeLensEvaluationArtifactRef ?? null,
        threeLensGateReportArtifactRef: outcome.threeLensGateReportArtifactRef ?? null,
        evaluationPolicy: "single_pass@37a03aae", failedGateIds: outcome.qualityWarningGateIds,
        message: outcome.qualityWarningGateIds.length > 0
          ? `已完成单轮还原与评估；${outcome.qualityWarningGateIds.length} 项质量提醒保留在研究边界中。`
          : "已完成单轮还原与评估；未发现质量提醒。", updatedAt: completedAt });
      else if (evaluatedOutcome) Object.assign(latestItem, { state: "not_ready",
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
      refreshBatchCounts(latestBatch);
      const batchDependencies = [previousBatchRef, ...latestBatch.items.flatMap((item) => [
        item.reconstructionArtifactRef, item.builderValidationArtifactRef, item.evaluationArtifactRef, item.gateReportArtifactRef,
        item.threeLensEvaluationArtifactRef, item.threeLensGateReportArtifactRef
      ])].filter((ref): ref is string => Boolean(ref));
      const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${latestBatch.revision}.json`, latestBatch,
        batchDependencies);
      run.reconstructionBatchArtifactRef = batchRef;
      run.coverage.reconstructedPosts = latestBatch.builtPosts;
      run.updatedAt = completedAt;
      const activePostExternalIds = run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId);
      run.videoWork = {
        concurrencyLimit: this.videoConcurrencyLimit,
        activePostExternalIds,
        queuedPosts: Math.max(0, latestBatch.pendingPosts - activePostExternalIds.length),
        analyzedPosts: latestBatch.builtPosts,
        failedPosts: latestBatch.failedPosts
      };
      const outcomeError = outcome.state === "not_ready" || outcome.state === "blocked" ? outcome.message : null;
      this.repository.updateJobStatus({ jobId: job.id, status: outcome.state === "blocked" && outcome.userActionRequired ? "needs_user" : "succeeded",
        updatedAt: completedAt, lastError: outcomeError });
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
        run.nextAction = `深度视频已构建 ${latestBatch.builtPosts}/${latestBatch.requestedPosts}，后台继续处理剩余 ${latestBatch.pendingPosts} 条。`;
        stage(run, "deep_capture").message = run.nextAction;
      } else {
        run.status = "reviewable";
        run.worker = { state: "succeeded", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: completedAt };
        const selection = run.selectionArtifactRef
          ? creatorSelectionSchema.parse(this.artifacts.read(run.selectionArtifactRef))
          : null;
        if (!selection || !this.queueSynthesis(run, batchRef, latestBatch, selection, completedAt)) {
          run.blockers = [{ code: "video_reconstruction_incomplete",
            message: `${latestBatch.builtPosts}/${latestBatch.requestedPosts} 条已构建，其中 ${latestBatch.verifiedPosts} 条已验证；正式 Wiki 仍要求 Evaluator。`, userActionRequired: false }];
          run.nextAction = latestBatch.builtPosts > 0
            ? "Builder 结果已可在工作台暂定查看；需要正式 Wiki 时再补做独立 Evaluator。"
            : "请查看未通过视频的 failedGateIds，修复后重新运行 Builder。";
          stage(run, "deep_capture").status = "blocked";
          stage(run, "deep_capture").message = run.blockers[0]?.message ?? null;
        }
      }
      this.repository.save(run);
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
        message: "视频重建批次 revision 已更新。", payload: { artifactRef: batchRef, postExternalId, state: outcome.state } });
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: completedAt,
        message: outcome.state === "built_unevaluated" ? "视频 Builder 已完成，独立 Evaluator 已跳过。"
          : evaluatedOutcome ? "视频已形成可用还原并完成独立评估。" : "视频未进入下游机制归纳。",
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
    refreshBatchCounts(batch);
    const dependencies = [previousBatchRef, ...batch.items.flatMap((candidate) => [
      candidate.reconstructionArtifactRef, candidate.builderValidationArtifactRef, candidate.evaluationArtifactRef, candidate.gateReportArtifactRef,
      candidate.threeLensEvaluationArtifactRef, candidate.threeLensGateReportArtifactRef
    ])].filter((ref): ref is string => Boolean(ref));
    const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${batch.revision}.json`, batch, dependencies);
    const activePostExternalIds = run.videoWork.activePostExternalIds.filter((id) => id !== postExternalId);
    run.reconstructionBatchArtifactRef = batchRef;
    run.coverage.reconstructedPosts = batch.builtPosts;
    run.updatedAt = timestamp;
    run.videoWork = { concurrencyLimit: this.videoConcurrencyLimit, activePostExternalIds,
      queuedPosts: Math.max(0, batch.pendingPosts - activePostExternalIds.length), analyzedPosts: batch.builtPosts, failedPosts: batch.failedPosts };
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

  async processSynthesis(run: CreatorResearchRun, job: ResearchJob, workerId: string): Promise<void> {
    const startedAt = now();
    if (!run.portfolioAnnotationsArtifactRef && run.portfolioArtifactRef) {
      const analysis = creatorPortfolioAnalysisSchema.parse(this.artifacts.read(run.portfolioArtifactRef));
      const annotations = buildCreatorPortfolioAnnotations(
        this.artifacts.read(analysis.corpusArtifactRef), analysis.corpusArtifactRef, startedAt
      );
      run.portfolioAnnotationsArtifactRef = this.artifacts.write(
        run.id, "portfolio-annotations.json", annotations, [analysis.corpusArtifactRef]
      );
      run.updatedAt = startedAt;
      this.repository.save(run);
      this.repository.appendEvent({
        runId: run.id,
        jobId: job.id,
        type: "artifact.produced",
        createdAt: startedAt,
        message: "旧任务缺失的全量表层标注已从冻结作品基本盘确定性补齐。",
        payload: {
          kind: "creator.portfolio_annotations",
          artifactRef: run.portfolioAnnotationsArtifactRef,
          annotated: annotations.denominator.annotatedPosts
        }
      });
    }
    if (!run.portfolioArtifactRef || !run.portfolioAnnotationsArtifactRef || !run.selectionArtifactRef
      || !run.detailArtifactRef || !run.reconstructionBatchArtifactRef) {
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
      const mode = job.payload.mode === "formal" ? "formal" : "provisional";
      const outcome = await this.synthesisExecutor.synthesize({ creatorRunId: run.id, creatorName: run.creatorName,
        portfolioArtifactRef: run.portfolioArtifactRef, selectionArtifactRef: run.selectionArtifactRef,
        portfolioAnnotationsArtifactRef: run.portfolioAnnotationsArtifactRef,
        detailArtifactRef: run.detailArtifactRef, reconstructionBatchArtifactRef: run.reconstructionBatchArtifactRef,
        mode }, (event) => {
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
      if (outcome.state === "provisional") {
        run.status = "reviewable";
        run.synthesisArtifactRef = outcome.synthesisArtifactRef;
        run.synthesisGateArtifactRef = outcome.gateArtifactRef;
        run.worker = { state: "succeeded", attempt: job.attempts, jobId: job.id, workerId, lastHeartbeatAt: completedAt };
        run.blockers = [];
        run.nextAction = "DOSSIER_READY：单博主完整报告可审阅；正式进入 Wiki 和跨博主结论前仍需补齐 Evaluator。";
        run.dashboardPath = `/creators/${encodeURIComponent(run.creatorId ?? run.id)}`;
        stage(run, "synthesis").status = "complete";
        stage(run, "synthesis").message = "单博主报告已生成；未验证的深度结论均标为 provisional。";
        stage(run, "dashboard").status = "complete";
        stage(run, "dashboard").message = "Dashboard 已可读取 DOSSIER_READY 报告。";
        this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
          message: "DOSSIER_READY 单博主报告与正式性 gate 已写入证据仓。",
          payload: { synthesisArtifactRef: outcome.synthesisArtifactRef, gateArtifactRef: outcome.gateArtifactRef,
            failedFormalGateIds: outcome.failedGateIds } });
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "run.reviewable", createdAt: completedAt,
          message: "单博主完整报告可审阅，但尚未进入正式 Wiki。", payload: {} });
      } else if (outcome.state === "ready") {
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
      if (outcome.state === "ready" && run.creatorId) {
        try {
          await this.completionPort?.publish({
            creatorRunId: run.id,
            creatorId: run.creatorId,
            creatorName: run.creatorName,
            synthesisArtifactRef: outcome.synthesisArtifactRef,
            gateArtifactRef: outcome.gateArtifactRef,
            synthesis: creatorSynthesisSchema.parse(this.artifacts.read(outcome.synthesisArtifactRef)),
            gate: creatorSynthesisGateSchema.parse(this.artifacts.read(outcome.gateArtifactRef))
          });
        } catch (error) {
          this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "child.failed", createdAt: completedAt,
            message: "知识编译失败；已发布的博主研究保持有效。",
            payload: { role: "knowledge_compiler", error: error instanceof Error ? error.message : String(error) } });
        }
      }
      this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.completed", createdAt: completedAt,
        message: outcome.state === "ready" ? "博主级归纳通过硬闸。"
          : outcome.state === "provisional" ? "单博主报告已生成，正式 Wiki gate 保持未通过。" : "博主级归纳未发布。",
        payload: { state: outcome.state } });
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

}
