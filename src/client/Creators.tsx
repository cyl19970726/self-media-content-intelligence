import { useEffect, useState } from "react";
import { ExternalLink, LoaderCircle, UserRound } from "lucide-react";
import { listCreators } from "./api";
import type { CreatorSummary } from "../shared/schema";

function CreatorCard({ creator, index }: { creator: CreatorSummary; index: number }) {
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
      <span><b>{creator.followers}</b> 粉丝</span>
      <span><b>{creator.likesAndCollections}</b> 赞藏</span>
      {creator.stats.map((stat) => <span key={stat.label}><b>{stat.value}</b> {stat.label}</span>)}
    </div>
    <p className="creator-card__summary">{creator.summary}</p>
    <div className="creator-card__tags">
      {creator.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
    </div>
    <nav className="creator-card__entries">
      {creator.entries.map((entry) =>
        <a key={entry.href} href={entry.href}>{entry.label}<small>{entry.note ?? "进入研究档案"}</small></a>)}
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
      <h1>AI 赛道博主分析。<br/><em>从一个总览进入每个人的证据档案。</em></h1>
      <p className="intake__lede">每个卡片从已完成的分析产物自动汇总：定位、增长引擎与内容支柱都来自可复核的证据数据，不是新写的摘要。</p>
      {error ? <div className="page-error"><h1>读取失败</h1><p>{error}</p></div>
        : creators === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在汇总博主档案</p></div>
          : <div className="creators-grid">
            {creators.map((creator, index) => <CreatorCard key={creator.id} creator={creator} index={index}/>)}
            {creators.length === 0 && <div className="rail-empty"><UserRound size={20}/>还没有博主分析产物。</div>}
          </div>}
    </section>
  </main>;
}
