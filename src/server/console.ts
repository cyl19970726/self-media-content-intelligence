import fs from "node:fs";
import path from "node:path";
import { asNumber, asRecord, asString, asStringOrNull, positioningOf, readJson, redWitchFocusCount, researchDir, videoEvidenceCount } from "./creator-meta.js";
import type { Benchmark, CreatorConsole, VideoEvidence } from "../shared/schema.js";

const distributionLabels = ["<100", "100–499", "500–999", "1k–4,999", "5k–9,999", "≥10k"];

function distributionOf(rows: { likes: number }[]): { label: string; count: number; share: number }[] {
  const buckets = distributionLabels.map((label) => ({ label, count: 0, share: 0 }));
  for (const row of rows) {
    const index = row.likes < 100 ? 0
      : row.likes < 500 ? 1
      : row.likes < 1000 ? 2
      : row.likes < 5000 ? 3
      : row.likes < 10000 ? 4 : 5;
    const bucket = buckets[index];
    if (bucket) bucket.count += 1;
  }
  const total = rows.length || 1;
  for (const bucket of buckets) bucket.share = Math.round((bucket.count / total) * 1000) / 10;
  return buckets;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  const lower = sorted[mid - 1] ?? 0;
  return sorted.length % 2 === 1 ? upper : (lower + upper) / 2;
}

function parseSrt(filePath: string): { id: string; start: number | null; text: string; frame: string | null }[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }
  const cues: { id: string; start: number | null; text: string; frame: string | null }[] = [];
  const blocks = content.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const timeMatch = lines[1]?.match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->/);
    if (!timeMatch) continue;
    const hours = Number(timeMatch[1]), minutes = Number(timeMatch[2]);
    const seconds = Number(timeMatch[3]), millis = Number(timeMatch[4]);
    const start = hours * 3600 + minutes * 60 + seconds + millis / 1000;
    const text = lines.slice(2).join(" ");
    cues.push({ id: `C${cues.length + 1}`, start: Math.round(start * 10) / 10, text, frame: null });
  }
  return cues;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// ——— red witch ———

function redWitchTiers(): CreatorConsole["tiers"] {
  const focus = readJson("ai-red-witch/selected-high-like/focus-reconstruction.json");
  if (!focus) return [];
  const taxonomy = asRecord(focus.taxonomy);
  const names = { high: "高表现", base: "基本盘", low: "低表现" } as const;
  return (["high", "base", "low"] as const).map((tier) => {
    const sourceTier = tier === "base" ? "median" : tier;
    const group = asRecord(taxonomy[sourceTier]);
    const types = Array.isArray(group.types) ? group.types as Record<string, unknown>[] : [];
    const videos = types.flatMap((type) => {
      const list = Array.isArray(type.videos) ? type.videos as Record<string, unknown>[] : [];
      return list.map((video) => ({
        id: asString(video.id),
        title: asString(video.title),
        likes: asNumber(video.likes) ?? 0,
        collections: asNumber(video.collections) ?? 0,
        publishedLabel: asStringOrNull(video.publishedLabel),
        cover: asStringOrNull(video.cover),
        selected: video.selected === true,
        archetype: asStringOrNull(type.name)
      }));
    });
    return { id: tier, name: names[tier], conclusion: asString(group.conclusion), videos };
  });
}

