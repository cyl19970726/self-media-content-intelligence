import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink, Grid2X2, List, LoaderCircle, RefreshCw } from "lucide-react";
import { getCreatorDossier, resumeCreatorResearchRun } from "./api";
import type { CreatorDossier, ResearchStatement } from "../shared/creator-dossier";
import { comparisonSetLabel, comparisonSetNote, deepSetNote } from "./creator-sample-copy";

const sections = [
  ["identity", "01", "定位与价值"], ["corpus", "02", "全量基本盘"], ["system", "03", "主题与形式"],
  ["tiers", "04", "高中低表现"], ["portfolio", "05", "内容库"], ["deep", "06", "深度证据"],
  ["rhythm", "07", "节奏与演化"], ["audience", "08", "用户需求"], ["engines", "09", "内容系统"],
  ["business", "10", "商业与边界"]
] as const;

const tierLabels = { high: "高表现", base: "基本盘", low: "低表现" } as const;
const factLabels = { observed: "观察", author_claim: "作者主张", inference: "推断", unknown: "未知" } as const;
const evidenceStatusLabels = { deep_validated: "三镜头通过", deep_pending: "深度待审", surface_only: "作品级", missing: "证据缺失" } as const;
const pipelineStateLabels = { pending: "未开始", running: "执行中", partial: "部分完成", complete: "已通过", blocked: "待接管", failed: "失败", stale: "需重跑" } as const;
const pipelineGateLabels = { not_checked: "未评测", running: "评测中", passed: "硬闸通过", partial: "部分通过", failed: "硬闸失败", blocked: "评测阻塞" } as const;
const workerLabels: Record<string, string> = {
  orchestrator: "任务编排器", "ego-browser-worker": "浏览器采集 Worker", "detail-comment-worker": "详情与评论 Worker",
  "annotation-worker": "内容标注 Worker", "statistics-worker": "确定性统计 Worker", "selection-worker": "分层选样 Worker",
  "media-worker": "媒体核验 Worker", "video-reconstruction-worker": "视频重建 Worker", "independent-video-evaluator": "独立视频评审",
  "creator-synthesis-worker": "博主综合 Worker", "independent-creator-evaluator": "独立博主评审", "projection-worker": "Dashboard 投影器"
};

