const VIEWS = [
  { id: "overview", index: "01", label: "摘要" },
  { id: "timeline", index: "02", label: "拉片" },
  { id: "transcript", index: "03", label: "文字稿" },
  { id: "findings", index: "04", label: "结论" },
  { id: "platform", index: "05", label: "平台" },
  { id: "comments", index: "06", label: "评论" },
  { id: "experiment", index: "07", label: "实验" }
];

const OBJECTIVES = {
  authority: {
    label: "内容资产",
    code: "AUTHORITY",
    verdict: "若目标是内容资产，公开互动结构偏收藏；可能反映保存或参考意图，真实复看与搜索长尾未知。",
    note: "当前最强的公开信号是收藏 1,698 高于点赞 1,268，但没有作者／题材基线。",
    next: "补作者与题材基线，并导入 7／30 日搜索来源和复看数据。"
  },
  awareness: {
    label: "认知扩散",
    code: "AWARENESS",
    verdict: "互动规模存在，但没有曝光、覆盖人数和投流信息，不能判断认知扩散效率。",
    note: "分享／点赞为 19.5%，只能作为传播意愿方向信号，不能替代触达。",
    next: "导入曝光、自然／付费来源和发布后分时快照。"
  },
  growth: {
    label: "账号增长",
    code: "GROWTH",
    verdict: "可见评论出现实践问题，但没有主页访问、净增粉和回访，账号增长效果未知。",
    note: "问题型评论不是转粉证据；它只提示用户正在评估是否采用。",
    next: "导入主页访问、净增粉、转粉率，并建立内容到关注的归因窗口。"
  },
  conversion: {
    label: "商业转化",
    code: "CONVERSION",
    verdict: "可见样本出现价格与兼容性问题，但没有点击、私信、留资和成交，商业转化不可判定。",
    note: "3 条价格／付费问题是采用阻力信号，不等于购买意图或成交。",
    next: "设置唯一目标动作并导入链接点击、私信、留资或成交数据。"
  }
};

const SHOT_VISUALS = [
  "教程文档与生成角色", "Flova Agent 接入页", "Flova 对话输入", "浏览器授权弹窗", "Codex 项目命令", "Agent 创建结果",
  "短剧：男主入场", "短剧：职位提问", "短剧：招聘信息特写", "短剧：女方追问", "短剧：群像反应", "短剧：男方回答",
  "短剧：医疗梗回应", "短剧：顶格回答", "短剧：做饭回应", "短剧：红烧肉回应", "短剧：群像推进", "短剧：人物近景", "短剧：人物近景", "短剧：人物近景",
  "Agent 状态与真人讲解", "Skill 文档与真人讲解", "云端记忆痛点插画", "‘没有记忆’口播切换",
  "素材证明：公园短剧", "素材证明：人物互动", "素材证明：退休金纸牌", "素材证明：模型选择说明", "素材证明：低成本模型", "素材证明：低成本模型",
  "素材证明：人物手牌", "素材证明：生成片段", "长期规则文档", "智能画布镜头卡片", "Codex 指令与真人讲解", "Flova 时间线与真人讲解",
  "Skill 规范文档", "项目资产与时间线", "真人总结：想法与判断", "生成输出：猫咪场景", "生成输出：人物画面", "真人 CTA"
];

const state = {
  analysis: null,
  source: null,
  transcript: [],
  transcriptAlignment: null,
  transcriptMode: "both",
  transcriptSearch: "",
  transcriptSegment: "all",
  shots: [],
  activeView: location.hash.replace("#", "") || "overview",
  objective: "authority",
  findingFilter: "all",
  selectedSegmentId: "S01",
  selectedShotId: "SHOT-01",
  videoUrl: null,
  evidenceOpen: false
};

