import { randomUUID } from "node:crypto";
import type { PublishingRepository } from "./repository.js";
import {
  createContentPackageInputSchema, variantInputSchema, type BrowserPublisher,
  type ContentPackage, type ContentPackageSnapshot, type CreateContentPackageInput, type PlatformVariant,
  type PublicationJob, type PublicationRun, type PublishingPlatform, type VariantInput
} from "./contracts.js";

const terminalStatuses = new Set<PublicationRun["status"]>([
  "published", "draft_saved", "canceled", "submission_unknown", "superseded", "failed"
]);

function now(): string { return new Date().toISOString(); }
function xhsTitleUnits(value: string): number {
  let units = 0;
  for (const character of value) units += character.charCodeAt(0) <= 0x7f ? 0.5 : 1;
  return Math.ceil(units);
}

export type PlatformPublishers = Record<PublishingPlatform, BrowserPublisher>;

export interface PublicationMediaAccess {
  exists(localPath: string): boolean;
}

export class PublishingService {
  constructor(
    private readonly repository: PublishingRepository,
    private readonly mediaAccess: PublicationMediaAccess,
    private readonly publishers: PlatformPublishers | null = null
  ) {}

  createPackage(input: CreateContentPackageInput): ContentPackage {
    const parsed = createContentPackageInputSchema.parse(input);
    const timestamp = now();
    const value: ContentPackage = { id: randomUUID(), ...parsed, createdAt: timestamp, updatedAt: timestamp };
    const snapshot: ContentPackageSnapshot = {
      id: randomUUID(), contentPackageId: value.id, sequence: 1, package: structuredClone(value),
      status: "working", createdAt: timestamp, frozenAt: null
    };
    this.repository.transaction(() => {
      this.repository.savePackage(value);
      this.repository.savePackageSnapshot(snapshot);
    });
    return value;
  }

  listPackages(limit = 100): ContentPackage[] { return this.repository.listPackages(limit); }

  getPackage(id: string): { package: ContentPackage; variants: PlatformVariant[]; snapshots: ContentPackageSnapshot[] } | null {
    const contentPackage = this.repository.getPackage(id);
    return contentPackage ? {
      package: contentPackage,
      variants: this.repository.listVariants(id),
      snapshots: this.repository.listPackageSnapshots(id)
    } : null;
  }

  listPackageSnapshots(packageId: string): ContentPackageSnapshot[] {
    if (!this.repository.getPackage(packageId)) throw new Error("内容包不存在");
    return this.repository.listPackageSnapshots(packageId);
  }

  getPackageSnapshot(packageId: string, snapshotId: string): ContentPackageSnapshot | null {
    const snapshot = this.repository.getPackageSnapshot(snapshotId);
    return snapshot?.contentPackageId === packageId ? snapshot : null;
  }

  createWorkingSnapshot(packageId: string): ContentPackageSnapshot {
    const contentPackage = this.repository.getPackage(packageId);
    if (!contentPackage) throw new Error("内容包不存在");
    const snapshots = this.repository.listPackageSnapshots(packageId);
    const existing = snapshots.find((item) => item.status === "working");
    if (existing) return existing;
    const snapshot: ContentPackageSnapshot = {
      id: randomUUID(), contentPackageId: packageId, sequence: (snapshots[0]?.sequence ?? 0) + 1,
      package: structuredClone(contentPackage), status: "working", createdAt: now(), frozenAt: null
    };
    this.repository.savePackageSnapshot(snapshot);
    return snapshot;
  }

  freezePackageSnapshot(packageId: string, snapshotId: string): ContentPackageSnapshot {
    const snapshot = this.requireSnapshot(packageId, snapshotId);
    if (snapshot.status === "frozen") return snapshot;
    const frozen: ContentPackageSnapshot = { ...snapshot, status: "frozen", frozenAt: now() };
    this.repository.savePackageSnapshot(frozen);
    return frozen;
  }

