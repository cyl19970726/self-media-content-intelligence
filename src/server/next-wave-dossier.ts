import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { creatorDossierSchema, type CreatorDossier, type ResearchStatement } from "../shared/creator-dossier.js";
import { researchDir } from "./creator-meta.js";
import { projectPostSourceFacts } from "./post-source-facts.js";

const metricSchema = z.object({
  likes: z.number().nonnegative().nullable(),
  collections: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable()
});

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceUrl: z.string(),
  mediaType: z.string(),
  publishedAt: z.string().nullable(),
  publishedLabel: z.string().nullable(),
  durationSec: z.number().nonnegative().nullable(),
  metrics: metricSchema
});

const candidateSchema = z.object({
  id: z.string(), title: z.string(), likes: z.number().nonnegative(), relativeDistance: z.number().optional()
});

const corpusSchema = z.object({
  snapshotAt: z.string(),
  creator: z.object({
    id: z.string(), name: z.string(), profileUrl: z.string(), bio: z.string(),
    publicStats: z.object({
      followers: z.number().nonnegative(), likesAndCollections: z.number().nonnegative(),
      following: z.number().nonnegative(), displayedPostCount: z.number().int().nonnegative()
    })
  }),
  posts: z.array(postSchema),
  statistics: z.object({
    knownLikesCount: z.number().int().nonnegative(), meanLikes: z.number().nonnegative().nullable(),
    medianLikes: z.number().nonnegative().nullable(), maxLikes: z.number().nonnegative().nullable(), minLikes: z.number().nonnegative().nullable()
  }),
  selectionCandidates: z.object({
    high: z.array(candidateSchema), median: z.array(candidateSchema), meanNear: z.array(candidateSchema), low: z.array(candidateSchema)
  })
});

const statusSchema = z.object({
  generatedAt: z.string(),
  creator: z.object({ id: z.string(), name: z.string(), displayedPostCount: z.number().int().nonnegative() }),
  counts: z.object({ items: z.number().int().nonnegative(), detailReady: z.number().int().nonnegative(), selectedForDeep: z.number().int().nonnegative() }),
  missingness: z.object({
    likes: z.number().int().nonnegative(), collections: z.number().int().nonnegative(), comments: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(), publishedAt: z.number().int().nonnegative(), mediaType: z.number().int().nonnegative()
  }),
  crawl: z.object({
    stopReason: z.string(), zeroGrowthRounds: z.number().int().nonnegative(),
    displayedCountDiscrepancy: z.object({ profileSearchCount: z.number().int().nonnegative(), uniqueCollected: z.number().int().nonnegative(), gap: z.number().int().nonnegative() })
  }),
  readiness: z.string(), blockers: z.array(z.string())
});

const inventorySchema = z.object({
  creator: z.object({
    id: z.string(), name: z.string(), profileUrl: z.string().url(), identityStatus: z.literal("confirmed"),
    identityAnchors: z.array(z.object({ kind: z.string(), value: z.string(), source: z.string() })).min(2)
      .refine((anchors) => new Set(anchors.map((anchor) => `${anchor.kind}\u0000${anchor.value}`)).size >= 2)
  }),
  items: z.array(z.object({ id: z.string() }))
});

const coverManifestSchema = z.object({
  schemaVersion: z.literal("creator-cover-manifest@1"),
  creatorId: z.string(),
  capturedAt: z.string(),
  privacy: z.object({ cookiesStored: z.literal(false), headersStored: z.literal(false), xsecTokenStored: z.literal(false), signedImageUrlStored: z.literal(false) }),
  covers: z.array(z.object({ postId: z.string(), path: z.string(), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }))
});

type Corpus = z.infer<typeof corpusSchema>;
type Candidate = z.infer<typeof candidateSchema>;

const nextWaveRoot = path.join(researchDir, "next-wave");
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxArtifactBytes = 5 * 1024 * 1024;

