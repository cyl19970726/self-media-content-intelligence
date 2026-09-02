import { AlertTriangle, CheckCircle2, ExternalLink, FileQuestion, ImageIcon } from "lucide-react";
import type { PostSourceFacts, PostSourceFieldState } from "../../shared/contracts/core";
import "./source-facts.css";

const stateCopy: Record<PostSourceFieldState, string> = {
  available: "已取得",
  partial: "部分取得",
  missing: "缺失"
};

function FieldState({ value }: { value: PostSourceFieldState }) {
  const Icon = value === "available" ? CheckCircle2 : value === "partial" ? AlertTriangle : FileQuestion;
  return <span className={`source-fact-state is-${value}`}><Icon size={12}/>{stateCopy[value]}</span>;
}

function metric(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function capturedTime(value: string | null) {
  if (!value) return "未知";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知" : date.toLocaleString("zh-CN");
}

export function PostSourceFactsCard({ facts }: { facts: PostSourceFacts }) {
  return <section className={`source-facts source-facts--${facts.availability.overall}`} aria-label="原帖事实">
    <header className="source-facts__head">
      <div><span>POST SOURCE FACTS</span><h2>原帖事实</h2></div>
      <FieldState value={facts.availability.overall}/>
    </header>
    <div className="source-facts__body">
      <figure className="source-facts__cover">
        {facts.coverHref ? <img src={facts.coverHref} alt={facts.title ? `${facts.title}的原帖封面` : "原帖封面"}/>
          : <div><ImageIcon size={24}/><span>封面未取得</span></div>}
        <figcaption><FieldState value={facts.availability.cover}/><span>{facts.mediaType === "video" ? "视频" : facts.mediaType === "image" ? `图文 · ${facts.imageCount || "?"} 张` : "形式未知"}</span></figcaption>
      </figure>
      <div className="source-facts__ledger">
        <article><header><span>原始标题</span><FieldState value={facts.availability.title}/></header><h3>{facts.title ?? "标题未取得"}</h3></article>
        <article><header><span>发布正文</span><FieldState value={facts.availability.caption}/></header>
          <p>{facts.caption ?? "平台发布正文未取得；下方逐字稿和 OCR 不会被用来补造正文。"}</p>
          {facts.availability.caption === "partial" && <small>当前只确认到话题标签或卡片片段，不能视为完整发布正文。</small>}
        </article>
        {facts.tags.length > 0 && <div className="source-facts__tags">{facts.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
        <dl className="source-facts__meta">
          <div><dt>发布</dt><dd>{facts.publishedLabel ?? "未知"}</dd></div>
          <div><dt>点赞</dt><dd>{metric(facts.metrics.likes)}</dd></div>
          <div><dt>收藏</dt><dd>{metric(facts.metrics.collections)}</dd></div>
          <div><dt>评论</dt><dd>{metric(facts.metrics.comments)}</dd></div>
          <div><dt>分享</dt><dd>{metric(facts.metrics.shares)}</dd></div>
          <div><dt>采集</dt><dd>{capturedTime(facts.capturedAt)}</dd></div>
        </dl>
        <footer>
          {facts.sourceUrl && <a href={facts.sourceUrl} target="_blank" rel="noreferrer">查看平台原帖<ExternalLink size={13}/></a>}
          {facts.sourceRefs.length > 0 && <details><summary>查看事实来源 · {facts.sourceRefs.length}</summary>{facts.sourceRefs.map((ref) => <code key={ref}>{ref}</code>)}</details>}
        </footer>
      </div>
    </div>
  </section>;
}

export function SourceCaptionPreview({ facts }: { facts: PostSourceFacts }) {
  return <span className={`source-caption-preview is-${facts.availability.caption}`}>
    <b>发布正文 · {stateCopy[facts.availability.caption]}</b>
    <small>{facts.caption ?? "未取得；不使用模型摘要代替"}</small>
  </span>;
}