  createVariant(packageId: string, input: VariantInput): PlatformVariant {
    if (!this.repository.getPackage(packageId)) throw new Error("内容包不存在");
    const parsed = variantInputSchema.parse(input);
    this.assertVariantShape(parsed);
    const snapshots = this.repository.listPackageSnapshots(packageId);
    const snapshot = parsed.contentPackageSnapshotId
      ? this.requireSnapshot(packageId, parsed.contentPackageSnapshotId)
      : snapshots.find((item) => item.status === "working") ?? snapshots[0] ?? this.createWorkingSnapshot(packageId);
    const timestamp = now();
    const frozenSnapshot: ContentPackageSnapshot = snapshot.status === "frozen"
      ? snapshot : { ...snapshot, status: "frozen", frozenAt: timestamp };
    const value: PlatformVariant = {
      id: randomUUID(), packageId, revision: 1, ...parsed, contentPackageSnapshotId: snapshot.id,
      createdAt: timestamp, updatedAt: timestamp
    };
    this.repository.transaction(() => {
      if (snapshot.status === "working") this.repository.savePackageSnapshot(frozenSnapshot);
      this.repository.saveVariant(value);
    });
    return value;
  }

  updateVariant(id: string, input: VariantInput): PlatformVariant {
    const existing = this.repository.getVariant(id);
    if (!existing) throw new Error("平台版本不存在");
    const parsed = variantInputSchema.parse(input);
    this.assertVariantShape(parsed);
    const value: PlatformVariant = {
      ...existing, ...parsed, contentPackageSnapshotId: existing.contentPackageSnapshotId,
      revision: existing.revision + 1, updatedAt: now()
    };
    this.repository.saveVariant(value);
    for (const run of this.repository.listRunsByVariant(id)) {
      if (terminalStatuses.has(run.status)) continue;
      run.status = "superseded";
      run.currentStage = `平台版本已更新到 r${value.revision}，原发布任务停止`;
      run.blockerCode = "variant_superseded";
      run.blockerMessage = "内容在预览或排队后发生变化，请创建新的发布任务。";
      run.updatedAt = now();
      this.repository.saveRun(run);
      this.event(run.id, null, "publication.superseded", run.blockerMessage, { revision: value.revision });
    }
    return value;
  }

  createRun(variantId: string): PublicationRun {
    const variant = this.repository.getVariant(variantId);
    if (!variant) throw new Error("平台版本不存在");
    this.assertMediaAvailable(variant);
    const timestamp = now();
    const run: PublicationRun = {
      id: randomUUID(), variantId, variantRevision: variant.revision, variant: structuredClone(variant),
      contentPackageSnapshotId: variant.contentPackageSnapshotId,
      platform: variant.platform, status: "draft", currentStage: "等待准备发布页",
      browserTaskSpaceId: null, preview: null, approvedRevision: null,
      blockerCode: null, blockerMessage: null, receipt: null, attempts: 0,
      createdAt: timestamp, updatedAt: timestamp
    };
    this.repository.saveRun(run);
    this.event(run.id, null, "publication.created", "已创建发布任务，尚未触碰平台页面。", { revision: run.variantRevision });
    return run;
  }

  listRuns(limit = 100): PublicationRun[] { return this.repository.listRuns(limit); }
  getRun(id: string): PublicationRun | null { return this.repository.getRun(id); }
  events(id: string, after = 0) { return this.repository.listEvents(id, after); }

  prepare(id: string): PublicationRun {
    const run = this.requireRun(id);
    if (!["draft", "needs_user", "failed"].includes(run.status)) throw new Error("当前状态不能准备发布页");
    this.assertCurrentRevision(run);
    this.assertMediaAvailable(run.variant);
    run.status = "queued_prepare";
    run.currentStage = "等待浏览器填写";
    run.blockerCode = null;
    run.blockerMessage = null;
    run.updatedAt = now();
    this.repository.saveRun(run);
    const job = this.enqueue(run, "publication.prepare", `prepare:r${run.variantRevision}:${run.attempts + 1}`, 2);
    this.event(run.id, job.id, "publication.prepare.queued", "已排队准备平台预览。", {});
    return run;
  }

