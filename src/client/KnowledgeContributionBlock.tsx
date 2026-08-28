import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CircleAlert } from "lucide-react";
import { listKnowledgeContributions } from "./api";
import type { KnowledgeContribution, KnowledgeContributionManifest } from "../../packages/knowledge/contracts";

export function KnowledgeContributionBlock({ subjectType, subjectId }: { subjectType: "video" | "creator" | "comparison"; subjectId: string }) {
  const [rows, setRows] = useState<Array<{ manifest: KnowledgeContributionManifest; contributions: KnowledgeContribution[] }>>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void listKnowledgeContributions(subjectType, subjectId).then(setRows).finally(() => setLoaded(true));
  }, [subjectType, subjectId]);
  return <section className="knowledge-contribution-block">
    <header><BookOpen size={16}/><div><span>KNOWLEDGE CONTRIBUTION</span><h2>这份研究为知识系统贡献了什么</h2></div><Link to="/knowledge">打开知识索引</Link></header>
    {!loaded ? <p>正在核对贡献清单……</p> : rows.length === 0 ? <div className="contribution-none"><CircleAlert size={16}/><p>尚无可解析的贡献清单。它不等于“没有学到东西”；历史报告需要固定 analysis revision 与 evidence refs 后才能回填。</p></div>
      : rows.map(({ manifest, contributions }) => <article key={manifest.id}><div><b>{manifest.status.replaceAll("_", " ")}</b><small>{manifest.analysisRevisionId} · {manifest.compilerPolicyVersion}</small></div>
        {contributions.length === 0 ? <p>已审核，本 revision 没有形成可复用的新知识。</p> : <ul>{contributions.map((item) => <li key={item.id}><span>{item.disposition}</span>{item.targetConceptId ? <Link to={`/knowledge/${item.targetConceptId}`}>{item.candidateStatement}</Link> : item.candidateStatement}</li>)}</ul>}
      </article>)}
  </section>;
}
