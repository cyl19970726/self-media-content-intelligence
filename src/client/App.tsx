import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BarChart3, Check, CircleAlert, Clipboard, ExternalLink,
  LoaderCircle, Play, RefreshCw, Search, Users
} from "lucide-react";
import { createRun, getRun, listRuns, retryRun } from "./api";
import { ReportV2 } from "./ReportV2";
import CreatorsOverview from "./Creators";
import CreatorDossierPage from "./CreatorDossier";
import BenchmarkPage from "./Benchmark";
import VideoEvidencePage from "./VideoEvidence";
import type { ReportEnvelope, RunStatus, RunSummary } from "../shared/schema";

const activeStatuses: RunStatus[] = ["queued", "running"];
const statusLabels: Record<RunStatus, string> = {
  queued: "排队中", running: "分析中", complete: "已完成", partial: "部分完成",
  blocked: "待授权", failed: "失败"
};

function StatusMark({ status }: { status: RunStatus }) {
  return <span className={`status status--${status}`}><i />{statusLabels[status]}</span>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <div className="app-shell">
    <header className="masthead">
      <Link to="/" className="brand" aria-label="返回分析台首页">
        <span className="brand__index">01</span>
        <span><strong>SIGNAL ROOM</strong><small>SELF-MEDIA INTELLIGENCE</small></span>
      </Link>
      <div className="masthead__meta"><span>PRIVATE WORKSPACE</span><span className="live-dot">LOCAL</span></div>
    </header>
    <nav className="section-nav" aria-label="主导航">
      <Link className={location.pathname === "/" ? "active" : ""} to="/"><Search size={16}/> 链接分析</Link>
      <Link className={location.pathname.startsWith("/creators") || location.pathname.startsWith("/creator-runs") ? "active" : ""} to="/creators"><Users size={16}/> 博主研究</Link>
      <Link className={location.pathname.startsWith("/comparisons") ? "active" : ""} to="/comparisons"><BarChart3 size={16}/> 多博主研究</Link>
      <span className="section-nav__soon">Notion 同步 · NEXT</span>
    </nav>
    {children}
  </div>;
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
  const refresh = useCallback(async () => setRuns(await listRuns()), []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  return { runs, refresh };
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
    <div className="eyebrow"><span>NEW ANALYSIS</span><span>URL → EVIDENCE → REPORT</span></div>
    <h1>给我一条链接。<br/><em>拿回一份可复用的判断。</em></h1>
    <p className="intake__lede">支持小红书与 X。可直接粘贴小红书分享文案和短链；系统会拆解单帖，并沿作者主页生成跨帖组合画像。</p>
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
    <button type="button" className="demo-link" onClick={() => setUrl("fixture://xiaohongshu/three-layer-demo")}>
      <Play size={15}/> 填入完整演示样例
    </button>
    <div className="process-strip" aria-label="分析流程">
      {["采集原文与指标", "转录与镜头拆解", "生成证据化报告"].map((label, index) =>
        <div key={label}><span>0{index + 1}</span><strong>{label}</strong></div>)}
    </div>
  </section>;
}

function Home() {
  const navigate = useNavigate();
  const { runs, refresh } = useRuns();
  return <Shell><main className="workspace"><RunRail runs={runs}/><Intake onCreated={(report) => {
    void refresh(); navigate(`/runs/${report.id}`);
  }}/></main></Shell>;
}

function DetailBody({ report, onRetry }: { report: ReportEnvelope; onRetry: () => void }) {
  const source = report.source;
  const copyPage = async () => navigator.clipboard.writeText(window.location.href);
  return <article className="dossier">
    <div className="dossier-topline">
      <Link to="/" className="text-button"><ArrowLeft size={16}/> 新分析</Link>
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
    </section> : <ReportV2 report={report}/>}
  </article>;
}

function Detail() {
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
  return <Shell><main className="workspace"><RunRail runs={runs} activeId={active?.id}/>
    {error ? <div className="page-error"><CircleAlert/><h1>报告读取失败</h1><p>{error}</p></div>
      : !report ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取档案</p></div>
        : <DetailBody report={report} onRetry={async () => {
          const accepted = await retryRun(report.id);
          setReport({ ...accepted, status: "queued", currentStage: "等待重新分析" });
        }}/>}</main></Shell>;
}

function LegacyCreatorRunRedirect() {
  const { id = "" } = useParams();
  return <Navigate replace to={`/creators/${encodeURIComponent(id)}`}/>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/creators" element={<Shell><CreatorsOverview/></Shell>}/>
    <Route path="/creators/:id" element={<Shell><CreatorDossierPage/></Shell>}/>
    <Route path="/creators/:id/videos/:videoId" element={<Shell><VideoEvidencePage/></Shell>}/>
    <Route path="/creator-runs/:id" element={<LegacyCreatorRunRedirect/>}/>
    <Route path="/comparisons" element={<Shell><BenchmarkPage/></Shell>}/>
    <Route path="/comparisons/:comparisonId" element={<Shell><BenchmarkPage/></Shell>}/>
    <Route path="/benchmark" element={<Navigate replace to="/comparisons"/>}/>
    <Route path="/runs/:id" element={<Detail/>}/>
    <Route path="*" element={<Home/>}/>
  </Routes>;
}
