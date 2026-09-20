import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ArtifactRelation, CallView, SafeArtifact, StageDetails, StageView } from "@signal-room/workflow-read-model/contracts";
import { appendWorkflowStageDetails, getWorkflowArtifactReader, getWorkflowReading, getWorkflowReadingChanges, getWorkflowStageDetails, mergeWorkflowReading, type CreatorPostGroup, type WorkflowReading } from "./workflow-runs-api";
import { getCreatorDossier, getCreatorResearchRun } from "../../shared/api/client";
import { originalPostReportHref } from "./model/presentation";
import type { VideoResearch } from "../../shared/contracts/core";
import type { WorkflowArtifactReader, WorkflowCreatorReaderData } from "../../shared/contracts/workflow-reader";
import "./workflow-reading.css";

const stateText: Record<string, string> = { queued: "等待执行", running: "执行中", waiting: "等待子流程", blocked: "已阻塞", needs_review: "待处理", succeeded: "执行完成", failed: "执行失败", canceled: "已取消", unknown: "未知" };
const factText: Record<string, string> = { unknown: "未知", pending: "待确认", valid: "有效", invalid: "未通过", passed: "已通过", findings: "有意见", not_applicable: "不适用", selected: "已选定", ambiguous: "版本未明确", missing: "尚无产物" };
const label = (value: string) => stateText[value] ?? factText[value] ?? value;
const clock = (value?: string) => value ? new Date(value).toLocaleString("zh-CN") : "未记录";
const assetKey = (asset: SafeArtifact) => `${asset.identity.id}:${asset.identity.revision}:${asset.identity.sha256}`;
type Readers = { PostReader?: ComponentType<{ data: VideoResearch }>; CreatorReader?: ComponentType<{ data: WorkflowCreatorReaderData }> };

function ArtifactLink({ asset, selected, readers, reviewText }: { asset: SafeArtifact; selected: boolean; readers: Readers; reviewText: string }) {
  const { PostReader, CreatorReader } = readers;
  const [reader, setReader] = useState<WorkflowArtifactReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasReader = asset.type === "post-candidate" && PostReader || asset.type === "creator-synthesis" && CreatorReader;
  const external = (asset as SafeArtifact & { scope?: string }).scope === "external";
  const auditHref = `/workflow-runs/${encodeURIComponent(asset.producer.runId)}?audit=1#artifact-${encodeURIComponent(asset.identity.id)}`;
  const load = async () => {
    if (reader || busy) return;
    setBusy(true);
    try { setReader(await getWorkflowArtifactReader(asset.producer.runId, asset.identity.id)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "产物暂时无法读取"); }
    finally { setBusy(false); }
  };
  return <li><span>{external && "外部输入 · "}{asset.type} · {asset.schemaVersion}{selected && " · 当前采用"}</span><small>结构 {label(asset.validation)} · {reviewText}</small>{hasReader ? <details onToggle={(event) => { if (event.currentTarget.open) void load(); }}><summary>阅读产物</summary>{busy && <p>正在读取…</p>}{error && <p className="workflow-error">{error}</p>}{reader?.kind === "post" && PostReader && <PostReader data={reader.data}/ >}{reader?.kind === "creator" && CreatorReader && <CreatorReader data={reader.data}/>}</details> : <Link to={auditHref}>在审计中查看产物</Link>}</li>;
}

function ArtifactLinks({ assets, relations = [], readers }: { assets: SafeArtifact[]; relations?: ArtifactRelation[]; readers: Readers }) {
  if (!assets.length) return <p className="workflow-empty">尚无可读产物。</p>;
  return <ul className="workflow-reading-assets">{assets.map((asset) => {
    const selection = relations.find((relation) => relation.kind === "selected" && relation.validity === "valid" && relation.to.id === asset.identity.id && relation.to.revision === asset.identity.revision && relation.to.sha256 === asset.identity.sha256);
    const reviewLinks = relations.filter(relation => relation.kind === "reviews" && relation.from.id === asset.identity.id);
    const reviewText = ["post-review", "creator-review"].includes(asset.type)
      ? reviewLinks.some(relation => relation.validity === "valid") ? `回执结论：${asset.review === "passed" ? "无意见" : label(asset.review)}` : "回执绑定尚未确认"
      : `审阅 ${label(asset.effectiveReview ?? "unknown")}`;
    return <ArtifactLink key={assetKey(asset)} asset={asset} selected={Boolean(selection)} readers={readers} reviewText={reviewText}/>;
  })}</ul>;
}

