import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { createComparisonProject, getComparisonDossier, getCreatorDossier, listComparisonProjects, listCreators } from "./api";
import type { ComparisonCreatorSource, ComparisonProject } from "../modules/comparison/project-contracts";
import type { ComparisonDossier } from "../shared/comparison-dossier";
import type { CreatorDossier, ResearchStatement } from "../shared/creator-dossier";

const classificationLabels = { track_wide: "赛道共性", creator_specific: "博主特有", conditional: "条件规律", anomaly: "孤立异常", unknown: "未知" } as const;
const factLabels = { observed: "观察", author_claim: "作者主张", inference: "推断", unknown: "未知" } as const;

function metric(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function coveragePercent(value: number) {
  const percent = value * 100;
  return `${percent === 100 ? "100" : percent.toFixed(1)}%`;
}

function Statements({ values }: { values: ResearchStatement[] }) {
  if (!values.length) return <p className="comparison-empty">该维度尚未形成可比较证据。</p>;
  return <>{values.slice(0, 4).map((value, index) => <p key={`${value.statement}-${index}`} className={`comparison-statement comparison-statement--${value.factClass}`}><span>{factLabels[value.factClass]}</span>{value.statement}</p>)}</>;
}

function Matrix({ title, note, cells }: { title: string; note: string; cells: ComparisonDossier["matrices"]["values"] }) {
  return <section className="comparison-section"><header><h2>{title}</h2><p>{note}</p></header><div className="comparison-matrix">{cells.map((cell) => <article key={cell.creatorId}><b>{cell.creatorName}</b><Statements values={cell.statements}/></article>)}</div></section>;
}

type ComparisonCandidate = ComparisonCreatorSource & {
  name: string;
  postCount: number;
  coverageRate: number;
  sourceLabel: string;
  eligible: boolean;
  reason: string;
};

function candidateFromDossier(dossier: CreatorDossier): ComparisonCandidate {
  const legacy = dossier.source === "legacy_adapter";
  const sourceRunId = legacy ? `legacy:${dossier.canonicalId}` : dossier.run?.id ?? "missing-run";
  const revision = legacy
    ? dossier.lastGood.revisionLabel ?? dossier.generatedAt
    : dossier.run?.portfolioArtifactRef && dossier.run.selectionArtifactRef
      ? `${dossier.run.portfolioArtifactRef}|${dossier.run.selectionArtifactRef}` : "missing-revision";
  const eligible = legacy
    ? dossier.corpus.postCount > 0 && dossier.portfolio.items.length > 0
    : Boolean(dossier.run?.portfolioArtifactRef && dossier.run.selectionArtifactRef);
  return {
    creatorId: dossier.canonicalId, sourceRunId, revision, name: dossier.identity.name,
    postCount: dossier.corpus.postCount, coverageRate: dossier.corpus.coverageRate,
    sourceLabel: legacy ? "已发布档案快照" : "Creator Run 快照",
    eligible,
    reason: eligible
      ? `固定于 ${legacy ? (dossier.lastGood.revisionLabel ?? "已发布版本") : "当前 Portfolio + 21 条选择集"}`
      : "尚未同时形成全量基本盘与 21 条选择集；不允许加入比较。"
  };
}

function ComparisonDetail({ id }: { id: string }) {
  const [data, setData] = useState<ComparisonDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => getComparisonDossier(id).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "无法读取比较项目")), [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data || !["queued", "running"].includes(data.status)) return undefined;
    const timer = window.setInterval(() => { void load(); }, 1_500); return () => window.clearInterval(timer);
  }, [data, load]);
  if (error) return <div className="page-error"><AlertTriangle/><h1>比较项目读取失败</h1><p>{error}</p></div>;
  if (!data) return <div className="page-loader"><LoaderCircle className="spin"/><p>正在生成多博主研究投影</p></div>;
  return <article className="comparison-dossier">
    <nav className="breadcrumb"><Link to="/comparisons">多博主研究</Link><span>/</span><b>{data.name}</b></nav>
    <header className="comparison-hero"><div><p className="eyebrow"><span>MULTI-CREATOR RESEARCH</span><span>{data.status}</span></p><h1>{data.name}</h1><p>先核对比较范围和可比性，再看归一化基本盘、价值与内容矩阵，最后才读取结论台账。</p></div><span className={`comparison-state comparison-state--${data.scope.comparability}`}>{data.scope.comparability === "aligned" ? "可比" : data.scope.comparability === "partial" ? "部分可比" : "不可比较"}</span></header>
    <section className="comparison-scope"><div><span>平台</span><b>{data.scope.platform}</b></div><div><span>成员</span><b>{data.scope.memberCount}</b></div><div><span>时间窗</span><b>{data.scope.windowLabel}</b></div><div><span>生成时间</span><b>{new Date(data.generatedAt).toLocaleString("zh-CN")}</b></div>{data.scope.warnings.map((warning) => <p key={warning}><AlertTriangle size={13}/>{warning}</p>)}</section>

    <section className="comparison-section"><header><h2>01 · 归一化基本盘</h2><p>原始值与相对自身中位数同时呈现，不做跨账号原始点赞排行榜。</p></header><div className="normalized-table"><div className="normalized-row normalized-row--head"><span>博主</span><span>覆盖</span><span>中位</span><span>均值</span><span>最高</span><span>均值/中位</span><span>最高/中位</span><span>H/B/L</span></div>{data.members.map((member) => <Link to={member.href} className="normalized-row" key={member.creatorRunId}><b>{member.name}</b><span>{coveragePercent(member.coverageRate)}</span><span>{metric(member.medianLikes)}</span><span>{metric(member.meanLikes)}</span><span>{metric(member.maxLikes)}</span><span>{member.meanMedianMultiple?.toFixed(2) ?? "—"}×</span><span>{member.maxMedianMultiple?.toFixed(1) ?? "—"}×</span><span>{member.selectedCounts.high}/{member.selectedCounts.base}/{member.selectedCounts.low}</span></Link>)}</div></section>

    <section className="comparison-section"><header><h2>02 · 定位、价值与生命周期</h2><p>每个判断保留事实类别；身份差异不能被误写成赛道规律。</p></header><div className="identity-comparison">{data.members.map((member) => <article key={member.creatorRunId}><Link to={member.href}>{member.name}<ArrowRight size={12}/></Link><h3>定位</h3><Statements values={[member.positioning]}/><h3>用户价值</h3><Statements values={member.values}/><h3>生命周期</h3><Statements values={[member.lifecycle]}/></article>)}</div></section>
    <Matrix title="03 · 用户价值矩阵" note="比较各账号提供的实用、认知、情绪、决策与信任价值。" cells={data.matrices.values}/>
    <Matrix title="04 · 主题矩阵" note="开放式主题簇来自各自内容，不强行压进固定分类。" cells={data.matrices.topics}/>
    <Matrix title="05 · 形式矩阵" note="比较内容形式、画面组织和信息载体的差异。" cells={data.matrices.formats}/>

    <section className="comparison-section"><header><h2>06 · High / Base / Low 机制对照</h2><p>每个博主都以自己的基本盘分层，单格结论可回到对应研究页。</p></header>{data.tiers.map((tier) => <div className={`tier-comparison tier-comparison--${tier.id}`} key={tier.id}><h3>{tier.label}</h3><div>{tier.cells.map((cell) => <article key={cell.creatorId}><b>{cell.creatorName}</b><Statements values={cell.statements}/></article>)}</div></div>)}</section>
    <Matrix title="07 · 结构与表达" note="对照反复出现的内容架构、画面语言和表达方式。" cells={data.dimensions.structure}/>
    <Matrix title="08 · 评论与用户需求" note="只解释已捕捉评论范围，不冒充全部受众。" cells={data.dimensions.audience}/>
    <Matrix title="09 · 节奏与内容演化" note="发布时间缺失或窗口未对齐时保持未知。" cells={data.dimensions.rhythm}/>
    <Matrix title="10 · 商业路径" note="描述可见商业迹象及生命周期，不输出模仿建议。" cells={data.dimensions.business}/>

    <section className="comparison-section comparison-section--ledger"><header><h2>11 · 结论台账</h2><p>结论必须明确是赛道共性、博主特有、条件规律、异常还是未知。</p></header>{data.ledger.length ? data.ledger.map((item, index) => <article key={`${item.statement}-${index}`}><span>{classificationLabels[item.classification]}</span><div><p>{item.statement}</p><small>{item.boundary}</small><nav>{item.creatorHrefs.map((href) => <Link to={href} key={href}>查看证据<ArrowRight size={11}/></Link>)}</nav></div></article>) : <p className="comparison-empty">比较 Worker 尚未形成通过范围检查的结论。</p>}</section>
    <section className="comparison-limitations"><h2>边界与未知</h2>{data.limitations.map((value) => <p key={value}>{value}</p>)}</section>
    <Link className="evidence-back" to="/comparisons"><ArrowLeft size={15}/>返回比较项目</Link>
  </article>;
}

