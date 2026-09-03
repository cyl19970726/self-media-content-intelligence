import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { getVideoResearch } from "../../shared/api/client";
import type { VideoResearch } from "../../shared/contracts/core";
import { ContentRestorationReport } from "./ContentRestorationReport";
import { DirectingStoryReport } from "./DirectingStoryReport";
import { VideoReaderHero } from "./VideoReaderHero";
import { VisualEditingReport } from "./VisualEditingReport";
import { ResearchAuditAppendix } from "./ResearchAuditAppendix";
import "./video-reader-report.css";

function ReaderNavigation() {
  return <nav className="reader-navigation" aria-label="报告章节">
    <a href="#content">内容还原</a>
    <a href="#directing">编导逻辑</a>
    <a href="#visual-editing">画面与剪辑</a>
    <a href="#audit">研究审计</a>
  </nav>;
}

function ContentStory({ data }: { data: VideoResearch }) {
  return <section className="reader-section content-story" id="content" aria-labelledby="content-title">
    <header><span>01</span><div><p>Builder · 内容还原</p><h2 id="content-title">它到底讲了什么、展示了什么</h2></div></header>
    <p className="builder-lens-summary">{data.thesis}</p>
    {data.contentBlocks.length > 0
      ? <ContentRestorationReport blocks={data.contentBlocks}/>
      : <p className="reader-empty">当前 Builder 尚未产出内容还原块。</p>}
    {data.contentUnknowns.length > 0 && <aside className="builder-unknowns"><span>Builder 保留的未知项</span>{data.contentUnknowns.map((item) => <p key={item}>{item}</p>)}</aside>}
  </section>;
}

export default function VideoEvidencePage() {
  const { id = "", videoId = "" } = useParams();
  const [search] = useSearchParams();
  const [data, setData] = useState<VideoResearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = search.get("run") ?? undefined;

  useEffect(() => {
    setError(null);
    getVideoResearch(id, videoId, runId).then(setData).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取视频证据");
    });
  }, [id, videoId, runId]);

  const rawReturnTo = search.get("returnTo");
  const returnTo = data && rawReturnTo?.startsWith(`/creators/${encodeURIComponent(data.creatorId)}`)
    ? rawReturnTo : data ? `/creators/${data.creatorId}#portfolio` : "/creators";

  if (error) return <main className="console console--solo"><div className="page-error"><AlertTriangle/><h1>证据读取失败</h1><p>{error}</p></div></main>;
  if (!data) return <main className="console console--solo"><div className="page-loader"><LoaderCircle className="spin"/><p>正在生成统一视频研究投影</p></div></main>;

  return <main className="video-reader-shell">
    <article className="video-reader-report">
      <VideoReaderHero data={data} returnTo={returnTo}/>
      <ReaderNavigation/>
      <ContentStory data={data}/>
      <DirectingStoryReport data={data}/>
      <VisualEditingReport data={data}/>
      <ResearchAuditAppendix data={data}/>
      <footer className="reader-footer"><Link to={returnTo}>返回 {data.creatorName} 的博主研究</Link><span>这是一份证据约束下的内容研究，不等同于效果或事实背书。</span></footer>
    </article>
  </main>;
}