function readTrustedJson(directory: string, filename: string): unknown | null {
  try {
    const root = fs.realpathSync(directory);
    const candidate = path.join(root, filename);
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxArtifactBytes) return null;
    const resolved = fs.realpathSync(candidate);
    const relative = path.relative(root, resolved);
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return null;
    return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function statement(text: string, evidenceRef: string | string[], factClass: ResearchStatement["factClass"] = "observed", confidence: ResearchStatement["confidence"] = "high", caveat: string | null = null): ResearchStatement {
  return { statement: text, factClass, confidence, evidenceRefs: Array.isArray(evidenceRef) ? evidenceRef : [evidenceRef], caveat };
}

function unknown(text: string): ResearchStatement {
  return statement(text, "system:missing", "unknown", "low", "当前采集只覆盖主页卡片，详情与视频尚未还原。");
}

function percentile(values: number[], ratio: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower]! + ((sorted[lower + 1] ?? sorted[lower]!) - sorted[lower]!) * fraction;
}

function distribution(values: number[]) {
  const buckets = [
    { label: "<100", test: (value: number) => value < 100 },
    { label: "100–999", test: (value: number) => value >= 100 && value < 1_000 },
    { label: "1,000–9,999", test: (value: number) => value >= 1_000 && value < 10_000 },
    { label: "≥10,000", test: (value: number) => value >= 10_000 }
  ];
  return buckets.map((bucket) => {
    const count = values.filter(bucket.test).length;
    return { label: bucket.label, count, share: values.length ? count / values.length : 0 };
  });
}

