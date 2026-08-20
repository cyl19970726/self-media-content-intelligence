import fs from "node:fs";
import path from "node:path";
import { creatorDossierSchema, type CreatorDossier, type ResearchStatement } from "../shared/creator-dossier.js";
import { asNumber, asRecord, asString, asStringOrNull, positioningOf, readJson, researchDir } from "./creator-meta.js";

type Row = Record<string, unknown>;

const ref = (creator: string, file: string) => `artifact:${creator}/${file}`;
const arr = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
const strArr = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const health = (status: "full" | "partial" | "missing", reason: string, capturedAt: string | null) => ({ status, reason, capturedAt });
const statement = (value: string, evidenceRef: string, factClass: ResearchStatement["factClass"] = "observed", confidence: ResearchStatement["confidence"] = "high", caveat: string | null = null): ResearchStatement => ({ statement: value, factClass, confidence, evidenceRefs: [evidenceRef], caveat });
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] ?? null : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};
const stats = (rows: Row[]) => {
  const values = rows.map((row) => asNumber(row.likes)).filter((value): value is number => value !== null);
  return { medianLikes: median(values), meanLikes: mean(values), minLikes: values.length ? Math.min(...values) : null, maxLikes: values.length ? Math.max(...values) : null };
};
const distribution = (values: number[]) => {
  const bands = [
    { label: "<100", test: (v: number) => v < 100 }, { label: "100–499", test: (v: number) => v >= 100 && v < 500 },
    { label: "500–999", test: (v: number) => v >= 500 && v < 1000 }, { label: "1k–4,999", test: (v: number) => v >= 1000 && v < 5000 },
    { label: "5k–9,999", test: (v: number) => v >= 5000 && v < 10000 }, { label: "≥10k", test: (v: number) => v >= 10000 }
  ];
  return bands.map((band) => { const count = values.filter(band.test).length; return { label: band.label, count, share: values.length ? Math.round(count / values.length * 1000) / 10 : 0 }; });
};
const formatPublished = (value: unknown) => typeof value === "string" ? value.replace("T", " ").replace(/\.000Z$/, " UTC") : null;
const stageHeadings = (value: unknown) => arr(asRecord(value).stages).map((stage) => asString(stage.heading)).filter(Boolean);
const publicFrame = (relative: string) => `/research/${relative.replace(/^\.\.\//, "")}`;

function clusterRows(rows: Row[], total: number, evidenceRef: string) {
  return rows.map((row) => ({
    name: asString(row.name), count: asNumber(row.count) ?? 0, share: total ? (asNumber(row.count) ?? 0) / total : null,
    measuredCount: asNumber(row.measuredCount) ?? asNumber(row.count) ?? 0, medianLikes: asNumber(row.medianLikes), meanLikes: asNumber(row.meanLikes),
    maxLikes: asNumber(row.maxLikes), highCount: asNumber(row.hits10k), interpretation: asStringOrNull(row.interpretation), evidenceRefs: [evidenceRef]
  }));
}

function deepGate(creatorRoot: string, id: string) {
  const root = path.join(researchDir, creatorRoot, "content-reconstruction-v1", "videos", id);
  if (!fs.existsSync(root)) return { exists: false, ready: false };
  const candidates = fs.readdirSync(root).filter((name) => /^evaluation(?:-v\d+)?$/.test(name)).sort().reverse();
  for (const name of candidates) {
    for (const file of ["gate-report.json", "evaluation.json"]) {
      const full = path.join(root, name, file); if (!fs.existsSync(full)) continue;
      const parsed = JSON.parse(fs.readFileSync(full, "utf8")) as Row;
      if (parsed.ready === true || parsed.hardGatePass === true || asRecord(parsed.gate).pass === true) return { exists: true, ready: true };
    }
  }
  return { exists: fs.existsSync(path.join(root, "skill-run", "reconstruction.json")), ready: false };
}

