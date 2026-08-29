import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CircleSlash2, FlaskConical, LockKeyhole, Scale, ShieldAlert } from "lucide-react";
import type { PublicationRun } from "../../packages/creation/contracts";
import type { CreationHypothesis, KnowledgeConceptView, PracticeValidation } from "../../packages/knowledge/contracts";
import {
  adjudicatePracticeValidation, createPracticeValidation, getPackageKnowledge, listKnowledge,
  listPracticeValidations, submitPracticeValidation
} from "./api";

const statusCopy: Record<PracticeValidation["status"], string> = {
  draft: "等待结果证据", evidence_ready: "证据可提交", adjudication_pending: "等待独立裁决",
  completed_no_promotion: "完成 · 不进入知识", promoted: "已写入第一方观察",
  blocked: "阻塞", invalidated: "已失效"
};

const relationCopy = { confirm: "支持", qualify: "限定", contradict: "反驳", inconclusive: "无法判断" } as const;

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function PracticeValidationHistory({ run }: { run: PublicationRun }) {
  const [hypotheses, setHypotheses] = useState<CreationHypothesis[]>([]);
  const [concepts, setConcepts] = useState<KnowledgeConceptView[]>([]);
  const [validations, setValidations] = useState<PracticeValidation[]>([]);
  const [hypothesisId, setHypothesisId] = useState("");
  const [signal, setSignal] = useState({ name: "收藏", value: "", unit: "count", source: "manual-public" });
  const [unavailableReason, setUnavailableReason] = useState("平台未提供该私有指标");
  const [deviations, setDeviations] = useState("");
  const [confounders, setConfounders] = useState("");
  const [relation, setRelation] = useState<"confirm" | "qualify" | "contradict" | "inconclusive">("inconclusive");
  const [targetConceptId, setTargetConceptId] = useState("");
  const [candidateReason, setCandidateReason] = useState("");
  const [submittedBy, setSubmittedBy] = useState("content-reviewer");
  const [adjudicatorId, setAdjudicatorId] = useState("knowledge-adjudicator");
  const [adjudicationReason, setAdjudicationReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextValidations, nextConcepts, context] = await Promise.all([
      listPracticeValidations(run.id), listKnowledge(),
      run.contentPackageSnapshotId
        ? getPackageKnowledge(run.variant.packageId, run.contentPackageSnapshotId)
        : Promise.resolve({ bindings: [], hypotheses: [] })
    ]);
    setValidations(nextValidations); setConcepts(nextConcepts); setHypotheses(context.hypotheses);
    const available = context.hypotheses.filter((item) => !nextValidations.some((validation) => validation.hypothesisId === item.id));
    setHypothesisId((current) => available.some((item) => item.id === current) ? current : available[0]?.id || "");
    setTargetConceptId((current) => current || nextConcepts[0]?.research.concept.id || "");
  }, [run.id, run.contentPackageSnapshotId, run.variant.packageId]);

  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "实践验证读取失败")); }, [refresh]);

  const selectedHypothesis = hypotheses.find((item) => item.id === hypothesisId) ?? null;
  const eligibleRun = (run.status === "published" || run.status === "draft_saved") && Boolean(run.receipt) && Boolean(run.contentPackageSnapshotId);
  const missingHypotheses = useMemo(() => hypotheses.filter((item) => !validations.some((validation) => validation.hypothesisId === item.id)), [hypotheses, validations]);

  const execute = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await operation(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "实践验证操作失败"); }
    finally { setBusy(false); }
  };

  const create = () => {
    if (!selectedHypothesis) return;
    const now = new Date().toISOString();
    const observedSignals = signal.value === "" ? [] : [{ ...signal, value: Number(signal.value), collectedAt: now }];
    const unavailableMetrics = selectedHypothesis.unavailableSignals.map((name) => ({
      name, reason: unavailableReason, source: "declared-platform-gap", recordedAt: now
    }));
    return execute(() => createPracticeValidation(run.id, {
      operationKey: `validation:${run.id}:${selectedHypothesis.id}`,
      hypothesisId: selectedHypothesis.id, observedSignals, unavailableMetrics,
      executionDeviations: splitLines(deviations), confounders: splitLines(confounders)
    }));
  };

  const submit = (validation: PracticeValidation) => execute(() => submitPracticeValidation(validation.id, {
    operationKey: `submit:${validation.id}`,
    proposedRelation: relation,
    targetConceptId: relation === "inconclusive" ? null : targetConceptId,
    decisionReason: candidateReason,
    submittedBy
  }));

  const adjudicate = (validation: PracticeValidation, decision: "promote" | "complete_no_promotion" | "block" | "invalidate") => execute(() =>
    adjudicatePracticeValidation(validation.id, {
      operationKey: `adjudicate:${validation.id}:${decision}:${Date.now()}`,
      decision, reason: adjudicationReason, adjudicatorId
    })
  );

  return <section className="practice-case-file">
    <header><div><FlaskConical size={15}/><span>PRACTICE VALIDATION / CASE FILE</span></div><code>S{run.contentPackageSnapshotId?.slice(0, 8) ?? "LEGACY"} · V{run.variantRevision}</code></header>
    {error && <p className="practice-error"><AlertTriangle size={14}/>{error}</p>}
    {!eligibleRun && <div className="practice-empty"><LockKeyhole size={18}/><div><strong>尚不能创建实践验证</strong><p>需要已发布回执，或已验证保存的公众号草稿；准备中、失败和结果未知的任务不会被当作真实执行。</p></div></div>}
    {eligibleRun && missingHypotheses.length > 0 && <div className="practice-capture">
      <span>CAPTURE OBSERVABLE OUTCOME</span>
      <label>预先声明的假设<select value={hypothesisId} onChange={(event) => setHypothesisId(event.target.value)}>{missingHypotheses.map((item) => <option key={item.id} value={item.id}>{item.statement}</option>)}</select></label>
      <div className="signal-row"><label>信号<input value={signal.name} onChange={(event) => setSignal({ ...signal, name: event.target.value })}/></label><label>数值<input type="number" value={signal.value} onChange={(event) => setSignal({ ...signal, value: event.target.value })}/></label><label>单位<input value={signal.unit} onChange={(event) => setSignal({ ...signal, unit: event.target.value })}/></label></div>
      <label>数据来源<input value={signal.source} onChange={(event) => setSignal({ ...signal, source: event.target.value })}/></label>
      {selectedHypothesis && selectedHypothesis.unavailableSignals.length > 0 && <label>不可用指标原因<input value={unavailableReason} onChange={(event) => setUnavailableReason(event.target.value)}/><small>{selectedHypothesis.unavailableSignals.join(" / ")} 会被记录为不可用，不会写成 0。</small></label>}
      <label>执行偏差<textarea rows={2} value={deviations} onChange={(event) => setDeviations(event.target.value)} placeholder="每行一项；没有则留空"/></label>
      <label>新增混杂因素<textarea rows={2} value={confounders} onChange={(event) => setConfounders(event.target.value)} placeholder="每行一项；没有则留空"/></label>
      <button disabled={busy || !selectedHypothesis} onClick={() => void create()}><Check size={13}/> 冻结本次结果</button>
    </div>}
    {eligibleRun && hypotheses.length === 0 && <div className="practice-empty"><CircleSlash2 size={18}/><div><strong>这个冻结版本没有预先声明的假设</strong><p>系统不会在发布后倒推一个“看起来成功”的假设。</p></div></div>}
    <div className="practice-ledger">{validations.map((validation) => {
      const hypothesis = validation.hypothesisSnapshot ?? hypotheses.find((item) => item.id === validation.hypothesisId) ?? null;
      return <article key={validation.id} className={`practice-record practice-record--${validation.status}`}>
        <div className="practice-record-head"><span>{statusCopy[validation.status]}</span><code>{validation.id.slice(0, 8)}</code></div>
        <div className="practice-triptych">
          <section><b>01 / PLANNED</b><strong>{hypothesis?.statement ?? "旧记录未冻结假设文本"}</strong><dl><div><dt>基线</dt><dd>{hypothesis?.baselineDeclaration ?? "未记录"}</dd></div><div><dt>预期</dt><dd>{hypothesis?.expectedSignals.join(" / ") || "未记录"}</dd></div><div><dt>不可用</dt><dd>{hypothesis?.unavailableSignals.join(" / ") || "无"}</dd></div></dl></section>
          <section><b>02 / OBSERVED</b>{validation.observedSignals.map((item) => <div className="observed-line" key={`${item.name}:${item.collectedAt}`}><strong>{item.value} {item.unit}</strong><span>{item.name}</span><small>{item.source} · {new Date(item.collectedAt).toLocaleString("zh-CN")}</small></div>)}
            {validation.observedSignals.length === 0 && <p>没有可观察数值。</p>}
            {validation.unavailableMetrics.map((item) => <p className="unavailable-line" key={`${item.name}:${item.recordedAt}`}><ShieldAlert size={12}/><span>{item.name} · {item.reason}</span></p>)}
            {(validation.executionDeviations.length > 0 || validation.confounders.length > 0) && <dl><div><dt>执行偏差</dt><dd>{validation.executionDeviations.join("；") || "无"}</dd></div><div><dt>混杂因素</dt><dd>{[...(hypothesis?.confounders ?? []), ...validation.confounders].join("；") || "无"}</dd></div></dl>}
          </section>
          <section><b>03 / DECISION</b>{validation.proposedRelation && <strong>{relationCopy[validation.proposedRelation]}</strong>}<p>{validation.adjudicationReason ?? validation.decisionReason ?? "尚未提交学习判断。"}</p>
            {validation.submittedBy && <small>提交 · {validation.submittedBy}</small>}{validation.adjudicatedBy && <small>裁决 · {validation.adjudicatedBy}</small>}{validation.promotedObservationId && <code>OBS {validation.promotedObservationId.slice(0, 8)} · FIRST PARTY</code>}
          </section>
        </div>
        {validation.status === "evidence_ready" && <div className="practice-actions"><label>候选关系<select value={relation} onChange={(event) => setRelation(event.target.value as typeof relation)}><option value="confirm">支持</option><option value="qualify">限定</option><option value="contradict">反驳</option><option value="inconclusive">无法判断</option></select></label>{relation !== "inconclusive" && <label>目标知识<select value={targetConceptId} onChange={(event) => setTargetConceptId(event.target.value)}>{concepts.map((item) => <option key={item.research.concept.id} value={item.research.concept.id}>{item.research.concept.name}</option>)}</select></label>}<label>提交者<input value={submittedBy} onChange={(event) => setSubmittedBy(event.target.value)}/></label><label className="wide">判断理由<input value={candidateReason} onChange={(event) => setCandidateReason(event.target.value)}/></label><button disabled={busy || !candidateReason || !submittedBy} onClick={() => void submit(validation)}><Scale size={13}/> 提交独立裁决</button></div>}
        {validation.status === "adjudication_pending" && <div className="practice-actions"><label>独立裁决者<input value={adjudicatorId} onChange={(event) => setAdjudicatorId(event.target.value)}/></label><label className="wide">裁决理由<input value={adjudicationReason} onChange={(event) => setAdjudicationReason(event.target.value)}/></label>{validation.proposedRelation !== "inconclusive" && <button disabled={busy || !adjudicationReason || !adjudicatorId} onClick={() => void adjudicate(validation, "promote")}><Check size={13}/> 写入第一方观察</button>}<button disabled={busy || !adjudicationReason || !adjudicatorId} onClick={() => void adjudicate(validation, "complete_no_promotion")}>完成但不晋升</button><button disabled={busy || !adjudicationReason || !adjudicatorId} onClick={() => void adjudicate(validation, "block")}>标记阻塞</button><button disabled={busy || !adjudicationReason || !adjudicatorId} onClick={() => void adjudicate(validation, "invalidate")}>判定失效</button></div>}
        {["promoted", "completed_no_promotion", "blocked"].includes(validation.status) && <div className="practice-invalidate">
          <label>复核人<input value={adjudicatorId} onChange={(event) => setAdjudicatorId(event.target.value)}/></label>
          <label>失效原因<input value={adjudicationReason} onChange={(event) => setAdjudicationReason(event.target.value)} placeholder="例如：指标来源撤回或回执 lineage 失效"/></label>
          <button disabled={busy || !adjudicationReason || !adjudicatorId} onClick={() => void adjudicate(validation, "invalidate")}>来源失效时撤销该学习决定</button>
        </div>}
      </article>;
    })}</div>
  </section>;
}
