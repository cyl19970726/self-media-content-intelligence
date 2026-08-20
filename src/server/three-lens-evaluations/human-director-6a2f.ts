import { lensEvaluation, type ThreeLensIndependentEvaluation } from "./types.js";

const contentRules = [
  {
    ruleId: "CR-01", pass: true,
    note: "独立内容评测对关键问题召回为 15/15：开场业绩边界、起号第一步承诺、IP 十问、月更冲突、平台/投流主张和结尾未证明结果均被回答或正确承认未知。",
    evidenceRefs: ["CUE-001", "CUE-004", "CUE-024", "CUE-039", "CUE-050", "CUE-053", "TARGET-0001"], failedReason: null,
  },
  {
    ruleId: "CR-02", pass: true,
    note: "14/14 个独立审计核心单元具有可解析 cue/frame/OCR 证据；抽查开场、平台、Vlog、六类需求、投流与结尾时间码全部位于对应知识窗口。",
    evidenceRefs: ["CUE-001", "CUE-013", "CUE-025", "CUE-039", "CUE-048", "CUE-050", "CUE-053"], failedReason: null,
  },
  {
    ruleId: "CR-03", pass: true,
    note: "业绩拼贴和白板内容作为画面观察，收入前三、80%新人流量、养号/投流/盈利作为作者主张，缺失执行结果作为有范围的系统判断；独立 unsupported-inference 错误率为 0。",
    evidenceRefs: ["TARGET-0001", "CUE-001", "CUE-011", "CUE-047", "CUE-050", "CUE-053"], failedReason: null,
  },
  {
    ruleId: "CR-04", pass: true,
    note: "30 条观点关系恢复资源—用户—平台、定位—赛道—用户—需求以及内容质量对养号/投流的条件链；本片无程序型操作，未虚构教程依赖。",
    evidenceRefs: ["CUE-008", "CUE-029", "CUE-032", "CUE-039", "CUE-047", "CUE-050", "CUE-052"], failedReason: null,
  },
  {
    ruleId: "CR-05", pass: true,
    note: "独立阅读全文覆盖 21 个知识单元与主要冲突；53 条逐字稿 cue 覆盖 0.03–163.073 秒的开头和结尾，并保留代表帧及已修复的 overlapping shots。",
    evidenceRefs: ["CUE-001", "CUE-010", "CUE-025", "CUE-039", "CUE-050", "CUE-053"], failedReason: null,
  },
  {
    ruleId: "CR-06", pass: true,
    note: "独立 coverage/meta gate 均通过且无 unchecked channels；业绩归属、IP 十问精确分组、平台口径、月更冲突、投流参数与执行结果均继续作为有界未知，而非被整齐化补全。",
    evidenceRefs: ["CUE-001", "CUE-011", "CUE-024", "CUE-041", "CUE-047", "CUE-050", "CUE-053"], failedReason: null,
  },
] as const;

const directingRules = [
  {
    ruleId: "DL-01", pass: true,
    note: "观看前的个人偏好式创作起点与观看后的用户/资源/平台及价值需求框架明确不同，并由口播、白板和字幕证据支持。",
    evidenceRefs: ["CUE-005", "CUE-008", "CUE-029", "CUE-039", "SHOT-006", "SHOT-010"], failedReason: null,
  },
  {
    ruleId: "DL-02", pass: true,
    note: "十个有序阶段均具备时间范围、观众问题、编导功能、认知变化与证据，覆盖资格钩子、母命题、定位、赛道、用户、运营及商业尾声。",
    evidenceRefs: ["SHOT-001", "SHOT-006", "SHOT-009", "SHOT-010", "SHOT-012", "SHOT-013"], failedReason: null,
  },
  {
    ruleId: "DL-03", pass: true,
    note: "‘教会起号第一步’的承诺映射到人设/赛道/用户需求框架；没有定位产物、发布结果和 Vlog 方法被明确登记为部分兑现与续集延迟。",
    evidenceRefs: ["CUE-002", "CUE-004", "CUE-024", "CUE-028", "CUE-039", "CUE-053"], failedReason: null,
  },
  {
    ruleId: "DL-04", pass: true,
    note: "业绩拼贴、白板与字幕被限定为可见证据；收入排名、80%新人流量、养号与投流效果保持作者主张，外部有效性未被系统推断补齐。",
    evidenceRefs: ["TARGET-0001", "CUE-001", "CUE-011", "CUE-047", "CUE-050"], failedReason: null,
  },
  {
    ruleId: "DL-05", pass: true,
    note: "IP 问题密集且分组不清、白板小字、六项需求枚举与后段多概念连续切换均被具体评估为理解成本。",
    evidenceRefs: ["CUE-016", "CUE-024", "CUE-033", "CUE-039", "CUE-046", "SHOT-008", "SHOT-010"], failedReason: null,
  },
  {
    ruleId: "DL-06", pass: true,
    note: "十段按 0.03–163.073 秒有序衔接并覆盖全部关键意义变化；细小时间边界容差不造成语义重叠，技术 shot 未被冒充为编导阶段。",
    evidenceRefs: ["SHOT-001", "SHOT-003", "SHOT-006", "SHOT-007", "SHOT-009", "SHOT-010", "SHOT-012", "SHOT-013"], failedReason: null,
  },
] as const;

