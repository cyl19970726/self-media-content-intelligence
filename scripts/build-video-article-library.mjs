import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const workspace = resolve(process.cwd());
const creatorRoot = join(workspace, "artifacts/creator-research/ai-red-witch");
const highRoot = join(creatorRoot, "selected-high-like");
const lowRoot = join(creatorRoot, "low-vs-high");
const medianRoot = join(creatorRoot, "median-performance");
const outRoot = join(creatorRoot, "video-library");
const reportRoot = join(outRoot, "reports");
const notesPath = join(outRoot, "editorial-notes.json");

if (!existsSync(notesPath)) throw new Error(`Missing editorial notes: ${notesPath}`);
mkdirSync(reportRoot, { recursive: true });

const high = JSON.parse(readFileSync(join(highRoot, "analysis.json"), "utf8"));
const low = JSON.parse(readFileSync(join(lowRoot, "low-samples.json"), "utf8"));
const median = JSON.parse(readFileSync(join(medianRoot, "median-samples.json"), "utf8"));
const editorial = JSON.parse(readFileSync(notesPath, "utf8"));

const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const formatPublished = (iso) => new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
}).format(new Date(iso));

const parseTimestamp = (raw) => {
  const match = raw.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) throw new Error(`Invalid subtitle timestamp: ${raw}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4]}`);
};

const parseSrt = (raw) => raw
  .replace(/\r/g, "")
  .trim()
  .split(/\n\s*\n/)
  .map((block, index) => {
    const lines = block.trim().split("\n");
    const timingIndex = lines.findIndex((line) => line.includes(" --> "));
    if (timingIndex < 0) return null;
    const [startRaw, endRaw] = lines[timingIndex].split(" --> ");
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    return {
      id: `CUE-${String(index + 1).padStart(3, "0")}`,
      start: round(start),
      end: round(end),
      midpoint: round((start + end) / 2),
      text: lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "").trim()
    };
  })
  .filter(Boolean);

const probe = (file) => JSON.parse(execFileSync("ffprobe", [
  "-v", "error",
  "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate",
  "-of", "json",
  file
], { encoding: "utf8" }));

const makeFrame = (video, timestamp, output, width = 360, height = 640, force = false) => {
  if (!force && existsSync(output)) return;
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-ss", String(timestamp), "-i", video,
    "-frames:v", "1",
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    "-pix_fmt", "yuvj420p", "-strict", "unofficial", "-q:v", "3", "-y", output
  ]);
};

const makeTile = (pattern, output, columns, rows, width, height) => {
  if (existsSync(output)) return;
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-framerate", "1", "-i", pattern,
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,tile=${columns}x${rows}:padding=4:margin=4:color=#17191b`,
    "-frames:v", "1", "-pix_fmt", "yuvj420p", "-strict", "unofficial", "-q:v", "3", "-y", output
  ]);
};

const detectSceneCuts = (file, duration) => {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-i", file,
    "-vf", "select='gt(scene,0.22)',showinfo", "-an", "-f", "null", "-"
  ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const raw = `${result.stdout || ""}\n${result.stderr || ""}`;
  return [...raw.matchAll(/pts_time:([0-9.]+)/g)]
    .map((match) => round(Number(match[1])))
    .filter((time, index, all) => time > 0.05 && time < duration && (index === 0 || time - all[index - 1] > 0.08));
};

const highById = Object.fromEntries(high.videos.map((item) => [item.id, item]));
const lowById = Object.fromEntries(low.samples.map((item) => [item.id, item]));
const medianById = Object.fromEntries(median.samples.map((item) => [item.id, item]));

const tierLabel = (tier, compact = false) => ({
  high: compact ? "高表现" : "高表现样本",
  median: compact ? "中位" : "中位表现样本",
  low: compact ? "低表现" : "低表现样本"
}[tier] || tier);

