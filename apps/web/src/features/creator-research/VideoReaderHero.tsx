import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { VideoResearch } from "../../shared/contracts/core";
import { metric, timestamp } from "./video-reader-utils";

export function VideoReaderHero({ data, returnTo }: { data: VideoResearch; returnTo: string }) {
  const summary = data.readerSummary;
  const sourcePartial = data.sourceFacts.availability.overall !== "available";
  return <>
    <nav className="reader-breadcrumb"><Link to={returnTo}><ArrowLeft size={14}/> {data.creatorName}</Link><span>单帖研究</span></nav>
    <header className="reader-hero">
      <div className="reader-hero__copy">
        <p className="reader-kicker"><span>{summary.statusLabel}</span><span>{data.sourceFacts.publishedLabel ?? "发布时间未知"}</span></p>
        <h1>{data.title}</h1>
        <p className="reader-hero__thesis">{summary.verdict}</p>
        <div className="reader-source-line">
          <span>{sourcePartial ? "原帖资料部分取得" : "原帖资料完整"}</span>
          <span>{metric(data.engagement.likes)} 赞</span>
          <span>{metric(data.engagement.collections)} 收藏</span>
          <a href={data.sourceHref} target="_blank" rel="noreferrer">查看原帖 <ExternalLink size={12}/></a>
        </div>
      </div>
      {summary.representativeFrame && <figure className="reader-hero__visual">
        <img src={summary.representativeFrame.src} alt={summary.representativeFrame.label}/>
        <figcaption><span>视频代表画面</span><time>{timestamp(summary.representativeFrame.time)}</time></figcaption>
      </figure>}
    </header>
  </>;
}

export function ReaderSummary({ data }: { data: VideoResearch }) {
  return <section className="reader-summary" aria-labelledby="reader-summary-title">
    <header><span>01</span><div><p>一分钟读懂</p><h2 id="reader-summary-title">这条帖子为什么值得研究</h2></div></header>
    <div className="reader-summary__lead">
      <article><span>有效之处</span>{data.readerSummary.strengths.length
        ? <ol>{data.readerSummary.strengths.map((item) => <li key={item}>{item}</li>)}</ol>
        : <p>现有证据还不足以稳定判断。</p>}</article>
      <article><span>主要不足</span>{data.readerSummary.limitations.length
        ? <ol>{data.readerSummary.limitations.map((item) => <li key={item}>{item}</li>)}</ol>
        : <p>未登记明确限制。</p>}</article>
    </div>
    <div className="reader-recipe"><span>可复用结构</span><ol>{data.readerSummary.reusableStructure.map((item, index) => <li key={`${item}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b>{item}</li>)}</ol></div>
  </section>;
}
