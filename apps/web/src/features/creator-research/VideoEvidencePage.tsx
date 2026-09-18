import { singlePostReturnHref } from "./model/creator-reading";
import { ReportStatusNotice } from "./ReportStatusNotice";
import { ReportOverview } from "./ReportOverview";
import { ReportCoverageNotice } from "./ReportCoverageNotice";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import type { VideoResearch } from "../../shared/contracts/core";
import { OpeningReport, PackagingReport } from "./DepthReports";
import { ContentRestorationReport } from "./ContentRestorationReport";
import { DirectingStoryReport } from "./DirectingStoryReport";
import { VideoReaderHero } from "./VideoReaderHero";
import { VisualEditingReport } from "./VisualEditingReport";
import { ResearchAuditAppendix } from "./ResearchAuditAppendix";
import { LensWorkspace, type LensOutlineItem } from "./LensWorkspace";
import { timestamp, stageReadingLabel } from "./video-reader-utils";
import { startFreshPostWorkflow } from "../../shared/api/post-workflows";
import { getOptionalBatchVideoResearch, getPostCandidateReader, getPostWorkflowReading, type PostWorkflowReading } from "../../shared/api/post-workflow-reading";
import { PostWorkflowReadingPanel, workflowIsActive, workflowReviewLabel } from "./PostWorkflowReadingPanel";
import "./video-reader-report.css";

type Lens = "content" | "opening" | "directing" | "visual" | "audit";

const lensLabels: Array<{ id: Lens; label: string; hash: string }> = [
  { id: "content", label: "内容还原", hash: "content" },
  { id: "opening", label: "开头与包装", hash: "opening" },
  { id: "directing", label: "编导结构", hash: "directing" },
  { id: "visual", label: "画面与剪辑", hash: "visual-editing" },
  { id: "audit", label: "研究审计", hash: "audit" }
];

function lensHref(search: URLSearchParams, lens: Lens, hash: string) {
  const next = new URLSearchParams(search);
  next.set("lens", lens);
  return `?${next.toString()}#${hash}`;
}

function ReaderNavigation({ current, search }: { current: Lens; search: URLSearchParams }) {
  return <nav className="reader-navigation" aria-label="报告章节">
    {lensLabels.map((lens) => <Link key={lens.id} to={lensHref(search, lens.id, lens.hash)} aria-current={lens.id === current ? "page" : undefined}>{lens.label}</Link>)}
  </nav>;
}

function ContentStory({ data }: { data: VideoResearch }) {
  return <section className="reader-section content-story" id="content" aria-labelledby="content-title">
    <header><span>01</span><div><p>Builder · 内容还原</p><h2 id="content-title">它到底讲了什么、展示了什么</h2></div></header>
    <p className="builder-lens-summary" id="content-summary">{data.thesis}</p>
    <ReportCoverageNotice data={data}/>
    {data.contentBlocks.length > 0
      ? <ContentRestorationReport blocks={data.contentBlocks} data={data}/>
      : <p className="reader-empty">Builder 未产出内容还原块。</p>}
    {data.contentUnknowns.length > 0 && <aside className="builder-unknowns" id="content-unknowns"><span>Builder 保留的未知项</span>{data.contentUnknowns.map((item) => <p key={item}>{item}</p>)}</aside>}
  </section>;
}

