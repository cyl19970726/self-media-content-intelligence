const loadJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} 加载失败：${response.status}`);
  return response.json();
};

const [analysis, strategy, library, overview, focus] = await Promise.all([
  loadJson("analysis.json"),
  loadJson("strategy.json"),
  loadJson("../video-library/library.json"),
  loadJson("../video-library/creator-overview.json?v=13"),
  loadJson("focus-reconstruction.json")
]);

const analysisById = new Map(analysis.videos.map((video) => [video.id, video]));
const libraryById = new Map(library.videos.map((video) => [video.id, video]));
const focusById = new Map(focus.videos.map((video) => [video.id, video]));
let selectedId = focus.videos[0].id;
let frameMode = "sparse";
let knowledgeExpanded = false;
let taxonomyView = "list";

const formatCount = (value) => {
  if (value >= 10000) return `${(value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)}万`;
  return new Intl.NumberFormat("zh-CN").format(value);
};

const tierLabels = { high: "高表现", median: "中位表现", low: "低表现" };
const provenanceLabels = {
  raw_fact: "原始事实",
  visual_observation: "画面观察",
  author_claim: "作者主张",
  system_inference: "系统推断",
  unknown: "未知"
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remain = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remain.toFixed(1).padStart(4, "0")}`;
};

const shortTitle = (title, length = 16) => title.length > length ? `${title.slice(0, length)}…` : title;
const articleHref = (video) => `../video-library/${video.reportUrl}`;
const articleCover = (video) => `../video-library/reports/${video.id}/${video.frames.sparse[0].src}`;
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

document.querySelector("#analysisContract").innerHTML = overview.analysisContract.map((item, index) => `
  <article><span>0${index + 1}</span><div><b>${item.label}</b><p>${item.answer}</p></div></article>
`).join("");
document.querySelector("#positioningName").textContent = overview.creator.positioning;
document.querySelector("#positioningSentence").textContent = overview.creator.positioningSentence;
document.querySelector("#positionFacts").innerHTML = [
  ["服务谁", overview.creator.audience],
  ["承诺什么", overview.creator.promise],
  ["如何可信", overview.creator.credibility],
  ["如何经营", overview.creator.businessRole]
].map(([label, value]) => `<article><b>${label}</b><p>${value}</p></article>`).join("");

