import fs from "node:fs";
import path from "node:path";

const workspace = "/Users/hhh0x/self-media";
const dashboardRoot = path.resolve(workspace, "artifacts/creator-research/ai-red-witch/selected-high-like");
const researchRoot = path.resolve(workspace, "artifacts/creator-research/ai-red-witch/content-reconstruction-v1");
const libraryRoot = path.resolve(workspace, "artifacts/creator-research/ai-red-witch/video-library");
const library = JSON.parse(fs.readFileSync(path.resolve(libraryRoot, "library.json"), "utf8"));

const selection = [
  { id: "6801c0750000000007037156", typeId: "H1", mechanism: "保存/搜索：任务闭环", reason: "单点任务解法：验证高收藏内容如何把痛点压缩成一条可执行路径。" },
  { id: "690ac8730000000004014f67", typeId: "H2", mechanism: "收藏/选择：压缩地图", reason: "工具地图：验证短时长、多交付物内容如何制造收藏与检索价值。" },
  { id: "69424c0d000000001e039745", typeId: "H6", mechanism: "传播/商业：情绪叙事", reason: "大众叙事：验证非教程内容如何用人物困境、产品演示与情绪承接扩大传播。" },
  { id: "6928316c000000001e0397ba", typeId: "M3", mechanism: "深度足，但首个回报慢", reason: "完整工作流：还原从需求、配置、资产到成品和返修的长链路。" },
  { id: "67af1032000000001902d33d", typeId: "M1", mechanism: "有用，但生成因果未闭合", reason: "视觉演示：检验强结果画面在缺少完整生成因果时能传递到什么程度。" },
  { id: "6832e96a000000002100405d", typeId: "M4", mechanism: "案例强，但商业可信度有债务", reason: "行业解释：检验数据、案例与商业判断如何共同建立可信度。" },
  { id: "66ee9136000000001201188a", typeId: "L1", mechanism: "短，不等于易复用", reason: "短教程反例：说明短、快、结果强，并不自动带来高表现。" },
  { id: "6726eb1c000000003c0175f3", typeId: "L2", mechanism: "结果强，不等于路径清楚", reason: "成片展示反例：观察只有效果、缺少工具与操作证据时为何难以复用。" },
  { id: "66011c23000000000d00ed40", typeId: "L3", mechanism: "观点深，不等于平台消费友好", reason: "长观点反例：观察论点有深度但承诺、节奏与平台消费习惯不匹配时的损失。" },
];

