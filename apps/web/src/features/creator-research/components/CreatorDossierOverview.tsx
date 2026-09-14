import { ExternalLink } from "lucide-react";
import type { CreatorDossier } from "../../../shared/contracts/core";

function metric(value: number | null) {
  return value === null ? "未知" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function CreatorDossierOverview({ data }: { data: CreatorDossier }) {
  const profile = data.run?.publicProfile;
  const work = data.run?.videoWork ?? { activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 0, failedPosts: 0, concurrencyLimit: 0 };
  return <>
    <header id="identity" className="console-hero dossier-hero dossier-hero--source">
      <div>
        <p className="eyebrow"><span>博主公开主页</span><span>来源事实</span></p>
        <h1>{data.identity.name}</h1>
        <p className="creator-source-bio">{profile?.bio ?? "主页自述未取得"}</p>
      </div>
      <a href={data.identity.profileHref} target="_blank" rel="noreferrer"><ExternalLink size={14}/>原始主页</a>
    </header>
    <div className="creator-source-facts" aria-label="博主主页来源事实">
      <article><span>粉丝</span><b>{metric(profile?.followers ?? null)}</b></article>
      <article><span>获赞与收藏</span><b>{metric(profile?.likesAndCollections ?? null)}</b></article>
      <article><span>主页显示作品</span><b>{metric(profile?.displayedPostCount ?? null)}</b></article>
      <article><span>已入库作品</span><b>{data.corpus.postCount}</b></article>
    </div>
    {data.run && <section className="creator-research-status" aria-label="研究状态">
      <header><span>本次研究状态</span><strong>{data.run.status === "ready" ? "研究已完成" : data.run.status === "reviewable" ? "报告可审阅" : "研究尚未完成"}</strong></header>
      <div>
        <article><b>{data.corpus.postCount}</b><span>已入库</span></article>
        <article><b>{data.run.coverage.enrichedPosts}</b><span>已取得详情</span></article>
        <article><b>{work.queuedPosts}</b><span>等待执行</span></article>
        <article><b>{work.analyzedPosts}</b><span>已构建</span></article>
      </div>
      <p>{work.activePostExternalIds.length > 0 ? `${work.activePostExternalIds.length} 条记录为执行中。` : "目前没有帖子正在分析。"} {work.queuedPosts > 0 && "排队任务尚未开始。"}</p>
    </section>}
  </>;
}
