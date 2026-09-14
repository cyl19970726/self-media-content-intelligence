import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, FileWarning, Layers3, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { adjudicateKnowledgeProposal, getKnowledgeActivationPlan, listKnowledgeProposals } from "../../shared/api/client";
import type { KnowledgeCompilationProposal } from "../../shared/contracts/knowledge";

const statusLabel = {
  pending_review: "待审核", applied: "已应用", retained_local: "保留在研究层",
  awaiting_evidence: "等待证据", rejected: "已拒绝"
} as const;

const actions = [
  { decision: "apply", label: "进入 Wiki", icon: Check, reason: "证据、边界与晋升范围已人工核对。" },
  { decision: "retain_local", label: "只保留研究", icon: Layers3, reason: "结论对当前研究有价值，但不足以成为正式知识。" },
  { decision: "await_evidence", label: "等待证据", icon: Clock3, reason: "候选方向成立，但仍缺少晋升所需证据。" },
  { decision: "reject", label: "拒绝", icon: X, reason: "候选结论重复、不可验证或不值得进入知识系统。" }
] as const;

export function KnowledgeActivationWorkbench({ onApplied }: { onApplied: () => void }) {
  const [proposals, setProposals] = useState<KnowledgeCompilationProposal[]>([]);
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof getKnowledgeActivationPlan>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => Promise.all([listKnowledgeProposals(), getKnowledgeActivationPlan()]).then(([items, activation]) => {
    setProposals(items); setPlan(activation);
  }).catch((cause) =>
    setError(cause instanceof Error ? cause.message : "知识提案读取失败")).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const latest = useMemo(() => {
    const seen = new Set<string>();
    return proposals.filter((proposal) => { const key = `${proposal.subjectType}:${proposal.subjectId}`;
      if (seen.has(key)) return false; seen.add(key); return true; });
  }, [proposals]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(statusLabel).map((status) =>
    [status, latest.filter((proposal) => proposal.status === status).length])), [latest]);
  const labels = useMemo(() => new Map(plan?.items.map((item) => [`${item.subjectType}:${item.subjectId}`, item.label]) ?? []), [plan]);
  const review = async (proposal: KnowledgeCompilationProposal, action: typeof actions[number]) => {
    setBusy(proposal.id); setError(null);
    try { await adjudicateKnowledgeProposal(proposal, action.decision, action.reason); await load(); if (action.decision === "apply") onApplied(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "知识提案裁决失败"); }
    finally { setBusy(null); }
  };
  return <section className="activation-workbench">
    <header><div><ShieldCheck size={18}/><span>ACTIVATION REVIEW</span><h2>研究不会自动变成知识</h2></div>
      <p>先看候选、证据和晋升范围，再决定它的去向。</p></header>
    <div className="activation-counts">{Object.entries(statusLabel).map(([status, label]) =>
      <div key={status}><span>{label}</span><strong>{String(status === "awaiting_evidence" ? plan?.totals.await_evidence ?? 0
        : status === "rejected" ? plan?.totals.reject ?? 0 : counts[status] ?? 0).padStart(2, "0")}</strong></div>)}</div>
    {error && <p className="activation-error"><FileWarning size={15}/>{error}</p>}
    {loading ? <div className="activation-empty"><LoaderCircle className="spin"/> 正在读取提案</div>
      : latest.length === 0 ? <div className="activation-empty">目前没有知识贡献提案。完成的研究会先来到这里。</div>
        : <div className="activation-register">{latest.map((proposal) => <article key={proposal.id}>
          <div className="activation-subject"><span>{proposal.subjectType}</span><strong>{labels.get(`${proposal.subjectType}:${proposal.subjectId}`) ?? proposal.subjectId}</strong>
            <small>{proposal.subjectId}</small>
            <small>{proposal.compilerPolicyVersion}</small></div>
          <div className="activation-proposal"><span>{proposal.status === "applied" && proposal.candidateCount === 0 ? "已审核，无新增" : statusLabel[proposal.status]}</span>
            <h3>{proposal.candidateCount} 条候选观察 · {proposal.promotionRequestCount} 个晋升请求</h3>
            <p>{proposal.reviewReason ?? "等待操作者核对综合结论、适用边界与原始证据。"}</p>
            <small>REV {proposal.analysisRevisionId} · {proposal.inputFingerprint.slice(0, 18)}…</small></div>
          <div className="activation-actions">{proposal.status === "pending_review" ? actions.map((action) => {
            const Icon = action.icon; return <button key={action.decision} disabled={busy === proposal.id}
              onClick={() => void review(proposal, action)}><Icon size={13}/>{action.label}</button>;
          }) : <><b>{proposal.status === "applied" && proposal.candidateCount === 0 ? "已审核，无新增" : statusLabel[proposal.status]}</b><small>{proposal.reviewedBy} · {proposal.reviewedAt?.slice(0, 10)}</small></>}</div>
        </article>)}</div>}
  </section>;
}