const taxonomy = {
  high: {
    conclusion: "高表现不是一种格式，而是六种内容任务共用同一证明语法：前三秒可见、结果先于解释、一个主承诺、真人建立信任、画面完成证明。",
    types: [
      { id: "H1", name: "痛点闭环教程", videoIds: ["6801c0750000000007037156"], structure: "失败画面 → 一条提示词 → 操作 → 正确结果", signal: "高赞高藏，结果可见且路径可复用", diagnosis: "普遍问题被压缩成一个价值单位", risk: "概念简化与替代方案未交代" },
      { id: "H2", name: "压缩工具地图", videoIds: ["69129479000000000700ac96", "690ac8730000000004014f67"], structure: "用途总览 → 4–6个连续结果 → 收藏型收束", signal: "单位时间结果密度高，被当作选择索引", diagnosis: "不是教会操作，而是先完成工具—任务匹配", risk: "工具名、入口和条件不完整" },
      { id: "H3", name: "新品证据深读", videoIds: ["6808e742000000001e000b85"], structure: "行业变化 → 多组样片 → 原理/规模 → 创作机会", signal: "长内容仍能依靠持续样片维持注意", diagnosis: "热点时效与待试用机会叠加", risk: "技术主张、真实性与适用条件需核验" },
      { id: "H4", name: "视觉结果证明", videoIds: ["688ab6260000000022020d3e"], structure: "熟悉角色结果 → 最小输入 → 更多变化", signal: "熟悉IP快速降低陌生技术理解成本", diagnosis: "先让观众看见变化，再理解工具", risk: "版权、费用、兼容与成功率未说明" },
      { id: "H5", name: "AI文化梗", videoIds: ["69d65879000000001d01e3fa"], structure: "荒诞物件 → 规则演示 → AI觉醒反转", signal: "分享与评论明显强于收藏型内容", diagnosis: "观众传播的是社会情境和立场", risk: "高传播不等于专业信任或转粉" },
      { id: "H6", name: "商业问题叙事", videoIds: ["69424c0d000000001e039745"], structure: "新闻警示 → 个人焦虑 → 多场景演示 → 品牌承诺", signal: "情绪与生活问题扩大受众", diagnosis: "产品能力被包进人物困境与陪伴叙事", risk: "公开点赞不能证明投流、转化或医学可信度" },
    ],
  },
  median: {
    conclusion: "中位内容通常不是做错了，而是完成度足够、放大条件不足：选题较普通、承诺通用、信息目标偏多，或行动路径没有闭环。",
    types: [
      { id: "M1", name: "标准新品教程", videoIds: ["67af1032000000001902d33d", "682a792f0000000021001039"], structure: "新能力承诺 → 单次成功演示 → 简化步骤 → 体验CTA", signal: "收藏高于点赞，但评论继续追问入口与条件", diagnosis: "有用但可替代，缺少独家实测与失败样本", risk: "生成因果与真实操作桥接不完整" },
      { id: "M2", name: "高收藏工具清单", videoIds: ["688445a10000000020019210"], structure: "数量钩子 → 工具A/B/C连续能力 → 开源CTA", signal: "收藏/赞高，被当作稍后研究索引", diagnosis: "保存没有转成即时认同与行动", risk: "正文缺教程、直达入口与工具条件" },
      { id: "M3", name: "完整长流程教程", videoIds: ["6928316c000000001e0397ba"], structure: "成品钩子 → 配置 → 框架 → 资产 → 迭代 → 模板", signal: "内容深度与评论需求都高", diagnosis: "前置配置长，首个成果与后续回报间隔过久", risk: "多个目标争夺注意力" },
      { id: "M4", name: "商业案例解决方案", videoIds: ["68663c61000000000b01dca6", "6832e96a000000002100405d"], structure: "真实损失/行业冲击 → 产品能力 → 品牌案例 → 结果或立场", signal: "一个偏效率保存，一个偏立场分享", diagnosis: "案例增强可信度，但商业属性限制自然传播", risk: "数据口径、真实交互与投放关系未知" },
      { id: "M5", name: "短效果演示", videoIds: ["663ac5da000000001e03437a"], structure: "视觉跃迁 → 降低门槛 → 扩展用途 → 评论区入口", signal: "结果易懂，收藏略高于点赞", diagnosis: "看懂结果却不知道如何行动", risk: "工具、步骤、输入类型与版本真实性未闭环" },
    ],
  },
  low: {
    conclusion: "低表现不是简单的‘质量差’，而是三种价值传递断裂：承诺比证据快、结果与路径脱节，或观点/商业主张超过平台可消化的信息负荷。",
    types: [
      { id: "L1", name: "强承诺轻教程", videoIds: ["6784e718000000000b0227d9", "67124e580000000021000df9", "66ee9136000000001201188a"], structure: "夸张结果 → 极简步骤 → 成片/CTA", signal: "标题承诺清楚，但绝对点赞仍低", diagnosis: "短并不等于低理解成本；输入、等待、失败与适用条件被跳过", risk: "一键、10秒、三步等承诺容易超过画面证据" },
      { id: "L2", name: "结果孤岛展示", videoIds: ["6726eb1c000000003c0175f3"], structure: "长段成片 → 情绪反应 → 缺少工具与路径", signal: "画面有吸引力，但没有形成保存理由", diagnosis: "观众知道‘效果存在’，却不知道‘我如何得到’", risk: "效果来源、角色授权与工具因果均未建立" },
      { id: "L3", name: "宽论点/商业信息过载", videoIds: ["66ac4e770000000027010f24", "66011c23000000000d00ed40", "684d1e96000000002100730b"], structure: "强观点/痛点 → 多组论据或产品能力 → 宏大判断", signal: "内容有知识量，但核心回报出现晚或可信度债务高", diagnosis: "需要同时理解行业背景、参数、证据与立场，不适合快速消费", risk: "时效、商业关系、外部数据和绝对化结论难核验" },
    ],
  },
};
const taxonomyById = new Map(Object.entries(taxonomy).flatMap(([tier, group]) => group.types.map((type) => [type.id, { ...type, tier }])));

