import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { creatorDossierSchema, type CreatorDossier, type ResearchStatement } from "../shared/creator-dossier.js";
import { researchDir } from "./creator-meta.js";

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

function statement(text: string, evidenceRef: string, factClass: ResearchStatement["factClass"] = "observed", confidence: ResearchStatement["confidence"] = "high", caveat: string | null = null): ResearchStatement {
  return { statement: text, factClass, confidence, evidenceRefs: [evidenceRef], caveat };
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

function candidateItem(corpus: Corpus, candidate: Candidate, tier: "high" | "base" | "low", tierRank: number, anchor: "median_near" | "mean_near" | null) {
  const post = corpus.posts.find((item) => item.id === candidate.id);
  return {
    id: candidate.id,
    title: post?.title ?? candidate.title,
    sourceHref: post?.sourceUrl ?? `https://www.xiaohongshu.com/explore/${candidate.id}`,
    evidenceHref: null,
    coverHref: null,
    tier,
    tierRank,
    anchors: anchor ? [anchor] : [],
    deepSample: false,
    likes: candidate.likes,
    collections: post?.metrics.collections ?? null,
    comments: post?.metrics.comments ?? null,
    shares: post?.metrics.shares ?? null,
    percentileRank: null,
    publishedLabel: post?.publishedLabel ?? null,
    durationSeconds: post?.durationSec ?? null,
    topic: null,
    format: null,
    coreContent: null,
    contentArchitecture: [],
    mechanismHypothesis: null,
    selectionReason: tier === "high" ? "主页可见点赞高位候选；尚未读取详情，不能解释爆发原因。"
      : tier === "low" ? "主页可见点赞低位候选；尚未读取详情，不能解释失效原因。"
        : anchor === "mean_near" ? "最接近可见作品点赞均值的候选。" : "最接近可见作品点赞中位数的候选。",
    evidenceStatus: "surface_only" as const
  };
}

export function projectNextWaveDossier(id: string, corpus: Corpus, rawStatus: unknown): CreatorDossier {
  const status = statusSchema.parse(rawStatus);
  const artifactRef = `artifact:creator-research/next-wave/${id}/creator-corpus.json`;
  const statusRef = `artifact:creator-research/next-wave/${id}/collection-status.json`;
  const likes = corpus.posts.flatMap((post) => post.metrics.likes === null ? [] : [post.metrics.likes]);
  const gap = status.crawl.displayedCountDiscrepancy.gap;
  const fieldCoverage = (missing: number) => `${Math.round(((status.counts.items - missing) / Math.max(status.counts.items, 1)) * 100)}%`;
  const high = corpus.selectionCandidates.high.map((item, index) => candidateItem(corpus, item, "high", index + 1, null));
  const median = corpus.selectionCandidates.median.map((item, index) => candidateItem(corpus, item, "base", index + 1, "median_near"));
  const meanNear = corpus.selectionCandidates.meanNear.map((item, index) => candidateItem(corpus, item, "base", median.length + index + 1, "mean_near"));
  const low = corpus.selectionCandidates.low.map((item, index) => candidateItem(corpus, item, "low", index + 1, null));
  const items = [...high, ...median, ...meanNear, ...low];
  const corpusReason = `已观察 ${status.counts.items} 条；主页显示 ${status.creator.displayedPostCount} 条，缺口 ${gap} 条。点赞覆盖 ${fieldCoverage(status.missingness.likes)}；发布时间 ${fieldCoverage(status.missingness.publishedAt)}；媒体类型 ${fieldCoverage(status.missingness.mediaType)}；收藏/评论/分享分别为 ${fieldCoverage(status.missingness.collections)}/${fieldCoverage(status.missingness.comments)}/${fieldCoverage(status.missingness.shares)}。`;
  const blocked = "详情与视频重建尚未开始：不能判断内容机制、编导逻辑、画面剪辑、发布时间规律或因果。";
  const profileClaim = statement(`主页自述：${corpus.creator.bio}`, artifactRef, "author_claim", "high", "这是账号主页自述，不是外部核验事实。");

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
      positioning: unknown("账号定位等待详情与视频证据归纳。"),
      audience: [unknown("服务人群等待内容详情证据归纳。")],
      valuesProvided: [unknown("给用户提供的价值等待内容还原后归纳。")],
      trustSources: [profileClaim],
      lifecycle: unknown("账号生命周期等待发布历史与商业线索证据。"),
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
      highCount: null,
      percentiles: { p10: percentile(likes, 0.1), p25: percentile(likes, 0.25), p75: percentile(likes, 0.75), p90: percentile(likes, 0.9) },
      distribution: distribution(likes),
      notes: [corpusReason, `采集停止原因：${status.crawl.stopReason}；连续零增长 ${status.crawl.zeroGrowthRounds} 轮。`, ...status.blockers],
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
    portfolio: { items, deepCount: 0, health: { status: "partial", reason: `${items.length} 条真实候选可读（高 ${high.length}、中位 ${median.length}、均值附近 ${meanNear.length}、低 ${low.length}）；0 条完成详情或视频重建。`, capturedAt: corpus.snapshotAt } },
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
  return projectNextWaveDossier(id, corpus.data, status.data);
}
