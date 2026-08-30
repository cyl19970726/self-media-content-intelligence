import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BookOpen, CircleAlert, GitBranch, LoaderCircle, Search, ShieldAlert } from "lucide-react";
import { getKnowledge, listKnowledge, listKnowledgeGaps, listKnowledgeInvalidations } from "../../shared/api/client";
import type { KnowledgeConceptView, KnowledgeGap, KnowledgeInvalidationRecord } from "../../shared/contracts/knowledge";

const scopeLabels = {
  video_specific: "单帖观察", creator_specific: "博主模式", conditional: "条件规律", track_wide: "跨博主规律"
} as const;
const relationLabels = { confirm: "支持", qualify: "限定", contradict: "反驳" } as const;

function subjectHref(type: "video" | "creator" | "comparison" | "practice_validation", id: string): string | null {
  if (type === "video") return `/runs/${id}`;
  if (type === "creator") return `/creators/${id}`;
  if (type === "comparison") return `/comparisons/${id}`;
  return null;
}

function evidenceHref(reference: string): string | null {
  const match = /^run:([^:]+):report\.json#/u.exec(reference);
  if (match?.[1]) return `/artifacts/${encodeURIComponent(match[1])}/report.json`;
  return reference.startsWith("evidence:") ? `/evidence?evidenceId=${encodeURIComponent(reference.slice("evidence:".length))}` : null;
}

