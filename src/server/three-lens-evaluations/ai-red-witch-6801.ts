import { lensEvaluation, type ThreeLensIndependentEvaluation } from "./types.js";

const contentRules = [
  {
    ruleId: "CR-01", pass: true,
    note: "独立内容评测召回 13/13 个关键问题：排版失败签名、DeepSeek/WPS 身份、编辑后时间线、结果边界、音频作用与跨状态文本同一性均被回答或正确保留未知。",
    evidenceRefs: ["CUE-002", "TARGET-0003", "TARGET-0036", "TARGET-0055", "SRC-AUDIO-INSPECTION"], failedReason: null,
  },
  {
    ruleId: "CR-02", pass: true,
    note: "12/12 个独立审计核心单元均有有效时间范围和可解析 cue、shot、定向帧或 OCR；53 个唯一证据引用经独立时间码检查全部命中。",
    evidenceRefs: ["CUE-001", "CUE-004", "TARGET-0003", "TARGET-0023", "OCR-00361", "TARGET-0055"], failedReason: null,
  },
  {
    ruleId: "CR-03", pass: true,
    note: "事实性字幕/界面身份、画面观察、作者对普适性与省时的主张、系统对剪辑桥接的推断及未知分别保留；独立 unsupported-inference 错误率为 0/19。",
    evidenceRefs: ["CUE-002", "CUE-006", "TARGET-0036", "TARGET-0050", "TARGET-0055"], failedReason: null,
  },
  {
    ruleId: "CR-04", pass: true,
    note: "提示词、代码输出、预览/迁移与 WPS 结果的步骤依赖和 12 条知识关系均被恢复；复制、运行、粘贴等缺失桥接没有被邻接剪辑伪造成完整流程。",
    evidenceRefs: ["CUE-004", "CUE-005", "CUE-006", "TARGET-0033", "TARGET-0039", "TARGET-0045", "TARGET-0055"], failedReason: null,
  },
  {
    ruleId: "CR-05", pass: true,
    note: "可独立阅读全文覆盖全部核心知识单元；7 条从开头到结尾的完整逐字稿 cue 均带时间码、代表帧与 overlapping shots，未用摘要替代原话。",
    evidenceRefs: ["CUE-001", "CUE-002", "CUE-003", "CUE-004", "CUE-005", "CUE-006", "CUE-007"], failedReason: null,
  },
  {
    ruleId: "CR-06", pass: true,
    note: "载体、意义变化、关系、关键问题和核心证据 coverage matrix 均闭环；独立 meta-gate 无未检查通道，版本、隐蔽操作、适用性、字符同一性与音乐权属仍作为有界未知保留。",
    evidenceRefs: ["SRC-TARGETED", "SRC-AUDIO-INSPECTION", "CUE-001", "CUE-006", "CUE-007", "TARGET-0055"], failedReason: null,
  },
] as const;

const directingRules = [
  {
    ruleId: "DL-01", pass: true,
    note: "观看前的排版故障识别与观看后的 HTML 参数化解决认知明确不同，且开场失败画面、提示词和结果画面均提供直接证据。",
    evidenceRefs: ["CUE-001", "CUE-004", "CUE-006", "TARGET-0003", "TARGET-0023", "TARGET-0055"], failedReason: null,
  },
  {
    ruleId: "DL-02", pass: true,
    note: "七个连续意义阶段均有非零时间范围、观众问题、编导功能、认知变化和可解析证据，不是通用的钩子—正文—CTA 标签。",
    evidenceRefs: ["SHOT-001", "SHOT-004", "SHOT-005", "CUE-001", "CUE-007"], failedReason: null,
  },
  {
    ruleId: "DL-03", pass: true,
    note: "开场的免手工排版承诺映射到 25.5 秒后的格式化 WPS 结果；未展示的复制、运行和粘贴桥接被明确保留为未解决边界。",
    evidenceRefs: ["CUE-002", "TARGET-0003", "TARGET-0050", "TARGET-0055", "CUE-007"], failedReason: null,
  },
  {
    ruleId: "DL-04", pass: true,
    note: "评测逐段区分可见坏排版、提示词、代码和结果等画面证明，作者的普适/省时主张，以及对被剪操作顺序的系统推断。",
    evidenceRefs: ["TARGET-0003", "TARGET-0023", "TARGET-0033", "TARGET-0055", "SRC-TARGETED"], failedReason: null,
  },
  {
    ruleId: "DL-05", pass: true,
    note: "高密度参数段与被蒙太奇压缩的迁移段均具体说明了理解和复现成本，结尾重复价值的低负荷作用也已登记。",
    evidenceRefs: ["CUE-004", "TARGET-0025", "TARGET-0036", "TARGET-0045", "CUE-007"], failedReason: null,
  },
  {
    ruleId: "DL-06", pass: true,
    note: "七段按 0–29.067 秒有序衔接，覆盖失败识别、输入目标、参数、代码、迁移、结果和 CTA 的全部关键意义变化；技术切镜与意义段未混用。",
    evidenceRefs: ["SHOT-001", "SHOT-002", "SHOT-003", "SHOT-004", "SHOT-005"], failedReason: null,
  },
] as const;