function redWitch(): CreatorDossier | null {
  const overview = readJson("ai-red-witch/video-library/creator-overview.json");
  const library = readJson("ai-red-witch/video-library/library.json");
  const focus = readJson("ai-red-witch/selected-high-like/focus-reconstruction.json");
  const analysis = readJson("ai-red-witch/selected-high-like/analysis.json");
  if (!overview || !library || !focus || !analysis) return null;
  const creator = asRecord(overview.creator); const corpus = asRecord(overview.publicCorpus); const likeStats = asRecord(corpus.videoLikeStats);
  const videos = arr(library.videos); const deepById = new Map(arr(focus.videos).map((item) => [asString(item.id), item]));
  const tierComparison = asRecord(overview.threeTierComparison); const tierStats = asRecord(tierComparison.tiers);
  const perf = asRecord(overview.performanceFormats); const capturedAt = asStringOrNull(asRecord(analysis.coverage).capturedAt);
  const items = videos.map((video) => {
    const id = asString(video.id); const engagement = asRecord(video.engagement); const deep = deepById.get(id); const gate = deepGate("ai-red-witch", id);
    const frames = asRecord(video.frames); const sparse = arr(frames.sparse); const cover = sparse[0] ? `/research/ai-red-witch/video-library/reports/${id}/${asString(sparse[0].src)}` : null;
    return {
      id, title: asString(video.title), sourceHref: asString(video.sourceUrl), evidenceHref: `/creators/ai-red-witch/videos/${id}`,
      coverHref: cover, tier: asString(video.tier) === "median" ? "base" as const : asString(video.tier) as "high" | "low", tierRank: 1,
      anchors: asString(video.tier) === "median" ? ["median_near" as const, "typical_form" as const] : [], deepSample: Boolean(deep),
      likes: asNumber(engagement.likes), collections: asNumber(engagement.collections), comments: asNumber(engagement.comments), shares: asNumber(engagement.shares), percentileRank: null,
      publishedLabel: asStringOrNull(video.publishedLabel), durationSeconds: asNumber(video.duration), topic: asStringOrNull(video.primaryCategory),
      format: deep ? asStringOrNull(deep.formatType) : asStringOrNull(video.primaryCategory), coreContent: asStringOrNull(video.contentIntent) ?? asStringOrNull(video.coreClaim),
      contentArchitecture: stageHeadings(video.contentArchitecture), mechanismHypothesis: deep ? asStringOrNull(deep.mechanism) : asStringOrNull(video.coreClaim),
      selectionReason: deep ? asString(deep.selectionReason) : "21 条分层比较样本；未进入 9 条深度机制集。",
      evidenceStatus: id === "6801c0750000000007037156" ? "deep_validated" as const : gate.exists || deep ? "deep_pending" as const : "surface_only" as const
    };
  });
  (["high", "base", "low"] as const).forEach((tier) => items.filter((item) => item.tier === tier).forEach((item, index) => { item.tierRank = index + 1; }));
  const findings = arr(tierComparison.findings);
  const tier = (id: "high" | "base" | "low", sourceId: string) => {
    const rows = items.filter((item) => item.tier === id); const raw = asRecord(tierStats[sourceId]); const performance = asRecord(perf[sourceId]);
    const formats = arr(performance.formats);
    const conclusions = [asString(performance.conclusion), ...findings.map((finding) => `${asString(finding.name)}：${asString(finding[sourceId])}`)].filter(Boolean);
    const mechanisms = formats.length
      ? formats.map((format) => `${asString(format.name)}：${asString(format.structure)}；${asString(format.why) || asString(format.diagnosis)}`)
      : rows.slice(0, 5).map((row) => `${row.topic ?? "未标注形式"}：${row.mechanismHypothesis ?? row.coreContent ?? row.title}`);
    return { id, label: id === "high" ? "高表现" : id === "base" ? "基本盘（中位附近）" : "低表现", count: rows.length,
      conclusion: conclusions.map((value) => statement(value, ref("ai-red-witch", "video-library/creator-overview.json"))),
      mechanisms: mechanisms.map((value) => statement(value, ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")),
      failurePatterns: formats.map((format) => asString(format.risk)).filter(Boolean).map((value) => statement(value, ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")),
      metrics: { medianLikes: asNumber(raw.medianLikes), meanLikes: mean(rows.map((row) => row.likes).filter((value): value is number => value !== null)), minLikes: rows.length ? Math.min(...rows.map((row) => row.likes ?? 0)) : null, maxLikes: rows.length ? Math.max(...rows.map((row) => row.likes ?? 0)) : null }
    };
  };
  const contentSystem = arr(overview.contentSystem); const language = asRecord(overview.videoLanguage); const topics = arr(asRecord(overview.titleHeuristics).topics); const formats = arr(asRecord(overview.titleHeuristics).forms);
  return creatorDossierSchema.parse({
    schemaVersion: "1.0.0", canonicalId: "ai-red-witch", source: "legacy_adapter", generatedAt: new Date().toISOString(), run: null,
    lastGood: { active: true, reason: "直接投影既有 331 条公开基本盘、21 条分层样本与 9 条深度重建；没有降级为占位数据。", revisionLabel: capturedAt },
    identity: { name: asString(creator.name), profileHref: asString(asRecord(analysis.creator).profile), positioning: statement(asString(creator.positioningSentence), ref("ai-red-witch", "video-library/creator-overview.json")),
      audience: [statement(asString(creator.audience), ref("ai-red-witch", "video-library/creator-overview.json"))], valuesProvided: [statement(asString(creator.promise), ref("ai-red-witch", "video-library/creator-overview.json"))],
      trustSources: [statement(asString(creator.credibility), ref("ai-red-witch", "video-library/creator-overview.json"))], lifecycle: statement("已形成稳定视觉身份、内容组合与商业内容角色，处于稳定增长与商业化并行阶段。", ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium"),
      commercialPaths: [statement(asString(creator.businessRole), ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")] },
    corpus: { postCount: asNumber(corpus.notes) ?? 0, videoCount: asNumber(corpus.videos), likesKnown: asNumber(corpus.videos) ?? 0,
      coverageRate: (asNumber(corpus.notes) ?? 0) > 0 ? (asNumber(corpus.videos) ?? 0) / (asNumber(corpus.notes) ?? 1) : 0,
      medianLikes: asNumber(likeStats.median), meanLikes: asNumber(likeStats.mean), maxLikes: asNumber(likeStats.max), highCount: asNumber(likeStats.gte10000),
      percentiles: { p10: asNumber(likeStats.p10), p25: asNumber(likeStats.p25), p75: asNumber(likeStats.p75), p90: asNumber(likeStats.p90) },
      distribution: arr(corpus.distribution).map((row) => ({ label: asString(row.label), count: asNumber(row.count) ?? 0, share: asNumber(row.share) ?? 0 })),
      notes: ["331 条公开盘面提供聚合基本盘；21 条分层样本提供逐条内容、互动、发布时间、时长、架构与贴片。", "公开互动不能推出播放、留存、涨粉、投流或成交。"],
      health: health("partial", "331 条全量聚合 + 21 条逐条深样本；全量逐条原始行未落盘，因此主题/形式来自标题启发式聚类。", capturedAt) },
    contentSystem: { topicClusters: clusterRows(topics, asNumber(corpus.notes) ?? 0, ref("ai-red-witch", "video-library/creator-overview.json")), formatClusters: clusterRows(formats, asNumber(corpus.notes) ?? 0, ref("ai-red-witch", "video-library/creator-overview.json")),
      topics: contentSystem.map((row) => statement(`${asString(row.name)}｜${asString(row.role)}｜${asString(row.promise)}`, ref("ai-red-witch", "video-library/creator-overview.json"))),
      formats: arr(asRecord(perf.high).formats).map((row) => statement(`${asString(row.name)}：${asString(row.structure)}`, ref("ai-red-witch", "video-library/creator-overview.json"))),
      visualLanguage: Object.values(language).filter((value): value is string => typeof value === "string").map((value) => statement(value, ref("ai-red-witch", "video-library/creator-overview.json"))),
      recurringStructures: contentSystem.map((row) => statement(`${asString(row.name)}：${asString(row.examples)}；${asString(row.promise)}`, ref("ai-red-witch", "video-library/creator-overview.json"))),
      health: health("full", "内容系统、主题聚类、形式聚类、视觉语法与重复结构均来自既有研究资产。", capturedAt) },
    tiers: [tier("high", "high"), tier("base", "median"), tier("low", "low")], portfolio: { items, deepCount: items.filter((item) => item.deepSample).length, health: health("full", "同一组 21 条记录支持 List/Gallery；9 条深度样本在原记录中标记。", capturedAt) },
    rhythm: { statements: [statement(asString(asRecord(overview.publishing).conclusion), ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")], weekdays: arr(asRecord(overview.publishing).weekdays).map((row) => ({ name: asString(row.name), count: asNumber(row.count) ?? 0, medianLikes: asNumber(row.medianLikes) })), dayparts: arr(asRecord(overview.publishing).dayparts).map((row) => ({ name: asString(row.name), count: asNumber(row.count) ?? 0, medianLikes: asNumber(row.medianLikes) })), health: health("partial", "精确发布时间仅覆盖 21 条分层样本，不能推断发布时间因果。", capturedAt) },
    audienceDemand: { statements: [statement("评论高频追问价格、入口、兼容、工具名和免费额度；它们说明正文行动路径经常未闭环。", ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")], health: health("partial", "来自已捕捉深样本评论，不代表全量受众。", capturedAt) },
    growthEngines: { statements: arr(asRecord(overview.viralMechanism).drivers).map((row) => statement(asString(row), ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")), health: health("full", "基于高中低对照与深度视频证据归纳，不包含我们的创作建议。", capturedAt) },
    businessPath: { statements: [statement(asString(creator.businessRole), ref("ai-red-witch", "video-library/creator-overview.json"), "inference", "medium")], health: health("partial", "只记录商业内容在账号中的可见角色，不判断真实收入与转化。", capturedAt) },
    boundaries: [asString(tierComparison.confound), ...strArr(asRecord(overview.viralMechanism).failurePatterns), "点赞、收藏、评论、分享是公开快照，不是曝光、留存、转粉或成交。"]
  });
}

function zhangZala(): CreatorDossier | null {
  const dashboard = readJson("zhang-zala-v1/dashboard-data.json"); if (!dashboard) return null;
  const creator = asRecord(dashboard.creator); const overview = asRecord(dashboard.overview); const positioning = asRecord(dashboard.positioning);
  const allPosts = arr(dashboard.posts); const deepById = new Map(arr(dashboard.deepDives).map((row) => [asString(row.postId), row]));
  const highPosts = allPosts.filter((row) => asString(row.tier) === "high").slice(0, 7);
  const medianPosts = allPosts.filter((row) => asString(row.tier) === "median");
  const averagePosts = allPosts.filter((row) => asString(row.tier) === "average");
  const deepMedianPosts = medianPosts.filter((row) => deepById.has(asString(row.id))).slice(0, 2);
  const deepAveragePosts = averagePosts.filter((row) => deepById.has(asString(row.id))).slice(0, 1);
  const basePriority = [...deepMedianPosts, ...deepAveragePosts];
  const remainingBase = [...medianPosts, ...averagePosts].filter((row) => !basePriority.some((selected) => asString(selected.id) === asString(row.id)));
  const basePosts = [...basePriority, ...remainingBase].slice(0, 7);
  const lowPosts = allPosts.filter((row) => asString(row.tier) === "low").slice(0, 7);
  const posts = [...highPosts, ...basePosts, ...lowPosts];
  const firstDeep = (rows: Row[], count: number) => rows.filter((row) => deepById.has(asString(row.id))).slice(0, count).map((row) => asString(row.id));
  const deepSelected = new Set([...firstDeep(highPosts, 3), ...deepMedianPosts.map((row) => asString(row.id)), ...deepAveragePosts.map((row) => asString(row.id)), ...firstDeep(lowPosts, 3)]);
  const mappedTier = (value: string) => value === "high" ? "high" as const : value === "low" ? "low" as const : "base" as const;
  const items = posts.map((post) => { const id = asString(post.id); const deep = deepById.get(id); const sparse = arr(deep?.sparseFrames); return {
    id, title: asString(post.title), sourceHref: asString(post.sourceUrl), evidenceHref: deep ? `/creators/zhang-zala/videos/${id}` : null,
    coverHref: asStringOrNull(post.cover) ?? (sparse[0] ? publicFrame(`zhang-zala-v1/${asString(sparse[0].path)}`) : null), tier: mappedTier(asString(post.tier)), tierRank: 1,
    anchors: asString(post.tier) === "median" ? ["median_near" as const] : asString(post.tier) === "average" ? ["mean_near" as const] : [], deepSample: deepSelected.has(id),
    likes: asNumber(post.likes), collections: asNumber(post.collections), comments: asNumber(post.comments), shares: asNumber(post.shares), percentileRank: asNumber(post.percentileRank),
    publishedLabel: formatPublished(post.publishedAt), durationSeconds: asNumber(post.durationSec), topic: strArr(post.topicTags).join(" / ") || null, format: strArr(post.formatTags).join(" / ") || null,
    coreContent: [asStringOrNull(post.coreMessage), asStringOrNull(post.title)].filter(Boolean).join("｜"), contentArchitecture: deep ? arr(deep.knowledgeUnits).slice(0, 6).map((row) => asString(row.title)) : [strArr(post.formatTags)[0] ?? "内容形式未细分", asString(post.mechanism, "机制尚待视频重建")],
    mechanismHypothesis: deep ? asStringOrNull(deep.representedMechanism) : `${asString(post.mechanism, "作品级机制")}: ${strArr(post.formatTags).slice(0, 2).join(" + ") || asString(post.coreMessage)}`, selectionReason: deep ? asString(deep.selectionReason) : "四档比较池中的作品级记录。",
    evidenceStatus: id === "69fe6f3a000000001a036be4" ? "deep_validated" as const : deep ? "deep_pending" as const : "surface_only" as const
  }; });
  (["high", "base", "low"] as const).forEach((tier) => items.filter((item) => item.tier === tier).forEach((item, index) => { item.tierRank = index + 1; }));
  const tiersRaw = arr(dashboard.tiers); const tierBuild = (id: "high" | "base" | "low", source: Row[]) => {
    const rows = items.filter((item) => item.tier === id); return { id, label: id === "base" ? "基本盘（中位 + 平均附近）" : id === "high" ? "高表现" : "低表现", count: rows.length,
      conclusion: source.flatMap((row) => [asString(row.label) + "：" + strArr(row.patterns).join("；")]).map((value) => statement(value, ref("zhang-zala-v1", "dashboard-data.json"), "inference", "medium")),
      mechanisms: source.flatMap((row) => strArr(row.mechanisms)).map((value) => statement(value, ref("zhang-zala-v1", "dashboard-data.json"), "inference", "medium")),
      failurePatterns: source.flatMap((row) => strArr(row.failures)).map((value) => statement(value, ref("zhang-zala-v1", "dashboard-data.json"), "inference", "medium")), metrics: stats(rows) };
  };
  const tiers = [tierBuild("high", tiersRaw.filter((row) => asString(row.tier) === "high")), tierBuild("base", tiersRaw.filter((row) => ["median", "average"].includes(asString(row.tier)))), tierBuild("low", tiersRaw.filter((row) => asString(row.tier) === "low"))];
  return creatorDossierSchema.parse({ schemaVersion: "1.0.0", canonicalId: "zhang-zala", source: "legacy_adapter", generatedAt: new Date().toISOString(), run: null,
    lastGood: { active: true, reason: "直接投影 62 条公开作品、四档比较池与 12 条深度内容研究。", revisionLabel: asStringOrNull(dashboard.generatedAt) },
    identity: { name: asString(creator.name), profileHref: asString(creator.profileUrl), positioning: statement(asString(positioning.sentence), ref("zhang-zala-v1", "creator-analysis.json")), audience: [statement(asString(positioning.audience), ref("zhang-zala-v1", "creator-analysis.json"))], valuesProvided: [statement(asString(positioning.promise), ref("zhang-zala-v1", "creator-analysis.json"))], trustSources: [statement(asString(positioning.proofSystem), ref("zhang-zala-v1", "creator-analysis.json"))], lifecycle: statement("已形成稳定专业身份、自有产品/公开资产与内容方法，处于稳定增长和产品化阶段。", ref("zhang-zala-v1", "creator-analysis.json"), "inference", "medium"), commercialPaths: [statement(asString(positioning.job), ref("zhang-zala-v1", "creator-analysis.json"), "inference", "medium")] },
    corpus: { postCount: asNumber(overview.postCount) ?? 0, videoCount: asNumber(overview.videoCount), likesKnown: asNumber(overview.postCount) ?? 0, coverageRate: 1, medianLikes: asNumber(overview.medianLikes), meanLikes: asNumber(overview.meanLikes), maxLikes: asNumber(overview.maxLikes), highCount: arr(overview.distribution).find((row) => asString(row.label) === "≥10k") ? asNumber(arr(overview.distribution).find((row) => asString(row.label) === "≥10k")?.count) : null, percentiles: { p10: null, p25: null, p75: null, p90: null }, distribution: arr(overview.distribution).map((row) => ({ label: asString(row.label), count: asNumber(row.count) ?? 0, share: asNumber(row.share) ?? 0 })), notes: ["62 条公开作品具备作品级基本盘；主题/形式标签可重叠。", "12 条已登记深度样本覆盖高、中位、平均值附近、低表现各 3 条；本版统一 21 条选择集保留其中 9 条作为 canonical 深样本。"], health: health("full", "62/62 条公开点赞与作品级记录可用；12 条已有深度资产，统一 21 条中 9 条作为 canonical 深样本。", asStringOrNull(dashboard.generatedAt)) },
    contentSystem: { topicClusters: clusterRows(arr(dashboard.topicClusters), asNumber(overview.postCount) ?? 0, ref("zhang-zala-v1", "corpus-analysis.json")), formatClusters: clusterRows(arr(dashboard.formatClusters), asNumber(overview.postCount) ?? 0, ref("zhang-zala-v1", "corpus-analysis.json")), topics: [], formats: [], visualLanguage: strArr(dashboard.visualLanguage).map((value) => statement(value, ref("zhang-zala-v1", "creator-analysis.json"))), recurringStructures: arr(dashboard.tiers).flatMap((row) => strArr(row.patterns)).slice(0, 12).map((value) => statement(value, ref("zhang-zala-v1", "creator-analysis.json"), "inference", "medium")), health: health("full", "主题、形式、视觉语言和四档机制均来自 62 条基本盘与 12 条深样本。", asStringOrNull(dashboard.generatedAt)) },
    tiers, portfolio: { items, deepCount: items.filter((item) => item.deepSample).length, health: health("full", `${items.length} 条 High/Base/Low 统一比较记录；Base 同时包含中位和平均值附近锚点，9 条在原记录中标为默认深样本。其余已完成重建仍可直接访问。`, asStringOrNull(dashboard.generatedAt)) },
    rhythm: { statements: [statement(asString(asRecord(dashboard.publishing).conclusion), ref("zhang-zala-v1", "dashboard-data.json"), "inference", "medium")], weekdays: arr(asRecord(dashboard.publishing).weekdays).map((row) => ({ name: asString(row.name), count: asNumber(row.count) ?? 0, medianLikes: asNumber(row.medianLikes) })), dayparts: arr(asRecord(dashboard.publishing).dayparts).map((row) => ({ name: asString(row.name), count: asNumber(row.count) ?? 0, medianLikes: asNumber(row.medianLikes) })), health: health("partial", "精确发布时间仅覆盖 12 条深样本；时段只作描述，不作因果。", asStringOrNull(dashboard.generatedAt)) },
    audienceDemand: { statements: [], health: health("missing", "评论需求未进入当前 62 条结构化基本盘。", asStringOrNull(dashboard.generatedAt)) }, growthEngines: { statements: tiers.flatMap((tier) => tier.mechanisms), health: health("full", "只呈现该账号内部观察到的机制，不输出复刻建议。", asStringOrNull(dashboard.generatedAt)) }, businessPath: { statements: [statement(asString(positioning.job), ref("zhang-zala-v1", "creator-analysis.json"), "inference", "medium")], health: health("partial", "可见产品与公开资产不等于收入或转化。", asStringOrNull(dashboard.generatedAt)) }, boundaries: strArr(dashboard.boundaries) });
}

function humanDirector(): CreatorDossier | null {
  const inventory = readJson("human-director/inventory.json"); const analysis = readJson("human-director/analysis.json"); const tierData = readJson("human-director/tiers-backfill.json"); if (!inventory || !analysis || !tierData) return null;
  const creator = asRecord(inventory.creator); const rows = arr(inventory.videos); const deepById = new Map(arr(analysis.videos).map((row) => [asString(row.id), row])); const tierRows = arr(tierData.tiers);
  const tierById = new Map<string, string>(); tierRows.forEach((tier) => arr(tier.videos).forEach((row) => tierById.set(asString(row.id), asString(tier.tier))));
  const mapped = (raw: string) => raw === "high" ? "high" as const : raw === "low" ? "low" as const : "base" as const;
  const items = rows.map((row) => { const id = asString(row.id); const deep = deepById.get(id); const sourceTier = tierById.get(id) ?? "low"; return { id, title: asString(row.title), sourceHref: deep ? asString(deep.sourceUrl) : `https://www.xiaohongshu.com/explore/${id}`, evidenceHref: deep ? `/creators/human-director/videos/${id}` : null, coverHref: null, tier: mapped(sourceTier), tierRank: 1, anchors: sourceTier === "median" ? ["median_near" as const] : sourceTier === "average" ? ["mean_near" as const] : [], deepSample: Boolean(deep), likes: asNumber(row.likes), collections: asNumber(row.collections), comments: asNumber(row.comments), shares: asNumber(row.shares), percentileRank: null, publishedLabel: null, durationSeconds: asNumber(row.duration), topic: asStringOrNull(row.pillar), format: asStringOrNull(deep?.archetype) ?? asStringOrNull(row.role), coreContent: asStringOrNull(row.summary), contentArchitecture: deep ? [asString(deep.archetype), asString(asRecord(deep.transcript).first3Seconds)].filter(Boolean) : [asString(row.role, "内容角色未细分"), asString(row.pillar, "主题支柱未细分")], mechanismHypothesis: asStringOrNull(row.why), selectionReason: deep ? "8 条真实字幕/画面深样本之一；代表样本已接入三镜头独立评测，其余深样本保持待审。" : "19 条全量公开作品中的基本盘记录。", evidenceStatus: id === "6a2fcd940000000007021a9f" ? "deep_validated" as const : deep ? "deep_pending" as const : "surface_only" as const }; });
  (["high", "base", "low"] as const).forEach((tier) => items.filter((item) => item.tier === tier).forEach((item, index) => { item.tierRank = index + 1; }));
  const buildTier = (id: "high" | "base" | "low", sources: Row[]) => { const local = items.filter((item) => item.tier === id); return { id, label: id === "base" ? "基本盘（中位 + 平均附近）" : id === "high" ? "高表现" : "低表现", count: local.length, conclusion: sources.map((row) => statement(asString(row.conclusion), ref("human-director", "tiers-backfill.json"), "inference", "medium")), mechanisms: local.slice(0, 7).map((row) => statement(`${row.topic ?? "未标注"}：${row.mechanismHypothesis ?? row.coreContent ?? row.title}`, ref("human-director", "inventory.json"), "inference", "medium")), failurePatterns: [], metrics: stats(local) }; };
  const tiers = [buildTier("high", tierRows.filter((row) => asString(row.tier) === "high")), buildTier("base", tierRows.filter((row) => ["median", "average"].includes(asString(row.tier)))), buildTier("low", tierRows.filter((row) => asString(row.tier) === "low"))]; const likes = rows.map((row) => asNumber(row.likes)).filter((value): value is number => value !== null); const capturedAt = asStringOrNull(inventory.capturedAt);
  const groups = [...new Set(rows.map((row) => asString(row.pillar)).filter(Boolean))].map((name) => { const group = rows.filter((row) => asString(row.pillar) === name); const s = stats(group); return { name, count: group.length, share: group.length / rows.length, measuredCount: group.length, medianLikes: s.medianLikes, meanLikes: s.meanLikes, maxLikes: s.maxLikes, highCount: group.filter((row) => (asNumber(row.likes) ?? 0) >= 10000).length, interpretation: null, evidenceRefs: [ref("human-director", "inventory.json")] }; });
  const formatGroups = [...new Set(arr(analysis.videos).map((row) => asString(row.archetype)).filter(Boolean))].map((name) => { const deepRows = arr(analysis.videos).filter((row) => asString(row.archetype) === name); const joined = deepRows.map((deep) => rows.find((row) => asString(row.id) === asString(deep.id))).filter((row): row is Row => Boolean(row)); const s = stats(joined); return { name, count: joined.length, share: joined.length / rows.length, measuredCount: joined.length, medianLikes: s.medianLikes, meanLikes: s.meanLikes, maxLikes: s.maxLikes, highCount: joined.filter((row) => (asNumber(row.likes) ?? 0) >= 10000).length, interpretation: "仅 8 条深样本具备该形式标签。", evidenceRefs: [ref("human-director", "analysis.json")] }; });
  return creatorDossierSchema.parse({ schemaVersion: "1.0.0", canonicalId: "human-director", source: "legacy_adapter", generatedAt: new Date().toISOString(), run: null, lastGood: { active: true, reason: "直接投影 19 条全量公开作品、四档分层与 8 条字幕/画面深样本。", revisionLabel: capturedAt }, identity: { name: asString(creator.name).split("（")[0]?.trim() || "人类最强编导", profileHref: asString(creator.profileUrl), positioning: statement(positioningOf["human-director"], ref("human-director", "analysis.json")), audience: [statement("希望在小红书起号、建立个人或创始人 IP，并理解内容策划与爆款机制的人。", ref("human-director", "analysis.json"), "inference", "medium")], valuesProvided: [statement("成绩证明、起号框架、平台趋势、垂直教程与价值观判断。", ref("human-director", "inventory.json"))], trustSources: [statement("高强度成绩主张、编导专业身份、个人账号结果与长教程交付共同构成信任；其中收入排名等强主张仍需外部验证。", ref("human-director", "analysis.json"), "inference", "medium")], lifecycle: statement("账号内容已经从成绩证明扩展到方法、趋势、立场与商业认知，处于增长与产品化阶段。", ref("human-director", "inventory.json"), "inference", "medium"), commercialPaths: [statement("线下课、方法论课程与创始人/IP 服务是可见商业路径；真实收入与转化未知。", ref("human-director", "analysis.json"), "inference", "low")] }, corpus: { postCount: rows.length, videoCount: rows.length, likesKnown: likes.length, coverageRate: likes.length / rows.length, medianLikes: median(likes), meanLikes: mean(likes), maxLikes: likes.length ? Math.max(...likes) : null, highCount: likes.filter((value) => value >= 10000).length, percentiles: { p10: null, p25: null, p75: null, p90: null }, distribution: distribution(likes), notes: ["19 条全量公开互动数据现算。", "19 条均缺发布时间，不能分析星期与时段规律。", "只有 8 条具备深度 archetype、字幕与画面证据。"], health: health("partial", "19/19 条互动完整；发布时间全缺；8/19 条具备深度内容标注。", capturedAt) }, contentSystem: { topicClusters: groups, formatClusters: formatGroups, topics: groups.map((group) => statement(`${group.name}：${group.count} 条，中位 ${Math.round(group.medianLikes ?? 0)} 赞，最高 ${Math.round(group.maxLikes ?? 0)} 赞。`, ref("human-director", "inventory.json"))), formats: formatGroups.map((group) => statement(`${group.name}：${group.count} 条深样本，中位 ${Math.round(group.medianLikes ?? 0)} 赞。`, ref("human-director", "analysis.json"))), visualLanguage: [statement("深样本以竖屏真人口播为主，证书、数据截图、白板/画板和字幕承担证明与结构提示。", ref("human-director", "analysis.json"), "inference", "medium")], recurringStructures: [statement("强身份/结果开场 → 反常识判断 → 框架或步骤 → 价值观收束。", ref("human-director", "analysis.json"), "inference", "medium")], health: health("partial", "主题覆盖全量 19 条；形式和画面语言主要来自 8 条深样本。", capturedAt) }, tiers, portfolio: { items, deepCount: items.filter((item) => item.deepSample).length, health: health("partial", "账号仅有 19 条公开作品，全部进入统一浏览；8 条具备深证据。", capturedAt) }, rhythm: { statements: [], weekdays: [], dayparts: [], health: health("missing", "19 条均无发布时间字段，不能生成发布节奏。", capturedAt) }, audienceDemand: { statements: [], health: health("missing", "评论需求未形成统一结构化资产。", capturedAt) }, growthEngines: { statements: tiers.flatMap((tier) => tier.mechanisms), health: health("partial", "基于公开互动与 8 条深样本归纳，不将强主张当外部事实。", capturedAt) }, businessPath: { statements: [statement("线下课、方法论课程与 IP 服务为可见路径；收入、成交与学员结果未知。", ref("human-director", "analysis.json"), "inference", "low")], health: health("partial", "只记录可见商业线索。", capturedAt) }, boundaries: [asString(analysis.selectionLogic), "公开互动不等于播放、完播、涨粉或成交。", "收入排名、平台流量倾斜比例等作者主张未被外部验证。"] });
}

export function loadLegacyDeepDossier(id: string): CreatorDossier | null {
  if (id === "ai-red-witch") return redWitch();
  if (id === "zhang-zala") return zhangZala();
  if (id === "human-director") return humanDirector();
  return null;
}
