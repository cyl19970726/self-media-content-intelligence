import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, Clipboard, ExternalLink,
  LoaderCircle, RefreshCw, Users
} from "lucide-react";
import { createRun, getRun, listRuns, retryRun } from "../../shared/api/posts";
import { ReportV2 } from "./ReportV2";
import { ResearchNotebook } from "../../entities/research/ResearchNotebook";
import type { ReportEnvelope, RunStatus, RunSummary } from "../../shared/contracts/core";
import { PostSourceFactsCard } from "../../entities/source-facts/PostSourceFactsCard";
import { sourceSnapshotFacts } from "../../entities/source-facts/model";
import "./standalone-analysis.css";

const activeStatuses: RunStatus[] = ["queued", "running"];
const statusLabels: Record<RunStatus, string> = {
  queued: "排队中", running: "分析中", complete: "已完成", partial: "部分完成",
  blocked: "待授权", failed: "失败"
};

function StatusMark({ status }: { status: RunStatus }) {
  return <span className={`status status--${status}`}><i />{statusLabels[status]}</span>;
}

function RunRail({ runs, activeId }: { runs: RunSummary[]; activeId?: string }) {
  return <aside className="run-rail">
    <div className="rail-heading"><span>RUN ARCHIVE</span><b>{String(runs.length).padStart(2, "0")}</b></div>
    <div className="run-list">
      {runs.length === 0 ? <div className="rail-empty">还没有分析档案。<br/>提交一条链接开始。</div> : runs.map((run, index) =>
        <Link key={run.id} to={`/runs/${run.id}`} className={`run-item ${activeId === run.id ? "active" : ""}`}>
          <span className="run-item__number">{String(index + 1).padStart(2, "0")}</span>
          <div><strong>{run.title}</strong><small>{run.platform === "x" ? "X / TWITTER" : "小红书"} · {run.authorName}</small></div>
          <StatusMark status={run.status}/>
        </Link>)}
    </div>
  </aside>;
}

function useRuns() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setRuns(await listRuns()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取分析记录"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  return { runs, refresh, loading, error };
}