const app = document.querySelector("#app");
const evidencePanel = document.querySelector("#evidencePanel");
const evidenceContent = document.querySelector("#evidenceContent");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const actionDialog = document.querySelector("#actionDialog");
const actionDialogBody = document.querySelector("#actionDialogBody");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(seconds, precise = false) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  const shown = precise ? rest.toFixed(3).padStart(6, "0") : String(Math.floor(rest)).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${shown}`;
}

function parseSrt(text) {
  return text.trim().split(/\n\s*\n/).map((block) => {
    const lines = block.trim().split("\n");
    const timing = lines[1]?.match(/(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/);
    if (!timing) return null;
    const toSeconds = (h, m, s, ms) => Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
    return {
      id: lines[0],
      start: toSeconds(timing[1], timing[2], timing[3], timing[4]),
      end: toSeconds(timing[5], timing[6], timing[7], timing[8]),
      text: lines.slice(2).join(" ")
    };
  }).filter(Boolean);
}

function cuesBetween(start, end) {
  return state.transcript.filter((cue) => cue.end > start && cue.start < end);
}

function segmentAt(seconds) {
  return state.analysis.narrativeSegments.find((segment) => seconds >= segment.start && seconds < segment.end)
    || state.analysis.narrativeSegments.at(-1);
}

function buildShots() {
  const boundaries = [0, ...state.analysis.mediaFacts.sceneCuts, state.analysis.mediaFacts.durationSeconds];
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const id = `SHOT-${String(index + 1).padStart(2, "0")}`;
    const midpoint = (start + end) / 2;
    const inBurstOne = start >= 23.133 && start < 34.267;
    const inBurstTwo = start >= 55.433 && start < 64.2;
    let visualFamily = "讲解／工作流";
    let evidenceRole = "解释上下文";
    if (index >= 6 && index <= 19) { visualFamily = "生成短剧"; evidenceRole = "输出证明"; }
    if (index >= 24 && index <= 31) { visualFamily = "生成素材"; evidenceRole = "模型／规则证明"; }
    if (index <= 5) { visualFamily = "屏幕操作"; evidenceRole = "接入与操作证明"; }
    if (index >= 38) { visualFamily = index >= 39 && index <= 40 ? "生成输出" : "真人收束"; evidenceRole = "定位与 CTA"; }
    return {
      id,
      index: index + 1,
      start,
      end,
      midpoint,
      duration: end - start,
      label: SHOT_VISUALS[index] || `候选镜头 ${index + 1}`,
      visualFamily,
      evidenceRole,
      load: (inBurstOne || inBurstTwo) ? "高：画面切换与字幕同时推进" : (end - start > 7 ? "低：长解释跨度" : "中"),
      burst: inBurstOne || inBurstTwo,
      segmentId: segmentAt(midpoint).id,
      frame: `shot-frames/shot-${String(index + 1).padStart(2, "0")}.jpg`
    };
  });
}

function renderNavigation() {
  document.querySelector("#railNav").innerHTML = VIEWS.map((view) => `
    <button type="button" data-view="${view.id}" aria-current="${state.activeView === view.id ? "page" : "false"}">
      <span>${view.index}</span>${view.label}
    </button>`).join("");
  const select = document.querySelector("#mobileViewSelect");
  select.innerHTML = VIEWS.map((view) => `<option value="${view.id}" ${state.activeView === view.id ? "selected" : ""}>${view.index} ${view.label}</option>`).join("");
}

function projectHeader(subtitle = "这条内容为什么形成当前公开互动结构，证据在哪里？") {
  const project = state.analysis.project;
  return `<header class="project-head">
    <div>
      <div class="breadcrumbs mono">RESEARCH PROJECT / ${escapeHtml(project.id)}</div>
      <h1>${escapeHtml(project.researchQuestion)}</h1>
      <p>${escapeHtml(subtitle)}</p>
    </div>
    <div class="project-status">
      <span class="status-tag blocked">需要后台数据</span>
      <small>快照年龄 ${project.contentAgeHours} 小时<br />观察于 2026-08-15 16:26</small>
    </div>
  </header>`;
}

function objectiveMarkup() {
  const profile = OBJECTIVES[state.objective];
  return `<section class="objective-bar" aria-label="运营目标与判断">
    <div class="objective-copy">
      <small id="objectiveCode">OBJECTIVE / ${profile.code}</small>
      <h2 id="objectiveTitle">${escapeHtml(profile.verdict)}</h2>
      <p id="objectiveNote">${escapeHtml(profile.note)}</p>
    </div>
    <div class="objective-selector" aria-label="切换运营目标">
      ${Object.entries(OBJECTIVES).map(([id, item]) => `<button type="button" data-objective="${id}" aria-pressed="${state.objective === id}"><small>${item.code}</small>${item.label}</button>`).join("")}
    </div>
  </section>`;
}

function boundaryMarkup() {
  const p = state.analysis.project;
  return `<section class="boundary-strip" aria-label="样本与数据边界">
    <div class="boundary-item"><label>样本角色</label><strong>单条目标帖</strong></div>
    <div class="boundary-item"><label>作者／题材基线</label><strong class="unknown">均缺失</strong></div>
    <div class="boundary-item"><label>公开证据</label><strong>视频 + SRT + 10 条评论</strong></div>
    <div class="boundary-item"><label>后台数据</label><strong class="unknown">曝光／留存／转粉未知</strong></div>
  </section>`;
}

function metricMarkup() {
  const metrics = state.source.metrics;
  return `<section class="metric-strip" aria-label="公开指标快照">
    <button class="metric-button" type="button" data-metric="bookmarks"><label>收藏</label><strong class="mono">${metrics.bookmarks.toLocaleString()}</strong><span>公开快照</span></button>
    <button class="metric-button" type="button" data-metric="likes"><label>点赞</label><strong class="mono">${metrics.likes.toLocaleString()}</strong><span>公开快照</span></button>
    <button class="metric-button signal" type="button" data-metric="bookmarkLike"><label>收藏／点赞</label><strong class="mono">133.9%</strong><span>保存意图代理，不是复看率</span></button>
    <button class="metric-button unknown" type="button" data-metric="owner"><label>曝光／转粉</label><strong>未知</strong><span>当前不能闭环</span></button>
  </section>`;
}

function overviewView() {
  return `<section class="project-view" id="view-overview" data-project-view="overview">
    ${projectHeader("先按运营目标判断好坏；当前默认目标是内容资产／专业权威。")}
    ${objectiveMarkup()}
    ${boundaryMarkup()}
    ${metricMarkup()}
    <section class="action-row" aria-label="研究行动">
      <button type="button" data-action="topic"><div><strong>加入专题</strong><small>复用为 ProjectSample</small></div><span>↗</span></button>
      <button type="button" data-action="creator"><div><strong>分析对应博主</strong><small>创建独立博主项目</small></div><span>↗</span></button>
      <a href="content-model-draft.json"><div><strong>内容模型草稿</strong><small>解释放缓—证明爆发</small></div><span>↓</span></a>
      <a href="next-brief.md"><div><strong>下一条 Brief</strong><small>单变量实验版本</small></div><span>↓</span></a>
    </section>
    <section class="section-block">
      <header class="section-title"><div><span>CONTENT X-RAY</span><h2>内容结构一眼看清</h2></div><p>点击任一判断进入证据检查器；详细时间码在“拉片”章节。</p></header>
      <div class="studio-grid">
        <div class="video-column">
          <button type="button" class="video-frame" data-view="timeline" aria-label="打开真实拉片">
            <img src="keyframes/frame-000.5.jpg" alt="视频第一帧：上方屏幕录制、下方真人讲解" />
          </button>
          <p class="video-status"><strong>111.25 秒真实视频</strong><br />进入拉片查看双层时间轴与官方字幕。</p>
        </div>
        <div class="xray">
          <article><small>AUDIENCE JOB</small><strong>把 AI 视频从一次生成变成可持续工作流</strong><p>受众限定到“用过云端 AI 视频的人”出现在 52 秒后，资格筛选偏晚。</p></article>
          <article><small>PROMISE</small><strong>一句话跑脚本、分镜、生成与剪辑</strong><p>高承诺在 23 秒内被真实界面和第一段成片兑现。</p></article>
          <article><small>DIFFERENTIATION</small><strong>本地 Skill + 长期规则记忆</strong><p>这是区别于普通工具教程的核心，却到约 44 秒才出现。</p></article>
          <article><small>VISUAL GRAMMAR</small><strong>上方证据，下方真人锚点</strong><p>两次快速证明窗口夹在较慢解释段之间，形成 burst pacing。</p></article>
          <article><small>PUBLIC RESPONSE</small><strong>收藏结构强，真实复看未知</strong><p>收藏高于点赞；没有搜索来源、作者基线和 7／30 日长尾。</p></article>
          <article><small>CTA GAP</small><strong>没有解决采用阻力</strong><p>可见评论持续询问价格、兼容性、能力边界和后续教程。</p></article>
        </div>
      </div>
    </section>
  </section>`;
}

function functionTrackMarkup() {
  const duration = state.analysis.mediaFacts.durationSeconds;
  return `<div class="function-track" aria-label="八个叙事功能段">
    ${state.analysis.narrativeSegments.map((segment) => `<button type="button" data-segment="${segment.id}" data-seek="${segment.start}" aria-pressed="${state.selectedSegmentId === segment.id}" style="flex:${segment.end - segment.start} 1 0" title="${escapeHtml(segment.title)}">
      <small>${segment.id} ${formatTime(segment.start)}–${formatTime(segment.end)}</small><span>${escapeHtml(segment.title)}</span>
    </button>`).join("")}
  </div>`;
}

function cutRulerMarkup() {
  const duration = state.analysis.mediaFacts.durationSeconds;
  return `<div class="cut-ruler" aria-label="41 个候选切点">
    ${state.analysis.mediaFacts.sceneCuts.map((cut, index) => {
      const burst = (cut >= 23.133 && cut <= 34.267) || (cut >= 55.433 && cut <= 64.2);
      return `<button type="button" data-shot="SHOT-${String(index + 2).padStart(2, "0")}" class="${burst ? "burst" : ""}" style="left:${(cut / duration) * 100}%" aria-label="候选切点 ${index + 1}，${formatTime(cut, true)}" title="${formatTime(cut, true)}"></button>`;
    }).join("")}
  </div>`;
}

function selectedSegmentMarkup() {
  const segment = state.analysis.narrativeSegments.find((item) => item.id === state.selectedSegmentId) || state.analysis.narrativeSegments[0];
  return `<div class="timeline-detail" id="timelineDetail">
    <img src="${segment.frame}" alt="${escapeHtml(segment.title)}代表帧" data-zoom="${segment.frame}" />
    <div><small>${segment.id} / ${escapeHtml(segment.role)} / ${formatTime(segment.start, true)}–${formatTime(segment.end, true)}</small>
      <h3>${escapeHtml(segment.title)}</h3>
      <p>${escapeHtml(segment.visual)}</p>
      <p><strong>判断：</strong>${escapeHtml(segment.assessment)}</p>
      <button type="button" class="time-button mono" data-seek="${segment.start}" data-segment="${segment.id}">跳到 ${formatTime(segment.start, true)}</button>
    </div>
  </div>`;
}

function textUnits(text) {
  const chinese = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || []).length;
  return chinese + latin;
}

function segmentDiagnosticsMarkup() {
  const duration = state.analysis.mediaFacts.durationSeconds;
  const stats = state.analysis.narrativeSegments.map((segment) => {
    const seconds = segment.end - segment.start;
    const cuts = state.analysis.mediaFacts.sceneCuts.filter((cut) => cut > segment.start && cut < segment.end).length;
    const units = textUnits(cuesBetween(segment.start, segment.end).map((cue) => cue.text).join(" "));
    const cutRate = cuts / seconds * 60;
    const textRate = units / seconds * 60;
    return { ...segment, seconds, cuts, units, cutRate, textRate, share: seconds / duration * 100 };
  });
  const burstWindows = state.analysis.shotModel.burstWindows;
  const burstSeconds = burstWindows.reduce((sum, window) => sum + window.end - window.start, 0);
  const burstCuts = state.analysis.mediaFacts.sceneCuts.filter((cut) => burstWindows.some((window) => cut > window.start && cut < window.end)).length;
  const restCuts = state.analysis.mediaFacts.sceneCuts.length - burstCuts;
  const restSeconds = duration - burstSeconds;
  const burstContrast = (burstCuts / burstSeconds * 60) / (restCuts / restSeconds * 60);
  const evidenceLinked = state.analysis.findings.filter((finding) => finding.evidenceRelations?.length).length;
  return `<section class="segment-diagnostics">
    <header class="section-title"><div><span>DERIVED DIAGNOSTICS</span><h2>分段数据，而不是一个平均数</h2></div><p>字幕密度按官方 SRT 与分段重叠近似计算；切点密度仍是算法候选，不是人工镜头数。</p></header>
    <div class="diagnostic-summary">
      <article><small>RESULT PREVIEW</small><strong class="mono">00:00.0</strong><p>首帧即有生成角色／工作流预览</p></article>
      <article><small>OPERATION PROOF</small><strong class="mono">00:09.4</strong><p>接入说明与真实界面开始</p></article>
      <article><small>FILM PAYOFF</small><strong class="mono">00:25.3</strong><p>第一段生成短剧正式出现</p></article>
      <article><small>BURST CONTRAST</small><strong class="mono">${burstContrast.toFixed(1)}×</strong><p>两个证明窗口相对其余时段的候选切点密度</p></article>
      <article><small>FINDING COVERAGE</small><strong class="mono">${evidenceLinked}/${state.analysis.findings.length}</strong><p>全部 Finding 已关联证据或缺失数据说明</p></article>
    </div>
    <div class="segment-table-wrap"><table class="segment-table"><thead><tr><th>功能段</th><th>时长</th><th>全片占比</th><th>候选切点</th><th>切点／分钟</th><th>字幕单位／分钟</th><th>负荷判断</th></tr></thead><tbody>
      ${stats.map((item) => {
        const doubleLoad = item.cutRate > 25 && item.textRate > 320;
        return `<tr><td><button type="button" data-segment="${item.id}" data-seek="${item.start}">${item.id} · ${escapeHtml(item.title)}</button></td><td class="mono">${item.seconds.toFixed(1)}s</td><td class="mono">${item.share.toFixed(1)}%</td><td class="mono">${item.cuts}</td><td class="mono">${item.cutRate.toFixed(1)}</td><td class="mono">${item.textRate.toFixed(0)}</td><td>${doubleLoad ? '<strong class="load-high">双重高负荷</strong>' : item.cutRate > 25 ? "画面高负荷" : item.textRate > 320 ? "字幕高负荷" : "相对平缓"}</td></tr>`;
      }).join("")}
    </tbody></table></div>
  </section>`;
}

function timelineView() {
  return `<section class="project-view" id="view-timeline" data-project-view="timeline" hidden>
    ${projectHeader("叙事层回答每段在做什么；候选镜头层回答画面何时发生显著变化。")}
    <section class="section-block">
      <header class="section-title"><div><span>VIDEO + DUAL TIMELINE</span><h2>真实视频与双层时间轴</h2></div><p>8 个功能段由脚本人工归纳；41 个切点来自算法并明确标记为待人工确认。</p></header>
      <div class="studio-grid">
        <div class="video-column">
          <div class="video-frame"><video id="researchVideo" class="linked-video" controls preload="auto" poster="keyframes/frame-000.5.jpg"><track kind="subtitles" src="source.zh-CN.vtt" srclang="zh-CN" label="小红书官方字幕" default /></video></div>
          <p class="video-status" id="videoStatus">正在把 8MB 浏览代理装入本地 Blob，以支持精确跳转。</p>
        </div>
        <div class="xray">
          <article><small>CANDIDATE CUTS</small><strong>41 个合并候选切点</strong><p>46 个原始切点按至少 0.35 秒间隔合并；不是人工确认的 41 个镜头。</p></article>
          <article><small>BURST 01</small><strong>23.133–34.267 秒</strong><p>14 个以上显著变化集中证明“刚才的命令确实生成了成片”。</p></article>
          <article><small>BURST 02</small><strong>55.433–64.200 秒</strong><p>素材与模型证明高速展开，同时也形成字幕与画面双重负荷。</p></article>
          <article><small>DENSITY</small><strong>374.3 自定义单位／分钟</strong><p>中文字符+英文词的自定义密度，不是标准 WPM。</p></article>
        </div>
      </div>
      <div class="timeline-layout">
        <div class="timeline-main">
          <div class="track-panel"><div class="track-head"><strong>叙事功能层</strong><span>8 段，人工归纳</span></div>${functionTrackMarkup()}</div>
          <div class="track-panel"><div class="track-head"><strong>候选镜头层</strong><span>41 个切点／42 个区间，机器草稿</span></div>${cutRulerMarkup()}</div>
          ${selectedSegmentMarkup()}
          <div class="shot-browser"><details><summary>展开 42 个候选镜头区间</summary><div class="shot-grid">
            ${state.shots.map((shot) => `<button type="button" class="shot-card" data-shot="${shot.id}" aria-pressed="${state.selectedShotId === shot.id}"><img loading="lazy" src="${shot.frame}" alt="${escapeHtml(shot.label)}" /><span>${shot.id} · ${formatTime(shot.start, true)}</span></button>`).join("")}
          </div></details></div>
        </div>
        <aside class="timeline-aside">
          <h3>为什么是 burst pacing</h3>
          <p>平均 2.65 秒一景会掩盖真实分布。大部分解释段持续 7–10 秒，切点密集发生在两次“证明”窗口。</p>
          <div class="burst-note"><strong>证明窗口 01</strong><span>命令 → 云端项目 → 生成短剧</span></div>
          <div class="burst-note"><strong>证明窗口 02</strong><span>工作习惯 → 多素材 → 模型规则</span></div>
          <p>这个结构值得保留；具体切换是否帮助留存，必须等逐秒留存验证。</p>
        </aside>
      </div>
      ${segmentDiagnosticsMarkup()}
    </section>
  </section>`;
}

function filteredTranscriptCues() {
  const query = state.transcriptSearch.trim().toLowerCase();
  return state.transcriptAlignment.cues.filter((cue) => {
    const matchesSegment = state.transcriptSegment === "all" || cue.segmentId === state.transcriptSegment;
    const matchesQuery = !query || `${cue.rawText} ${cue.normalizedText} ${cue.primaryShotId}`.toLowerCase().includes(query);
    return matchesSegment && matchesQuery;
  });
}

function transcriptCardsMarkup() {
  const cues = filteredTranscriptCues();
  if (!cues.length) return `<div class="transcript-empty" role="status"><strong>没有匹配的文字稿</strong><p>清除搜索词或切换叙事段。</p></div>`;
  return cues.map((cue) => {
    const changed = cue.normalizationChanges.length > 0;
    const needsReview = cue.unresolvedTerms.length > 0;
    const showRaw = state.transcriptMode === "raw" || state.transcriptMode === "both";
    const showNormalized = state.transcriptMode === "normalized" || state.transcriptMode === "both";
    return `<article class="transcript-cue" id="${cue.id.toLowerCase()}">
      <button type="button" class="transcript-frame-button" data-zoom="${cue.frame}" aria-label="放大 ${cue.id} 对应画面"><img loading="lazy" src="${cue.frame}" alt="${cue.id} 在 ${formatTime(cue.screenshotTime, true)} 的真实视频截图" /></button>
      <div class="transcript-cue-body">
        <header>
          <button type="button" class="cue-play mono" data-cue="${cue.id}">${formatTime(cue.start, true)} → ${formatTime(cue.end, true)}</button>
          <span class="status-tag ${needsReview ? "blocked" : changed ? "draft" : "ready"}">${needsReview ? "术语待核验" : changed ? "规范化建议" : "原文未改"}</span>
          <span class="cue-id mono">${cue.id}</span>
        </header>
        ${showRaw ? `<div class="transcript-layer raw"><small>官方原始字幕</small><p>${escapeHtml(cue.rawText)}</p></div>` : ""}
        ${showNormalized ? `<div class="transcript-layer normalized ${changed ? "changed" : ""}"><small>规范化建议（机器草稿）</small><p>${escapeHtml(cue.normalizedText)}</p>${changed ? `<div class="normalization-chips">${cue.normalizationChanges.map((change) => `<span>${change.id} · ${change.label} · ${change.confidence}</span>`).join("")}</div>` : "<span class=\"same-copy\">与官方原始字幕一致</span>"}${needsReview ? `<div class="unresolved-note">${cue.unresolvedTerms.map((item) => `${item.id} · “${escapeHtml(item.term)}”待真人核验：${escapeHtml(item.note)}`).join("；")}</div>` : ""}</div>` : ""}
        <footer><span>${cue.segmentId} · ${escapeHtml(cue.segmentTitle)}</span><span>主 ${cue.primaryShotId} · 重叠 ${cue.overlappingShotIds.join(" / ")}</span><button type="button" data-cue="${cue.id}">播放并检查证据</button></footer>
      </div>
    </article>`;
  }).join("");
}

function transcriptView() {
  const alignment = state.transcriptAlignment;
  return `<section class="project-view" id="view-transcript" data-project-view="transcript" hidden>
    ${projectHeader("34 条小红书官方字幕逐条对应真实截图、叙事功能段与候选镜头；原始文本永不被规范化建议覆盖。")}
    <section class="section-block">
      <header class="section-title"><div><span>FULL TRANSCRIPT + FRAME EVIDENCE</span><h2>完整文字稿与逐句画面</h2></div><p>每张图取自字幕区间中点；它证明该时刻的真实画面，不代表整个字幕区间只有一个镜头。</p></header>
      <div class="transcript-toolbar">
        <label>搜索文字稿<input id="transcriptSearch" type="search" placeholder="搜索 Codex、Flova、Skill…" value="${escapeHtml(state.transcriptSearch)}" /></label>
        <label>叙事段<select id="transcriptSegment"><option value="all">全部 8 段</option>${state.analysis.narrativeSegments.map((segment) => `<option value="${segment.id}" ${state.transcriptSegment === segment.id ? "selected" : ""}>${segment.id} · ${escapeHtml(segment.title)}</option>`).join("")}</select></label>
        <div class="transcript-mode" role="group" aria-label="文字稿显示层">
          ${[["raw","仅原始"],["normalized","仅规范化"],["both","双层对照"]].map(([id,label]) => `<button type="button" data-transcript-mode="${id}" aria-pressed="${state.transcriptMode === id}">${label}</button>`).join("")}
        </div>
        <div class="transcript-count"><strong class="mono">${alignment.counts.cues}</strong><span>条字幕</span><strong class="mono">${alignment.counts.cuesWithNormalization}</strong><span>条建议</span><strong class="mono">${alignment.counts.cuesNeedingHumanReview}</strong><span>条待核验</span></div>
      </div>
      <div class="transcript-layout">
        <aside class="transcript-player">
          <div class="video-frame"><video id="transcriptVideo" class="linked-video" controls preload="auto" poster="transcript-frames/cue-001.jpg"><track kind="subtitles" src="source.zh-CN.vtt" srclang="zh-CN" label="小红书官方字幕" default /></video></div>
          <p class="video-status" id="transcriptVideoStatus">点击任一字幕时间码即可逐句播放。</p>
          <div class="transcript-provenance"><strong>证据规则</strong><p>字幕：小红书官方 zh-CN SRT</p><p>截图：每条字幕中点真实帧</p><p>规范化：机器草稿建议 14 条，待真人核验 1 条</p><a href="transcript-alignment.json">打开完整对齐 JSON</a><a href="transcript-contact-sheet.jpg">打开 34 帧总览</a></div>
        </aside>
        <div class="transcript-list" id="transcriptList">${transcriptCardsMarkup()}</div>
      </div>
    </section>
  </section>`;
}

function findingsView() {
  return `<section class="project-view" id="view-findings" data-project-view="findings" hidden>
    ${projectHeader("每条判断都有类型、置信度、适用范围、支持证据与替代解释。")}
    <section class="section-block">
      <header class="section-title"><div><span>AUDITABLE FINDINGS</span><h2>可审计结论</h2></div><p>点击任一 Finding，在右侧查看原始指标、字幕、时间码、反证与数据缺口。</p></header>
      <div class="finding-toolbar" aria-label="筛选结论类型">
        ${["all", "fact", "observation", "hypothesis", "unknown"].map((type) => `<button type="button" data-finding-filter="${type}" aria-pressed="${state.findingFilter === type}">${({all:"全部",fact:"事实",observation:"观察",hypothesis:"假设",unknown:"未知"})[type]}</button>`).join("")}
      </div>
      <div class="finding-list" id="findingList">${findingCardsMarkup()}</div>
    </section>
  </section>`;
}

function findingCardsMarkup() {
  return state.analysis.findings.filter((finding) => state.findingFilter === "all" || finding.findingType === state.findingFilter).map((finding) => `
    <button type="button" class="finding-card ${finding.findingType}" data-finding="${finding.id}">
      <header><span class="type-tag ${finding.findingType}">${finding.findingType}</span><span class="confidence-tag">${finding.confidence}</span><span class="id">${finding.id}</span></header>
      <h3>${escapeHtml(finding.statement)}</h3><p>${escapeHtml(finding.scope)}</p>
    </button>`).join("");
}

function platformView() {
  return `<section class="project-view" id="view-platform" data-project-view="platform" hidden>
    ${projectHeader("把小红书特性单独审查，避免把通用视频分析误当成平台结论。")}
    <section class="section-block">
      <header class="section-title"><div><span>XIAOHONGSHU FIT</span><h2>小红书平台适配</h2></div><p>封面、标题、搜索、收藏价值、人群语境和评论需求分别判断。</p></header>
      <div class="platform-grid">
        <article class="platform-card"><h3>标题承诺</h3><p>“如何用 Codex 自动化做视频？2分钟学会！”同时承诺工具、结果和时间。视频为 111.25 秒，时长兑现“两分钟”；是否真的“学会”需要采用数据。</p><div class="status-line"><strong>部分兑现</strong> · 时长事实可核验，学习结果未知</div></article>
        <article class="platform-card"><h3>封面一致性</h3><p>当前冻结了视频帧，但没有单独保存发布封面。第一帧不能替代封面，因此不能判断封面与标题是否一致兑现。</p><div class="status-line unknown"><strong>未知</strong> · 需要原始封面证据</div></article>
        <article class="platform-card"><h3>搜索意图</h3><p>标题含 Codex、自动化、视频、教程承诺；标签包含 AI教程、视频制作、codex 和 Flova 产品词，兼顾问题搜索与产品圈层。</p><div class="status-line"><strong>方向成立</strong> · 搜索流量占比未知</div></article>
        <article class="platform-card"><h3>收藏价值</h3><p>流程完整、界面密集、产品名多，具备保存后参考的内容结构；收藏高于点赞支持这个方向，但不能证明真实复看。</p><div class="status-line"><strong>公开代理较强</strong> · 需要 7／30 日长尾验证</div></article>
        <article class="platform-card"><h3>人群语境</h3><p>真正资格条件是“用过云端 AI 视频”，但在 52 秒后才明确。前半段可能吸引泛 AI 人群，也可能带来无效预期。</p><div class="status-line"><strong>可测试</strong> · 提前资格筛选是否改善目标动作</div></article>
        <article class="platform-card"><h3>评论承接</h3><p>可见问题集中在价格、兼容性、能力边界和封面教程。它们可直接变成 FAQ、置顶评论和下一条内容。</p><div class="status-line"><strong>内容机会明确</strong> · 样本仅 10／81</div></article>
      </div>
    </section>
  </section>`;
}

function commentsView() {
  const rows = [
    ["价格／付费", 3, "Flova 要钱不／怎么付费／价格？"],
    ["兼容性", 1, "随便什么电脑都可以吗？"],
    ["能力边界", 1, "可以剪辑自己的视频吗？"],
    ["后续教程", 1, "视频封面怎么做？"],
    ["实践意图", 1, "這就試起來！"],
    ["泛化认可", 3, "太厉害了／好棒呀／太强了"]
  ];
  return `<section class="project-view" id="view-comments" data-project-view="comments" hidden>
    ${projectHeader("评论只作为需求和阻力的方向信号，不把 10 条可见样本外推到完整受众。")}
    <section class="section-block">
      <header class="section-title"><div><span>AUDIENCE DEMAND</span><h2>可见评论中的采用阻力</h2></div><p>未登录页面可见 10／81 条；排序、点赞、时间和剩余回复未冻结。</p></header>
      <div class="comment-layout">
        <div class="comment-table-wrap"><table><thead><tr><th>类别</th><th>条数</th><th>代表问题</th><th>可行动响应</th></tr></thead><tbody>
          ${rows.map(([label, count, example]) => `<tr><td>${label}</td><td class="mono">${count}</td><td>${example}</td><td>${label === "泛化认可" ? "无需单独创作" : label === "实践意图" ? "提供最短上手路径" : `制作 ${label} FAQ`}</td></tr>`).join("")}
        </tbody></table></div>
        <aside class="comment-summary"><h3>可见样本中 7／10 是问题或实践意图</h3><p>这只能说明当前可见样本的结构，不能代表完整评论区，更不能替代点击、转粉或购买数据。</p><blockquote>下一条内容机会：把价格、Windows／Mac、能否剪自有素材和封面流程拆成一条“采用前 FAQ”。</blockquote></aside>
      </div>
    </section>
  </section>`;
}

function experimentView() {
  const exp = state.analysis.recommendedRebuild.nextTest;
  return `<section class="project-view" id="view-experiment" data-project-view="experiment" hidden>
    ${projectHeader("实验只改变一个变量，并在后台数据缺失时明确标记为不可验收。")}
    <article class="experiment-card">
      <header><small>${exp.id} / ${exp.measurementStatus}</small><h2>${escapeHtml(exp.hypothesis)}</h2><p>${escapeHtml(exp.objective)}</p></header>
      <div class="experiment-alert"><strong>数据阻塞：</strong>${exp.blockedBy.join("、")} 尚未导入。</div>
      <div class="experiment-grid">
        <article><small>SINGLE VARIABLE</small><strong>${escapeHtml(exp.singleVariable)}</strong></article>
        <article><small>PRIMARY METRIC</small><strong>${escapeHtml(exp.primaryMetric)}</strong></article>
        <article><small>VARIANT A</small><p>${escapeHtml(exp.variantA)}</p></article>
        <article><small>VARIANT B</small><p>${escapeHtml(exp.variantB)}</p></article>
        <article><small>GUARDRAILS</small><p>${exp.guardrailMetrics.join("、")}</p></article>
        <article><small>OBSERVATION WINDOW</small><p>${escapeHtml(exp.observationWindow)}</p></article>
        <article><small>MINIMUM SAMPLE</small><p>${escapeHtml(exp.minimumSample)}</p></article>
        <article><small>SUCCESS CRITERIA</small><p>${escapeHtml(exp.successCriteria)}</p></article>
      </div>
    </article>
  </section>`;
}

function renderApp() {
  renderNavigation();
  app.className = "";
  app.removeAttribute("aria-busy");
  app.innerHTML = [overviewView(), timelineView(), transcriptView(), findingsView(), platformView(), commentsView(), experimentView()].join("");
  switchView(VIEWS.some((view) => view.id === state.activeView) ? state.activeView : "overview", false);
  attachVideo();
  renderFindingInspector("F-HOOK-001", false);
}

function switchView(viewId, updateHash = true) {
  state.activeView = viewId;
  document.querySelectorAll("[data-project-view]").forEach((section) => { section.hidden = section.dataset.projectView !== viewId; });
  document.querySelectorAll("[data-view]").forEach((button) => {
    if (button.closest(".rail-nav")) button.setAttribute("aria-current", button.dataset.view === viewId ? "page" : "false");
  });
  const select = document.querySelector("#mobileViewSelect");
  if (select) select.value = viewId;
  if (updateHash) history.replaceState(null, "", `#${viewId}`);
  document.querySelector("#workspace")?.scrollTo?.({ top: 0, behavior: "smooth" });
}