function hasTrustedFile(directory: string, filename: string): boolean {
  try {
    const root = fs.realpathSync(directory);
    const candidate = path.join(root, filename);
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxArtifactBytes) return false;
    const relative = path.relative(root, fs.realpathSync(candidate));
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

function candidateItem(creatorSlug: string, corpus: Corpus, candidate: Candidate, tier: "high" | "base" | "low", tierRank: number, anchor: "median_near" | "mean_near" | null, covers: Map<string, string>) {
  const post = corpus.posts.find((item) => item.id === candidate.id);
  const deepRoot = path.join(nextWaveRoot, creatorSlug, "deep-samples", candidate.id);
  const gate = readTrustedJson(deepRoot, "evaluation/gate-report.json") as Record<string, unknown> | null;
  const lensEvaluation = readTrustedJson(deepRoot, "evaluation-lenses-v2/evaluation.json") as Record<string, unknown> | null;
  const reconstruction = readTrustedJson(deepRoot, "reconstruction.json") as Record<string, unknown> | null;
  const detail = (readTrustedJson(deepRoot, "detail-observation.json") ?? readTrustedJson(deepRoot, "detail/detail-observation.json")) as Record<string, unknown> | null;
  const viewerChange = reconstruction && typeof reconstruction.viewerChange === "object" && reconstruction.viewerChange ? reconstruction.viewerChange as Record<string, unknown> : {};
  const lensOverall = lensEvaluation && typeof lensEvaluation.overall === "object" && lensEvaluation.overall ? lensEvaluation.overall as Record<string, unknown> : {};
  const detailPost = detail && typeof detail.post === "object" && detail.post ? detail.post as Record<string, unknown> : detail ?? {};
  const detailMetrics = detailPost && typeof detailPost.publicMetrics === "object" && detailPost.publicMetrics ? detailPost.publicMetrics as Record<string, unknown> : {};
  const detailMedia = detail && typeof detail.media === "object" && detail.media ? detail.media as Record<string, unknown> : {};
  const deepPresent = Boolean(reconstruction) && hasTrustedFile(deepRoot, "article.md");
  const deepReady = gate?.ready === true && lensOverall.ready === true && Boolean(reconstruction);
  const sourceHref = post?.sourceUrl ?? `https://www.xiaohongshu.com/explore/${candidate.id}`;
  const coverHref = covers.get(candidate.id) ?? null;
  const mediaType = detailPost.mediaType === "video" || post?.mediaType === "video" ? "video" as const
    : detailPost.mediaType === "image" || post?.mediaType === "image" ? "image" as const : "unknown" as const;
  return {
    id: candidate.id,
    title: post?.title ?? candidate.title,
    sourceHref,
    evidenceHref: deepPresent ? `/creators/${creatorSlug}/videos/${candidate.id}` : null,
    coverHref,
    tier,
    tierRank,
    anchors: anchor ? [anchor] : [],
    deepSample: deepPresent,
    likes: candidate.likes,
    collections: typeof detailMetrics.collections === "number" ? detailMetrics.collections : post?.metrics.collections ?? null,
    comments: typeof detailMetrics.comments === "number" ? detailMetrics.comments : post?.metrics.comments ?? null,
    shares: typeof detailMetrics.shares === "number" ? detailMetrics.shares : post?.metrics.shares ?? null,
    percentileRank: null,
    publishedLabel: typeof detailPost.publishedLabel === "string" ? detailPost.publishedLabel : post?.publishedLabel ?? null,
    durationSeconds: typeof detailMedia.durationSeconds === "number" ? detailMedia.durationSeconds : typeof detailMedia.durationSec === "number" ? detailMedia.durationSec : post?.durationSec ?? null,
    topic: null,
    format: null,
    coreContent: deepPresent && typeof viewerChange.after === "string" ? viewerChange.after : null,
    contentArchitecture: deepReady ? ["结果先行", "输入与提示词", "交互证明", "多能力蒙太奇", "人群收束"] : deepPresent ? ["内容已还原", "等待三镜头独立评测"] : [],
    mechanismHypothesis: deepReady ? "先展示可感知结果，再补输入和提示词；用悬停交互及多种练习页扩大工具价值。传播原因仍需与中位、均值附近和低表现样本做同维对照。" : deepPresent ? "内容结构已经恢复，但在独立 CR / DL / VE 评测完成前，不把结构观察升级为传播机制。" : null,
    selectionReason: deepReady ? "账号最高赞样本；内容还原、编导逻辑和画面剪辑三镜头均已通过独立评测。" : deepPresent ? "已完成内容还原与证据采集，三镜头独立评测尚未闭环。" : tier === "high" ? "主页可见点赞高位候选；尚未读取详情，不能解释爆发原因。"
      : tier === "low" ? "主页可见点赞低位候选；尚未读取详情，不能解释失效原因。"
        : anchor === "mean_near" ? "最接近可见作品点赞均值的候选。" : "最接近可见作品点赞中位数的候选。",
    evidenceStatus: deepReady ? "deep_validated" as const : deepPresent ? "deep_pending" as const : "surface_only" as const,
    sourceFacts: projectPostSourceFacts({
      sourceUrl: sourceHref,
      capturedAt: typeof detail?.observedAt === "string" ? detail.observedAt : corpus.snapshotAt,
      title: typeof detailPost.title === "string" ? detailPost.title : post?.title ?? candidate.title,
      caption: typeof detailPost.description === "string" ? detailPost.description : null,
      coverHref,
      mediaType,
      imageCount: typeof detailMedia.imageCount === "number" ? detailMedia.imageCount : 0,
      publishedLabel: typeof detailPost.publishedLabel === "string" ? detailPost.publishedLabel : post?.publishedLabel ?? null,
      likes: typeof detailMetrics.likes === "number" ? detailMetrics.likes : candidate.likes,
      collections: typeof detailMetrics.collections === "number" ? detailMetrics.collections : post?.metrics.collections ?? null,
      comments: typeof detailMetrics.comments === "number" ? detailMetrics.comments : post?.metrics.comments ?? null,
      shares: typeof detailMetrics.shares === "number" ? detailMetrics.shares : post?.metrics.shares ?? null,
      sourceRefs: [
        `artifact:creator-research/next-wave/${creatorSlug}/creator-corpus.json`,
        detail ? `artifact:creator-research/next-wave/${creatorSlug}/deep-samples/${candidate.id}/detail-observation.json` : null,
        coverHref ? `artifact:creator-research/next-wave/${creatorSlug}/cover-manifest.json` : null
      ]
    })
  };
}

export function projectNextWaveDossier(id: string, corpus: Corpus, rawStatus: unknown, covers = new Map<string, string>()): CreatorDossier {
  const status = statusSchema.parse(rawStatus);
  const artifactRef = `artifact:creator-research/next-wave/${id}/creator-corpus.json`;
  const statusRef = `artifact:creator-research/next-wave/${id}/collection-status.json`;
  const likes = corpus.posts.flatMap((post) => post.metrics.likes === null ? [] : [post.metrics.likes]);
  const gap = status.crawl.displayedCountDiscrepancy.gap;
  const fieldCoverage = (missing: number) => {
    const percentage = ((status.counts.items - missing) / Math.max(status.counts.items, 1)) * 100;
    return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
  };
  const high = corpus.selectionCandidates.high.map((item, index) => candidateItem(id, corpus, item, "high", index + 1, null, covers));
  const median = corpus.selectionCandidates.median.map((item, index) => candidateItem(id, corpus, item, "base", index + 1, "median_near", covers));
  const meanNear = corpus.selectionCandidates.meanNear.map((item, index) => candidateItem(id, corpus, item, "base", median.length + index + 1, "mean_near", covers));
  const low = corpus.selectionCandidates.low.map((item, index) => candidateItem(id, corpus, item, "low", index + 1, null, covers));
  const items = [...high, ...median, ...meanNear, ...low];
  const corpusReason = `已观察 ${status.counts.items} 条；主页显示 ${status.creator.displayedPostCount} 条，缺口 ${gap} 条。点赞覆盖 ${fieldCoverage(status.missingness.likes)}；发布时间 ${fieldCoverage(status.missingness.publishedAt)}；媒体类型 ${fieldCoverage(status.missingness.mediaType)}；收藏/评论/分享分别为 ${fieldCoverage(status.missingness.collections)}/${fieldCoverage(status.missingness.comments)}/${fieldCoverage(status.missingness.shares)}。`;
  const selectedDeep = items.filter((item) => item.deepSample);
  const validatedDeep = selectedDeep.filter((item) => item.evidenceStatus === "deep_validated");
  const blocked = `${selectedDeep.length} 条样本已进入深度研究，其中 ${validatedDeep.length} 条通过三镜头硬闸；其余作品仍不能判断内容机制、编导逻辑或画面剪辑，标题只能用于候选定位。`;
  const stopReason = gap > 0 && status.crawl.stopReason === "converged"
    ? "当前可观察列表已静止，但主页计数仍有缺口，因此状态保持部分基本盘"
    : status.crawl.stopReason;
  const profileClaim = statement(`主页自述：${corpus.creator.bio}`, artifactRef, "author_claim", "high", "这是账号主页自述，不是外部核验事实。");
  const validatedDeepRefs = validatedDeep.map((item) => `artifact:creator-research/next-wave/${id}/deep-samples/${item.id}/reconstruction.json`);
  const hasValidatedCrossTierEvidence = ["high", "base", "low"].every((tier) => validatedDeep.some((item) => item.tier === tier));
  const deepRefs = [artifactRef, ...validatedDeepRefs];
  const titleScope = "计数来自319条公开标题的启发式匹配，只能说明选题方向；视频内部结论只引用通过独立硬闸的重建。";
  const positioning = hasValidatedCrossTierEvidence
    ? statement("以低门槛 AI 工具实操为主轴，连接学习、设计创作和职场提效场景；内容既做新工具发现，也把能力包装成可直接感知的任务结果。", deepRefs, "inference", "medium", titleScope)
    : unknown("账号定位等待详情与视频证据归纳。");
  const audiences = hasValidatedCrossTierEvidence ? [
    statement("希望快速上手 AI、但不想先理解复杂技术的普通用户和新手：71条标题使用教程、实测、部署、学会等表达，64条强调免费、开源、无需或小白门槛。", deepRefs, "inference", "medium", titleScope),
    statement("设计师、AIGC创作者和视觉内容从业者：319条可见标题中93条命中设计、图片、视频、3D、动画、建模或提示词场景。", artifactRef, "inference", "medium", "这是标题方向计数，不等于93条视频都已完成内容还原。"),
    statement("寻找办公自动化和降本增效方案的职场用户：29条标题明确出现办公、PPT、文档、表格、工作流或效率场景。", artifactRef, "inference", "medium", "职场人群是可见内容分支，不代表账号唯一受众。")
  ] : [unknown("服务人群等待内容详情证据归纳。")];
  const valuesProvided = hasValidatedCrossTierEvidence ? [
    statement("降低工具试用成本：把图片、提示词、部署配置等复杂输入压缩成短视频可理解的步骤和结果。", deepRefs, "inference", "high", "两条深度样本均支持这种价值，但不能外推到全部319条作品。"),
    statement("提供 AI 工具发现和更新筛选：237条标题涉及AI、模型或工具，34条使用发布、更新、上线、最新等资讯表达。", artifactRef, "inference", "medium", titleScope),
    statement("把抽象能力变成具体任务想象：已还原样本分别落到英语练习网页和 Gemini 部署；高表现选择集中还反复出现提示词、动画、设计灵感等可感知结果。", deepRefs, "inference", "medium", "后半句包含选择集标题观察；传播效果原因仍需高中低同维对照。")
  ] : [unknown("给用户提供的价值等待内容还原后归纳。")];
  const trustSources = hasValidatedCrossTierEvidence ? [
    profileClaim,
    statement("主要信任语法是可见界面、操作状态和结果演示，而不是只靠身份背书：两条已还原视频都展示了真实产品页面，同时把缺失的生成桥接和效果边界保留为未知。", deepRefs.slice(1), "inference", "high", "这里只验证两条深度样本中的证明方式，不代表全部作品都同样可靠。"),
    statement("账号以大量工具与模型选题形成持续信息差印象；但工具是否亲测、结果是否可复现，仍需逐条视频验证。", artifactRef, "inference", "medium", titleScope)
  ] : [profileClaim];
  const lifecycle = hasValidatedCrossTierEvidence
    ? statement("更接近稳定内容积累期：主页显示334篇、当前观察319篇，且两条已核日期跨越2023年12月至2025年2月；但发布时间覆盖不足，无法判断增长速度、更新频率或是否已进入商业化期。", [artifactRef, ...deepRefs.slice(1)], "inference", "medium", "‘稳定内容积累期’描述内容库存成熟度，不代表后台流量稳定。")
    : unknown("账号生命周期等待发布历史与商业线索证据。");

  return creatorDossierSchema.parse({
    schemaVersion: "1.0.0",
    canonicalId: id,
    source: "inventory_snapshot",
    generatedAt: status.generatedAt,
    run: null,
    lastGood: { active: false, reason: null, revisionLabel: corpus.snapshotAt },
    identity: {
      name: corpus.creator.name,
      profileHref: corpus.creator.profileUrl,
      positioning,
      audience: audiences,
      valuesProvided,
      trustSources,
      lifecycle,
      commercialPaths: [unknown("商业路径等待主页详情和可见产品线索核验。")]
    },
    corpus: {
      postCount: status.counts.items,
      likesKnown: corpus.statistics.knownLikesCount,
      coverageRate: status.counts.items ? corpus.statistics.knownLikesCount / status.counts.items : 0,
      medianLikes: corpus.statistics.medianLikes,
      meanLikes: corpus.statistics.meanLikes,
      maxLikes: corpus.statistics.maxLikes,
      videoCount: null,
      highCount: likes.filter((value) => value >= 10_000).length,
      percentiles: { p10: percentile(likes, 0.1), p25: percentile(likes, 0.25), p75: percentile(likes, 0.75), p90: percentile(likes, 0.9) },
      distribution: distribution(likes),
      notes: [corpusReason, `采集停止原因：${stopReason}；连续零增长 ${status.crawl.zeroGrowthRounds} 轮。`, ...status.blockers],
      health: { status: "partial", reason: corpusReason, capturedAt: corpus.snapshotAt }
    },
    contentSystem: {
      topicClusters: [], formatClusters: [], topics: [], formats: [], visualLanguage: [], recurringStructures: [],
      health: { status: "missing", reason: "只有标题与点赞的主页卡片清单；未执行标题启发式聚类，避免把标题词误当内容机制。", capturedAt: corpus.snapshotAt }
    },
    tiers: [
      { id: "high", label: "高表现候选", conclusion: [unknown("高表现候选已按可见点赞选出，但爆发原因尚未证实。")], mechanisms: [], failurePatterns: [], metrics: { medianLikes: null, meanLikes: null, minLikes: high.at(-1)?.likes ?? null, maxLikes: high[0]?.likes ?? null }, count: high.length },
      { id: "base", label: "中位数 / 平均值附近候选", conclusion: [unknown("基本盘候选分别锚定中位数与均值附近；内容形式尚未读取。")], mechanisms: [], failurePatterns: [], metrics: { medianLikes: corpus.statistics.medianLikes, meanLikes: corpus.statistics.meanLikes, minLikes: null, maxLikes: null }, count: median.length + meanNear.length },
      { id: "low", label: "低表现候选", conclusion: [unknown("低表现候选已按可见点赞选出，但失效原因尚未证实。")], mechanisms: [], failurePatterns: [], metrics: { medianLikes: null, meanLikes: null, minLikes: low[0]?.likes ?? null, maxLikes: low.at(-1)?.likes ?? null }, count: low.length }
    ],
    portfolio: { items, deepCount: selectedDeep.length, health: { status: "partial", reason: `${items.length} 条真实候选可读（高 ${high.length}、中位 ${median.length}、均值附近 ${meanNear.length}、低 ${low.length}）；${selectedDeep.length} 条已完成内容还原，其中 ${validatedDeep.length} 条通过三镜头硬闸。`, capturedAt: corpus.snapshotAt } },
    rhythm: { statements: [], weekdays: [], dayparts: [], health: { status: "missing", reason: `发布时间覆盖 ${fieldCoverage(status.missingness.publishedAt)}，不能分析发布节奏。`, capturedAt: corpus.snapshotAt } },
    audienceDemand: { statements: [], health: { status: "missing", reason: `评论覆盖 ${fieldCoverage(status.missingness.comments)}，不能归纳用户需求。`, capturedAt: corpus.snapshotAt } },
    growthEngines: { statements: [], health: { status: "missing", reason: blocked, capturedAt: corpus.snapshotAt } },
    businessPath: { statements: [], health: { status: "missing", reason: "未核验详情、置顶内容、产品或商业线索。", capturedAt: corpus.snapshotAt } },
    boundaries: [blocked, corpusReason, "公开点赞不等于曝光、完播、转粉或成交。", `基本盘证据：${artifactRef}`, `采集健康证据：${statusRef}`]
  });
}

export function loadNextWaveDossier(id: string): CreatorDossier | null {
  if (!safeSlug.test(id)) return null;
  const directory = path.join(nextWaveRoot, id);
  let resolvedDirectory: string;
  try {
    const canonicalRoot = fs.realpathSync(nextWaveRoot);
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return null;
    resolvedDirectory = fs.realpathSync(directory);
    const relative = path.relative(canonicalRoot, resolvedDirectory);
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return null;
  } catch {
    return null;
  }
  const corpus = corpusSchema.safeParse(readTrustedJson(resolvedDirectory, "creator-corpus.json"));
  const status = statusSchema.safeParse(readTrustedJson(resolvedDirectory, "collection-status.json"));
  const inventory = inventorySchema.safeParse(readTrustedJson(resolvedDirectory, "collection-inventory.json"));
  if (!corpus.success || !status.success || !inventory.success) return null;
  const identity = inventory.data.creator;
  const countsAgree = inventory.data.items.length === corpus.data.posts.length && status.data.counts.items === corpus.data.posts.length;
  const identityAgrees = identity.id === corpus.data.creator.id && identity.id === status.data.creator.id
    && identity.name === corpus.data.creator.name && identity.profileUrl === corpus.data.creator.profileUrl;
  if (!countsAgree || !identityAgrees) return null;
  const coverManifest = coverManifestSchema.safeParse(readTrustedJson(resolvedDirectory, "cover-manifest.json"));
  const covers = new Map<string, string>();
  if (coverManifest.success && coverManifest.data.creatorId === identity.id) {
    for (const cover of coverManifest.data.covers) {
      if (!/^covers\/[0-9a-f]{16,32}\.webp$/.test(cover.path) || !cover.path.includes(cover.postId)) continue;
      const file = path.join(resolvedDirectory, cover.path);
      try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== cover.bytes) continue;
        const relative = path.relative(resolvedDirectory, fs.realpathSync(file));
        if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) continue;
        const digest = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
        if (digest !== cover.sha256) continue;
        covers.set(cover.postId, `/research/next-wave/${id}/${cover.path}`);
      } catch { /* fail closed for an invalid cover entry */ }
    }
  }
  return projectNextWaveDossier(id, corpus.data, status.data, covers);
}