function metric(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function duration(value: number | null) {
  if (value === null) return "—";
  return value >= 60 ? `${Math.floor(value / 60)}m${Math.round(value % 60)}s` : `${Math.round(value)}s`;
}

function Health({ value }: { value: CreatorDossier["corpus"]["health"] }) {
  return <span className={`dossier-health dossier-health--${value.status}`} title={value.reason}>{value.status === "full" ? "已覆盖" : value.status === "partial" ? "部分覆盖" : "未覆盖"}</span>;
}

function StatementList({ values, empty }: { values: ResearchStatement[]; empty: string }) {
  if (values.length === 0) return <p className="dossier-empty">{empty}</p>;
  return <div className="statement-list">{values.map((value, index) => <article key={`${value.statement}-${index}`} className={`statement statement--${value.factClass}`}>
    <span>{factLabels[value.factClass]} · {value.confidence}</span><p>{value.statement}</p>{value.caveat && <small>{value.caveat}</small>}
  </article>)}</div>;
}

function ClusterTable({ title, values }: { title: string; values: CreatorDossier["contentSystem"]["topicClusters"] }) {
  return <article className="cluster-panel"><header><h3>{title}</h3><span>{values.length} 个开放标签 · 可重叠</span></header>
    {values.length === 0 ? <p className="dossier-empty">当前没有可复算的聚类统计。</p> : <div className="cluster-table">
      <div className="cluster-table__head"><span>方向</span><span>数量 / 占比</span><span>中位</span><span>平均</span><span>最高</span><span>≥1万</span></div>
      {values.map((value) => <div className="cluster-table__row" key={value.name}>
        <strong>{value.name}</strong><span>{value.count} · {value.share === null ? "—" : `${Math.round(value.share * 100)}%`}</span><b>{metric(value.medianLikes)}</b><b>{metric(value.meanLikes)}</b><b>{metric(value.maxLikes)}</b><span>{value.highCount ?? "—"}</span>
        {value.interpretation && <small>{value.interpretation}</small>}
      </div>)}
    </div>}
  </article>;
}

function DossierSection({ id, index, title, note, health, children }: {
  id: string; index: string; title: string; note: string; health?: CreatorDossier["corpus"]["health"]; children: React.ReactNode;
}) {
  return <section id={id} className="console-section dossier-section">
    <header className="console-section__head"><span className="console-section__index">{index}</span><div><h2>{title}</h2><p>{note}</p></div>{health && <Health value={health}/>}</header>
    <div className="dossier-section__body">{children}</div>
  </section>;
}

export default function CreatorDossierPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const [data, setData] = useState<CreatorDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setData(await getCreatorDossier(id)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取博主档案"); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data?.run || ["ready", "reviewable", "failed"].includes(data.run.status)) return undefined;
    const stream = new EventSource(`/api/creator-runs/${encodeURIComponent(data.run.id)}/events/stream`);
    stream.addEventListener("creator-research-event", () => { void load(); });
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [data?.run, load]);
  useEffect(() => {
    if (!data || data.canonicalId === id || data.run?.id !== id) return;
    navigate(`/creators/${encodeURIComponent(data.canonicalId)}${window.location.search}`, { replace: true });
  }, [data, id, navigate]);

  const view = search.get("view") === "gallery" ? "gallery" : "list";
  const tier = ["high", "base", "low"].includes(search.get("tier") ?? "") ? search.get("tier") : "all";
  const topic = search.get("topic") ?? "all";
  const format = search.get("format") ?? "all";
  const evidence = search.get("evidence") ?? "all";
  const topicOptions = useMemo(() => [...new Set(data?.portfolio.items.map((item) => item.topic).filter((value): value is string => Boolean(value)) ?? [])], [data]);
  const formatOptions = useMemo(() => [...new Set(data?.portfolio.items.map((item) => item.format).filter((value): value is string => Boolean(value)) ?? [])], [data]);
  const items = useMemo(() => data?.portfolio.items.filter((item) => (tier === "all" || item.tier === tier)
    && (topic === "all" || item.topic === topic) && (format === "all" || item.format === format)
    && (evidence === "all" || (evidence === "deep" ? item.deepSample : item.evidenceStatus === evidence))) ?? [], [data, tier, topic, format, evidence]);
  const setOption = (key: string, value: string) => {
    const next = new URLSearchParams(search);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearch(next, { replace: true });
  };
  const itemHref = (item: CreatorDossier["portfolio"]["items"][number]) => item.evidenceHref
    ? `${item.evidenceHref}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}#portfolio`)}`
    : item.sourceHref;
  const resume = async () => {
    if (!data?.run || resuming) return;
    setResuming(true);
    try { await resumeCreatorResearchRun(data.run.id); await load(); setResumeError(null); }
    catch (cause) { setResumeError(cause instanceof Error ? cause.message : "无法恢复博主研究"); }
    finally { setResuming(false); }
  };

  if (error) return <main className="console console--solo"><div className="page-error"><AlertTriangle/><h1>博主档案读取失败</h1><p>{error}</p></div></main>;
  if (!data) return <main className="console console--solo"><div className="page-loader"><LoaderCircle className="spin"/><p>正在生成统一研究投影</p></div></main>;
  const deepItems = data.portfolio.items.filter((item) => item.deepSample);

  return <main className="console creator-dossier">
    <aside className="console-rail">
      <div className="console-rail__head"><span>CREATOR DOSSIER</span><b>V1</b></div>
      <nav aria-label="博主研究目录">{sections.map(([sectionId, index, label]) => <a href={`#${sectionId}`} key={sectionId}><span>{index}</span>{sectionId === "portfolio" ? comparisonSetLabel(data.portfolio.items.length).replace("统一 ", "") : label}</a>)}</nav>
      <div className="console-rail__foot"><Link to="/creators"><ArrowLeft size={13}/>博主研究</Link><Link to="/comparisons">多博主比较<ArrowRight size={13}/></Link></div>
    </aside>
    <article className="console-main dossier-main">
      <nav className="breadcrumb"><Link to="/creators">博主研究</Link><span>/</span><b>{data.identity.name}</b></nav>
      {data.run && <section className={`creator-run-progress creator-run-progress--${data.run.status}`}>
        <div><span>PIPELINE · {data.run.id.slice(0, 8).toUpperCase()}</span><strong>{data.run.status === "ready" ? "研究闭环已通过" : data.run.nextAction}</strong></div>
        <div className="creator-run-progress__stages">{data.run.stages.map((stage) => <span key={stage.id} className={`is-${stage.status}`}>{stage.label}</span>)}</div>
        {data.run.blockers.map((blocker) => <small key={blocker.code}>{blocker.message}</small>)}
        {data.run.status === "needs_user" && <div className="creator-run-progress__actions">
          <span>在已交接的小红书页面完成提示动作后，再从这里恢复同一任务。</span>
          <button type="button" onClick={() => void resume()} disabled={resuming}>
            {resuming ? <LoaderCircle className="spin" size={13}/> : <RefreshCw size={13}/>}{resuming ? "正在恢复" : "我已完成，继续"}
          </button>
        </div>}
        {resumeError && <small role="alert">{resumeError}</small>}
      </section>}
      {data.pipeline && <details className={`research-pipeline research-pipeline--${data.pipeline.state}`} open={!data.pipeline.ready}>
        <summary>
          <div><span>RESEARCH PIPELINE · 13 STAGES</span><strong>{data.pipeline.ready ? "完整研究闭环已通过" : "当前是部分研究投影"}</strong></div>
          <div><b>{data.pipeline.completedStages}/{data.pipeline.totalStages}</b><small>阶段通过 · 点击{data.pipeline.ready ? "查看" : "检查缺口"}</small></div>
        </summary>
        <div className="research-pipeline__intro"><p>Skill 决定研究方法，Worker 生成证据，Evaluator 独立把关；Dashboard 只展示最后一版有效结果。</p><span>当前停在：{data.pipeline.stages.find((stage) => stage.id === data.pipeline?.currentStageId)?.label}</span></div>
        <div className="research-pipeline__stages">{data.pipeline.stages.map((stage, index) => <article key={stage.id} className={`pipeline-stage pipeline-stage--${stage.state}`}>
          <header><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage.label}</h3><small>{pipelineStateLabels[stage.state]} · {pipelineGateLabels[stage.gateState]}</small></div></header>
          <p>{stage.message}</p>
          <dl><div><dt>研究方法</dt><dd>{stage.skillId ?? "确定性基础设施"}</dd></div><div><dt>执行者</dt><dd>{workerLabels[stage.workerKind] ?? stage.workerKind}</dd></div></dl>
          {stage.missingInputs.length > 0 && <div className="pipeline-stage__missing"><b>还缺什么</b>{stage.missingInputs.map((item) => <span key={item}>{item}</span>)}</div>}
          {stage.nextAction && <p className="pipeline-stage__next"><b>下一步：</b>{stage.nextAction}</p>}
          <footer><span>影响页面：{stage.dashboardSections.join(" · ")}</span>{stage.artifactRefs.length > 0 && <details><summary>证据产物 {stage.artifactRefs.length}</summary>{stage.artifactRefs.map((ref) => <code key={ref}>{ref}</code>)}</details>}</footer>
        </article>)}</div>
      </details>}
      {data.lastGood.active && <div className="last-good-banner"><RefreshCw size={15}/><div><strong>保留上一版可读档案</strong><p>{data.lastGood.reason}{data.lastGood.revisionLabel ? ` · ${data.lastGood.revisionLabel}` : ""}</p></div></div>}

      <header id="identity" className="console-hero dossier-hero">
        <div><p className="eyebrow"><span>CREATOR RESEARCH</span><span>{data.source === "versioned_run" ? "VERSIONED PROJECTION" : data.source === "inventory_snapshot" ? "INVENTORY SNAPSHOT · 部分基本盘" : "LEGACY ADAPTER"}</span></p><h1>{data.identity.name}</h1><p className="console-hero__position">{data.identity.positioning.statement}</p></div>
        <a href={data.identity.profileHref} target="_blank" rel="noreferrer"><ExternalLink size={14}/>原始主页</a>
      </header>
      <div className="identity-grid">
        <article><span>服务人群</span><StatementList values={data.identity.audience} empty="尚未覆盖服务人群。"/></article>
        <article><span>提供的价值</span><StatementList values={data.identity.valuesProvided} empty="尚未覆盖用户价值。"/></article>
        <article><span>信任来源</span><StatementList values={data.identity.trustSources} empty="尚未覆盖信任来源。"/></article>
        <article><span>账号阶段</span><StatementList values={[data.identity.lifecycle]} empty="尚未覆盖账号阶段。"/></article>
      </div>

      <DossierSection id="corpus" index="02" title="数据健康与全量基本盘" note="中位代表常态，平均揭示头部拉动，最高值只表示公开上限。" health={data.corpus.health}>
        <div className="metric-band"><div><b>{data.corpus.postCount}</b><span>可见作品</span></div><div><b>{metric(data.corpus.medianLikes)}</b><span>点赞中位</span></div><div><b>{metric(data.corpus.meanLikes)}</b><span>平均点赞</span></div><div><b>{metric(data.corpus.maxLikes)}</b><span>最高点赞</span></div><div><b>{data.corpus.highCount ?? "—"}</b><span>≥1 万作品</span></div><div><b>{data.corpus.coverageRate === 1 ? "100" : (data.corpus.coverageRate * 100).toFixed(1)}%</b><span>指标覆盖</span></div></div>
        <div className="percentile-strip"><span>P10 <b>{metric(data.corpus.percentiles.p10)}</b></span><span>P25 <b>{metric(data.corpus.percentiles.p25)}</b></span><span>P75 <b>{metric(data.corpus.percentiles.p75)}</b></span><span>P90 <b>{metric(data.corpus.percentiles.p90)}</b></span><span>视频 <b>{data.corpus.videoCount ?? "—"}</b></span><span>已知点赞 <b>{data.corpus.likesKnown}</b></span></div>
        <p className="console-note"><AlertTriangle size={14}/>{data.corpus.health.reason}</p>
        <div className="corpus-notes">{data.corpus.notes.map((note) => <p key={note}>{note}</p>)}</div>
        <div className="distribution-view"><header><b>公开点赞分布</b><span>不同区间的作品数量与占比</span></header>{data.corpus.distribution.map((bucket) => { const share = bucket.share * 100; return <div key={bucket.label}><span>{bucket.label}</span><i><em style={{ width: `${Math.max(2, share)}%` }}/></i><b>{bucket.count}</b><small>{share.toFixed(1)}%</small></div>; })}</div>
      </DossierSection>

      <DossierSection id="system" index="03" title="主题与内容形式组合" note="分开看他讲什么、怎么讲、画面如何组织以及哪些结构反复出现。" health={data.contentSystem.health}>
        <div className="cluster-grid"><ClusterTable title="主题基本盘" values={data.contentSystem.topicClusters}/><ClusterTable title="内容形式基本盘" values={data.contentSystem.formatClusters}/></div>
        <div className="dossier-two-column"><article><h3>主题组合</h3><StatementList values={data.contentSystem.topics} empty="主题标签尚未结构化。"/></article><article><h3>形式组合</h3><StatementList values={data.contentSystem.formats} empty="内容形式尚未结构化。"/></article><article><h3>画面语言</h3><StatementList values={data.contentSystem.visualLanguage} empty="画面语言尚未结构化。"/></article><article><h3>重复结构</h3><StatementList values={data.contentSystem.recurringStructures} empty="重复结构尚未结构化。"/></article></div>
      </DossierSection>

      <DossierSection id="tiers" index="04" title="High / Base / Low 表现解释" note="先解释账号基本盘，再看爆发与失效；相关性和因果证据分开。">
        <div className="tier-rule-strip">{data.tiers.map((item) => <article key={item.id}><span>{item.label}</span><b>{item.count} 条</b><div className="tier-metrics"><small>中位 {metric(item.metrics.medianLikes)}</small><small>平均 {metric(item.metrics.meanLikes)}</small><small>最高 {metric(item.metrics.maxLikes)}</small></div><StatementList values={item.conclusion} empty="当前没有可用结论。"/>{item.mechanisms.length > 0 && <details><summary>展开机制 · {item.mechanisms.length}</summary><StatementList values={item.mechanisms} empty=""/></details>}{item.failurePatterns.length > 0 && <details><summary>失效条件 · {item.failurePatterns.length}</summary><StatementList values={item.failurePatterns} empty=""/></details>}</article>)}</div>
      </DossierSection>

      <DossierSection id="portfolio" index="05" title={comparisonSetLabel(data.portfolio.items.length)} note={comparisonSetNote(data.portfolio.items.length, deepItems.length)} health={data.portfolio.health}>
        <div className="portfolio-toolbar"><div className="tier-filter">{["all", "high", "base", "low"].map((value) => <button key={value} className={tier === value ? "active" : ""} onClick={() => setOption("tier", value)}>{value === "all" ? "全部" : tierLabels[value as "high" | "base" | "low"]}</button>)}</div><div className="portfolio-selects"><label>主题<select value={topic} onChange={(event) => setOption("topic", event.target.value)}><option value="all">全部</option>{topicOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>形式<select value={format} onChange={(event) => setOption("format", event.target.value)}><option value="all">全部</option>{formatOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>证据<select value={evidence} onChange={(event) => setOption("evidence", event.target.value)}><option value="all">全部</option><option value="deep">深度样本</option><option value="deep_validated">三镜头硬闸通过</option><option value="deep_pending">三镜头待审</option><option value="surface_only">作品级</option></select></label></div><div className="view-switch"><button className={view === "list" ? "active" : ""} onClick={() => setOption("view", "list")}><List size={14}/>List</button><button className={view === "gallery" ? "active" : ""} onClick={() => setOption("view", "gallery")}><Grid2X2 size={14}/>Gallery</button></div></div>
        {view === "list" ? <div className="portfolio-list portfolio-list--v1"><div className="portfolio-list__head"><span>层级</span><span>内容</span><span>主题 / 形式</span><span>发布 / 时长</span><span>点赞 / 中位倍数</span><span>核心内容</span><span>内容架构</span><span>机制假设</span><span>证据</span></div>{items.map((item) => { const multiple = item.likes !== null && data.corpus.medianLikes ? item.likes / data.corpus.medianLikes : null; return <Link to={itemHref(item)} target={item.evidenceHref ? undefined : "_blank"} rel={item.evidenceHref ? undefined : "noreferrer"} className="portfolio-list__row" key={item.id}><span data-label="层级" className={`tier-label tier-label--${item.tier}`}>{tierLabels[item.tier]}</span><strong data-label="内容">{item.title}</strong><span data-label="主题 / 形式">{[item.topic, item.format].filter(Boolean).join(" · ") || "未标注"}</span><span data-label="发布 / 时长">{item.publishedLabel ?? "时间未知"} · {duration(item.durationSeconds)}</span><b data-label="点赞 / 中位倍数">{metric(item.likes)} · {multiple === null ? "—" : `${multiple.toFixed(2)}×`}</b><small data-label="核心内容">{item.coreContent ?? "待深度还原"}</small><small data-label="内容架构">{item.contentArchitecture.join(" → ") || "待深度还原"}</small><small data-label="机制假设">{item.mechanismHypothesis ?? item.selectionReason}</small><em data-label="证据">{evidenceStatusLabels[item.evidenceStatus]}</em></Link>; })}</div>
          : <div className="portfolio-gallery">{items.map((item) => { const multiple = item.likes !== null && data.corpus.medianLikes ? item.likes / data.corpus.medianLikes : null; return <Link to={itemHref(item)} target={item.evidenceHref ? undefined : "_blank"} rel={item.evidenceHref ? undefined : "noreferrer"} className={`portfolio-tile portfolio-tile--${item.tier}`} key={item.id}><div className="portfolio-tile__media">{item.coverHref && <img src={item.coverHref} alt="" loading="lazy"/>}<span>{String(item.tierRank).padStart(2, "0")}</span><em>{item.coverHref ? "真实贴片" : item.deepSample ? "贴片待安全复核" : "贴片未取得"}</em></div><div><span>{tierLabels[item.tier]} · {[item.topic, item.format].filter(Boolean).join(" · ") || "形式未标注"}</span><h3>{item.title}</h3><b>{metric(item.likes)} 赞 · {multiple === null ? "—" : `${multiple.toFixed(2)}×中位`}</b><small>{item.publishedLabel ?? "时间未知"} · {duration(item.durationSeconds)} · {evidenceStatusLabels[item.evidenceStatus]}</small><p><strong>内容：</strong>{item.coreContent ?? "待深度还原"}</p><p><strong>架构：</strong>{item.contentArchitecture.join(" → ") || "待深度还原"}</p><p><strong>机制：</strong>{item.mechanismHypothesis ?? item.selectionReason}</p></div></Link>; })}</div>}
      </DossierSection>

      <DossierSection id="deep" index="06" title="深度证据覆盖" note={deepSetNote(data.portfolio.items.length, deepItems.length)}>
        <div className="deep-coverage-strip">{(["high", "base", "low"] as const).map((value) => { const tierItems = deepItems.filter((item) => item.tier === value); return <article key={value}><span>{tierLabels[value]}</span><b>{tierItems.filter((item) => item.evidenceStatus === "deep_validated").length}/{tierItems.length}</b><small>三镜头通过 / 已选择</small></article>; })}<p>{deepSetNote(data.portfolio.items.length, deepItems.length)} 请在 {data.portfolio.items.length} 条统一 List 或 Gallery 中按“证据”标记进入单视频还原；记录 ID、层级和筛选状态保持不变。</p></div>
      </DossierSection>

      <DossierSection id="rhythm" index="07" title="发布节奏与内容演化" note="时间字段缺失时保持未知，不用选样分布冒充全量节奏。" health={data.rhythm.health}><StatementList values={data.rhythm.statements} empty={data.rhythm.health.reason}/></DossierSection>
      <DossierSection id="audience" index="08" title="评论与用户需求" note="评论只代表已捕捉样本，不外推为全部受众画像。" health={data.audienceDemand.health}><StatementList values={data.audienceDemand.statements} empty={data.audienceDemand.health.reason}/></DossierSection>
      <DossierSection id="engines" index="09" title="观察到的内容系统" note="描述哪些结构与价值反复出现；不输出我们应该复制什么。" health={data.growthEngines.health}><StatementList values={data.growthEngines.statements} empty={data.growthEngines.health.reason}/></DossierSection>
      <DossierSection id="business" index="10" title="商业路径、证据边界与未知" note="商业化迹象、账号能力和无法判断的后台指标在这里收口。" health={data.businessPath.health}><StatementList values={data.businessPath.statements.length ? data.businessPath.statements : data.identity.commercialPaths} empty={data.businessPath.health.reason}/><div className="boundary-list">{data.boundaries.map((boundary, index) => <p key={`${boundary}-${index}`}>{boundary}</p>)}</div></DossierSection>
    </article>
  </main>;
}
