import { Link } from "react-router-dom";
import type { PostWorkflowReading } from "../../shared/api/post-workflow-reading";

const phaseStateLabel: Record<string, string> = {
  queued: "待开始", running: "进行中", waiting: "等待下阶段", succeeded: "已完成",
  needs_review: "待处理", blocked: "已阻塞", failed: "未完成", canceled: "已取消"
};

export function workflowReviewLabel(reading: PostWorkflowReading): string {
  if (reading.candidate?.revisionStatus === "revision_unverified") return "修订稿尚未再次独立审阅";
  if (reading.candidate?.revisionStatus === "revision_recorded" && reading.candidate.reviewStatus !== "reviewed") return "修订稿尚未再次独立审阅";
  if (reading.candidate?.reviewStatus === "reviewed") return "独立复核已完成";
  if (reading.candidate?.reviewStatus === "findings") return "独立复核发现问题";
  if (reading.candidate?.reviewStatus === "pending") return "等待独立复核";
  return "复核状态未知";
}

export function PostWorkflowReadingPanel({ reading, creatorRunId, version, wantsCandidate, onVersionChange, candidateReady, baseReady, candidateError, baseError }: {
  reading: PostWorkflowReading; creatorRunId: string; version: "candidate" | "original"; wantsCandidate: boolean; onVersionChange: (next: "candidate" | "original") => void;
  candidateReady: boolean; baseReady: boolean; candidateError: string | null; baseError: string | null;
}) {
  const workflow = reading.workflow;
  const candidate = reading.candidate;
  const revised = candidate?.revisionStatus === "revision_recorded" || candidate?.revisionStatus === "revision_unverified";
  const originalLabel = reading.baseCandidate && baseReady ? "修订前报告" : "批次报告";
  const activeIndex = workflow && ["queued", "running", "waiting", "needs_review", "blocked"].includes(workflow.state)
    ? reading.phases.findIndex(phase => ["queued", "running", "waiting", "needs_review", "blocked"].includes(phase.state)) : -1;
  const currentPhase = activeIndex >= 0 ? reading.phases[activeIndex] : reading.phases.at(-1);
  const completedCount = reading.phases.filter(phase => phase.state === "succeeded").length;
  const progress = reading.phases.length ? `${completedCount}/${reading.phases.length} 步已完成${activeIndex >= 0 ? ` · 当前第 ${activeIndex + 1} 步` : ""}` : "阶段尚未登记";
  const headline = workflow?.state === "failed" ? "本次研究未完成" : workflow?.state === "canceled" ? "本次研究已取消"
    : workflow?.state === "succeeded" ? "研究流程已结束" : currentPhase ? `${currentPhase.title} · ${phaseStateLabel[currentPhase.state] ?? currentPhase.state}` : "研究流程准备中";
  return <section className="post-workflow-reading" aria-label="本次研究进度">
    <div className="post-workflow-reading__top"><div><span>本次研究 · {progress}</span><h2>{headline}</h2>
      <p>{candidate ? workflowReviewLabel(reading) : "当前显示批次报告；候选版本尚未可读。"}</p></div>
      {workflow && <span className={`post-workflow-reading__state post-workflow-reading__state--${workflow.state}`}>{phaseStateLabel[workflow.state] ?? workflow.state}</span>}
    </div>
    {reading.phases.length > 0 && <ol className="post-workflow-reading__phases">{reading.phases.map(phase => <li key={phase.id} className={`is-${phase.state}`}><span>{phaseStateLabel[phase.state] ?? phase.state}</span><b>{phase.reusedCandidate ? "复用已有候选" : phase.title}</b></li>)}</ol>}
    <div className="post-workflow-reading__versions"><span>阅读版本</span><div role="group" aria-label="选择报告版本">
      <button type="button" aria-pressed={version === "candidate"} disabled={!candidate || !candidateReady} onClick={() => onVersionChange("candidate")}>{revised ? "修订稿" : "当前候选"}</button>
      <button type="button" aria-pressed={version === "original"} onClick={() => onVersionChange("original")}>{originalLabel}</button>
    </div><p>{version === "candidate" && candidateReady ? workflowReviewLabel(reading)
      : wantsCandidate && candidate && !candidateReady && !candidateError ? "候选版本正在载入；下方暂显示批次报告。"
        : !wantsCandidate && reading.baseCandidate && !baseReady && !baseError ? "修订前报告正在载入；下方暂显示批次报告。"
          : `当前阅读${originalLabel}。新研究的状态见上方进度。`}</p></div>
    {candidateError && <p className="post-workflow-reading__error" role="alert">候选版本暂时无法读取：{candidateError}。可继续查看批次报告。</p>}
    {baseError && <p className="post-workflow-reading__error" role="alert">修订前报告暂时无法读取：{baseError}。可继续查看批次报告。</p>}
    {reading.dispositions.length > 0 && <details className="post-workflow-reading__changes"><summary>查看修改说明 · {reading.dispositions.length} 条</summary><ol>{reading.dispositions.map(item => <li key={item.id}><b>{item.status === "changed" ? "已修改" : item.status === "disputed" ? "保留异议" : "仍缺证据"}</b><p>{item.reason}</p></li>)}</ol></details>}
    {workflow && <details className="post-workflow-reading__audit"><summary>执行详情</summary><p>以下记录用于追溯流程，不改变下方报告正文。</p><ol>{reading.phases.map(phase => <li key={phase.id}>{phase.title} · {phaseStateLabel[phase.state] ?? phase.state}{phase.reason && ` · ${phase.reason}`}</li>)}</ol><Link to={`/workflow-runs/${encodeURIComponent(workflow.rootRunId)}?creatorRunId=${encodeURIComponent(creatorRunId)}`}>查看完整执行记录</Link></details>}
  </section>;
}
