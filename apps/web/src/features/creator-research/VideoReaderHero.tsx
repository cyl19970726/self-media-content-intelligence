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