function CallRecord({ call, assets, relations, readers, retryContext, ordinal }: { call: CallView; assets: SafeArtifact[]; relations: ArtifactRelation[]; readers: Readers; retryContext?: string; ordinal?: number }) {
  const related = assets.filter((asset) => call.artifactIds.includes(asset.identity.id));
  return <div className="workflow-reading-call"><h4>{ordinal ? `第 ${ordinal} 个模型调用` : call.title ?? "子流程调度"}</h4><p>执行 {label(call.state)}{call.role === "agent" && <> · 结构 {label(call.validation)} · {call.reused ? "复用已有结果" : `模型 ${call.model ?? "未记录"} · 推理配置 ${call.reasoningEffort ?? "未记录"}`}</>}</p>{call.role === "agent" && <p>方法版本：{call.methodRevision ?? "未记录"} · 方法摘要：{call.methodDigest ?? "未记录"}</p>}{retryContext && <p className="workflow-reading-retry">{retryContext}</p>}{call.retryOf && <p className="workflow-reading-retry">本次调度重试前次调用：{call.retryReason ?? "原因未记录"}</p>}{call.inputArtifactIds.length > 0 && <details><summary>输入资产 · {call.inputArtifactIds.length} 项</summary><ArtifactLinks assets={assets.filter(asset => call.inputArtifactIds.includes(asset.identity.id))} relations={relations} readers={readers}/></details>}{call.role === "agent" && (call.attempts.length ? <ol>{call.attempts.map((attempt, index) => <li key={attempt.id}><strong>{call.attempts.length > 1 ? `调用内第 ${index + 1} 次尝试` : "执行尝试"} · {label(attempt.state)}</strong><span>{clock(attempt.startedAt)} → {clock(attempt.endedAt)}</span>{attempt.error && <p className="workflow-error">{attempt.error}</p>}{attempt.usage && <small>输入 {attempt.usage.inputTokens ?? "未知"} · 缓存 {attempt.usage.cachedInputTokens ?? "未知"} · 输出 {attempt.usage.outputTokens ?? "未知"}</small>}</li>)}</ol> : <p className="workflow-empty">尚未记录尝试。</p>)}<ArtifactLinks assets={related} relations={relations} readers={readers}/></div>;
}

function StageRecord({ stage, snapshot, runId, readers }: { stage: StageView; snapshot: WorkflowReading; runId: string; readers: Readers }) {
  const [details, setDetails] = useState<StageDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedFor = useRef<string | null>(null);
  const loadedCursor = useRef(snapshot.cursor);
  const load = useCallback(async (cursor?: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const next = await getWorkflowStageDetails(runId, stage.id, cursor);
      setDetails((current) => cursor && current ? appendWorkflowStageDetails(current, next) : next);
      loadedFor.current = stage.id;
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取阶段详情"); }
    finally { setLoading(false); }
  }, [loading, runId, stage.id]);
  useEffect(() => {
    if (loadedCursor.current === snapshot.cursor) return;
    loadedCursor.current = snapshot.cursor;
    if (loadedFor.current === stage.id) void load();
  }, [load, snapshot.cursor, stage.id]);
  const visibleAssets = snapshot.artifacts.filter((asset) => stage.artifactIds.includes(asset.identity.id));
  const calls = details?.calls ?? snapshot.calls.filter((call) => stage.callIds.includes(call.id));
  const assets = details?.artifacts ?? visibleAssets;
  const agents = calls.map((call, index) => ({ call, index })).filter(({ call }) => call.role === "agent").sort((a, b) => {
    const started = (call: CallView) => call.attempts.map((attempt) => attempt.startedAt ? Date.parse(attempt.startedAt) : NaN).find(Number.isFinite);
    const left = started(a.call), right = started(b.call);
    return left !== undefined && right !== undefined ? left - right : a.index - b.index;
  });
  const controls = calls.filter((call) => call.role === "workflow");
  const executionCount = agents.reduce((count, { call }) => count + call.attempts.length, 0);
  const countText = executionCount ? `已记录 ${executionCount} 次模型执行${agents.some(({ call }) => !call.attempts.length) ? "；部分调用未记录尝试" : ""}` : `已登记 ${agents.length} 个模型调用，执行尝试尚未记录`;
  const retryContext = (call: CallView) => {
    const parent = controls.find((control) => control.childRunIds.includes(call.runId));
    return parent?.retryOf ? `此调用属于重试子流程：${parent.retryReason ?? "原因未记录"}；前次结果保留在调度记录中。` : undefined;
  };
  return <details className="workflow-reading-stage" onToggle={(event) => { if (event.currentTarget.open && loadedFor.current !== stage.id) void load(); }}><summary><span className={`workflow-state workflow-state--${stage.state}`}>{label(stage.state)}</span><strong>{stage.title}</strong><small>{stage.purpose}</small></summary><div className="workflow-reading-stage-body"><p>结构 {label(stage.validation)} · 审阅 {label(stage.review)} · 交付 {label(stage.delivery)}</p>{stage.waitingForRunId && <p>正在等待关联子流程完成。</p>}<p>开始：{clock(stage.startedAt)} · 结束：{clock(stage.endedAt)}</p>{stage.expectedArtifacts.length > 0 && <ul className="workflow-reading-expected">{stage.expectedArtifacts.map((expected) => <li key={expected.role}>{expected.title ?? expected.role} · {expected.missing ? expected.required ? "预期未产出" : "尚未产出" : "已登记"}</li>)}</ul>}<h3>实际执行</h3>{agents.length ? <><p className="workflow-reading-count">{countText}{details?.nextCursor ? "（已加载部分记录）" : ""}；失败尝试和重试结果均保留。</p>{agents.map(({ call }, index) => <CallRecord key={call.id} call={call} ordinal={index + 1} retryContext={retryContext(call)} assets={snapshot.artifacts} relations={snapshot.relations} readers={readers}/>)}</> : <p className="workflow-empty">尚无模型执行记录。</p>}{details?.nextCursor && <button disabled={loading} onClick={() => void load(details.nextCursor)}>加载更多调用</button>}{controls.length > 0 && <details className="workflow-reading-controls"><summary>子流程调度 · {controls.length} 条</summary>{controls.map((call) => <CallRecord key={call.id} call={call} assets={snapshot.artifacts} relations={snapshot.relations} readers={readers}/>)}</details>}<h3>阶段产物</h3><ArtifactLinks assets={assets} relations={snapshot.relations} readers={readers}/>{error && <p className="workflow-error">{error}</p>}</div></details>;
}

