import "./dossier-reading.css";
import { StatementList } from "./DossierStatements";
import { canonicalCreatorHref } from "./model/creator-reading";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import { getCreatorDossier, listCreatorRunOperations, runCreatorOperation } from "../../shared/api/client";
import type { CreatorDossier, CreatorRunOperation } from "../../shared/contracts/core";
import { comparisonSetLabel, deepSetNote } from "./model/creator-sample-copy";
import { creatorEvidenceHref } from "./model/creator-evidence-link";
import { creatorRecoveryPresentation } from "./model/creator-recovery";
import { KnowledgeContributionBlock } from "../../entities/knowledge/KnowledgeContributionBlock";
import { CreatorResearchProgress, CreatorTechnicalChecks } from "./components/CreatorResearchProgress";
import { CreatorDossierOverview } from "./components/CreatorDossierOverview";
import { CreatorPortfolioLibrary } from "./components/CreatorPortfolioLibrary";
import { CrossPostResearchReading } from "./components/CrossPostResearchReading";

const sections = [
  ["identity", "00", "博主主页"], ["portfolio", "01", "作品内容库"], ["corpus", "02", "全量基本盘"], ["system", "03", "主题与形式"],
  ["tiers", "04", "高中低表现"], ["deep", "05", "深度证据"],
  ["rhythm", "07", "节奏与演化"], ["audience", "08", "用户需求"], ["engines", "09", "内容系统"],
  ["business", "10", "商业与边界"]
] as const;

const tierLabels = { high: "高表现", base: "基本盘", low: "低表现" } as const;

