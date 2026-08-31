import type { CreatorResearchService } from "../../packages/research/index.js";
import type { CreatorSynthesis } from "../../packages/research/index.js";
import type { CreatorResearchRun, CreatorConsole } from "../shared/schema.js";
import { creatorDossierSchema, type CreatorDossier, type ResearchStatement } from "../shared/creator-dossier.js";
import { loadCreatorConsole } from "./console.js";
import { loadLegacyDeepDossier } from "./legacy-deep-dossiers.js";
import { loadNextWaveDossier } from "./next-wave-dossier.js";
import { buildCreatorResearchPipeline } from "../../packages/research/index.js";

const tierLabels = { high: "高表现", base: "基本盘", low: "低表现" } as const;

function unknown(statement: string): ResearchStatement {
  return { statement, factClass: "unknown", confidence: "low", evidenceRefs: ["system:missing"], caveat: "当前证据未覆盖。" };
}

function observed(statement: string, evidenceRef: string): ResearchStatement {
  return { statement, factClass: "observed", confidence: "high", evidenceRefs: [evidenceRef], caveat: null };
}

function claim(value: CreatorSynthesis["identity"]["positioning"]): ResearchStatement {
  return { statement: value.statement, factClass: value.factClass, confidence: value.confidence,
    evidenceRefs: value.evidenceRefs, caveat: value.caveat };
}

function health(status: "full" | "partial" | "missing", reason: string, capturedAt: string | null) {
  return { status, reason, capturedAt } as const;
}

export function projectLegacyDossier(id: string, data: CreatorConsole): CreatorDossier {
  const ref = `legacy:creator-console:${id}`;
  const items = data.tiers.flatMap((tier) => tier.videos.map((video, index) => ({
    id: video.id,
    title: video.title,
    sourceHref: data.meta.profileUrl,
    evidenceHref: video.selected ? `/creators/${id}/videos/${video.id}` : null,
    coverHref: video.cover,
    tier: tier.id,
    tierRank: index + 1,
    anchors: [],
    deepSample: video.selected,
    likes: video.likes,
    collections: video.collections,
    comments: null,
    shares: null,
    percentileRank: null,
    publishedLabel: video.publishedLabel,
    durationSeconds: null,
    topic: video.archetype,
    format: null,
    coreContent: null,
    contentArchitecture: [],
    mechanismHypothesis: tier.conclusion,
    selectionReason: `${tier.name}兼容样本第 ${index + 1} 条`,
    evidenceStatus: video.selected ? "deep_validated" as const : "surface_only" as const
  })));
  const mapped = data.contentMap.items.map((item) => observed(
    [item.name, item.signal, item.mechanism].filter(Boolean).join("："), ref
  ));
  return creatorDossierSchema.parse({
    schemaVersion: "1.0.0",
    canonicalId: id,
    source: "legacy_adapter",
    generatedAt: new Date().toISOString(),
    run: null,
    lastGood: { active: true, reason: "当前页面由已复核旧 Artifact 适配；刷新任务不会覆盖它。", revisionLabel: data.meta.capturedAt },
    identity: {
      name: data.meta.name,
      profileHref: data.meta.profileUrl,
      positioning: observed(data.meta.positioning, ref),
      audience: [unknown("服务人群尚未迁移到结构化证据。")],
      valuesProvided: [unknown("给用户提供的价值尚未迁移到结构化证据。")],
      trustSources: [unknown("信任来源尚未迁移到结构化证据。")],
      lifecycle: unknown("账号生命周期尚未形成证据化判断。"),
      commercialPaths: [unknown("商业路径尚未形成证据化判断。")]
    },
    corpus: {
      postCount: data.baseline?.postCount ?? 0,
      likesKnown: data.baseline?.postCount ?? 0,
      coverageRate: data.baseline ? 1 : 0,
      medianLikes: data.baseline?.medianLikes ?? null,
      meanLikes: data.baseline?.meanLikes ?? null,
      maxLikes: data.baseline?.maxLikes ?? null,
      videoCount: data.baseline?.postCount ?? null,
      highCount: null,
      percentiles: { p10: null, p25: null, p75: null, p90: null },
      distribution: data.baseline?.distribution ?? [],
      notes: [data.baseline?.averageNote].filter((value): value is string => Boolean(value)),
      health: data.baselineHealth ?? health("missing", "基本盘未覆盖。", data.meta.capturedAt)
    },
    contentSystem: {
      topicClusters: [],
      formatClusters: [],
      topics: data.contentMap.slotName.includes("内容") ? mapped : [],
      formats: [],
      visualLanguage: [],
      recurringStructures: data.contentMap.slotName.includes("内容") ? [] : mapped,
      health: health(mapped.length ? "partial" : "missing", `${data.contentMap.slotName}来自兼容 Artifact，尚未统一主题与形式标注。`, data.meta.capturedAt)
    },
    tiers: data.tiers.map((tier) => ({ id: tier.id, label: tierLabels[tier.id], conclusion: [observed(tier.conclusion, ref)], mechanisms: [], failurePatterns: [],
      metrics: { medianLikes: null, meanLikes: null, minLikes: null, maxLikes: null }, count: tier.videos.length })),
    portfolio: { items, deepCount: items.filter((item) => item.deepSample).length,
      health: health(items.length === 21 ? "full" : "partial", `兼容数据集包含 ${items.length} 条。`, data.meta.capturedAt) },
    rhythm: { statements: data.rhythm ? [observed(data.rhythm.conclusion, ref)] : [],
      weekdays: data.rhythm?.weekdays ?? [], dayparts: data.rhythm?.dayparts ?? [],
      health: data.rhythmHealth ?? health("missing", "发布节奏未覆盖。", data.meta.capturedAt) },
    audienceDemand: { statements: [], health: health("missing", "评论与用户需求尚未迁移。", data.meta.capturedAt) },
    growthEngines: { statements: data.contentMap.slotName.includes("增长") ? mapped : [],
      health: health(mapped.length && data.contentMap.slotName.includes("增长") ? "partial" : "missing", "只描述已观察内容系统，不生成复刻建议。", data.meta.capturedAt) },
    businessPath: { statements: [], health: health("missing", "商业路径尚未迁移。", data.meta.capturedAt) },
    boundaries: data.boundaries
  });
}