const activeState = (state: string) => ["running", "waiting", "blocked", "needs_review"].includes(state);

function CreatorPost({ group, index, stages, snapshot, runId, readers, title }: { group: CreatorPostGroup; index: number; stages: StageView[]; snapshot: WorkflowReading; runId: string; readers: Readers; title?: string }) {
  const groupStages = stages.filter((stage) => group.stageIds.includes(stage.id));
  const current = groupStages.find((stage) => activeState(stage.state));
  // A parent phase remains waiting while its child builder is running. The
  // server projects that live descendant state onto the group row.
  const state = group.state === "running" ? "running" : current?.state ?? group.state;
  const [open, setOpen] = useState(() => state === "running");
  return <details className="workflow-reading-post" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span className={`workflow-state workflow-state--${state}`}>{label(state)}</span><strong>{title ?? `帖子 ${index + 1}`}</strong>{!title && <code>{group.postId}</code>}<small>{current ? `当前：${current.title}` : groupStages.length ? `${groupStages.length} 个已登记阶段` : "等待登记阶段"}</small></summary>
    <div className="workflow-reading-post-body"><small>帖子编号：{group.postId}</small>{groupStages.length ? groupStages.map((stage) => <StageRecord key={stage.id} stage={stage} snapshot={snapshot} runId={runId} readers={readers}/>) : <p className="workflow-empty">该帖子尚未登记阶段。</p>}</div>
  </details>;
}