function metric(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function Health({ value }: { value: CreatorDossier["corpus"]["health"] }) {
  return <span className={`dossier-health dossier-health--${value.status}`} title={value.reason}>{value.status === "full" ? "已覆盖" : value.status === "partial" ? "部分覆盖" : "未覆盖"}</span>;
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
  const [operation, setOperation] = useState<CreatorRunOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const requestedRun = search.get("run");
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    try {
      const dossier = await getCreatorDossier(requestedRun ?? id);
      if (generation !== loadGeneration.current) return;
      setData(dossier);
      setOperation(null);
      setError(null);
      if (!dossier.run) return;
      try {
        const operations = await listCreatorRunOperations();
        if (generation !== loadGeneration.current) return;
        setOperation(operations.find((item) => item.runId === dossier.run?.id) ?? null);
      } catch {
        if (generation === loadGeneration.current) setOperation(null);
      }
    }
    catch (cause) {
      if (generation !== loadGeneration.current) return;
      setData(null); setOperation(null);
      setError(cause instanceof Error ? cause.message : "无法读取博主档案");
    }
  }, [id, requestedRun]);
  useEffect(() => {
    setResuming(false); setResumeError(null);
    void load();
    return () => { loadGeneration.current += 1; };
  }, [load]);
  useEffect(() => {
    if (!data?.run || ["ready", "reviewable", "failed"].includes(data.run.status)) return undefined;
    const stream = new EventSource(`/api/creator-runs/${encodeURIComponent(data.run.id)}/events/stream`);
    stream.addEventListener("creator-research-event", () => { void load(); });
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [data?.run, load]);
  useEffect(() => {
    if (!data || data.canonicalId === id || data.run?.id !== id) return;
    navigate(`${canonicalCreatorHref(data.canonicalId, data.run.id, window.location.search)}${window.location.hash}`, { replace: true });
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
    ? creatorEvidenceHref(item.evidenceHref, data?.run ? `${canonicalCreatorHref(data.canonicalId, data.run.id, location.search)}#portfolio` : `${location.pathname}${location.search}#portfolio`)
    : item.sourceHref;
  const resume = async (action = operation?.action) => {
    if (!data?.run || !action || action === "none" || resuming) return;
    const generation = loadGeneration.current;
    setResuming(true);
    try {
      await runCreatorOperation(data.run.id, action);
      if (generation !== loadGeneration.current) return;
      setResumeError(null); setResuming(false);
      await load();
    }
    catch (cause) {
      if (generation === loadGeneration.current) setResumeError(cause instanceof Error ? cause.message : "无法恢复博主研究");
    }
    finally {
      if (generation === loadGeneration.current) setResuming(false);
    }
  };

  if (error) return <main className="console console--solo"><div className="page-error"><AlertTriangle/><h1>博主档案读取失败</h1><p>{error}</p></div></main>;
  if (!data) return <main className="console console--solo"><div className="page-loader"><LoaderCircle className="spin"/><p>正在生成统一研究投影</p></div></main>;
  const research = data.crossPostResearch?.sections.length ? data.crossPostResearch : null;
  const deepItems = data.portfolio.items.filter((item) => item.deepSample);
  const recovery = data.run ? creatorRecoveryPresentation(data.run, operation) : null;
  const produced = (values: Array<{ factClass: string }>) => values.some((value) => value.factClass !== "unknown");
  const identityProduced = produced([data.identity.positioning, ...data.identity.audience, ...data.identity.valuesProvided, ...data.identity.trustSources, data.identity.lifecycle]);
  const emptyAnalysis = [
    !identityProduced && "定位、受众与价值",
    !produced([...data.contentSystem.topics, ...data.contentSystem.formats, ...data.contentSystem.visualLanguage, ...data.contentSystem.recurringStructures]) && "内容系统结论",
    !produced(data.rhythm.statements) && "发布节奏与演化",
    !produced(data.audienceDemand.statements) && "评论与用户需求",
    !produced(data.growthEngines.statements) && "内容系统机制",
    !produced(data.businessPath.statements.length ? data.businessPath.statements : data.identity.commercialPaths) && "商业路径"
  ].filter((value): value is string => Boolean(value));
  const visibleSections = sections.filter(([sectionId]) => {
    if (sectionId === "rhythm") return produced(data.rhythm.statements);
    if (sectionId === "audience") return produced(data.audienceDemand.statements);
    if (sectionId === "engines") return produced(data.growthEngines.statements);
    if (sectionId === "business") return produced(data.businessPath.statements.length ? data.businessPath.statements : data.identity.commercialPaths) || data.boundaries.length > 0;
    return true;
  });

  return <main className="console creator-dossier">
    <aside className="console-rail">
      <div className="console-rail__head"><span>CREATOR DOSSIER</span><b>V1</b></div>
      <nav aria-label="博主研究目录">{research ? research.sections.map((section, index) => <a href={`#${section.id}`} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>) : visibleSections.map(([sectionId, index, label]) => <a href={`#${sectionId}`} key={sectionId}><span>{index}</span>{sectionId === "portfolio" ? comparisonSetLabel(data.portfolio.items.length).replace("统一 ", "") : label}</a>)}{research && <a href="#portfolio"><span>06</span>全部样本与单帖分析</a>}</nav>
      <div className="console-rail__foot"><Link to="/creators"><ArrowLeft size={13}/>博主研究</Link><Link to="/comparisons">多博主比较<ArrowRight size={13}/></Link></div>
    </aside>
    <article className="console-main dossier-main">
      <nav className="breadcrumb"><Link to="/creators">博主研究</Link><span>/</span><b>{data.identity.name}</b></nav>
      <CreatorDossierOverview data={data}/>
      <details className="dossier-progress-details" open={!research}>
        <summary>{research ? (data.run?.status === "ready" ? "研究已产出 · 查看执行记录" : "研究已产出 · 尚待完全验证 · 查看执行记录") : "当前研究进度"}</summary>
      <CreatorResearchProgress data={data}>
        {recovery && <div className="creator-progress-action"><p>{recovery.help}</p><button type="button" onClick={() => void resume(recovery.action)} disabled={resuming}>{resuming ? "正在处理" : recovery.label}</button></div>}
        {operation?.resolutionState === "waiting_external" && operation.waitingReason && <p>{operation.waitingReason}</p>}
        {resumeError && <p role="alert">{resumeError}</p>}
      </CreatorResearchProgress>
      </details>
      {research && <CrossPostResearchReading data={data} research={research}/>}
      <CreatorPortfolioLibrary data={data} items={items} view={view} tier={tier ?? "all"} topic={topic} format={format} evidence={evidence} topicOptions={topicOptions} formatOptions={formatOptions} setOption={setOption} itemHref={itemHref}/>
      {data.lastGood.active && <div className="last-good-banner"><RefreshCw size={15}/><div><strong>保留上一版可读档案</strong><p>{data.lastGood.reason}{data.lastGood.revisionLabel ? ` · ${data.lastGood.revisionLabel}` : ""}</p></div></div>}

      <details className={`dossier-legacy-reading${research ? "" : " dossier-legacy-reading--always-open"}`} open={!research}>
      <summary>完整档案与统计</summary>
      <div className="dossier-reading-scope"><b>本次阅读范围</b><p>{data.corpus.postCount} 条可见作品 · {data.corpus.likesKnown} 条点赞已知 · {data.portfolio.items.length} 条选择集 · {deepItems.length} 条深读样本</p><p>{data.run ? `研究批次：${data.run.id} · 来源记录时间：${data.run.lastSnapshotAt ?? "未知"}` : `历史档案 · 来源版本：${data.lastGood.revisionLabel ?? "未知"}`}。当前页面生成时间不等于来源更新时间。</p></div>
      {identityProduced && <div className="identity-grid">
        <article><span>分析定位</span><StatementList data={data} values={[data.identity.positioning]} empty="尚未产出定位分析。"/></article>
        <article><span>服务人群</span><StatementList data={data} values={data.identity.audience} empty="尚未覆盖服务人群。"/></article>
        <article><span>提供的价值</span><StatementList data={data} values={data.identity.valuesProvided} empty="尚未覆盖用户价值。"/></article>
        <article><span>信任来源</span><StatementList data={data} values={data.identity.trustSources} empty="尚未覆盖信任来源。"/></article>
        <article><span>账号阶段</span><StatementList data={data} values={[data.identity.lifecycle]} empty="尚未覆盖账号阶段。"/></article>
      </div>}

      <DossierSection id="corpus" index="02" title="数据健康与全量基本盘" note="中位代表常态，平均揭示头部拉动，最高值只表示公开上限。" health={data.corpus.health}>
        <div className="metric-band"><div><b>{data.corpus.postCount}</b><span>可见作品</span></div><div><b>{metric(data.corpus.medianLikes)}</b><span>点赞中位</span></div><div><b>{metric(data.corpus.meanLikes)}</b><span>平均点赞</span></div><div><b>{metric(data.corpus.maxLikes)}</b><span>最高点赞</span></div><div><b>{data.corpus.highCount ?? "—"}</b><span>≥1 万作品</span></div><div><b>{data.corpus.coverageRate === 1 ? "100" : (data.corpus.coverageRate * 100).toFixed(1)}%</b><span>指标覆盖</span></div></div>
        <div className="percentile-strip"><span>P10 <b>{metric(data.corpus.percentiles.p10)}</b></span><span>P25 <b>{metric(data.corpus.percentiles.p25)}</b></span><span>P75 <b>{metric(data.corpus.percentiles.p75)}</b></span><span>P90 <b>{metric(data.corpus.percentiles.p90)}</b></span><span>视频 <b>{data.corpus.videoCount ?? "—"}</b></span><span>已知点赞 <b>{data.corpus.likesKnown}</b></span></div>
        <p className="console-note"><AlertTriangle size={14}/>{data.corpus.health.reason}</p>
        {data.corpus.annotationCoverage && <p className="console-note"><b>全量表层标注</b> {data.corpus.annotationCoverage.annotatedPosts}/{data.corpus.annotationCoverage.observedPosts} 条；其中 {data.corpus.annotationCoverage.unclassifiedPosts} 条明确保留为未归类，不用猜测补齐。</p>}
        <div className="corpus-notes">{data.corpus.notes.map((note) => <p key={note}>{note}</p>)}</div>
        <div className="distribution-view"><header><b>公开点赞分布</b><span>不同区间的作品数量与占比</span></header>{data.corpus.distribution.map((bucket) => { const share = bucket.share * 100; return <div key={bucket.label}><span>{bucket.label}</span><i><em style={{ width: `${Math.max(0, share)}%` }}/></i><b>{bucket.count}</b><small>{share.toFixed(1)}%</small></div>; })}</div>
      </DossierSection>

      <DossierSection id="system" index="03" title="主题与内容形式组合" note="分开看他讲什么、怎么讲、画面如何组织以及哪些结构反复出现。" health={data.contentSystem.health}>
        <div className="cluster-grid"><ClusterTable title="主题基本盘" values={data.contentSystem.topicClusters}/><ClusterTable title="内容形式基本盘" values={data.contentSystem.formatClusters}/></div>
        {produced([...data.contentSystem.topics, ...data.contentSystem.formats, ...data.contentSystem.visualLanguage, ...data.contentSystem.recurringStructures]) && <div className="dossier-two-column"><article><h3>主题组合</h3><StatementList data={data} values={data.contentSystem.topics} empty="未产出。"/></article><article><h3>形式组合</h3><StatementList data={data} values={data.contentSystem.formats} empty="未产出。"/></article><article><h3>画面语言</h3><StatementList data={data} values={data.contentSystem.visualLanguage} empty="未产出。"/></article><article><h3>重复结构</h3><StatementList data={data} values={data.contentSystem.recurringStructures} empty="未产出。"/></article></div>}
      </DossierSection>

      <DossierSection id="tiers" index="04" title="High / Base / Low 表现统计" note="以下数量为当前选择集内的表现分层；没有结论时只展示统计，不从表现差异猜测原因。">
        <div className="tier-rule-strip">{data.tiers.map((item) => <article key={item.id}><span>{item.label}</span><b>{item.count} 条</b><div className="tier-metrics"><small>中位 {metric(item.metrics.medianLikes)}</small><small>平均 {metric(item.metrics.meanLikes)}</small><small>最高 {metric(item.metrics.maxLikes)}</small></div>{produced(item.conclusion) && <StatementList data={data} values={item.conclusion} empty=""/>}{item.mechanisms.length > 0 && <details><summary>展开机制 · {item.mechanisms.length}</summary><StatementList data={data} values={item.mechanisms} empty=""/></details>}{item.failurePatterns.length > 0 && <details><summary>失效条件 · {item.failurePatterns.length}</summary><StatementList data={data} values={item.failurePatterns} empty=""/></details>}</article>)}</div>
      </DossierSection>

      <DossierSection id="deep" index="06" title="深度证据覆盖" note={deepSetNote(data.portfolio.items.length, deepItems.length)}>
        <p className="console-note">高 / 基本盘 / 低是表现分层；中位附近、均值附近是选择理由。均值受头部拉动，均值附近样本可能落在高表现层；以每条记录的选择标记为准。</p>
        <div className="deep-coverage-strip">{(["high", "base", "low"] as const).map((value) => { const tierItems = deepItems.filter((item) => item.tier === value); return <article key={value}><span>{tierLabels[value]}</span><b>{tierItems.filter((item) => item.evidenceStatus === "deep_validated").length}/{tierItems.length}</b><small>原记录通过 / 已选择</small></article>; })}<p>{deepSetNote(data.portfolio.items.length, deepItems.length)} 当前有 {deepItems.filter((item) => ["deep_built", "deep_validated"].includes(item.evidenceStatus)).length} 条报告可阅读，{deepItems.filter((item) => item.evidenceStatus === "deep_validated").length} 条原记录标记评估通过。这里只汇总该批次记录，不代表已通过当前单帖评估规则；具体格式、评估及未知请进入单帖查看。</p></div>
      </DossierSection>

      {produced(data.rhythm.statements) && <DossierSection id="rhythm" index="07" title="发布节奏与内容演化" note="时间字段缺失时保持未知，不用选样分布冒充全量节奏。" health={data.rhythm.health}><StatementList data={data} values={data.rhythm.statements} empty=""/></DossierSection>}
      {produced(data.audienceDemand.statements) && <DossierSection id="audience" index="08" title="评论与用户需求" note="评论只代表已捕捉样本，不外推为全部受众画像。" health={data.audienceDemand.health}><StatementList data={data} values={data.audienceDemand.statements} empty=""/></DossierSection>}
      {produced(data.growthEngines.statements) && <DossierSection id="engines" index="09" title="观察到的内容系统" note="描述哪些结构与价值反复出现；不输出我们应该复制什么。" health={data.growthEngines.health}><StatementList data={data} values={data.growthEngines.statements} empty=""/></DossierSection>}
      {(produced(data.businessPath.statements.length ? data.businessPath.statements : data.identity.commercialPaths) || data.boundaries.length > 0) && <DossierSection id="business" index="10" title="商业路径、证据边界与未知" note="商业化迹象、账号能力和无法判断的后台指标在这里收口。" health={data.businessPath.health}><StatementList data={data} values={data.businessPath.statements.length ? data.businessPath.statements : data.identity.commercialPaths} empty="未产出商业路径结论。"/><div className="boundary-list">{data.boundaries.map((boundary, index) => <p key={`${boundary}-${index}`}>{boundary}</p>)}</div></DossierSection>}
      {emptyAnalysis.length > 0 && <section className="dossier-analysis-empty"><h2>尚未产出的分析</h2><p>{emptyAnalysis.join("、")}尚无可靠结论。页面保留已有来源事实和统计，不据此补写或猜测。</p></section>}
      </details>
      <CreatorTechnicalChecks data={data}/>
      <details className="dossier-audit-strip"><summary>知识贡献记录</summary><KnowledgeContributionBlock subjectType="creator" subjectId={data.canonicalId}/></details>
    </article>
  </main>;
}
