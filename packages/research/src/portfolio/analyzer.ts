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

function closest(posts: CreatorInventoryPost[], target: number | null, count = 3): CreatorInventoryPost[] {
  if (target === null) return [];
  return posts.filter((post) => post.likes !== null)
    .sort((left, right) => Math.abs((left.likes ?? 0) - target) - Math.abs((right.likes ?? 0) - target))
    .slice(0, count);
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
      corpusCompleteness: inventory.stopReason === "explicit_end" ? "observed_converged" : "bounded_partial"
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
      ...(inventory.stopReason === "quiescent_incomplete"
        ? ["页面经过迟加载观察与一次有界重触发后仍无新增作品；这是静默不完整状态，不等同于平台声明的历史作品总数。"]
        : []),
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
  const highDeep = [...known].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3);
  const lowDeep = [...known].sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0)).slice(0, 3);
  const medianDeep = closest(known, median);
  const meanDeep = closest(known, mean);
  const deepGroups = new Map<string, Array<"high" | "median" | "mean" | "low">>();
  for (const [group, candidates] of [["high", highDeep], ["median", medianDeep], ["mean", meanDeep], ["low", lowDeep]] as const) {
    for (const candidate of candidates) deepGroups.set(candidate.externalId, [...(deepGroups.get(candidate.externalId) ?? []), group]);
  }
  const tierFor = (post: CreatorInventoryPost): "low" | "base" | "high" => {
    const index = sortedKnown.findIndex((item) => item.externalId === post.externalId);
    return index < Math.floor(sortedKnown.length / 3) ? "low"
      : index >= Math.ceil(sortedKnown.length * 2 / 3) ? "high" : "base";
  };
  for (const candidate of [...highDeep, ...medianDeep, ...meanDeep, ...lowDeep]) {
    const tier = tierFor(candidate);
    const bucket = tiers[tier];
    if (bucket.some((post) => post.externalId === candidate.externalId)) continue;
    const replaceIndex = bucket.findLastIndex((post) => !deepGroups.has(post.externalId));
    if (replaceIndex >= 0) bucket.splice(replaceIndex, 1, candidate);
  }
  tiers.high.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  tiers.base.sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0));
  tiers.low.sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0));
  const selectedIds = new Set([...tiers.high, ...tiers.base, ...tiers.low].map((post) => post.externalId));
  const typicalMediaType = Object.entries(mediaTypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
  const makeItems = (tier: "high" | "base" | "low", posts: CreatorInventoryPost[]) => {
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
        deepCandidate: deepGroups.has(post.externalId),
        deepGroups: deepGroups.get(post.externalId) ?? [],
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
      ruleVersion: "four-groups-3-each-v2",
      rules: {
        targetPerTier: 7,
        deepCandidatesPerTier: 3,
        deepCandidatesPerGroup: 3,
        deepGroupContract: "高表现 / 中位数附近 / 算术均值附近 / 低表现各 3 条；重叠样本只下载和重建一次。",
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
        "这 21 条是同一份规范选择；深度候选覆盖高表现、中位数附近、算术均值附近、低表现各 3 条，重叠样本只计一次。",
        "轻量网格数据只能建立表现层分层，不能单独解释内容为什么火或为什么失效。",
        ...(inventory.stopReason === "budget_reached" ? ["采集因预算停止，所有分层仅代表当前已观察清单。"] : [])
      ]
    })
  };
}

export function refineDeepSelectionForVerifiedVideos(
  input: CreatorSelection,
  mediaTypes: Map<string, "video" | "image" | "unknown">,
  generatedAt: string
): CreatorSelection {
  const selection = creatorSelectionSchema.parse(input);
  const videos = selection.items.filter((item) => mediaTypes.get(item.externalId) === "video" && item.likes !== null);
  const high = [...videos].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3);
  const low = [...videos].sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0)).slice(0, 3);
  const median = closest(videos, selection.anchors.median);
  const mean = closest(videos, selection.anchors.mean);
  const groups = new Map<string, Array<"high" | "median" | "mean" | "low">>();
  for (const [group, candidates] of [["high", high], ["median", median], ["mean", mean], ["low", low]] as const) {
    for (const candidate of candidates) groups.set(candidate.externalId, [...(groups.get(candidate.externalId) ?? []), group]);
  }
  const missing = (["high", "median", "mean", "low"] as const)
    .filter((group) => selection.items.filter((item) => groups.get(item.externalId)?.includes(group)).length < 3);
  return creatorSelectionSchema.parse({
    ...selection,
    generatedAt,
    ruleVersion: "four-groups-video-refined-v3",
    items: selection.items.map((item) => ({
      ...item,
      mediaType: mediaTypes.get(item.externalId) ?? item.mediaType,
      deepCandidate: groups.has(item.externalId),
      deepGroups: groups.get(item.externalId) ?? []
    })),
    limitations: [...selection.limitations,
      "深度候选已在详情采集后按已核验视频类型重算；图文仍保留在比较集，但不进入视频重建。",
      ...(missing.length ? [`比较集中的已核验视频不足，未满足组别：${missing.join(" / ")}。`] : [])]
  });
}

/** Select the real deep-evidence carrier. Video remains preferred when present; image-only
 * portfolios receive the same four-group contract instead of an impossible video gate. */
export function refineDeepSelectionForVerifiedMedia(
  input: CreatorSelection,
  mediaTypes: Map<string, "video" | "image" | "unknown">,
  generatedAt: string
): CreatorSelection {
  const selection = creatorSelectionSchema.parse(input);
  const videos = selection.items.filter((item) => mediaTypes.get(item.externalId) === "video" && item.likes !== null);
  if (videos.length > 0) return refineDeepSelectionForVerifiedVideos(selection, mediaTypes, generatedAt);
  const images = selection.items.filter((item) => mediaTypes.get(item.externalId) === "image" && item.likes !== null);
  const high = [...images].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3);
  const low = [...images].sort((a, b) => (a.likes ?? 0) - (b.likes ?? 0)).slice(0, 3);
  const median = closest(images, selection.anchors.median);
  const mean = closest(images, selection.anchors.mean);
  const groups = new Map<string, Array<"high" | "median" | "mean" | "low">>();
  for (const [group, candidates] of [["high", high], ["median", median], ["mean", mean], ["low", low]] as const) {
    for (const candidate of candidates) groups.set(candidate.externalId, [...(groups.get(candidate.externalId) ?? []), group]);
  }
  const missing = (["high", "median", "mean", "low"] as const)
    .filter((group) => selection.items.filter((item) => groups.get(item.externalId)?.includes(group)).length < 3);
  return creatorSelectionSchema.parse({
    ...selection,
    generatedAt,
    ruleVersion: "four-groups-media-refined-v4",
    items: selection.items.map((item) => ({
      ...item,
      mediaType: mediaTypes.get(item.externalId) ?? item.mediaType,
      deepCandidate: groups.has(item.externalId),
      deepGroups: groups.get(item.externalId) ?? []
    })),
    limitations: [...selection.limitations,
      "比较集没有已核验视频；深度候选改由图文页与正文承载，图文 Builder 不借用视频分析结论。",
      ...(missing.length ? [`比较集中的已核验图文不足，未满足组别：${missing.join(" / ")}。`] : [])]
  });
}
