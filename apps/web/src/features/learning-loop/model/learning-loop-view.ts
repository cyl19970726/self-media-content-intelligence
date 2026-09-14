import type { LearningLoopRun, LearningLoopStatus } from "../../../shared/contracts/core";

export const learningLoopStatusCopy: Record<LearningLoopStatus, { label: string; detail: string }> = {
  draft: { label: "准备中", detail: "正在固定本轮问题和输入。" },
  sampling: { label: "选择样本", detail: "正在区分开发样本与未参与优化的保留样本。" },
  creator_running: { label: "分析博主", detail: "正在生成博主基本盘。" },
  video_evaluating: { label: "核验视频", detail: "正在核验内容还原、编导逻辑、画面剪辑。" },
  blind_testing: { label: "真实用户试用", detail: "独立用户只看工作台，不看答案和内部材料。" },
  diagnosing: { label: "定位问题", detail: "失败已发生，正在判断是内容、证据还是产品呈现问题。" },
  repair_queued: { label: "等待修复回归", detail: "已形成明确修复项；尚未通过第二轮盲测。" },
  regression_testing: { label: "回归验证", detail: "同时检查已修问题与未参与优化的保留样本。" },
  observation_adjudicating: { label: "独立裁决", detail: "只有新认知证据充分时才允许进入研究方法。" },
  promoted: { label: "已晋升", detail: "本轮认知已经独立裁决，可用于后续研究。" },
  completed_no_promotion: { label: "完成，不晋升", detail: "产品变好了，但没有足够证据形成新的研究认知。这是合法结果。" },
  blocked: { label: "等待条件", detail: "缺少必要授权、媒体或证据，系统没有补造结论。" },
  failed: { label: "运行失败", detail: "执行失败，原因已保留。" },
  stale: { label: "输入已变化", detail: "上游内容发生变化，旧结论不能直接沿用。" }
};

export function deriveLearningLoopSummary(run: LearningLoopRun) {
  const failedGateCount = run.gates.filter((gate) => !gate.pass).length;
  const isProductBlind = run.policyVersion.startsWith("product-blind/");
  const blindTestLabel = run.blindTraces.length === 0
    ? "待执行"
    : run.blindTraces.every((trace) => trace.pass === true) ? "已通过" : "未完成闭环";
  return {
    failedGateCount,
    blindTaskPassed: run.blindTraces.length > 0 && run.blindTraces.every((trace) => trace.pass === true),
    blindTestLabel,
    researchPromotionLabel: isProductBlind ? "禁止晋升" : run.status === "promoted" ? "已晋升" : "尚未晋升",
    isProductBlind
  };
}