function outlineFor(data: VideoResearch, lens: Lens): LensOutlineItem[] {
  if (lens === "content") return [
    { href: "#content-summary", label: "总体还原" },
    ...data.contentBlocks.map((block) => ({ href: `#content-${block.id}`, label: block.title, meta: `${timestamp(block.start)}–${timestamp(block.end)}` })),
    ...(data.contentUnknowns.length ? [{ href: "#content-unknowns", label: "保留的未知项" }] : [])
  ];
  if (lens === "opening") return [{ href: "#visual-opening", label: "开头连续拆解" }, { href: "#directing-packaging", label: "标题、封面与兑现" }];
  if (lens === "directing") return [
    { href: "#directing-journey", label: "观看前后" }, { href: "#directing-overview", label: "问题、承诺与回报" },
    ...data.directingLogic.stages.map((stage, index) => ({ href: `#directing-stage-${index + 1}`, label: stageReadingLabel(stage.label), meta: `${timestamp(stage.start)}–${timestamp(stage.end)}` })),
    ...(data.directingLogic.informationDesign.length ? [{ href: "#directing-information", label: "信息设计" }] : []),
    ...(data.directingLogic.proofDesign.length ? [{ href: "#directing-proof", label: "证明设计" }] : []),
    { href: "#directing-load", label: "信息负荷与回报" },
    ...(data.directingLogic.notes.length ? [{ href: "#directing-notes", label: "Builder 说明" }] : [])
  ];
  if (lens === "visual") return [
    { href: "#visual-overview", label: "画面总览" },
    ...(data.visualEditing.carriers.length ? [{ href: "#visual-carriers", label: "画面载体" }] : []),
    ...(data.visualEditing.claims.length ? [{ href: "#visual-claims", label: "画面主张" }] : []),
    { href: "#visual-semantics", label: "镜头语义" },
    ...(data.visualEditing.uiProcedureStates.length ? [{ href: "#visual-ui-states", label: "UI 操作状态" }] : []),
    ...(data.visualEditing.transitions.length ? [{ href: "#visual-transitions", label: "关键转场" }] : []),
    ...(data.visualEditing.rhythm.length ? [{ href: "#visual-rhythm", label: "节奏" }] : []),
    ...(data.visualEditing.missingBridges.length ? [{ href: "#visual-continuity", label: "连续性缺口" }] : []),
    { href: "#visual-audio", label: "声音" },
    ...(data.visualEditing.omissionRisks.length ? [{ href: "#visual-risks", label: "遗漏与误读风险" }] : []),
    ...(data.visualEditing.notes.length ? [{ href: "#visual-notes", label: "Builder 说明" }] : [])
  ];
  return [{ href: "#audit", label: "研究审计" }];
}

