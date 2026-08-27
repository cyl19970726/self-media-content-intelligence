import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Database, ExternalLink, KeyRound, Link2, LoaderCircle, Plus, Radar, RefreshCw, Server, ShieldCheck, UserRound } from "lucide-react";
import { createCreatorResearchRun, discoverAiCreators, listCreatorResearchRuns, listCreators, resumeCreatorResearchRun } from "./api";
import type { CreatorAcquisitionAdapter, CreatorDiscoveryResult, CreatorResearchRun, CreatorResearchStatus, CreatorSummary } from "../shared/schema";
import { completionNotice, failureReason, findExistingCreatorRun, taskEstimateLabel, taskPhases, validateCreatorProfileUrl } from "./creator-task-state";

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
      <Link to={consoleHref}><span>进入唯一研究页</span><small>定位 · 基本盘 · 统一选择集 · 深度证据</small><ArrowRight size={15}/></Link>
    </nav>
  </article>;
}

function ResearchRun({ run, onResume }: { run: CreatorResearchRun; onResume: (id: string) => Promise<void> }) {
  const current = run.stages.find((stage) => stage.id === run.currentStage);
  const blocker = run.blockers[0];
  const phases = taskPhases(run);
  const diagnostic = blocker ? null : failureReason(run);
  const completion = completionNotice(run);
  const detailHref = `/creators/${encodeURIComponent(run.canonicalSlug ?? run.creatorId ?? run.id)}`;
  return <article className={`creator-run creator-run--${run.status}`}>
    <div className="creator-run__status">
      <span className={`status status--${run.status}`}><i/>{statusLabels[run.status]}</span>
      <time>{new Date(run.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
    </div>
    <div className="creator-run__main">
      <strong>{run.creatorName ?? "待识别博主"}</strong>
      <a href={run.profileUrl} target="_blank" rel="noreferrer">{run.profileUrl}<ExternalLink size={12}/></a>
      <p><b>{current?.label ?? "等待预检"}</b> · {run.nextAction}</p>
      <small className="creator-run__estimate">{taskEstimateLabel()}</small>
    </div>
    <div className="creator-run__coverage" aria-label="采集覆盖">
      <span><b>{run.coverage.discoveredPosts}</b>发现</span>
      <span><b>{run.coverage.comparisonPosts}</b>对比</span>
      <span><b>{run.coverage.reconstructedPosts}</b>还原</span>
    </div>
    <div className="creator-run__pipeline" aria-label="分析阶段">
      {phases.map((phase) => <span className={`creator-run__stage creator-run__stage--${phase.state}`} key={phase.id} title={`${phase.label}：${phase.detail}`}><b>{phase.label}</b></span>) }
    </div>
    <footer>
      <span><ShieldCheck size={13}/>{run.collectionPolicy.adapter === "redfox" ? "REDFOX · 公开 API · 按次计费" : "hhh-01 · 只读 · 增量 · 不绕过验证"}</span>
      <span>WORKER · {run.worker.state.toUpperCase()} · ATTEMPT {run.worker.attempt}</span>
      {(run.videoWork.activePostExternalIds.length > 0 || run.videoWork.queuedPosts > 0 || run.videoWork.analyzedPosts > 0) &&
        <span>VIDEO · {run.videoWork.activePostExternalIds.length} 执行 · {run.videoWork.queuedPosts} 排队 · {run.videoWork.analyzedPosts} 完成 · {run.videoWork.failedPosts} 失败 · 上限 {run.videoWork.concurrencyLimit}</span>}
      {blocker && <span className={blocker.userActionRequired ? "creator-run__blocker creator-run__blocker--user" : "creator-run__blocker"}>
        <AlertTriangle size={13}/>{blocker.message}
      </span>}
      {run.status === "needs_user" && <span className="creator-run__handoff"><AlertTriangle size={13}/>
        {blocker?.code === "detail_navigation_required"
          ? "详情页被平台重定向：浏览器已停在博主主页。请手动打开任一待采目标帖子，再点“我已完成，继续”。"
          : "验证接管：请在已交接的 ego-browser 页面完成验证；此处不伪造浏览器跳转。"}
      </span>}
      {diagnostic && <span className="creator-run__diagnostic"><AlertTriangle size={13}/>原因：{diagnostic}</span>}
      {completion && <span className="creator-run__completion"><ShieldCheck size={13}/>{completion}</span>}
      {(["needs_user", "backoff", "failed"] as CreatorResearchStatus[]).includes(run.status) &&
        <button type="button" className="creator-run__resume" onClick={() => void onResume(run.id)}>
          <RefreshCw size={12}/>{run.status === "needs_user" ? "我已完成，继续" : "重新排队"}
        </button>}
      <Link to={detailHref}>{run.status === "ready" ? "查看完成研究" : "查看任务详情"}<ArrowRight size={13}/></Link>
    </footer>
  </article>;
}

export default function CreatorsOverview() {
  const [creators, setCreators] = useState<CreatorSummary[] | null>(null);
  const [runs, setRuns] = useState<CreatorResearchRun[] | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [adapter, setAdapter] = useState<CreatorAcquisitionAdapter>("ego-browser");
  const [discovery, setDiscovery] = useState<CreatorDiscoveryResult | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [enqueueingId, setEnqueueingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const existingRun = findExistingCreatorRun(runs, profileUrl, adapter);
  const intakeValidation = profileUrl ? validateCreatorProfileUrl(profileUrl) : null;

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
    const validation = validateCreatorProfileUrl(profileUrl);
    if (!validation.valid) {
      setError(validation.message);
      setCreatedMessage(null);
      return;
    }
    const duplicate = findExistingCreatorRun(runs, profileUrl, adapter);
    if (duplicate) {
      setCreatedMessage(`这条主页链接已有任务（${statusLabels[duplicate.status]}），已保留原任务与证据，不再重复创建。`);
      setError(null);
      return;
    }
    setSubmitting(true);
    setError(null);
    setCreatedMessage(null);
    try {
      const run = await createCreatorResearchRun(profileUrl, adapter);
      setRuns((current) => [run, ...(current ?? []).filter((item) => item.id !== run.id)]);
      setProfileUrl("");
      setCreatedMessage("分析任务已进入同一工作台。采集 Worker 接管后，这里会继续显示覆盖与阻塞状态。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法创建博主分析");
    } finally {
      setSubmitting(false);
    }
  }

  async function runDiscovery() {
    setDiscovering(true);
    setDiscoveryError(null);
    try {
      setDiscovery(await discoverAiCreators());
    } catch (cause) {
      setDiscoveryError(cause instanceof Error ? cause.message : "无法发现 AI 博主");
    } finally {
      setDiscovering(false);
    }
  }

  async function enqueueCandidate(candidate: CreatorDiscoveryResult["candidates"][number]) {
    const duplicate = findExistingCreatorRun(runs, candidate.profileUrl, "redfox");
    if (duplicate) {
      setCreatedMessage(`${candidate.creatorName} 已有红狐研究任务，未重复创建。`);
      return;
    }
    setEnqueueingId(candidate.creatorId);
    setError(null);
    try {
      const run = await createCreatorResearchRun(candidate.profileUrl, "redfox");
      setRuns((current) => [run, ...(current ?? []).filter((item) => item.id !== run.id)]);
      setCreatedMessage(`${candidate.creatorName} 已加入红狐研究队列；后续仍进入同一证据与下载流水线。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法加入研究队列");
    } finally {
      setEnqueueingId(null);
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

      <form className="creator-intake" onSubmit={submit} noValidate>
        <label htmlFor="creator-profile-url"><Link2 size={14}/>小红书博主主页链接</label>
        <div className="provider-rail" role="radiogroup" aria-label="采集 Provider">
          <button type="button" role="radio" aria-checked={adapter === "ego-browser"}
            className={adapter === "ego-browser" ? "is-active" : ""} onClick={() => setAdapter("ego-browser")}>
            <KeyRound size={15}/><span><b>自己的账号</b><small>直接证据 · 可恢复登录态 · 遇验证停下</small></span>
          </button>
          <button type="button" role="radio" aria-checked={adapter === "redfox"}
            className={adapter === "redfox" ? "is-active" : ""} onClick={() => setAdapter("redfox")}>
            <Server size={15}/><span><b>红狐 API</b><small>公开数据 · 批量更快 · 实时接口按次计费</small></span>
          </button>
        </div>
        <div className="input-row">
          <input id="creator-profile-url" type="url" value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)}
            placeholder="https://www.xiaohongshu.com/user/profile/..." autoComplete="url" required/>
          <button className="primary-button" type="submit" disabled={submitting || Boolean(profileUrl && intakeValidation && !intakeValidation.valid)}>
            {submitting ? <LoaderCircle className="spin" size={16}/> : <ArrowRight size={16}/>}
            {submitting ? "正在建立任务" : "开始分析博主"}
          </button>
        </div>
        <div className="creator-intake__policy">
          <span><ShieldCheck size={13}/>{adapter === "ego-browser"
            ? "使用 hhh-01 登录态；遇验证立即停下请你接管"
            : "密钥仅留在服务端；不会回传浏览器或写入研究制品"}</span>
          <span><Database size={13}/>优先缓存与增量刷新，避免重复访问</span>
        </div>
        {profileUrl && intakeValidation && !intakeValidation.valid && <p className="form-error" role="alert"><AlertTriangle size={14}/>{intakeValidation.message}</p>}
        {existingRun && <p className="creator-intake__existing"><Database size={14}/>这个已提交链接已有任务：<b>{statusLabels[existingRun.status]}</b><Link to={`/creators/${encodeURIComponent(existingRun.canonicalSlug ?? existingRun.creatorId ?? existingRun.id)}`}>查看原任务</Link></p>}
        {createdMessage && <p className="form-success" aria-live="polite">{createdMessage}</p>}
        {error && <p className="form-error" role="alert"><AlertTriangle size={14}/>{error}</p>}
      </form>

      <section className="creator-discovery" aria-labelledby="creator-discovery-title">
        <header>
          <div><span>REDFOX DISCOVERY RADAR</span><h2 id="creator-discovery-title">发现更多 AI 博主</h2>
            <p>搜索只建立候选池；点击加入后才创建研究、选样和媒体下载任务。</p></div>
          <button type="button" onClick={() => void runDiscovery()} disabled={discovering}>
            {discovering ? <LoaderCircle className="spin" size={15}/> : <Radar size={15}/>}
            {discovering ? "正在扫描" : discovery ? "重新扫描" : "扫描 AI 赛道"}
          </button>
        </header>
        {discoveryError && <p className="form-error" role="alert"><AlertTriangle size={14}/>{discoveryError}</p>}
        {discovery && <>
          <div className="creator-discovery__ledger">
            <span>{discovery.keywords.join(" / ")}</span>
            <b>{discovery.requestsUsed} 次请求</b><b>估算 ¥{discovery.estimatedCostCny.toFixed(2)}</b>
            <time>{new Date(discovery.capturedAt).toLocaleString("zh-CN")}</time>
          </div>
          <div className="creator-candidate-list">
            {discovery.candidates.map((candidate, index) => {
              const duplicate = findExistingCreatorRun(runs, candidate.profileUrl, "redfox");
              return <article key={candidate.creatorId}>
                <span className="creator-candidate__rank">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{candidate.creatorName}</h3><p>{candidate.matchedKeywords.join(" · ")}</p>
                  <small>{candidate.observedNotes} 篇搜索样本 · {candidate.videoNotes} 篇视频 · {candidate.observedLikes.toLocaleString("zh-CN")} 赞</small></div>
                <strong>{candidate.score.toFixed(1)}<small>证据分</small></strong>
                <nav><a href={candidate.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/>主页</a>
                  <button type="button" disabled={Boolean(duplicate) || enqueueingId === candidate.creatorId}
                    onClick={() => void enqueueCandidate(candidate)}>
                    {enqueueingId === candidate.creatorId ? <LoaderCircle className="spin" size={13}/> : duplicate ? <ShieldCheck size={13}/> : <Plus size={13}/>}
                    {duplicate ? "已在队列" : "加入研究"}
                  </button></nav>
              </article>;
            })}
          </div>
          <p className="creator-discovery__boundary"><AlertTriangle size={14}/>{discovery.limitations[0]}</p>
        </>}
      </section>

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

      {creators && creators.length > 0 && <Link to="/comparisons" className="benchmark-banner">
        <span>进入跨 IP 对比台</span>
        <b>规律可信度：赛道规律 / IP 能力 / 定位空缺</b>
        <ArrowRight size={16}/>
      </Link>}
    </section>
  </main>;
}
