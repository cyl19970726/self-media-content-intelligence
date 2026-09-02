import { randomUUID } from "node:crypto";
import { type CreatorResearchRun } from "../../../contracts/index.js";
import type { CreatorResearchRepository, ResearchJobLane } from "./repository.js";
import type { CreatorArtifactStore } from "./artifact-store.js";
import {
  buildCreatorPortfolio,
  buildCreatorPortfolioAnnotations,
  refineDeepSelectionForVerifiedMedia,
  creatorPortfolioAnalysisSchema,
  creatorSelectionSchema,
  creatorDetailCollectionSchema,
  videoReconstructionBatchSchema,
  deepMediaManifestSchema,
  type CreatorAcquisitionResult,
  type CreatorBrowserExecutor,
  type CreatorDetailResult,
  type ResearchJob,
  type DeepMediaResolver,
  type VideoReconstructionExecutor,
  type ImagePostReconstructionExecutor,
  type CreatorSynthesisExecutor,
  type CreatorResearchCompletionPort
} from "../../index.js";
import { CreatorResearchVideoSynthesisProcessor } from "./video-synthesis-processor.js";
import { creatorSynthesisCoverage } from "./synthesis-coverage.js";

function now(): string { return new Date().toISOString(); }

function leaseUntil(seconds = 90): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function canonicalXhsPostUrl(externalId: string): string {
  return `https://www.xiaohongshu.com/explore/${encodeURIComponent(externalId)}`;
}

function stage(run: CreatorResearchRun, id: CreatorResearchRun["stages"][number]["id"]) {
  const value = run.stages.find((entry) => entry.id === id);
  if (!value) throw new Error(`missing creator stage ${id}`);
  return value;
}

