import { useMemo } from "react";
import type { VideoResearch } from "../../shared/contracts/core";
import { PostSourceFactsCard } from "../../entities/source-facts/PostSourceFactsCard";
import { friendlyArticleHeading, withoutEmbeddedTranscript } from "./model/video-evidence-copy";
import { timestamp } from "./video-reader-utils";

function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => withoutEmbeddedTranscript(markdown).split(/\n{2,}/).map((block) => block.trim()).filter(Boolean), [markdown]);
  return <div className="audit-markdown">{blocks.map((block, index) => {
    const heading = block.match(/^(#{1,4})\s+(.+)$/s);
    if (heading) return <h4 key={index}>{friendlyArticleHeading(heading[2]?.replace(/\n+/g, " ") ?? "")}</h4>;
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*]\s+/.test(line))) return <ul key={index}>{lines.map((line) => <li key={line}>{line.replace(/^[-*]\s+/, "")}</li>)}</ul>;
    return <p key={index}>{block.replace(/^>\s?/, "").replace(/\*\*/g, "")}</p>;
  })}</div>;
}

function AuditState({ data }: { data: VideoResearch }) {
  return <div className="audit-state">
    <article><span>流程</span><b>{data.quality.buildState === "built" ? "Builder 完成" : data.quality.buildState}</b></article>
    <article><span>独立评估</span><b>{data.quality.evaluationState === "verified" ? "Evaluator 通过" : data.quality.evaluationState}</b></article>
    <article><span>来源资料</span><b>{data.sourceFacts.availability.overall === "available" ? "完整" : "部分取得"}</b></article>
    <article><span>读者版本</span><b>{data.readerSummary.statusLabel}</b></article>
  </div>;
}

export function ResearchAuditAppendix({ data }: { data: VideoResearch }) {
  const lenses = [["内容还原", data.lensCoverage.contentRestoration], ["编导逻辑", data.lensCoverage.directingLogic], ["画面与剪辑", data.lensCoverage.visualEditingLogic]] as const;
  return <section className="research-audit" id="audit" aria-labelledby="audit-title">
    <header><span>附录</span><div><p>研究审计</p><h2 id="audit-title">需要追溯时，再进入系统内部</h2></div></header>
    <details className="audit-disclosure"><summary><span>展开完整研究审计</span><small>来源、门禁、知识单元、逐字稿与原始报告</small></summary>
      <div className="audit-body">
        <AuditState data={data}/>
        <details><summary>原帖来源记录</summary><PostSourceFactsCard facts={data.sourceFacts}/></details>
        <details><summary>三镜头评估与门禁</summary><div className="audit-lenses">{lenses.map(([label, lens]) => <article key={label}><header><h3>{label}</h3><b>{lens.covered}/{lens.total}</b></header><p>{lens.note}</p>{lens.rules.map((rule) => <p key={rule.id} className={rule.pass ? "is-pass" : "is-fail"}><span>{rule.id}</span>{rule.pass ? "通过" : "未通过"}：{rule.note}</p>)}</article>)}</div></details>
        <details><summary>知识单元与关系</summary><div className="audit-knowledge">{data.knowledgeUnits.map((unit) => <article key={unit.id}><header><b>{unit.id}</b><time>{timestamp(unit.start)}–{timestamp(unit.end)}</time></header><h3>{unit.title}</h3><p>{unit.statement}</p><small>{unit.evidenceClass} · 置信度 {unit.confidence}</small></article>)}</div></details>
        <details><summary>完整逐句文字稿 · {data.transcript.length} 句</summary><div className="audit-transcript">{data.transcript.map((cue, index) => <article key={cue.id}><time>{timestamp(cue.start)}–{timestamp(cue.end)}</time>{cue.representativeFrame && <img src={cue.representativeFrame} loading="lazy" alt={`第 ${index + 1} 句对应画面`}/>}<p>{cue.text}</p></article>)}</div></details>
        <details><summary>完整证据帧 · {data.frames.dense.length} 张</summary><div className="audit-frames">{data.frames.dense.map((frame) => <figure key={frame.id}><img src={frame.src} loading="lazy" alt={frame.reason ?? frame.id}/><figcaption><time>{timestamp(frame.time)}</time>{frame.id}</figcaption></figure>)}</div></details>
        {(data.reports.builder || data.reports.evaluator) && <details><summary>Builder / Evaluator 原始报告</summary><div className="audit-reports">{data.reports.builder && <details><summary>Builder 原始报告</summary><ArticleBody markdown={data.reports.builder}/></details>}{data.reports.evaluator && <details><summary>Evaluator 独立评估</summary><ArticleBody markdown={data.reports.evaluator}/></details>}</div></details>}
      </div>
    </details>
  </section>;
}
