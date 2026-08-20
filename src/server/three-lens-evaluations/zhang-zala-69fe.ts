import { lensEvaluation, type ThreeLensIndependentEvaluation } from "./types.js";

const contentRules = [
  {
    ruleId: "CR-01", pass: true,
    note: "8/8 个探针关键问题均有去向：模板审美机制、AnyGen 路径、GitHub 路径、身份价值、OCR 与音频被回答，外部可用性和权利问题被正确标为 unknown。",
    evidenceRefs: ["CUE-001", "TARGET-0001", "CUE-018", "TARGET-0036", "CUE-037", "TARGET-0081", "SRC-OCR", "SRC-AUDIO"], failedReason: null,
  },
  {
    ruleId: "CR-02", pass: true,
    note: "10 个知识单元中 6 个 core 均有非空 timeRange 与证据；开场、双路径和结尾的 cue/frame/OCR 引用经本轮抽查可解析且落在 0–173.467 秒范围。",
    evidenceRefs: ["CUE-001", "TARGET-0001", "CUE-017", "TARGET-0036", "CUE-037", "TARGET-0081", "TARGET-0124"], failedReason: null,
  },
  {
    ruleId: "CR-03", pass: true,
    note: "知识单元显式使用 visual_observation、author_claim、system_inference 三种 provenance；模板数量、三轮生成、唯一性和客户感知未因结果画面而升级为事实，未知单列在各单元。",
    evidenceRefs: ["CUE-001", "TARGET-0001", "CUE-006", "CUE-016", "CUE-036", "CUE-047", "TARGET-0124"], failedReason: null,
  },
  {
    ruleId: "CR-04", pass: true,
    note: "5 条关系完整恢复了审美差距→模板资产→双路径→AnyGen/GitHub 分支→AI-native 价值；教程只恢复可见状态与最低操作顺序，提交、等待、clone 和 agent 执行仍保留为依赖缺口。",
    evidenceRefs: ["CUE-005", "CUE-006", "CUE-017", "CUE-018", "TARGET-0036", "CUE-037", "TARGET-0081", "CUE-047"], failedReason: null,
  },
  {
    ruleId: "CR-05", pass: true,
    note: "24,654 字节的独立阅读报告覆盖 10 个知识单元与关键边界；47/47 条逐字稿 cue 从 0 秒覆盖至 173.21 秒，并全部带代表帧和 overlapping shots。",
    evidenceRefs: ["CUE-001", "CUE-017", "CUE-018", "CUE-037", "CUE-043", "CUE-047"], failedReason: null,
  },
  {
    ruleId: "CR-06", pass: true,
    note: "7/7 个可用信息载体已检查，5 个意义变化、4 个探针关系、8 个关键问题和 47 条 cue 均在 coverage matrix 有记录；meta-gate 通过，费用、授权、版本、复现成本和客户效果仍为有界未知。",
    evidenceRefs: ["SRC-OCR", "SRC-AUDIO", "CUE-010", "CUE-016", "TARGET-0081", "CUE-047"], failedReason: null,
  },
] as const;

const directingRules = [
  {
    ruleId: "DL-01", pass: true,
    note: "观众由比较 AI Slides 审美差异，转为理解模板资产和两条使用路径；成品、模板、AnyGen 与 GitHub 证据共同支撑这一变化。",
    evidenceRefs: ["CUE-001", "CUE-017", "CUE-043", "TARGET-0001", "TARGET-0081"], failedReason: null,
  },
  {
    ruleId: "DL-02", pass: true,
    note: "六个连续阶段均有非零时间范围、具体观众问题、功能、认知变化和证据，覆盖成品钩子、资产解释、路径分流、双路径演示与身份收束。",
    evidenceRefs: ["SHOT-001", "SHOT-034", "SHOT-037", "SHOT-042", "SHOT-054"], failedReason: null,
  },
  {
    ruleId: "DL-03", pass: true,
    note: "好看原因与低/高门槛两条入口都获得对应回报；端到端复现与 AI-native 客户感知没有被伪装成已兑现，而被明确限定。",
    evidenceRefs: ["CUE-006", "CUE-017", "CUE-036", "CUE-043", "CUE-047"], failedReason: null,
  },
  {
    ruleId: "DL-04", pass: true,
    note: "模板与界面是可见证明，模板数量、三轮生成、唯一性和客户感知是作者主张，流程连续性与因果边界是受限推断；三类证据身份已分开。",
    evidenceRefs: ["TARGET-0016", "TARGET-0052", "TARGET-0097", "CUE-016", "CUE-047"], failedReason: null,
  },
  {
    ruleId: "DL-05", pass: true,
    note: "操作段的产品名、界面状态、仓库小字和被压缩执行环节被具体标为理解/复现成本；结果蒙太奇段的低理解负荷也已说明。",
    evidenceRefs: ["CUE-020", "CUE-039", "TARGET-0038", "TARGET-0081", "OCR-00264"], failedReason: null,
  },
  {
    ruleId: "DL-06", pass: true,
    note: "六段按 0–173.467 秒连续有序覆盖关键意义变化，阶段范围与成品蒙太奇、AnyGen 长镜头和 GitHub 路径的证据时间一致。",
    evidenceRefs: ["SHOT-001", "SHOT-036", "SHOT-037", "SHOT-039", "SHOT-043", "SHOT-054"], failedReason: null,
  },
] as const;

