import { Link } from "react-router-dom";
import { StatementList } from "../DossierStatements";
import type { CreatorDossier, ResearchStatement } from "../../../shared/contracts/core";
import { creatorEvidenceHref, crossPostReturnTo } from "../model/creator-evidence-link";
import "./cross-post-research.css";

type CrossPostResearch = NonNullable<CreatorDossier["crossPostResearch"]>;
type CrossPostSection = CrossPostResearch["sections"][number];
type CrossPostFinding = CrossPostSection["findings"][number];
type CrossPostSupport = CrossPostFinding["support"][number];
type ReadingItem = Pick<CreatorDossier["portfolio"]["items"][number], "id" | "title" | "sourceHref" | "evidenceHref" | "likes" | "collections" | "comments" | "shares" | "publishedLabel" | "deepSample">;

export type CrossPostReadingData = {
  identity: { audience: ResearchStatement[] };
  corpus: Pick<CreatorDossier["corpus"], "postCount" | "likesKnown" | "coverageRate">;
  portfolio: { items: ReadingItem[] };
  synthesisSourceChanges?: Array<{ postExternalId: string; note: string }>;
};

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

function publicMetrics(item: ReadingItem) {
  return [["赞", item.likes], ["藏", item.collections], ["评", item.comments], ["转", item.shares]]
    .filter(([, value]) => value !== null)
    .map(([label, value]) => `${metric(value as number)} ${label}`).join(" · ") || "公开指标未知";
}

function PostSupport({ item, support, returnTo }: { item: ReadingItem | undefined; support: CrossPostSupport; returnTo: string }) {
  const postHref = item?.evidenceHref;
  return <li className="cross-post-research__support">
    {postHref ? <Link to={creatorEvidenceHref(postHref, returnTo)}>{item?.title ?? support.postExternalId}</Link>
      : item?.sourceHref ? <><b>{item.title}</b> <a href={item.sourceHref} target="_blank" rel="noreferrer">查看原帖来源</a></>
        : <b>{item?.title ?? support.postExternalId}</b>}
    <span className="cross-post-research__metrics">{item ? `${publicMetrics(item)} · ${publishedDate(item.publishedLabel)}` : "该帖未在当前作品集中"}</span>
    <p>{support.observation}</p>
    {support.evidenceRefs.length > 0 && <details><summary>原始依据 · {support.evidenceRefs.length}</summary><ul>{support.evidenceRefs.map((ref) => <li key={ref}>{/^(\/artifacts\/|\/research\/|https?:\/\/)/.test(ref) ? <a href={ref} target="_blank" rel="noreferrer">{ref}</a> : ref}</li>)}</ul></details>}
  </li>;
}

function performanceScope(data: CrossPostReadingData) {
  const coverage = `${(data.corpus.coverageRate * 100).toFixed(1)}%`;
  return `${data.corpus.postCount} 条可见作品 · ${data.corpus.likesKnown} 条点赞已知 · 指标覆盖 ${coverage} · ${data.portfolio.items.length} 条比较样本 · ${data.portfolio.items.filter(item => item.deepSample).length} 条深度候选`;
}

function revealCorpus() {
  let parent = document.getElementById("corpus")?.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
}

function AudienceClaims({ values, data }: { values: ResearchStatement[]; data: CrossPostReadingData }) {
  if ("run" in data) return <StatementList data={data as CreatorDossier} values={values} empty="受众尚待明确。"/>;
  if (!values.length) return <p className="dossier-empty">受众尚待明确。</p>;
  return <div className="statement-list">{values.map((value, index) => <article key={index} className={`statement statement--${value.factClass}`}>
    <span>{factLabels[value.factClass]} · {confidenceLabels[value.confidence]}</span><p>{value.statement}</p>{value.caveat && <small>{value.caveat}</small>}
    {value.evidenceRefs.length > 0 && <details><summary>查看依据 · {value.evidenceRefs.length}</summary><ul>{value.evidenceRefs.map((reference) => <li key={reference}>{/^(\/artifacts\/|\/research\/|https?:\/\/)/.test(reference) ? <a href={reference} target="_blank" rel="noreferrer">{reference}</a> : reference}</li>)}</ul></details>}
  </article>)}</div>;
}

export function CrossPostResearchReading({ data, research, returnTo, showCorpusLink = true }: { data: CrossPostReadingData; research: CrossPostResearch; returnTo: string; showCorpusLink?: boolean }) {
  const items = new Map(data.portfolio.items.map((item) => [item.id, item]));
  return <section className="cross-post-research" aria-label="跨帖研究">
    <header className="cross-post-research__head"><span>跨帖研究</span><h2>从作品证据读取账号</h2></header>
    {Boolean(data.synthesisSourceChanges?.length) && <p className="cross-post-research__boundary">单帖已出现源修订，本页综合仍基于修订前版本，尚未重新归纳：{data.synthesisSourceChanges!.map((change, index) => {
      const item = items.get(change.postExternalId);
      return <span key={change.postExternalId}>{index > 0 ? "、" : ""}{item?.evidenceHref ? <Link to={creatorEvidenceHref(item.evidenceHref, crossPostReturnTo(returnTo, "portfolio"))} title={change.note}>{item.title}</Link> : change.postExternalId}</span>;
    })}。</p>}
    {research.sections.map((section, sectionIndex) => <section id={section.id} className="cross-post-research__section" key={section.id}>
      <header><span>{String(sectionIndex + 1).padStart(2, "0")}</span><h3>{section.title}</h3></header>
      {section.id === "performance" && <p className="cross-post-research__scope">统计范围：{performanceScope(data)}{showCorpusLink && <> · <a href="#corpus" onClick={revealCorpus}>查看全量基本盘</a></>}</p>}
      {section.id === "value" && data.identity.audience.length > 0 && <div className="cross-post-research__audience"><h4>涉及的受众</h4><AudienceClaims data={data} values={data.identity.audience}/></div>}
      {section.findings.map((finding) => <article className="cross-post-research__finding" key={finding.id}>
        <p className="cross-post-research__meta">{factLabels[finding.factClass]} · {confidenceLabels[finding.confidence]}</p>
        <p className="cross-post-research__statement">{finding.statement}</p>
        <div className="cross-post-research__evidence">
          <div className={`cross-post-research__evidence-groups${finding.counterexamples.length ? "" : " cross-post-research__evidence-groups--single"}`}>
            <div><h4>支持证据 · {finding.support.length} 条</h4>{finding.support.length ? <ul>{finding.support.map((support, index) => <PostSupport key={`${support.postExternalId}-${index}`} item={items.get(support.postExternalId)} support={support} returnTo={crossPostReturnTo(returnTo, section.id)}/>)}</ul> : <p>未提供支持证据。</p>}</div>
            {finding.counterexamples.length ? <div><h4>反例与不一致处 · {finding.counterexamples.length} 条</h4><ul>{finding.counterexamples.map((support, index) => <PostSupport key={`${support.postExternalId}-${index}`} item={items.get(support.postExternalId)} support={support} returnTo={crossPostReturnTo(returnTo, section.id)}/>)}</ul></div> : <p className="cross-post-research__no-counterexamples">未提供反例。</p>}
          </div>
        </div>
        <p className="cross-post-research__boundary"><b>边界：</b>{finding.boundary}</p>
        {finding.openQuestions.length > 0 && <div className="cross-post-research__questions"><b>待回答的问题</b><ul>{finding.openQuestions.map((question) => <li key={question}>{question}</li>)}</ul></div>}
      </article>)}
    </section>)}
  </section>;
}