const visualRules = [
  {
    ruleId: "VE-01", pass: true,
    note: "9:16 竖屏、面罩主持人、固定白板/家居布景、底部字幕与黄色关键词的具体空间关系已登记。",
    evidenceRefs: ["SHOT-004", "SHOT-006", "SHOT-010", "TARGET-0005", "TARGET-0049"], failedReason: null,
  },
  {
    ruleId: "VE-02", pass: true,
    note: "投影提供覆盖全片的稀疏样本帧和 53 张逐字稿代表密集帧，数量与独立时间码均超过最低要求。",
    evidenceRefs: ["TARGET-0001", "TARGET-0017", "TARGET-0026", "TARGET-0033", "TARGET-0053"], failedReason: null,
  },
  {
    ruleId: "VE-03", pass: true,
    note: "八项画面主张逐项说明身份锚点、结果钩子、空间索引、手势强调、字幕、节奏边界与结尾缺失，并回指镜头/帧/cue。",
    evidenceRefs: ["SHOT-001", "SHOT-006", "SHOT-009", "SHOT-013", "TARGET-0053"], failedReason: null,
  },
  {
    ruleId: "VE-04", pass: true,
    note: "53 条产品 transcript cue 已全部从重建结果取得非空 overlappingShots；引用覆盖 SHOT-001 至 SHOT-013，且 13 个 ID 均能在 evidence pack 的镜头清单中解析。",
    evidenceRefs: ["CUE-001", "CUE-024", "CUE-039", "CUE-053", "SHOT-001", "SHOT-008", "SHOT-010", "SHOT-013"],
    failedReason: null,
  },
  {
    ruleId: "VE-05", pass: true,
    note: "技术镜头数、163.097 秒分析时长和每分钟切换分母均已披露，并明确 13 个技术边界不等于 13 个语义场景。",
    evidenceRefs: ["SHOT-001", "SHOT-006", "SHOT-007", "SHOT-010", "SHOT-013"], failedReason: null,
  },
  {
    ruleId: "VE-06", pass: true,
    note: "本片不是 UI 操作教程；白板圈画是唯一显著过程动作，分析没有从相邻截图或技术切分推导操作因果，故无未满足的适用程序链。",
    evidenceRefs: ["CUE-025", "CUE-026", "SHOT-009", "TARGET-0026"], failedReason: null,
  },
  {
    ruleId: "VE-07", pass: true,
    note: "AAC 音轨与口播主载体已确认，背景音乐、音效和转场作用无法可靠区分的部分被明确列为 unchecked；未知已被承认，不构成单独硬失败。",
    evidenceRefs: ["CUE-001", "CUE-053", "SHOT-001", "SHOT-013"], failedReason: null,
  },
] as const;

const humanDirector6a2fEvaluation = {
  videoId: "6a2fcd940000000007021a9f",
  creatorId: "human-director",
  evaluatorId: "product-depth-review/independent-three-lens-reviewer",
  version: "1.0.0",
  checkedAt: "2026-08-21T03:01:40+08:00",
  scope: "content-directing-and-visual",
  content: lensEvaluation(contentRules),
  directing: lensEvaluation(directingRules),
  visual: lensEvaluation(visualRules),
} as const satisfies ThreeLensIndependentEvaluation;

export { humanDirector6a2fEvaluation };
export default humanDirector6a2fEvaluation;