function externalCreatorId(finalUrl: string): string | null {
  try {
    const match = new URL(finalUrl).pathname.match(/^\/user\/profile\/([^/?#]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
export class CreatorResearchJobProcessor {
  private readonly videoProcessor: CreatorResearchVideoSynthesisProcessor;

  constructor(
    private readonly repository: CreatorResearchRepository,
    private readonly artifacts: CreatorArtifactStore,
    private readonly mediaResolver: DeepMediaResolver,
    videoReconstructor: VideoReconstructionExecutor,
    synthesisExecutor: CreatorSynthesisExecutor,
    private readonly videoConcurrencyLimit: number,
    completionPort?: CreatorResearchCompletionPort,
    imagePostReconstructor?: ImagePostReconstructionExecutor
  ) {
    this.videoProcessor = new CreatorResearchVideoSynthesisProcessor(
      repository,
      artifacts,
      videoReconstructor,
      synthesisExecutor,
      videoConcurrencyLimit,
      completionPort,
      imagePostReconstructor
    );
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
      await this.videoProcessor.processVideoReconstruction(run, job, workerId);
      return true;
    }
    if (job.nodeKey === "creator.synthesize") {
      await this.videoProcessor.processSynthesis(run, job, workerId);
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
      const annotations = buildCreatorPortfolioAnnotations(corpus, corpusRef, timestamp);
      const annotationsRef = this.artifacts.write(run.id, "portfolio-annotations.json", annotations, [corpusRef]);
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
        interpretationBoundary: "本节点回答表现分布与样本结构；内容为何爆发或失效必须等待逐条详情与深度媒体证据。",
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
      run.portfolioAnnotationsArtifactRef = annotationsRef;
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
      for (const [kind, artifactRef] of [["creator.corpus", corpusRef], ["creator.portfolio_annotations", annotationsRef], ["creator.selection", selectionRef], ["creator.portfolio", portfolioRef]]) {
        this.repository.appendEvent({
          runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: timestamp,
          message: `${kind} artifact 已写入证据仓。`, payload: { kind, artifactRef }
        });
      }
      this.repository.appendEvent({
        runId: run.id, jobId: job.id, type: "node.completed", createdAt: timestamp,
        message: "全量表层标注、统计与 High / Base / Low 规范选择完成。",
        payload: { annotated: annotations.denominator.annotatedPosts, selected: selection.denominator.selectedPosts }
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
      if (result.state === "blocked" && result.partialPosts && result.partialPosts.length > 0) {
        const interrupted = result;
        const partialPosts = result.partialPosts;
        this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "node.progress", createdAt: completedAt,
          message: "红狐详情批次部分完成；成功条目先写入证据仓，未完成条目留给下一批。",
          payload: { code: interrupted.code, checkpointed: partialPosts.length,
            navigationDiagnostic: interrupted.navigationDiagnostic ?? null } });
        result = {
          state: "ready",
          provider: run.collectionPolicy.adapter,
          taskSpaceId: interrupted.taskSpaceId,
          posts: partialPosts,
          warnings: interrupted.partialWarnings ?? ["redfox_partial_checkpoint"]
        };
      }
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
          imageCount: post.imageCandidateUrls?.length ?? 0,
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
          imageCandidateUrls: post.imageCandidateUrls ?? [],
          downloadVideo: deepIds.has(post.externalId) && post.mediaType === "video",
          downloadImages: deepIds.has(post.externalId) && post.mediaType === "image"
        }))
      });
      const previousMedia = run.mediaManifestArtifactRef
        ? deepMediaManifestSchema.parse(this.artifacts.read(run.mediaManifestArtifactRef))
        : null;
      const resolvedIds = new Set(resolvedMedia.items.map((item) => item.externalId));
      const mergedMediaItems = [...(previousMedia?.items.filter((item) => !resolvedIds.has(item.externalId)) ?? []), ...resolvedMedia.items]
        .map((item) => deepIds.has(item.externalId) ? item : {
          ...item, videoRequested: false, state: "not_requested" as const, videoArtifactRef: null,
          imageRequested: false, imageState: "not_requested" as const, imageArtifactRefs: [],
          imageMessage: "未进入当前深度证据集。",
          verificationArtifactRef: null, sha256: null, bytes: null, durationSeconds: null,
          width: null, height: null, hasAudio: null,
          message: "详情核验后未进入四组深度证据集；旧版本证据保留但不再参与当前投影。"
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
        const refined = refineDeepSelectionForVerifiedMedia(selection, mediaTypes, completedAt);
        const refinedRef = this.artifacts.write(run.id, "creator-selection-video-refined.json", refined,
          [run.selectionArtifactRef, detailRef]);
        selection = refined;
        run.selectionArtifactRef = refinedRef;
        const currentMedia = new Map(mediaManifest.items.map((item) => [item.externalId, item]));
        const mediaIds = selection.items.filter((item) => {
          if (!item.deepCandidate) return false;
          const media = currentMedia.get(item.externalId);
          return item.mediaType === "image"
            ? !media || !["ready", "partial"].includes(media.imageState ?? "not_requested") || (media.imageArtifactRefs?.length ?? 0) === 0
            : media?.state !== "verified_complete";
        })
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
          run.nextAction = `媒体类型已核验并重算四组深样本；正在补取 ${mediaIds.length} 条深度媒体。`;
          stage(run, "deep_capture").status = "pending";
          stage(run, "deep_capture").message = run.nextAction;
          this.repository.save(run);
          this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: completedAt });
          this.repository.appendEvent({ runId: run.id, jobId: job.id, type: "artifact.produced", createdAt: completedAt,
            message: "详情核验后的四组深度选样已登记。", payload: { artifactRef: refinedRef, deepCount: mediaIds.length } });
          this.repository.appendEvent({ runId: run.id, jobId: nextJob.id, type: "job.queued", createdAt: completedAt,
            message: "深度媒体补取已进入持久队列。", payload: { nodeKey: nextJob.nodeKey, remaining: mediaIds.length } });
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
        if (previous && ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(previous.state)) return previous;
        const media = mediaById.get(item.externalId);
        const evidenceKind = item.mediaType === "image" ? "image_post" as const : "video" as const;
        const verified = evidenceKind === "image_post"
          ? Boolean(media && ["ready", "partial"].includes(media.imageState ?? "not_requested") && (media.imageArtifactRefs?.length ?? 0) > 0)
          : media?.state === "verified_complete" && Boolean(media.videoArtifactRef);
        const sourceMediaArtifactRef = evidenceKind === "image_post"
          ? media?.imageArtifactRefs?.[0] ?? media?.coverArtifactRef ?? null
          : media?.videoArtifactRef ?? null;
        return { postExternalId: item.externalId, tier: item.tier, tierRank: item.tierRank,
          evidenceKind, state: verified ? "queued" as const : "blocked" as const, sourceMediaArtifactRef,
          evaluationPolicy: "skip@builder-fast-path-v1" as const,
          reconstructionArtifactRef: null, articleArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
          threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
          failedGateIds: verified ? [] : ["media_verification"],
          message: verified ? `等待${evidenceKind === "image_post" ? "图文" : "视频"} Builder。`
            : evidenceKind === "image_post" ? media?.imageMessage ?? "图文候选缺少可验证页面证据。"
              : media?.message ?? "深度候选缺少可验证媒体。", updatedAt: completedAt };
      });
      const revision = previousBatch ? previousBatch.revision + 1 : 0;
      const batch = videoReconstructionBatchSchema.parse({
        schemaVersion: "1.0.0", creatorRunId: run.id, revision, generatedAt: completedAt,
        requestedPosts: batchItems.length,
        builtPosts: batchItems.filter((item) => ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(item.state)).length,
        verifiedPosts: batchItems.filter((item) => ["verified", "ready"].includes(item.state)).length,
        readyPosts: batchItems.filter((item) => ["verified", "ready"].includes(item.state)).length,
        pendingPosts: batchItems.filter((item) => ["queued", "running"].includes(item.state)).length,
        failedPosts: batchItems.filter((item) => ["not_ready", "blocked"].includes(item.state)).length,
        items: batchItems,
        limitations: [...new Set([
          ...(previousBatch?.limitations ?? []),
          "每条深度帖子只做一次 Builder；独立评估可选，只有媒体或产物损坏才阻断。"
        ])]
      });
      const batchRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${revision}.json`, batch,
        [run.selectionArtifactRef, detailRef, mediaManifestRef, previousBatchRef].filter((ref): ref is string => Boolean(ref)));
      const queuedJobs = batch.items.filter((item) => item.state === "queued").map((item) => {
        const selected = selection.items.find((candidate) => candidate.externalId === item.postExternalId);
        if (!selected || !item.sourceMediaArtifactRef) throw new Error(`深度任务 ${item.postExternalId} 缺少选择或媒体引用`);
        return this.repository.enqueue({
          id: randomUUID(), runId: run.id, nodeKey: "video.reconstruct", status: "queued",
          idempotencyKey: `${run.id}:video.reconstruct:${item.postExternalId}:${item.sourceMediaArtifactRef}`,
          attempts: 0, maxAttempts: 2, availableAt: completedAt, leaseOwner: null, leaseExpiresAt: null,
          heartbeatAt: null, payload: { postExternalId: item.postExternalId, sourceUrl: canonicalXhsPostUrl(item.postExternalId),
            sourceMediaArtifactRef: item.sourceMediaArtifactRef, evidenceKind: item.evidenceKind },
          lastError: null, createdAt: completedAt, updatedAt: completedAt
        });
      });
      run.updatedAt = completedAt;
      run.browserTaskSpaceId = null;
      run.detailArtifactRef = detailRef;
      run.mediaManifestArtifactRef = mediaManifestRef;
      run.reconstructionBatchArtifactRef = batchRef;
      run.coverage.enrichedPosts = details.inspectedPosts;
      run.videoWork = { concurrencyLimit: this.videoConcurrencyLimit, activePostExternalIds: [], queuedPosts: queuedJobs.length,
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
          ? `公开详情与媒体已经可复核；${queuedJobs.length} 条深度内容重建已进入持久队列。`
          : "没有新增深度候选通过媒体验证；不可得媒体的内容原因保持未知。";
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
        message: "深度内容重建批次已经冻结。", payload: { artifactRef: batchRef, queuedPosts: queuedJobs.length } });
      for (const queued of queuedJobs) this.repository.appendEvent({ runId: run.id, jobId: queued.id, type: "job.queued", createdAt: completedAt,
        message: "深度内容重建已进入持久队列。", payload: { nodeKey: queued.nodeKey } });
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
