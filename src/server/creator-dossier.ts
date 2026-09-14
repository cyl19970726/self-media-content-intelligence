import { selectedTierMetrics } from "./creator-distribution.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import type { CreatorSynthesis } from "../../packages/research/index.js";
import type { CreatorResearchRun } from "../shared/schema.js";
import { creatorDossierSchema, type CreatorDossier, type ResearchStatement } from "../shared/creator-dossier.js";
import { buildCreatorResearchPipeline } from "../../packages/research/index.js";
import { projectPostSourceFacts } from "./post-source-facts.js";

const tierLabels = { high: "高表现", base: "基本盘", low: "低表现" } as const;

function unknown(statement: string): ResearchStatement {
  return { statement, factClass: "unknown", confidence: "low", evidenceRefs: ["system:missing"], caveat: "当前证据未覆盖。" };
}

function claim(value: CreatorSynthesis["identity"]["positioning"]): ResearchStatement {
  return { statement: value.statement, factClass: value.factClass, confidence: value.confidence,
    evidenceRefs: value.evidenceRefs, caveat: value.caveat };
}

function health(status: "full" | "partial" | "missing", reason: string, capturedAt: string | null) {
  return { status, reason, capturedAt } as const;
}

type CorpusIntegrity = {
  corpusCompleteness?: "observed_converged" | "bounded_partial";
  stopReason?: "explicit_end" | "quiescent_incomplete" | "budget_reached";
};

type PortfolioAnnotations = NonNullable<ReturnType<CreatorResearchService["portfolio"]>>["annotations"];

function localVideoHref(runId: string, mediaItem: { state?: string; videoArtifactRef?: string | null } | undefined): string | null {
  const reference = mediaItem?.videoArtifactRef;
  const prefix = `/artifacts/${runId}/`;
  if (mediaItem?.state !== "verified_complete" || !reference?.startsWith(prefix)) return null;
  const relative = reference.slice(prefix.length);
  const segments = relative.split("/");
  return segments.length === 3
    && segments[0] === "deep-media"
    && segments[2] === "source-video.mp4"
    && segments.every((segment) => Boolean(segment) && segment !== "." && segment !== ".." && !segment.includes("\\"))
    ? reference : null;
}

function annotationClusters(
  annotations: PortfolioAnnotations,
  field: "topics" | "formats"
) {
  if (!annotations) return [];
  const clusters = new Map<string, { postIds: Set<string>; likes: Map<string, number | null>; evidenceRefs: Set<string> }>();
  for (const row of annotations.rows) {
    for (const value of row[field]) {
      const cluster = clusters.get(value.value) ?? {
        postIds: new Set<string>(), likes: new Map<string, number | null>(), evidenceRefs: new Set<string>()
      };
      cluster.postIds.add(row.postExternalId);
      cluster.likes.set(row.postExternalId, row.likes);
      value.evidenceRefs.forEach((reference) => cluster.evidenceRefs.add(reference));
      clusters.set(value.value, cluster);
    }
  }
  return [...clusters.entries()].map(([name, cluster]) => {
    const metrics = selectedTierMetrics([...cluster.likes.values()]);
    return {
      name,
      count: cluster.postIds.size,
      share: annotations.denominator.annotatedPosts ? cluster.postIds.size / annotations.denominator.annotatedPosts : null,
      measuredCount: [...cluster.likes.values()].filter((likes): likes is number => likes !== null).length,
      medianLikes: metrics.medianLikes,
      meanLikes: metrics.meanLikes,
      maxLikes: metrics.maxLikes,
      highCount: null,
      interpretation: null,
      evidenceRefs: [...cluster.evidenceRefs]
    };
  }).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
}

function annotationDistribution(annotations: PortfolioAnnotations, p25: number | null, p75: number | null) {
  if (!annotations || p25 === null || p75 === null) return [];
  const likes = annotations.rows.flatMap((row) => row.likes === null ? [] : [row.likes]);
  if (!likes.length) return [];
  const buckets = [
    { label: "低于 P25", count: likes.filter((value) => value < p25).length },
    { label: "P25–P75", count: likes.filter((value) => value >= p25 && value <= p75).length },
    { label: "高于 P75", count: likes.filter((value) => value > p75).length }
  ];
  return buckets.map((bucket) => ({ ...bucket, share: bucket.count / likes.length }));
}

