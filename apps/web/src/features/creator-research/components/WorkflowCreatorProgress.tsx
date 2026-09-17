import type { CreatorWorkflowProgress } from "../model/workflow-progress";

export function WorkflowCreatorProgress({ value, compact = false }: { value?: CreatorWorkflowProgress; compact?: boolean }) {
  if (!value || (value.counts.total === 0 && !value.synthesis)) return null;
  const { counts } = value;
  const nodeLabel = (node: string | null, state: string, terminalStatus?: "original_reviewed" | "revised_unverified" | "review_incomplete") => {
    if (terminalStatus === "revised_unverified") return "修订已完成·未再次独立复核";
    if (terminalStatus === "original_reviewed") return "Reviewer 已完成·无意见";
    if (terminalStatus === "review_incomplete") return "独立复核未完成";
    if (node?.includes("source-check")) return "来源核对";
    if (node?.includes("repair")) return "定向修订中";
    if (node?.includes("review")) return "独立复核中";
    if (node?.includes("build")) return "构建中";
    return ({ queued: "等待执行", running: "执行中", waiting: "等待子任务", needs_review: "待处理",
      blocked: "受阻", failed: "失败", succeeded: "已完成", canceled: "已取消" } as Record<string, string>)[state] ?? state;
  };
  if (compact) return <small className="workflow-creator-progress workflow-creator-progress--compact">
    {counts.total > 0 && <>Workflow 单帖：{counts.reviewed} 已复核 · {counts.revised} 已按意见修订·未再次独立复核 · {counts.running} 执行 · {counts.needsReview + counts.failed} 待处理 · {counts.canceled} 已取消 · {counts.queued} 等待</>}
    {value.synthesis && <>{counts.total > 0 ? " · " : ""}博主综合：{nodeLabel(value.synthesis.currentNode, value.synthesis.state, value.synthesis.terminalStatus)}</>}
  </small>;
  return <section className="workflow-creator-progress" aria-label="Workflow 实时进度">
    <header><strong>Workflow 实时进度</strong><span>单帖执行槽：{value.activeSlots}/2</span></header>
    {counts.total > 0 && <p>单帖：{counts.built} 已生成，{counts.reviewed} 已复核，{counts.revised} 已按意见修订·未再次独立复核，{counts.running} 执行中，{counts.needsReview} 待复核处理，{counts.failed} 失败，{counts.canceled} 已取消，{counts.queued} 等待。</p>}
    {value.synthesis && <p>博主综合：{nodeLabel(value.synthesis.currentNode, value.synthesis.state, value.synthesis.terminalStatus)}</p>}
  </section>;
}
