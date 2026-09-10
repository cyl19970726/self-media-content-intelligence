import { Link, useLocation } from 'react-router-dom';
import type { CreatorDossier, ResearchStatement } from '../../shared/contracts/core';
import { statementSources, canonicalCreatorHref } from './model/creator-reading';
const factLabels = {observed:'观察',author_claim:'作者主张',inference:'推断',unknown:'未知'};
export function StatementList({ values, empty, data }: {values: ResearchStatement[]; empty:string; data:CreatorDossier}) {
  const location = useLocation();
  if (!values.length) return <p className="dossier-empty">{empty}</p>;
  return <div className="statement-list">{values.map((value,index) => <article key={index} className={`statement statement--${value.factClass}`}>
    <span>{factLabels[value.factClass]} · {value.confidence}</span><p>{value.statement}</p>{value.caveat && <small>{value.caveat}</small>}
    {!!value.evidenceRefs.length && <details><summary>查看依据 · {value.evidenceRefs.length}</summary><ul>{statementSources(value.evidenceRefs,data.portfolio.items,data.run ? `${canonicalCreatorHref(data.canonicalId,data.run.id,location.search)}${location.hash}` : `${location.pathname}${location.search}${location.hash}`).map(source => <li key={source.ref}>{source.href?.startsWith('/creators/') ? <><Link to={source.href}>{source.label}</Link>{source.rawHref && <> · <a href={source.rawHref} target="_blank" rel="noreferrer">引用文件</a></>}</> : source.href ? <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</li>)}</ul></details>}
  </article>)}</div>;
}
