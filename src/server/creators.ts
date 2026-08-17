import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../core/config.js";
import type { CreatorSummary } from "../shared/schema.js";

const researchDir = path.join(projectRoot, "artifacts", "creator-research");

function readJson(relativePath: string): Record<string, unknown> | null {
  const file = path.join(researchDir, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function formatCount(value: number | null): string {
  if (value === null) return "—";
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(value);
}

function redWitch(): CreatorSummary | null {
  const analysis = readJson("ai-red-witch/selected-high-like/analysis.json");
  const strategy = readJson("ai-red-witch/selected-high-like/strategy.json");
  if (!analysis) return null;
  const creator = asRecord(analysis.creator);
  const coverage = asRecord(analysis.coverage);
  const engines = Array.isArray(strategy?.engines) ? strategy.engines as Record<string, unknown>[] : [];
  const engineTags = engines.map((engine) => asString(engine.name)).filter(Boolean);
  const conclusion = asString(strategy?.executiveConclusion);
  return {
    id: "ai-red-witch",
    name: asString(creator.name, "AI红发魔女"),
    followers: asString(creator.followers),
    likesAndCollections: asString(creator.likesAndCollections),
    profileUrl: asString(creator.profile) || asString(creator.profileUrl),
    positioning: "AI 工具实操型博主：把抽象 AI 能力翻译成具体任务、结果与用途",
    summary: conclusion || "高赞由三台增长引擎驱动：可保存的解决方案、可转发的社交梗、商业叙事。",
    tags: engineTags.length > 0 ? engineTags : ["保存引擎", "传播引擎", "商业引擎"],
    stats: [
      { label: "公开笔记", value: formatCount(asNumber(coverage.capturedNotes)) },
      { label: "高赞拆解", value: formatCount(asNumber(coverage.selectedVideos)) },
      { label: "逐条还原", value: "19" }
    ],
    entries: [
      { label: "高中低 21 条 · 增长引擎", href: "/research/ai-red-witch/selected-high-like/report.html" },
      { label: "19 个视频逐条还原库", href: "/research/ai-red-witch/video-library/index.html" }
    ]
  };
}

function zhangZala(): CreatorSummary | null {
  const data = readJson("zhang-zala-v1/dashboard/dashboard-data.json");
  if (!data) return null;
  const creator = asRecord(data.creator);
  const stats = asRecord(creator.publicStats);
  const positioning = asRecord(data.positioning);
  const overview = asRecord(data.overview);
  const pillars = Array.isArray(data.contentPillars) ? data.contentPillars as Record<string, unknown>[] : [];
  const pillarTags = pillars
    .map((pillar) => {
      const name = asString(pillar.name);
      const count = asNumber(pillar.portfolioCount);
      return count === null ? name : `${name} · ${count}`;
    })
    .filter((tag) => tag.length > 0);
  const sentence = asString(positioning.sentence);
  return {
    id: "zhang-zala",
    name: asString(creator.name, "张咋啦"),
    followers: formatCount(asNumber(stats.followers)),
    likesAndCollections: formatCount(asNumber(stats.likesAndCollections)),
    profileUrl: asString(creator.profileUrl),
    positioning: asString(positioning.name, "非技术 AI Builder 的公开建造与翻译系统"),
    summary: sentence,
    tags: pillarTags,
    stats: [
      { label: "作品基本盘", value: formatCount(asNumber(overview.postCount)) },
      { label: "深度研究", value: String(Array.isArray(data.deepDives) ? data.deepDives.length : 0) },
      { label: "互动中位数", value: formatCount(asNumber(overview.medianLikes)) }
    ],
    entries: [
      { label: "62 条基本盘 · 四档研究", href: "/research/zhang-zala-v1/dashboard/index.html" }
    ]
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
    positioning: "编导能力模型拆解：成绩证明、平台趋势、垂直教程与价值观转粉四种样本",
    summary: selection,
    tags: archetypes,
    stats: [
      { label: "全量笔记", value: formatCount(asNumber(coverage.capturedNotes)) },
      { label: "画面拆解", value: formatCount(asNumber(coverage.selectedVisualBreakdowns)) },
      { label: "字幕可用", value: formatCount(asNumber(coverage.subtitleAvailable)) }
    ],
    entries: [
      { label: "19 条全量分析 · 四种关键样本", href: "/research/human-director/report.html" }
    ]
  };
}

const loaders: Record<string, () => CreatorSummary | null> = {
  "ai-red-witch": redWitch,
  "zhang-zala": zhangZala,
  "human-director": humanDirector
};

export function loadCreatorSummaries(): CreatorSummary[] {
  return Object.values(loaders)
    .map((load) => load())
    .filter((summary): summary is CreatorSummary => summary !== null);
}

export function creatorIndexFile(): string {
  return researchDir;
}