function ComparisonIndex() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([]);
  const [projects, setProjects] = useState<ComparisonProject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("AI 博主横向研究");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const [summaries, nextProjects] = await Promise.all([listCreators(), listComparisonProjects()]);
    const results = await Promise.allSettled(summaries.map((summary) => getCreatorDossier(summary.id)));
    const nextCandidates = results.flatMap((result) => result.status === "fulfilled" ? [candidateFromDossier(result.value)] : []);
    setCandidates(nextCandidates); setProjects(nextProjects);
  }, []);
  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "无法读取比较项目")); }, [refresh]);
  const eligible = candidates.filter((candidate) => candidate.eligible);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(null);
    try {
      const sources = selected.map((creatorId) => eligible.find((candidate) => candidate.creatorId === creatorId))
        .filter((candidate): candidate is ComparisonCandidate => Boolean(candidate))
        .map(({ creatorId, sourceRunId, revision }) => ({ creatorId, sourceRunId, revision }));
      const project = await createComparisonProject(projectName, sources); navigate(`/comparisons/${project.id}`);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法创建比较项目"); }
    finally { setSubmitting(false); }
  };
  return <article className="comparison-index"><nav className="breadcrumb"><Link to="/creators">博主研究</Link><span>/</span><b>多博主研究</b></nav><header><p className="eyebrow"><span>COMPARISON PROJECTS</span><span>VERSION PINNED</span></p><h1>多博主研究</h1><p>固定每个博主的研究版本，再比较账号结构；刷新单博主不会悄悄改写历史结论。</p></header>
    <section className="comparison-create"><div><h2>创建比较项目</h2><p>选择至少两位已形成全量基本盘与统一选择集的博主。这里固定的是研究版本，不是会随刷新变化的账号页面。</p></div><form onSubmit={submit}><input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="比较项目名称"/><div className="comparison-run-picker">{candidates.map((candidate) => <label key={candidate.creatorId} className={!candidate.eligible ? "is-unavailable" : ""}><input type="checkbox" disabled={!candidate.eligible} checked={selected.includes(candidate.creatorId)} onChange={() => setSelected((current) => current.includes(candidate.creatorId) ? current.filter((value) => value !== candidate.creatorId) : [...current, candidate.creatorId])}/><span><b>{candidate.name}</b><small>{candidate.postCount} 条 · 点赞覆盖 {coveragePercent(candidate.coverageRate)} · {candidate.sourceLabel}</small></span><em title={candidate.reason}>{candidate.eligible ? "可固定" : "尚不可固定"}</em><small className="comparison-revision">版本：{candidate.revision}</small></label>)}</div><button className="primary-button" disabled={submitting || selected.length < 2}>{submitting && <LoaderCircle className="spin" size={14}/>}创建固定比较</button>{eligible.length < 2 && <small className="comparison-empty">尚不足两份可固定研究。先完成任一博主的全量基本盘和选择集，再回来比较；系统不会把未完成或没有证据的档案硬塞进来。</small>}{candidates.length === 0 && <small className="comparison-empty">当前没有读取到已发布博主档案。请先返回博主研究页确认资料仍可读取。</small>}</form></section>
    {error && <p className="form-error"><AlertTriangle size={14}/>{error}</p>}
    <section className="comparison-projects"><header><h2>已有项目</h2><span>{projects.length}</span></header>{projects.length ? projects.map((project) => <Link to={`/comparisons/${project.id}`} key={project.id}><span>{project.status}</span><div><h3>{project.name}</h3><p>{project.members.map((member) => member.creatorName).join(" × ")}</p></div><time>{new Date(project.updatedAt).toLocaleString("zh-CN")}</time><ArrowRight size={15}/></Link>) : <p className="comparison-empty">还没有比较项目。单博主研究完成后，可在这里固定版本并横向比较。</p>}</section>
  </article>;
}

export default function BenchmarkPage() {
  const { comparisonId } = useParams();
  return <main className="console console--solo">{comparisonId ? <ComparisonDetail id={comparisonId}/> : <ComparisonIndex/>}</main>;
}