const sourceFor = (id, note) => {
  if (note.tier === "high") {
    const item = highById[id];
    if (!item) throw new Error(`High-like item missing: ${id}`);
    return {
      id,
      tier: "high",
      title: item.title,
      mediaPath: join(highRoot, item.media.file),
      subtitlePath: join(highRoot, item.media.subtitle),
      subtitleOrigin: "小红书官方 zh-CN 字幕",
      publishedAt: new Date(parseInt(id.slice(0, 8), 16) * 1000).toISOString(),
      duration: item.media.durationSeconds,
      engagement: item.engagement,
      sourceUrl: item.sourceUrl
    };
  }
  if (note.tier === "median") {
    const item = medianById[id];
    if (!item) throw new Error(`Median item missing: ${id}`);
    return {
      id,
      tier: "median",
      title: item.title,
      mediaPath: join(medianRoot, "media", `${id}.mp4`),
      subtitlePath: join(medianRoot, "media", `${id}.srt`),
      subtitleOrigin: item.subtitleOrigin,
      publishedAt: item.publishedAt,
      duration: item.durationMs / 1000,
      engagement: {
        likes: item.likes,
        collections: item.collects,
        comments: item.comments,
        shares: item.shares,
        collectionToLike: round(item.collects / item.likes),
        commentToLike: round(item.comments / item.likes),
        shareToLike: round(item.shares / item.likes)
      },
      sourceUrl: item.sourceUrl
    };
  }
  const item = lowById[id];
  if (!item) throw new Error(`Low-like item missing: ${id}`);
  return {
    id,
    tier: "low",
    title: item.title,
    mediaPath: join(lowRoot, "media", `${id}.mp4`),
    subtitlePath: join(lowRoot, "media", `${id}.srt`),
    subtitleOrigin: item.subtitleOrigin.includes("machine") ? "Whisper base 机器转写草稿" : "小红书官方 zh-CN 字幕",
    publishedAt: item.publishedAt,
    duration: item.durationMs / 1000,
    engagement: {
      likes: item.likes,
      collections: item.collects,
      comments: item.comments,
      shares: item.shares,
      collectionToLike: round(item.collects / item.likes),
      commentToLike: round(item.comments / item.likes),
      shareToLike: round(item.shares / item.likes)
    },
    sourceUrl: `https://www.xiaohongshu.com/explore/${id}`
  };
};

const reportItems = [];

