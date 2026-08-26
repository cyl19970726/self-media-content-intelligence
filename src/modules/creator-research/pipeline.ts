import type { CreatorDossier } from "../../shared/creator-dossier.js";
import {
  creatorResearchPipelineSchema,
  type CreatorPipelineStage,
  type CreatorPipelineStageId,
  type CreatorResearchPipeline
} from "../../shared/creator-pipeline.js";
import type { CreatorResearchRun } from "../../shared/schema.js";

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
  { id: "media_verification", label: "代表视频媒体获取与核验", skillId: "xiaohongshu-creator-acquisition", workerKind: "media-worker", dashboardSections: ["portfolio", "deep"] },
  { id: "video_reconstruction", label: "单视频三镜头分析", skillId: "video-content-reconstruction", workerKind: "video-reconstruction-worker", dashboardSections: ["deep", "engines"] },
  { id: "video_evaluation", label: "单视频独立评估", skillId: "creator-research-evaluator", workerKind: "independent-video-evaluator", dashboardSections: ["deep", "engines"] },
  { id: "creator_synthesis", label: "跨视频与跨层级博主综合", skillId: "creator-research-synthesis", workerKind: "creator-synthesis-worker", dashboardSections: ["identity", "system", "tiers", "rhythm", "audience", "engines", "business"] },
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
  if (running) return { state: "running", gateState: "running", message: running.message ?? run.nextAction };
  if (run.status === "stale") return { state: "stale", gateState: "not_checked", message: "上游 revision 已变化，当前阶段需要重新验证。" };
  return null;
}

