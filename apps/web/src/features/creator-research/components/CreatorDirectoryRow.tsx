import { AlertTriangle, ArrowRight, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import type { CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction, CreatorSummary } from "../../../shared/contracts/core";
import { researchStageLabel } from "../model/creator-directory";
import type { CreatorWorkflowProgress } from "../model/workflow-progress";
import { WorkflowCreatorProgress } from "./WorkflowCreatorProgress";

function detailHref(run: CreatorResearchRun, operation?: CreatorRunOperation): string {
  const id = operation && operation.authorityState !== "canonical"
    ? run.id
    : run.canonicalSlug ?? run.creatorId ?? run.id;
  return `/creators/${encodeURIComponent(id)}?run=${encodeURIComponent(run.id)}`;
}

export function CreatorDirectoryRow({ run, creator, operation, workflowProgress, busy, completed, onOperate }: {
  run: CreatorResearchRun;
  creator?: CreatorSummary;
  operation?: CreatorRunOperation;
  workflowProgress?: CreatorWorkflowProgress;
  busy: boolean;
  completed: boolean;
  onOperate: (id: string, action: CreatorRunOperationAction) => Promise<void>;
}) {
  const work = run.videoWork;
  const blocker = run.blockers[0]?.message ?? operation?.waitingReason;
  const stageLabel = completed && run.status !== "reviewable" ? "研究已完成" : researchStageLabel(run);

  return <article className={`creator-directory-row creator-directory-row--${completed ? "complete" : "active"}`}>
    <div className="creator-directory-row__identity">
      <strong>{run.creatorName ?? creator?.name ?? "待识别博主"}</strong>
      <a href={run.profileUrl} target="_blank" rel="noreferrer" title={run.profileUrl}>小红书主页<ExternalLink size={12}/></a>
      {creator && <small>{creator.followers} 粉丝 · {creator.likesAndCollections} 赞藏</small>}
    </div>

    <div className="creator-directory-row__stage">
      <span>{stageLabel}</span>
      <b>{run.coverage.discoveredPosts} 篇作品 · {run.coverage.comparisonPosts} 篇进入比较</b>
      <WorkflowCreatorProgress value={workflowProgress} compact/>
    </div>

    <div className="creator-directory-row__video-work" aria-label="单帖构建任务">
      <small className="creator-directory-row__counts-label">单帖构建</small>
      <span><b>{work.queuedPosts}</b>待执行</span>
      <span><b>{work.activePostExternalIds.length}</b>执行中</span>
      <span><b>{work.analyzedPosts}</b>已构建</span>
      <span className={work.failedPosts ? "has-failure" : ""}><b>{work.failedPosts}</b>{work.failedPosts ? <Link to={`${detailHref(run, operation)}#portfolio`} title="进入帖子列表查看构建情况">失败 ↗</Link> : "失败"}</span>
    </div>

    <div className="creator-directory-row__action">
      <time dateTime={run.updatedAt}>更新于 {new Date(run.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
      {operation && operation.action !== "none" && <button type="button" disabled={busy} onClick={() => void onOperate(run.id, operation.action)}>
        {busy ? <LoaderCircle className="spin" size={13}/> : <RefreshCw size={13}/>} {busy ? "正在提交" : operation.actionLabel}
      </button>}
      <Link to={detailHref(run, operation)}>{completed ? "查看研究" : "查看任务"}<ArrowRight size={13}/></Link>
    </div>

    {blocker && <p className="creator-directory-row__blocker"><AlertTriangle size={13}/>{blocker}</p>}
  </article>;
}
