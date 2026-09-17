import { Grid2X2, List } from "lucide-react";
import { Link } from "react-router-dom";
import type { CreatorDossier } from "../../../shared/contracts/core";
import { SourceCaptionPreview } from "../../../entities/source-facts/PostSourceFactsCard";
import { sampleRoleLabel } from "../model/creator-reading";
import { comparisonSetLabel, comparisonSetNote } from "../model/creator-sample-copy";

type Item = CreatorDossier["portfolio"]["items"][number];
const tierLabels = { high: "高表现", base: "基本盘", low: "低表现" } as const;
const evidenceLabels = {
  deep_validated: "原记录评估通过",
  deep_evaluated_with_findings: "已评估·有待修复项",
  deep_reviewed_no_findings: "Reviewer 已完成·无意见",
  deep_reviewed_with_findings: "Reviewer 已完成·有修改意见",
  deep_revised_unverified: "已按意见修订·未再次独立复核",
  deep_review_failed: "Reviewer 技术失败·待处理",
  deep_built: "Builder 已完成·待评估",
  deep_pending: "深度待构建",
  surface_only: "作品级",
  missing: "证据缺失"
} as const;
const metric = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const duration = (value: number | null) => {
  if (value === null) return "时长未知";
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
};
const published = (item: Item) => {
  const value = item.sourceFacts.publishedLabel ?? item.publishedLabel;
  if (!value) return "日期未知";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/u);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : value;
};
const formatLabel = (value: string | null) => value === "video" ? "视频" : value === "image" ? "图文" : value === "unknown" ? "未分类" : value;
const mediaLabel = (item: Item) => item.sourceFacts.mediaType === "video" ? "视频" : item.sourceFacts.mediaType === "image" ? `图文${item.sourceFacts.imageCount ? ` · ${item.sourceFacts.imageCount} 图` : ""}` : item.format ?? "类型未知";
const classificationSource = (item: Item) => item.classificationSources?.length
  ? item.classificationSources.map((source) => source === "deep_builder" ? "该帖 Builder" : "标题表层").join(" + ")
  : null;

function ClassificationBoundaries({ item }: { item: Item }) {
  if (!item.classificationDetails?.length) return null;
  return <details className="portfolio-local-media"><summary>分类依据与边界</summary>{item.classificationDetails.map((detail, index) =>
    <p key={`${detail.axis}:${detail.label}:${index}`}><b>{detail.label}：</b>{detail.sourceLevel === "deep_builder" ? "该帖 Builder" : "标题表层"}；{detail.membershipBoundary}；标签边界：{detail.registryBoundary}</p>)}</details>;
}

function LocalMaterial({ item }: { item: Item }) {
  const hasSource = Boolean(item.localVideoHref || item.sourceFacts.caption?.trim());
  const hasAnalysis = Boolean(item.coreContent || item.contentArchitecture.length || item.mechanismHypothesis);
  return <>
    {hasSource && <details className="portfolio-local-media"><summary>查看已采集资料</summary>{item.localVideoHref && <video controls preload="none" src={item.localVideoHref}/>}<SourceCaptionPreview facts={item.sourceFacts}/></details>}
    {hasAnalysis && <details className="portfolio-local-media"><summary>查看作品分析</summary>
      {item.coreContent && <p><b>核心内容：</b>{item.coreContent}</p>}
      {item.contentArchitecture.length > 0 && <p><b>内容结构：</b>{item.contentArchitecture.join(" → ")}</p>}
      {item.mechanismHypothesis && <p><b>机制分析：</b>{item.mechanismHypothesis}</p>}
    </details>}
  </>;
}

