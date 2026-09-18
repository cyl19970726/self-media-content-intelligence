import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, LoaderCircle, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { cancelWorkflowRun, getWorkflowArtifact, getWorkflowArtifactReader, getWorkflowEvents, getWorkflowRun, listWorkflowRuns, retryWorkflowStep } from "./workflow-runs-api";
import type { WorkflowArtifact, WorkflowEvent, WorkflowPhase, WorkflowRunDetail, WorkflowRunRecord, WorkflowStepRecord } from "./model/contracts";
import type { VideoResearch } from "../../shared/contracts/core";
import { getCreatorResearchRun, getVideoResearch } from "../../shared/api/client";
import type { WorkflowArtifactReader, WorkflowCreatorReaderData } from "../../shared/contracts/workflow-reader";
import { activeWorkflowState, artifactLabel, attemptPresentation, emptyArtifactMessage, eventSummary, isKnownArtifactType, originalPostReportHref, reusedCandidateWithoutModel, stepCanRetry, stepLabel, stepSummary, workflowReaderLabel, workflowStateLabel } from "./model/presentation";
import "./workflow-runs.css";
import { WorkflowReadingPage } from "./WorkflowReadingPage";

function ArtifactPayload({ ownerRunId, artifact, anchor: suppliedAnchor, PostReader, CreatorReader }: { anchor?: string; ownerRunId: string; artifact: WorkflowArtifact; PostReader?: ComponentType<{ data: VideoResearch }>; CreatorReader?: ComponentType<{ data: WorkflowCreatorReaderData }> }) {
  const location = useLocation();
  const navigate = useNavigate();
  const anchor = suppliedAnchor ?? `artifact-${artifact.id}`;
  const [expanded, setExpanded] = useState(location.hash === `#${anchor}`);
  const element = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (location.hash === `#${anchor}`) {
      setExpanded(true);
      element.current?.scrollIntoView({ block: "start" });
    }
  }, [location.hash, anchor]);
  const [payload, setPayload] = useState<unknown>();
  const [readerData, setReaderData] = useState<WorkflowArtifactReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    if (payload !== undefined || error) return;
    try {
      if (artifact.type === "post-candidate" || artifact.type === "creator-synthesis") {
        const reader = await getWorkflowArtifactReader(ownerRunId, artifact.id);
        setReaderData(reader); setPayload(null);
        return;
      }
      setPayload((await getWorkflowArtifact(ownerRunId, artifact.id)).payload);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取资产"); }
  };
  return <details ref={element} id={anchor} open={expanded} className={`workflow-artifact${artifact.type === "post-candidate" || artifact.type === "creator-synthesis" ? " workflow-artifact--post-candidate" : ""}`} onToggle={(event) => { const open = event.currentTarget.open; setExpanded(open); if (open) { void load(); if (location.hash !== `#${anchor}`) void navigate({ pathname: location.pathname, search: location.search, hash: anchor }, { replace: true, preventScrollReset: true }); } }}>
    <summary>{artifactLabel(artifact)}</summary>
    {error && <p className="workflow-error">{error}</p>}
    {payload !== undefined && (artifact.type === "post-candidate"
      ? readerData?.kind === "post" && PostReader ? <PostReader data={readerData.data}/> : <p className="workflow-empty">候选报告读者投影尚未取得；已保留资产，但不会用原始递归 JSON 冒充报告。</p>
      : artifact.type === "creator-synthesis" ? readerData?.kind === "creator" && CreatorReader ? <CreatorReader data={readerData.data}/> : <p className="workflow-empty">博主综合候选读者投影尚未取得；已保留资产，但不会用原始结构冒充研究报告。</p>
      : artifact.type === "post-source-check" ? <SourceCheckContent value={payload}/>
      : artifact.type === "post-review" || artifact.type === "creator-review" ? <ResearchReviewContent value={payload}/>
      : artifact.type === "research-revision" ? <ResearchRevisionContent value={payload}/>
      : isKnownArtifactType(artifact.type)
      ? <><dl><div><dt>资产版本</dt><dd>{artifact.revision}</dd></div><div><dt>依赖资产</dt><dd>{artifact.dependsOn.length}</dd></div><div><dt>完整性摘要</dt><dd>{artifact.sha256.slice(0, 12)}</dd></div></dl><ArtifactContent value={payload}/></>
      : <pre aria-label="未知资产 JSON">{JSON.stringify(payload, null, 2)}</pre>)}
  </details>;
}

