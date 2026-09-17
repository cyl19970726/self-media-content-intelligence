import { createHash } from "node:crypto";
import type { CreatorResearchRun, ResearchReviewState } from "../../../contracts/index.js";
import type { CreatorArtifactStore } from "../creator-research/artifact-store.js";
import type { CreatorResearchRepository } from "../creator-research/repository.js";
import { dossierReadyNextAction, projectBuiltUnevaluatedOutcome } from "../creator-research/video-synthesis-processor.js";
import type { CreatorSynthesisOutcome } from "../creator-synthesis/contracts.js";
import { videoReconstructionBatchSchema, type VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";
import type { VideoReconstructionOutcome } from "../video-analysis/contracts.js";

export type RegistrationAttempt = {
  workflowRunId: string;
  stepRunId: string;
  attemptId: string;
};

export type FrozenPostVersionSource = {
  reconstructionBatchArtifactRef: string;
  selectionArtifactRef: string;
  detailArtifactRef: string;
  mediaManifestArtifactRef: string;
  sourceMediaArtifactRef: string;
};

export type PostVersionRegistrationInput = {
  creatorRunId: string;
  postExternalId: string;
  source: FrozenPostVersionSource;
  candidate: VideoReconstructionOutcome;
  review?: VideoReconstructionOutcome | null;
  researchReview?: ResearchReviewState | null;
  registeredBy: RegistrationAttempt;
};

export type CreatorVersionRegistrationInput = {
  creatorRunId: string;
  source: {
    reconstructionBatchArtifactRef: string;
    portfolioArtifactRef: string;
    portfolioAnnotationsArtifactRef: string;
    selectionArtifactRef: string;
    detailArtifactRef: string;
    previousSynthesisArtifactRef: string | null;
    previousSynthesisGateArtifactRef: string | null;
  };
  candidate: CreatorSynthesisOutcome;
  review?: CreatorSynthesisOutcome | null;
  researchReview?: ResearchReviewState | null;
  registeredBy: RegistrationAttempt;
};

export type PostVersionRegistrationResult = {
  state: "registered" | "already_registered";
  reconstructionBatchArtifactRef: string;
  postState: VideoReconstructionBatch["items"][number]["state"];
};

export type CreatorVersionRegistrationResult = {
  state: "registered" | "already_registered" | "retained_last_good";
  synthesisArtifactRef: string | null;
  synthesisGateArtifactRef: string | null;
  publication: "verified" | "provisional" | "not_promoted";
};

/** The callback must lock the creator row and use the same database transaction as repository get/save. */
export interface ResearchVersionRegistrationTransaction {
  run<T>(creatorRunId: string, operation: () => T): T;
}

function stage(run: CreatorResearchRun, id: CreatorResearchRun["stages"][number]["id"]) {
  const found = run.stages.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing creator stage ${id}`);
  return found;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function postVersionIdentity(item: VideoReconstructionBatch["items"][number]): string {
  return fingerprint({ ...item, updatedAt: undefined, message: undefined });
}

function isBuilt(outcome: VideoReconstructionOutcome): outcome is Extract<VideoReconstructionOutcome,
  { state: "built_unevaluated" | "evaluated_with_findings" | "verified" | "ready" }> {
  return ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(outcome.state);
}

function projectedPost(outcome: Extract<VideoReconstructionOutcome,
  { state: "built_unevaluated" | "evaluated_with_findings" | "verified" | "ready" }>, updatedAt: string) {
  if (outcome.state === "built_unevaluated") return projectBuiltUnevaluatedOutcome(outcome, updatedAt);
  const verified = outcome.state === "verified" || outcome.state === "ready";
  return {
    state: verified ? "verified" as const : "evaluated_with_findings" as const,
    reconstructionArtifactRef: outcome.reconstructionArtifactRef,
    articleArtifactRef: outcome.articleArtifactRef,
    builderValidationArtifactRef: outcome.builderValidationArtifactRef ?? null,
    evaluationArtifactRef: outcome.evaluationArtifactRef,
    gateReportArtifactRef: outcome.gateReportArtifactRef,
    threeLensEvaluationArtifactRef: outcome.threeLensEvaluationArtifactRef,
    threeLensGateReportArtifactRef: outcome.threeLensGateReportArtifactRef,
    evaluationPolicy: "single_pass@37a03aae" as const,
    failedGateIds: outcome.qualityWarningGateIds,
    message: verified
      ? outcome.qualityWarningGateIds.length ? `已完成单轮还原与评估；${outcome.qualityWarningGateIds.length} 项质量提醒保留在研究边界中。` : "已完成单轮还原与评估；未发现质量提醒。"
      : `Builder 结果可用；独立评估保留 ${outcome.qualityWarningGateIds.length} 项 findings，未晋升正式 Wiki。`,
    updatedAt,
  };
}

function refreshCounts(batch: VideoReconstructionBatch): void {
  batch.builtPosts = batch.items.filter((item) => ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(item.state)).length;
  batch.verifiedPosts = batch.items.filter((item) => item.state === "verified" || item.state === "ready").length;
  batch.readyPosts = batch.verifiedPosts;
  batch.pendingPosts = batch.items.filter((item) => item.state === "queued" || item.state === "running").length;
  batch.failedPosts = batch.items.filter((item) => item.state === "not_ready" || item.state === "blocked").length;
}

function samePostProjection(item: VideoReconstructionBatch["items"][number], projected: ReturnType<typeof projectedPost>): boolean {
  return fingerprint({ ...item, updatedAt: undefined, message: undefined })
    === fingerprint({ ...item, ...projected, updatedAt: undefined, message: undefined });
}

export class RepositoryResearchVersionRegistrar {
  constructor(
    private readonly repository: CreatorResearchRepository,
    private readonly artifacts: CreatorArtifactStore,
    private readonly transaction: ResearchVersionRegistrationTransaction,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async registerPostVersion(input: PostVersionRegistrationInput): Promise<PostVersionRegistrationResult> {
    return this.transaction.run(input.creatorRunId, () => {
      const run = this.requireRun(input.creatorRunId);
      this.assertPostRunSources(run, input.source);
      if (!run.reconstructionBatchArtifactRef) throw new Error("POST_VERSION_BATCH_MISSING");
      const sourceBatch = videoReconstructionBatchSchema.parse(this.artifacts.read(input.source.reconstructionBatchArtifactRef));
      const batch = videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef));
      const sourceItem = sourceBatch.items.find((item) => item.postExternalId === input.postExternalId);
      const item = batch.items.find((entry) => entry.postExternalId === input.postExternalId);
      if (!sourceItem || !item || sourceItem.sourceMediaArtifactRef !== input.source.sourceMediaArtifactRef) {
        throw new Error("STALE_WORKFLOW_SOURCE: post source is absent or changed");
      }
      const outcome = input.researchReview ? input.candidate : input.review && isBuilt(input.review) ? input.review : input.candidate;
      if (!isBuilt(outcome)) throw new Error("POST_VERSION_NOT_READABLE");
      const projected = projectedPost(outcome, this.clock());
      const researchReview = input.researchReview ?? undefined;
      const projectedWithReview = { ...projected, ...(researchReview ? { researchReview } : {}) };
      if (samePostProjection(item, projectedWithReview)) return { state: "already_registered",
        reconstructionBatchArtifactRef: run.reconstructionBatchArtifactRef, postState: item.state };
      if (postVersionIdentity(item) !== postVersionIdentity(sourceItem)) {
        throw new Error("STALE_WORKFLOW_SOURCE: a newer version of this post is already registered");
      }
      Object.assign(item, projectedWithReview);
      batch.revision += 1;
      batch.generatedAt = projected.updatedAt;
      refreshCounts(batch);
      const dependencies = [run.reconstructionBatchArtifactRef, ...batch.items.flatMap((entry) => [
        entry.reconstructionArtifactRef, entry.builderValidationArtifactRef, entry.evaluationArtifactRef,
        entry.gateReportArtifactRef, entry.threeLensEvaluationArtifactRef, entry.threeLensGateReportArtifactRef,
        entry.researchReview?.reviewArtifactRef, entry.researchReview?.revisionRecordArtifactRef,
      ])].filter((ref): ref is string => Boolean(ref));
      const nextRef = this.artifacts.write(run.id, `video-reconstruction-batch-r${batch.revision}.json`,
        videoReconstructionBatchSchema.parse(batch), dependencies);
      run.reconstructionBatchArtifactRef = nextRef;
      run.coverage.reconstructedPosts = batch.builtPosts;
      run.updatedAt = projected.updatedAt;
      run.videoWork = { ...run.videoWork, analyzedPosts: batch.builtPosts, failedPosts: batch.failedPosts,
        queuedPosts: Math.max(0, batch.pendingPosts - run.videoWork.activePostExternalIds.length) };
      this.repository.save(run);
      this.repository.appendEvent({ runId: run.id, jobId: null, type: "artifact.produced", createdAt: projected.updatedAt,
        message: "Workflow 单帖版本已原子登记到主研究批次。", payload: { postExternalId: input.postExternalId,
          artifactRef: nextRef, state: item.state, registeredBy: input.registeredBy } });
      return { state: "registered", reconstructionBatchArtifactRef: nextRef, postState: item.state };
    });
  }

  async registerCreatorVersion(input: CreatorVersionRegistrationInput): Promise<CreatorVersionRegistrationResult> {
    return this.transaction.run(input.creatorRunId, () => {
      const run = this.requireRun(input.creatorRunId);
      const outcome = input.researchReview ? input.candidate : input.review ?? input.candidate;
      const readableSimpleReview = Boolean(input.researchReview && "synthesisArtifactRef" in outcome && outcome.synthesisArtifactRef);
      if ("synthesisArtifactRef" in outcome && outcome.synthesisArtifactRef
        && run.synthesisArtifactRef === outcome.synthesisArtifactRef && run.synthesisGateArtifactRef === outcome.gateArtifactRef
        && (!input.researchReview || fingerprint(run.researchReview) === fingerprint(input.researchReview))) {
        return { state: "already_registered", synthesisArtifactRef: run.synthesisArtifactRef,
          synthesisGateArtifactRef: run.synthesisGateArtifactRef,
          publication: input.researchReview ? "provisional" : outcome.state === "ready" ? "verified" : outcome.state === "provisional" ? "provisional" : "not_promoted" };
      }
      if (run.reconstructionBatchArtifactRef !== input.source.reconstructionBatchArtifactRef
        || run.portfolioArtifactRef !== input.source.portfolioArtifactRef
        || run.portfolioAnnotationsArtifactRef !== input.source.portfolioAnnotationsArtifactRef
        || run.selectionArtifactRef !== input.source.selectionArtifactRef || run.detailArtifactRef !== input.source.detailArtifactRef) {
        throw new Error("STALE_WORKFLOW_SOURCE: creator synthesis inputs changed");
      }
      if (outcome.state !== "ready" && outcome.state !== "provisional" && !readableSimpleReview) {
        return { state: "retained_last_good", synthesisArtifactRef: run.synthesisArtifactRef,
          synthesisGateArtifactRef: run.synthesisGateArtifactRef, publication: "not_promoted" };
      }
      if (!("synthesisArtifactRef" in outcome) || !outcome.synthesisArtifactRef) {
        throw new Error("CREATOR_VERSION_NOT_READABLE");
      }
      if (run.synthesisArtifactRef !== input.source.previousSynthesisArtifactRef
        || run.synthesisGateArtifactRef !== input.source.previousSynthesisGateArtifactRef) {
        throw new Error("STALE_WORKFLOW_SOURCE: a newer creator version is already registered");
      }
      const completedAt = this.clock();
      run.synthesisArtifactRef = outcome.synthesisArtifactRef;
      run.synthesisGateArtifactRef = outcome.gateArtifactRef;
      if (input.researchReview) run.researchReview = input.researchReview;
      const verified = !input.researchReview && outcome.state === "ready";
      run.status = verified ? "ready" : "reviewable";
      run.updatedAt = completedAt;
      run.worker = { ...run.worker, state: "succeeded", jobId: null, workerId: null, lastHeartbeatAt: completedAt };
      run.blockers = [];
      run.nextAction = verified
        ? "单博主研究已发布到同一个 Dashboard；创作建议仍属于独立工作区。"
        : dossierReadyNextAction(videoReconstructionBatchSchema.parse(this.artifacts.read(run.reconstructionBatchArtifactRef!)).items.map((item) => item.state));
      run.dashboardPath = `/creators/${encodeURIComponent(run.creatorId ?? run.id)}`;
      stage(run, "synthesis").status = "complete";
      stage(run, "synthesis").message = verified
        ? "账号级归纳通过研究硬闸。"
        : input.researchReview?.candidateStatus === "revised_unverified"
          ? "单博主报告已按复核意见修订；修订稿尚未再次复核。"
          : "单博主报告已生成；独立复核状态与候选报告分开记录。";
      stage(run, "dashboard").status = "complete";
      stage(run, "dashboard").message = verified
        ? "动态 Dashboard projection 已可读取。" : "Dashboard 已可读取 DOSSIER_READY 报告。";
      this.repository.save(run);
      this.repository.appendEvent({ runId: run.id, jobId: null, type: "artifact.produced", createdAt: completedAt,
        message: verified ? "Workflow 博主综合正式版本已登记。" : "Workflow 博主综合暂定版本已登记。",
        payload: { synthesisArtifactRef: outcome.synthesisArtifactRef, gateArtifactRef: outcome.gateArtifactRef,
          state: outcome.state, registeredBy: input.registeredBy } });
      return { state: "registered", synthesisArtifactRef: outcome.synthesisArtifactRef,
        synthesisGateArtifactRef: outcome.gateArtifactRef,
        publication: verified ? "verified" : "provisional" };
    });
  }

  private requireRun(id: string): CreatorResearchRun {
    const run = this.repository.get(id);
    if (!run) throw new Error("CREATOR_RESEARCH_RUN_NOT_FOUND");
    return run;
  }

  private assertPostRunSources(run: CreatorResearchRun, source: FrozenPostVersionSource): void {
    if (run.selectionArtifactRef !== source.selectionArtifactRef || run.detailArtifactRef !== source.detailArtifactRef
      || run.mediaManifestArtifactRef !== source.mediaManifestArtifactRef) {
      throw new Error("STALE_WORKFLOW_SOURCE: post evidence inputs changed");
    }
  }
}