function redWitchConsole(): CreatorConsole | null {
  const analysis = readJson("ai-red-witch/selected-high-like/analysis.json");
  const strategy = readJson("ai-red-witch/selected-high-like/strategy.json");
  const backfill = readJson("ai-red-witch/selected-high-like/baseline-backfill.json");
  if (!analysis) return null;
  const creator = asRecord(analysis.creator);
  const coverage = asRecord(analysis.coverage);

  const overview = asRecord(backfill?.overview);
  const average = asRecord(backfill?.averageDiagnostic);
  const publishing = asRecord(backfill?.publishing);
  const missing = asRecord(backfill?.missing);
  const baseline = backfill ? {
    postCount: asNumber(overview.postCount) ?? 0,
    medianLikes: asNumber(overview.medianLikes) ?? 0,
    meanLikes: asNumber(overview.meanLikes) ?? 0,
    maxLikes: asNumber(overview.maxLikes) ?? 0,
    distribution: Array.isArray(overview.distribution)
      ? (overview.distribution as Record<string, unknown>[]).map((bucket) => ({
        label: asString(bucket.label), count: asNumber(bucket.count) ?? 0, share: asNumber(bucket.share) ?? 0
      }))
      : [],
    averageNote: average.status === "mean_gap"
      ? `平均值档不成立：均值 ${Math.round(asNumber(average.mean) ?? 0)} 落在分布断层（±25% 带宽内无自然样本），改看上下边界。`
      : null
  } : null;

  const engines = Array.isArray(strategy?.engines) ? strategy.engines as Record<string, unknown>[] : [];
  const weekdays = Array.isArray(publishing.weekdays) ? publishing.weekdays as Record<string, unknown>[] : [];
  const dayparts = Array.isArray(publishing.dayparts) ? publishing.dayparts as Record<string, unknown>[] : [];

  return {
    meta: {
      id: "ai-red-witch",
      name: asString(creator.name, "AI红发魔女"),
      positioning: positioningOf["ai-red-witch"],
      profileUrl: asString(creator.profile) || asString(creator.profileUrl),
      followers: asString(creator.followers),
      likesAndCollections: asString(creator.likesAndCollections),
      capturedAt: asStringOrNull(coverage.capturedAt)
    },
    baseline,
    baselineHealth: baseline ? {
      status: "partial" as const,
      reason: "21 条分层样本（7/7/7）；331 条全量只有聚合摘要，逐条原始行未落盘。",
      capturedAt: asStringOrNull(coverage.capturedAt)
    } : { status: "missing" as const, reason: "基本盘数据缺失", capturedAt: null },
    tiers: redWitchTiers(),
    contentMap: {
      slotName: "增长引擎",
      items: engines.map((engine) => ({
        name: asString(engine.name),
        signal: asStringOrNull(engine.signal),
        mechanism: asStringOrNull(engine.mechanism)
      }))
    },
    rhythm: backfill ? {
      conclusion: asString(publishing.conclusion),
      weekdays: weekdays.map((day) => ({ name: asString(day.name), count: asNumber(day.count) ?? 0, medianLikes: asNumber(day.medianLikes) })),
      dayparts: dayparts.map((part) => ({ name: asString(part.name), count: asNumber(part.count) ?? 0, medianLikes: asNumber(part.medianLikes) }))
    } : null,
    rhythmHealth: backfill ? {
      status: "partial" as const,
      reason: "21 条分层样本的发布节奏，反映选样结构而非账号真实节奏。",
      capturedAt: asStringOrNull(coverage.capturedAt)
    } : { status: "missing" as const, reason: "发布节奏数据缺失", capturedAt: null },
    boundaries: [
      asString(strategy?.evidenceBoundary, "公开数据边界未记录"),
      missing.fullCorpusRows === true ? "331 条全量公开盘面只保留了聚合摘要，逐条原始行未落盘（需重新采集）。" : ""
    ].filter(Boolean),
    evidenceLinks: [
      { label: "视频逐条还原库", href: "/research/ai-red-witch/video-library/index.html", count: videoEvidenceCount("ai-red-witch") },
      { label: `高中低 ${redWitchFocusCount()} 条 · 增长引擎研究台`, href: "/research/ai-red-witch/selected-high-like/report.html", count: redWitchFocusCount() }
    ]
  };
}

// ——— human director ———