function Intake({ onCreated }: { onCreated: (report: ReportEnvelope) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(null);
    try { onCreated(await createRun(url)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法提交链接"); }
    finally { setSubmitting(false); }
  };
  return <section className="intake">
    <div className="eyebrow"><span>单帖研究</span><span>来源 → 证据 → 三类阅读</span></div>
    <h1>从一条帖子，<br/><em>看懂内容与做法。</em></h1>
    <p className="intake__lede">粘贴公开的小红书或 X 链接。系统会尽力取得原帖、视频和可见指标，再分别还原内容、编导逻辑、画面与剪辑；取得不到的信息会明确标为未知。</p>
    <form onSubmit={submit} className="intake-form">
      <label htmlFor="source-url">公开内容链接</label>
      <div className="input-row">
        <input id="source-url" value={url} onChange={(event) => setUrl(event.target.value)}
          placeholder="粘贴小红书分享文案 / 完整链接，或 X 帖子链接" required/>
        <button className="primary-button" disabled={submitting}>
          {submitting ? <LoaderCircle className="spin" size={18}/> : <ArrowRight size={18}/>} 开始分析
        </button>
      </div>
      {error && <p className="form-error"><CircleAlert size={16}/>{error}</p>}
    </form>
    <div className="process-strip" aria-label="分析流程">
      {["保存公开来源", "读取视频信息", "生成可追溯研究"].map((label, index) =>
        <div key={label}><span>0{index + 1}</span><strong>{label}</strong></div>)}
    </div>
  </section>;
}

export function SinglePostHome() {
  const navigate = useNavigate();
  const { runs, refresh, loading, error } = useRuns();
  return <main className="workspace"><RunRail runs={runs}/><div>{loading && <p className="run-list-state"><LoaderCircle className="spin" size={16}/>正在读取分析记录</p>}{error && <p className="run-list-state run-list-state--error"><CircleAlert size={16}/>{error}<button onClick={() => void refresh()}>重试</button></p>}<Intake onCreated={(report) => {
    void refresh(); navigate(`/runs/${report.id}`);
  }}/></div></main>;
}

function DetailBody({ report, onRetry }: { report: ReportEnvelope; onRetry: () => void }) {
  const source = report.source;
  const copyPage = async () => navigator.clipboard.writeText(window.location.href);
  return <article className="dossier">
    <div className="dossier-topline">
      <Link to="/analyze" className="text-button"><ArrowLeft size={16}/> 新分析</Link>
      <div><StatusMark status={report.status}/><span className="run-code">RUN {report.id.slice(0, 8).toUpperCase()}</span></div>
    </div>
    <header className="report-header">
      <div className="report-kicker"><span>{report.platform === "x" ? "X / TWITTER" : "小红书"}</span><span>{source?.author.name ?? "等待作者信息"}</span>{report.sourceUrl.startsWith("fixture:") && <b>DEMO FIXTURE / 演示数据</b>}</div>
      <h1>{source?.title ?? report.executiveSummary}</h1>
      <p>{report.schemaVersion === "1.0.0" ? "这是旧版档案，尚未包含作者/题材基线、证据覆盖和可审计的数据口径。旧结论已暂停展示，请重新分析后再用于决策。" : report.executiveSummary}</p>
      <div className="report-actions">
        <a href={report.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/> 原始链接</a>
        <button onClick={() => void copyPage()}><Clipboard size={15}/> 复制报告链接</button>
        {report.context.authorPosts.length > 0 && <a href="#creator-analysis"><Users size={15}/> 分析该博主</a>}
        {(report.status === "blocked" || report.status === "failed") && <button onClick={onRetry}><RefreshCw size={15}/> 重试</button>}
      </div>
    </header>
    {source && <PostSourceFactsCard facts={sourceSnapshotFacts(source)}/>}
    <section className="stage-line" aria-label="运行阶段">
      {report.stages.map((item, index) => <div key={item.id} className={`stage stage--${item.status}`}>
        <span>{item.status === "complete" ? <Check size={15}/> : item.status === "running" ? <LoaderCircle className="spin" size={15}/> : `0${index + 1}`}</span>
        <div><strong>{item.label}</strong><small>{item.message ?? (item.status === "complete" ? "已完成" : item.status)}</small></div>
      </div>)}
    </section>
    {!source ? <section className="blocked-state">
      <CircleAlert size={28}/><h2>{report.currentStage}</h2><p>{report.executiveSummary}</p>
      <p className="mono">系统没有补造缺失数据。补齐登录状态或完整链接后点击重试。</p>
    </section> : report.schemaVersion === "1.0.0" ? <section className="legacy-report">
      <CircleAlert size={28}/><div><span>LEGACY REPORT / 数据迁移保护</span><h2>这份旧档案不能直接套用新版报告。</h2>
      <p>新版字段在旧数据中不存在。系统不会把缺失值显示成 0，也不会继续展示无法审计的旧版“为什么有效”结论。</p>
      <button className="primary-button" onClick={onRetry}><RefreshCw size={16}/> 重新采集并升级报告</button></div>
    </section> : <><ReportV2 report={report}/><ResearchNotebook subjectId={report.id} title={source.title ?? report.executiveSummary} sourceUrl={report.sourceUrl}/></>}
  </article>;
}

export function SinglePostDetail() {
  const { id = "" } = useParams();
  const { runs, refresh } = useRuns();
  const [report, setReport] = useState<ReportEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const next = await getRun(id); setReport(next); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取报告"); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!report || !activeStatuses.includes(report.status)) return;
    const timer = window.setInterval(() => { void load(); void refresh(); }, 1200);
    return () => window.clearInterval(timer);
  }, [load, refresh, report, report?.status]);
  const active = useMemo(() => runs.find((run) => run.id === id), [runs, id]);
  return <main className="workspace"><RunRail runs={runs} activeId={active?.id}/>
    {error ? <div className="page-error"><CircleAlert/><h1>报告读取失败</h1><p>{error}</p></div>
      : !report ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取档案</p></div>
        : <DetailBody report={report} onRetry={async () => {
          const accepted = await retryRun(report.id);
          setReport({ ...accepted, status: "queued", currentStage: "等待重新分析" });
        }}/>}</main>;
}