const visualRules = [
  {
    ruleId: "VE-01", pass: true,
    note: "竖屏容器、人物/猫居家布景、圆形画中画、WPS/DeepSeek 主界面和烧录字幕的具体空间关系均已观察。",
    evidenceRefs: ["TARGET-0058", "TARGET-0012", "TARGET-0036", "TARGET-0067"], failedReason: null,
  },
  {
    ruleId: "VE-02", pass: true,
    note: "投影含 8 张稀疏导航帧及超过 100 张带独立时间码的定向密集帧，超过最低帧证据要求。",
    evidenceRefs: ["TARGET-0003", "TARGET-0023", "TARGET-0039", "TARGET-0055", "TARGET-0067"], failedReason: null,
  },
  {
    ruleId: "VE-03", pass: true,
    note: "七项关键画面主张均说明证明、教学、压缩或收束作用，并回指 frame、shot、OCR 或 cue；本次复核未发现悬空引用。",
    evidenceRefs: ["SHOT-002", "OCR-00361", "TARGET-0033", "TARGET-0045", "TARGET-0055"], failedReason: null,
  },
  {
    ruleId: "VE-04", pass: true,
    note: "7 条逐字稿 cue 均带代表帧和至少一个 overlapping shot；核心结论可从 cue 回到镜头证据。",
    evidenceRefs: ["CUE-001", "CUE-002", "CUE-003", "CUE-004", "CUE-005", "CUE-006", "CUE-007"], failedReason: null,
  },
  {
    ruleId: "VE-05", pass: true,
    note: "镜头统计披露 29.067 秒分析时长和 5 个技术观察段，同时明确技术边界不等于语义镜头，未用无分母的“快剪”结论代替测量。",
    evidenceRefs: ["SHOT-001", "SHOT-002", "SHOT-003", "SHOT-004", "SHOT-005"], failedReason: null,
  },
  {
    ruleId: "VE-06", pass: true,
    note: "失败文档、提示词、代码、预览选择、菜单和结果构成可检查的前/中/后状态；缺失点击与错误顺序已显式标成蒙太奇边界，未被编码为连续因果。",
    evidenceRefs: ["TARGET-0003", "TARGET-0023", "TARGET-0033", "TARGET-0039", "TARGET-0045", "TARGET-0055"], failedReason: null,
  },
  {
    ruleId: "VE-07", pass: true,
    note: "完整音轨已检查并记录持续氛围床、结尾重音及未发现独立 UI 动作声；曲目权属和极弱声音仍未知但未从覆盖中消失。",
    evidenceRefs: ["SRC-AUDIO-INSPECTION", "CUE-007", "TARGET-0067"], failedReason: null,
  },
] as const;

const aiRedWitch6801Evaluation = {
  videoId: "6801c0750000000007037156",
  creatorId: "ai-red-witch",
  evaluatorId: "product-depth-review/independent-three-lens-reviewer",
  version: "1.0.0",
  checkedAt: "2026-08-21T03:01:40+08:00",
  scope: "content-directing-and-visual",
  content: lensEvaluation(contentRules),
  directing: lensEvaluation(directingRules),
  visual: lensEvaluation(visualRules),
} as const satisfies ThreeLensIndependentEvaluation;

export { aiRedWitch6801Evaluation };
export default aiRedWitch6801Evaluation;