function CreatorResearchPath({ groups, stages, snapshot, runId, readers, postTitles }: { groups: CreatorPostGroup[]; stages: StageView[]; snapshot: WorkflowReading; runId: string; readers: Readers; postTitles: Map<string, string> }) {
  const runs = new Map(snapshot.runs.map((run) => [run.id, run]));
  const descendantOf = (runId: string, ancestorIds: Set<string>) => {
    let current = runs.get(runId); const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      if (ancestorIds.has(current.id)) return true;
      seen.add(current.id); current = current.parentRunId ? runs.get(current.parentRunId) : undefined;
    }
    return false;
  };
  const postStageIds = new Set(groups.flatMap((group) => group.stageIds));
  const synthesisRuns = new Set(snapshot.runs.filter((run) => run.workflowId === "creator.synthesize").map((run) => run.id));
  const synthesisStages = stages.filter((stage) => !postStageIds.has(stage.id) && (stage.phaseKey === "creator-synthesis" || descendantOf(stage.runId, synthesisRuns)));
  const frozenStages = stages.filter((stage) => !postStageIds.has(stage.id) && stage.phaseKey === "freeze-synthesis-inputs");
  const coordinationStages = stages.filter((stage) => !postStageIds.has(stage.id) && !frozenStages.some((candidate) => candidate.id === stage.id) && !synthesisStages.some((candidate) => candidate.id === stage.id));
  return <section className="workflow-reading-path workflow-reading-path--creator">
    <header className="workflow-reading-section-heading"><span>单帖研究</span><h2>逐帖执行情况</h2><p>每篇帖子单独展开；技术细节仍保留在阶段内和高级审计中。</p></header>
    <div className="workflow-reading-posts">{groups.map((group, index) => <CreatorPost key={group.rootRunId} group={group} index={index} stages={stages} snapshot={snapshot} runId={runId} readers={readers} title={postTitles.get(group.postId)}/>)}</div>
    {coordinationStages.length > 0 && <details className="workflow-reading-coordination"><summary>单帖研究调度详情</summary>{coordinationStages.map((stage) => <StageRecord key={stage.id} stage={stage} snapshot={snapshot} runId={runId} readers={readers}/>)}</details>}
    <section className="workflow-reading-section-group"><header className="workflow-reading-section-heading"><span>汇总本轮结果</span><h2>汇总前的准备</h2></header>{frozenStages.length ? frozenStages.map((stage) => <StageRecord key={stage.id} stage={stage} snapshot={snapshot} runId={runId} readers={readers}/>) : <p className="workflow-empty">等待单帖研究完成后开始。</p>}</section>
    <section className="workflow-reading-section-group"><header className="workflow-reading-section-heading"><span>博主综合</span><h2>跨帖子结论</h2></header>{synthesisStages.length ? synthesisStages.map((stage) => <StageRecord key={stage.id} stage={stage} snapshot={snapshot} runId={runId} readers={readers}/>) : <p className="workflow-empty">等待单帖研究形成可用输入后开始。</p>}</section>
  </section>;
}