type ResearchFinding = { id: string; location: string; issue: string; evidenceRefs: string[]; suggestedChange: string; priority: "minor" | "major"; kind: "content" | "missing_evidence" };
type ResearchReviewPayload = { kind: "research-review"; schemaVersion: "research-review@1"; subjectKind: "post" | "creator"; summary: string; findings: ResearchFinding[] };
type ResearchDisposition = { id: string; status: "changed" | "disputed" | "missing_evidence"; reason: string };
type ResearchRevisionPayload = { kind: "research-revision"; schemaVersion: "research-revision@1"; dispositions: ResearchDisposition[]; validation: { valid: true } };

function researchReview(value: unknown): ResearchReviewPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Partial<ResearchReviewPayload>;
  return payload.kind === "research-review" && payload.schemaVersion === "research-review@1"
    && typeof payload.summary === "string" && Array.isArray(payload.findings) ? payload as ResearchReviewPayload : null;
}

function ResearchReviewContent({ value }: { value: unknown }) {
  const review = researchReview(value);
  if (!review) return <section className="workflow-research-review workflow-research-review--incomplete"><header><strong>复核未完成</strong><p>复核结果没有通过公开阅读合同，候选报告仍保持原状态。</p></header></section>;
  const hasFindings = review.findings.length > 0;
  return <section className={`workflow-research-review workflow-research-review--${hasFindings ? "findings" : "clear"}`} aria-label="研究复核结果"><header><span>独立 Reviewer</span><strong>{hasFindings ? "复核完成 · 需要修订" : "复核完成 · 未发现问题"}</strong><p>{review.summary}</p></header>{hasFindings && <ol>{review.findings.map((finding) => <li key={finding.id}><div className="workflow-review-finding-meta"><b>{finding.priority === "major" ? "主要问题" : "次要问题"}</b><span>{finding.kind === "missing_evidence" ? "缺少证据" : "内容问题"}</span><code>{finding.location}</code></div><h4>{finding.issue}</h4><p><b>建议修改：</b>{finding.suggestedChange}</p>{finding.evidenceRefs.length > 0 && <p className="workflow-review-evidence"><b>核查依据：</b>{finding.evidenceRefs.map((ref) => <code key={ref}>{ref}</code>)}</p>}</li>)}</ol>}</section>;
}

function ResearchRevisionContent({ value }: { value: unknown }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return <p className="workflow-empty">修订记录未完成。</p>;
  const revision = value as Partial<ResearchRevisionPayload>;
  if (revision.kind !== "research-revision" || revision.schemaVersion !== "research-revision@1" || !Array.isArray(revision.dispositions) || revision.validation?.valid !== true) return <section className="workflow-research-review workflow-research-review--incomplete"><header><strong>修订记录未完成</strong><p>无法确认哪些复核意见已处理。</p></header></section>;
  const labels = { changed: "已修改", disputed: "保留异议", missing_evidence: "仍缺证据" };
  return <section className="workflow-research-review workflow-research-review--revised" aria-label="研究修订记录"><header><span>修订结果</span><strong>已修订 · 尚未再次独立审阅</strong><p>以下处置逐条对应 Reviewer findings；修订稿标明尚未再次独立审阅，保留意见处理记录。</p></header><ol>{revision.dispositions.map((item) => <li key={item.id}><div className="workflow-review-finding-meta"><b>{labels[item.status]}</b><code>{item.id}</code></div><p>{item.reason}</p></li>)}</ol></section>;
}

type SourceCheckBearing = "identity" | "claim_detail";
type SourceCheckComparison = { postClaim: string; relation: "supports" | "contradicts" | "insufficient"; evidenceRefs: string[]; reason: string; bearing?: SourceCheckBearing };
type SourceCheckPayload = { kind: "post-source-check"; schemaVersion: "post-source-consistency@1" | "post-source-consistency@2"; inputSha256: string; verdict: "consistent" | "conflict" | "uncertain"; summary: string; comparisons: SourceCheckComparison[]; provenance: { model: string; reasoningEffort: string; methodSha256: string; threadId: string | null } };

function isPublicArtifactPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/artifacts/")) return false;
  const segments = value.split("/").slice(2);
  return segments.length > 0 && segments.every((segment) => /^[a-zA-Z0-9._:@-]+$/u.test(segment) && segment !== "." && segment !== "..");
}

function sourceCheck(value: unknown): SourceCheckPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const schemaVersion = item.schemaVersion;
  if (item.kind !== "post-source-check" || (schemaVersion !== "post-source-consistency@1" && schemaVersion !== "post-source-consistency@2") || !["consistent", "conflict", "uncertain"].includes(String(item.verdict)) || typeof item.summary !== "string" || !Array.isArray(item.comparisons)) return null;
  const comparisons = item.comparisons.every((comparison) => {
    if (!comparison || typeof comparison !== "object" || Array.isArray(comparison)) return false;
    const row = comparison as Record<string, unknown>;
    const bearing = row.bearing;
    return typeof row.postClaim === "string" && typeof row.reason === "string" && ["supports", "contradicts", "insufficient"].includes(String(row.relation)) && Array.isArray(row.evidenceRefs) && row.evidenceRefs.every(isPublicArtifactPath)
      && (schemaVersion === "post-source-consistency@1" ? bearing === undefined : bearing === "identity" || bearing === "claim_detail");
  });
  const provenance = item.provenance;
  if (!comparisons || !provenance || typeof provenance !== "object" || Array.isArray(provenance)) return null;
  const source = provenance as Record<string, unknown>;
  if (typeof item.inputSha256 !== "string" || typeof source.model !== "string" || typeof source.reasoningEffort !== "string" || typeof source.methodSha256 !== "string" || !(typeof source.threadId === "string" || source.threadId === null)) return null;
  return item as unknown as SourceCheckPayload;
}

function SourceCheckContent({ value }: { value: unknown }) {
  const check = sourceCheck(value);
  if (!check) return <p className="workflow-empty">来源检查结果未通过工作台阅读合同校验，未展示未经核验的结论。</p>;
  const verdict = { consistent: "一致", conflict: "存在冲突", uncertain: "证据不足" }[check.verdict];
  const relation = { supports: "支持", contradicts: "矛盾", insufficient: "证据不足" };
  const bearingLabel = (bearing: SourceCheckBearing | undefined) => bearing === "identity" ? "来源身份" : bearing === "claim_detail" ? "内容细节" : "历史来源核对";
  return <section className="workflow-source-check" aria-label="单帖来源检查"><header><span>{check.schemaVersion === "post-source-consistency@2" ? "来源身份判定" : "来源判定"}</span><strong className={`workflow-source-check__verdict workflow-source-check__verdict--${check.verdict}`}>{verdict}</strong><p>{check.summary}</p></header><ol>{check.comparisons.map((comparison, index) => <li key={`${comparison.postClaim}:${index}`}><dl><div><dt>比较维度</dt><dd>{bearingLabel(comparison.bearing)}</dd></div><div><dt>原帖说法</dt><dd>{comparison.postClaim}</dd></div><div><dt>媒体观察依据</dt><dd>{comparison.evidenceRefs.map((ref, evidenceIndex) => <a key={ref} href={ref}>核查依据 {evidenceIndex + 1}</a>)}</dd></div><div><dt>判断</dt><dd>{bearingLabel(comparison.bearing)} · {relation[comparison.relation]}</dd></div><div><dt>理由</dt><dd>{comparison.reason}</dd></div></dl></li>)}</ol></section>;
}

function ArtifactContent({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  if (value === null || value === undefined) return <span>未知</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return <span>{String(value)}</span>;
  if (Array.isArray(value)) return <ul className="workflow-artifact-content">{value.map((item, index) => <li key={index}><ArtifactContent value={item} depth={depth + 1}/></li>)}</ul>;
  if (typeof value !== "object") return <span>无法展示的资产字段</span>;
  if (depth > 5) return <span>嵌套内容过深，未在此处继续展开。</span>;
  return <dl className="workflow-artifact-content">{Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (["trace", "rawTrace", "stdout", "stderr", "command", "prompt"].includes(key)) return <div key={key}><dt>{key}</dt><dd>执行 trace 未在工作台展示。</dd></div>;
    return <div key={key}><dt>{key}</dt><dd><ArtifactContent value={item} depth={depth + 1}/></dd></div>;
  })}</dl>;
}

