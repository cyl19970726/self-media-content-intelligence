import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, Check, FlaskConical, Link2, LockKeyhole, Plus } from "lucide-react";
import {
  createContentPackageSnapshot, createCreationHypothesis, createKnowledgeBinding,
  getPackageKnowledge, listContentPackageSnapshots, listKnowledge
} from "./api";
import type { ContentPackage, ContentPackageSnapshot } from "../../packages/creation/contracts";
import type { CreationHypothesis, KnowledgeBinding, KnowledgeConceptView } from "../../packages/knowledge/contracts";

export function KnowledgeDecisionPanel({ contentPackage }: { contentPackage: ContentPackage }) {
  const [concepts, setConcepts] = useState<KnowledgeConceptView[]>([]);
  const [bindings, setBindings] = useState<KnowledgeBinding[]>([]);
  const [hypotheses, setHypotheses] = useState<CreationHypothesis[]>([]);
  const [snapshots, setSnapshots] = useState<ContentPackageSnapshot[]>([]);
  const [snapshot, setSnapshot] = useState<ContentPackageSnapshot | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [usage, setUsage] = useState<KnowledgeBinding["usage"]>("test");
  const [rationale, setRationale] = useState("");
  const [hypothesisText, setHypothesisText] = useState("");
  const [baseline, setBaseline] = useState("");
  const [expectedSignals, setExpectedSignals] = useState("点赞, 收藏");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (preferredSnapshotId?: string) => {
    const [nextConcepts, nextSnapshots] = await Promise.all([listKnowledge(), listContentPackageSnapshots(contentPackage.id)]);
    const selectedSnapshot = nextSnapshots.find((item) => item.id === preferredSnapshotId)
      ?? nextSnapshots.find((item) => item.status === "working") ?? nextSnapshots[0] ?? null;
    const context = selectedSnapshot ? await getPackageKnowledge(contentPackage.id, selectedSnapshot.id) : { bindings: [], hypotheses: [] };
    setSnapshots(nextSnapshots); setSnapshot(selectedSnapshot);
    setConcepts(nextConcepts); setBindings(context.bindings); setHypotheses(context.hypotheses);
    setSelectedConceptId((current) => current || nextConcepts[0]?.research.concept.id || "");
  }, [contentPackage.id]);
  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "知识决策读取失败")); }, [refresh]);

  const selectedConcept = concepts.find((item) => item.research.concept.id === selectedConceptId) ?? null;
  const currentBindings = useMemo(() => bindings.filter((item) => item.contentPackageSnapshotId === snapshot?.id), [bindings, snapshot?.id]);
  const writable = snapshot?.status === "working";

  const beginDecisionRevision = async () => {
    setBusy(true); setError(null);
    try {
      const created = await createContentPackageSnapshot(contentPackage.id);
      await refresh(created.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "决策版本创建失败"); } finally { setBusy(false); }
  };

  const bind = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedConcept || !snapshot || !writable) return; setBusy(true); setError(null);
    try {
      await createKnowledgeBinding(contentPackage.id, {
        operationKey: `binding:${contentPackage.id}:${selectedConcept.research.currentRevision.id}:${Date.now()}`,
        contentPackageSnapshotId: snapshot.id, targetType: "concept_revision",
        targetId: selectedConcept.research.currentRevision.id, usage, rationale
      });
      setRationale(""); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "知识绑定失败"); } finally { setBusy(false); }
  };

  const declareHypothesis = async (event: FormEvent) => {
    event.preventDefault(); if (!snapshot || !writable) return; setBusy(true); setError(null);
    try {
      await createCreationHypothesis(contentPackage.id, {
        operationKey: `hypothesis:${contentPackage.id}:${Date.now()}`, contentPackageSnapshotId: snapshot.id,
        statement: hypothesisText, linkedBindingIds: currentBindings.map((item) => item.id),
        expectedSignals: expectedSignals.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
        unavailableSignals: ["impressions", "completion_rate", "conversion"], baselineDeclaration: baseline, confounders: []
      });
      setHypothesisText(""); setBaseline(""); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "假设声明失败"); } finally { setBusy(false); }
  };

  return <section className="knowledge-decision-panel">
    <header><div><BookOpen size={17}/><span>KNOWLEDGE DECISION / {snapshot?.status === "frozen" ? "FROZEN" : "WORKING"}</span></div>
      <div className="snapshot-ledger"><p>{snapshot ? `S${snapshot.sequence} · ${snapshot.id.slice(0, 8)} · ${snapshot.status === "frozen" ? "已随平台版本冻结" : "等待平台版本锁定"}` : "这个旧内容包尚无决策版本"}</p>
        {(!snapshot || snapshot.status === "frozen") && <button type="button" disabled={busy} onClick={() => void beginDecisionRevision()}><Plus size={13}/> 新建决策版本</button>}
      </div></header>
    {error && <p className="decision-error">{error}</p>}
    {snapshots.length > 1 && <nav className="snapshot-track" aria-label="内容包决策版本">{snapshots.map((item) => <button type="button" key={item.id}
      className={snapshot?.id === item.id ? "active" : ""} onClick={() => void refresh(item.id)}>{item.status === "frozen" && <LockKeyhole size={11}/>} S{item.sequence}</button>)}</nav>}
    <div className="decision-columns">
      <form onSubmit={(event) => void bind(event)}>
        <span>01 / 选择并绑定</span>
        <label>知识概念<select value={selectedConceptId} onChange={(event) => setSelectedConceptId(event.target.value)} required>
          {concepts.map((item) => <option value={item.research.concept.id} key={item.research.concept.id}>{item.research.concept.name} · r{item.research.currentRevision.revision}</option>)}
        </select></label>
        <label>使用方式<select value={usage} onChange={(event) => setUsage(event.target.value as KnowledgeBinding["usage"])}><option value="adopt">采用</option><option value="adapt">改编</option><option value="reject">拒绝</option><option value="test">测试</option></select></label>
        <label>为什么这样用<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={2} required/></label>
        <button disabled={busy || !selectedConcept || !writable}><Link2 size={14}/> 锁定 revision</button>
        <div className="pinned-list">{currentBindings.map((item) => <p key={item.id} className={`binding-${item.status}`}><Check size={13}/><span>{item.usage} · {item.status}<small>{item.targetId}</small><small>{item.rationale}</small></span></p>)}</div>
      </form>
      <form onSubmit={(event) => void declareHypothesis(event)}>
        <span>02 / 声明创作假设</span>
        <label>如果……那么……<textarea value={hypothesisText} onChange={(event) => setHypothesisText(event.target.value)} rows={3} required/></label>
        <label>预期可观察信号<input value={expectedSignals} onChange={(event) => setExpectedSignals(event.target.value)}/></label>
        <label>比较基线<input value={baseline} onChange={(event) => setBaseline(event.target.value)} required/></label>
        <small>曝光、完播和转化默认标记为不可用，系统不会从点赞倒推。</small>
        <button disabled={busy || currentBindings.length === 0 || !writable}><FlaskConical size={14}/> 记录假设</button>
      </form>
      <div className="validation-register">
        <span>03 / 冻结并交给发布</span>
        {hypotheses.map((item) => <article key={item.id}><strong>{item.statement}</strong><small>基线 · {item.baselineDeclaration}</small><small>预期 · {item.expectedSignals.join(" / ")}</small></article>)}
        {hypotheses.length === 0 && <p>先声明可证伪的创作假设；平台版本冻结后，结果复盘会出现在对应发布任务的历史卷宗中。</p>}
        {hypotheses.length > 0 && <p>这里仅负责发布前声明。实际结果、数据缺口与独立裁决只会写入对应的 Publication History。</p>}
      </div>
    </div>
  </section>;
}
