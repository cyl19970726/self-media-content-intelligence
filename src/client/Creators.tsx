import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, LoaderCircle, UserRound } from "lucide-react";
import { listCreators } from "./api";
import type { CreatorSummary } from "../shared/schema";

function CreatorCard({ creator, index }: { creator: CreatorSummary; index: number }) {
  const consoleHref = `/creators/${creator.id}`;
  const evidenceHref = creator.entries[0]?.href;
  return <article className="creator-card">
    <header className="creator-card__head">
      <span className="creator-card__number">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <h2>{creator.name}</h2>
        <p className="creator-card__position">{creator.positioning}</p>
      </div>
      <a className="creator-card__profile" href={creator.profileUrl} target="_blank" rel="noreferrer" aria-label={`打开 ${creator.name} 主页`}>
        <ExternalLink size={14}/>
      </a>
    </header>
    <div className="creator-card__metrics">
      <div><b>{creator.followers}</b><span>粉丝</span></div>
      <div><b>{creator.likesAndCollections}</b><span>赞藏</span></div>
      {creator.stats.slice(0, 1).map((stat) => <div key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}
    </div>
    <p className="creator-card__summary">{creator.summary}</p>
    <div className="creator-card__tags">
      {creator.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
    </div>
    <nav className="creator-card__entries">
      <Link to={consoleHref}><span>进入研究台</span><small>9 节 · 归纳决策循环</small><ArrowRight size={15}/></Link>
      {evidenceHref && <a href={evidenceHref}><span>查看内容证据</span><small>{creator.entries[0]?.label}</small><ArrowRight size={15}/></a>}
    </nav>
  </article>;
}

export default function CreatorsOverview() {
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listCreators().then(setCreators).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取博主档案");
    });
  }, []);
  return <main className="workspace workspace--solo">
    <section className="creators-page">
      <div className="eyebrow"><span>CREATOR RESEARCH</span><span>AI 赛道 · 博主组合研究</span></div>
      <h1>AI 赛道博主分析</h1>
      <p className="intake__lede">从总览进入每个人的证据档案：每个卡片从已完成的分析产物自动汇总。</p>
      {error ? <div className="page-error"><h1>读取失败</h1><p>{error}</p></div>
        : creators === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在汇总博主档案</p></div>
          : <div className="creators-grid">
            {creators.map((creator, index) => <CreatorCard key={creator.id} creator={creator} index={index}/>)}
            {creators.length === 0 && <div className="rail-empty"><UserRound size={20}/>还没有博主分析产物。</div>}
          </div>}
      {creators && creators.length > 0 && <Link to="/benchmark" className="benchmark-banner">
        <span>进入跨 IP 对比台</span>
        <b>规律可信度：赛道规律 / IP 能力 / 定位空缺</b>
        <ArrowRight size={16}/>
      </Link>}
    </section>
  </main>;
}