const external = {
  "6928316c000000001e0397ba": {
    evidence: path.resolve(workspace, "artifacts/video-content-reconstruction-eval/dev-workflow/evidence-v2/evidence-pack.json"),
    reconstruction: path.resolve(workspace, "artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/reconstruction.json"),
    report: "../../../video-content-reconstruction-eval/dev-workflow/skill-run-v2/article.md",
    gate: path.resolve(workspace, "artifacts/video-content-reconstruction-eval/dev-workflow/evaluation-skill-v2/gate-report.json"),
  },
  "66011c23000000000d00ed40": {
    evidence: path.resolve(workspace, "artifacts/video-content-reconstruction-eval/dev-argument/evidence-v2/evidence-pack.json"),
    reconstruction: path.resolve(workspace, "artifacts/video-content-reconstruction-eval/dev-argument/skill-run-v2/reconstruction.json"),
    report: "../../../video-content-reconstruction-eval/dev-argument/skill-run-v2/article.md",
    gate: path.resolve(workspace, "artifacts/video-content-reconstruction-eval/dev-argument/evaluation-skill-v2/gate-report.json"),
  },
};

const firstExisting = (files) => files.find((file) => fs.existsSync(file));
const workspaceUrl = (file) => file.replace(workspace, "");
const toPageRelative = (url) => {
  if (typeof url !== "string") return url;
  if (url.startsWith("/artifacts/creator-research/ai-red-witch/")) {
    return "../" + url.slice("/artifacts/creator-research/ai-red-witch/".length);
  }
  if (url.startsWith("/artifacts/")) return "../../../" + url.slice("/artifacts/".length);
  return url;
};
const normalizeUnknown = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return String(value);
  const label = value.item ?? value.topic ?? value.claim ?? value.description ?? value.question ?? "未决问题";
  const scope = value.scope ?? value.status ?? value.reason ?? "";
  return scope ? `${label}（${scope}）` : label;
};

