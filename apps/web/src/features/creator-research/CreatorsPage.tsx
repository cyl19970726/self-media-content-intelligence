import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createCreatorResearchBatch } from "../../shared/api/creator-research-batches";
import { createCreatorResearchRun, discoverAiCreators, listCreatorResearchRuns, listCreatorRunOperations, listCreators, runCreatorOperation } from "../../shared/api/client";
import type { CreatorDiscoveryResult, CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction, CreatorSummary } from "../../shared/contracts/core";
import { CreatorBatchIntake, type CreatorBatchSubmission } from "./components/CreatorBatchIntake";
import { CreatorDirectoryRow } from "./components/CreatorDirectoryRow";
import { CreatorDiscoveryRadar } from "./components/CreatorDiscoveryRadar";
import { splitCreatorResearch } from "./model/creator-directory";
import { findExistingCreatorRun } from "./model/creator-task-state";
import { getCreatorWorkflowProgressBatch, type CreatorWorkflowProgress } from "./model/workflow-progress";
import "./creator-research.css";
import "./creator-directory.css";

export default function CreatorsOverview() {
  const [search] = useSearchParams();
  const view = search.get("view") === "completed" ? "completed" : "workbench";
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [runs, setRuns] = useState<CreatorResearchRun[] | null>(null);
  const [operations, setOperations] = useState<CreatorRunOperation[] | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState(new Map<string, CreatorWorkflowProgress>());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<CreatorDiscoveryResult | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [enqueueingId, setEnqueueingId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [creatorData, runData, operationData] = await Promise.all([listCreators(), listCreatorResearchRuns(), listCreatorRunOperations()]);
      const progress = await getCreatorWorkflowProgressBatch(runData.map((run) => run.id)).catch(() => new Map<string, CreatorWorkflowProgress>());
      setCreators(creatorData); setRuns(runData); setOperations(operationData); setWorkflowProgress(progress); setLoadError(null);
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : "无法读取博主研究台"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadOverview();
    const onVisibility = () => { if (!document.hidden) void loadOverview(); };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => { if (!document.hidden) void loadOverview(); }, 5_000);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.clearInterval(timer); };
  }, [loadOverview]);

  const directory = useMemo(() => splitCreatorResearch(runs ?? []), [runs]);
  const visibleRuns = view === "completed" ? directory.completed : directory.active;
  const creatorsByKey = useMemo(() => new Map((creators ?? []).flatMap((creator) => [
    [creator.id, creator] as const, [creator.profileUrl.replace(/[?#].*$/, "").replace(/\/$/, ""), creator] as const
  ])), [creators]);
  const creatorFor = (run: CreatorResearchRun) => (run.creatorId ? creatorsByKey.get(run.creatorId) : undefined)
    ?? creatorsByKey.get(run.profileUrl.replace(/[?#].*$/, "").replace(/\/$/, ""));

  async function submitBatch(input: CreatorBatchSubmission) {
    setSubmitting(true); setSubmitError(null);
    try {
      await createCreatorResearchBatch({ name: input.name, creators: input.profileUrls.map((profileUrl) => ({ profileUrl, adapter: input.adapter })) });
      await loadOverview();
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : "无法创建分析批次"); throw cause; }
    finally { setSubmitting(false); }
  }

  async function operate(id: string, action: CreatorRunOperationAction) {
    setOperatingId(id);
    try { await runCreatorOperation(id, action); await loadOverview(); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : "无法执行恢复动作"); }
    finally { setOperatingId(null); }
  }

  async function runDiscovery() {
    setDiscovering(true); setDiscoveryError(null);
    try { setDiscovery(await discoverAiCreators()); }
    catch (cause) { setDiscoveryError(cause instanceof Error ? cause.message : "无法发现 AI 博主"); }
    finally { setDiscovering(false); }
  }

  async function enqueueCandidate(candidate: CreatorDiscoveryResult["candidates"][number]) {
    if (findExistingCreatorRun(runs, candidate.profileUrl)) return;
    setEnqueueingId(candidate.creatorId);
    try { await createCreatorResearchRun(candidate.profileUrl, "redfox"); await loadOverview(); }
    catch (cause) { setDiscoveryError(cause instanceof Error ? cause.message : "无法加入研究队列"); }
    finally { setEnqueueingId(null); }
  }

  return <main className="workspace workspace--solo"><section className="creators-page creator-research-v2 creator-directory-page">
    <div className="eyebrow"><span>CREATOR RESEARCH</span><span>真实任务状态 · 自动刷新</span></div>
    <header className="creator-directory-head"><div><h1>博主研究</h1><p>发起新的博主研究，跟踪每条视频的实际执行情况，并阅读已经完成的研究成果。</p></div>
      <button type="button" onClick={() => void loadOverview()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={14}/>刷新状态</button></header>

    <nav className="creator-directory-tabs" aria-label="博主研究视图">
      <Link to="/creators" className={view === "workbench" ? "is-active" : ""} aria-current={view === "workbench" ? "page" : undefined}>研究工作台 <span>{directory.active.length}</span></Link>
      <Link to="/creators?view=completed" className={view === "completed" ? "is-active" : ""} aria-current={view === "completed" ? "page" : undefined}>已完成研究 <span>{directory.completed.length}</span></Link>
    </nav>

    {view === "workbench" && <details className="creator-directory-intake"><summary><div><span>ADD CREATOR</span><b>添加博主并开始研究</b></div><small>默认使用 RedFox，可一次添加 1–20 人</small></summary>
      <CreatorBatchIntake runs={runs} submitting={submitting} submitError={submitError} onSubmit={submitBatch}/>
    </details>}

    {view === "completed" && <p className="creator-directory-maturity">这里收录已产出的可读研究；是否完成独立验证，请看各条目的状态。</p>}
    {loadError && <p className="creator-directory-error" role="alert">{loadError}</p>}
    {runs === null ? <div className="creator-directory-empty"><p>正在读取研究任务…</p></div>
      : visibleRuns.length > 0 ? <div className="creator-directory-list">{visibleRuns.map((run) => <CreatorDirectoryRow key={run.id} run={run}
        creator={creatorFor(run)} operation={operations?.find((item) => item.runId === run.id)} busy={operatingId === run.id}
        workflowProgress={workflowProgress.get(run.id)} completed={view === "completed"} onOperate={operate}/>)}</div>
        : <div className="creator-directory-empty"><Database size={20}/><h2>{view === "completed" ? "还没有完成的研究" : "当前没有进行中的研究"}</h2>
          <p>{view === "completed" ? "只有综合阶段真正完成并产出研究成果后，才会出现在这里。" : "从上方添加博主，研究任务会在这里显示实际进度。"}</p></div>}

    {view === "workbench" && <div className="creator-directory-tools"><CreatorDiscoveryRadar discovery={discovery} error={discoveryError} discovering={discovering}
      enqueueingId={enqueueingId} runs={runs} onDiscover={runDiscovery} onEnqueue={enqueueCandidate}/></div>}
  </section></main>;
}