function chooseRun(service: CreatorResearchService, id: string): CreatorResearchRun | null {
  return service.get(id) ?? service.list(100).find((run) => run.creatorId === id || run.canonicalSlug === id) ?? null;
}

export function projectRunDossier(service: CreatorResearchService, requestedId: string): CreatorDossier | null {
  const activeRun = chooseRun(service, requestedId);
  if (!activeRun) return null;
  const sameCreator = service.list(100).filter((run) => run.creatorId && run.creatorId === activeRun.creatorId);
  const sourceRun = [activeRun, ...sameCreator]
    .find((run) => Boolean(run.portfolioArtifactRef && run.selectionArtifactRef)) ?? activeRun;
  const data = service.portfolio(sourceRun.id);
  const synthesis = data?.synthesis ?? null;
  const analysis = data?.analysis ?? null;
  const selection = data?.selection ?? null;
  const details = new Map((data?.details?.posts ?? []).map((item) => [item.externalId, item]));
  const media = new Map((data?.mediaManifest?.items ?? []).map((item) => [item.externalId, item]));
  const reconstruction = new Map((data?.reconstructionBatch?.items ?? []).map((item) => [item.postExternalId, item]));
  const postAnalysis = new Map((synthesis?.postAnalyses ?? []).map((item) => [item.postExternalId, item]));
  const capturedAt = activeRun.lastSnapshotAt;
  const canonicalId = activeRun.canonicalSlug ?? activeRun.creatorId ?? activeRun.id;
  const items = (selection?.items ?? []).map((item) => {
    const detail = details.get(item.externalId);
    const mediaItem = media.get(item.externalId);
    const reconstructed = reconstruction.get(item.externalId);
    const analyzed = postAnalysis.get(item.externalId);
    return {
      id: item.externalId,
      title: detail?.title ?? item.title ?? "标题未识别",
      sourceHref: detail?.finalUrl ?? item.url,
      evidenceHref: reconstructed && ["built_unevaluated", "verified", "ready"].includes(reconstructed.state)
        ? `/creators/${canonicalId}/videos/${item.externalId}?run=${sourceRun.id}` : null,
      coverHref: mediaItem?.coverArtifactRef ?? null,
      tier: item.tier,
      tierRank: item.tierRank,
      anchors: item.anchors,
      deepSample: item.deepCandidate,
      likes: item.likes,
      collections: null,
      comments: null,
      shares: null,
      percentileRank: null,
      publishedLabel: detail?.publishedLabel ?? null,
      durationSeconds: mediaItem?.durationSeconds ?? null,
      topic: analyzed?.contentRole ?? null,
      format: analyzed?.contentForm.join(" / ") ?? (detail?.mediaType ?? item.mediaType),
      coreContent: analyzed?.performanceInterpretation ?? detail?.description ?? null,
      contentArchitecture: [],
      mechanismHypothesis: analyzed?.performanceInterpretation ?? null,
      selectionReason: item.selectionReason,
      evidenceStatus: reconstructed && ["verified", "ready"].includes(reconstructed.state) ? "deep_validated" as const
        : reconstructed?.state === "built_unevaluated" ? "deep_built" as const
        : item.deepCandidate ? "deep_pending" as const : analyzed ? "surface_only" as const : "missing" as const
    };
  });
  const synthesisRef = activeRun.synthesisArtifactRef ?? sourceRun.synthesisArtifactRef ?? `run:${sourceRun.id}`;
  const identity = synthesis ? {
    name: activeRun.creatorName ?? sourceRun.creatorName ?? "待识别博主",
    profileHref: activeRun.profileUrl,
    positioning: claim(synthesis.identity.positioning),
    audience: synthesis.identity.audience.map(claim),
    valuesProvided: synthesis.identity.valueProvided.map(claim),
    trustSources: synthesis.identity.trustSources.map(claim),
    lifecycle: claim(synthesis.identity.lifecycleStage),
    commercialPaths: synthesis.identity.commercialPaths.map(claim)
  } : {
    name: activeRun.creatorName ?? sourceRun.creatorName ?? "待识别博主",
    profileHref: activeRun.profileUrl,
    positioning: unknown("账号定位等待证据化归纳。"),
    audience: [unknown("服务人群等待证据化归纳。")],
    valuesProvided: [unknown("用户价值等待证据化归纳。")],
    trustSources: [unknown("信任来源等待证据化归纳。")],
    lifecycle: unknown("账号生命周期等待证据化归纳。"),
    commercialPaths: [unknown("商业路径等待证据化归纳。")]
  };
  const tierClaims = (tier: "high" | "base" | "low") => {
    const values = tier === "high" ? synthesis?.performance.high : tier === "low" ? synthesis?.performance.low : synthesis?.performance.baseline;
    return values?.map(claim) ?? [unknown(`${tierLabels[tier]}机制等待高 / 中位 / 均值附近 / 低表现四组深度证据闭环。`)];
  };
  return creatorDossierSchema.parse({
    schemaVersion: "1.0.0",
    canonicalId,
    source: "versioned_run",
    generatedAt: new Date().toISOString(),
    run: activeRun,
    lastGood: { active: sourceRun.id !== activeRun.id, reason: sourceRun.id !== activeRun.id ? "当前刷新尚未形成完整基本盘，页面保留上一版可读档案。" : null,
      revisionLabel: sourceRun.lastSnapshotAt },
    identity,
    corpus: {
      postCount: analysis ? analysis.metricCoverage.known + analysis.metricCoverage.missing : activeRun.coverage.discoveredPosts,
      likesKnown: analysis?.metricCoverage.known ?? 0,
      coverageRate: analysis?.metricCoverage.rate ?? 0,
      medianLikes: analysis?.likes.median ?? null,
      meanLikes: analysis?.likes.mean ?? null,
      maxLikes: analysis?.likes.max ?? null,
      videoCount: null,
      highCount: null,
      percentiles: { p10: null, p25: null, p75: null, p90: null },
      distribution: [],
      notes: [analysis?.interpretationBoundary].filter((value): value is string => Boolean(value)),
      health: health(analysis ? analysis.metricCoverage.rate >= 0.8 ? "full" : "partial" : "missing",
        analysis ? `公开点赞覆盖 ${Math.round(analysis.metricCoverage.rate * 100)}%。` : "全量基本盘尚未生成。", capturedAt)
    },
    contentSystem: {
      topicClusters: [],
      formatClusters: [],
      topics: synthesis?.contentSystem.topicClusters.map(claim) ?? [],
      formats: synthesis?.contentSystem.formatClusters.map(claim) ?? [],
      visualLanguage: synthesis?.contentSystem.visualLanguage.map(claim) ?? [],
      recurringStructures: synthesis?.contentSystem.recurringStructure.map(claim) ?? [],
      health: health(synthesis ? "full" : "missing", synthesis ? "内容系统来自通过验证的博主综合。" : "等待博主综合硬闸。", capturedAt)
    },
    tiers: (["high", "base", "low"] as const).map((tier) => ({ id: tier, label: tierLabels[tier], conclusion: tierClaims(tier), mechanisms: [], failurePatterns: [],
      metrics: { medianLikes: null, meanLikes: null, minLikes: null, maxLikes: null },
      count: selection?.items.filter((item) => item.tier === tier).length ?? 0 })),
    portfolio: { items, deepCount: items.filter((item) => item.deepSample).length,
      health: health(items.length === 21 ? "full" : items.length ? "partial" : "missing", `${items.length}/21 条 canonical 记录可读。`, capturedAt) },
    rhythm: { statements: synthesis?.contentSystem.publishingRhythm.map(claim) ?? [], weekdays: [], dayparts: [],
      health: health(synthesis?.contentSystem.publishingRhythm.length ? "partial" : "missing", "发布时间与内容演化只按已捕捉范围解释。", capturedAt) },
    audienceDemand: { statements: [], health: health("missing", "评论需求尚未进入当前综合合同。", capturedAt) },
    growthEngines: { statements: synthesis ? [...synthesis.performance.high, ...synthesis.contentSystem.recurringStructure].map(claim) : [],
      health: health(synthesis ? "partial" : "missing", "这里只描述观察到的内容系统，不输出复刻建议。", capturedAt) },
    businessPath: { statements: synthesis?.identity.commercialPaths.map(claim) ?? [],
      health: health(synthesis?.identity.commercialPaths.length ? "partial" : "missing", "商业路径只记录可见迹象与未知。", capturedAt) },
    boundaries: [analysis?.interpretationBoundary ?? "公开表现不等于曝光、留存、转粉或成交。", ...(analysis?.unknowns ?? []), ...(synthesis?.boundaries ?? []),
      `综合证据：${synthesisRef}`]
  });
}

export function loadCreatorDossier(service: CreatorResearchService, id: string): CreatorDossier | null {
  const runProjection = projectRunDossier(service, id);
  if (runProjection) return creatorDossierSchema.parse({ ...runProjection, pipeline: buildCreatorResearchPipeline(runProjection.run, runProjection) });
  const nextWave = loadNextWaveDossier(id);
  if (nextWave) return creatorDossierSchema.parse({ ...nextWave, pipeline: buildCreatorResearchPipeline(null, nextWave) });
  const deepLegacy = loadLegacyDeepDossier(id);
  if (deepLegacy) return creatorDossierSchema.parse({ ...deepLegacy, pipeline: buildCreatorResearchPipeline(null, deepLegacy) });
  const legacy = loadCreatorConsole(id);
  if (!legacy) return null;
  const projection = projectLegacyDossier(id, legacy);
  return creatorDossierSchema.parse({ ...projection, pipeline: buildCreatorResearchPipeline(null, projection) });
}