  approve(id: string, revision: number): PublicationRun {
    const run = this.requireRun(id);
    if (run.status !== "preview_ready" || !run.preview || !run.browserTaskSpaceId) throw new Error("发布页尚未准备好，不能确认发布");
    if (revision !== run.variantRevision) throw new Error("审批版本与预览版本不一致，请重新准备");
    this.assertCurrentRevision(run);
    run.status = "queued_submit";
    run.currentStage = run.platform === "wechat_official_account" ? "已确认，等待保存公众号草稿" : "已确认，等待点击发布";
    run.approvedRevision = revision;
    run.updatedAt = now();
    this.repository.saveRun(run);
    const job = this.enqueue(run, "publication.submit", `submit:r${revision}`, 1);
    this.event(run.id, job.id, "publication.submit.approved",
      run.platform === "wechat_official_account"
        ? `用户已确认 r${revision}，允许点击一次“保存为草稿”，不允许发表。`
        : `用户已确认 r${revision}，允许点击一次发布按钮。`, { revision });
    return run;
  }

  cancel(id: string): PublicationRun {
    const run = this.requireRun(id);
    if (terminalStatuses.has(run.status) || ["submitting", "verifying", "queued_submit"].includes(run.status)) {
      throw new Error("当前状态不能安全取消");
    }
    if (!run.browserTaskSpaceId) {
      run.status = "canceled";
      run.currentStage = "已取消，未打开平台发布页";
      run.updatedAt = now();
      this.repository.saveRun(run);
      this.event(run.id, null, "publication.canceled", "已取消，平台页面未被提交。", { draftSaved: false });
      return run;
    }
    run.status = "queued_cancel";
    run.currentStage = "等待保存草稿并取消";
    run.updatedAt = now();
    this.repository.saveRun(run);
    const job = this.enqueue(run, "publication.cancel", `cancel:r${run.variantRevision}`, 1);
    this.event(run.id, job.id, "publication.cancel.queued", "已排队取消，发布按钮不会被点击。", {});
    return run;
  }

  resume(id: string): PublicationRun {
    const run = this.requireRun(id);
    if (run.status !== "needs_user") throw new Error("当前任务不需要恢复");
    return run.approvedRevision === run.variantRevision ? this.resumeSubmit(run) : this.prepare(run.id);
  }

  async processNext(workerId: string): Promise<boolean> {
    if (!this.publishers) return false;
    const timestamp = now();
    const job = this.repository.claimNext(workerId, timestamp, new Date(Date.now() + 120_000).toISOString());
    if (!job) return false;
    const run = this.repository.getRun(job.runId);
    if (!run || terminalStatuses.has(run.status)) {
      this.repository.updateJobStatus({ jobId: job.id, status: "canceled", updatedAt: now(), lastError: "发布任务已结束" });
      return true;
    }
    if (job.attempts > job.maxAttempts) {
      const submit = job.nodeKey === "publication.submit";
      run.status = submit ? "submission_unknown" : "failed";
      run.currentStage = submit ? "提交 Worker 曾中断，禁止再次点击发布" : "任务尝试次数已耗尽";
      run.blockerCode = "attempts_exhausted";
      run.blockerMessage = submit
        ? "上一次提交可能已经触达平台。为避免重复发布，系统不会自动重试，请人工核对账号主页。"
        : "浏览器任务在租约内未能完成，请检查页面与运行环境。";
      run.updatedAt = now();
      this.repository.saveRun(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "failed", updatedAt: now(), lastError: run.blockerMessage });
      this.event(run.id, job.id, submit ? "publication.submission_unknown" : "publication.failed", run.blockerMessage, { attempts: job.attempts });
      return true;
    }
    this.repository.updateJobStatus({ jobId: job.id, status: "running", updatedAt: now() });
    run.attempts += 1;
    run.updatedAt = now();
    this.repository.saveRun(run);
    try {
      if (job.nodeKey === "publication.prepare") await this.processPrepare(run, job);
      else if (job.nodeKey === "publication.submit") await this.processSubmit(run, job);
      else await this.processCancel(run, job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "发布 Worker 失败";
      run.status = job.nodeKey === "publication.submit" ? "submission_unknown" : "failed";
      run.currentStage = job.nodeKey === "publication.submit" ? "提交结果未知，禁止自动重试" : "发布任务失败";
      run.blockerCode = "worker_error";
      run.blockerMessage = message;
      run.updatedAt = now();
      this.repository.saveRun(run);
      this.repository.updateJobStatus({ jobId: job.id, status: "failed", updatedAt: now(), lastError: message });
      this.event(run.id, job.id, "publication.failed", message, {});
    }
    return true;
  }