function humanDirectorConsole(): CreatorConsole | null {
  const analysis = readJson("human-director/analysis.json");
  const inventory = readJson("human-director/inventory.json");
  const backfill = readJson("human-director/tiers-backfill.json");
  if (!analysis || !inventory) return null;
  const creator = asRecord(analysis.creator);
  const coverage = asRecord(analysis.coverage);
  const rows = (Array.isArray(inventory.videos) ? inventory.videos as Record<string, unknown>[] : [])
    .map((video) => ({ id: asString(video.id), title: asString(video.title), likes: asNumber(video.likes) ?? 0, collections: asNumber(video.collections) ?? 0 }));
  const likes = rows.map((row) => row.likes);
  const avg = mean(likes);
  const med = median(likes);
  const baseline = {
    postCount: rows.length,
    medianLikes: Math.round(med),
    meanLikes: Math.round(avg),
    maxLikes: Math.max(0, ...likes),
    distribution: distributionOf(rows),
    averageNote: null
  };

  const archetypes = new Map<string, { name: string; examples: string[] }>();
  for (const video of Array.isArray(analysis.videos) ? analysis.videos as Record<string, unknown>[] : []) {
    const archetype = asString(video.archetype);
    if (!archetype) continue;
    const entry = archetypes.get(archetype) ?? { name: archetype, examples: [] };
    entry.examples.push(asString(video.title).slice(0, 24));
    archetypes.set(archetype, entry);
  }

  const backfillMissing = asRecord(backfill?.missing);
  const sourceTiers = Array.isArray(backfill?.tiers) ? backfill.tiers as Record<string, unknown>[] : [];
  const sourceConclusion = (id: string) => asString(sourceTiers.find((tier) => asString(tier.tier) === id)?.conclusion);
  const tiers: CreatorConsole["tiers"] = (["high", "base", "low"] as const).map((tierId) => {
      const tierRows = rows.filter((row) => {
        if (tierId === "high") return row.likes > avg * 1.25;
        if (tierId === "base") return Math.abs(row.likes - avg) <= avg * 0.25 || (row.likes >= med && row.likes < avg * 0.75);
        return row.likes < med;
      }).map((row) => ({
        id: row.id, title: row.title, likes: row.likes, collections: row.collections,
        publishedLabel: null, cover: null, selected: false, archetype: null
      }));
      return {
        id: tierId,
        name: tierId === "high" ? "高表现" : tierId === "base" ? "基本盘" : "低表现",
        conclusion: tierId === "base"
          ? [sourceConclusion("median"), sourceConclusion("average")].filter(Boolean).join("；")
          : sourceConclusion(tierId),
        videos: tierRows
      };
    });

  return {
    meta: {
      id: "human-director",
      name: asString(creator.name, "人类最强编导").split("（")[0]?.trim() || "人类最强编导",
      positioning: positioningOf["human-director"],
      profileUrl: asString(creator.profile) || asString(creator.profileUrl),
      followers: asString(creator.followers),
      likesAndCollections: asString(creator.likesAndCollections),
      capturedAt: asStringOrNull(coverage.capturedAt)
    },
    baseline,
    baselineHealth: { status: "full" as const, reason: "19 条全量公开数据现算", capturedAt: asStringOrNull(coverage.capturedAt) },
    tiers,
    contentMap: {
      slotName: "内容样本类型",
      items: [...archetypes.values()].map((item) => ({
        name: item.name, signal: null, mechanism: item.examples.join(" / ")
      }))
    },
    rhythm: null,
    rhythmHealth: { status: "missing" as const, reason: backfillMissing.publishedAt === true
      ? "19 条均无发布时间字段，发布节奏（星期/时段）无法计算。" : "发布节奏数据缺失", capturedAt: null },
    boundaries: [
      asString(analysis.selectionLogic),
      backfillMissing.archetypeMissingCount === 11 ? "19 条中 11 条无内容样本类型标签（archetype），内容地图只覆盖 8 条深样本。" : ""
    ].filter(Boolean),
    evidenceLinks: [
      { label: `${videoEvidenceCount("human-director")} 条全量分析 · 8 条真实拉片`, href: "/research/human-director/report.html", count: videoEvidenceCount("human-director") }
    ]
  };
}