export function CreatorPortfolioLibrary({ data, items, view, tier, topic, format, evidence, topicOptions, formatOptions, setOption, itemHref }: {
  data: CreatorDossier; items: Item[]; view: "list" | "gallery"; tier: string; topic: string; format: string; evidence: string;
  topicOptions: string[]; formatOptions: string[]; setOption: (key: string, value: string) => void; itemHref: (item: Item) => string;
}) {
  const deepCount = data.portfolio.items.filter((item) => item.deepSample).length;
  return <section id="portfolio" className="console-section dossier-section dossier-portfolio-first">
    <header className="console-section__head"><span className="console-section__index">01</span><div><h2>{comparisonSetLabel(data.portfolio.items.length)}</h2><p>{comparisonSetNote(data.portfolio.items.length, deepCount)}</p></div></header>
    <div className="dossier-section__body">
      <div className="portfolio-toolbar"><div className="tier-filter">{["all", "high", "base", "low"].map((value) => <button type="button" key={value} className={tier === value ? "active" : ""} onClick={() => setOption("tier", value)}>{value === "all" ? "全部" : tierLabels[value as keyof typeof tierLabels]}</button>)}</div><div className="portfolio-selects"><label>主题<select value={topic} onChange={(event) => setOption("topic", event.target.value)}><option value="all">全部</option>{topicOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>形式<select value={format} onChange={(event) => setOption("format", event.target.value)}><option value="all">全部</option>{formatOptions.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></label><label>证据<select value={evidence} onChange={(event) => setOption("evidence", event.target.value)}><option value="all">全部</option><option value="deep">深度样本</option><option value="deep_validated">原记录评估通过</option><option value="deep_evaluated_with_findings">已评估·有待修复项</option><option value="deep_reviewed_no_findings">Reviewer 已完成·无意见</option><option value="deep_reviewed_with_findings">Reviewer 已完成·有修改意见</option><option value="deep_revised_unverified">已按意见修订·未再次独立复核</option><option value="deep_review_failed">Reviewer 技术失败·待处理</option><option value="deep_built">Builder 已完成·待评估</option><option value="deep_pending">深度待构建</option><option value="surface_only">作品级</option></select></label></div><div className="view-switch"><button type="button" className={view === "list" ? "active" : ""} onClick={() => setOption("view", "list")}><List size={14}/>列表</button><button type="button" className={view === "gallery" ? "active" : ""} onClick={() => setOption("view", "gallery")}><Grid2X2 size={14}/>图库</button></div></div>
      {items.length === 0 ? <p className="dossier-empty">当前筛选下没有作品。</p> : view === "list" ? <div className="portfolio-list portfolio-list--reading"><div className="portfolio-list__head"><span>层级</span><span>原帖</span><span>主题 / 形式</span><span>发布 / 类型</span><span>点赞 / 中位倍数</span><span>证据</span></div>{items.map((item) => { const multiple = item.likes !== null && data.corpus.medianLikes ? item.likes / data.corpus.medianLikes : null; const topics = item.topics?.length ? item.topics : item.topic ? [item.topic] : []; const formats = item.formats?.length ? item.formats : item.format ? [formatLabel(item.format)] : []; return <article className="portfolio-list__row" key={item.id}><span data-label="层级" className={`tier-label tier-label--${item.tier}`}>{tierLabels[item.tier]}<small>{sampleRoleLabel(item)}</small></span><div data-label="原帖"><Link to={itemHref(item)} target={item.evidenceHref ? undefined : "_blank"} rel={item.evidenceHref ? undefined : "noreferrer"}><strong>{item.title}</strong></Link><LocalMaterial item={item}/></div><span data-label="主题 / 形式">{[...topics, ...formats, ...(item.commercialSignals ?? [])].join(" · ") || "未标注"}{classificationSource(item) && <small title={item.classificationBoundary ?? undefined}>来源：{classificationSource(item)}</small>}<ClassificationBoundaries item={item}/></span><span data-label="发布 / 类型">{published(item)} · {mediaLabel(item)}{item.sourceFacts.mediaType === "video" ? ` · ${duration(item.durationSeconds)}` : ""}</span><b data-label="点赞 / 中位倍数">{metric(item.likes)} 赞 · {multiple === null ? "—" : `${multiple.toFixed(2)}×`}</b><em data-label="证据">{evidenceLabels[item.evidenceStatus]}</em></article>; })}</div>
      : <div className="portfolio-gallery">{items.map((item) => { const multiple = item.likes !== null && data.corpus.medianLikes ? item.likes / data.corpus.medianLikes : null; return <article className={`portfolio-tile portfolio-tile--${item.tier}`} key={item.id}><Link to={itemHref(item)} target={item.evidenceHref ? undefined : "_blank"} rel={item.evidenceHref ? undefined : "noreferrer"}><div className="portfolio-tile__media">{item.coverHref && <img src={item.coverHref} alt={`${item.title}的原帖封面`} loading="lazy"/>}<span>{String(item.tierRank).padStart(2, "0")}</span><em>{item.coverHref ? "真实封面" : "封面未取得"}</em></div><div><span>{tierLabels[item.tier]} · {sampleRoleLabel(item)}</span><h3>{item.title}</h3><b>{metric(item.likes)} 赞 · {multiple === null ? "—" : `${multiple.toFixed(2)}×中位`}</b><small>{published(item)} · {mediaLabel(item)}{item.sourceFacts.mediaType === "video" ? ` · ${duration(item.durationSeconds)}` : ""}</small></div></Link><LocalMaterial item={item}/></article>; })}</div>}
    </div>
  </section>;
}
