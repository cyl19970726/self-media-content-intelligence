import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, GitBranch, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getLearningLoop, getLearningLoopEvents, getLearningLoopLineage, listLearningLoops, type LearningLoopEventView, type LearningLoopLineageView } from "./api";
import type { LearningLoopRun } from "../shared/learning-loop";
import { deriveLearningLoopSummary, learningLoopStatusCopy as statusCopy } from "./learning-loop-view";

const gateCopy: Record<string, string> = {
  source_integrity: "原始来源完整",
  content_restoration: "内容还原",
  directing_logic: "编导逻辑",
  visual_editing_logic: "画面与剪辑",
  blind_input_isolation: "盲测输入隔离",
  blind_traceability: "盲测过程可追溯",
  blind_quality: "真实用户完成任务",
  regression: "修复未破坏旧能力",
  untouched_holdout: "未参与优化的样本仍通过",
  meta_coverage: "没有漏检重要通道",
  observation_adjudication: "新认知已独立裁决"
};

const closureCopy: Record<string, string> = {
  product_projection: "产品呈现没有把已有研究深度交付给用户",
  cross_surface_navigation: "不同研究页面之间无法顺畅完成任务",
  task_state_transparency: "新任务当前做到哪、下一步需要什么不够清楚"
};

function RunDetail({ run }: { run: LearningLoopRun }) {
  const [events, setEvents] = useState<LearningLoopEventView[]>([]);
  const [lineage, setLineage] = useState<LearningLoopLineageView | null>(null);
  useEffect(() => {
    void Promise.all([getLearningLoopEvents(run.id), getLearningLoopLineage(run.id)]).then(([nextEvents, nextLineage]) => {
      setEvents(nextEvents); setLineage(nextLineage);
    });
  }, [run.id]);
  const passed = run.gates.filter((gate) => gate.pass).length;
  const failed = run.gates.filter((gate) => !gate.pass);
  const development = run.cases.filter((item) => item.role === "development");
  const holdout = run.cases.filter((item) => item.role === "holdout");
  const summary = deriveLearningLoopSummary(run);
  const isProductBlind = summary.isProductBlind;
  return <div className="loop-detail">
    <header className="loop-hero">
      <div><span>ITERATION {run.id}</span><h1>这一轮，系统真的<em>变得更有用了吗？</em></h1></div>
      <div className={`loop-state loop-state--${failed.length ? "attention" : "pass"}`}>
        <strong>{statusCopy[run.status].label}</strong><p>{statusCopy[run.status].detail}</p>
      </div>
    </header>

    <section className="loop-truth-strip">
      <article><span>本轮对象</span><strong>{run.targetCreatorIds.length} 位博主</strong><small>{run.targetCreatorIds.join(" · ")}</small></article>
      <article><span>硬闸</span><strong>{passed}/{run.gates.length} 通过</strong><small>{failed.length ? `${failed.length} 项仍未通过` : "当前记录无失败项"}</small></article>
      <article><span>真实用户测试</span><strong>{summary.blindTestLabel}</strong><small>{run.blindTraces.length ? `${run.blindTraces.length} 条独立操作路径` : "尚未执行独立操作路径"}</small></article>
      <article><span>研究认知</span><strong>{summary.researchPromotionLabel}</strong><small>{isProductBlind ? "本轮只诊断产品，不证明内容规律" : "需回归、保留集与独立裁决"}</small></article>
    </section>

    {isProductBlind && <aside className="loop-boundary"><ShieldCheck size={20}/><div><strong>这是一轮 product_blind 用户测试</strong><p>它能证明工作台哪里不好用，但不能证明某种选题、爆火机制或博主规律成立。因此不会写入研究概念，也不会伪造“晋升”。</p></div></aside>}

    <div className="loop-columns">
      <section className="loop-panel">
        <header><span>QUALITY GATES</span><h2>哪些判断已经站得住</h2></header>
        <div className="loop-gates">{run.gates.map((gate) => <article key={gate.id} className={gate.pass ? "is-pass" : "is-fail"}>
          {gate.pass ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
          <div><strong>{gateCopy[gate.kind] ?? gate.kind}</strong><small>{gate.passedChecks}/{gate.requiredChecks} 项 · {gate.evaluatorId}</small>
          {gate.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div>
        </article>)}</div>
      </section>
      <section className="loop-panel">
        <header><span>FAILURE CLOSURE</span><h2>失败被归因到哪里</h2></header>
        {run.diagnoses.length === 0 ? <div className="loop-empty">尚未形成诊断。</div> : run.diagnoses.map((diagnosis) => <div className="loop-diagnosis" key={diagnosis.id}>
          <h3>问题不是一句“体验不好”</h3>
          {diagnosis.failureClosures.map((closure) => <p key={closure}><CircleAlert size={15}/><span><b>{closureCopy[closure] ?? closure}</b></span></p>)}
          <h3>下一轮必须验证</h3>
          <ol>{diagnosis.proposedRepairs.map((repair) => <li key={repair}>{repair}</li>)}</ol>
          <small>修复完成 ≠ 通过。仍需第二轮盲测与回归。</small>
        </div>)}
      </section>
    </div>

    <section className="loop-panel loop-samples">
      <header><span>SAMPLE ROLES</span><h2>拿什么调，拿什么防止自我欺骗</h2></header>
      <div><article><strong>开发样本</strong><b>{development.length}</b><p>允许用于定位问题和调整。</p></article>
        <article><strong>保留样本</strong><b>{holdout.length}</b><p>{holdout.length ? "不参与调整，只在回归时揭晓。" : "本轮是导入的产品盲测，尚未进入带保留集的回归阶段。"}</p></article></div>
    </section>

    <section className="loop-panel loop-lineage">
      <header><span>EVIDENCE LINEAGE</span><h2>结论从哪里来</h2><p>每一步只沿父证据向后生长；修复不会覆盖旧失败。</p></header>
      {!lineage ? <LoaderCircle className="spin"/> : <div className="lineage-flow">{lineage.nodes.map((node, index) => <article key={node.id}>
        <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{node.kind}</strong><p>{node.uri}</p><small>{node.sha256.slice(0, 12)} · 上游 {lineage.edges.filter((edge) => edge.to === node.id).length}</small></div>{index < lineage.nodes.length - 1 && <ArrowRight size={15}/>}</article>)}</div>}
    </section>

    <details className="loop-events"><summary><GitBranch size={15}/> 查看不可变更的运行记录（{events.length}）</summary>
      {events.map((event) => <p key={event.sequence}><b>#{event.sequence}</b><span>{event.fromStatus ?? "创建"} → {event.toStatus}</span><small>{new Date(event.createdAt).toLocaleString("zh-CN")}</small></p>)}</details>
  </div>;
}

export default function LearningLoopsPage() {
  const { runId } = useParams();
  const [runs, setRuns] = useState<LearningLoopRun[]>([]);
  const [selected, setSelected] = useState<LearningLoopRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void listLearningLoops().then(setRuns).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "无法读取学习循环")); }, []);
  useEffect(() => {
    if (runId) void getLearningLoop(runId).then(setSelected).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "无法读取学习循环"));
    else if (runs[0]) setSelected(runs[0]);
  }, [runId, runs]);
  const current = useMemo(() => selected ?? runs[0] ?? null, [selected, runs]);
  return <main className="learning-loop-page">
    <aside className="loop-run-list"><header><span>ITERATION LOOPS</span><strong>{runs.length}</strong></header>
      {runs.map((run) => <Link to={`/learning-loop/${encodeURIComponent(run.id)}`} className={current?.id === run.id ? "active" : ""} key={run.id}>
        <small>{run.policyVersion}</small><strong>{statusCopy[run.status].label}</strong><span>{run.targetCreatorIds.join(" · ")}</span>
      </Link>)}
    </aside>
    {error ? <div className="page-error"><CircleAlert/><h1>学习记录读取失败</h1><p>{error}</p></div>
      : !current ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取真实用户试用记录</p></div>
        : <RunDetail run={current}/>}
  </main>;
}