export function loadCreatorConsole(id: string): CreatorConsole | null {
  if (id === "ai-red-witch") return redWitchConsole();
  if (id === "human-director") return humanDirectorConsole();
  return null;
}

// ——— benchmark ———

function aggregateCollectionToLike(rows: { likes: number; collections: number }[]): number {
  const likes = rows.reduce((sum, row) => sum + row.likes, 0);
  const collections = rows.reduce((sum, row) => sum + row.collections, 0);
  return likes === 0 ? 0 : Math.round((collections / likes) * 10000) / 10000;
}

export function loadBenchmark(): Benchmark {
  const focus = readJson("ai-red-witch/selected-high-like/focus-reconstruction.json");
  const zhang = readJson("zhang-zala-v1/dashboard/dashboard-data.json");
  const inventory = readJson("human-director/inventory.json");

  const redWitchRows = (() => {
    if (!focus) return [];
    const taxonomy = asRecord(focus.taxonomy);
    return (["high", "median", "low"] as const).flatMap((tier) => {
      const types = Array.isArray(asRecord(taxonomy[tier]).types) ? asRecord(taxonomy[tier]).types as Record<string, unknown>[] : [];
      return types.flatMap((type) => (Array.isArray(type.videos) ? type.videos as Record<string, unknown>[] : []).map((video) => ({
        likes: asNumber(video.likes) ?? 0, collections: asNumber(video.collections) ?? 0
      })));
    });
  })();
  const zhangRows = (Array.isArray(zhang?.posts) ? zhang.posts as Record<string, unknown>[] : []).map((post) => ({
    likes: asNumber(post.likes) ?? 0, collections: asNumber(post.collections) ?? 0
  }));
  const humanRows = (Array.isArray(inventory?.videos) ? inventory.videos as Record<string, unknown>[] : []).map((video) => ({
    likes: asNumber(video.likes) ?? 0, collections: asNumber(video.collections) ?? 0
  }));

  const ips = [
    { id: "ai-red-witch", name: "AI红发魔女", sampleSize: redWitchRows.length, aggregateCollectionToLike: aggregateCollectionToLike(redWitchRows), medianLikes: Math.round(median(redWitchRows.map((row) => row.likes))) },
    { id: "zhang-zala", name: "张咋啦", sampleSize: zhangRows.length, aggregateCollectionToLike: aggregateCollectionToLike(zhangRows), medianLikes: Math.round(median(zhangRows.map((row) => row.likes))) },
    { id: "human-director", name: "人类最强编导", sampleSize: humanRows.length, aggregateCollectionToLike: aggregateCollectionToLike(humanRows), medianLikes: Math.round(median(humanRows.map((row) => row.likes))) }
  ];

  const strong = ips.filter((ip) => ip.aggregateCollectionToLike >= 0.5);
  const weak = ips.filter((ip) => ip.aggregateCollectionToLike < 0.5);
  const findings: Benchmark["findings"] = [
    strong.length >= 2
      ? { kind: "track", text: `收藏/点赞比 ≥0.5 在 ${strong.length}/${ips.length} 个账号成立（${strong.map((ip) => ip.name).join("、")}）——保存型内容（可复用、值得收藏）是 AI 赛道的跨账号规律，不是单个 IP 的能力。` }
      : { kind: "track", text: `尚未在多个账号发现重复成立的规律：对比集仅 ${ips.length} 个 IP，样本不足以区分赛道规律与 IP 能力。` },
    weak.length > 0
      ? { kind: "ip", text: `${weak.map((ip) => `${ip.name}（${ip.aggregateCollectionToLike}）`).join("、")} 的收藏/点赞比 <0.5——传播结构不依赖收藏，规律迁移时要按引擎拆开看。` }
      : { kind: "ip", text: "当前所有账号收藏/点赞比均 ≥0.5：没有发现「仅单账号成立」的规律。这本身是信号——保存型内容在 AI 赛道一致性很高，但对比集只有 3 个 IP，仍属初步观察。" },
    { kind: "gap", text: "当前对比集仅 2-3 个 IP，规律标注为初步观察；每新增一个同赛道 IP，可信度判据自动更新。" }
  ];

  return {
    metric: "聚合收藏/点赞比（保存型内容信号）",
    metricNote: "口径：全部样本收藏总和 ÷ 点赞总和。红发魔女 21 条分层样本、张咋啦 62 条、人类最强编导 19 条。样本结构不同（分层选样 vs 全量），对比只标注方向不虚构精度。",
    ips,
    findings
  };
}