const visualRules = [
  {
    ruleId: "VE-01", pass: true,
    note: "竖屏中的横向演示带、上下黑色留白、右下角圆形真人画中画和字幕位置均为具体构图观察。",
    evidenceRefs: ["TARGET-0001", "TARGET-0038", "TARGET-0081", "TARGET-0117"], failedReason: null,
  },
  {
    ruleId: "VE-02", pass: true,
    note: "投影具有不少于 3 张稀疏帧及 128 张定向密集帧，时间码可区分并覆盖开场、双路径和结尾。",
    evidenceRefs: ["TARGET-0001", "TARGET-0038", "TARGET-0063", "TARGET-0097", "TARGET-0128"], failedReason: null,
  },
  {
    ruleId: "VE-03", pass: true,
    note: "七项后果性画面主张均说明其结果证明、节奏、教程或身份收束作用，并回指可解析的 frame、shot、OCR 或 cue。",
    evidenceRefs: ["SHOT-001", "SHOT-037", "SHOT-040", "TARGET-0117", "OCR-00345"], failedReason: null,
  },
  {
    ruleId: "VE-04", pass: true,
    note: "47 条逐字稿 cue 均持有代表帧与 overlapping shots；核心内容结论能够沿 cue 返回其镜头区间。",
    evidenceRefs: ["CUE-001", "CUE-017", "CUE-020", "CUE-036", "CUE-043", "CUE-047"], failedReason: null,
  },
  {
    ruleId: "VE-05", pass: true,
    note: "54 个技术镜头以完整 173.467 秒为分母，且分析明确区分前后蒙太奇与较长 UI 录屏，未用主观快慢替代测量。",
    evidenceRefs: ["SHOT-001", "SHOT-034", "SHOT-037", "SHOT-039", "SHOT-043", "SHOT-054"], failedReason: null,
  },
  {
    ruleId: "VE-06", pass: true,
    note: "AnyGen 路径包含模板选择、需求输入和完成态，GitHub 路径展示仓库、预览和说明状态；提交、等待、clone 与 agent 执行缺失被明确标为剪辑边界，未从邻接推导连续因果。",
    evidenceRefs: ["TARGET-0038", "TARGET-0044", "TARGET-0052", "TARGET-0063", "TARGET-0081", "TARGET-0097"], failedReason: null,
  },
  {
    ruleId: "VE-07", pass: true,
    note: "混合音轨机器检查确认持续语音主载体，并明确将背景音乐、UI 声和声源归属列为 unchecked；合同要求是分析或登记未知，不要求声源分离。",
    evidenceRefs: ["SRC-AUDIO", "CUE-001", "CUE-047"], failedReason: null,
  },
] as const;

const zhangZala69feEvaluation = {
  videoId: "69fe6f3a000000001a036be4",
  creatorId: "zhang-zala",
  evaluatorId: "product-depth-review/independent-three-lens-reviewer",
  version: "1.0.0",
  checkedAt: "2026-08-21T03:01:40+08:00",
  scope: "content-directing-and-visual",
  content: lensEvaluation(contentRules),
  directing: lensEvaluation(directingRules),
  visual: lensEvaluation(visualRules),
} as const satisfies ThreeLensIndependentEvaluation;

export { zhangZala69feEvaluation };
export default zhangZala69feEvaluation;