const stats = overview.publicCorpus.videoLikeStats;
document.querySelector("#metricStrip").innerHTML = [
  ["公开视频", overview.publicCorpus.videos, "完整主页样本"],
  ["点赞中位数", stats.median, "更接近稳定基线"],
  ["点赞均值", formatCount(stats.mean), "被头部样本抬高"],
  ["≥1万赞", `${stats.gte10000} 条`, "只占视频约 4%"],
  ["P90", formatCount(stats.p90), "前 10% 门槛"],
  ["最高", formatCount(stats.max), "Word / DeepSeek" ]
].map(([label, value, note]) => `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");

document.querySelector("#distribution").innerHTML = overview.publicCorpus.distribution.map((bucket) => `
  <div class="distribution-row">
    <span>${bucket.label}</span>
    <div class="distribution-track"><i style="width:${bucket.share}%"></i></div>
    <b>${bucket.count} 条</b><small>${bucket.share}%</small>
  </div>
`).join("");

document.querySelector("#topHits").innerHTML = overview.publicCorpus.topHits.map((item, index) => `
  <article><span>${String(index + 1).padStart(2, "0")}</span><div><b>${item.title}</b><small>${item.published}</small></div><strong>${formatCount(item.likes)}</strong></article>
`).join("");

document.querySelector("#contentSystem").innerHTML = overview.contentSystem.map((item, index) => `
  <article>
    <span class="system-index">${String(index + 1).padStart(2, "0")}</span>
    <div><small>${item.role}</small><h3>${item.name}</h3><p>${item.promise}</p></div>
    <div class="system-decision"><b>${item.decision}</b><small>${item.examples}</small></div>
  </article>
`).join("");

const renderClusters = (items) => items.map((item) => `
  <div class="cluster-row">
    <div><b>${item.name}</b><small>${item.count} 条 · ≥1万 ${item.hits10k} 条</small></div>
    <span><small>中位</small><b>${formatCount(item.medianLikes)}</b></span>
    <span><small>均值</small><b>${formatCount(item.meanLikes)}</b></span>
    <span><small>最高</small><b>${formatCount(item.maxLikes)}</b></span>
  </div>
`).join("");
document.querySelector("#topicClusters").innerHTML = renderClusters(overview.titleHeuristics.topics);
document.querySelector("#formClusters").innerHTML = renderClusters(overview.titleHeuristics.forms);
document.querySelector("#heuristicCaveat").textContent = overview.titleHeuristics.caveat;

document.querySelector("#viralFormula").innerHTML = overview.viralMechanism.formula.split(" × ").map((factor) => `<span>${factor}</span>`).join("<b>×</b>");
document.querySelector("#viralDrivers").innerHTML = overview.viralMechanism.drivers.map((item) => `<li>${item}</li>`).join("");
document.querySelector("#failurePatterns").innerHTML = overview.viralMechanism.failurePatterns.map((item) => `<li>${item}</li>`).join("");

document.querySelector("#engineGrid").innerHTML = strategy.engines.map((engine) => `
  <article class="engine-card"><span class="eyebrow">${engine.id}</span><h3>${engine.name}</h3><span class="signal">${engine.signal}</span><p>${engine.mechanism}</p><div class="decision">${engine.decision}</div></article>
`).join("");

const scatter = document.querySelector("#scatterPlot");
analysis.videos.forEach((video, index) => {
  const x = Math.min(92, 8 + (video.engagement.shareToLike / .7) * 84);
  const y = Math.min(92, 8 + (video.engagement.collectionToLike / 1.65) * 84);
  const button = document.createElement("button");
  button.className = "scatter-point";
  button.style.left = `${x}%`;
  button.style.bottom = `${y}%`;
  button.setAttribute("aria-label", `${video.title}，收藏点赞比${video.engagement.collectionToLike}，分享点赞比${video.engagement.shareToLike}`);
  button.innerHTML = `${index + 1}<span class="tip">${video.title}<br>收藏/赞 ${video.engagement.collectionToLike} · 分享/赞 ${video.engagement.shareToLike}</span>`;
  if (focusById.has(video.id)) {
    button.addEventListener("click", () => selectVideo(video.id, true));
  } else {
    button.disabled = true;
    button.classList.add("not-in-focus");
  }
  scatter.appendChild(button);
});

const comparison = overview.threeTierComparison;
const tiers = comparison.tiers;
document.querySelector("#comparisonSummary").innerHTML = [
  ["点赞中位", formatCount(tiers.high.medianLikes), formatCount(tiers.median.medianLikes), formatCount(tiers.low.medianLikes)],
  ["视频时长", `${tiers.high.medianDuration.toFixed(1)}秒`, `${tiers.median.medianDuration.toFixed(1)}秒`, `${tiers.low.medianDuration.toFixed(1)}秒`],
  ["切换 / 分钟", tiers.high.medianCutsPerMinute, tiers.median.medianCutsPerMinute, tiers.low.medianCutsPerMinute],
  ["收藏 / 点赞", tiers.high.medianCollectionToLike, tiers.median.medianCollectionToLike, tiers.low.medianCollectionToLike],
  ["架构段数", tiers.high.medianStages, tiers.median.medianStages, tiers.low.medianStages]
].map(([label, high, median, low]) => `<article><span>${label}</span><div><b class="high">高 ${high}</b><b class="median">中 ${median}</b><b class="low">低 ${low}</b></div></article>`).join("");

document.querySelector("#comparisonFindings").innerHTML = comparison.findings.map((item) => `
  <article><h3>${item.name}</h3><div><span>高表现</span><p>${item.high}</p></div><div><span>中位表现</span><p>${item.median}</p></div><div><span>低表现</span><p>${item.low}</p></div><strong>${item.decision}</strong></article>
`).join("");
document.querySelector("#comparisonConfound").textContent = `关键混杂：${comparison.confound}`;

document.querySelector("#taxonomyPatternSummary").innerHTML = ["high", "median", "low"].map((tier) => {
  const group = focus.taxonomy[tier];
  return `<article class="pattern-summary-card pattern-${tier}">
    <header><span class="tier-tag ${tier}">${tierLabels[tier]}</span><b>${group.types.length} 种形态</b></header>
    <p>${escapeHtml(group.conclusion)}</p>
    <ol>${group.types.map((type) => `<li><span>${type.id}</span><div><b>${escapeHtml(type.name)}</b><small>${escapeHtml(type.diagnosis)}</small></div></li>`).join("")}</ol>
  </article>`;
}).join("");

const tierOrder = { high: 0, median: 1, low: 2 };
const comparisonRows = [...library.videos]
  .sort((a, b) => (a.tier === b.tier ? b.engagement.likes - a.engagement.likes : tierOrder[a.tier] - tierOrder[b.tier]))
  .map((video) => `
    <tr>
      <td><span class="tier-tag ${video.tier}">${tierLabels[video.tier]}</span></td>
      <td class="title-cell">${video.title}</td>
      <td>${video.primaryCategory}</td>
      <td>${video.publishedLabel}</td>
      <td>${Math.round(video.duration)}秒</td>
      <td class="metric-strong">${formatCount(video.engagement.likes)}</td>
      <td>${video.engagement.collectionToLike}</td>
      <td>${video.editing.cutsPerMinute}</td>
      <td><a class="row-action" href="${articleHref(video)}">读文章 ↗</a></td>
    </tr>
  `).join("");

const renderTaxonomy = () => {
  const board = document.querySelector("#taxonomyBoard");
  if (taxonomyView === "list") {
    board.className = "taxonomy-board taxonomy-list-view";
    board.innerHTML = `<div class="table-wrap comparison-table-wrap"><table><thead><tr><th>层级</th><th>视频</th><th>分类</th><th>发布时间</th><th>时长</th><th>点赞</th><th>收藏/赞</th><th>切换/分钟</th><th>完整报告</th></tr></thead><tbody>${comparisonRows}</tbody></table></div>`;
  } else {
    board.className = "taxonomy-board taxonomy-card-view";
    board.innerHTML = ["high", "median", "low"].map((tier) => {
      const group = focus.taxonomy[tier];
      return `<section class="taxonomy-card-tier"><header><span class="tier-tag ${tier}">${tierLabels[tier]}</span><h3>${group.types.length} 类 · ${group.types.reduce((sum, type) => sum + type.videos.length, 0)} 条</h3><p>${escapeHtml(group.conclusion)}</p></header><div class="article-grid taxonomy-gallery-grid">${group.types.flatMap((type) => type.videos.map((video) => `
        <article class="article-card taxonomy-gallery-card ${video.selected ? "selected" : ""}">
          <div class="taxonomy-cover"><img src="${video.cover}" loading="lazy" alt="${escapeHtml(video.title)}的真实画面" />${video.selected ? `<span>证据级还原</span>` : ""}</div>
          <div>
            <div class="article-card-meta"><span class="tier-tag ${tier}">${tierLabels[tier]}</span><small>${type.id} · ${escapeHtml(type.name)}</small></div>
            <h3>${escapeHtml(video.title)}</h3>
            <p>${escapeHtml(video.coreClaim)}</p>
            <div class="gallery-analysis"><b>本条分析</b><p>${escapeHtml(video.analysis)}</p></div>
            <small class="selection-note">不能误判：${escapeHtml(video.boundary)}</small>
            <footer><b>${formatCount(video.likes)} 赞</b><span>${escapeHtml(video.publishedLabel)} · ${Math.round(video.duration)}秒</span></footer>
            <div class="article-actions">${video.selected ? `<button class="taxonomy-focus-button" data-video-id="${video.id}">进入证据工作台</button>` : ""}<a href="${video.reportUrl}">读视频文章 ↗</a></div>
          </div>
        </article>
      `)).join("")}</div></section>`;
    }).join("");
    document.querySelectorAll(".taxonomy-focus-button").forEach((button) => button.addEventListener("click", () => selectVideo(button.dataset.videoId, true)));
  }
};
renderTaxonomy();
document.querySelectorAll(".taxonomy-view-button").forEach((button) => button.addEventListener("click", () => {
  taxonomyView = button.dataset.view;
  document.querySelectorAll(".taxonomy-view-button").forEach((item) => item.classList.toggle("active", item === button));
  renderTaxonomy();
}));

document.querySelector("#timingConclusion").textContent = overview.publishing.conclusion;
const renderBars = (items) => {
  const maxMedian = Math.max(...items.map((item) => item.medianLikes));
  return items.map((item) => `
    <div class="bar-row">
      <span>${item.name}</span>
      <div class="bar-track"><i style="width:${Math.max(5, item.medianLikes / maxMedian * 100)}%"></i></div>
      <b>${formatCount(item.medianLikes)}</b>
      <small>${item.count} 条 · 万赞 ${item.hits10k}</small>
    </div>
  `).join("");
};
document.querySelector("#weekdayBars").innerHTML = renderBars(overview.publishing.weekdays);
document.querySelector("#daypartBars").innerHTML = renderBars(overview.publishing.dayparts);

const languageLabels = {
  orientation: "画幅",
  composition: "构图",
  visualIdentity: "识别系统",
  proofGrammar: "证明语法",
  evolution: "形式演化"
};
document.querySelector("#languageGrid").innerHTML = Object.entries(overview.videoLanguage).map(([key, value]) => `<article><span>${languageLabels[key]}</span><p>${value}</p></article>`).join("");
document.querySelector("#systemFlow").innerHTML = strategy.repeatableSystem.map((item) => `
  <article class="system-step"><span class="step-no">${item.step}</span><h3>${item.name}</h3><p>${item.rule}</p><small>${item.evidence}</small></article>
`).join("");

const select = document.querySelector("#videoSelect");
select.innerHTML = focus.videos.map((video) => `<option value="${video.id}">${tierLabels[video.tier]}｜${escapeHtml(video.title)}</option>`).join("");
select.addEventListener("change", () => selectVideo(select.value));

const findingLabels = { whyItWorked: "为什么有效", hiddenMechanism: "隐藏机制", risk: "不能误判", copy: "我们怎么改造" };

const renderFrames = (video) => {
  const frames = frameMode === "dense" ? video.denseFrames : video.sparseFrames;
  document.querySelector("#frameGallery").innerHTML = frames.map((frame) => `
    <figure><img src="${frame.src}" loading="lazy" alt="${escapeHtml(video.title)} ${formatTime(frame.time)} 的真实画面" /><figcaption><b>${frame.id}</b><time>${formatTime(frame.time)}</time></figcaption></figure>
  `).join("");
};

document.querySelectorAll(".frame-button").forEach((button) => button.addEventListener("click", () => {
  frameMode = button.dataset.mode;
  document.querySelectorAll(".frame-button").forEach((item) => item.classList.toggle("active", item === button));
  renderFrames(focusById.get(selectedId));
}));

const renderKnowledgeUnits = (video) => {
  const units = knowledgeExpanded ? video.coreUnits : video.coreUnits.slice(0, 6);
  document.querySelector("#knowledgeUnits").innerHTML = units.map((unit) => `
    <article><header><span class="provenance-label ${unit.provenance}">${provenanceLabels[unit.provenance] ?? unit.provenance}</span><time>${formatTime(unit.timeRange.start)}–${formatTime(unit.timeRange.end)}</time></header><h4>${escapeHtml(unit.title)}</h4><p>${escapeHtml(unit.statement)}</p>${unit.unknowns.length ? `<small>边界：${escapeHtml(unit.unknowns[0])}</small>` : ""}</article>
  `).join("");
  const toggle = document.querySelector("#knowledgeToggle");
  toggle.hidden = video.coreUnits.length <= 6;
  toggle.textContent = knowledgeExpanded ? "收起到 6 个关键点" : `展开全部 ${video.coreUnits.length} 个知识点`;
};

document.querySelector("#knowledgeToggle").addEventListener("click", () => {
  knowledgeExpanded = !knowledgeExpanded;
  renderKnowledgeUnits(focusById.get(selectedId));
});

function renderVideo(video) {
  const libraryVideo = libraryById.get(video.id);
  const deepVideo = analysisById.get(video.id);
  const finding = strategy.videoFindings[video.id] ?? {
    whyItWorked: video.tier === "low" ? "它提供了可感知的主题或结果，但没有把平台需要的承诺、证据和回报同时闭合。" : "它把一个具体需求压缩成观众能快速识别的结果、流程或判断。",
    hiddenMechanism: video.selectionReason,
    risk: video.unknowns[0] ?? "公开证据不足以判断播放、留存、转粉或商业转化。",
    copy: video.tier === "low" ? "保留题材价值，重做前 3 秒承诺、过程证据和结尾行动。" : "复用它的任务翻译方式，但补齐输入、操作、结果和适用边界。"
  };
  document.querySelector("#videoSummary").innerHTML = `
    <div><span class="eyebrow">${tierLabels[video.tier]} / ${escapeHtml(video.primaryCategory)}</span><h3>${escapeHtml(video.title)}</h3><p>${escapeHtml(video.coreClaim)}</p></div>
    <div><small>收藏 / 点赞</small><span class="big">${video.engagement.collectionToLike}</span></div>
    <div><small>分享 / 点赞</small><span class="big">${video.engagement.shareToLike}</span></div>
    <div><small>字幕密度</small><span class="big">${libraryVideo.transcript.charactersPerMinute}</span><small>字 / 分钟</small></div>
    <div><small>检测切换</small><span class="big">${libraryVideo.editing.cutsPerMinute}</span><small>次 / 分钟</small></div>`;

  document.querySelector("#selectionReason").innerHTML = `<b>${video.typeId} · ${escapeHtml(video.formatType)}</b><p><strong>${escapeHtml(video.mechanism)}</strong>。这是它在 21 条三档分析中的内容位置；下方继续提供证据级还原。</p>`;
  document.querySelector("#gateStatus").textContent = video.gateLabel;
  document.querySelector("#gateStatus").classList.toggle("ready", video.ready);
  document.querySelector("#cognitionShift").innerHTML = `<div><span>观看前</span><p>${escapeHtml(video.viewerChange.before)}</p></div><i aria-hidden="true">→</i><div><span>观看后</span><p>${escapeHtml(video.viewerChange.after)}</p></div>`;
  document.querySelector("#provenanceCounts").innerHTML = Object.entries(provenanceLabels).map(([key, label]) => `<div><span class="provenance-dot ${key}"></span><b>${label}</b><strong>${video.provenanceCounts[key] ?? 0}</strong></div>`).join("");

  const architecture = video.contentArchitecture;
  document.querySelector("#architectureSummary").innerHTML = `<div><span>结构模式</span><b>${escapeHtml(architecture.pattern)}</b></div><div><span>证明链</span><b>${escapeHtml((architecture.proofChain ?? []).join(" → "))}</b></div>`;
  renderKnowledgeUnits(video);
  const reconstructionLink = document.querySelector("#reconstructionReportLink");
  reconstructionLink.href = video.reconstructionReportUrl ?? video.reportUrl;
  reconstructionLink.textContent = video.reconstructionReportUrl ? "打开完整还原稿 ↗" : "打开完整文章 ↗";
  renderFrames(video);

  const contact = document.querySelector("#contactSheet");
  contact.src = deepVideo?.evidence?.contactSheet ?? video.denseSheet;
  contact.alt = `${video.title}的真实接触表`;
  document.querySelector("#sourceLink").href = video.sourceUrl;
  document.querySelector("#findingGrid").innerHTML = Object.entries(finding).map(([key, value]) => `<div class="finding"><b>${findingLabels[key]}</b><p>${value}</p></div>`).join("");
  document.querySelector("#unknownList").innerHTML = video.unknowns.slice(0, 8).map((unknown) => `<li>${escapeHtml(unknown)}</li>`).join("");
  document.querySelector("#cueCount").textContent = `${video.transcript.length} 条 · ${Math.round(video.duration)}秒`;
  document.querySelector("#transcriptTitle").textContent = `${video.transcript.length}条字幕 × 代表帧 × 重叠镜头`;
  document.querySelector("#transcriptList").innerHTML = video.transcript.map((cue) => `
    <article class="cue"><img src="${cue.frame ?? video.sparseFrames[0].src}" loading="lazy" alt="${cue.id} ${formatTime((cue.start + cue.end) / 2)} 的真实画面" /><div><time>${formatTime(cue.start)} → ${formatTime(cue.end)}</time><p>${escapeHtml(cue.text)}</p><small>${cue.overlappingShots.length ? `覆盖镜头：${cue.overlappingShots.join(" · ")}` : "镜头对应未建立"}</small></div></article>
  `).join("");
}

function selectVideo(id, scroll = false) {
  const video = focusById.get(id);
  if (!video) return;
  selectedId = id;
  knowledgeExpanded = false;
  select.value = id;
  renderVideo(video);
  if (scroll) document.querySelector("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelector("#positioning").textContent = strategy.launchPlan.positioning;
document.querySelector("#pillarGrid").innerHTML = strategy.launchPlan.pillars.map((pillar) => `<article class="pillar"><span class="share">${pillar.share}%</span><h3>${pillar.name}</h3><p>${pillar.format}</p></article>`).join("");
document.querySelector("#firstTwelve").innerHTML = strategy.launchPlan.firstTwelve.map((idea) => `<li>${idea}</li>`).join("");
const experiment = strategy.launchPlan.firstExperiment;
document.querySelector("#experiment").innerHTML = `<div class="experiment-facts"><div><b>唯一变量</b><span>${experiment.variable}</span></div><div><b>主指标</b><span>${experiment.primaryMetric}</span></div><div><b>护栏</b><span>${experiment.guardrails}</span></div><div><b>判断窗口</b><span>${experiment.window}</span></div></div><p class="experiment-warning">${experiment.warning}</p>`;
document.querySelector("#evidenceCards").innerHTML = strategy.launchPlan.standardEvidenceCards.map((item) => `<span>${item}</span>`).join("");
document.querySelector("#evidenceBoundary").textContent = strategy.evidenceBoundary;

const navLinks = [...document.querySelectorAll(".rail-nav a")];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const observer = new IntersectionObserver((entries) => {
  entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
    navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-25% 0px -65% 0px" });
sections.forEach((section) => observer.observe(section));

renderVideo(focusById.get(selectedId));