export default function KnowledgeWorkspace() {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState<KnowledgeConceptView[]>([]);
  const [detail, setDetail] = useState<KnowledgeConceptView | null>(null);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [invalidations, setInvalidations] = useState<KnowledgeInvalidationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([listKnowledge({ q: query, scope, status }), listKnowledgeGaps()])
      .then(([nextConcepts, nextGaps]) => { setConcepts(nextConcepts); setGaps(nextGaps); setError(null); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "知识索引读取失败"))
      .finally(() => setLoading(false));
  }, [query, scope, status]);

  useEffect(() => {
    if (!conceptId) { setDetail(null); return; }
    void Promise.all([getKnowledge(conceptId), listKnowledgeInvalidations(conceptId)])
      .then(([nextDetail, nextInvalidations]) => { setDetail(nextDetail); setInvalidations(nextInvalidations); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "知识详情读取失败"));
  }, [conceptId]);

  const health = useMemo(() => ({
    active: concepts.filter((item) => item.research.concept.status === "active").length,
    candidate: concepts.filter((item) => item.research.concept.status === "candidate").length,
    contradicted: concepts.filter((item) => item.research.counts.contradict > 0).length,
    stale: concepts.filter((item) => ["invalidated", "retired"].includes(item.research.concept.status)).length
  }), [concepts]);

  if (detail && conceptId) return <main className="knowledge-detail">
    <aside className="knowledge-context">
      <Link to="/knowledge"><ArrowLeft size={15}/> 返回知识索引</Link>
      <span>CONCEPT / {detail.research.concept.kind.replaceAll("_", " ")}</span>
      <strong>{scopeLabels[detail.research.concept.scope]}</strong>
      <small>REV {detail.research.currentRevision.revision} · {detail.research.concept.status}</small>
    </aside>
    <article className="knowledge-document">
      <header>
        <div><span>{detail.maturity.replaceAll("_", " ")}</span><b>{detail.research.concept.status}</b></div>
        <h1>{detail.research.concept.name}</h1>
        <p>{detail.research.currentRevision.definition}</p>
      </header>
      <section className="knowledge-conditions">
        <div><span>适用条件</span><p>{Object.entries(detail.research.currentRevision.condition).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(" · ") || "尚未声明额外条件"}</p></div>
        <div><span>明确排除</span><ul>{detail.research.currentRevision.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>
      <section className="knowledge-evidence">
        <header><span>EVIDENCE REGISTER</span><h2>证据不是脚注，是判断本身</h2></header>
        {(["confirm", "qualify", "contradict"] as const).map((relation) => <div className={`evidence-lane evidence-lane--${relation}`} key={relation}>
          <h3>{relationLabels[relation]} <b>{detail.research.observations.filter((item) => item.relation === relation).length}</b></h3>
          <div>{detail.research.observations.filter((item) => item.relation === relation).map((item) => <article key={item.id}>
            <span>{item.subjectType} / {subjectHref(item.subjectType, item.subjectId) ? <Link to={subjectHref(item.subjectType, item.subjectId)!}>{item.subjectId}</Link> : item.subjectId}</span><p>{item.statement}</p>
            <small>{item.confidence} · {item.gateState} · concept revision {item.conceptRevisionId} · analysis {item.analysisRevisionId}</small>
            <ul>{item.evidenceRefs.map((reference) => <li key={reference}>{evidenceHref(reference) ? <a href={evidenceHref(reference)!} target="_blank" rel="noreferrer">{reference}</a> : reference}</li>)}</ul>
          </article>)}</div>
        </div>)}
      </section>
      <section className="knowledge-history">
        <span>REVISION DECISIONS</span>
        {detail.research.revisions.slice().reverse().map((revision) => <article key={revision.id}>
          <b>R{revision.revision}</b><div><strong>{revision.changeType}</strong><p>{revision.decision}</p></div><small>{revision.createdAt.slice(0, 10)}</small>
        </article>)}
      </section>
      <section className="knowledge-impact-ledger">
        <header><span>IMPACT LEDGER / CURRENT BASIS</span><h2>哪些判断已经被这次变化触达</h2></header>
        <div className="impact-chain">
          <div><span>01 / SOURCE</span><strong>{invalidations.length}</strong><small>失效记录</small></div>
          <div><span>02 / OBSERVATION</span><strong>{new Set(invalidations.flatMap((item) => item.affectedObservationIds)).size}</strong><small>受影响观察</small></div>
          <div><span>03 / SEMANTIC</span><strong>{detail.edges.filter((item) => item.status === "invalidated").length}</strong><small>失效关系</small></div>
          <div><span>04 / CREATION</span><strong>{detail.bindings.filter((item) => item.status !== "current").length}</strong><small>待复核绑定</small></div>
        </div>
        {invalidations.length === 0 ? <p className="impact-empty">当前概念没有硬失效记录。版本变化仍会通过绑定状态单独呈现。</p>
          : invalidations.map((item) => <article key={item.id}>
            <div><ShieldAlert size={15}/><strong>{item.targetType.replaceAll("_", " ")} / {item.targetId}</strong></div>
            <p>{item.reason}</p><small>{item.actorId} · {item.createdAt.slice(0, 10)} · {item.affectedManifestIds.length} manifests · {item.affectedBindingIds.length} bindings</small>
          </article>)}
      </section>
      <section className="knowledge-history">
        <span>CONTRIBUTION LINEAGE</span>
        {detail.contributions.map(({ manifest, contribution }) => <article key={contribution.id}>
          <b>{contribution.disposition}</b><div><strong>{manifest.subjectType} / {manifest.subjectId}</strong><p>{contribution.decisionReason}</p>
            {manifest.promotionDecisions.filter((decision) => decision.conceptId === detail.research.concept.id).map((decision) =>
              <p key={`${decision.conceptSlug}:${decision.targetScope}`}>晋升判定：{decision.status} → {decision.targetScope} · {decision.reason}</p>)}</div><small>{manifest.compilerPolicyVersion}</small>
        </article>)}
      </section>
    </article>
    <aside className="knowledge-lineage">
      <span>LINEAGE / IMPACT</span>
      <dl><div><dt>支持视频</dt><dd>{detail.research.counts.distinctEligibleVideos}</dd></div><div><dt>不同博主</dt><dd>{detail.research.counts.distinctEligibleCreators}</dd></div><div><dt>下游绑定</dt><dd>{detail.bindings.length}</dd></div><div><dt>语义关系</dt><dd>{detail.edges.length}</dd></div></dl>
      {detail.edges.map((edge) => <article className={`lineage-item lineage-item--${edge.status}`} key={edge.id}><GitBranch size={14}/><div><strong>{edge.relation.replaceAll("_", " ")} · {edge.status}</strong><small>{edge.targetConceptId === conceptId ? edge.sourceConceptId : edge.targetConceptId}</small></div></article>)}
      {detail.bindings.filter((item) => item.status !== "current").map((binding) => <article className={`lineage-item lineage-item--${binding.status}`} key={binding.id}><ShieldAlert size={14}/><div><strong>{binding.status.replaceAll("_", " ")}</strong><small>{binding.contentPackageId}</small></div></article>)}
    </aside>
  </main>;

  return <main className="knowledge-workspace">
    <aside className="knowledge-filters">
      <header><BookOpen size={18}/><div><span>CONTENT KNOWLEDGE</span><strong>{String(concepts.length).padStart(2, "0")}</strong></div></header>
      <label><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索概念、定义、排除项"/></label>
      <span>范围</span>
      <button className={!scope ? "active" : ""} onClick={() => setScope("")}>全部范围</button>
      {Object.entries(scopeLabels).map(([key, label]) => <button className={scope === key ? "active" : ""} onClick={() => setScope(key)} key={key}>{label}</button>)}
      <span>状态</span>
      {["", "candidate", "active", "qualified", "contradicted", "invalidated"].map((value) => <button className={status === value ? "active" : ""} onClick={() => setStatus(value)} key={value || "all"}>{value || "全部状态"}</button>)}
    </aside>
    <section className="knowledge-index">
      <header><div><span>KNOWLEDGE REGISTER / CURRENT</span><h1>我们现在<br/><em>相信什么？</em></h1></div><p>每条知识都带着成立条件、反例、来源和版本。这里展示的是当前可审计判断，不是模型记忆。</p></header>
      <div className="knowledge-health">{Object.entries(health).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value).padStart(2, "0")}</strong></div>)}</div>
      {loading ? <div className="knowledge-empty"><LoaderCircle className="spin"/><p>正在重建知识索引</p></div>
        : error ? <div className="knowledge-empty"><CircleAlert/><p>{error}</p></div>
          : concepts.length === 0 ? <div className="knowledge-empty"><BookOpen/><h2>知识真相源尚为空</h2><p>通过研究闸门的分析会在这里留下贡献清单；系统不会用旧报告文案补造规律。</p></div>
            : <div className="concept-register">{concepts.map((item, index) => <button key={item.research.concept.id} onClick={() => navigate(`/knowledge/${item.research.concept.id}`)}>
              <span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.research.concept.kind.replaceAll("_", " ")}</small><h2>{item.research.concept.name}</h2><p>{item.research.currentRevision.definition}</p></div>
              <div><b>{scopeLabels[item.research.concept.scope]}</b><strong>{item.research.counts.confirm}/{item.research.counts.qualify}/{item.research.counts.contradict}</strong><small>支持 / 限定 / 反驳</small></div>
            </button>)}</div>}
    </section>
    <aside className="knowledge-gaps"><header><AlertTriangle size={16}/><span>KNOWLEDGE HEALTH / LINT</span><b>{gaps.length}</b></header>
      {gaps.length === 0 ? <p>当前没有待处理的知识健康问题。</p> : gaps.map((gap) => <article className={`lint-item lint-item--${gap.severity}`} key={gap.id}>
        <span>{gap.severity} / {gap.code.replaceAll("-", " ")}</span><small>{gap.subjectType.replaceAll("_", " ")} · {gap.subjectId}</small>
        <p>{gap.message}</p><em>{gap.suggestedAction}</em>{gap.conceptId && <Link to={`/knowledge/${gap.conceptId}`}>查看影响链</Link>}
      </article>)}
    </aside>
  </main>;
}
