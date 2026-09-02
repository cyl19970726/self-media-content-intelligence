import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createCreatorResearchBatch, listCreatorResearchBatches } from "../../shared/api/creator-research-batches";
import { createCreatorResearchRun, discoverAiCreators, listCreatorResearchRuns, listCreatorRunOperations, listCreators, runCreatorOperation } from "../../shared/api/client";
import type { CreatorDiscoveryResult, CreatorResearchBatchProjection, CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction, CreatorSummary } from "../../shared/contracts/core";
import { CreatorBatchIntake, type CreatorBatchSubmission } from "./components/CreatorBatchIntake";
import { CreatorBatchWorkbench } from "./components/CreatorBatchWorkbench";
import { CreatorDiscoveryRadar } from "./components/CreatorDiscoveryRadar";
import { CreatorDossierGrid } from "./components/CreatorDossierGrid";
import { CreatorRunLedger } from "./components/CreatorRunLedger";
import { findExistingCreatorRun } from "./model/creator-task-state";
import "./creator-research.css";

type BatchFilter = "all" | "active" | "attention" | "ready";

export default function CreatorsOverview() {
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [runs, setRuns] = useState<CreatorResearchRun[] | null>(null);
  const [operations, setOperations] = useState<CreatorRunOperation[] | null>(null);
  const [batches, setBatches] = useState<CreatorResearchBatchProjection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<BatchFilter>("all");
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<CreatorDiscoveryResult | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [enqueueingId, setEnqueueingId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [creatorData, runData, operationData, batchData] = await Promise.all([
        listCreators(), listCreatorResearchRuns(), listCreatorRunOperations(), listCreatorResearchBatches()
      ]);
      setCreators(creatorData); setRuns(runData); setOperations(operationData); setBatches(batchData); setLoadError(null);
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

  async function submitBatch(input: CreatorBatchSubmission) {
    setSubmitting(true); setSubmitError(null);
    try {
      const projection = await createCreatorResearchBatch({ name: input.name, creators: input.profileUrls.map((profileUrl) => ({ profileUrl, adapter: input.adapter })) });
      setBatches((current) => [projection, ...(current ?? []).filter((item) => item.batch.id !== projection.batch.id)]);
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

  return <main className="workspace workspace--solo"><section className="creators-page creator-research-v2">
    <div className="eyebrow"><span>CREATOR ANALYSIS OS</span><span>批量指定 · 独立推进 · 统一证据</span></div>
    <header className="creator-control-head"><div><h1>二十个博主，<em>一张研究工作台。</em></h1><p className="intake__lede">先建立可比较的公开数据基本盘，再让每个博主独立完成分层、深度内容重建与内容系统归纳。</p></div>
      <ol aria-label="批次研究流程"><li><span>01</span>指定 1–20 人</li><li><span>02</span>本地预检</li><li><span>03</span>并行独立分析</li><li><span>04</span>完整档案与对比</li></ol></header>
    <CreatorBatchIntake runs={runs} submitting={submitting} submitError={submitError} onSubmit={submitBatch}/>
    <CreatorBatchWorkbench batches={batches} loading={loading} error={loadError} filter={filter} onFilter={setFilter} onRefresh={loadOverview}/>
    <CreatorDiscoveryRadar discovery={discovery} error={discoveryError} discovering={discovering} enqueueingId={enqueueingId} runs={runs} onDiscover={runDiscovery} onEnqueue={enqueueCandidate}/>
    <CreatorRunLedger runs={runs} operations={operations} operatingId={operatingId} onOperate={operate} onRefresh={loadOverview}/>
    <CreatorDossierGrid creators={creators}/>
    {creators && creators.length > 0 && <Link to="/comparisons" className="benchmark-banner"><span>进入跨 IP 对比台</span><b>赛道规律 / IP 能力 / 定位空缺</b><ArrowRight size={16}/></Link>}
  </section></main>;
}
