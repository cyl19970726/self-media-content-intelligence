import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ExternalLink, Grid2X2, LoaderCircle, Network, ScrollText } from "lucide-react";
import { getVideoResearch } from "./api";
import type { VideoResearch } from "../shared/video-research";

const evidenceLabels = {
  raw_fact: "原始事实", visual_observation: "画面观察", author_claim: "作者主张", system_inference: "系统推断", unknown: "未知"
} as const;

function metric(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function timestamp(value: number | null) {
  if (value === null) return "—";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

function EvidenceRefs({ refs }: { refs: string[] }) {
  if (!refs.length) return <small className="evidence-refs evidence-refs--empty">没有可解析引用</small>;
  return <details className="evidence-refs"><summary>{refs.length} 条证据</summary><div>{refs.map((ref) => {
    const linkable = /^(CUE|TARGET|FRAME|SAMPLE)-/.test(ref);
    return linkable ? <a key={ref} href={`#evidence-${ref}`}>{ref}</a> : <span key={ref}>{ref}</span>;
  })}</div></details>;
}

const failedGateCopy: Record<string, string> = {
  independent_semantic_review_missing: "内容还原尚缺独立复核",
  "DL-GATE-INDEPENDENT-EVALUATION-MISSING": "编导逻辑尚缺独立复核",
  "VE-GATE-INDEPENDENT-EVALUATION-MISSING": "画面与剪辑尚缺独立复核",
  "VE-GATE-NONSPEECH-AUDIO-NOT-SOURCE-SEPARATED": "非旁白音频仅完成混合轨检查，结论需保持边界",
  "VE-NON_SPEECH_AUDIO_UNRESOLVED": "非旁白音频作用尚未确认",
  "VE-BOARD_TEXT_PARTIAL": "白板小字未完整恢复",
  "VE-EDIT_BOUNDARY_UNVERIFIED": "技术切分与真实剪辑边界尚未完全核实"
};

function gateLabel(value: string) { return failedGateCopy[value] ?? value; }

function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean), [markdown]);
  return <div className="reconstruction-article">{blocks.map((block, index) => {
    const heading = block.match(/^(#{1,4})\s+(.+)$/s);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const title = heading[2]?.replace(/\n+/g, " ") ?? "";
      return level <= 2 ? <h3 key={index}>{title}</h3> : <h4 key={index}>{title}</h4>;
    }
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*]\s+/.test(line))) return <ul key={index}>{lines.map((line) => <li key={line}>{line.replace(/^[-*]\s+/, "")}</li>)}</ul>;
    return <p key={index}>{block.replace(/\*\*/g, "")}</p>;
  })}</div>;
}

