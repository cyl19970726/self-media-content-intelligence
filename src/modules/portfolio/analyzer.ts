import {
  creatorCorpusSchema,
  creatorInventorySchema,
  creatorSelectionSchema,
  type CreatorCorpus,
  type CreatorInventory,
  type CreatorInventoryPost,
  type CreatorSelection
} from "./contracts.js";

function quantile(sorted: number[], point: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * point;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? null;
  const low = sorted[lower] ?? 0;
  const high = sorted[upper] ?? low;
  return low + (high - low) * (index - lower);
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nearest(posts: CreatorInventoryPost[], target: number | null): CreatorInventoryPost | null {
  if (target === null) return null;
  return posts.reduce<CreatorInventoryPost | null>((best, post) => {
    if (post.likes === null) return best;
    if (!best?.likes && best?.likes !== 0) return post;
    return Math.abs(post.likes - target) < Math.abs((best.likes ?? 0) - target) ? post : best;
  }, null);
}

function spreadSample(posts: CreatorInventoryPost[], count: number): CreatorInventoryPost[] {
  if (posts.length <= count) return [...posts];
  const picked: CreatorInventoryPost[] = [];
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = Math.round(index * (posts.length - 1) / (count - 1));
    const post = posts[sourceIndex];
    if (post && !picked.some((item) => item.externalId === post.externalId)) picked.push(post);
  }
  return picked;
}

function distribute(posts: CreatorInventoryPost[]): { low: CreatorInventoryPost[]; base: CreatorInventoryPost[]; high: CreatorInventoryPost[] } {
  const sorted = [...posts].sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0));
  const lowEnd = Math.floor(sorted.length / 3);
  const highStart = Math.ceil(sorted.length * 2 / 3);
  return {
    low: spreadSample(sorted.slice(0, lowEnd), 7),
    base: spreadSample(sorted.slice(lowEnd, highStart), 7),
    high: spreadSample(sorted.slice(highStart), 7).reverse()
  };
}

function deepIds(posts: CreatorInventoryPost[], count = 3): Set<string> {
  if (posts.length <= count) return new Set(posts.map((post) => post.externalId));
  const positions = [0, Math.floor((posts.length - 1) / 2), posts.length - 1];
  return new Set(positions.slice(0, count).map((position) => posts[position]?.externalId).filter(Boolean) as string[]);
}

