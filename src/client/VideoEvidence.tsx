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
            <div className="evidence-health-card"><span className={data.gate.ready ? "is-ready" : "is-partial"}>{data.gate.ready ? "硬闸通过" : "证据未闭环"}</span><b>{data.coverage.coreCovered}/{data.coverage.coreTotal}</b><small>核心知识覆盖</small><p>{data.evidenceHealth.note}</p></div>
          </header>

          <section className="video-metric-band">
            <div><b>{metric(data.engagement.likes)}</b><span>公开点赞</span></div><div><b>{data.evidenceHealth.transcript ? "有" : "无"}</b><span>完整文字稿</span></div><div><b>{data.evidenceHealth.ocr ? "有" : "无"}</b><span>OCR / 界面</span></div><div><b>{data.evidenceHealth.audio ? "已检" : "未闭"}</b><span>非旁白音频</span></div><div><b>{data.frames.dense.length}</b><span>证据帧</span></div>
          </section>

          <div className="video-research-layout">
            <div className="video-research-main">
              <section className="video-evidence-section" id="article"><header><span>01</span><div><h2>视频内容还原</h2><p>把视频转换为可独立阅读的文章；主张、观察与未知仍在证据层分开。</p></div></header><ArticleBody markdown={data.article}/></section>
              <section className="video-evidence-section" id="architecture"><header><span>02</span><div><h2>内容架构与知识关系</h2><p>不是按镜头罗列，而是恢复知识单元之间的因果、条件、步骤与反例。</p></div></header>
                <div className="relation-map">{data.relations.length ? data.relations.map((relation, index) => <article key={`${relation.from}-${relation.to}-${index}`}><Network size={14}/><b>{relation.from}</b><span>{relation.relation}</span><b>{relation.to}</b><small>{relation.evidenceRefs.length} 条证据</small></article>) : <p>当前证据未形成结构化关系。</p>}</div>
                <div className="knowledge-grid">{data.knowledgeUnits.map((unit) => <article key={unit.id} className={`knowledge-unit knowledge-unit--${unit.evidenceClass}`}><header><span>{unit.id} · {evidenceLabels[unit.evidenceClass]}</span><time>{timestamp(unit.start)}–{timestamp(unit.end)}</time></header><h3>{unit.title}</h3><p>{unit.statement}</p><footer><span>置信度 {unit.confidence}</span><span>{unit.evidenceRefs.length} refs</span></footer>{unit.unknowns.map((unknown) => <small key={unknown}>{unknown}</small>)}</article>)}</div>
              </section>
              <section className="video-evidence-section" id="frames"><header><span>03</span><div><h2>关键画面与密集帧</h2><p>稀疏帧用于快速阅读，密集帧用于检查状态变化和被跳过的操作。</p></div><div className="view-switch"><button className={frameMode === "sparse" ? "active" : ""} onClick={() => setFrameMode("sparse")}><ScrollText size={13}/>稀疏</button><button className={frameMode === "dense" ? "active" : ""} onClick={() => setFrameMode("dense")}><Grid2X2 size={13}/>密集</button></div></header>
                <div className={`frame-list frame-list--${frameMode}`}>{data.frames[frameMode].map((frame) => <figure key={frame.id} className="frame-card"><img src={frame.src} loading="lazy" alt={frame.reason ?? frame.id}/><figcaption><b>{frame.id}</b><time>{timestamp(frame.time)}</time></figcaption>{frame.reason && <p>{frame.reason}</p>}</figure>)}</div>
              </section>
              <section className="video-evidence-section" id="transcript"><header><span>04</span><div><h2>完整文字稿与镜头对应</h2><p>每条 cue 保留时间码、代表帧与全部重叠镜头，方便从文字回到原证据。</p></div></header>
                <div className="transcript-table">{data.transcript.map((cue) => <article key={cue.id}><time>{timestamp(cue.start)}–{timestamp(cue.end)}</time>{cue.representativeFrame ? <img src={cue.representativeFrame} loading="lazy" alt={cue.id}/> : <span className="transcript-no-frame">无帧</span>}<div><b>{cue.id}</b><p>{cue.text}</p><small>{cue.overlappingShots.length ? `重叠镜头：${cue.overlappingShots.join("、")}` : "重叠镜头未取得"}</small></div></article>)}</div>
              </section>
            </div>
            <aside className="video-research-aside">
              <div><span>EVIDENCE HEALTH</span><p>{data.evidenceHealth.transcript ? "✓" : "—"} 文字稿</p><p>{data.evidenceHealth.frames ? "✓" : "—"} 视频帧</p><p>{data.evidenceHealth.ocr ? "✓" : "—"} OCR / UI</p><p>{data.evidenceHealth.audio ? "✓" : "—"} 非旁白音频</p><p>{data.evidenceHealth.baseline ? "✓" : "—"} 表现基线</p></div>
              <div><span>CONFLICTS</span>{data.conflicts.length ? data.conflicts.map((value) => <p key={value}>{value}</p>) : <p>未登记载体冲突。</p>}</div>
              <div><span>UNKNOWNS</span>{data.unknowns.length ? data.unknowns.map((value) => <p key={value}>{value}</p>) : <p>未登记未知项。</p>}</div>
              {data.gate.failedGateIds.length > 0 && <div><span>FAILED GATES</span>{data.gate.failedGateIds.map((value) => <p key={value}>{value}</p>)}</div>}
            </aside>
          </div>
          <footer className="evidence-foot"><Link className="evidence-back" to={`/creators/${data.creatorId}`}><ArrowLeft size={16}/>回到 {data.creatorName} 研究页</Link></footer>
        </article>}
  </main>;
}
