import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createCreatorResearchRun, listCreatorResearchRuns, listCreatorRunOperations, listCreators, runCreatorOperation } from "../../shared/api/creators";
import type { CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction, CreatorSummary } from "../../shared/contracts/core";
import { ResearchLibraryCatalog } from "./components/ResearchLibraryCatalog";
import { ResearchLibraryIntake } from "./components/ResearchLibraryIntake";
import { ResearchLibraryProgress } from "./components/ResearchLibraryProgress";
import { findExistingCreatorRun, validateCreatorProfileUrl } from "./model/creator-task-state";
import "./research-library.css";

export default function CreatorsOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [runs, setRuns] = useState<CreatorResearchRun[] | null>(null);
  const [operations, setOperations] = useState<CreatorRunOperation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const progressView = searchParams.get("view") === "progress";
  const loadLibrary = useCallback(async () => { setLoading(true); try { const [creatorData, runData, operationData] = await Promise.all([listCreators(), listCreatorResearchRuns(), listCreatorRunOperations()]); setCreators(creatorData); setRuns(runData); setOperations(operationData); setLoadError(null); } catch (cause) { setLoadError(cause instanceof Error ? cause.message : "无法读取博主研究库"); } finally { setLoading(false); } }, []);
  useEffect(() => { void loadLibrary(); const refreshWhenVisible = () => { if (!document.hidden) void loadLibrary(); }; document.addEventListener("visibilitychange", refreshWhenVisible); const timer = window.setInterval(refreshWhenVisible, 5_000); return () => { document.removeEventListener("visibilitychange", refreshWhenVisible); window.clearInterval(timer); }; }, [loadLibrary]);
  async function addCreator(profileUrl: string) { const validation = validateCreatorProfileUrl(profileUrl); if (!validation.valid) { setIntakeError(validation.message); return; } if (findExistingCreatorRun(runs, validation.normalizedUrl)) { setIntakeError("这个主页已有研究任务，可直接打开已有任务。"); return; } setCreating(true); setIntakeError(null); try { await createCreatorResearchRun(validation.normalizedUrl, "redfox"); await loadLibrary(); } catch (cause) { setIntakeError(cause instanceof Error ? cause.message : "无法添加博主"); throw cause; } finally { setCreating(false); } }
  async function operate(id: string, action: CreatorRunOperationAction) { setOperatingId(id); try { await runCreatorOperation(id, action); await loadLibrary(); } catch (cause) { setLoadError(cause instanceof Error ? cause.message : "无法执行恢复动作"); } finally { setOperatingId(null); } }
  return <main className="research-library"><header className="research-library__header"><div><span>CREATOR RESEARCH LIBRARY</span><h1>博主研究库</h1><p>保存已完成档案，跟进每位博主各自的研究进度。</p></div><ResearchLibraryIntake runs={runs} creating={creating} error={intakeError} onAdd={addCreator}/></header><nav className="research-library__tabs" aria-label="博主研究视图"><button type="button" className={!progressView ? "active" : ""} onClick={() => setSearchParams({})}>我的博主</button><button type="button" className={progressView ? "active" : ""} onClick={() => setSearchParams({ view: "progress" })}>分析进度</button></nav>{progressView ? <ResearchLibraryProgress runs={runs} operations={operations} loading={loading} error={loadError} operatingId={operatingId} onOperate={operate} onRefresh={loadLibrary}/> : <ResearchLibraryCatalog creators={creators} runs={runs} loading={loading}/>}</main>;
}
