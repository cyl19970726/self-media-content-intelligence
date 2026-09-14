import { Link } from "react-router-dom";
import { StatementList } from "../DossierStatements";
import type { CreatorDossier } from "../../../shared/contracts/core";
import "./cross-post-research.css";

type CrossPostResearch = NonNullable<CreatorDossier["crossPostResearch"]>;
type CrossPostSection = CrossPostResearch["sections"][number];
type CrossPostFinding = CrossPostSection["findings"][number];
type CrossPostSupport = CrossPostFinding["support"][number];

const factLabels: Record<CrossPostFinding["factClass"], string> = { observed: "观察", author_claim: "作者主张", inference: "推断", unknown: "未知" };
const confidenceLabels: Record<CrossPostFinding["confidence"], string> = { high: "高置信", medium: "中置信", low: "低置信" };

function metric(value: number | null) {
  return value === null ? "指标未知" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function publishedDate(value: string | null) {
  if (!value) return "日期未知";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("zh-CN");
}

function publicMetrics(item: CreatorDossier["portfolio"]["items"][number]) {
  return [["赞", item.likes], ["藏", item.collections], ["评", item.comments], ["转", item.shares]]
    .filter(([, value]) => value !== null)
    .map(([label, value]) => `${metric(value as number)} ${label}`).join(" · ") || "公开指标未知";
}

function PostSupport({ item, support }: { item: CreatorDossier["portfolio"]["items"][number] | undefined; support: CrossPostSupport }) {
  const postHref = item?.evidenceHref;
  return <li className="cross-post-research__support">
    {postHref ? <Link to={postHref}>{item?.title ?? support.postExternalId}</Link>
      : item?.sourceHref ? <a href={item.sourceHref} target="_blank" rel="noreferrer">{item.title}</a>
        : <b>{item?.title ?? support.postExternalId}</b>}
    <span className="cross-post-research__metrics">{item ? `${publicMetrics(item)} · ${publishedDate(item.publishedLabel)}` : "该帖未在当前作品集中"}</span>
    <p>{support.observation}</p>
    {support.evidenceRefs.length > 0 && <details><summary>原始依据 · {support.evidenceRefs.length}</summary><ul>{support.evidenceRefs.map((ref) => <li key={ref}>{/^(\/artifacts\/|\/research\/|https?:\/\/)/.test(ref) ? <a href={ref} target="_blank" rel="noreferrer">{ref}</a> : ref}</li>)}</ul></details>}
  </li>;
}

export function CrossPostResearchReading({ data, research }: { data: CreatorDossier; research: CrossPostResearch }) {
  const items = new Map(data.portfolio.items.map((item) => [item.id, item]));
  return <section className="cross-post-research" aria-label="跨帖研究">
    <header className="cross-post-research__head"><span>跨帖研究</span><h2>从作品证据读取账号</h2></header>
    {research.sections.map((section, sectionIndex) => <section id={section.id} className="cross-post-research__section" key={section.id}>
      <header><span>{String(sectionIndex + 1).padStart(2, "0")}</span><h3>{section.title}</h3></header>
      {section.id === "value" && data.identity.audience.length > 0 && <div className="cross-post-research__audience"><h4>涉及的受众</h4><StatementList data={data} values={data.identity.audience} empty="受众尚待明确。"/></div>}
      {section.findings.map((finding) => <article className="cross-post-research__finding" key={finding.id}>
        <p className="cross-post-research__meta">{factLabels[finding.factClass]} · {confidenceLabels[finding.confidence]}</p>
        <p className="cross-post-research__statement">{finding.statement}</p>
        <div className="cross-post-research__evidence">
          <div><h4>支持证据</h4>{finding.support.length ? <ul>{finding.support.map((support, index) => <PostSupport key={`${support.postExternalId}-${index}`} item={items.get(support.postExternalId)} support={support}/>)}</ul> : <p>未提供支持证据。</p>}</div>
          <div><h4>反例与不一致处</h4>{finding.counterexamples.length ? <ul>{finding.counterexamples.map((support, index) => <PostSupport key={`${support.postExternalId}-${index}`} item={items.get(support.postExternalId)} support={support}/>)}</ul> : <p>未提供反例。</p>}</div>
        </div>
        <p className="cross-post-research__boundary"><b>边界：</b>{finding.boundary}</p>
        {finding.openQuestions.length > 0 && <div className="cross-post-research__questions"><b>待回答的问题</b><ul>{finding.openQuestions.map((question) => <li key={question}>{question}</li>)}</ul></div>}
      </article>)}
    </section>)}
  </section>;
}
