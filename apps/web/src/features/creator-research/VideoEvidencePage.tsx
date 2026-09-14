import { singlePostReturnHref } from "./model/creator-reading";
import { ReportFormatNotice } from "./ReportFormatNotice";
import { OriginalReport } from "./OriginalReport";
import { ReportCoverageNotice } from "./ReportCoverageNotice";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { getVideoResearch } from "../../shared/api/creators";
import type { VideoResearch } from "../../shared/contracts/core";
import { OpeningReport, PackagingReport } from "./DepthReports";
import { ContentRestorationReport } from "./ContentRestorationReport";
import { DirectingStoryReport } from "./DirectingStoryReport";
import { VideoReaderHero } from "./VideoReaderHero";
import { VisualEditingReport } from "./VisualEditingReport";
import { ResearchAuditAppendix } from "./ResearchAuditAppendix";
import { LensWorkspace, type LensOutlineItem } from "./LensWorkspace";
import { ResearchNotebook } from "../../entities/research/ResearchNotebook";
import { timestamp, stageReadingLabel } from "./video-reader-utils";
import "./video-reader-report.css";

type Lens = "content" | "directing" | "visual" | "audit";

const lensLabels: Array<{ id: Lens; label: string; hash: string }> = [
  { id: "content", label: "内容还原", hash: "content" },
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
    <header><span>01</span><div><p>{data.reportFormat === "legacy_report" ? "历史报告 · 原文" : "Builder · 内容还原"}</p><h2 id="content-title">它到底讲了什么、展示了什么</h2></div></header>
    <ReportCoverageNotice data={data}/>
    {data.contentBlocks.length > 0
      ? <ContentRestorationReport blocks={data.contentBlocks} data={data}/>
      : <p className="reader-empty">该分析未产出内容还原块，可在研究审计中查看来源。</p>}
    {data.contentUnknowns.length > 0 && <aside className="builder-unknowns" id="content-unknowns"><span>Builder 保留的未知项</span>{data.contentUnknowns.map((item) => <p key={item}>{item}</p>)}</aside>}
  </section>;
}

function outlineFor(data: VideoResearch, lens: Lens): LensOutlineItem[] {
  if (lens === "content") return [
    ...data.contentBlocks.map((block) => ({ href: `#content-${block.id}`, label: block.title, meta: `${timestamp(block.start)}–${timestamp(block.end)}` })),
    ...(data.contentUnknowns.length ? [{ href: "#content-unknowns", label: "保留的未知项" }] : [])
  ];
  if (lens === "directing") return [
    { href: "#directing-packaging", label: "标题、封面与兑现" },
    { href: "#directing-journey", label: "观看前后" }, { href: "#directing-overview", label: "问题、承诺与回报" },
    ...data.directingLogic.stages.map((stage, index) => ({ href: `#directing-stage-${index + 1}`, label: stageReadingLabel(stage.label), meta: `${timestamp(stage.start)}–${timestamp(stage.end)}` })),
    ...(data.directingLogic.informationDesign.length ? [{ href: "#directing-information", label: "信息设计" }] : []),
    ...(data.directingLogic.proofDesign.length ? [{ href: "#directing-proof", label: "证明设计" }] : []),
    { href: "#directing-load", label: "信息负荷与回报" },
    ...(data.directingLogic.notes.length ? [{ href: "#directing-notes", label: "Builder 说明" }] : [])
  ];
  if (lens === "visual") return [
    { href: "#visual-opening", label: "开头连续拆解" },
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
  const location = useLocation();
  const [search] = useSearchParams();
  const [data, setData] = useState<VideoResearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = search.get("run") ?? undefined;
  const requestedLens = search.get("lens");
  const legacyOpening = location.hash === "#visual-opening" || location.hash === "#directing-packaging";
  const currentLens: Lens = requestedLens === "content" || requestedLens === "directing" || requestedLens === "visual" || requestedLens === "audit"
    ? requestedLens : legacyOpening ? (location.hash === "#directing-packaging" ? "directing" : "visual") : location.hash.startsWith("#directing") ? "directing" : location.hash.startsWith("#visual") ? "visual" : location.hash.startsWith("#audit") ? "audit" : "content";

  useEffect(() => {
    let active = true;
    setError(null); setData(null);
    getVideoResearch(id, videoId, runId).then(value => { if (active) setData(value); }).catch((cause) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "无法读取视频证据");
    });
    return () => { active = false; };
  }, [id, videoId, runId]);

  useEffect(() => {
    if (!data || !location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, [data, location.hash, location.key, currentLens]);

  const rawReturnTo = search.get("returnTo");
  const returnTo = data ? singlePostReturnHref(data.creatorId, runId, rawReturnTo) : "/creators";

  if (error) return <main className="console console--solo"><div className="page-error"><AlertTriangle/><h1>证据读取失败</h1><p>{error}</p></div></main>;
  if (!data) return <main className="console console--solo"><div className="page-loader"><LoaderCircle className="spin"/><p>正在加载报告</p></div></main>;

  return <main className="video-reader-shell">
    <article className="video-reader-report">
      <VideoReaderHero data={data} returnTo={returnTo}/>
      <ReportFormatNotice data={data}/>
      {data.reportFormat === "legacy_report" ? <section className="post-archive"><h2>这篇仍是旧版分析</h2><p>当前工作台以三部分结构化分析为准。这份旧材料保留为来源档案，暂不展开缺失的分析面板。</p><details><summary>查看已保存的原始内容</summary><OriginalReport markdown={data.reports.builder ?? data.article ?? "没有可读取的原始正文。"} data={data}/></details><ResearchAuditAppendix data={data}/></section> : <>
      <ReaderNavigation current={currentLens} search={search}/>
      <LensWorkspace label={lensLabels.find((lens) => lens.id === currentLens)?.label ?? "报告"} items={outlineFor(data, currentLens)}>
        {currentLens === "content" && <ContentStory data={data}/>}
        {currentLens === "directing" && <><PackagingReport data={data}/><DirectingStoryReport data={data}/></>}
        {currentLens === "visual" && <><OpeningReport data={data}/><VisualEditingReport data={data}/></>}
        {currentLens === "audit" && <ResearchAuditAppendix data={data} defaultOpen/>}
      </LensWorkspace></>}
      <ResearchNotebook subjectId={`post:${data.creatorId}:${videoId}:${runId ?? "latest"}`} title={data.title} sourceUrl={data.sourceHref}/>
      <footer className="reader-footer"><Link to={returnTo}>返回 {data.creatorName} 的博主研究</Link><span>这是一份证据约束下的内容研究，不等同于效果或事实背书。</span></footer>
    </article>
  </main>;
}