export function buildCreatorResearchPipeline(run: CreatorResearchRun | null, dossier?: DossierInput): CreatorResearchPipeline {
  const seeds = new Map(stageSeeds.map((seed) => [seed.id, seed]));
  const seed = (id: CreatorPipelineStageId) => {
    const value = seeds.get(id);
    if (!value) throw new Error(`missing pipeline seed ${id}`);
    return value;
  };
  const allRefs = unique([...(dossier ? statementArtifactRefs(dossier) : []), ...runArtifactRefs(run)]);
  const postCount = dossier?.corpus.postCount ?? run?.coverage.discoveredPosts ?? 0;
  const deepItems = dossier?.portfolio.items.filter((item) => item.deepSample) ?? [];
  const requiredDeepSamples = dossier ? Math.min(12, dossier.portfolio.items.length) : 12;
  const validatedDeep = deepItems.filter((item) => item.evidenceStatus === "deep_validated");
  const pendingDeep = deepItems.filter((item) => item.evidenceStatus === "deep_pending");
  const datedItems = dossier?.portfolio.items.filter((item) => item.publishedLabel !== null).length ?? run?.coverage.enrichedPosts ?? 0;
  const commentedItems = dossier?.portfolio.items.filter((item) => item.comments !== null).length ?? 0;
  const annotatedItems = dossier?.portfolio.items.filter((item) => item.topic !== null || item.format !== null).length ?? 0;
  const mediaItems = dossier?.portfolio.items.filter((item) => item.durationSeconds !== null || item.evidenceHref !== null).length ?? 0;
  const hasStatistics = Boolean((dossier && dossier.corpus.likesKnown > 0 && dossier.corpus.medianLikes !== null && dossier.corpus.meanLikes !== null && dossier.corpus.maxLikes !== null) || (!dossier && run?.portfolioArtifactRef));
  const surfaceSelectionReady = Boolean((dossier?.portfolio.items.length && dossier.portfolio.items.every((item) => item.id && item.selectionReason)) || (!dossier && run?.selectionArtifactRef));
  const selectionReady = Boolean(surfaceSelectionReady && (!dossier || deepItems.length >= requiredDeepSamples));
  const synthesisReady = Boolean(run?.synthesisArtifactRef);
  const creatorGateReady = Boolean(run?.synthesisGateArtifactRef && run.status === "ready");
  const identityReady = Boolean((run?.creatorId && run.creatorName) || (dossier?.identity.name && dossier.identity.profileHref));
  const contractRef = run ? `run:${run.id}` : dossier ? `dossier:${dossier.canonicalId}:${dossier.generatedAt}` : "system:missing";
  const inventoryState = postCount === 0 ? "pending" : dossier?.corpus.health.status === "full" ? "complete" : "partial";
  const inventoryGate = postCount === 0 ? "not_checked" : dossier?.corpus.health.status === "full" ? "passed" : "partial";
  const detailComplete = postCount > 0 && datedItems === postCount && commentedItems === postCount;
  const detailHasAny = datedItems > 0 || commentedItems > 0 || Boolean(run?.detailArtifactRef);
  const annotationComplete = Boolean(dossier?.contentSystem.health.status === "full" && annotatedItems === dossier.portfolio.items.length);
  const annotationHasAny = annotatedItems > 0 || Boolean(run?.portfolioArtifactRef) || Boolean(dossier?.contentSystem.topicClusters.length || dossier?.contentSystem.formatClusters.length);
  const reconstructionComplete = deepItems.length >= requiredDeepSamples && validatedDeep.length === deepItems.length;

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
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.portfolioArtifactRef], message: "全部统一选择记录已完成证据分层标注。" }
      : { state: annotationHasAny ? "partial" : "pending", gateState: annotationHasAny ? "partial" : "not_checked", artifactRefs: [run?.portfolioArtifactRef],
          missingInputs: [`结构化主题/形式标注：${annotatedItems}/${dossier?.portfolio.items.length ?? 0}`], message: "当前只允许把标题和封面作为作品级线索。",
          nextAction: "由全量内容标注 Skill 补齐主题、形式、价值、承诺、证明方式和证据范围。" }),
    stage(seed("corpus_statistics"), hasStatistics
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.portfolioArtifactRef, ...allRefs], message: `已从 ${dossier?.corpus.likesKnown ?? 0} 条已知点赞记录计算中位、均值、最高值和分布。` }
      : { missingInputs: ["可复算 corpus statistics"], message: "全量统计尚未形成。", nextAction: "由确定性统计 Worker 从 canonical corpus 重新计算。" }),
    stage(seed("sample_selection"), selectionReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.selectionArtifactRef], message: `${dossier?.portfolio.items.length ?? 0} 条记录共同驱动 List、Gallery 与深度覆盖。` }
      : { state: surfaceSelectionReady ? "partial" : "pending", gateState: surfaceSelectionReady ? "partial" : "not_checked", artifactRefs: [run?.selectionArtifactRef],
          missingInputs: [`代表深度样本：${deepItems.length}/${requiredDeepSamples}`], message: "统一作品集已可读，但代表性深度样本尚未达到研究合同。", nextAction: "由分层选样 Skill 补齐高、基本盘和低表现代表样本，并保留稳定 ID。" }),
    stage(seed("media_verification"), deepItems.length >= requiredDeepSamples && mediaItems >= deepItems.length
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.mediaManifestArtifactRef], message: `${mediaItems}/${deepItems.length} 条深度样本已有可读媒体或证据页。` }
      : { state: mediaItems > 0 ? "partial" : "pending", gateState: mediaItems > 0 ? "partial" : "not_checked", artifactRefs: [run?.mediaManifestArtifactRef],
          missingInputs: [`可核验深度媒体：${Math.min(mediaItems, deepItems.length)}/${requiredDeepSamples}`], message: "代表样本尚未全部取得，或媒体未全部通过文件、哈希和解码核验。",
          nextAction: "由媒体 Worker 获取并验证选中视频；不持久化签名 URL。" }),
    stage(seed("video_reconstruction"), reconstructionComplete
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.reconstructionBatchArtifactRef], message: `${validatedDeep.length}/${deepItems.length} 条深度样本完成内容、编导和画面分析。` }
      : { state: validatedDeep.length + pendingDeep.length > 0 ? "partial" : "pending", gateState: validatedDeep.length > 0 ? "partial" : "not_checked", artifactRefs: [run?.reconstructionBatchArtifactRef],
          missingInputs: [`完成三镜头分析：${validatedDeep.length}/${requiredDeepSamples}`], message: `${validatedDeep.length} 条已验证，${pendingDeep.length} 条待审，其余尚未还原。`,
          nextAction: "由单视频重建 Skill 继续生成逐字稿、知识关系、编导逻辑和画面剪辑证据。" }),
    stage(seed("video_evaluation"), reconstructionComplete
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.reconstructionBatchArtifactRef], message: `全部 ${deepItems.length} 条深度样本完成一次独立评估；质量提醒保留在研究证据中。` }
      : { state: validatedDeep.length > 0 ? "partial" : "pending", gateState: validatedDeep.length > 0 ? "partial" : "not_checked", artifactRefs: [run?.reconstructionBatchArtifactRef],
          missingInputs: [`单轮独立评估：${validatedDeep.length}/${requiredDeepSamples}`], message: "媒体不可读或产物损坏的视频不能进入博主级机制归纳。",
          nextAction: "由独立 Evaluator 对每条视频做一次通用与三镜头检查；内容缺口不触发自动修复。" }),
    stage(seed("creator_synthesis"), synthesisReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.synthesisArtifactRef], message: "定位、人群、价值、内容系统与表现差异已写入博主综合 Artifact。" }
      : { state: dossier?.growthEngines.statements.length ? "partial" : "pending", gateState: "not_checked", artifactRefs: [run?.synthesisArtifactRef],
          missingInputs: ["通过验证的 creator-analysis artifact"], message: "当前博主级结论仍受详情、评论或深度样本覆盖限制。",
          nextAction: "由博主研究综合 Skill 基于基本盘和验证视频重新归纳。" }),
    stage(seed("creator_evaluation"), creatorGateReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.synthesisGateArtifactRef], message: "博主研究已通过独立硬闸。" }
      : { state: run?.synthesisGateArtifactRef ? "partial" : "pending", gateState: run?.synthesisGateArtifactRef ? "partial" : "not_checked", artifactRefs: [run?.synthesisGateArtifactRef],
          missingInputs: ["独立 creator gate report"], message: "尚不能把当前研究升级为完整 Creator Dossier。",
          nextAction: "由独立博主研究 Evaluator 检查采集、选样、三镜头、综合与页面保真。" }),
    stage(seed("dashboard_projection"), creatorGateReady
      ? { state: "complete", gateState: "passed", artifactRefs: [run?.dashboardPath, `route:/creators/${dossier?.canonicalId ?? run?.creatorId ?? run?.id}`], message: "最后一版有效研究已投影到唯一 Creator Dashboard。" }
      : { state: dossier ? "partial" : "pending", gateState: dossier ? "partial" : "not_checked", artifactRefs: dossier ? [`route:/creators/${dossier.canonicalId}`] : [],
          missingInputs: ["creator_evaluation passed"], message: "页面可展示部分研究，但不会把它标成完整闭环。",
          nextAction: "补齐上游失败或缺失阶段后，Projection Worker 将在同一路由刷新。" })
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
    for (const id of pipelineIds) {
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