const videos = selection.map(({ id, typeId, mechanism, reason }) => {
  const video = library.videos.find((item) => item.id === id);
  if (!video) throw new Error(`Library video not found: ${id}`);

  const localRoot = path.resolve(researchRoot, "videos", id);
  const evidencePath = external[id]?.evidence ?? path.resolve(localRoot, "evidence/evidence-pack.json");
  const reconstructionPath = external[id]?.reconstruction ?? path.resolve(localRoot, "skill-run/reconstruction.json");
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const reconstruction = JSON.parse(fs.readFileSync(reconstructionPath, "utf8"));
  const gatePath = external[id]?.gate ?? firstExisting([
    path.resolve(localRoot, "evaluation-v4/gate-report.json"),
    path.resolve(localRoot, "evaluation-v3/gate-report.json"),
    path.resolve(localRoot, "evaluation-v2/gate-report.json"),
    path.resolve(localRoot, "evaluation/gate-report.json"),
  ]);
  const gate = gatePath ? JSON.parse(fs.readFileSync(gatePath, "utf8")) : null;
  const reportFile = firstExisting([
    path.resolve(localRoot, "skill-run/report.md"),
    path.resolve(localRoot, "skill-run/article.md"),
    path.resolve(localRoot, "skill-run/reconstruction-report.md"),
  ]);
  const reportPath = toPageRelative(external[id]?.report) ?? (reportFile ? toPageRelative(workspaceUrl(reportFile)) : null);
  const coreUnits = reconstruction.knowledgeUnits.filter((unit) => unit.importance === "core");
  const provenanceCounts = coreUnits.reduce((counts, unit) => {
    counts[unit.provenance] = (counts[unit.provenance] ?? 0) + 1;
    return counts;
  }, {});
  const evidenceRoot = path.dirname(evidencePath);
  const cues = (reconstruction.transcript?.cues ?? evidence.transcript?.cues ?? []).map((cue) => ({
    id: cue.id,
    start: cue.start,
    end: cue.end,
    text: cue.text,
    overlappingShots: cue.overlappingShots ?? [],
    frame: cue.representativeFrame ? toPageRelative(workspaceUrl(path.resolve(evidenceRoot, cue.representativeFrame))) : null,
  }));
  const frameUrl = (frame) => `../video-library/reports/${id}/${frame.src}`;

  return {
    id,
    typeId,
    formatType: taxonomyById.get(typeId)?.name ?? "未归类",
    mechanism,
    selectionReason: reason,
    title: video.title,
    tier: video.tier,
    primaryCategory: video.primaryCategory,
    publishedLabel: video.publishedLabel,
    duration: video.duration,
    engagement: video.engagement,
    sourceUrl: video.sourceUrl,
    reportUrl: `../video-library/${video.reportUrl}`,
    reconstructionReportUrl: reportPath,
    coreClaim: video.coreClaim,
    articleLead: video.articleLead,
    contentArchitecture: video.contentArchitecture,
    ready: gate?.ready === true,
    gateLabel: gate?.ready === true ? "硬闸通过" : "待复核",
    viewerChange: {
      before: reconstruction.viewerChange?.before ?? reconstruction.viewerChange?.from ?? "未记录",
      after: reconstruction.viewerChange?.after ?? reconstruction.viewerChange?.to ?? "未记录",
    },
    provenanceCounts,
    coreUnits: coreUnits.map((unit) => ({
      id: unit.id,
      title: unit.title,
      statement: unit.statement,
      provenance: unit.provenance,
      confidence: unit.confidence,
      timeRange: unit.timeRange,
      unknowns: unit.unknowns ?? [],
    })),
    unknowns: (reconstruction.coverageMatrix?.unknowns ?? []).map(normalizeUnknown),
    transcript: cues,
    sparseFrames: video.frames.sparse.map((frame, index) => ({ id: `S${index + 1}`, time: frame.time, src: frameUrl(frame) })),
    denseFrames: video.frames.dense.map((frame, index) => ({ id: `D${index + 1}`, time: frame.time, src: frameUrl(frame) })),
    sparseSheet: `../video-library/reports/${id}/${video.frames.sparseSheet}`,
    denseSheet: `../video-library/reports/${id}/${video.frames.denseSheet}`,
  };
});

const output = {
  doctrine: {
    corpus: "331 条公开笔记 / 318 条视频用于定位与数据分布",
    evidencePool: "21 条视频已完成内容还原与验证",
    focusSample: "高、中、低各 3 条，共 9 条进入主工作台",
  },
  taxonomy: Object.fromEntries(Object.entries(taxonomy).map(([tier, group]) => [tier, {
    conclusion: group.conclusion,
    types: group.types.map((type) => ({
      ...type,
      selectedVideoIds: type.videoIds.filter((id) => selection.some((item) => item.id === id)),
      videos: type.videoIds.map((id) => {
        const video = library.videos.find((item) => item.id === id);
        return {
          id,
          title: video.title,
          likes: video.engagement.likes,
          collections: video.engagement.collections,
          publishedLabel: video.publishedLabel,
          duration: video.duration,
          category: video.primaryCategory,
          selected: selection.some((item) => item.id === id),
          contentIntent: video.contentIntent,
          coreClaim: video.coreClaim,
          analysis: video.articleLead,
          boundary: video.boundary,
          keyPoints: video.keyPoints,
          cover: `../video-library/reports/${id}/${video.frames.sparse[0].src}`,
          reportUrl: `../video-library/${video.reportUrl}`,
        };
      }),
    })),
  }])),
  videos,
};

fs.writeFileSync(path.resolve(dashboardRoot, "focus-reconstruction.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${videos.length} focus videos; ${videos.filter((video) => video.ready).length} passed gates.`);
