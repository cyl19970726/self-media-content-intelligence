const [inventory, breakdown] = await Promise.all([
  fetch("inventory.json").then((r) => r.json()),
  fetch("analysis.json").then((r) => r.json())
]);

const videos = inventory.videos;
const nf = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
const pct = (n) => `${(n * 100).toFixed(1)}%`;
const safe = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const totalLikes = videos.reduce((sum, item) => sum + item.likes, 0);
document.querySelector("#total-likes").textContent = nf.format(totalLikes);
document.querySelector("#top2-share").textContent = pct(videos.slice(0, 2).reduce((s, v) => s + v.likes, 0) / totalLikes);

const barRoot = document.querySelector("#performance-bars");
videos.slice(0, 10).forEach((item) => {
  barRoot.insertAdjacentHTML("beforeend", `<div class="bar-row">
    <span class="name">${item.rank}. ${safe(item.title)}</span>
    <span class="bar-track"><i style="width:${(item.likes / videos[0].likes) * 100}%"></i></span>
    <span class="bar-value">${nf.format(item.likes)}</span>
  </div>`);
});

const pillars = ["全部", ...new Set(videos.map((video) => video.pillar))];
const filterRoot = document.querySelector("#filters");
let activePillar = "全部";
let query = "";

pillars.forEach((pillar, index) => {
  const button = document.createElement("button");
  button.textContent = pillar;
  button.className = index === 0 ? "active" : "";
  button.addEventListener("click", () => {
    activePillar = pillar;
    [...filterRoot.children].forEach((el) => el.classList.toggle("active", el === button));
    renderInventory();
  });
  filterRoot.append(button);
});

document.querySelector("#search").addEventListener("input", (event) => {
  query = event.target.value.trim().toLowerCase();
  renderInventory();
});

const detailDialog = document.querySelector("#detail-dialog");
const dialogContent = document.querySelector("#dialog-content");
detailDialog.querySelector(".close").addEventListener("click", () => detailDialog.close());
detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

function showVideo(item) {
  const saveRate = item.collections / item.likes;
  const shareRate = item.shares / item.likes;
  dialogContent.innerHTML = `
    <span class="pill">${safe(item.pillar)} · ${safe(item.role)}</span>
    <h2>${safe(item.title)}</h2>
    <p>${safe(item.summary)}</p>
    <div class="dialog-metrics">
      <div><span>点赞</span><strong>${nf.format(item.likes)}</strong></div>
      <div><span>收藏/赞</span><strong>${pct(saveRate)}</strong></div>
      <div><span>分享/赞</span><strong>${pct(shareRate)}</strong></div>
      <div><span>时长</span><strong>${item.duration}s</strong></div>
    </div>
    <h3>为什么是这个表现</h3>
    <p>${safe(item.why)}</p>
    <h3>在账号系统中的任务</h3>
    <p>${safe(item.role)}。这不是单纯按点赞评价好坏，而是判断它是否完成拉新、信任、承接、商业或复习任务。</p>
    <p><a href="https://www.xiaohongshu.com/explore/${item.id}" target="_blank" rel="noreferrer">打开原笔记 ↗</a>${item.visual ? ` · <a href="#breakdowns" onclick="document.querySelector('#detail-dialog').close()">查看真实拉片</a>` : ""}</p>`;
  detailDialog.showModal();
}