// ——— video evidence ———

export function loadVideoEvidence(creatorId: string, videoId: string): VideoEvidence | null {
  if (creatorId === "ai-red-witch") {
    const report = readJson(`ai-red-witch/video-library/reports/${videoId}/report.json`);
    if (!report) return null;
    const engagement = asRecord(report.engagement);
    const sections = Array.isArray(report.sections) ? report.sections as Record<string, unknown>[] : [];
    const keyPoints = Array.isArray(report.keyPoints) ? report.keyPoints as string[] : [];
    const framesDir = `ai-red-witch/video-library/reports/${videoId}/frames-sparse`;
    const frames: VideoEvidence["frames"] = [];
    if (fs.existsSync(path.join(researchDir, framesDir))) {
      for (const file of fs.readdirSync(path.join(researchDir, framesDir)).sort()) {
        if (/\.(jpg|png|jpeg)$/i.test(file)) {
          frames.push({ id: file.replace(/\.[^.]+$/, ""), time: null, src: `/research/ai-red-witch/video-library/reports/${videoId}/frames-sparse/${file}` });
        }
      }
    }
    const srtPath = path.join(researchDir, "ai-red-witch", "selected-high-like", "media", `${videoId}.srt`);
    return {
      id: videoId,
      creatorId,
      title: asString(report.title),
      lead: asString(report.articleLead) || asString(report.coreClaim),
      architecture: sections.map((section) => asString(section.title)).filter(Boolean).join(" → ") || null,
      engagement: {
        likes: asNumber(engagement.likes) ?? 0,
        collections: asNumber(engagement.collections) ?? 0,
        comments: asNumber(engagement.comments) ?? 0,
        shares: asNumber(engagement.shares) ?? 0
      },
      frames,
      cues: parseSrt(srtPath),
      knowledgeUnits: keyPoints.map((point, index) => ({ id: `K${index + 1}`, title: point, statement: point })),
      unknowns: [asString(report.boundary)].filter(Boolean),
      sourceLabel: "video-library 报告（稀疏帧 + 官方字幕）",
      reportHref: `/research/ai-red-witch/video-library/reports/${videoId}/report.html`
    };
  }
  if (creatorId === "human-director") {
    const analysis = readJson("human-director/analysis.json");
    const video = (Array.isArray(analysis?.videos) ? analysis.videos as Record<string, unknown>[] : [])
      .find((item) => item.id === videoId);
    if (!video) return null;
    const engagement = asRecord(video.engagement);
    const transcript = asRecord(video.transcript);
    const srtPath = path.join(researchDir, "human-director", "media", `${videoId}.srt`);
    return {
      id: videoId,
      creatorId,
      title: asString(video.title),
      lead: asString(transcript.first3Seconds),
      architecture: asStringOrNull(video.archetype),
      engagement: {
        likes: asNumber(engagement.likes) ?? 0,
        collections: asNumber(engagement.collections) ?? 0,
        comments: asNumber(engagement.comments) ?? 0,
        shares: asNumber(engagement.shares) ?? 0
      },
      frames: [],
      cues: parseSrt(srtPath),
      knowledgeUnits: [],
      unknowns: ["逐帧画面未落盘为独立证据页；完整拉片见原报告 breakdowns 节。"],
      sourceLabel: "公开数据 + 官方字幕（无逐帧证据页）",
      reportHref: "/research/human-director/report.html"
    };
  }
  return null;
}