function runHref(id: string, creatorRunId?: string | null): string {
  return `/workflow-runs/${encodeURIComponent(id)}${creatorRunId ? `?creatorRunId=${encodeURIComponent(creatorRunId)}` : ""}`;
}

function RunList({ runs, selected, creatorRunId }: { runs: WorkflowRunRecord[]; selected?: string; creatorRunId?: string }) {
  if (!runs.length) return <p className="workflow-empty">这里没有关联工作流记录。系统不会为尚未执行的流程补造进度。</p>;
  return <div className="workflow-run-list">{runs.map((run) => <Link key={run.id} to={runHref(run.id, creatorRunId)} className={selected === run.id ? "active" : ""}>
    <span className={`workflow-state workflow-state--${run.state}`}>{workflowStateLabel(run.state)}</span><strong>{run.workflowId}</strong><small>{run.workflowRevision} · {run.id}</small>
  </Link>)}</div>;
}

function phaseAssetAnchor(phaseId: string, artifactId: string, role: string): string {
  return `phase-asset-${encodeURIComponent(phaseId)}-${encodeURIComponent(role)}-${artifactId}`;
}

function PhaseBoard({ phases, steps, events, PostReader, CreatorReader }: { phases: WorkflowPhase[]; steps: WorkflowStepRecord[]; events: WorkflowEvent[]; PostReader?: ComponentType<{ data: VideoResearch }>; CreatorReader?: ComponentType<{ data: WorkflowCreatorReaderData }> }) {
  const location = useLocation();
  if (!phases.length) return <section className="workflow-section"><header><span>阶段</span><h2>未记录阶段编排</h2><p>这条历史运行没有 Phase 数据；下方保留原始执行审计和已登记资产。</p></header></section>;
  return <section className="workflow-section workflow-phases"><header><span>阶段</span><h2>研究路径与成果</h2><p>候选报告、独立审阅和修订记录分别展示；修订稿标明尚未再次独立审阅，保留意见处理记录。</p></header>{phases.map((phase) => {
    const roles = new Set(phase.artifacts.map((asset) => asset.role));
    const counts = Object.entries(phase.stepCounts).map(([state, count]) => `${workflowStateLabel(state as WorkflowPhase["state"])} ${count}`).join(" · ");
    const reused = reusedCandidateWithoutModel(phase, steps, events);
    const usage = reused ? "无生成模型调用" : phase.usage.attempts ? `实际用量：输入 ${phase.usage.inputTokens ?? "未记录"} · 输出 ${phase.usage.outputTokens ?? "未记录"}${phase.usage.unknown ? "（部分未记录）" : ""}` : "无模型调用";
    const subject = phase.subjectTitle ?? phase.subjectId;
    return <details className="workflow-phase" key={phase.id} open style={{ marginLeft: `${phase.depth * 18}px` }}><summary><span className={`workflow-state workflow-state--${phase.state}`}>{workflowStateLabel(phase.state)}</span><b>{reused ? "复用已有候选" : phase.title}{subject && ` · ${subject}`}</b><small>{reused ? "复用已有候选；本阶段未调用生成模型" : phase.purpose}<br/>{counts} · {usage}（含子阶段） · 耗时 {phase.elapsedMs === null ? "未记录" : `${Math.floor(phase.elapsedMs / 60000)}分${Math.floor(phase.elapsedMs / 1000) % 60}秒`}</small></summary>
      {phase.reason && <p className="workflow-phase-reason">{phase.reason}</p>}
      <div className="workflow-phase-expected">{phase.expectedArtifacts.map((expected) => <span key={expected.role} className={roles.has(expected.role) ? "present" : expected.required ? "missing" : "pending"}>{expected.title ?? expected.role} · {roles.has(expected.role) ? "已登记" : expected.required ? "预期未产出" : "尚未产出"}</span>)}</div>
      {phase.artifacts.length ? <div className="workflow-phase-artifacts">{phase.artifacts.map((asset) => <div className="workflow-phase-artifact" key={`${asset.ownerRunId}:${asset.artifact.id}:${asset.role}`}><header><span>{asset.title ?? asset.role}</span><Link to={`${location.pathname}${location.search}#${phaseAssetAnchor(phase.id, asset.artifact.id, asset.role)}`}>定位此资产</Link></header><ArtifactPayload anchor={phaseAssetAnchor(phase.id, asset.artifact.id, asset.role)} ownerRunId={asset.ownerRunId} artifact={asset.artifact} PostReader={PostReader} CreatorReader={CreatorReader}/></div>)}</div> : <p className="workflow-empty">该阶段尚未登记可读资产。</p>}
    </details>;
  })}</section>;
}