function renderInventory() {
  const body = document.querySelector("#inventory-body");
  body.innerHTML = "";
  const matches = videos.filter((item) => {
    const pillarMatch = activePillar === "全部" || item.pillar === activePillar;
    const text = `${item.title} ${item.role} ${item.summary} ${item.why}`.toLowerCase();
    return pillarMatch && (!query || text.includes(query));
  });
  document.querySelector("#empty-state").hidden = matches.length > 0;
  matches.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.rank}</td>
      <td><strong>${safe(item.title)}</strong><small>${safe(item.pillar)} · ${safe(item.role)}</small></td>
      <td>${item.duration}s</td>
      <td>${nf.format(item.likes)}</td>
      <td class="rate">${pct(item.collections / item.likes)}</td>
      <td class="rate">${pct(item.shares / item.likes)}</td>
      <td class="judgement">${safe(item.why)}</td>`;
    row.tabIndex = 0;
    row.addEventListener("click", () => showVideo(item));
    row.addEventListener("keydown", (event) => { if (event.key === "Enter") showVideo(item); });
    body.append(row);
  });
}
renderInventory();

const breakdownInsights = {
  "6a2fcd940000000007021a9f": {
    title: "结果证明是第一镜头的任务",
    text: "前段用身份、近期起号结果和评论截图完成可信度建立；主体回到固定机位、白板和少量道具。画面并不精致，但每次道具出现都在承担证明或分段，不是装饰。"
  },
  "6a2e823100000000210217e8": {
    title: "极端主张负责争议，白板负责解释",
    text: "红色连帽衫与面罩形成高对比，近景前倾强化压迫感；随后退回白板讲平台趋势。评论既出现认可，也大量质疑收入和投流，说明身份钩子同时制造停留与信任成本。"
  },
  "6a3139ab00000000220171b1": {
    title: "同一场景换主题，靠进度证明保持新鲜",
    text: "开头把“两条视频起号2万”与账号截图同屏，之后用白板、手势和少量案例截图解释Vlog。相较前一条，垂直议题带来更多具体场景提问，也缩小了自然受众。"
  },
  "6a3632b4000000000803f2c5": {
    title: "价值观片用更近景替代知识结构",
    text: "近景面罩和手持笔占据画面，白板退为背景；聊天截图只在关键证言处出现。它减少知识分段、增加第一人称经历和道德表态，承担的是长期信任而非收藏效率。"
  },
  "6a69d19c00000000090357d0": {
    title: "高收藏来自框架命名，不来自视觉复杂度",
    text: "213秒内仍是固定机位、白板与手势，显著切换21次。真正可保存的是“必要条件 + 万古同悲/惊世骇俗/打破节奏”这组命名；画面只负责让抽象分类有落点。"
  },
  "6a3ba6950000000007027cc5": {
    title: "反AI观点靠近景压迫与敌我叙事",
    text: "156秒仅12次显著切换，是8条里最低切换密度之一。面罩持续逼近镜头、反复指向白板，视觉在强化“我正在戳破同行”的对抗姿态，而非展示AI案例。"
  },
  "6a4f70470000000021020657": {
    title: "他说别拆爆款，自己仍在使用证据化结构",
    text: "开头先展示旧作品/成绩，再把编导能力拆成选题、脚本、节奏、表达和素材库。画面仍是白板分区和手势推进；他否定的是低效笔记，不是否定可回到生产的结构化分析。"
  },
  "6a3d085300000000060239b0": {
    title: "内容最全，视觉与认知负荷也最高",
    text: "315秒、110段字幕、28次显著切换，主体仍是单场景口播。13个问题连续跨越赛道、频率、商业、数据和MCN，缺少章节视觉重置；这与评论中“输入焦虑”的反馈一致。"
  }
};

const tabRoot = document.querySelector("#breakdown-tabs");
const viewRoot = document.querySelector("#breakdown-view");
let activeBreakdown = breakdown.videos[0]?.id;

breakdown.videos.forEach((video, index) => {
  const button = document.createElement("button");
  button.className = index === 0 ? "active" : "";
  button.dataset.id = video.id;
  button.innerHTML = `<b>${safe(video.title)}</b><span>${Math.round(video.media.durationSeconds)}s · ${video.transcript.cueCount}条字幕 · ${video.editing.detectedSceneCuts.length}次显著切换</span>`;
  button.addEventListener("click", () => {
    activeBreakdown = video.id;
    [...tabRoot.children].forEach((el) => el.classList.toggle("active", el === button));
    renderBreakdown();
  });
  tabRoot.append(button);
});

function renderBreakdown() {
  const video = breakdown.videos.find((item) => item.id === activeBreakdown);
  if (!video) return;
  const insight = breakdownInsights[video.id];
  viewRoot.innerHTML = `<div class="breakdown-layout">
    <div class="sheet">
      <a href="${video.evidence.contactSheet}" target="_blank"><img src="${video.evidence.contactSheet}" alt="${safe(video.title)} 20帧接触表"></a>
      <p>20个均匀采样真实帧。点击查看原图。它用于观察视觉稳定性与道具分布，不代表每个剪辑点。</p>
    </div>
    <div>
      <div class="evidence-header">
        <div><span>时长</span><strong>${video.media.durationSeconds.toFixed(1)}s</strong></div>
        <div><span>字幕密度</span><strong>${video.transcript.charactersPerMinute}字/分</strong></div>
        <div><span>显著切换</span><strong>${video.editing.detectedSceneCuts.length}次</strong></div>
        <div><span>切换/分钟</span><strong>${video.editing.cutsPerMinute}</strong></div>
      </div>
      <div class="finding"><h3>${safe(insight.title)}</h3><p>${safe(insight.text)}</p></div>
      <div class="transcript-tools"><h3>完整文字稿 × 对应真实帧</h3><button id="toggle-highlight">只看前12秒</button></div>
      <div class="script-list" id="script-list">${video.transcript.cues.map((cue) => `<article class="script-card${cue.start < 12 ? " highlight" : ""}" data-start="${cue.start}">
        <time>${formatTime(cue.start)}–${formatTime(cue.end)}</time>
        <a href="${cue.frame}" target="_blank"><img loading="lazy" src="${cue.frame}" alt="${safe(cue.id)} 对应帧"></a>
        <p><b>${safe(cue.id)}</b><br>${safe(cue.text)}</p>
      </article>`).join("")}</div>
    </div>
  </div>`;
  let onlyHook = false;
  document.querySelector("#toggle-highlight").addEventListener("click", (event) => {
    onlyHook = !onlyHook;
    viewRoot.querySelectorAll(".script-card").forEach((card) => { card.hidden = onlyHook && Number(card.dataset.start) >= 12; });
    event.currentTarget.textContent = onlyHook ? "显示完整文字稿" : "只看前12秒";
  });
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  return `${String(min).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
renderBreakdown();

const launchVideos = [
  ["证明", "我拆完两个博主全部视频，发现起号不是多发", "展示319+19样本与真实报告", "负责拉新"],
  ["对照", "14秒工具演示 vs 5分钟口播，为什么都能火", "用两张节奏图讲共同机制", "建立判断力"],
  ["产品", "丢一个链接，AI怎么完成逐字稿和真实拉片", "全流程屏幕实操", "证明工具能力"],
  ["实验", "照着7.6万赞结构重做一条，数据会怎样", "公开脚本、发布与后台", "第一次实战"],
  ["反例", "最全的教程为什么反而不火", "3379赞控制样本", "教单一任务"],
  ["立场", "AI不能替代人类共情，但可以替代这些苦工", "回应“不要用AI做自媒体”", "建立价值观"],
  ["需求", "我把100条评论变成了一个选题库", "评论簇到脚本映射", "展示反馈闭环"],
  ["生产", "同一选题：AI一键稿 vs 人类编导稿", "双版本真实成片", "制造可比较证据"],
  ["系统", "我的自媒体工作台如何管理5个平台", "选题—生产—发布—复盘", "承接产品心智"],
  ["复盘", "10条发完：什么有效，什么必须停", "后台数据、错误与下一轮", "生成新证据"]
];

const launchRoot = document.querySelector("#launch-grid");
launchVideos.forEach((item, index) => {
  launchRoot.insertAdjacentHTML("beforeend", `<article class="launch-card">
    <span class="index">${String(index + 1).padStart(2, "0")} / ${safe(item[0])}</span>
    <h3>${safe(item[1])}</h3>
    <p>${safe(item[2])}</p>
    <b>${safe(item[3])}</b>
  </article>`);
});
