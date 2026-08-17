import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, ExternalLink, LoaderCircle } from "lucide-react";
import { getVideoEvidence } from "./api";
import type { VideoEvidence as VideoEvidenceData } from "../shared/schema";

export default function VideoEvidencePage() {
  const { id = "", videoId = "" } = useParams();
  const [data, setData] = useState<VideoEvidenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getVideoEvidence(id, videoId).then(setData).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取视频证据");
    });
  }, [id, videoId]);
  return <main className="console">
    {error ? <div className="page-error"><CircleAlert/><h1>证据读取失败</h1><p>{error}</p></div>
      : !data ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在还原视频证据</p></div>
        : <article className="evidence-page">
          <nav className="breadcrumb">
            <Link to="/creators">博主总览</Link><span>/</span>
            <Link to={`/creators/${data.creatorId}`}>{data.creatorId === "ai-red-witch" ? "AI红发魔女" : "人类最强编导"}</Link><span>/</span>
            <b>{data.title.slice(0, 24)}</b>
          </nav>
          <header className="evidence-head">
            <div>
              <p className="eyebrow"><span>VIDEO EVIDENCE</span><span>{data.sourceLabel}</span></p>
              <h1>{data.title}</h1>
              <p className="evidence-head__lead">{data.lead}</p>
              {data.architecture && <p className="evidence-head__arch"><b>内容架构：</b>{data.architecture}</p>}
            </div>
            {data.engagement && <div className="evidence-engagement">
              <div><b>{data.engagement.likes.toLocaleString()}</b><span>点赞</span></div>
              <div><b>{data.engagement.collections.toLocaleString()}</b><span>收藏</span></div>
              <div><b>{data.engagement.comments.toLocaleString()}</b><span>评论</span></div>
              <div><b>{data.engagement.shares.toLocaleString()}</b><span>分享</span></div>
            </div>}
          </header>
          <div className="evidence-body">
            <section className="evidence-column">
              <h2>稀疏帧</h2>
              {data.frames.length === 0
                ? <p className="console-note"><CircleAlert size={14}/>逐帧画面未落盘为独立证据页。</p>
                : <div className="frame-list">
                  {data.frames.map((frame) => <figure key={frame.src} className="frame-card">
                    <img src={frame.src} loading="lazy" alt={frame.id}/>
                    <figcaption><b>{frame.id}</b>{frame.time && <time>{frame.time}</time>}</figcaption>
                  </figure>)}
                </div>}
            </section>
            <section className="evidence-column">
              <h2>知识单元</h2>
              {data.knowledgeUnits.length === 0
                ? <p className="console-note"><CircleAlert size={14}/>知识单元未结构化。</p>
                : data.knowledgeUnits.map((unit) => <article key={unit.id} className="knowledge-card">
                  <b>{unit.title}</b><p>{unit.statement}</p>
                </article>)}
              {data.unknowns.length > 0 && <div className="evidence-unknowns">
                <h3>未知边界</h3>
                {data.unknowns.map((unknown) => <p key={unknown.slice(0, 20)}>{unknown}</p>)}
              </div>}
            </section>
          </div>
          <footer className="evidence-foot">
            {data.reportHref && <a className="console-link-card" href={data.reportHref}>
              <span>完整证据报告（帧 + 文字稿 + 时间码）</span><ExternalLink size={15}/>
            </a>}
            <Link className="text-button" to={`/creators/${data.creatorId}`}><ArrowLeft size={14}/> 回到研究台</Link>
          </footer>
        </article>}
  </main>;
}
