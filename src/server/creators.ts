import { asNumber, asRecord, asString, formatCount, positioningOf, readJson, videoEvidenceCount } from "./creator-meta.js";
import type { CreatorSummary } from "../shared/schema.js";
import { loadNextWaveCreatorSummaries } from "./next-wave-creators.js";
import type { CreatorResearchService } from "../modules/creator-research/service.js";

function redWitch(): CreatorSummary | null {
  const analysis = readJson("ai-red-witch/selected-high-like/analysis.json");
  const strategy = readJson("ai-red-witch/selected-high-like/strategy.json");
  if (!analysis) return null;
  const creator = asRecord(analysis.creator);
  const coverage = asRecord(analysis.coverage);
  const engines = Array.isArray(strategy?.engines) ? strategy.engines as Record<string, unknown>[] : [];
  const engineTags = engines.map((engine) => asString(engine.name)).filter(Boolean);
  return {
    id: "ai-red-witch",
    name: asString(creator.name, "AI红发魔女"),
    followers: asString(creator.followers),
    likesAndCollections: asString(creator.likesAndCollections),
    profileUrl: asString(creator.profile) || asString(creator.profileUrl),
    positioning: positioningOf["ai-red-witch"],
    summary: "当前公开样本呈现三类主要表现结构：任务解决方案、社交传播型内容与商业案例叙事；各类的证据强度和表现分布不同。",
    tags: engineTags.length > 0 ? engineTags : ["保存引擎", "传播引擎", "商业引擎"],
    stats: [
      { label: "采集卡片", value: formatCount(asNumber(coverage.capturedNotes)) },
      { label: "高赞拆解", value: formatCount(asNumber(coverage.selectedVideos)) },
      { label: "逐条还原", value: String(videoEvidenceCount("ai-red-witch")) }
    ],
    entries: [
      { label: "高中低 21 条 · 增长引擎", href: "/research/ai-red-witch/selected-high-like/report.html" },
      { label: "19 个视频逐条还原库", href: "/research/ai-red-witch/video-library/index.html" }
    ]
  };
}

function zhangZala(): CreatorSummary | null {
  const dashboard = readJson("zhang-zala-v1/dashboard-data.json");
  if (!dashboard) return null;
  const creator = asRecord(dashboard.creator);
  const overview = asRecord(dashboard.overview);
  const positioning = asRecord(dashboard.positioning);
  const topics = Array.isArray(dashboard.topicClusters) ? dashboard.topicClusters as Record<string, unknown>[] : [];
  return {
    id: "zhang-zala",
    name: asString(creator.name, "张咋啦"),
    followers: formatCount(asNumber(asRecord(creator.publicStats).followers)),
    likesAndCollections: formatCount(asNumber(asRecord(creator.publicStats).likesAndCollections)),
    profileUrl: asString(creator.profileUrl),
    positioning: asString(positioning.sentence),
    summary: "62 条作品基本盘、High/Base/Low 统一 21 条比较集，以及高、中位、平均值附近和低表现的 12 条既有深度内容资产。",
    tags: topics.slice(0, 4).map((topic) => asString(topic.name)).filter(Boolean),
    stats: [
      { label: "全量作品", value: formatCount(asNumber(overview.postCount)) },
      { label: "点赞中位", value: formatCount(asNumber(overview.medianLikes)) },
      { label: "深度内容", value: formatCount(Array.isArray(dashboard.deepDives) ? dashboard.deepDives.length : 0) }
    ],
    entries: [{ label: "62 条基本盘 · 21 条比较 · 深度证据", href: "/research/zhang-zala-v1/dashboard/index.html" }]
  };
}

function humanDirector(): CreatorSummary | null {
  const analysis = readJson("human-director/analysis.json");
  if (!analysis) return null;
  const creator = asRecord(analysis.creator);
  const coverage = asRecord(analysis.coverage);
  const archetypes = Array.isArray(analysis.videos)
    ? [...new Set((analysis.videos as Record<string, unknown>[]).map((video) => asString(video.archetype)).filter(Boolean))]
    : [];
  const selection = asString(analysis.selectionLogic);
  const rawName = asString(creator.name, "人类最强编导");
  return {
    id: "human-director",
    name: rawName.split("（")[0]?.trim() || "人类最强编导",
    followers: asString(creator.followers),
    likesAndCollections: asString(creator.likesAndCollections),
    profileUrl: asString(creator.profile) || asString(creator.profileUrl),
    positioning: positioningOf["human-director"],
    summary: selection,
    tags: archetypes,
    stats: [
      { label: "全量笔记", value: formatCount(asNumber(coverage.capturedNotes)) },
      { label: "画面拆解", value: formatCount(asNumber(coverage.selectedVisualBreakdowns)) },
      { label: "字幕可用", value: formatCount(asNumber(coverage.subtitleAvailable)) }
    ],
    entries: [
      { label: `${videoEvidenceCount("human-director")} 条全量分析 · 四种关键样本`, href: "/research/human-director/report.html" }
    ]
  };
}

const loaders: Record<string, () => CreatorSummary | null> = {
  "ai-red-witch": redWitch,
  "zhang-zala": zhangZala,
  "human-director": humanDirector
};

function versionedRunSummaries(service: CreatorResearchService): CreatorSummary[] {
  const newestByCreator = new Map<string, ReturnType<CreatorResearchService["list"]>[number]>();
  for (const run of service.list(100)) {
    const id = run.creatorId;
    if (!id || !run.creatorName || newestByCreator.has(id)) continue;
    newestByCreator.set(id, run);
  }
  return [...newestByCreator.values()].map((run): CreatorSummary => ({
    id: run.canonicalSlug ?? run.creatorId as string,
    name: run.creatorName as string,
    followers: formatCount(run.publicProfile.followers),
    likesAndCollections: formatCount(run.publicProfile.likesAndCollections),
    profileUrl: run.profileUrl,
    positioning: run.status === "ready"
      ? "版本化研究已通过博主级硬闸。"
      : "公开基本盘已进入版本化任务；账号定位与内容机制等待深度证据闭环。",
    summary: `${run.coverage.discoveredPosts} 条作品已登记；${run.coverage.comparisonPosts} 条进入比较；${run.coverage.reconstructedPosts} 条通过深度还原。当前状态：${run.status}。`,
    tags: ["版本化 Run", "Artifact 已登记", run.status === "needs_user" ? "等待人工恢复" : "持续运行"],
    stats: [
      { label: "已登记作品", value: String(run.coverage.discoveredPosts) },
      { label: "比较样本", value: String(run.coverage.comparisonPosts) },
      { label: "深度通过", value: String(run.coverage.reconstructedPosts) }
    ],
    entries: [{ label: "进入版本化研究页", href: `/creators/${run.canonicalSlug ?? run.creatorId}`, note: run.nextAction }]
  }));
}

export function loadCreatorSummaries(service?: CreatorResearchService): CreatorSummary[] {
  const legacy = Object.values(loaders)
    .map((load) => load())
    .filter((summary): summary is CreatorSummary => summary !== null);
  const existingIds = new Set(legacy.map((summary) => summary.id));
  const dynamic = (service ? versionedRunSummaries(service) : loadNextWaveCreatorSummaries())
    .filter((summary) => !existingIds.has(summary.id));
  return [...legacy, ...dynamic];
}
