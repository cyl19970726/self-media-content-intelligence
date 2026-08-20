import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Grid2X2, List, LoaderCircle } from "lucide-react";
import { getCreatorResearchPortfolio, type CreatorResearchPortfolio } from "./api";
import type { CreatorSelectionItem } from "./creator-run-types";

function number(value: number | null): string {
  if (value === null) return "未知";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

const tierNames = { high: "高表现", base: "基本盘", low: "低表现" } as const;

function ItemTags({ item, reconstructionState }: { item: CreatorSelectionItem; reconstructionState?: string }) {
  return <div className="portfolio-item__tags">
    {item.anchors.map((anchor) => <span key={anchor}>{anchor === "median_near" ? "中位附近" : anchor === "mean_near" ? "平均附近" : "常见形式"}</span>)}
    {item.deepCandidate && <b>深度候选 · {reconstructionState === "ready" ? "硬闸通过" : reconstructionState ?? "待还原"}</b>}
  </div>;
}

export default function CreatorRunConsolePage() {
  const { id = "" } = useParams();
  const [data, setData] = useState<CreatorResearchPortfolio | null>(null);
  const [view, setView] = useState<"list" | "gallery">("list");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setData(await getCreatorResearchPortfolio(id)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取 Portfolio"); }
  }, [id]);
  const runStatus = data?.run.status;
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!runStatus || ["ready", "reviewable", "failed"].includes(runStatus)) return undefined;
    const stream = new EventSource(`/api/creator-runs/${encodeURIComponent(id)}/events/stream`);
    stream.addEventListener("creator-research-event", () => { void load(); });
    stream.onerror = () => {
      stream.close();
    };
    return () => stream.close();
  }, [runStatus, id, load]);

  if (error) return <main className="creator-live-console"><div className="page-error"><AlertTriangle/><h1>研究台读取失败</h1><p>{error}</p></div></main>;
  if (!data) return <main className="creator-live-console"><div className="page-loader"><LoaderCircle className="spin"/><p>正在读取博主证据</p></div></main>;
  const { run, analysis, selection } = data;
  if (!analysis || !selection) return <main className="creator-live-console"><Link to="/creators" className="text-button"><ArrowLeft size={15}/>返回任务台</Link><div className="page-loader"><LoaderCircle className="spin"/><p>{run.nextAction}</p></div></main>;
  const detailById = new Map((data.details?.posts ?? []).map((detail) => [detail.externalId, detail]));
  const mediaById = new Map((data.mediaManifest?.items ?? []).map((item) => [item.externalId, item]));
  const reconstructionById = new Map((data.reconstructionBatch?.items ?? []).map((item) => [item.postExternalId, item]));
  const synthesisById = new Map((data.synthesis?.postAnalyses ?? []).map((item) => [item.postExternalId, item]));

  return <main className="creator-live-console">
    <header className="creator-live-head">
      <Link to="/creators" className="text-button"><ArrowLeft size={15}/>全部博主</Link>
      <div className="creator-live-head__kicker"><span>LIVE CREATOR DOSSIER</span><span>RUN {run.id.slice(0, 8).toUpperCase()}</span></div>
      <h1>{run.creatorName ?? "待识别博主"}</h1>
      <p>先看公开作品构成的基本盘，再进入逐条详情与视频证据。这里的分层是表现事实，不把相关性写成爆发原因。</p>
      <a href={run.profileUrl} target="_blank" rel="noreferrer">原始主页<ExternalLink size={13}/></a>
    </header>

    <section className={`creator-run-progress creator-run-progress--${run.status}`}>
      <div><span>PIPELINE STATUS</span><strong>{run.status === "ready" ? "研究闭环已通过" : run.nextAction}</strong></div>
      <div className="creator-run-progress__stages">{run.stages.map((entry) => <span key={entry.id} className={`is-${entry.status}`}>
        {entry.status === "complete" ? <CheckCircle2 size={12}/> : entry.status === "running" ? <LoaderCircle className="spin" size={12}/> : null}{entry.label}
      </span>)}</div>
      {run.blockers.length > 0 && <small>{run.blockers.map((blocker) => blocker.message).join(" · ")}</small>}
    </section>

    <section className="creator-live-metrics" aria-label="公开表现基本盘">
      <article><span>观察作品</span><b>{analysis.metricCoverage.known + analysis.metricCoverage.missing}</b><small>点赞可见 {Math.round(analysis.metricCoverage.rate * 100)}%</small></article>
      <article><span>中位点赞</span><b>{number(analysis.likes.median)}</b><small>典型作品锚点</small></article>
      <article><span>平均点赞</span><b>{number(analysis.likes.mean)}</b><small>{selection.anchors.meanGap ? "均值附近有缺口" : "已找到均值附近作品"}</small></article>
      <article><span>最高点赞</span><b>{number(analysis.likes.max)}</b><small>头部极值，不代表基本盘</small></article>
    </section>

    <section className="creator-live-conclusion">
      <div><span>RESEARCH BOUNDARY</span><h2>现在可以判断分布，尚不能判断机制。</h2></div>
      <p>{analysis.interpretationBoundary}</p>
      <ul>{analysis.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul>
    </section>

    {data.synthesis && <section className="creator-synthesis">
      <header><span>CREATOR SYSTEM · VALIDATED</span><h2>账号定位、用户价值与内容系统</h2><p>只解释这个博主，不输出我们的发帖建议。</p></header>
      <div className="creator-synthesis__identity">
        <article><span>一句话定位</span><strong>{data.synthesis.identity.positioning.statement}</strong></article>
        <article><span>提供的价值</span>{data.synthesis.identity.valueProvided.slice(0, 3).map((claim) => <p key={claim.statement}>{claim.statement}</p>)}</article>
        <article><span>信任来源</span>{data.synthesis.identity.trustSources.slice(0, 3).map((claim) => <p key={claim.statement}>{claim.statement}</p>)}</article>
        <article><span>账号阶段</span><strong>{data.synthesis.identity.lifecycleStage.statement}</strong></article>
      </div>
      <div className="creator-synthesis__performance">
        <article><span>基本盘</span>{data.synthesis.performance.baseline.map((claim) => <p key={claim.statement}>{claim.statement}</p>)}</article>
        <article><span>高表现</span>{data.synthesis.performance.high.map((claim) => <p key={claim.statement}>{claim.statement}</p>)}</article>
        <article><span>低表现</span>{data.synthesis.performance.low.map((claim) => <p key={claim.statement}>{claim.statement}</p>)}</article>
      </div>
    </section>}

    <section className="creator-selection-view">
      <header>
        <div><span>CANONICAL PORTFOLIO · 21</span><h2>高表现、基本盘与低表现</h2><p>三档来自同一份选择集；9 条深度候选只是 21 条中的标记。</p></div>
        <div className="view-switch" role="group" aria-label="切换展示形式">
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={14}/>List</button>
          <button className={view === "gallery" ? "active" : ""} onClick={() => setView("gallery")}><Grid2X2 size={14}/>Gallery</button>
        </div>
      </header>
      <div className="tier-rule-strip">
        {(["high", "base", "low"] as const).map((tier) => <article key={tier}>
          <span>{tierNames[tier]}</span><b>{selection.tierCounts[tier]} 条</b><p>{selection.rules[tier]}</p>
        </article>)}
      </div>
      {view === "list" ? <div className="portfolio-list" role="table">
        <div className="portfolio-list__head" role="row"><span>层级</span><span>视频</span><span>类型</span><span>点赞</span><span>选择依据</span><span>证据状态</span></div>
        {selection.items.map((item) => { const synthesis = synthesisById.get(item.externalId); const reconstruction = reconstructionById.get(item.externalId); return <a href={item.url} target="_blank" rel="noreferrer" className="portfolio-list__row" role="row" key={item.externalId}>
          <span className={`tier-label tier-label--${item.tier}`}>{tierNames[item.tier]}</span>
          <strong>{detailById.get(item.externalId)?.title ?? item.title ?? "标题未识别"}</strong><span>{detailById.get(item.externalId)?.publishedLabel ?? (item.mediaType === "unknown" ? "待核验" : item.mediaType)}</span>
          <b>{number(item.likes)}</b><small>{synthesis ? `${synthesis.contentRole} · ${synthesis.performanceInterpretation}` : item.selectionReason}</small><ItemTags item={item} reconstructionState={reconstruction?.state}/>
        </a>})}
      </div> : <div className="portfolio-gallery">
        {selection.items.map((item) => { const cover = mediaById.get(item.externalId)?.coverArtifactRef; const synthesis = synthesisById.get(item.externalId); const reconstruction = reconstructionById.get(item.externalId); return <a href={item.url} target="_blank" rel="noreferrer" className={`portfolio-tile portfolio-tile--${item.tier}`} key={item.externalId}>
          <div className="portfolio-tile__media">{cover && <img src={cover} alt="" loading="lazy"/>}<span>{String(item.tierRank).padStart(2, "0")}</span><em>{cover ? "本地封面证据" : "封面未取得"}</em></div>
          <div><span>{tierNames[item.tier]} · {detailById.get(item.externalId)?.publishedLabel ?? (item.mediaType === "unknown" ? "类型待核验" : item.mediaType)}</span><h3>{detailById.get(item.externalId)?.title ?? item.title ?? "标题未识别"}</h3><b>{number(item.likes)} 赞</b>{synthesis && <p>{synthesis.contentRole}</p>}<ItemTags item={item} reconstructionState={reconstruction?.state}/></div>
        </a>})}
      </div>}
    </section>
  </main>;
}