export default function VideoEvidencePage() {
  const { id = "", videoId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const [data, setData] = useState<VideoResearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [reading, setReading] = useState<PostWorkflowReading | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [readingLoaded, setReadingLoaded] = useState(false);
  const [candidate, setCandidate] = useState<{ href: string; data: VideoResearch } | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [baseCandidate, setBaseCandidate] = useState<{ href: string; data: VideoResearch } | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);
  const runId = search.get("run") ?? undefined;
  const workflowRunId = search.get("workflow") ?? undefined;
  const requestedVersion = search.get("version") === "original" ? "original" : "candidate";
  const requestedLens = search.get("lens");
  const legacyOpening = location.hash === "#visual-opening" || location.hash === "#directing-packaging";
  const currentLens: Lens = legacyOpening ? "opening" : requestedLens === "opening" || requestedLens === "content" || requestedLens === "directing" || requestedLens === "visual" || requestedLens === "audit"
    ? requestedLens : location.hash.startsWith("#directing") ? "directing" : location.hash.startsWith("#visual") ? "visual" : location.hash.startsWith("#audit") ? "audit" : "content";

  useEffect(() => {
    let active = true;
    setError(null); setData(null); setReportLoaded(false);
    getOptionalBatchVideoResearch(id, videoId, runId).then(value => { if (active) { setData(value); setReportLoaded(true); } }).catch((cause) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "无法读取视频证据");
      setReportLoaded(true);
    });
    return () => { active = false; };
  }, [id, videoId, runId]);

  useEffect(() => {
    let active = true;
    setReading(null); setReadingError(null); setReadingLoaded(false);
    if (!runId) { setReadingLoaded(true); return () => { active = false; }; }
    let timer: number | undefined;
    const load = async () => {
      window.clearTimeout(timer);
      try {
        const value = await getPostWorkflowReading(runId, videoId, workflowRunId);
        if (active) {
          setReading(value); setReadingError(null); setReadingLoaded(true);
          if (value.workflow && ["queued", "running", "waiting"].includes(value.workflow.state)) {
            timer = window.setTimeout(() => { if (document.visibilityState === "visible") void load(); }, 5000);
          }
        }
      } catch (cause) {
        if (active) {
          setReadingError(cause instanceof Error ? cause.message : "无法读取研究进度"); setReadingLoaded(true);
          timer = window.setTimeout(() => { if (document.visibilityState === "visible") void load(); }, 15000);
        }
      }
    };
    void load();
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { active = false; window.clearTimeout(timer); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [runId, videoId, workflowRunId]);

  const candidateHref = reading?.candidate?.readerHref;
  useEffect(() => {
    let active = true;
    let retryTimer: number | undefined;
    let failures = 0;
    setCandidate(null); setCandidateError(null);
    if (!candidateHref) return () => { active = false; };
    const load = () => getPostCandidateReader(candidateHref).then(value => {
      if (active) { setCandidate({ href: candidateHref, data: value }); setCandidateError(null); }
    }).catch(cause => {
      if (!active) return;
      setCandidateError(cause instanceof Error ? cause.message : "候选报告读取失败");
      if (++failures < 6) retryTimer = window.setTimeout(load, 5000);
    });
    void load();
    return () => { active = false; window.clearTimeout(retryTimer); };
  }, [candidateHref]);

  const baseHref = reading?.baseCandidate?.readerHref;
  useEffect(() => {
    let active = true;
    setBaseCandidate(null); setBaseError(null);
    if (!baseHref) return () => { active = false; };
    getPostCandidateReader(baseHref).then(value => { if (active) setBaseCandidate({ href: baseHref, data: value }); })
      .catch(cause => { if (active) setBaseError(cause instanceof Error ? cause.message : "修订前报告读取失败"); });
    return () => { active = false; };
  }, [baseHref]);

  useEffect(() => {
    if ((!data && !candidate && !baseCandidate) || !location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, [data, candidate, baseCandidate, location.hash, location.key, currentLens]);

  const rawReturnTo = search.get("returnTo");
  const returnTo = singlePostReturnHref(data?.creatorId ?? id, runId, rawReturnTo);
  const returnLabel = returnTo === "/analyze" ? "单帖报告" : `${data?.creatorName ?? "博主"} 的博主研究`;
  const candidateReady = Boolean(candidate && candidate.href === candidateHref);
  const activeWorkflow = workflowIsActive(reading);
  const baseReady = Boolean(baseCandidate && baseCandidate.href === baseHref);
  const visibleVersion = requestedVersion === "candidate" && candidateReady ? "candidate" : "original";
  const displayed = visibleVersion === "candidate" ? candidate!.data : baseReady && requestedVersion === "original" ? baseCandidate!.data : data;
  const heroData = visibleVersion === "candidate" && displayed && data ? { ...displayed,
    title: data.title, creatorId: data.creatorId, creatorName: data.creatorName, sourceHref: data.sourceHref,
    sourceFacts: data.sourceFacts, engagement: data.engagement } : displayed;
  const displayedStatus = visibleVersion === "candidate" && reading ? workflowReviewLabel(reading)
    : reading?.workflow ? baseReady && requestedVersion === "original" ? "修订前报告" : "批次报告 · 本次研究另行进行" : undefined;

  function selectVersion(next: "candidate" | "original") {
    const query = new URLSearchParams(search);
    if (next === "original") query.set("version", "original"); else query.delete("version");
    navigate({ pathname: location.pathname, search: `?${query}`, hash: location.hash }, { replace: true, preventScrollReset: true });
  }

  async function startFreshResearch() {
    if (!runId || !videoId || starting || activeWorkflow) return;
    setStarting(true); setStartError(null);
    try {
      const receipt = await startFreshPostWorkflow(runId, videoId);
      if (!receipt.workflowRunId) throw new Error("工作流已创建，但未返回运行记录 ID");
      setReading(null); setCandidate(null); setBaseCandidate(null);
      const query = new URLSearchParams(search);
      query.set("workflow", receipt.workflowRunId); query.delete("version");
      navigate({ pathname: location.pathname, search: `?${query}`, hash: location.hash });
      setStarting(false);
    } catch (cause) {
      setStartError(cause instanceof Error ? cause.message : "无法启动单帖研究");
      setStarting(false);
    }
  }

  if (!reportLoaded || !readingLoaded) return <main className="console console--solo"><div className="page-loader"><LoaderCircle className="spin"/><p>正在读取单帖研究</p></div></main>;
  if (!displayed) {
    if (error || readingError) return <main className="console console--solo"><div className="page-error"><AlertTriangle/><h1>单帖研究暂时无法读取</h1><p>{error ?? readingError}</p><Link to={returnTo}>返回{returnLabel}</Link></div></main>;
    const emptyTitle = candidateError ? "候选报告暂时无法读取" : activeWorkflow ? "报告正在生成，暂时没有可读正文"
      : reading?.workflow ? "本次研究尚无可读报告" : "这条视频还没有可读报告";
    return <main className="video-reader-shell"><article className="video-reader-report">
      <nav className="reader-breadcrumb"><Link to={returnTo}>返回{returnLabel}</Link><span>单帖研究</span></nav>
      {reading?.workflow && runId && <PostWorkflowReadingPanel reading={reading} creatorRunId={runId} version="original" wantsCandidate={false} onVersionChange={selectVersion} candidateReady={false} baseReady={false} hasBatchReport={false} candidateError={candidateError} baseError={baseError}/>}
      <section className="post-workflow-empty"><span>单帖报告</span><h1>{emptyTitle}</h1>
        <p>{activeWorkflow ? "本次研究的进度显示在上方；候选报告登记后会在此自动展示。" : reading?.workflow ? "上方保留了本次研究的状态和执行记录。" : "可以从当前媒体证据启动单帖研究，生成后在此查看完整报告。"}</p>
        {runId && <button type="button" onClick={() => void startFreshResearch()} disabled={starting || activeWorkflow}>{starting ? "正在启动…" : activeWorkflow ? "本次研究进行中" : "用当前方法开始研究"}</button>}
        {startError && <p className="reader-research-action__error" role="alert">{startError}</p>}
      </section>
    </article></main>;
  }

  return <main className="video-reader-shell">
    <article className="video-reader-report">
      <VideoReaderHero data={heroData ?? displayed} returnTo={returnTo} returnLabel={returnLabel} statusLabel={displayedStatus}/>
      {reading?.workflow && runId && <PostWorkflowReadingPanel reading={reading} creatorRunId={runId} version={visibleVersion} wantsCandidate={requestedVersion === "candidate"} onVersionChange={selectVersion} candidateReady={candidateReady} baseReady={baseReady} candidateError={candidateError} baseError={baseError}/>}
      {workflowRunId && !reading && !readingError && <p className="post-workflow-reading__loading">正在读取本次研究进度；下方先显示批次报告。</p>}
      {readingError && <p className="post-workflow-reading__error" role="alert">本次研究进度暂时无法读取：{readingError}。下方报告仍可阅读。</p>}
      {runId && <div className="reader-research-action">
        <div><b>继续研究这条视频</b><p>基于当前原帖与媒体证据启动新工作流并重新评估。已有候选报告可能被复用，继续接受审核。</p></div>
        <button type="button" onClick={() => void startFreshResearch()} disabled={starting || activeWorkflow}>
          {starting ? "正在启动…" : activeWorkflow ? "本次研究进行中" : "用当前方法重新研究"}
        </button>
        {startError && <p className="reader-research-action__error" role="alert">{startError}</p>}
      </div>}
      {data && displayed === data && <ReportStatusNotice data={data}/>}
      {data && displayed === data && <ReportOverview data={data}/>}
      <ReaderNavigation current={currentLens} search={search}/>
      <LensWorkspace label={lensLabels.find((lens) => lens.id === currentLens)?.label ?? "报告"} items={outlineFor(displayed, currentLens)}>
        {currentLens === "content" && <ContentStory data={displayed}/>}
        {currentLens === "opening" && <section className="reader-section" id="opening"><header><span>02</span><div><p>开头与包装</p><h2>怎样建立期待，又如何兑现</h2></div></header><OpeningReport data={displayed}/><PackagingReport data={displayed}/></section>}
        {currentLens === "directing" && <DirectingStoryReport data={displayed}/>}
        {currentLens === "visual" && <VisualEditingReport data={displayed}/>}
        {currentLens === "audit" && <ResearchAuditAppendix data={displayed} defaultOpen workflowReviewLabel={visibleVersion === "candidate" ? displayedStatus : undefined}/>}
      </LensWorkspace>
      <footer className="reader-footer"><Link to={returnTo}>返回{returnLabel}</Link><span>这是一份证据约束下的内容研究，不等同于效果或事实背书。</span></footer>
    </article>
  </main>;
}