function RunDetail({ detail, events, runs, refresh, PostReader, CreatorReader }: { detail: WorkflowRunDetail; events: WorkflowEvent[]; runs: WorkflowRunRecord[]; refresh: () => Promise<void>; PostReader?: ComponentType<{ data: VideoResearch }>; CreatorReader?: ComponentType<{ data: WorkflowCreatorReaderData }> }) {
  const location = useLocation();
  const [search] = useSearchParams();
  const scopedCreatorRunId = search.get("creatorRunId");
  const creatorRunId = typeof detail.run.metadata?.creatorRunId === "string" ? detail.run.metadata.creatorRunId : null;
  const postId = typeof detail.run.metadata?.postId === "string" ? detail.run.metadata.postId : null;
  const [postIdentity, setPostIdentity] = useState<{ creatorId: string | null; title: string | null }>({ creatorId: null, title: null });
  useEffect(() => {
    let active = true;
    setPostIdentity({ creatorId: null, title: null });
    if (!creatorRunId || !postId || !detail.run.workflowId.startsWith("post.")) return;
    getCreatorResearchRun(creatorRunId).then(async (owner) => {
      if (!active) return;
      setPostIdentity({ creatorId: owner.creatorId, title: null });
      if (!owner.creatorId) return;
      try {
        const report = await getVideoResearch(owner.creatorId, postId, creatorRunId);
        if (active) setPostIdentity({ creatorId: owner.creatorId, title: report.title });
      } catch { /* A historical report may be unavailable; retain the verified source ID. */ }
    }).catch(() => { /* Keep the workflow record usable if creator metadata is unavailable. */ });
    return () => { active = false; };
  }, [creatorRunId, postId, detail.run.workflowId]);
  const originalReportHref = originalPostReportHref(postIdentity.creatorId, creatorRunId, postId);
  const reportHref = originalReportHref ? `${originalReportHref}&workflow=${encodeURIComponent(detail.run.id)}` : null;
  const readerLabel = workflowReaderLabel(detail.run.workflowId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const operationLock = useRef(new Set<string>());
  const retry = async (key: string) => {
    const operation = `retry:${key}`;
    if (operationLock.current.has(operation)) return;
    operationLock.current.add(operation);
    setActing(operation); setActionError(null);
    try { await retryWorkflowStep(detail.run.id, key); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "重试未能开始"); }
    finally { operationLock.current.delete(operation); setActing(null); }
  };
  const cancel = async () => {
    if (!window.confirm("取消会停止仍在执行的步骤；已登记资产会保留。继续吗？")) return;
    if (operationLock.current.has("cancel")) return;
    operationLock.current.add("cancel");
    setActing("cancel"); setActionError(null);
    try { await cancelWorkflowRun(detail.run.id); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "取消未能完成"); }
    finally { operationLock.current.delete("cancel"); setActing(null); }
  };
  const attempts = (id: string) => detail.attempts.filter((attempt) => attempt.stepRunId === id);
  const childRuns = runs.filter((run) => run.parentRunId === detail.run.id);
  const buildChild = childRuns.find((run) => run.workflowId === "post.build");
  const buildChildId = buildChild?.id;
  const [linkedBuild, setLinkedBuild] = useState<{ runId: string; steps: WorkflowStepRecord[]; events: WorkflowEvent[] } | null>(null);
  useEffect(() => {
    let active = true;
    if (!buildChildId) { setLinkedBuild(null); return; }
    Promise.all([getWorkflowRun(buildChildId), getWorkflowEvents(buildChildId)]).then(([child, response]) => {
      if (active) setLinkedBuild({ runId: buildChildId, steps: child.steps, events: response.events });
    }).catch(() => { if (active) setLinkedBuild(null); });
    return () => { active = false; };
  }, [buildChildId, buildChild?.state]);
  const buildEvidence = linkedBuild?.runId === buildChildId ? linkedBuild : null;
  return <article className="workflow-detail">
    <nav className="breadcrumb"><Link to={scopedCreatorRunId ? `/workflow-runs?creatorRunId=${encodeURIComponent(scopedCreatorRunId)}` : "/workflow-runs"}><ArrowLeft size={14}/>全部工作流</Link><span>/</span><b>{readerLabel}</b></nav>
    <header className="workflow-hero"><div><span>WORKFLOW RUN</span><h1>{postIdentity.title ? `${readerLabel} · ${postIdentity.title}` : postId ? `${readerLabel} · ${postId}` : readerLabel}</h1><p>执行记录显示流程状态、已登记资产与可恢复步骤。执行完成不表示研究已经验收。</p>{reportHref && <Link className="workflow-return-report" to={reportHref}><ArrowLeft size={14}/>打开报告工作台</Link>}</div><div className={`workflow-state-box workflow-state--${detail.run.state}`}><strong>{workflowStateLabel(detail.run.state)}</strong><small>{detail.run.workflowId} · {detail.run.workflowRevision} · {detail.run.id}</small>{activeWorkflowState(detail.run.state) && <button onClick={() => void cancel()} disabled={acting !== null}><XCircle size={14}/>取消运行</button>}</div></header>
    {actionError && <p className="workflow-error"><AlertTriangle size={15}/>{actionError}</p>}
    {detail.run.error && <p className="workflow-error"><AlertTriangle size={15}/>{detail.run.error}{detail.run.errorId && <small>诊断编号：{detail.run.errorId}</small>}</p>}
    {(detail.run.parentRunId || childRuns.length > 0) && <nav className="workflow-lineage" aria-label="工作流父子关系">
      {detail.run.parentRunId && <Link to={runHref(detail.run.parentRunId, scopedCreatorRunId)}>查看父运行 <small>{detail.run.parentRunId}</small></Link>}
      {childRuns.map((run) => <Link key={run.id} to={runHref(run.id, scopedCreatorRunId)}>子运行 · {run.workflowId}{run.metadata?.postId ? ` · ${run.metadata.postId}` : ""} <span className={`workflow-state workflow-state--${run.state}`}>{workflowStateLabel(run.state)}</span></Link>)}
    </nav>}
    <PhaseBoard phases={detail.phases ?? []} steps={[...detail.steps, ...(buildEvidence?.steps ?? [])]} events={[...events, ...(buildEvidence?.events ?? [])]} PostReader={PostReader} CreatorReader={CreatorReader}/>
    <details className="workflow-audit" open={location.hash.startsWith("#artifact-") || undefined}><summary>执行审计 · {detail.steps.length} 个步骤 / {detail.attempts.length} 次尝试</summary><section className="workflow-section"><header><span>步骤</span><h2>当前执行路径</h2><p>只展示各步骤的最新摘要；原始 trace 不在此处展开。</p></header><div className="workflow-step-table"><div className="workflow-step-row workflow-step-row--head"><span>步骤</span><span>状态 / 尝试</span><span>资产与判断</span><span>操作</span></div>{detail.steps.map((step) => {
      const relatedArtifacts = detail.artifacts.filter((artifact) => artifact.producedBy.stepRunId === step.id);
      const stepAttempts = attempts(step.id);
      const retryable = stepCanRetry(detail.run.state, step);
      return <div className="workflow-step-row" key={step.id}><div><b>{stepLabel(step.key)}</b><small>技术 key：{step.key} · {step.kind} · {step.workflowRevision}</small></div><div><span className={`workflow-state workflow-state--${step.state}`}>{workflowStateLabel(step.state)}</span><details className="workflow-attempts"><summary>{stepAttempts.length} 次尝试</summary>{stepAttempts.length ? stepAttempts.map((attempt) => { const view = attemptPresentation(attempt, events); return <p key={attempt.id}><b>{view.state}</b><small>{view.model}</small><small>{view.actualModel}</small><small>{view.usage}</small>{view.error && <small className="workflow-attempt-error">{view.error}{view.errorId && ` · 诊断编号 ${view.errorId}`}</small>}</p>; }) : <p>尚未创建尝试记录。</p>}</details></div><div><p>{stepSummary(step, events) ?? "尚无可读摘要。"}</p>{relatedArtifacts.map((artifact) => <small key={artifact.id}>{artifact.type} · {artifact.schemaVersion}</small>)}</div><div>{retryable && <button onClick={() => void retry(step.key)} disabled={acting !== null}><RotateCcw size={13}/>{acting === `retry:${step.key}` ? "正在请求…" : "重试步骤"}</button>}</div></div>;
    })}</div></section>
    <section className="workflow-section"><header><span>资产</span><h2>本运行直接登记的输出</h2><p>结构校验与独立研究复核分别记录，不能互相替代。</p></header>{detail.artifacts.length ? <div className="workflow-artifacts">{detail.artifacts.map((artifact) => <ArtifactPayload ownerRunId={detail.run.id} artifact={artifact} PostReader={PostReader} CreatorReader={CreatorReader} key={artifact.id}/>)}</div> : <p className="workflow-empty">{emptyArtifactMessage(childRuns.length)}</p>}</section></details>
    <details className="workflow-events"><summary>执行事件摘要 · {events.length}</summary>{events.length ? events.map((event) => <p key={event.id}><span>#{event.seq}</span><b>{event.type}</b><em>{eventSummary(event)}</em></p>) : <p>尚无事件。</p>}</details>
  </article>;
}

function WorkflowRunsAuditPage({ PostReader, CreatorReader }: { PostReader?: ComponentType<{ data: VideoResearch }>; CreatorReader?: ComponentType<{ data: WorkflowCreatorReaderData }> }) {
  const { id } = useParams();
  const [search] = useSearchParams();
  const creatorRunId = search.get("creatorRunId") ?? undefined;
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [detail, setDetail] = useState<WorkflowRunDetail | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const polling = useRef(false);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const [listed, fetched] = await Promise.all([listWorkflowRuns(creatorRunId), id ? getWorkflowRun(id) : Promise.resolve(null)]);
      if (version !== requestVersion.current) return;
      setRuns(listed); setDetail(fetched); setEvents([]); setError(null);
      if (fetched) {
        const received = await getWorkflowEvents(fetched.run.id);
        if (version !== requestVersion.current) return;
        setEvents(received.events);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取工作流记录"); }
    finally { setLoading(false); }
  }, [creatorRunId, id]);
  useEffect(() => { void load(); return () => { requestVersion.current += 1; }; }, [load]);
  const poll = useCallback(async () => {
    if (!detail || polling.current) return;
    polling.current = true;
    const version = requestVersion.current;
    try {
      const after = events.reduce((latest, event) => Math.max(latest, event.seq), 0);
      const [next, delta, listed] = await Promise.all([getWorkflowRun(detail.run.id), getWorkflowEvents(detail.run.id, after), listWorkflowRuns(creatorRunId)]);
      if (version !== requestVersion.current) return;
      setDetail(next);
      setEvents((current) => [...current, ...delta.events.filter((event) => !current.some((known) => known.id === event.id))]);
      setRuns(listed.map((run) => run.id === next.run.id ? next.run : run));
      setError(null);
    } catch (cause) { if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : "无法更新工作流记录"); }
    finally { polling.current = false; }
  }, [creatorRunId, detail, events]);
  useEffect(() => {
    if (!detail || !activeWorkflowState(detail.run.state)) return;
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void poll(); };
    const interval = window.setInterval(refreshWhenVisible, 5000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [detail, poll]);
  if (loading && !detail) return <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取工作流记录</p></div>;
  return <main className="workflow-page"><aside><header><span>WORKFLOW RUNS</span><button title="刷新" onClick={() => void load()}><RefreshCw size={14}/></button></header><RunList runs={runs} selected={id} creatorRunId={creatorRunId}/></aside>{error ? <p className="workflow-error"><AlertTriangle size={15}/>{error}</p> : detail ? <RunDetail detail={detail} events={events} runs={runs} refresh={load} PostReader={PostReader} CreatorReader={CreatorReader}/> : <article className="workflow-detail workflow-detail--empty"><h1>工作流执行记录</h1><p>选择一条记录查看步骤、资产和可恢复操作。</p></article>}</main>;
}

export default function WorkflowRunsPage(props: { PostReader?: ComponentType<{ data: VideoResearch }>; CreatorReader?: ComponentType<{ data: WorkflowCreatorReaderData }> }) {
  const { id } = useParams();
  const [search] = useSearchParams();
  return id && search.get("audit") !== "1" ? <WorkflowReadingPage runId={id} {...props}/> : <WorkflowRunsAuditPage {...props}/>;
}
