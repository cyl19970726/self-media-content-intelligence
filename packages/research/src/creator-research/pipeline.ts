import type { CreatorDossier } from "../../../contracts/index.js";
import {
  creatorResearchPipelineSchema,
  type CreatorPipelineStage,
  type CreatorPipelineStageId,
  type CreatorResearchPipeline
} from "../../../contracts/index.js";
import type { CreatorResearchRun } from "../../../contracts/index.js";
import type { VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";

type DossierInput = Omit<CreatorDossier, "pipeline">;
type StageSeed = Omit<CreatorPipelineStage, "state" | "gateState" | "artifactRefs" | "missingInputs" | "message" | "nextAction">;

const stageSeeds: StageSeed[] = [
  { id: "run_contract", label: "研究合同与版本", skillId: "analyze-creator-videos", workerKind: "orchestrator", dashboardSections: ["identity"] },
  { id: "identity_verification", label: "身份与主页核验", skillId: "xiaohongshu-creator-acquisition", workerKind: "ego-browser-worker", dashboardSections: ["identity"] },
  { id: "inventory_acquisition", label: "全量基本盘采集", skillId: "xiaohongshu-creator-acquisition", workerKind: "ego-browser-worker", dashboardSections: ["corpus", "portfolio"] },
  { id: "detail_enrichment", label: "逐帖详情、日期、指标与评论", skillId: "xiaohongshu-creator-acquisition", workerKind: "detail-comment-worker", dashboardSections: ["rhythm", "audience", "business"] },
  { id: "portfolio_annotation", label: "全量内容标注", skillId: "creator-portfolio-annotation", workerKind: "annotation-worker", dashboardSections: ["system", "portfolio"] },
  { id: "corpus_statistics", label: "全量统计与数据健康", skillId: null, workerKind: "statistics-worker", dashboardSections: ["corpus", "tiers", "rhythm"] },
  { id: "sample_selection", label: "高 / 中位 / 均值附近 / 低表现选样", skillId: "creator-sample-selection", workerKind: "selection-worker", dashboardSections: ["tiers", "portfolio", "deep"] },
  { id: "media_verification", label: "代表帖子媒体获取与核验", skillId: "xiaohongshu-creator-acquisition", workerKind: "media-worker", dashboardSections: ["portfolio", "deep"] },
  { id: "video_reconstruction", label: "单帖子 Builder 重建", skillId: "video-content-reconstruction", workerKind: "video-reconstruction-worker", dashboardSections: ["deep", "engines"] },
  { id: "video_evaluation", label: "可选单帖子独立评估", skillId: "video-content-reconstruction", workerKind: "independent-video-evaluator", dashboardSections: ["deep", "engines"] },
  { id: "creator_synthesis", label: "跨帖子与跨层级博主综合", skillId: "creator-research-synthesis", workerKind: "creator-synthesis-worker", dashboardSections: ["identity", "system", "tiers", "rhythm", "audience", "engines", "business"] },
  { id: "creator_evaluation", label: "博主研究独立评测", skillId: "creator-research-evaluator", workerKind: "independent-creator-evaluator", dashboardSections: ["identity", "corpus", "system", "tiers", "portfolio", "deep", "rhythm", "audience", "engines", "business"] },
  { id: "dashboard_projection", label: "Creator Dossier 投影", skillId: null, workerKind: "projection-worker", dashboardSections: ["identity", "corpus", "system", "tiers", "portfolio", "deep", "rhythm", "audience", "engines", "business"] }
];

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

type StageInput = Partial<Omit<Pick<CreatorPipelineStage, "state" | "gateState" | "artifactRefs" | "missingInputs" | "message" | "nextAction">, "artifactRefs" | "missingInputs">> & {
  artifactRefs?: Array<string | null | undefined>;
  missingInputs?: Array<string | null | undefined>;
};

function stage(seed: StageSeed, input: StageInput): CreatorPipelineStage {
  return {
    ...seed,
    state: input.state ?? "pending",
    gateState: input.gateState ?? "not_checked",
    artifactRefs: unique(input.artifactRefs ?? []),
    missingInputs: unique(input.missingInputs ?? []),
    message: input.message ?? "尚未开始。",
    nextAction: input.nextAction ?? null
  };
}

function runArtifactRefs(run: CreatorResearchRun | null): string[] {
  if (!run) return [];
  return unique([
    run.inventoryArtifactRef,
    run.portfolioArtifactRef,
    run.selectionArtifactRef,
    run.detailArtifactRef,
    run.mediaManifestArtifactRef,
    run.reconstructionBatchArtifactRef,
    run.synthesisArtifactRef,
    run.synthesisGateArtifactRef
  ]);
}

function statementArtifactRefs(dossier: DossierInput): string[] {
  const text = JSON.stringify(dossier);
  return unique(text.match(/artifact:[^"\\\s]+/g) ?? []);
}

function runFailureState(run: CreatorResearchRun | null, ids: CreatorResearchRun["stages"][number]["id"][]): Pick<CreatorPipelineStage, "state" | "gateState" | "message"> | null {
  if (!run) return null;
  const matched = run.stages.filter((candidate) => ids.includes(candidate.id));
  const failed = matched.find((candidate) => candidate.status === "failed");
  if (failed) return { state: "failed", gateState: "failed", message: failed.message ?? "Worker 执行失败。" };
  const blocked = matched.find((candidate) => candidate.status === "blocked");
  if (blocked) return { state: "blocked", gateState: "blocked", message: blocked.message ?? "等待人工接管。" };
  const running = matched.find((candidate) => candidate.status === "running");
  const runIsActive = ["queued", "preflight", "collecting", "backoff"].includes(run.status);
  if (running && runIsActive) return { state: "running", gateState: "running", message: running.message ?? run.nextAction };
  if (run.status === "stale") return { state: "stale", gateState: "not_checked", message: "上游 revision 已变化，当前阶段需要重新验证。" };
  return null;
}

function coarseOverrideTargets(
  run: CreatorResearchRun | null,
  runIds: CreatorResearchRun["stages"][number]["id"][],
  pipelineIds: CreatorPipelineStageId[]
): CreatorPipelineStageId[] {
  if (run && runIds.includes("synthesis")) return ["creator_synthesis"];
  if (!run || !runIds.includes("deep_capture")) return pipelineIds;

  const hasVideoWork = Boolean(
    run.reconstructionBatchArtifactRef
    || run.videoWork.activePostExternalIds.length
    || run.videoWork.queuedPosts
    || run.videoWork.analyzedPosts
    || run.videoWork.failedPosts
  );
  if (hasVideoWork) return ["video_reconstruction", "video_evaluation"];

  const detailTarget = Math.min(run.coverage.comparisonPosts, run.collectionPolicy.budgets.maxDetailOpens);
  const detailsComplete = detailTarget > 0 && run.coverage.enrichedPosts >= detailTarget;
  if (run.mediaManifestArtifactRef || detailsComplete) return ["media_verification"];
  return ["detail_enrichment"];
}

export function buildCreatorResearchPipeline(run: CreatorResearchRun | null, dossier?: DossierInput, batch?: VideoReconstructionBatch | null): CreatorResearchPipeline {
  const seeds = new Map(stageSeeds.map((seed) => [seed.id, seed]));
  const seed = (id: CreatorPipelineStageId) => {
    const value = seeds.get(id);
    if (!value) throw new Error(`missing pipeline seed ${id}`);
    return value;
  };
  const allRefs = unique([...(dossier ? statementArtifactRefs(dossier) : []), ...runArtifactRefs(run)]);
  const postCount = dossier?.corpus.postCount ?? run?.coverage.discoveredPosts ?? 0;
  const deepItems = dossier?.portfolio.items.filter((item) => item.deepSample) ?? [];
  const runDeepSampleCount = run ? run.videoWork.analyzedPosts + run.videoWork.failedPosts
    + run.videoWork.activePostExternalIds.length + run.videoWork.queuedPosts : 0;
  const deepSampleCount = dossier ? deepItems.length : runDeepSampleCount;
  const registeredDeepSet = Boolean(run?.reconstructionBatchArtifactRef);
  const requiredDeepSamples = dossier
    ? registeredDeepSet && deepItems.length > 0 ? deepItems.length : Math.min(12, dossier.portfolio.items.length)
    : runDeepSampleCount || 12;
  const validatedDeep = deepItems.filter((item) => item.evidenceStatus === "deep_validated");
  const pendingDeep = deepItems.filter((item) => item.evidenceStatus === "deep_pending");
  const validatedDeepCount = dossier ? validatedDeep.length : run?.videoWork.analyzedPosts ?? 0;
  const builtDeepCount = run?.videoWork.analyzedPosts ?? validatedDeepCount;
  const evaluatedDeepCount = batch?.items.filter((item) => Boolean(item.evaluationArtifactRef)
    || ["evaluated_with_findings", "verified", "ready"].includes(item.state)).length ?? validatedDeepCount;
  const evaluatedWithFindingsCount = batch?.items.filter((item) => item.state === "evaluated_with_findings").length ?? 0;
  const pendingDeepCount = dossier ? pendingDeep.length : Math.max(0,
    runDeepSampleCount - validatedDeepCount - (run?.videoWork.failedPosts ?? 0));
  const boundedMediaGap = Boolean(dossier?.boundaries.some((item) => item.includes("bounded_media_retry_once")));
  const unavailableDeepCount = boundedMediaGap ? run?.videoWork.failedPosts ?? Math.max(0,
    deepSampleCount - validatedDeepCount - pendingDeepCount) : 0;
  const verifiedMediaCount = boundedMediaGap ? Math.max(0, deepSampleCount - unavailableDeepCount) : deepSampleCount;
  const datedItems = dossier?.portfolio.items.filter((item) => item.publishedLabel !== null).length ?? run?.coverage.enrichedPosts ?? 0;
  const commentedItems = dossier?.portfolio.items.filter((item) => item.comments !== null).length ?? 0;
  const annotatedItems = dossier?.portfolio.items.filter((item) => item.topic !== null || item.format !== null).length ?? 0;
  const mediaItems = dossier?.portfolio.items.filter((item) => item.durationSeconds !== null || item.evidenceHref !== null).length ?? 0;
  const hasStatistics = Boolean((dossier && dossier.corpus.likesKnown > 0 && dossier.corpus.medianLikes !== null && dossier.corpus.meanLikes !== null && dossier.corpus.maxLikes !== null) || (!dossier && run?.portfolioArtifactRef));
  const surfaceSelectionReady = Boolean((dossier?.portfolio.items.length && dossier.portfolio.items.every((item) => item.id && item.selectionReason)) || (!dossier && run?.selectionArtifactRef));
  const selectionReady = Boolean(surfaceSelectionReady && deepSampleCount >= requiredDeepSamples);
  const synthesisReady = Boolean(run?.synthesisArtifactRef);
  const creatorGateReady = Boolean(run?.synthesisGateArtifactRef && run.status === "ready");
  const identityReady = Boolean((run?.creatorId && run.creatorName) || (dossier?.identity.name && dossier.identity.profileHref));
  const contractRef = run ? `run:${run.id}` : dossier ? `dossier:${dossier.canonicalId}:${dossier.generatedAt}` : "system:missing";
  const inventoryState = postCount === 0 ? "pending" : dossier?.corpus.health.status === "full" ? "complete" : "partial";
  const inventoryGate = postCount === 0 ? "not_checked" : dossier?.corpus.health.status === "full" ? "passed" : "partial";
  const detailComplete = postCount > 0 && datedItems === postCount && commentedItems === postCount;
  const detailHasAny = datedItems > 0 || commentedItems > 0 || Boolean(run?.detailArtifactRef);
  const fullAnnotation = dossier?.corpus.annotationCoverage ?? null;
  const annotationComplete = Boolean(fullAnnotation && fullAnnotation.observedPosts > 0
    && fullAnnotation.annotatedPosts === fullAnnotation.observedPosts);
  const annotationHasAny = Boolean(fullAnnotation?.annotatedPosts) || annotatedItems > 0
    || Boolean(run?.portfolioAnnotationsArtifactRef) || Boolean(dossier?.contentSystem.topicClusters.length || dossier?.contentSystem.formatClusters.length);
  const mediaComplete = (Boolean(run?.reconstructionBatchArtifactRef && deepSampleCount > 0) && !boundedMediaGap)
    || (!boundedMediaGap && deepItems.length >= requiredDeepSamples && mediaItems >= deepItems.length);
  const reconstructionComplete = deepSampleCount >= requiredDeepSamples && builtDeepCount === deepSampleCount;

  const result: CreatorPipelineStage[] = [
    stage(seed("run_contract"), { state: "complete", gateState: "passed", artifactRefs: [contractRef], message: "研究目标、运行版本和职责边界已建立。" }),
    stage(seed("identity_verification"), identityReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.inventoryArtifactRef, ...allRefs], message: "博主名称与主页身份已进入 canonical 研究记录。" }
      : { missingInputs: ["第二个独立身份锚点"], message: "身份尚未闭环。", nextAction: "由小红书博主采集 Skill 继续核验主页身份。" }),
    stage(seed("inventory_acquisition"), { state: inventoryState, gateState: inventoryGate, artifactRefs: [run?.inventoryArtifactRef, ...allRefs],
      missingInputs: postCount ? dossier?.corpus.health.status === "full" ? [] : ["未观察作品缺口或明确终点证据"] : ["公开作品 inventory"],
      message: postCount ? `已观察 ${postCount} 条作品；${dossier?.corpus.health.reason ?? "覆盖范围按运行记录解释。"}` : "尚未取得公开作品基本盘。",
      nextAction: inventoryState === "complete" ? null : "由采集 Worker 从保存的 cursor 恢复，不从顶部重复抓取。" }),
    stage(seed("detail_enrichment"), detailComplete
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.detailArtifactRef], message: "选择范围的日期、公开指标和评论均已补齐。" }
      : { state: detailHasAny ? "partial" : "pending", gateState: detailHasAny ? "partial" : "not_checked", artifactRefs: [run?.detailArtifactRef],
          missingInputs: [datedItems < postCount ? `发布时间：${datedItems}/${postCount}` : null, commentedItems < postCount ? `评论：${commentedItems}/${postCount}` : null],
          message: `发布时间 ${datedItems}/${postCount || "—"}；评论 ${commentedItems}/${postCount || "—"}。`,
          nextAction: "由详情与评论 Worker 补齐公开日期、指标、评论和作者回复；缺失字段保持未知。" }),
    stage(seed("portfolio_annotation"), annotationComplete
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.portfolioAnnotationsArtifactRef], message: `全部 ${fullAnnotation?.annotatedPosts ?? 0} 条可见作品均有一行证据分层表层标注。` }
      : { state: annotationHasAny ? "partial" : "pending", gateState: annotationHasAny ? "partial" : "not_checked", artifactRefs: [run?.portfolioAnnotationsArtifactRef],
          missingInputs: [`全量表层标注：${fullAnnotation?.annotatedPosts ?? 0}/${fullAnnotation?.observedPosts ?? postCount}`], message: "当前只允许把标题和封面作为作品级线索。",
          nextAction: "由全量内容标注 Skill 补齐主题、形式、价值、承诺、证明方式和证据范围。" }),
    stage(seed("corpus_statistics"), hasStatistics
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.portfolioArtifactRef, ...allRefs], message: `已从 ${dossier?.corpus.likesKnown ?? 0} 条已知点赞记录计算中位、均值、最高值和分布。` }
      : { missingInputs: ["可复算 corpus statistics"], message: "全量统计尚未形成。", nextAction: "由确定性统计 Worker 从 canonical corpus 重新计算。" }),
    stage(seed("sample_selection"), selectionReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.selectionArtifactRef], message: `${dossier?.portfolio.items.length ?? 0} 条记录共同驱动 List、Gallery 与深度覆盖。` }
      : { state: surfaceSelectionReady ? "partial" : "pending", gateState: surfaceSelectionReady ? "partial" : "not_checked", artifactRefs: [run?.selectionArtifactRef],
          missingInputs: [`代表深度样本：${deepSampleCount}/${requiredDeepSamples}`], message: "统一作品集已可读，但代表性深度样本尚未达到研究合同。", nextAction: "由分层选样 Skill 补齐高、基本盘和低表现代表样本，并保留稳定 ID。" }),
    stage(seed("media_verification"), mediaComplete
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.mediaManifestArtifactRef], message: `${deepSampleCount}/${deepSampleCount} 条深度样本已冻结到视频重建批次。` }
      : { state: verifiedMediaCount > 0 || mediaItems > 0 ? "partial" : "pending", gateState: verifiedMediaCount > 0 || mediaItems > 0 ? "partial" : "not_checked", artifactRefs: [run?.mediaManifestArtifactRef],
          missingInputs: [`可核验深度媒体：${boundedMediaGap ? verifiedMediaCount : Math.min(mediaItems, deepItems.length)}/${requiredDeepSamples}`],
          message: boundedMediaGap
            ? `${verifiedMediaCount}/${deepSampleCount} 条媒体通过核验；${unavailableDeepCount} 条经一次定向补取仍不可得，帖子内容保持未知。`
            : "代表样本尚未全部取得，或媒体未全部通过文件、哈希和解码核验。",
          nextAction: boundedMediaGap ? "不再重试不可得媒体；综合只使用 surface_only 公开证据并保留未知。" : "由媒体 Worker 获取并验证选中视频；不持久化签名 URL。" }),
    stage(seed("video_reconstruction"), reconstructionComplete
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.reconstructionBatchArtifactRef], message: `${builtDeepCount}/${deepSampleCount} 条深度样本完成 Builder 内容、编导和画面分析；${validatedDeepCount} 条已正式验证。` }
      : { state: builtDeepCount + pendingDeepCount > 0 ? "partial" : "pending", gateState: builtDeepCount > 0 ? "partial" : "not_checked", artifactRefs: [run?.reconstructionBatchArtifactRef],
          missingInputs: [`完成 Builder 三镜头分析：${builtDeepCount}/${requiredDeepSamples}`],
          message: boundedMediaGap ? `${builtDeepCount} 条已构建；${unavailableDeepCount} 条媒体不可得，未生成视频内容结论。` : `${builtDeepCount} 条已构建，${validatedDeepCount} 条已正式验证，其余尚未还原。`,
          nextAction: boundedMediaGap ? "不可得成员保持 surface_only；不得从可用媒体借用机制。" : "由单帖子重建 Skill 继续生成文字、知识关系、编导逻辑和画面证据。" }),
    stage(seed("video_evaluation"), evaluatedDeepCount >= verifiedMediaCount && verifiedMediaCount > 0
      ? { state: "complete", gateState: evaluatedWithFindingsCount ? "partial" : "passed", artifactRefs: [run?.reconstructionBatchArtifactRef],
          message: `${evaluatedDeepCount}/${deepSampleCount} 条可用深度样本完成一次独立评估；${evaluatedWithFindingsCount} 条保留 findings。` }
      : { state: evaluatedDeepCount > 0 ? "partial" : "pending", gateState: evaluatedDeepCount > 0 ? "partial" : "not_checked", artifactRefs: [run?.reconstructionBatchArtifactRef],
          missingInputs: [`单轮独立评估：${evaluatedDeepCount}/${requiredDeepSamples}`],
          message: boundedMediaGap ? `${evaluatedDeepCount}/${deepSampleCount} 条可用帖子完成独立评估；${unavailableDeepCount} 条媒体不可得且未评估帖子内容。` : `${evaluatedDeepCount}/${deepSampleCount} 条完成独立评估；Evaluator 可跳过，未评估结果保持 provisional。`,
          nextAction: boundedMediaGap ? "不对不可得媒体生成或补造 evaluator 结论。" : "需要正式入 Wiki 时，由独立 Evaluator 对每条帖子做一次证据检查；内容缺口不触发自动修复。" }),
    stage(seed("creator_synthesis"), synthesisReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.synthesisArtifactRef], message: "定位、人群、价值、内容系统与表现差异已写入博主综合 Artifact。" }
      : { state: dossier?.growthEngines.statements.length ? "partial" : "pending", gateState: "not_checked", artifactRefs: [run?.synthesisArtifactRef],
          missingInputs: ["通过验证的 creator-analysis artifact"], message: "当前博主级结论仍受详情、评论或深度样本覆盖限制。",
          nextAction: "由博主研究综合 Skill 基于基本盘和验证视频重新归纳。" }),
    stage(seed("creator_evaluation"), creatorGateReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.synthesisGateArtifactRef], message: "博主研究已通过独立硬闸。" }
      : { state: run?.synthesisGateArtifactRef ? "partial" : "pending", gateState: run?.synthesisGateArtifactRef ? "partial" : "not_checked", artifactRefs: [run?.synthesisGateArtifactRef],
          missingInputs: ["正式 Wiki 所需的独立 creator gate report"], message: "当前 Creator Dossier 已可审阅，但仍是 provisional，尚不能进入正式 Wiki。",
          nextAction: "需要正式入 Wiki 时，再由独立博主研究 Evaluator 检查采集、选样、深度证据、综合与页面保真。" }),
    stage(seed("dashboard_projection"), creatorGateReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.dashboardPath, `route:/creators/${dossier?.canonicalId ?? run?.creatorId ?? run?.id}`], message: "最后一版有效研究已投影到唯一 Creator Dashboard。" }
      : { state: dossier ? "partial" : "pending", gateState: dossier ? "partial" : "not_checked", artifactRefs: dossier ? [`route:/creators/${dossier.canonicalId}`] : [],
          missingInputs: ["正式 Wiki：creator_evaluation passed"], message: "页面已展示可审阅的 provisional Creator Dossier，并明确保留未验证边界。",
          nextAction: "需要升级为正式 Wiki 时，补齐独立评估与必要数据后在同一路由刷新。" })
  ];

  const coarseMappings: Array<[CreatorPipelineStageId[], CreatorResearchRun["stages"][number]["id"][]]> = [
    [["run_contract", "identity_verification"], ["preflight"]],
    [["inventory_acquisition"], ["inventory"]],
    [["portfolio_annotation", "corpus_statistics", "sample_selection"], ["tiering"]],
    [["detail_enrichment", "media_verification", "video_reconstruction", "video_evaluation"], ["deep_capture"]],
    [["creator_synthesis", "creator_evaluation"], ["synthesis"]],
    [["dashboard_projection"], ["dashboard"]]
  ];
  // The persisted six-stage run is scheduling state, not research evidence. It may
  // report a coarse stage complete while one of the thirteen research gates is
  // still partial. Never promote the evidence-derived stages from that status.
  for (const [pipelineIds, runIds] of coarseMappings) {
    const override = runFailureState(run, runIds);
    if (!override) continue;
    for (const id of coarseOverrideTargets(run, runIds, pipelineIds)) {
      const candidate = result.find((item) => item.id === id);
      if (candidate && candidate.state !== "complete") Object.assign(candidate, override, { nextAction: run?.nextAction ?? candidate.nextAction });
    }
  }

  const projection = result.find((candidate) => candidate.id === "dashboard_projection")!;
  const upstreamComplete = result.filter((candidate) => candidate.id !== "dashboard_projection")
    .every((candidate) => candidate.state === "complete" && candidate.gateState === "passed");
  if (!upstreamComplete && projection.state === "complete") {
    Object.assign(projection, {
      state: "partial",
      gateState: "partial",
      missingInputs: ["全部上游阶段通过"],
      message: "页面已生成，但仍是部分研究投影；不会标成完整 Creator Dossier。",
      nextAction: "先修复上游未通过阶段，再刷新同一路由。"
    });
  }
  const pipelineReady = creatorGateReady && upstreamComplete && projection.state === "complete";
  const completedStages = result.filter((candidate) => candidate.state === "complete").length;
  const current = result.find((candidate) => ["failed", "blocked", "running", "stale"].includes(candidate.state))
    ?? result.find((candidate) => candidate.state !== "complete")
    ?? result.at(-1)!;
  const state = result.some((candidate) => candidate.state === "failed") ? "failed"
    : result.some((candidate) => candidate.state === "blocked") ? "blocked"
      : result.some((candidate) => candidate.state === "stale") ? "stale"
        : pipelineReady ? "ready"
          : result.some((candidate) => candidate.state === "running") ? "running" : "partial";
  return creatorResearchPipelineSchema.parse({ schemaVersion: "creator-research-pipeline@1", ready: pipelineReady,
    state, currentStageId: current.id, completedStages, totalStages: result.length, stages: result });
}
