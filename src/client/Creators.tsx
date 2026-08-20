import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Database, ExternalLink, Link2, LoaderCircle, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { createCreatorResearchRun, listCreatorResearchRuns, listCreators, resumeCreatorResearchRun } from "./api";
import type { CreatorResearchRun, CreatorResearchStatus, CreatorSummary } from "../shared/schema";

const statusLabels: Record<CreatorResearchStatus, string> = {
  queued: "等待接管",
  preflight: "登录预检",
  collecting: "正在采集",
  needs_user: "需要你接管",
  backoff: "已退避",
  reviewable: "可复核",
  ready: "分析完成",
  failed: "任务失败",
  stale: "等待刷新"
};

function CreatorCard({ creator, index }: { creator: CreatorSummary; index: number }) {
  const consoleHref = `/creators/${creator.id}`;
  const evidenceHref = creator.entries[0]?.href;
  return <article className="creator-card">
    <header className="creator-card__head">
      <span className="creator-card__number">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <h2>{creator.name}</h2>
        <p className="creator-card__position">{creator.positioning}</p>
      </div>
      <a className="creator-card__profile" href={creator.profileUrl} target="_blank" rel="noreferrer" aria-label={`打开 ${creator.name} 主页`}>
        <ExternalLink size={14}/>
      </a>
    </header>
    <div className="creator-card__metrics">
      <div><b>{creator.followers}</b><span>粉丝</span></div>
      <div><b>{creator.likesAndCollections}</b><span>赞藏</span></div>
      {creator.stats.slice(0, 1).map((stat) => <div key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}
    </div>
    <p className="creator-card__summary">{creator.summary}</p>
    <div className="creator-card__tags">
      {creator.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
    </div>
    <nav className="creator-card__entries">
      <Link to={consoleHref}><span>进入研究台</span><small>定位 · 基本盘 · 爆发 · 失效</small><ArrowRight size={15}/></Link>
      {evidenceHref && <a href={evidenceHref}><span>查看内容证据</span><small>{creator.entries[0]?.label}</small><ArrowRight size={15}/></a>}
    </nav>
  </article>;
}

function ResearchRun({ run, onResume }: { run: CreatorResearchRun; onResume: (id: string) => Promise<void> }) {
  const current = run.stages.find((stage) => stage.id === run.currentStage);
  const blocker = run.blockers[0];
  return <article className={`creator-run creator-run--${run.status}`}>
    <div className="creator-run__status">
      <span className={`status status--${run.status}`}><i/>{statusLabels[run.status]}</span>
      <time>{new Date(run.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
    </div>
    <div className="creator-run__main">
      <strong>{run.creatorName ?? "待识别博主"}</strong>
      <a href={run.profileUrl} target="_blank" rel="noreferrer">{run.profileUrl}<ExternalLink size={12}/></a>
      <p><b>{current?.label ?? "等待预检"}</b> · {run.nextAction}</p>
    </div>
    <div className="creator-run__coverage" aria-label="采集覆盖">
      <span><b>{run.coverage.discoveredPosts}</b>发现</span>
      <span><b>{run.coverage.comparisonPosts}</b>对比</span>
      <span><b>{run.coverage.reconstructedPosts}</b>还原</span>
    </div>
    <div className="creator-run__pipeline" aria-label="分析阶段">
      {run.stages.map((stage) => <span className={`creator-run__stage creator-run__stage--${stage.status}`} key={stage.id} title={stage.label}/>) }
    </div>
    <footer>
      <span><ShieldCheck size={13}/>hhh-01 · 只读 · 增量 · 不绕过验证</span>
      <span>WORKER · {run.worker.state.toUpperCase()} · ATTEMPT {run.worker.attempt}</span>
      {blocker && <span className={blocker.userActionRequired ? "creator-run__blocker creator-run__blocker--user" : "creator-run__blocker"}>
        <AlertTriangle size={13}/>{blocker.message}
      </span>}
      {(["needs_user", "backoff", "failed"] as CreatorResearchStatus[]).includes(run.status) &&
        <button type="button" className="creator-run__resume" onClick={() => void onResume(run.id)}>
          <RefreshCw size={12}/>{run.status === "needs_user" ? "我已完成，继续" : "重新排队"}
        </button>}
      {run.dashboardPath && <Link to={run.dashboardPath}>打开研究台<ArrowRight size={13}/></Link>}
      {!run.dashboardPath && run.portfolioArtifactRef && <Link to={`/creator-runs/${run.id}`}>打开研究台<ArrowRight size={13}/></Link>}
      {!run.dashboardPath && run.inventoryArtifactRef && <a href={run.inventoryArtifactRef}>作品清单<ArrowRight size={13}/></a>}
      {!run.dashboardPath && run.portfolioArtifactRef && <a href={run.portfolioArtifactRef}>基本盘统计<ArrowRight size={13}/></a>}
      {!run.dashboardPath && run.selectionArtifactRef && <a href={run.selectionArtifactRef}>21 条选择<ArrowRight size={13}/></a>}
    </footer>
  </article>;
}

export default function CreatorsOverview() {
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [runs, setRuns] = useState<CreatorResearchRun[] | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const [creatorData, runData] = await Promise.all([listCreators(), listCreatorResearchRuns()]);
      setCreators(creatorData);
      setRuns(runData);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法读取博主研究台");
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    const timer = window.setInterval(() => void loadOverview(), 2_500);
    return () => window.clearInterval(timer);
  }, [loadOverview]);

  async function resume(id: string) {
    try {
      const run = await resumeCreatorResearchRun(id);
      setRuns((current) => (current ?? []).map((item) => item.id === id ? run : item));
      setCreatedMessage("任务已恢复，后台 Worker 会从持久队列继续处理。");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法恢复博主分析");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedMessage(null);
    try {
      const run = await createCreatorResearchRun(profileUrl);
      setRuns((current) => [run, ...(current ?? []).filter((item) => item.id !== run.id)]);
      setProfileUrl("");
      setCreatedMessage("分析任务已进入同一工作台。采集 Worker 接管后，这里会继续显示覆盖与阻塞状态。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法创建博主分析");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="workspace workspace--solo">
    <section className="creators-page">
      <div className="eyebrow"><span>CREATOR ANALYSIS OS</span><span>一个入口 · 一个任务账本 · 一份证据档案</span></div>
      <header className="creator-control-head">
        <div>
          <h1>给我一个博主，<em>看清他的内容系统。</em></h1>
          <p className="intake__lede">识别这个博主是谁、给用户提供什么价值、什么构成基本盘、什么内容爆发或失效，并让每个判断回到公开数据与视频证据。</p>
        </div>
        <ol aria-label="研究结果">
          <li><span>01</span>定位与受众</li>
          <li><span>02</span>基本盘与分布</li>
          <li><span>03</span>爆发与失效机制</li>
          <li><span>04</span>证据与未知</li>
        </ol>
      </header>

      <form className="creator-intake" onSubmit={submit}>
        <label htmlFor="creator-profile-url"><Link2 size={14}/>小红书博主主页链接</label>
        <div className="input-row">
          <input id="creator-profile-url" type="url" value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)}
            placeholder="https://www.xiaohongshu.com/user/profile/..." autoComplete="url" required/>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={16}/> : <ArrowRight size={16}/>}
            {submitting ? "正在建立任务" : "开始分析博主"}
          </button>
        </div>
        <div className="creator-intake__policy">
          <span><ShieldCheck size={13}/>使用 hhh-01 登录态；遇验证立即停下请你接管</span>
          <span><Database size={13}/>优先缓存与增量刷新，避免重复访问</span>
        </div>
        {createdMessage && <p className="form-success" aria-live="polite">{createdMessage}</p>}
        {error && <p className="form-error" role="alert"><AlertTriangle size={14}/>{error}</p>}
      </form>

      <section className="research-queue" aria-labelledby="research-queue-title">
        <header>
          <div><span>ACTIVE RESEARCH</span><h2 id="research-queue-title">分析任务</h2></div>
          <button className="text-button" type="button" onClick={() => void loadOverview()}><RefreshCw size={13}/>刷新状态</button>
        </header>
        {runs === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取任务账本</p></div>
          : runs.length > 0 ? <div className="creator-run-list">{runs.map((run) => <ResearchRun key={run.id} run={run} onResume={resume}/>)}</div>
            : <div className="rail-empty"><Database size={20}/>粘贴第一个博主主页链接，任务状态会持续保留在这里。</div>}
      </section>

      <section className="creator-dossiers" aria-labelledby="creator-dossiers-title">
        <header>
          <div><span>RESEARCH DOSSIERS</span><h2 id="creator-dossiers-title">已完成的博主档案</h2></div>
          <p>每一份都沿用同一套判断顺序，不再创建另一张 Dashboard。</p>
        </header>
        {creators === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在汇总博主档案</p></div>
          : <div className="creators-grid">
            {creators.map((creator, index) => <CreatorCard key={creator.id} creator={creator} index={index}/>) }
            {creators.length === 0 && <div className="rail-empty"><UserRound size={20}/>还没有完成复核的博主档案。</div>}
          </div>}
      </section>

      {creators && creators.length > 0 && <Link to="/benchmark" className="benchmark-banner">
        <span>进入跨 IP 对比台</span>
        <b>规律可信度：赛道规律 / IP 能力 / 定位空缺</b>
        <ArrowRight size={16}/>
      </Link>}
    </section>
  </main>;
}