export function buildCreatorPortfolio(input: unknown, sourceArtifactRef: string, generatedAt: string): {
  corpus: CreatorCorpus;
  selection: CreatorSelection;
} {
  const inventory: CreatorInventory = creatorInventorySchema.parse(input);
  const known = inventory.posts.filter((post) => post.likes !== null);
  const likes = known.map((post) => post.likes as number).sort((a, b) => a - b);
  const median = quantile(likes, 0.5);
  const mean = average(likes);
  const medianNear = nearest(known, median);
  const meanNearCandidate = nearest(known, mean);
  const meanNearLikes = meanNearCandidate?.likes ?? null;
  const meanGap = mean !== null && meanNearLikes !== null && mean > 0
    ? Math.abs(meanNearLikes - mean) / mean > 0.25
    : mean !== null && meanNearCandidate === null;
  const meanNear = meanGap ? null : meanNearCandidate;
  const mediaTypes = inventory.posts.reduce<Record<string, number>>((counts, post) => {
    counts[post.mediaType] = (counts[post.mediaType] ?? 0) + 1;
    return counts;
  }, {});
  const corpus = creatorCorpusSchema.parse({
    schemaVersion: "1.0.0",
    runId: inventory.runId,
    generatedAt,
    sourceArtifactRef,
    denominator: {
      discoveredPosts: inventory.posts.length,
      likesKnown: known.length,
      likesMissing: inventory.posts.length - known.length,
      likesCoverage: inventory.posts.length === 0 ? 0 : known.length / inventory.posts.length,
      stopReason: inventory.stopReason,
      corpusCompleteness: inventory.stopReason === "budget_reached" ? "bounded_partial" : "observed_converged"
    },
    likes: {
      min: likes[0] ?? null,
      p25: quantile(likes, 0.25),
      median,
      mean,
      p75: quantile(likes, 0.75),
      max: likes.at(-1) ?? null
    },
    mediaTypes,
    records: inventory.posts,
    unknowns: [
      ...(inventory.posts.some((post) => post.likes === null) ? ["部分作品没有可见或可解析的点赞数，未按 0 计入统计。"] : []),
      "主页网格不提供播放、完播、主页访问、转粉、投流和成交数据。",
      "zero_growth 只表示本次网页会话已收敛，不等同于平台声明的账号历史作品总数。",
      "当前轻量清单尚未逐条核验发布时间、收藏、评论、封面与视频正文。"
    ]
  });

  const tiers = distribute(known);
  const sortedKnown = [...known].sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0));
  const middleIds = new Set(sortedKnown.slice(Math.floor(sortedKnown.length / 3), Math.ceil(sortedKnown.length * 2 / 3))
    .map((post) => post.externalId));
  const protectedBaseIds = new Set<string>();
  for (const candidate of [medianNear, meanNear]) {
    if (!candidate || !middleIds.has(candidate.externalId)) continue;
    protectedBaseIds.add(candidate.externalId);
    if (tiers.base.some((post) => post.externalId === candidate.externalId)) continue;
    const replaceIndex = tiers.base.findLastIndex((post) => !protectedBaseIds.has(post.externalId));
    if (replaceIndex >= 0) tiers.base.splice(replaceIndex, 1, candidate);
  }
  tiers.base.sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0));
  const selectedIds = new Set([...tiers.high, ...tiers.base, ...tiers.low].map((post) => post.externalId));
  const typicalMediaType = Object.entries(mediaTypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
  const makeItems = (tier: "high" | "base" | "low", posts: CreatorInventoryPost[]) => {
    const deep = deepIds(posts);
    return posts.map((post, index) => {
      const anchors: Array<"median_near" | "mean_near" | "typical_form"> = [];
      if (post.externalId === medianNear?.externalId) anchors.push("median_near");
      if (post.externalId === meanNear?.externalId) anchors.push("mean_near");
      if (post.mediaType === typicalMediaType) anchors.push("typical_form");
      const comparison = tier === "high" ? "高表现区间的代表" : tier === "low" ? "低表现区间的代表" : "账号基本盘区间的代表";
      return {
        ...post,
        tier,
        tierRank: index + 1,
        anchors,
        selectionReason: `${comparison}；按全量已知点赞排序后分位抽样，保留区间内部差异。`,
        deepCandidate: deep.has(post.externalId),
        deepState: "pending" as const,
        confounds: ["发布时间、选题热度、粉丝增长阶段和投流状态尚未控制。"]
      };
    });
  };
  const items = [...makeItems("high", tiers.high), ...makeItems("base", tiers.base), ...makeItems("low", tiers.low)];
  return {
    corpus,
    selection: creatorSelectionSchema.parse({
      schemaVersion: "1.0.0",
      runId: inventory.runId,
      generatedAt,
      sourceCorpusArtifactRef: `/artifacts/${inventory.runId}/creator-corpus.json`,
      ruleVersion: "ranked-7x3-v1",
      rules: {
        targetPerTier: 7,
        deepCandidatesPerTier: 3,
        high: "已知点赞排序的上三分位中，最多取 7 条覆盖该区间。",
        base: "已知点赞排序的中三分位中，最多取 7 条，并显式标注中位数附近与平均值附近锚点。",
        low: "已知点赞排序的下三分位中，最多取 7 条覆盖该区间。",
        unknownMetricPolicy: "exclude_from_metric_tiering"
      },
      denominator: {
        discoveredPosts: inventory.posts.length,
        eligiblePosts: known.length,
        selectedPosts: selectedIds.size,
        excludedMissingLikes: inventory.posts.length - known.length
      },
      anchors: {
        median,
        mean,
        medianNearPostId: medianNear?.externalId ?? null,
        meanNearPostId: meanNear?.externalId ?? null,
        meanGap,
        meanGapReason: meanGap ? "没有作品落在全量平均值 ±25% 内；平均值可能被头部极值拉高。" : null
      },
      tierCounts: { high: tiers.high.length, base: tiers.base.length, low: tiers.low.length },
      items,
      limitations: [
        "这 21 条是同一份规范选择；9 条 deepCandidate 只是其中的深度还原候选，不代表已完成视频理解。",
        "轻量网格数据只能建立表现层分层，不能单独解释内容为什么火或为什么失效。",
        ...(inventory.stopReason === "budget_reached" ? ["采集因预算停止，所有分层仅代表当前已观察清单。"] : [])
      ]
    })
  };
}