function corpusHealth(analysis: { metricCoverage: { rate: number } } & CorpusIntegrity, capturedAt: string | null) {
  const completeness = analysis.corpusCompleteness;
  const stopReason = analysis.stopReason;
  const integrityReason = stopReason === "explicit_end" && completeness === "observed_converged"
    ? "采集明确结束且已达到观察收敛。"
    : stopReason === "budget_reached"
      ? "采集因预算停止，当前清单不是平台历史全量。"
      : stopReason === "quiescent_incomplete"
        ? "页面静默后停止，当前清单可能仍不完整。"
        : "采集完整性字段缺失，不能宣称平台历史全量。";
  const coveragePercent = Math.round(analysis.metricCoverage.rate * 100);
  const coverageReason = analysis.metricCoverage.rate >= 0.8
    ? `公开点赞覆盖 ${coveragePercent}%。`
    : `公开点赞覆盖 ${coveragePercent}%，低于 full 所需的 80% 门槛。`;
  const status = analysis.metricCoverage.rate >= 0.8
    && completeness === "observed_converged" && stopReason === "explicit_end" ? "full" : "partial";
  return health(status, `${coverageReason}${integrityReason}`, capturedAt);
}

function chooseRun(service: CreatorResearchService, id: string): CreatorResearchRun | null {
  return service.get(id) ?? service.list(100).find((run) => run.creatorId === id || run.canonicalSlug === id) ?? null;
}