for (const [id, note] of Object.entries(editorial.videos)) {
  const source = sourceFor(id, note);
  if (!existsSync(source.mediaPath) || !existsSync(source.subtitlePath)) throw new Error(`Missing media/subtitle for ${id}`);
  const reportDir = join(reportRoot, id);
  const sparseDir = join(reportDir, "frames-sparse");
  const denseDir = join(reportDir, "frames-dense");
  const cueDir = join(reportDir, "frames-transcript");
  const keyDir = join(reportDir, "frames-key");
  const knowledgeDir = join(reportDir, "frames-knowledge");
  [reportDir, sparseDir, denseDir, cueDir, keyDir, knowledgeDir].forEach((dir) => mkdirSync(dir, { recursive: true }));

  const media = probe(source.mediaPath);
  const stream = media.streams.find((item) => item.codec_type === "video") || {};
  const duration = Number(media.format.duration);
  const cues = parseSrt(readFileSync(source.subtitlePath, "utf8"));
  const safeEnd = Math.max(0.1, duration - 0.08);

  const sparseTimes = Array.from({ length: 8 }, (_, index) => round((safeEnd * index) / 7));
  sparseTimes.forEach((time, index) => makeFrame(source.mediaPath, time, join(sparseDir, `frame-${String(index + 1).padStart(3, "0")}.jpg`)));
  makeTile(join(sparseDir, "frame-%03d.jpg"), join(reportDir, "sparse-sheet.jpg"), 4, 2, 216, 384);

  const denseInterval = duration <= 35 ? 1 : duration <= 100 ? 2 : duration <= 160 ? 2.5 : 3;
  const denseTimes = [];
  for (let time = 0; time < safeEnd; time += denseInterval) denseTimes.push(round(time));
  if (denseTimes.at(-1) < safeEnd - denseInterval / 2) denseTimes.push(round(safeEnd));
  denseTimes.forEach((time, index) => makeFrame(source.mediaPath, time, join(denseDir, `frame-${String(index + 1).padStart(3, "0")}.jpg`), 216, 384));
  makeTile(join(denseDir, "frame-%03d.jpg"), join(reportDir, "dense-sheet.jpg"), 8, Math.ceil(denseTimes.length / 8), 144, 256);

  cues.forEach((cue, index) => makeFrame(source.mediaPath, Math.min(cue.midpoint, safeEnd), join(cueDir, `cue-${String(index + 1).padStart(3, "0")}.jpg`), 270, 480));
  note.sections.forEach((section, index) => makeFrame(source.mediaPath, Math.min(section.keyFrameAt, safeEnd), join(keyDir, `section-${String(index + 1).padStart(2, "0")}.jpg`), 360, 640, true));
  const knowledgeItems = note.knowledgeMap?.items || [];
  knowledgeItems.forEach((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    makeFrame(source.mediaPath, Math.min(item.identityAt, safeEnd), join(knowledgeDir, `item-${number}-identity.jpg`), 360, 640, true);
    makeFrame(source.mediaPath, Math.min(item.resultAt, safeEnd), join(knowledgeDir, `item-${number}-result.jpg`), 360, 640, true);
  });

  const sceneCuts = detectSceneCuts(source.mediaPath, duration);
  const transcriptChars = cues.reduce((sum, cue) => sum + cue.text.replace(/\s/g, "").length, 0);
  const architecture = note.sections.map((section, index, all) => {
    let role = "展开 / 证明";
    let viewerQuestion = "这个主张如何成立？";
    if (index === 0) {
      role = "钩子 / 问题";
      viewerQuestion = "这和我有什么关系，为什么继续看？";
    } else if (index === all.length - 1) {
      role = "回报 / 收束";
      viewerQuestion = "我最后得到什么，下一步做什么？";
    } else if (index === 1 && all.length >= 4) {
      role = "承诺 / 定义";
      viewerQuestion = "这条内容承诺解决什么？";
    } else if (/安装|配置|上传|输入|步骤|流程|生成|分析|案例|图表|演示/.test(section.heading)) {
      role = "步骤 / 证明";
      viewerQuestion = "它具体怎么做、如何证明？";
    }
    return {
      index: index + 1,
      role,
      viewerQuestion,
      start: section.start,
      end: section.end,
      heading: section.heading,
      function: section.body,
      visualEvidence: section.evidence
    };
  });
  const report = {
    ...source,
    ...note,
    publishedLabel: formatPublished(source.publishedAt),
    media: {
      durationSeconds: round(duration),
      width: stream.width,
      height: stream.height,
      codec: stream.codec_name,
      bytes: Number(media.format.size)
    },
    editing: {
      detectedSceneCuts: sceneCuts,
      cutsPerMinute: round(sceneCuts.length / (duration / 60), 1)
    },
    contentArchitecture: {
      pattern: architecture.map((item) => item.role).join(" → "),
      stageCount: architecture.length,
      hook: architecture[0],
      payoff: architecture.at(-1),
      proofChain: architecture.slice(1).map((item) => item.visualEvidence),
      stages: architecture
    },
    knowledgeExtraction: {
      status: knowledgeItems.length ? "visual_verified" : "needs_visual_review",
      captureMode: note.knowledgeMap?.captureMode || "字幕＋章节摘要；尚未完成逐帧视觉知识核验",
      channels: knowledgeItems.length
        ? ["官方字幕", "逐帧画面文字", "工具标识帧", "结果证明帧"]
        : ["字幕", "章节摘要"],
      spokenClaims: cues.length,
      mappedKnowledgeUnits: knowledgeItems.length,
      coveragePercent: knowledgeItems.length ? round(Math.min(1, knowledgeItems.length / Math.max(1, cues.length)) * 100, 0) : null,
      items: knowledgeItems.map((item, index) => ({
        ...item,
        identityFrame: `frames-knowledge/item-${String(index + 1).padStart(2, "0")}-identity.jpg`,
        resultFrame: `frames-knowledge/item-${String(index + 1).padStart(2, "0")}-result.jpg`
      })),
      unresolved: note.knowledgeMap?.gaps || ["画面文字和非口播知识尚未逐帧核验，当前页面不能声称捕捉了全部关键内容"]
    },
    transcript: {
      origin: source.subtitleOrigin,
      cueCount: cues.length,
      totalCharacters: transcriptChars,
      charactersPerMinute: round(transcriptChars / (duration / 60), 1),
      fullText: cues.map((cue) => cue.text).join(" "),
      cues: cues.map((cue, index) => ({...cue, frame: `frames-transcript/cue-${String(index + 1).padStart(3, "0")}.jpg`}))
    },
    frames: {
      sparse: sparseTimes.map((time, index) => ({time, src: `frames-sparse/frame-${String(index + 1).padStart(3, "0")}.jpg`})),
      dense: denseTimes.map((time, index) => ({time, src: `frames-dense/frame-${String(index + 1).padStart(3, "0")}.jpg`})),
      sparseSheet: "sparse-sheet.jpg",
      denseSheet: "dense-sheet.jpg"
    },
    reportUrl: `reports/${id}/report.html`
  };

  writeFileSync(join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  const sectionHtml = note.sections.map((section, index) => `
    <article class="article-section">
      <figure><img src="frames-key/section-${String(index + 1).padStart(2, "0")}.jpg" alt="${escapeHtml(section.heading)}的关键画面"><figcaption>${formatTime(section.keyFrameAt)} · ${escapeHtml(section.evidence)}</figcaption></figure>
      <div><span class="timecode">${formatTime(section.start)}–${formatTime(section.end)}</span><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.body)}</p></div>
    </article>`).join("");

  const architectureHtml = report.contentArchitecture.stages.map((stage) => `
    <article class="architecture-stage">
      <div class="architecture-stage-head"><span>${String(stage.index).padStart(2, "0")}</span><b>${escapeHtml(stage.role)}</b><time>${formatTime(stage.start)}–${formatTime(stage.end)}</time></div>
      <h3>${escapeHtml(stage.heading)}</h3>
      <p>${escapeHtml(stage.function)}</p>
      <footer><span>观众问题</span><b>${escapeHtml(stage.viewerQuestion)}</b><span>画面证据</span><b>${escapeHtml(stage.visualEvidence)}</b></footer>
    </article>`).join("");

  const sparseHtml = report.frames.sparse.map((frame) => `<figure><img loading="lazy" src="${frame.src}" alt="${formatTime(frame.time)} 稀疏帧"><figcaption>${formatTime(frame.time)}</figcaption></figure>`).join("");
  const denseHtml = report.frames.dense.map((frame) => `<figure><img loading="lazy" src="${frame.src}" alt="${formatTime(frame.time)} 密集帧"><figcaption>${formatTime(frame.time)}</figcaption></figure>`).join("");
  const cueHtml = report.transcript.cues.map((cue) => `<article class="cue"><img loading="lazy" src="${cue.frame}" alt="${escapeHtml(cue.id)} 对应画面"><div><span class="timecode">${formatTime(cue.start)}–${formatTime(cue.end)}</span><p>${escapeHtml(cue.text)}</p></div></article>`).join("");
  const knowledgeCardsHtml = report.knowledgeExtraction.items.map((item, index) => `
    <article class="knowledge-card">
      <header><span class="knowledge-index">${String(index + 1).padStart(2, "0")}</span><div><span class="knowledge-kind">${escapeHtml(item.kind)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.capability)}</p></div></header>
      <div class="knowledge-evidence"><figure><img loading="lazy" src="${item.identityFrame}" alt="${escapeHtml(item.name)} 工具标识画面"><figcaption>${formatTime(item.identityAt)} · 工具名称／来源</figcaption></figure><figure><img loading="lazy" src="${item.resultFrame}" alt="${escapeHtml(item.name)} 结果证明画面"><figcaption>${formatTime(item.resultAt)} · 结果证明</figcaption></figure></div>
      <dl><div><dt>什么时候用</dt><dd>${escapeHtml(item.useWhen)}</dd></div><div><dt>画面直接证据</dt><dd>${escapeHtml(item.screenText)}；${escapeHtml(item.resultEvidence)}</dd></div><div class="knowledge-limit"><dt>视频没有证明</dt><dd>${escapeHtml(item.notProven)}</dd></div></dl>
    </article>`).join("");
  const knowledgeSectionHtml = report.knowledgeExtraction.items.length ? `
  <section class="knowledge-section"><div class="section-head"><span class="eyebrow">KNOWLEDGE MAP · VISUAL VERIFIED</span><h2>先给答案：${report.knowledgeExtraction.items.length} 个 AI 分别能完成什么</h2><p>不是仅靠字幕猜测。每个答案都同时对齐工具标识、口播用途与结果画面；“视频没有证明”的内容单独列出。</p></div>
    <div class="capture-audit is-verified"><div><b>关键内容捕捉完整性</b><span>${escapeHtml(report.knowledgeExtraction.captureMode)}</span></div><strong>${report.knowledgeExtraction.coveragePercent}%</strong></div>
    <div class="knowledge-quick-map">${report.knowledgeExtraction.items.map((item) => `<span><b>${escapeHtml(item.name)}</b><i>→</i>${escapeHtml(item.capability)}</span>`).join("")}</div>
    <div class="knowledge-grid">${knowledgeCardsHtml}</div>
    <aside class="knowledge-gaps"><b>这条视频仍未回答</b><ul>${report.knowledgeExtraction.unresolved.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></aside>
  </section>` : `
  <section class="capture-audit-section"><div class="capture-audit is-warning"><div><b>关键内容捕捉尚未通过</b><span>${escapeHtml(report.knowledgeExtraction.unresolved[0])}</span></div><strong>待核验</strong></div></section>`;

  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(source.title)}｜视频转文章</title><link rel="stylesheet" href="../../article.css?v=3"></head>
<body><header class="article-hero"><a href="../../index.html">← 返回视频文章库</a><span class="tag tier-${source.tier}">${tierLabel(source.tier)}</span><h1>${escapeHtml(source.title)}</h1><p>${escapeHtml(note.coreClaim)}</p><div class="meta"><span>${escapeHtml(note.primaryCategory)}</span><span>${escapeHtml(report.publishedLabel)}</span><span>${round(duration, 1)} 秒</span><span>${source.engagement.likes.toLocaleString("zh-CN")} 赞</span></div></header>
<main>
  <section class="decision-card"><div><span class="eyebrow">这条视频要传递什么</span><h2>${escapeHtml(note.contentIntent)}</h2><p>${escapeHtml(note.articleLead)}</p></div><div><span class="eyebrow">核心观点</span><p class="thesis">${escapeHtml(note.coreClaim)}</p><ul>${note.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></div></section>
  ${knowledgeSectionHtml}
  <section class="architecture-section"><div class="section-head"><span class="eyebrow">CONTENT ARCHITECTURE</span><h2>内容架构：它怎样让观众继续看</h2><p>不是复述内容，而是标出每一段承担的叙事任务、观众问题和画面证据。</p></div><div class="architecture-pattern"><span>结构链</span><strong>${escapeHtml(report.contentArchitecture.pattern)}</strong></div><div class="architecture-grid">${architectureHtml}</div></section>
  <section><div class="section-head"><span class="eyebrow">VIDEO → ARTICLE</span><h2>把视频完整读成一篇文章</h2><p>下列章节覆盖视频的主要论点、步骤与结果；每段都保留时间码和关键画面。</p></div>${sectionHtml}</section>
  <section><div class="section-head"><span class="eyebrow">SPARSE VIEW</span><h2>稀疏帧：8 张看懂整条故事线</h2></div><div class="frame-grid sparse">${sparseHtml}</div></section>
  <section><div class="section-head"><span class="eyebrow">DENSE VIEW</span><h2>密集帧：不漏掉视觉转折和证明</h2><p>短视频每 1 秒、常规视频每 2 秒、超长视频每 3 秒取一帧。</p></div><details><summary>展开 ${report.frames.dense.length} 张密集帧</summary><div class="frame-grid dense">${denseHtml}</div></details></section>
  <section><div class="section-head"><span class="eyebrow">FULL TRANSCRIPT</span><h2>完整文字稿与逐句画面</h2><p>${escapeHtml(source.subtitleOrigin)} · ${cues.length} 段 · ${transcriptChars} 字。字幕只记录声音；工具名、界面文字和结果含义必须结合上方视觉知识地图复核。</p></div><div class="transcript">${cueHtml}</div></section>
  <section class="boundary"><span class="eyebrow">证据边界</span><p>${escapeHtml(note.boundary)}</p><a href="${escapeHtml(source.sourceUrl)}" target="_blank" rel="noreferrer">打开小红书原帖 ↗</a></section>
</main></body></html>`;
  writeFileSync(join(reportDir, "report.html"), html);
  reportItems.push(report);
  process.stdout.write(`built article ${id}: sparse ${sparseTimes.length}, dense ${denseTimes.length}, cues ${cues.length}\n`);
}

const library = {
  schemaVersion: "video-to-article-library-2.0",
  generatedAt: new Date().toISOString(),
  creator: high.creator,
  taxonomy: editorial.taxonomy,
  videos: reportItems
};
writeFileSync(join(outRoot, "library.json"), `${JSON.stringify(library, null, 2)}\n`);

const cards = reportItems.map((item) => `<a class="library-card" href="${item.reportUrl}"><span class="tag tier-${item.tier}">${tierLabel(item.tier, true)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.coreClaim)}</p><div><span>${escapeHtml(item.primaryCategory)}</span><span>${item.engagement.likes.toLocaleString("zh-CN")} 赞</span><span>${escapeHtml(item.publishedLabel)}</span><span>${item.contentArchitecture.stageCount} 段架构</span></div></a>`).join("");
const indexHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI红发魔女｜视频文章库</title><link rel="stylesheet" href="article.css?v=3"></head><body><header class="article-hero"><a href="../selected-high-like/report.html?v=9">← 返回分析工作台</a><span class="tag">${reportItems.length} VIDEOS</span><h1>视频文章库</h1><p>高、中、低三档样本；每条视频都有内容架构、完整文字稿、关键章节、稀疏帧、密集帧与内容分类。</p></header><main><section class="library-grid">${cards}</section></main></body></html>`;
writeFileSync(join(outRoot, "index.html"), indexHtml);
process.stdout.write(`wrote ${reportItems.length} video articles -> ${outRoot}\n`);