function updateObjective(id) {
  state.objective = id;
  const profile = OBJECTIVES[id];
  document.querySelector("#objectiveCode").textContent = `OBJECTIVE / ${profile.code}`;
  document.querySelector("#objectiveTitle").textContent = profile.verdict;
  document.querySelector("#objectiveNote").textContent = profile.note;
  document.querySelectorAll("[data-objective]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.objective === id));
  renderObjectiveInspector(id);
}

function openEvidencePanel() {
  state.evidenceOpen = true;
  evidencePanel.dataset.open = "true";
  drawerBackdrop.hidden = window.innerWidth >= 1280;
}

function closeEvidencePanel() {
  state.evidenceOpen = false;
  evidencePanel.dataset.open = "false";
  drawerBackdrop.hidden = true;
}

function evidenceCard(item, relation = "supports", note = "") {
  if (!item) return "";
  return `<article class="evidence-item">
    <header><code>${escapeHtml(item.id)}</code><span>${escapeHtml(relation)} · ${escapeHtml(item.sourceTier)}</span></header>
    <p>${escapeHtml(item.excerpt)}</p>
    ${note ? `<p class="counter-note">${escapeHtml(note)}</p>` : ""}
    ${item.artifactRef ? `<a href="${escapeHtml(item.artifactRef.split("#")[0])}">打开原始证据 ↗</a>` : "<span>当前为缺失数据说明</span>"}
  </article>`;
}

function renderFindingInspector(id, open = true) {
  const finding = state.analysis.findings.find((item) => item.id === id);
  if (!finding) return;
  const relations = finding.evidenceRelations || [];
  evidenceContent.innerHTML = `<div class="evidence-hero"><small>${finding.id} / ${finding.findingType}</small><h2>${escapeHtml(finding.statement)}</h2><p>${escapeHtml(finding.interpretation)}</p></div>
    <div class="evidence-meta"><div><label>类型</label><strong>${finding.findingType}</strong></div><div><label>置信度</label><strong>${finding.confidence}</strong></div><div><label>维度</label><strong>${finding.dimension}</strong></div><div><label>审阅状态</label><strong>${finding.reviewStatus}</strong></div></div>
    <section class="evidence-group"><h3>适用范围</h3><p>${escapeHtml(finding.scope)}</p></section>
    <section class="evidence-group"><h3>支持、反证与替代解释</h3>${relations.map((relation) => evidenceCard(state.analysis.evidenceItems.find((item) => item.id === relation.evidenceId), relation.relation, relation.note)).join("")}</section>
    <div class="inspector-actions"><button type="button" data-action="review">人工确认／修正</button><a href="content-model-draft.json">保存为内容模型</a></div>`;
  if (open) openEvidencePanel();
}

function renderSegmentInspector(id) {
  const segment = state.analysis.narrativeSegments.find((item) => item.id === id);
  if (!segment) return;
  state.selectedSegmentId = id;
  const transcript = cuesBetween(segment.start, segment.end);
  evidenceContent.innerHTML = `<div class="evidence-hero"><small>${segment.id} / NARRATIVE SEGMENT</small><h2>${escapeHtml(segment.title)}</h2><p>${formatTime(segment.start, true)}–${formatTime(segment.end, true)} · ${escapeHtml(segment.role)}</p></div>
    <img class="evidence-frame" src="${segment.frame}" alt="${escapeHtml(segment.title)}代表帧" data-zoom="${segment.frame}" />
    <section class="evidence-group"><h3>原始官方字幕</h3><div class="raw-transcript">${transcript.map((cue) => `<p><code>${formatTime(cue.start, true)}</code> ${escapeHtml(cue.text)}</p>`).join("")}</div></section>
    <section class="evidence-group"><h3>画面观察</h3><p>${escapeHtml(segment.visual)}</p></section>
    <section class="evidence-group"><h3>分析判断</h3><p>${escapeHtml(segment.assessment)}</p><p class="counter-note">产品名规范化目前是机器草稿建议；原始 SRT 保留 floor、flogo、codax 等自动识别结果，未经真人签名不会升级为人工确认。</p></section>
    <div class="inspector-actions"><button type="button" data-seek="${segment.start}">跳到时间码</button><a href="source.zh-CN.srt">打开完整 SRT</a></div>`;
  openEvidencePanel();
  const detail = document.querySelector("#timelineDetail");
  if (detail) detail.outerHTML = selectedSegmentMarkup();
  document.querySelectorAll("[data-segment]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.segment === id));
}

function renderShotInspector(id) {
  const shot = state.shots.find((item) => item.id === id);
  if (!shot) return;
  state.selectedShotId = id;
  const transcript = cuesBetween(shot.start, shot.end);
  evidenceContent.innerHTML = `<div class="evidence-hero"><small>${shot.id} / CANDIDATE SHOT</small><h2>${escapeHtml(shot.label)}</h2><p>${formatTime(shot.start, true)}–${formatTime(shot.end, true)} · ${shot.duration.toFixed(3)} 秒</p></div>
    <img class="evidence-frame" src="${shot.frame}" alt="${escapeHtml(shot.label)}" data-zoom="${shot.frame}" />
    <div class="evidence-meta"><div><label>画面类型</label><strong>${escapeHtml(shot.visualFamily)}</strong></div><div><label>证据作用</label><strong>${escapeHtml(shot.evidenceRole)}</strong></div><div><label>所属功能段</label><strong>${shot.segmentId}</strong></div><div><label>认知负荷</label><strong>${escapeHtml(shot.load)}</strong></div></div>
    <section class="evidence-group"><h3>该区间官方字幕</h3><div class="raw-transcript">${transcript.length ? transcript.map((cue) => `<p><code>${formatTime(cue.start, true)}</code> ${escapeHtml(cue.text)}</p>`).join("") : "该候选区间没有独立字幕起点。"}</div></section>
    <p class="counter-note">这是算法边界形成的候选区间，尚未人工确认是否属于独立镜头、同镜运动或画面内部变化。</p>
    <div class="inspector-actions"><button type="button" data-seek="${shot.start}">跳到 ${formatTime(shot.start, true)}</button><a href="scene-detect.log">场景检测日志</a></div>`;
  openEvidencePanel();
  document.querySelectorAll("[data-shot]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.shot === id));
}

function renderCueInspector(id) {
  const cue = state.transcriptAlignment.cues.find((item) => item.id === id);
  if (!cue) return;
  const changed = cue.normalizationChanges.length > 0;
  const needsReview = cue.unresolvedTerms.length > 0;
  evidenceContent.innerHTML = `<div class="evidence-hero"><small>${cue.id} / OFFICIAL TRANSCRIPT</small><h2>${escapeHtml(cue.rawText)}</h2><p>${formatTime(cue.start, true)}–${formatTime(cue.end, true)} · 截图 ${formatTime(cue.screenshotTime, true)}</p></div>
    <img class="evidence-frame" src="${cue.frame}" alt="${cue.id} 对应真实视频帧" data-zoom="${cue.frame}" />
    <div class="evidence-meta"><div><label>叙事段</label><strong>${cue.segmentId}</strong></div><div><label>主候选镜头</label><strong>${cue.primaryShotId}</strong></div><div><label>重叠候选镜头</label><strong>${cue.overlappingShotIds.join(" / ")}</strong></div><div><label>规范化状态</label><strong>${needsReview ? "术语待真人核验" : changed ? "机器草稿建议" : "未改"}</strong></div></div>
    <section class="evidence-group"><h3>官方原始字幕</h3><div class="raw-transcript">${escapeHtml(cue.rawText)}</div></section>
    <section class="evidence-group"><h3>规范化建议（机器草稿）</h3><div class="raw-transcript">${escapeHtml(cue.normalizedText)}</div>${changed ? `<p>${cue.normalizationChanges.map((change) => `${change.id} · ${change.label} · ${change.confidence}`).join("；")}</p>` : "<p>与官方字幕一致。</p>"}${needsReview ? `<p class="counter-note">${cue.unresolvedTerms.map((item) => `${item.id} · “${escapeHtml(item.term)}”待真人核验：${escapeHtml(item.note)}`).join("；")}</p>` : ""}</section>
    <section class="evidence-group"><h3>画面对齐边界</h3><p>截图取字幕区间中点，只证明 ${formatTime(cue.screenshotTime, true)} 的画面。该句横跨 ${cue.overlappingShotIds.join("、")}；不能用一张截图代替整个区间的镜头变化。</p></section>
    <div class="inspector-actions"><button type="button" data-seek="${cue.start}">播放这句</button><a href="transcript-alignment.json">对齐 JSON</a></div>`;
  openEvidencePanel();
}

function renderMetricInspector(id) {
  const metric = {
    bookmarks: ["收藏 1,698", "公开指标快照", "source.json.metrics.bookmarks", "事实：收藏数为 1,698。它不等于复看次数。"],
    likes: ["点赞 1,268", "公开指标快照", "source.json.metrics.likes", "事实：点赞数为 1,268。没有曝光，不能计算点赞率。"],
    bookmarkLike: ["收藏／点赞 133.9%", "派生计算", "1698 ÷ 1268 × 100", "这是互动结构比，不是收藏率、复看率或内容质量总分。"],
    owner: ["曝光／转粉未知", "后台数据缺口", "owner metrics = null", "缺失不是零，也不是表现差；需要账号后台导入。"]
  }[id];
  if (!metric) return;
  evidenceContent.innerHTML = `<div class="evidence-hero"><small>METRIC / ${escapeHtml(id)}</small><h2>${escapeHtml(metric[0])}</h2><p>${escapeHtml(metric[1])}</p></div>
    <section class="evidence-group"><h3>定位／公式</h3><div class="raw-transcript mono">${escapeHtml(metric[2])}</div></section>
    <section class="evidence-group"><h3>证据边界</h3><p>${escapeHtml(metric[3])}</p></section>
    ${evidenceCard(state.analysis.evidenceItems.find((item) => item.id === (id === "owner" ? "E-MISSING-001" : "E-METRIC-001")))}`;
  openEvidencePanel();
}

function renderObjectiveInspector(id) {
  const profile = OBJECTIVES[id];
  evidenceContent.innerHTML = `<div class="evidence-hero"><small>OPERATING OBJECTIVE / ${profile.code}</small><h2>${escapeHtml(profile.verdict)}</h2><p>${escapeHtml(profile.note)}</p></div>
    <section class="evidence-group"><h3>下一步数据动作</h3><p>${escapeHtml(profile.next)}</p></section>
    <section class="evidence-group"><h3>为什么目标会改变判断</h3><p>同一收藏结构可以支持“内容资产”方向，却不能证明账号增长或商业转化。V3 不生成跨目标综合分。</p></section>`;
  openEvidencePanel();
}

function attachVideo() {
  const videos = [...document.querySelectorAll("video.linked-video")];
  if (!videos.length || !state.videoUrl) return;
  videos.forEach((video) => {
    video.src = state.videoUrl;
    video.load();
    const status = video.id === "transcriptVideo" ? document.querySelector("#transcriptVideoStatus") : document.querySelector("#videoStatus");
    video.addEventListener("loadedmetadata", () => {
      if (status) status.innerHTML = `<strong>精确跳转已就绪</strong> · ${formatTime(video.duration, true)} · 540×960 浏览代理 · 官方字幕可开启`;
    }, { once: true });
    video.addEventListener("error", () => {
      if (status) status.textContent = "浏览代理加载失败；可打开原始视频文件核验。";
    });
  });
}

function seekTo(seconds) {
  const requestedView = state.activeView === "transcript" ? "transcript" : "timeline";
  switchView(requestedView);
  const visibleView = document.querySelector(`[data-project-view="${requestedView}"]`);
  const video = visibleView?.querySelector("video.linked-video") || document.querySelector("#researchVideo");
  if (!video) return;
  document.querySelectorAll("video.linked-video").forEach((item) => { item.currentTime = Number(seconds); item.pause(); });
  video.play().catch(() => {});
  const status = video.id === "transcriptVideo" ? document.querySelector("#transcriptVideoStatus") : document.querySelector("#videoStatus");
  if (status) status.innerHTML = `<strong>已定位 ${formatTime(seconds, true)}</strong> · 点击暂停可逐帧核验`;
}

function showAction(action) {
  const bodies = {
    brief: `<h2 id="actionTitle">下一条 Brief 已生成</h2><p>草稿引用 4 条 Finding，并把实验收敛为“是否前置 Flova 依赖”一个变量。</p><div class="dialog-note">当前曝光、留存和目标动作数据仍未导入，因此实验标记为 blocked。</div><div class="dialog-actions"><a href="next-brief.md">打开 Brief</a></div>`,
    topic: `<h2 id="actionTitle">加入专题</h2><p>当前帖子已经具备稳定 ContentItem ID，可直接复用为专题样本，不需要重新采集。</p><div class="dialog-note">V3 Project API 尚未接入这张静态研究台，因此这里不会伪造“加入成功”。下一实现任务是创建 ProjectSample。</div>`,
    creator: `<h2 id="actionTitle">分析对应博主</h2><p>作者为 AI红发魔女。博主分析应进入独立 creator project，并至少采集 12 条跨时间内容后再判断稳定内容系统。</p><div class="dialog-note">当前静态研究台只提供真实主页入口，不在单帖页面下方追加伪造博主结论。</div><div class="dialog-actions"><a href="${escapeHtml(state.source.author.profileUrl)}" target="_blank" rel="noreferrer">打开真实主页</a></div>`,
    review: `<h2 id="actionTitle">人工审阅入口</h2><p>Finding 当前状态为 machine_draft。完整 V3 将支持确认、修正、否定和修订历史。</p><div class="dialog-note">静态报告不写入数据库，因此这里不会伪造状态变更；证据关系已经保存在 analysis.json。</div><div class="dialog-actions"><a href="analysis.json">检查分析数据</a></div>`
  };
  actionDialogBody.innerHTML = bodies[action] || bodies.review;
  actionDialog.showModal();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a, [data-zoom]");
  if (!target) return;
  if (target.dataset.view) { event.preventDefault(); switchView(target.dataset.view); return; }
  if (target.dataset.objective) { updateObjective(target.dataset.objective); return; }
  if (target.dataset.finding) { renderFindingInspector(target.dataset.finding); return; }
  if (target.dataset.cue) {
    const cue = state.transcriptAlignment.cues.find((item) => item.id === target.dataset.cue);
    renderCueInspector(target.dataset.cue);
    if (cue) seekTo(cue.start);
    return;
  }
  if (target.dataset.transcriptMode) {
    state.transcriptMode = target.dataset.transcriptMode;
    document.querySelectorAll("[data-transcript-mode]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.transcriptMode === state.transcriptMode));
    document.querySelector("#transcriptList").innerHTML = transcriptCardsMarkup();
    return;
  }
  if (target.dataset.segment) {
    renderSegmentInspector(target.dataset.segment);
    if (target.dataset.seek !== undefined) seekTo(target.dataset.seek);
    return;
  }
  if (target.dataset.shot) {
    const shot = state.shots.find((item) => item.id === target.dataset.shot);
    renderShotInspector(target.dataset.shot);
    if (shot) seekTo(shot.start);
    return;
  }
  if (target.dataset.metric) { renderMetricInspector(target.dataset.metric); return; }
  if (target.dataset.findingFilter) {
    state.findingFilter = target.dataset.findingFilter;
    document.querySelectorAll("[data-finding-filter]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.findingFilter === state.findingFilter));
    document.querySelector("#findingList").innerHTML = findingCardsMarkup();
    return;
  }
  if (target.dataset.seek !== undefined) { seekTo(target.dataset.seek); return; }
  if (target.dataset.action) { showAction(target.dataset.action); return; }
  if (target.dataset.zoom) window.open(target.dataset.zoom, "_blank", "noopener,noreferrer");
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "transcriptSearch") return;
  state.transcriptSearch = event.target.value;
  document.querySelector("#transcriptList").innerHTML = transcriptCardsMarkup();
});

document.addEventListener("change", (event) => {
  if (event.target.id !== "transcriptSegment") return;
  state.transcriptSegment = event.target.value;
  document.querySelector("#transcriptList").innerHTML = transcriptCardsMarkup();
});

document.querySelector("#mobileViewSelect").addEventListener("change", (event) => switchView(event.target.value));
document.querySelector("#openEvidence").addEventListener("click", openEvidencePanel);
document.querySelector("#closeEvidence").addEventListener("click", closeEvidencePanel);
drawerBackdrop.addEventListener("click", closeEvidencePanel);
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1280) drawerBackdrop.hidden = true;
  else if (state.evidenceOpen) drawerBackdrop.hidden = false;
});

async function init() {
  try {
    const [analysisResponse, sourceResponse, srtResponse, alignmentResponse, videoResponse] = await Promise.all([
      fetch("analysis.json"), fetch("source.json"), fetch("source.zh-CN.srt"), fetch("transcript-alignment.json"), fetch("source.workbench.mp4")
    ]);
    if (![analysisResponse, sourceResponse, srtResponse, alignmentResponse, videoResponse].every((response) => response.ok)) throw new Error("一个或多个真实证据文件无法读取");
    state.analysis = await analysisResponse.json();
    state.source = await sourceResponse.json();
    state.transcript = parseSrt(await srtResponse.text());
    state.transcriptAlignment = await alignmentResponse.json();
    state.videoUrl = URL.createObjectURL(await videoResponse.blob());
    state.shots = buildShots();
    renderApp();
  } catch (error) {
    app.className = "";
    app.removeAttribute("aria-busy");
    app.innerHTML = `<div class="error-state" role="alert"><h1>研究证据装载失败</h1><p>${escapeHtml(error.message)}。请确认本地工作台通过 HTTP 服务打开，而不是直接双击 HTML 文件。</p></div>`;
  }
}

window.addEventListener("beforeunload", () => { if (state.videoUrl) URL.revokeObjectURL(state.videoUrl); });
init();
