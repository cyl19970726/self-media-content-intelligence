import { AlertTriangle, ArrowRight, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction } from "../../../shared/contracts/core";
import { completionNotice, creatorStatusLabels, failureReason, taskPhases } from "../model/creator-task-state";

export function CreatorRunRow({ run, operation, busy, onOperate }: {
  run: CreatorResearchRun;
  operation?: CreatorRunOperation;
  busy: boolean;
  onOperate: (id: string, action: CreatorRunOperationAction) => Promise<void>;
}) {
  const current = run.stages.find((stage) => stage.id === run.currentStage);
  const blocker = run.blockers[0];
  const diagnostic = blocker ? null : failureReason(run);
  const detailHref = `/creators/${encodeURIComponent(run.canonicalSlug ?? run.creatorId ?? run.id)}`;
  return <article className={`creator-run creator-run--${run.status}`}>
    <div className="creator-run__status">
      <span className={`status status--${run.status}`}><i/>{creatorStatusLabels[run.status]}</span>
      <time>{new Date(run.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
    </div>
    <div className="creator-run__main">
      <strong>{run.creatorName ?? "待识别博主"}</strong>
      <a href={run.profileUrl} target="_blank" rel="noreferrer">{run.profileUrl}<ExternalLink size={12}/></a>
      <p><b>{current?.label ?? "等待预检"}</b> · {run.nextAction}</p>
    </div>
    <div className="creator-run__coverage" aria-label="采集覆盖">
      <span><b>{operation?.coverage.discovered ?? run.coverage.discoveredPosts}</b>发现</span>
      <span><b>{operation ? `${operation.coverage.enriched}/${operation.coverage.enrichedTarget}` : run.coverage.enrichedPosts}</b>详情</span>
      <span><b>{operation ? `${operation.coverage.compared}/${operation.coverage.comparedTarget}` : run.coverage.comparisonPosts}</b>对比</span>
      <span><b>{operation ? `${operation.coverage.reconstructed}/${operation.coverage.reconstructedTarget}` : run.coverage.reconstructedPosts}</b>深度</span>
    </div>
    <div className="creator-run__pipeline" aria-label="分析阶段">
      {taskPhases(run).map((phase) => <span className={`creator-run__stage creator-run__stage--${phase.state}`} key={phase.id} title={phase.detail}>{phase.label}</span>)}
    </div>
    <footer>
      <span><ShieldCheck size={13}/>{run.collectionPolicy.adapter === "redfox" ? "REDFOX · 公开 API" : "EGO · 登录态核验"}</span>
      <span>WORKER · {run.worker.state.toUpperCase()} · ATTEMPT {run.worker.attempt}</span>
      {blocker && <span className={blocker.userActionRequired ? "creator-run__blocker creator-run__blocker--user" : "creator-run__blocker"}><AlertTriangle size={13}/>{blocker.message}</span>}
      {operation?.waitingReason && <span className="creator-run__waiting"><AlertTriangle size={13}/>{operation.waitingReason}</span>}
      {diagnostic && <span className="creator-run__diagnostic"><AlertTriangle size={13}/>原因：{diagnostic}</span>}
      {completionNotice(run) && <span className="creator-run__completion"><ShieldCheck size={13}/>{completionNotice(run)}</span>}
      {operation && operation.action !== "none" && <button type="button" className="creator-run__resume" disabled={busy} onClick={() => void onOperate(run.id, operation.action)}>
        {busy ? <LoaderCircle className="spin" size={12}/> : <RefreshCw size={12}/>}{busy ? "正在提交" : operation.actionLabel}
      </button>}
      <Link to={detailHref}>{run.status === "ready" ? "查看完成研究" : "查看任务详情"}<ArrowRight size={13}/></Link>
    </footer>
  </article>;
}
