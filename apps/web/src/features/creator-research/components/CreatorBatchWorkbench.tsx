import { AlertTriangle, ArrowRight, Database, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { CreatorResearchBatchItemProjection, CreatorResearchBatchProjection } from "../../../shared/contracts/core";
import { batchItemSignal, creatorStatusLabels } from "../model/creator-task-state";

type BatchFilter = "all" | "active" | "attention" | "ready";

const batchStatusLabel: Record<CreatorResearchBatchProjection["status"], string> = {
  queued: "等待开始", running: "正在分析", needs_user: "需要你处理", reviewable: "等待复核", ready: "全部完成",
  partial: "部分完成", failed: "批次失败", stale: "等待刷新"
};

function itemMatches(item: CreatorResearchBatchItemProjection, filter: BatchFilter): boolean {
  if (filter === "active") return ["queued", "preflight", "collecting", "backoff"].includes(item.status);
  if (filter === "attention") return ["needs_user", "reviewable", "failed", "stale"].includes(item.status);
  if (filter === "ready") return item.status === "ready";
  return true;
}

function BatchMemberSignal({ item }: { item: CreatorResearchBatchItemProjection }) {
  const signal = batchItemSignal(item);
  if (!signal) return null;
  const Icon = signal.kind === "progress" ? RefreshCw : AlertTriangle;
  return <p className={`batch-member__signal batch-member__signal--${signal.kind}`}><Icon className={signal.kind === "progress" ? "spin" : ""} size={12}/>{signal.label}：{signal.messages.join(" · ")}</p>;
}

function BatchPanel({ projection, filter }: { projection: CreatorResearchBatchProjection; filter: BatchFilter }) {
  const { batch, counts, items } = projection;
  const filtered = items.filter((item) => itemMatches(item, filter));
  return <details className="batch-panel" open={projection.status !== "ready"}>
    <summary><div className="batch-panel__identity"><span>{new Date(batch.createdAt).toLocaleDateString("zh-CN")}</span><h3>{batch.name}</h3><small>{projection.completedRuns}/{projection.totalRuns} 已到终态 · 更新于 {new Date(projection.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></div>
      <div className="batch-panel__progress"><b>{projection.progressPercent}%</b><span><i style={{ width: `${projection.progressPercent}%` }}/></span></div>
      <em className={`batch-state batch-state--${projection.status}`}>{batchStatusLabel[projection.status]}</em></summary>
    <div className="batch-panel__metrics" aria-label="批次进度汇总">
      <div><b>{projection.totalRuns}</b><span>全部</span></div><div><b>{counts.queued + counts.preflight + counts.collecting + counts.backoff}</b><span>进行中</span></div>
      <div><b>{counts.ready}</b><span>分析完成</span></div><div><b>{counts.reviewable}</b><span>等待复核</span></div><div><b>{counts.needsUser}</b><span>需要你处理</span></div><div><b>{counts.failed + counts.stale}</b><span>系统异常</span></div>
    </div>
    <div className="batch-member-list">{filtered.map((item) => <article key={item.runId}>
      <span className="batch-member__position">{String(item.position).padStart(2, "0")}</span><div><strong>{item.creatorName ?? "待识别博主"}</strong>
        <a href={item.profileUrl} target="_blank" rel="noreferrer">{item.profileUrl}<ExternalLink size={11}/></a><small>{item.nextAction}</small></div>
      <div className="batch-member__coverage"><span><b>{item.coverage.discoveredPosts}</b>发现</span><span><b>{item.coverage.enrichedPosts}</b>详情</span><span><b>{item.coverage.reconstructedPosts}</b>深度</span></div>
      <div className="batch-member__action"><em className={`status status--${item.status}`}><i/>{creatorStatusLabels[item.status]}</em><small>{item.adapter === "redfox" ? "REDFOX" : "EGO"}</small>
        <Link to={`/creators/${encodeURIComponent(item.runId)}`}>任务详情<ArrowRight size={12}/></Link></div>
      <BatchMemberSignal item={item}/>
    </article>)}</div>
    {filtered.length === 0 && <div className="batch-panel__empty"><ShieldCheck size={18}/>当前筛选下没有任务。</div>}
  </details>;
}

export function CreatorBatchWorkbench({ batches, loading, error, filter, onFilter, onRefresh }: {
  batches: CreatorResearchBatchProjection[] | null;
  loading: boolean;
  error: string | null;
  filter: BatchFilter;
  onFilter: (filter: BatchFilter) => void;
  onRefresh: () => Promise<void>;
}) {
  const visibleBatches = batches?.filter((batch) => filter === "all" || batch.items.some((item) => itemMatches(item, filter))) ?? null;
  return <section className="batch-workbench" aria-labelledby="batch-workbench-title">
    <header><div><span>CREATOR BATCH CONTROL</span><h2 id="batch-workbench-title">批次分析工作台</h2><p>每个博主独立推进；一个成员失败或需要接管，不会阻塞其余成员。</p></div>
      <button type="button" onClick={() => void onRefresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={14}/>刷新</button></header>
    <nav aria-label="批次任务筛选">{([['all', '全部'], ['active', '进行中'], ['attention', '需处理'], ['ready', '已完成']] as const).map(([value, label]) =>
      <button type="button" aria-pressed={filter === value} className={filter === value ? "is-active" : ""} onClick={() => onFilter(value)} key={value}>{label}</button>)}</nav>
    {error && <div className="batch-workbench__error" role="alert"><AlertTriangle size={15}/><span><b>批次账本暂时不可用</b>{error}</span><button type="button" onClick={() => void onRefresh()}>重新读取</button></div>}
    {batches === null && loading ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取批次账本</p></div>
      : visibleBatches && visibleBatches.length > 0 ? <div className="batch-panels">{visibleBatches.map((batch) => <BatchPanel projection={batch} filter={filter} key={batch.batch.id}/>)}</div>
        : !error && <div className="batch-workbench__empty"><Database size={22}/><h3>{batches?.length ? "当前筛选没有任务" : "还没有分析批次"}</h3><p>{batches?.length ? "切换筛选查看其他任务状态。" : "在上方粘贴 1–20 个博主主页，预检通过后一次创建。"}</p></div>}
  </section>;
}