export default function VideoEvidencePage() {
  const { id = "", videoId = "" } = useParams();
  const [search, setSearch] = useSearchParams();
  const [data, setData] = useState<VideoResearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frameMode = search.get("frames") === "dense" ? "dense" : "sparse";
  const runId = search.get("run") ?? undefined;
  useEffect(() => {
    getVideoResearch(id, videoId, runId).then(setData).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取视频证据");
    });
  }, [id, videoId, runId]);
  const setFrameMode = (value: "sparse" | "dense") => {
    const next = new URLSearchParams(search); next.set("frames", value); setSearch(next, { replace: true });
  };

  return <main className="console console--solo">
    {error ? <div className="page-error"><AlertTriangle/><h1>证据读取失败</h1><p>{error}</p></div>
      : !data ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在生成统一视频研究投影</p></div>
        : <article className="evidence-page evidence-page--v1">
          <nav className="breadcrumb"><Link to="/creators">博主研究</Link><span>/</span><Link to={`/creators/${data.creatorId}`}>{data.creatorName}</Link><span>/</span><b>{data.title.slice(0, 24)}</b></nav>
          <header className="evidence-head">
            <div><p className="eyebrow"><span>VIDEO RESEARCH</span><span>{data.sourceLabel}</span></p><h1>{data.title}</h1><p className="evidence-head__lead">{data.thesis}</p><a className="evidence-source" href={data.sourceHref} target="_blank" rel="noreferrer">查看原始内容<ExternalLink size={13}/></a></div>
            <div className="evidence-health-card"><span className={data.gate.ready ? "is-ready" : "is-partial"}>{data.gate.ready ? "三镜头硬闸通过" : "三镜头未闭环"}</span><b>{data.coverage.coreCovered}/{data.coverage.coreTotal}</b><small>核心知识覆盖</small><p>{data.evidenceHealth.note}</p></div>
          </header>

          <section className="video-metric-band">
            <div><b>{metric(data.engagement.likes)}</b><span>公开点赞</span></div><div><b>{data.performanceContext.tier.toUpperCase()}</b><span>账号内部层级</span></div><div><b>{data.performanceContext.medianMultiple === null ? "—" : `${data.performanceContext.medianMultiple.toFixed(1)}×`}</b><span>相对账号中位</span></div><div><b>{data.transcript.length}</b><span>完整文字稿 CUES</span></div><div><b>{data.frames.dense.length}</b><span>密集 / 定向证据帧</span></div>
          </section>
          <section className="lens-gate-band" aria-label="三镜头研究状态">
            {([
              ["内容还原", data.lensCoverage.contentRestoration],
              ["编导逻辑", data.lensCoverage.directingLogic],
              ["画面与剪辑", data.lensCoverage.visualEditingLogic]
            ] as const).map(([label, lens]) => <article key={label} className={`lens-gate lens-gate--${lens.state}`}>
              <header><span>{label}</span><b>{lens.state === "ready" ? "通过" : lens.state === "partial" ? "部分" : "缺失"}</b></header>
              <strong>{lens.covered}/{lens.total}</strong><small>{lens.rules.length ? "独立评测规则" : "核心证据覆盖"}</small><p>{lens.note}</p>
              {lens.evaluator && <small>评审：{lens.evaluator.id} · {lens.evaluator.version}</small>}
              {lens.rules.length > 0 && <details className="gate-rule-ledger"><summary>查看 {lens.rules.length} 条评测规则</summary>{lens.rules.map((rule) => <article key={rule.id} className={rule.pass ? "is-pass" : "is-fail"}><header><b>{rule.id}</b><span>{rule.pass ? "通过" : "未通过"}</span></header><p>{rule.note}</p>{rule.failedReason && <em>{rule.failedReason}</em>}<EvidenceRefs refs={rule.evidenceRefs}/></article>)}</details>}
              {lens.failedGateIds.length > 0 && <em>{lens.failedGateIds.map(gateLabel).join(" · ")}</em>}
            </article>)}
          </section>

          <div className="video-research-layout">
            <div className="video-research-main">
              <section className="video-evidence-section" id="article"><header><span>01</span><div><h2>视频内容还原</h2><p>把视频转换为可独立阅读的文章；主张、观察与未知仍在证据层分开。</p></div></header><ArticleBody markdown={data.article}/></section>
              <section className="video-evidence-section" id="directing"><header><span>02</span><div><h2>编导逻辑</h2><p>沿观众认知变化恢复每一阶段的任务、观众问题和证明动作；意义段落不冒充技术切镜。</p></div></header>
                <div className="viewer-change"><article><span>观看前</span><p>{data.directingLogic.viewerBefore ?? "现有证据未登记"}</p></article><article><span>观看后</span><p>{data.directingLogic.viewerAfter ?? "现有证据未登记"}</p></article></div>
                <div className="directing-ledger"><article><span>激活的问题</span><p>{data.directingLogic.activatedQuestion ?? "尚未独立恢复"}</p></article><article><span>内容承诺</span><p>{data.directingLogic.promise ?? "尚未独立恢复"}</p></article><article><span>回报</span><p>{data.directingLogic.payoff ?? "尚未独立恢复"}</p></article><article><span>结尾闭合</span><p>{data.directingLogic.endingResolution ?? "尚未独立恢复"}</p></article></div>
                <div className="directing-stages">{data.directingLogic.stages.length ? data.directingLogic.stages.map((stage, index) => <article key={`${stage.label}-${index}`}><time>{timestamp(stage.start)}–{timestamp(stage.end)}</time><div><span>STAGE {String(index + 1).padStart(2, "0")}</span><h3>{stage.label}</h3>{stage.viewerQuestion && <b>观众问题：{stage.viewerQuestion}</b>}<p>{stage.function}</p>{stage.cognitiveChange && <p><strong>认知变化：</strong>{stage.cognitiveChange}</p>}{stage.comprehensionLoad && <small>理解负荷：{stage.comprehensionLoad}</small>}{stage.payoff && <small>本段回报：{stage.payoff}</small>}{stage.proof && <small>证明 / 触发：{stage.proof}</small>}<EvidenceRefs refs={stage.evidenceRefs}/></div></article>) : <p className="evidence-empty">尚未形成有证据的编导阶段。</p>}</div>
                {data.directingLogic.informationDesign.length > 0 && <div className="information-design">{data.directingLogic.informationDesign.map((item, index) => <article key={`${item.kind}-${index}`}><span>{item.kind}</span><time>{timestamp(item.start)}–{timestamp(item.end)}</time><p>{item.statement}</p><EvidenceRefs refs={item.evidenceRefs}/></article>)}</div>}
                {data.directingLogic.proofDesign.length > 0 && <div className="visual-claims">{data.directingLogic.proofDesign.map((item, index) => <article key={`${item.proofType}-${index}`}><time>{timestamp(item.start)}–{timestamp(item.end)}</time><h3>{item.proofType === "visible_proof" ? "画面证明" : item.proofType === "creator_claim" ? "作者主张" : "系统推断"}</h3><p>{item.statement}</p><small>边界：{item.boundary}</small><EvidenceRefs refs={item.evidenceRefs}/></article>)}</div>}
                <div className="directing-ledger"><article><span>信息压缩</span><p>{data.directingLogic.loadAndPayoff.compression}</p></article><article><span>重复方式</span><p>{data.directingLogic.loadAndPayoff.repetition}</p></article><article><span>回报距离</span><p>{data.directingLogic.loadAndPayoff.payoffDistance}</p></article><article><span>理解与复现成本</span>{data.directingLogic.loadAndPayoff.comprehensionCosts.length ? data.directingLogic.loadAndPayoff.comprehensionCosts.map((cost) => <p key={cost}>{cost}</p>) : <p>未观察到明确成本。</p>}</article></div>
                {data.directingLogic.notes.length > 0 && <div className="lens-notes">{data.directingLogic.notes.map((note) => <p key={note}>{note}</p>)}</div>}
              </section>
              <section className="video-evidence-section" id="visual-editing"><header><span>03</span><div><h2>画面与剪辑</h2><p>画面载体承担什么信息、何时变化、技术镜头密度和哪些桥接被剪掉，分别呈现。</p></div><div className="view-switch"><button className={frameMode === "sparse" ? "active" : ""} onClick={() => setFrameMode("sparse")}><ScrollText size={13}/>稀疏</button><button className={frameMode === "dense" ? "active" : ""} onClick={() => setFrameMode("dense")}><Grid2X2 size={13}/>密集</button></div></header>
                <div className="visual-stat-strip"><article><span>画幅</span><b>{data.visualEditing.orientation ?? "未知"}</b></article><article><span>技术镜头</span><b>{data.visualEditing.shotCount ?? "—"}</b></article><article><span>每分钟切换</span><b>{data.visualEditing.cutsPerMinute ?? "—"}</b></article><article><span>结果首次出现</span><b>{timestamp(data.visualEditing.resultFirstAt)}</b></article></div>
                {data.visualEditing.composition && <p className="composition-line">画面语法：{data.visualEditing.composition}</p>}
                <div className="carrier-grid">{data.visualEditing.carriers.map((carrier) => <article key={`${carrier.name}-${carrier.start}`}><header><b>{carrier.name}</b><time>{timestamp(carrier.start)}–{timestamp(carrier.end)}</time></header>{carrier.roles.map((role) => <p key={role}>{role}</p>)}</article>)}</div>
                {data.visualEditing.claims.length > 0 && <div className="visual-claims">{data.visualEditing.claims.map((claim, index) => <article key={`${claim.statement}-${index}`}><time>{timestamp(claim.start)}–{timestamp(claim.end)}</time><h3>{claim.statement}</h3><p>{claim.function}</p><EvidenceRefs refs={claim.evidenceRefs}/></article>)}</div>}
                {data.visualEditing.shotSemantics.length > 0 && <div className="shot-semantics">{data.visualEditing.shotSemantics.map((shot, index) => <article key={`${shot.start}-${index}`}><time>{timestamp(shot.start)}–{timestamp(shot.end)}</time><div><b>{shot.role}</b><span>{shot.carrier}</span><p>{shot.meaningChange}</p><EvidenceRefs refs={shot.evidenceRefs}/></div></article>)}</div>}
                {data.visualEditing.uiProcedureStates.length > 0 && <div className="visual-claims">{data.visualEditing.uiProcedureStates.map((state, index) => <article key={`${state.label}-${index}`}><time>{timestamp(state.start)}–{timestamp(state.end)}</time><h3>{state.label}</h3><p><strong>操作前：</strong>{state.before}</p><p><strong>操作中：</strong>{state.during}</p><p><strong>操作后：</strong>{state.after}</p>{state.input && <small>输入：{state.input}</small>}{state.output && <small>输出：{state.output}</small>}<small>连续性边界：{state.continuity}</small><EvidenceRefs refs={state.evidenceRefs}/></article>)}</div>}
                {data.visualEditing.audioRole && <p className="composition-line">非旁白音频：{data.visualEditing.audioRole}</p>}
                <div className={`frame-list frame-list--${frameMode}`}>{data.frames[frameMode].map((frame) => <figure id={`evidence-${frame.id}`} key={frame.id} className="frame-card"><img src={frame.src} loading="lazy" alt={frame.reason ?? frame.id}/><figcaption><b>{frame.id}</b><time>{timestamp(frame.time)}</time></figcaption>{frame.reason && <p>{frame.reason}</p>}</figure>)}</div>
                {data.visualEditing.notes.length > 0 && <div className="lens-notes lens-notes--warning">{data.visualEditing.notes.map((note) => <p key={note}>{note}</p>)}</div>}
              </section>
              <section className="video-evidence-section" id="architecture"><header><span>04</span><div><h2>知识单元与关系</h2><p>恢复内容中的因果、条件、步骤与反例，并把作者主张、画面观察、推断和未知分开。</p></div></header>
                <div className="relation-map">{data.relations.length ? data.relations.map((relation, index) => <article key={`${relation.from}-${relation.to}-${index}`}><Network size={14}/><b>{relation.from}</b><span>{relation.relation}</span><b>{relation.to}</b><small>{relation.evidenceRefs.length} 条证据</small></article>) : <p>当前证据未形成结构化关系。</p>}</div>
                <div className="knowledge-grid">{data.knowledgeUnits.map((unit) => <article key={unit.id} className={`knowledge-unit knowledge-unit--${unit.evidenceClass}`}><header><span>{unit.id} · {evidenceLabels[unit.evidenceClass]}</span><time>{timestamp(unit.start)}–{timestamp(unit.end)}</time></header><h3>{unit.title}</h3><p>{unit.statement}</p><footer><span>置信度 {unit.confidence}</span><EvidenceRefs refs={unit.evidenceRefs}/></footer>{unit.unknowns.map((unknown) => <small key={unknown}>{unknown}</small>)}</article>)}</div>
              </section>
              <section className="video-evidence-section" id="transcript"><header><span>05</span><div><h2>完整文字稿与镜头对应</h2><p>每条 cue 保留时间码、代表帧与全部重叠镜头，方便从文字回到原证据。</p></div></header>
                <div className="transcript-table">{data.transcript.map((cue) => <article id={`evidence-${cue.id}`} key={cue.id}><time>{timestamp(cue.start)}–{timestamp(cue.end)}</time>{cue.representativeFrame ? <img src={cue.representativeFrame} loading="lazy" alt={cue.id}/> : <span className="transcript-no-frame">无帧</span>}<div><b>{cue.id}</b><p>{cue.text}</p><small>{cue.overlappingShots.length ? `重叠镜头：${cue.overlappingShots.join("、")}` : "重叠镜头未取得"}</small></div></article>)}</div>
              </section>
            </div>
            <aside className="video-research-aside">
              <div><span>EVIDENCE HEALTH</span><p>{data.evidenceHealth.transcript ? "✓" : "—"} 文字稿</p><p>{data.evidenceHealth.frames ? "✓" : "—"} 视频帧</p><p>{data.evidenceHealth.ocr ? "✓" : "—"} OCR / UI</p><p>{data.evidenceHealth.audio ? "✓" : "—"} 非旁白音频</p><p>{data.evidenceHealth.baseline ? "✓" : "—"} 表现基线</p></div>
              <div><span>PERFORMANCE CONTEXT</span><p>{data.performanceContext.interpretation}</p><p>账号中位：{metric(data.performanceContext.creatorMedianLikes)}</p><p>百分位：{data.performanceContext.percentileRank === null ? "—" : `P${data.performanceContext.percentileRank}`}</p>{data.performanceContext.confounds.map((value) => <p key={value}>边界：{value}</p>)}</div>
              <div><span>CONFLICTS</span>{data.conflicts.length ? data.conflicts.map((value) => <p key={value}>{value}</p>) : <p>未登记载体冲突。</p>}</div>
              <div><span>UNKNOWNS</span>{data.unknowns.length ? data.unknowns.map((value) => <p key={value}>{value}</p>) : <p>未登记未知项。</p>}</div>
              {data.gate.failedGateIds.length > 0 && <div><span>尚未闭环</span>{data.gate.failedGateIds.map((value) => <p key={value}>{gateLabel(value)}</p>)}</div>}
            </aside>
          </div>
          <footer className="evidence-foot"><Link className="evidence-back" to={`/creators/${data.creatorId}`}><ArrowLeft size={16}/>回到 {data.creatorName} 研究页</Link></footer>
        </article>}
  </main>;
}