  close(): void { this.repository.close(); }

  private requireSnapshot(packageId: string, snapshotId: string): ContentPackageSnapshot {
    const snapshot = this.repository.getPackageSnapshot(snapshotId);
    if (!snapshot || snapshot.contentPackageId !== packageId) throw new Error("内容包快照不存在或不属于当前内容包");
    return snapshot;
  }

  private async processPrepare(run: PublicationRun, job: PublicationJob): Promise<void> {
    run.status = "preparing"; run.currentStage = "正在填写平台发布页"; run.updatedAt = now(); this.repository.saveRun(run);
    const result = await this.requirePublisher(run.platform).prepare({ runId: run.id, taskSpaceId: run.browserTaskSpaceId, variant: run.variant });
    run.browserTaskSpaceId = result.taskSpaceId;
    if (result.state === "preview_ready") {
      run.status = "preview_ready"; run.currentStage = "发布页已填好，等待你的最终确认"; run.preview = result.preview;
      run.blockerCode = null; run.blockerMessage = null;
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: now() });
      this.event(run.id, job.id, "publication.preview_ready", "平台表单已填写并交给用户预览，尚未发布。", { taskSpaceId: result.taskSpaceId });
    } else {
      run.status = result.state; run.currentStage = result.state === "needs_user" ? "需要你接管浏览器" : "准备发布页失败";
      run.blockerCode = result.code; run.blockerMessage = result.message;
      this.repository.updateJobStatus({ jobId: job.id, status: result.state === "needs_user" ? "needs_user" : "failed", updatedAt: now(), lastError: result.message });
      this.event(run.id, job.id, `publication.${result.state}`, result.message, { code: result.code, taskSpaceId: result.taskSpaceId });
    }
    run.updatedAt = now(); this.repository.saveRun(run);
  }

  private async processSubmit(run: PublicationRun, job: PublicationJob): Promise<void> {
    if (run.approvedRevision !== run.variantRevision || !run.browserTaskSpaceId) throw new Error("提交缺少有效审批或 TaskSpace");
    run.status = "submitting";
    run.currentStage = run.platform === "wechat_official_account" ? "正在点击一次“保存为草稿”" : "正在点击一次发布按钮";
    run.updatedAt = now(); this.repository.saveRun(run);
    const result = await this.requirePublisher(run.platform).submit({ runId: run.id, taskSpaceId: run.browserTaskSpaceId, variant: run.variant });
    run.browserTaskSpaceId = result.taskSpaceId;
    if (result.state === "published" || result.state === "draft_saved") {
      run.status = result.state;
      run.currentStage = result.state === "draft_saved" ? "公众号草稿已可靠保存，等待人工发表" : "平台已确认接收";
      run.receipt = result.receipt;
      run.blockerCode = null; run.blockerMessage = null;
      this.repository.updateJobStatus({ jobId: job.id, status: "succeeded", updatedAt: now() });
      this.event(run.id, job.id, result.state === "draft_saved" ? "publication.draft_saved" : "publication.published",
        result.state === "draft_saved" ? "微信公众号已返回可验证的草稿编号，未执行发表。" : "平台已返回可验证的发布结果。",
        { externalUrl: result.receipt.externalUrl, externalId: result.receipt.externalId });
    } else {
      run.status = result.state; run.currentStage = result.state === "submission_unknown" ? "提交结果未知，禁止自动重试" : result.state === "needs_user" ? "提交阶段需要你接管" : "提交失败";
      run.blockerCode = result.code; run.blockerMessage = result.message;
      this.repository.updateJobStatus({ jobId: job.id, status: result.state === "needs_user" ? "needs_user" : "failed", updatedAt: now(), lastError: result.message });
      this.event(run.id, job.id, `publication.${result.state}`, result.message, { code: result.code });
    }
    run.updatedAt = now(); this.repository.saveRun(run);
  }

  private async processCancel(run: PublicationRun, job: PublicationJob): Promise<void> {
    const result = await this.requirePublisher(run.platform).cancel({ runId: run.id, taskSpaceId: run.browserTaskSpaceId, variant: run.variant });
    run.browserTaskSpaceId = result.taskSpaceId;
    if (result.state === "canceled") {
      run.status = "canceled"; run.currentStage = result.draftSaved ? "已保存平台草稿并取消" : "已取消，未点击发布";
      this.repository.updateJobStatus({ jobId: job.id, status: "canceled", updatedAt: now() });
      this.event(run.id, job.id, "publication.canceled", run.currentStage, { draftSaved: result.draftSaved });
    } else {
      run.status = result.state; run.currentStage = result.state === "needs_user" ? "取消流程需要你接管" : "取消流程失败";
      run.blockerCode = result.code; run.blockerMessage = result.message;
      this.repository.updateJobStatus({ jobId: job.id, status: result.state === "needs_user" ? "needs_user" : "failed", updatedAt: now(), lastError: result.message });
    }
    run.updatedAt = now(); this.repository.saveRun(run);
  }

  private resumeSubmit(run: PublicationRun): PublicationRun {
    if (!run.browserTaskSpaceId) throw new Error("缺少可恢复的浏览器 TaskSpace");
    run.status = "queued_submit"; run.currentStage = "等待恢复已确认的提交"; run.blockerCode = null; run.blockerMessage = null; run.updatedAt = now();
    this.repository.saveRun(run);
    const job = this.enqueue(run, "publication.submit", `submit:r${run.variantRevision}:resume:${run.attempts + 1}`, 1);
    this.event(run.id, job.id, "publication.submit.resumed", "用户已完成接管操作，恢复提交。", {});
    return run;
  }

  private requireRun(id: string): PublicationRun {
    const run = this.repository.getRun(id);
    if (!run) throw new Error("发布任务不存在");
    return run;
  }

  private requirePublisher(platform: PublishingPlatform): BrowserPublisher {
    const publisher = this.publishers?.[platform];
    if (!publisher) throw new Error(`未配置 ${platform} 发布适配器`);
    return publisher;
  }

  private assertCurrentRevision(run: PublicationRun): void {
    const current = this.repository.getVariant(run.variantId);
    if (!current || current.revision !== run.variantRevision) throw new Error("平台版本已经变化，请创建新的发布任务");
  }

  private assertVariantShape(variant: ReturnType<typeof variantInputSchema.parse>): void {
    if (variant.contentType === "video" && (variant.media.length !== 1 || variant.media[0]?.kind !== "video")) {
      throw new Error("视频版本必须且只能包含一个视频文件");
    }
    if (variant.contentType === "image" && variant.media.some((item) => item.kind !== "image")) throw new Error("图文版本只能包含图片");
    if (variant.contentType === "article" && variant.media.some((item) => item.kind !== "image")) {
      throw new Error("公众号图文素材只能包含图片");
    }
    if (["douyin", "wechat_channels", "bilibili"].includes(variant.platform) && variant.contentType !== "video") {
      const platformName = variant.platform === "douyin" ? "抖音" : variant.platform === "wechat_channels" ? "微信视频号" : "B站";
      throw new Error(`${platformName}首版只支持视频发布`);
    }
    if (variant.platform === "wechat_official_account" && variant.contentType !== "article") {
      throw new Error("微信公众号首版只支持一张图文章草稿");
    }
    if (variant.platform !== "wechat_official_account" && variant.contentType === "article") {
      throw new Error("一张图文章仅适用于微信公众号");
    }
    if (variant.platform === "xiaohongshu" && xhsTitleUnits(variant.title) > 20) throw new Error("小红书标题长度超过 20 单位");
    if (variant.platform === "wechat_official_account" && [...variant.title].length > 64) throw new Error("微信公众号标题超过 64 字");
    if (variant.platform === "wechat_channels" && /[-—_]/.test(variant.title)) {
      throw new Error("微信视频号短标题不支持连字符、破折号或下划线");
    }
    const options = variant.platformOptions[variant.platform];
    if (!options) throw new Error(`${variant.platform} 缺少平台专属投稿参数`);
    if (variant.platform === "bilibili") {
      const bili = variant.platformOptions.bilibili;
      if (!bili) throw new Error("B站缺少平台专属投稿参数");
      if (variant.tags.length === 0) throw new Error("B站投稿至少需要一个标签");
      if (bili.copyright === "repost" && !bili.sourceUrl) throw new Error("B站转载稿必须填写转载来源");
    }
    if (variant.platform === "douyin") {
      const douyin = variant.platformOptions.douyin;
      if (!douyin) throw new Error("抖音缺少平台专属投稿参数");
      if (douyin.declaration === "repost" && !douyin.sourceUrl) throw new Error("抖音转载作品必须填写来源链接");
    }
    if (variant.platform === "wechat_official_account") {
      const officialAccount = variant.platformOptions.wechat_official_account;
      if (!officialAccount) throw new Error("微信公众号缺少平台专属投稿参数");
      if (officialAccount.bodyMode === "rich_text" && !variant.body.trim()) throw new Error("公众号图文正文不能为空");
      if (officialAccount.bodyMode === "one_image" && variant.media.length !== 1) throw new Error("公众号一张图模式必须且只能使用一张图片");
    }
  }

  private assertMediaAvailable(variant: PlatformVariant): void {
    const missing = variant.media.find((item) => !this.mediaAccess.exists(item.localPath));
    if (missing) throw new Error(`素材文件不存在：${missing.localPath}`);
    const options = variant.platformOptions[variant.platform];
    const coverPath = options && "coverPath" in options ? options.coverPath : null;
    if (coverPath && !this.mediaAccess.exists(coverPath)) throw new Error(`封面文件不存在：${coverPath}`);
  }

  private enqueue(run: PublicationRun, nodeKey: PublicationJob["nodeKey"], suffix: string, maxAttempts: number): PublicationJob {
    const timestamp = now();
    return this.repository.enqueue({
      id: randomUUID(), runId: run.id, nodeKey, status: "queued", idempotencyKey: `${run.id}:${nodeKey}:${suffix}`,
      attempts: 0, maxAttempts, availableAt: timestamp, leaseOwner: null, leaseExpiresAt: null,
      lastError: null, createdAt: timestamp, updatedAt: timestamp
    });
  }

  private event(runId: string, jobId: string | null, type: string, message: string, payload: Record<string, unknown>): void {
    this.repository.appendEvent({ runId, jobId, type, message, payload, createdAt: now() });
  }
}