export function projectRunDossier(service: CreatorResearchService, requestedId: string): CreatorDossier | null {
  const activeRun = chooseRun(service, requestedId);
  if (!activeRun) return null;
  const sameCreator = service.list(100).filter((run) => run.creatorId && run.creatorId === activeRun.creatorId);
  const explicitRunRequest = service.get(requestedId)?.id === requestedId;
  const candidates = [...new Map([activeRun, ...sameCreator].map((run) => [run.id, run])).values()];
  const sourceRun = explicitRunRequest
    ? candidates.find((run) => run.id === activeRun.id && run.portfolioArtifactRef && run.selectionArtifactRef) ?? activeRun
    : candidates.find((run) => ["ready", "reviewable"].includes(run.status) && run.synthesisArtifactRef && run.portfolioArtifactRef && run.selectionArtifactRef)
      ?? candidates.find((run) => Boolean(run.portfolioArtifactRef && run.selectionArtifactRef)) ?? activeRun;
  const data = service.portfolio(sourceRun.id);
  const synthesis = data?.synthesis ?? null;
  const analysis = data?.analysis ?? null;
  const annotations = data?.annotations ?? null;
  const selection = data?.selection ?? null;
  const details = new Map((data?.details?.posts ?? []).map((item) => [item.externalId, item]));
  const media = new Map((data?.mediaManifest?.items ?? []).map((item) => [item.externalId, item]));
  const reconstruction = new Map((data?.reconstructionBatch?.items ?? []).map((item) => [item.postExternalId, item]));
  const postAnalysis = new Map((synthesis?.postAnalyses ?? []).map((item) => [item.postExternalId, item]));
  const topicClusters = annotationClusters(annotations, "topics");
  const formatClusters = annotationClusters(annotations, "formats");
  const capturedAt = sourceRun.lastSnapshotAt;
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
      evidenceHref: reconstructed && ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(reconstructed.state)
        ? `/creators/${canonicalId}/videos/${item.externalId}?run=${sourceRun.id}` : null,
      coverHref: mediaItem?.coverArtifactRef ?? null,
      localVideoHref: localVideoHref(sourceRun.id, mediaItem),
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
      coreContent: analyzed?.contentRole ?? null,
      contentArchitecture: [],
      mechanismHypothesis: analyzed?.performanceInterpretation ?? null,
      selectionReason: item.selectionReason,
      evidenceStatus: reconstructed && ["verified", "ready"].includes(reconstructed.state) ? "deep_validated" as const
        : ["built_unevaluated", "evaluated_with_findings"].includes(reconstructed?.state ?? "") ? "deep_built" as const
        : item.deepCandidate ? "deep_pending" as const : analyzed ? "surface_only" as const : "missing" as const,
      sourceFacts: projectPostSourceFacts({
        sourceUrl: detail?.finalUrl ?? item.url,
        capturedAt: detail?.inspectedAt ?? capturedAt,
        title: detail?.title ?? item.title,
        caption: detail?.description ?? null,
        coverHref: mediaItem?.coverArtifactRef ?? null,
        mediaType: detail?.mediaType ?? item.mediaType,
        imageCount: detail?.imageCount ?? 0,
        publishedLabel: detail?.publishedLabel ?? null,
        likes: item.likes,
        collections: null,
        comments: null,
        shares: null,
        sourceRefs: [sourceRun.inventoryArtifactRef, sourceRun.detailArtifactRef, sourceRun.mediaManifestArtifactRef]
      })
    };
  });
  const synthesisRef = sourceRun.synthesisArtifactRef ?? `run:${sourceRun.id}`;
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
    run: sourceRun,
    lastGood: { active: sourceRun.id !== activeRun.id, reason: sourceRun.id !== activeRun.id ? "当前刷新尚未形成完整基本盘，页面保留上一版可读档案。" : null,
      revisionLabel: sourceRun.lastSnapshotAt },
    identity,
    corpus: {
      postCount: analysis ? analysis.metricCoverage.known + analysis.metricCoverage.missing : sourceRun.coverage.discoveredPosts,
      likesKnown: analysis?.metricCoverage.known ?? 0,
      coverageRate: analysis?.metricCoverage.rate ?? 0,
      medianLikes: analysis?.likes.median ?? null,
      meanLikes: analysis?.likes.mean ?? null,
      maxLikes: analysis?.likes.max ?? null,
      videoCount: annotations ? annotations.rows.filter((row) => row.mediaType === "video").length : null,
      highCount: null,
      percentiles: { p10: null, p25: analysis?.likes.p25 ?? null, p75: analysis?.likes.p75 ?? null, p90: null },
      distribution: annotationDistribution(annotations, analysis?.likes.p25 ?? null, analysis?.likes.p75 ?? null),
      notes: [analysis?.interpretationBoundary].filter((value): value is string => Boolean(value)),
      annotationCoverage: annotations ? { ...annotations.denominator, artifactRef: sourceRun.portfolioAnnotationsArtifactRef! } : null,
      health: analysis ? corpusHealth(analysis, capturedAt)
        : health("missing", "全量基本盘尚未生成。", capturedAt)
    },
    contentSystem: {
      topicClusters,
      formatClusters,
      topics: synthesis?.contentSystem.topicClusters.map(claim) ?? [],
      formats: synthesis?.contentSystem.formatClusters.map(claim) ?? [],
      visualLanguage: synthesis?.contentSystem.visualLanguage.map(claim) ?? [],
      recurringStructures: synthesis?.contentSystem.recurringStructure.map(claim) ?? [],
      health: health(synthesis || annotations ? "partial" : "missing", annotations
        ? "主题与形式聚类直接按全量表层标注的确定性标签计数；不替代深度内容结论。"
        : synthesis ? "本页提供文字综合；尚未提供主题与形式的可复算聚类统计。" : "等待博主综合硬闸。", capturedAt)
    },
    tiers: (["high", "base", "low"] as const).map((tier) => ({ id: tier, label: tierLabels[tier], conclusion: tierClaims(tier), mechanisms: [], failurePatterns: [],
      metrics: selectedTierMetrics(items.filter(item => item.tier === tier).map(item => item.likes)),
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
    ...(synthesis?.crossPostResearch ? { crossPostResearch: synthesis.crossPostResearch } : {}),
    boundaries: [analysis?.interpretationBoundary ?? "公开表现不等于曝光、留存、转粉或成交。", ...(analysis?.unknowns ?? []), ...(synthesis?.boundaries ?? []),
      `综合证据：${synthesisRef}`]
  });
}

export function loadCreatorDossier(service: CreatorResearchService, id: string): CreatorDossier | null {
  const runProjection = projectRunDossier(service, id);
  if (!runProjection) return null;
  const batch = runProjection.run ? service.portfolio(runProjection.run.id)?.reconstructionBatch ?? null : null;
  return creatorDossierSchema.parse({ ...runProjection, pipeline: buildCreatorResearchPipeline(runProjection.run, runProjection, batch) });
}