export function WorkflowReadingPage({ runId, PostReader, CreatorReader }: { runId: string } & Readers) {
  const [search] = useSearchParams();
  const [snapshot, setSnapshot] = useState<WorkflowReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportHref, setReportHref] = useState<string | null>(null);
  const [postTitles, setPostTitles] = useState<Map<string, string>>(new Map());
  const loading = useRef(false);
  const reload = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try { setSnapshot(await getWorkflowReading(runId)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取执行记录"); }
    finally { loading.current = false; }
  }, [runId]);
  useEffect(() => { setSnapshot(null); void reload(); }, [reload]);
  const creatorRunId = snapshot?.subject?.creatorRunId;
  const postId = snapshot?.subject?.postId;
  useEffect(() => {
    let current = true;
    setReportHref(null);
    setPostTitles(new Map());
    if (!creatorRunId) return;
    getCreatorResearchRun(creatorRunId).then((owner) => {
      if (!current) return;
      if (postId) setReportHref(originalPostReportHref(owner.creatorId, creatorRunId, postId));
      if (!owner.creatorId) return;
      void getCreatorDossier(owner.creatorId).then((dossier) => {
        if (!current) return;
        setPostTitles(new Map(dossier.portfolio.items.flatMap((item) => item.title ? [[item.id, item.title] as const] : [])));
      }).catch(() => { /* IDs remain visible if the public source index is unavailable. */ });
    }).catch(() => { /* The execution record remains readable if its report owner is unavailable. */ });
    return () => { current = false; };
  }, [creatorRunId, postId]);
  useEffect(() => {
    if (!snapshot) return;
    const poll = async () => {
      if (document.visibilityState !== "visible" || loading.current) return;
      loading.current = true;
      try {
        const changes = await getWorkflowReadingChanges(runId, snapshot.cursor);
        if (changes.resetRequired) setSnapshot(await getWorkflowReading(runId));
        else setSnapshot(mergeWorkflowReading(snapshot, changes));
        setError(null);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "无法更新执行记录"); }
      finally { loading.current = false; }
    };
    const timer = window.setInterval(() => void poll(), 5000);
    document.addEventListener("visibilitychange", poll);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [runId, snapshot]);
  if (!snapshot) return <main className="workflow-reading-page"><p>{error ?? "正在读取本次研究的执行记录…"}</p><button onClick={() => void reload()}>刷新</button></main>;
  const root = snapshot.runs.find((run) => run.id === snapshot.rootRunId);
  const selected = snapshot.runs.find((run) => run.id === snapshot.selectedRunId);
  const readerStages = snapshot.stages.filter(stage => stage.audience !== "audit");
  const auditStages = snapshot.stages.filter(stage => stage.audience === "audit");
  const creatorPostGroups = snapshot.creatorPostGroups ?? [];
  const active = readerStages.find((stage) => creatorPostGroups.some((group) => group.stageIds.includes(stage.id)) && activeState(stage.state))
    ?? readerStages.find((stage) => activeState(stage.state));
  const completedPosts = creatorPostGroups.filter((group) => group.state === "succeeded").length;
  const runningPosts = creatorPostGroups.filter((group) => group.state === "running").length;
  const progress = snapshot.progress;
  const progressText = creatorPostGroups.length
    ? `单帖研究：${completedPosts} / ${creatorPostGroups.length} 篇完成${runningPosts ? `；${runningPosts} 篇正在执行` : ""}`
    : progress.closed ? progress.planned !== undefined ? `${progress.completed} / ${progress.planned} 个计划阶段完成` : `流程已结束，共登记 ${progress.registered} 个阶段，其中 ${progress.completed} 个完成` : `已登记 ${progress.registered} 个阶段，其中 ${progress.completed} 个完成；后续阶段数尚未确定`;
  const delivery = (snapshot as WorkflowReading & { delivery?: { state: "missing" | "unknown" | "ambiguous" | "selected"; artifactIds: string[] } }).delivery;
  const deliveryText = delivery?.state === "ambiguous" ? "当前交付版本未明确（存在多个候选）" : delivery?.state === "selected" ? "当前交付版本已明确" : delivery?.state === "missing" ? "尚无可交付版本" : delivery?.state === "unknown" ? "交付版本关系未记录" : null;
  const auditHref = `/workflow-runs/${encodeURIComponent(runId)}?${new URLSearchParams({ ...(search.get("creatorRunId") ? { creatorRunId: search.get("creatorRunId")! } : {}), audit: "1" })}`;
  const creatorDelivery = creatorPostGroups.length
    ? snapshot.artifacts.some((asset) => asset.type === "creator-synthesis" && asset.scope !== "external") ? "博主综合已产出，详见综合阶段。" : "博主综合尚未产出。"
    : deliveryText;
  return <main className="workflow-reading-page"><nav className="breadcrumb"><Link to="/workflow-runs">全部历史任务</Link><span>/</span><b>本次研究</b></nav><header className="workflow-reading-hero"><div><span>WORKFLOW RECORD</span><h1>{snapshot.title ?? "本次研究的执行记录"}</h1><p>{progressText}</p>{creatorDelivery && <p className={`workflow-reading-delivery workflow-reading-delivery--${delivery?.state}`}>{creatorDelivery}</p>}{active && !creatorPostGroups.length && <p>当前：{active.title} · {label(active.state)}{active.waitingForRunId ? "，正在等待子流程" : ""}</p>}{reportHref && <Link to={`${reportHref}&workflow=${encodeURIComponent(runId)}`}>打开报告工作台</Link>}</div><span className={`workflow-state workflow-state--${root?.state ?? "unknown"}`}>{label(root?.state ?? "unknown")}</span></header>{error && <p className="workflow-error">{error} <button onClick={() => void reload()}>刷新</button></p>}{selected && selected.id !== snapshot.rootRunId && <p>当前入口位于子流程 {selected.workflowId}；下方展示所属研究的完整执行经过。</p>}{creatorPostGroups.length ? <CreatorResearchPath groups={creatorPostGroups} stages={readerStages} snapshot={snapshot} runId={runId} readers={{ PostReader, CreatorReader }} postTitles={postTitles}/> : <section className="workflow-reading-path"><h2>研究路径</h2>{readerStages.length ? readerStages.map((stage) => <StageRecord key={stage.id} stage={stage} snapshot={snapshot} runId={runId} readers={{ PostReader, CreatorReader }}/>) : <p className="workflow-empty">{root && ["succeeded", "failed", "canceled"].includes(root.state) ? "这条历史运行没有登记阶段；可在高级审计查看执行和资产记录。" : "研究尚未登记阶段。执行开始后会在这里显示。"}</p>}</section>}<details className="workflow-reading-audit"><summary>高级审计</summary>{auditStages.map(stage => <StageRecord key={stage.id} stage={stage} snapshot={snapshot} runId={runId} readers={{ PostReader, CreatorReader }}/>) }<p>技术步骤、原始事件和旧版历史资产记录可在完整详情中查看。</p><Link to={auditHref}>打开完整审计记录</Link></details></main>;
}
