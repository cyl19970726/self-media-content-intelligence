import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { createComparisonProject, getBenchmark, getComparisonProject, listComparisonProjects, listCreatorResearchRuns } from "./api";
import type { Benchmark as BenchmarkData, CreatorResearchRun } from "../shared/schema";
import type { ComparisonProject } from "../modules/comparison/project-contracts";
import type { CreatorComparison } from "../modules/comparison/contracts";

const kindLabels: Record<string, string> = { track: "赛道规律", ip: "IP 能力", gap: "定位空缺" };

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [runs, setRuns] = useState<CreatorResearchRun[]>([]);
  const [projects, setProjects] = useState<ComparisonProject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("AI 博主横向研究");
  const [liveComparison, setLiveComparison] = useState<CreatorComparison | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshProjects = useCallback(async () => {
    const next = await listComparisonProjects();
    setProjects(next);
    const latestReady = next.find((project) => project.status === "ready");
    if (latestReady) setLiveComparison((await getComparisonProject(latestReady.id)).comparison);
  }, []);
  useEffect(() => {
    Promise.all([getBenchmark(), listCreatorResearchRuns(), listComparisonProjects()]).then(async ([benchmark, creatorRuns, comparisonProjects]) => {
      setData(benchmark);
      setRuns(creatorRuns);
      setProjects(comparisonProjects);
      const latestReady = comparisonProjects.find((project) => project.status === "ready");
      if (latestReady) setLiveComparison((await getComparisonProject(latestReady.id)).comparison);
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取对比数据");
    });
  }, []);
  useEffect(() => {
    if (!projects.some((project) => ["queued", "running"].includes(project.status))) return undefined;
    const timer = window.setInterval(() => { void refreshProjects(); }, 1_500);
    return () => window.clearInterval(timer);
  }, [projects, refreshProjects]);
  const eligibleRuns = runs.filter((run) => Boolean(run.portfolioArtifactRef && run.selectionArtifactRef));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try { await createComparisonProject(projectName, selected); setSelected([]); await refreshProjects(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法创建比较项目"); }
    finally { setSubmitting(false); }
  };
  const maxRatio = Math.max(1, ...(data?.ips.map((ip) => ip.aggregateCollectionToLike) ?? [1]));
  return <main className="console console--solo">
    <article className="benchmark">
      <nav className="breadcrumb">
        <Link to="/creators">博主总览</Link><span>/</span><b>跨 IP 对比台</b>
      </nav>
      <header className="benchmark-head">
        <div>
          <p className="eyebrow"><span>BENCHMARK</span><span>跨账号 · 规律可信度</span></p>
          <h1>跨 IP 对比台</h1>
          <p className="benchmark-head__lede">同一个归纳循环在多个账号之间运行：用“跨账号重复出现”给观察标可信度，区分赛道共同结构、单一 IP 特征、条件差异与证据空缺。</p>
        </div>
      </header>
      <section className="comparison-project-control">
        <div><span className="eyebrow">PINNED COMPARISON</span><h2>固定博主版本，再开始比较</h2><p>选择至少两个已经形成 Portfolio 的任务。创建后即使单博主刷新，历史比较也不会漂移。</p></div>
        <form onSubmit={submit}>
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="比较项目名称"/>
          <div className="comparison-run-picker">{eligibleRuns.map((run) => <label key={run.id}>
            <input type="checkbox" checked={selected.includes(run.id)} onChange={() => setSelected((current) => current.includes(run.id)
              ? current.filter((id) => id !== run.id) : [...current, run.id])}/>
            <span>{run.creatorName ?? run.id.slice(0, 8)}</span><small>{run.coverage.discoveredPosts} 条 · {run.status}</small>
          </label>)}</div>
          <button className="primary-button" disabled={submitting || selected.length < 2}>{submitting ? <LoaderCircle className="spin" size={15}/> : null}创建比较</button>
          {eligibleRuns.length < 2 && <small>至少需要两个已完成基本盘的博主任务。</small>}
        </form>
        {projects.length > 0 && <div className="comparison-project-list">{projects.slice(0, 5).map((project) => <article key={project.id}>
          <span>{project.status}</span><strong>{project.name}</strong><small>{project.members.map((member) => member.creatorName).join(" × ")}</small>
        </article>)}</div>}
      </section>
      {liveComparison && <section className="comparison-live-result">
        <header><span>VERSION-PINNED RESULT</span><h2>最新持久比较结果</h2></header>
        <div>{liveComparison.members.map((member) => <article key={member.creatorRunId}>
          <strong>{member.creatorName}</strong><span>中位 {member.medianLikes?.toLocaleString() ?? "未知"}</span><span>均值 {member.meanLikes?.toLocaleString() ?? "未知"}</span><span>最高 {member.maxLikes?.toLocaleString() ?? "未知"}</span>
        </article>)}</div>
        {liveComparison.observations.map((observation) => <p key={observation.text}>{observation.text}<small>{observation.boundary}</small></p>)}
      </section>}
      {error ? <div className="page-error"><CircleAlert/><h1>对比数据读取失败</h1><p>{error}</p></div>
        : !data ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在计算跨账号对比</p></div>
          : <>
            <section className="benchmark-metric">
              <h2>{data.metric}</h2>
              <p className="benchmark-note">{data.metricNote}</p>
              <div className="benchmark-table">
                <div className="benchmark-scale">
                  <span>0</span><span>{`${(maxRatio * 0.25).toFixed(1)}`}</span><span>{`${(maxRatio * 0.5).toFixed(1)}`}</span><span>{`${(maxRatio * 0.75).toFixed(1)}`}</span><span>{maxRatio.toFixed(1)}</span>
                </div>
                <div className="benchmark-row benchmark-row--head">
                  <span>#</span><span>账号</span><span>收藏/点赞（共享轴 0–{maxRatio.toFixed(1)}）</span><span>值</span><span>互动中位</span><span>样本</span>
                </div>
                {data.ips.map((ip, index) => (
                  <div key={ip.id} className="benchmark-row">
                    <span className="benchmark-row__rank">{String(index + 1).padStart(2, "0")}</span>
                    <span><Link to={`/creators/${ip.id}`}>{ip.name}<ArrowRight size={12}/></Link></span>
                    <span className="benchmark-row__track">
                      <i style={{ width: `${(ip.aggregateCollectionToLike / maxRatio) * 100}%` }}/>
                    </span>
                    <span className="benchmark-row__value">{ip.aggregateCollectionToLike.toFixed(2)}</span>
                    <span>{ip.medianLikes.toLocaleString()}</span>
                    <span>{ip.sampleSize} 条</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="benchmark-findings">
              <h2>规律可信度分层</h2>
              <div className="finding-grid" style={{ gridTemplateColumns: `repeat(${data.findings.length}, minmax(0, 1fr))` }}>
                {data.findings.map((finding) => <article key={finding.text.slice(0, 24)} className={`finding finding--${finding.kind}`}>
                  <span className="finding__kind">{kindLabels[finding.kind]}</span>
                  <p>{finding.text}</p>
                </article>)}
              </div>
            </section>
            <p className="console-note"><CircleAlert size={14}/>样本结构不同（21 条分层选样 vs 62 条全量 vs 19 条全量），对比只标注方向，不虚构精度。</p>
          </>}
    </article>
  </main>;
}
