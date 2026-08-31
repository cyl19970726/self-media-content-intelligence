import { ArrowRight, ExternalLink, LoaderCircle, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { CreatorSummary } from "../../../shared/contracts/core";

function CreatorCard({ creator, index }: { creator: CreatorSummary; index: number }) {
  return <article className="creator-card">
    <header className="creator-card__head"><span className="creator-card__number">{String(index + 1).padStart(2, "0")}</span>
      <div><h2>{creator.name}</h2><p className="creator-card__position">{creator.positioning}</p></div>
      <a className="creator-card__profile" href={creator.profileUrl} target="_blank" rel="noreferrer" aria-label={`打开 ${creator.name} 主页`}><ExternalLink size={14}/></a>
    </header>
    <div className="creator-card__metrics"><div><b>{creator.followers}</b><span>粉丝</span></div><div><b>{creator.likesAndCollections}</b><span>赞藏</span></div>
      {creator.stats.slice(0, 1).map((stat) => <div key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}</div>
    <p className="creator-card__summary">{creator.summary}</p>
    <div className="creator-card__tags">{creator.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
    <nav className="creator-card__entries"><Link to={`/creators/${creator.id}`}><span>进入唯一研究页</span><small>定位 · 基本盘 · 统一选择集 · 深度证据</small><ArrowRight size={15}/></Link></nav>
  </article>;
}

export function CreatorDossierGrid({ creators }: { creators: CreatorSummary[] | null }) {
  return <section className="creator-dossiers" aria-labelledby="creator-dossiers-title">
    <header><div><span>RESEARCH DOSSIERS</span><h2 id="creator-dossiers-title">已完成的博主档案</h2></div><p>每一份都沿用同一套判断顺序，所有结论回到证据。</p></header>
    {creators === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在汇总博主档案</p></div>
      : <div className="creators-grid">{creators.map((creator, index) => <CreatorCard key={creator.id} creator={creator} index={index}/>)}
        {creators.length === 0 && <div className="rail-empty"><UserRound size={20}/>还没有完成复核的博主档案。</div>}</div>}
  </section>;
}
