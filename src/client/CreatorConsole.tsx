import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CircleAlert, ExternalLink, LoaderCircle } from "lucide-react";
import { getCreatorConsole } from "./api";
import type { CreatorConsole as CreatorConsoleData } from "../shared/schema";

const sections = [
  { id: "worth", index: "01", label: "值不值得学" },
  { id: "tiers", index: "02", label: "什么好·什么不好" },
  { id: "evidence", index: "03", label: "为什么好" },
  { id: "map", index: "04", label: "内容地图" },
  { id: "library", index: "05", label: "内容库" },
  { id: "rhythm", index: "06", label: "发布节奏" },
  { id: "position", index: "07", label: "赛道位置" },
  { id: "decision", index: "08", label: "我的内容决策" },
  { id: "limits", index: "09", label: "方法边界" }
];

function Missing({ reason }: { reason: string }) {
  return <div className="console-missing"><CircleAlert size={15}/><span>未覆盖</span><p>{reason}</p></div>;
}

function Distribution({ data }: { data: CreatorConsoleData["baseline"] }) {
  if (!data) return null;
  const max = Math.max(1, ...data.distribution.map((bucket) => bucket.count));
  return <div className="dist-row">
    {data.distribution.map((bucket) => <div key={bucket.label} className="dist-bar">
      <b>{bucket.count}</b>
      <i style={{ height: `${(bucket.count / max) * 100}%` }}/>
      <span>{bucket.label}</span>
    </div>)}
  </div>;
}

function TierSection({ data }: { data: CreatorConsoleData }) {
  return <section id="tiers" className="console-section">
    <header className="console-section__head">
      <span className="console-section__index">"02"</span>
      <div><h2>什么好、什么不好</h2><p>被认可 / 一般喜欢 / 不认可，逐档读出规律——这是归纳决策循环的第 ①③ 步。</p></div>
    </header>
    {data.tiers.length === 0 ? <Missing reason="分档数据未生成。"/> : <div className="tier-stack">
      {data.tiers.map((tier) => <article key={tier.id} className={`tier-card tier-card--${tier.id}`}>
        <header>
          <div><b>{tier.name}</b><span>{tier.videos.length} 条</span></div>
          <p>{tier.conclusion}</p>
        </header>
        {tier.videos.length > 0 && <ul className="tier-videos">
          {tier.videos.slice(0, 3).map((video) => <li key={video.id} className={video.selected ? "is-selected" : ""}>
            <Link to={`/creators/${data.meta.id}/videos/${video.id}`} className="tier-video">
              <span className="tier-video__likes">{video.likes.toLocaleString()}</span>
              <span className="tier-video__title">{video.title}</span>
              <span className="tier-video__meta">{video.archetype ?? video.publishedLabel ?? ""}{video.selected ? " · 证据级还原" : ""}</span>
              <ArrowRight size={14}/>
            </Link>
          </li>)}
          {tier.videos.length > 3 && <li>
            <details className="tier-more">
              <summary>查看全部 {tier.videos.length} 条</summary>
              <ul className="tier-videos tier-videos--nested">
                {tier.videos.slice(3).map((video) => <li key={video.id} className={video.selected ? "is-selected" : ""}>
                  <Link to={`/creators/${data.meta.id}/videos/${video.id}`} className="tier-video">
                    <span className="tier-video__likes">{video.likes.toLocaleString()}</span>
                    <span className="tier-video__title">{video.title}</span>
                    <span className="tier-video__meta">{video.archetype ?? video.publishedLabel ?? ""}{video.selected ? " · 证据级还原" : ""}</span>
                    <ArrowRight size={14}/>
                  </Link>
                </li>)}
              </ul>
            </details>
          </li>}
        </ul>}
      </article>)}
    </div>}
  </section>;
}

function ContentMap({ data }: { data: CreatorConsoleData }) {
  return <section id="map" className="console-section">
    <header className="console-section__head">
      <span className="console-section__index">"04"</span>
      <div><h2>内容地图 · {data.contentMap.slotName}</h2><p>分类打标签是循环的第 ② 步：每一类读出的规律，就是可复制/该避开的清单。</p></div>
    </header>
    <div className="map-grid">
      {data.contentMap.items.map((item) => <article key={item.name} className="map-card">
        <h3>{item.name}</h3>
        {item.signal && <p className="map-card__signal">{item.signal}</p>}
        {item.mechanism && <p className="map-card__text">{item.mechanism}</p>}
        {item.decision && <p className="map-card__decision"><Check size={13}/>{item.decision}</p>}
      </article>)}
    </div>
  </section>;
}

function Rhythm({ data }: { data: CreatorConsoleData }) {
  if (!data.rhythm) {
    return <details id="rhythm" className="console-section">
      <summary>
        <header className="console-section__head">
          <span className="console-section__index">"06"</span>
          <div><h2>发布节奏与画面</h2></div>
        </header>
      </summary>
      <div className="console-section__inner">
        <Missing reason={data.rhythmHealth?.reason ?? "发布节奏数据缺失"}/>
      </div>
    </details>;
  }
  return <details id="rhythm" className="console-section">
    <summary>
      <header className="console-section__head">
        <span className="console-section__index">"06"</span>
        <div><h2>发布节奏与画面</h2></div>
      </header>
    </summary>
    <div className="console-section__inner">
      <p className="console-lead">{data.rhythm?.conclusion}</p>
      {data.rhythm && <div className="rhythm-grid">
        <div className="rhythm-column">
          <h3>星期</h3>
          {data.rhythm.weekdays.map((day) => <div key={day.name} className="rhythm-row">
            <span>{day.name}</span><b>{day.count}</b><small>中位 {day.medianLikes?.toLocaleString() ?? "—"}</small>
          </div>)}
        </div>
        <div className="rhythm-column">
          <h3>时段</h3>
          {data.rhythm.dayparts.map((part) => <div key={part.name} className="rhythm-row">
            <span>{part.name}</span><b>{part.count}</b><small>中位 {part.medianLikes?.toLocaleString() ?? "—"}</small>
          </div>)}
        </div>
      </div>}
    </div>
  </details>;
}

function Launch({ data }: { data: CreatorConsoleData }) {
  if (!data.launch) {
    return <section id="decision" className="console-section">
      <header className="console-section__head">
        <span className="console-section__index">"08"</span>
        <div><h2>我的内容决策</h2></div>
      </header>
      {data.launchLink
        ? <a className="console-link-card" href={data.launchLink.href}><ExternalLink size={15}/>{data.launchLink.label}</a>
        : <Missing reason="起号方案未生成。"/>}
    </section>;
  }
  return <section id="decision" className="console-section console-section--dark">
    <header className="console-section__head">
      <span className="console-section__index">"08"</span>
      <div><h2>我的内容决策 · 我们明天怎么开始</h2></div>
    </header>
    <p className="console-lead">{data.launch.summary}</p>
    <div className="launch-grid">
      <div className="launch-column">
        <h3>引擎取舍</h3>
        {data.launch.engines.map((engine) => <div key={engine.name} className="launch-row">
          <b>{engine.name}</b><span>{engine.decision}</span>
        </div>)}
      </div>
      <div className="launch-column">
        <h3>可复制系统</h3>
        {data.launch.steps.map((step, index) => <div key={step.name} className="launch-step">
          <span className="step-no">{String(index + 1).padStart(2, "0")}</span>
          <div><b>{step.name}</b><p>{step.rule}</p></div>
        </div>)}
      </div>
    </div>
    <Link to="/benchmark" className="launch-cta">制定我的内容组合 <ArrowRight size={15}/></Link>
  </section>;
}

export default function CreatorConsolePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CreatorConsoleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getCreatorConsole(id).then(setData).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取博主研究台");
    });
  }, [id]);
  return <main className="console">
    {error ? <div className="page-error"><CircleAlert/><h1>研究台读取失败</h1><p>{error}</p></div>
      : !data ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在汇总研究证据</p></div>
        : <>
          <aside className="console-rail">
            <div className="console-rail__head"><span>RESEARCH CONSOLE</span><b>{data.meta.id === "ai-red-witch" ? "IP 01" : "IP 02"}</b></div>
            <nav aria-label="研究台导航">
              {sections.map((section) => <a key={section.id} href={`#${section.id}`}>
                <span>{section.index}</span>{section.label}
              </a>)}
            </nav>
            <div className="console-rail__foot">
              <Link to="/creators"><ArrowLeft size={13}/> 返回总览</Link>
              <Link to="/benchmark">对比台 <ArrowRight size={13}/></Link>
            </div>
          </aside>
          <article className="console-main">
            <nav className="breadcrumb">
              <Link to="/creators">博主总览</Link><span>/</span><b>{data.meta.name}</b>
            </nav>
            <header id="worth" className="console-hero">
              <div>
                <p className="eyebrow"><span>CREATOR RESEARCH · {data.meta.id}</span><span>{data.meta.capturedAt ? `采集于 ${data.meta.capturedAt.slice(0, 10)}` : "采集时间未记录"}</span></p>
                <h1>{data.meta.name}</h1>
                <p className="console-hero__position">{data.meta.positioning}</p>
              </div>
              <div className="console-hero__facts">
                <div><b>{data.meta.followers}</b><span>粉丝</span></div>
                <div><b>{data.meta.likesAndCollections}</b><span>赞藏</span></div>
                <a href={data.meta.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> 原主页</a>
              </div>
            </header>
            {data.baseline && <section className="console-section">
              <header className="console-section__head">
                <span className="console-section__index">"01"</span>
                <div><h2>值不值得学：先看基本盘</h2><p>中位数代表常态，平均值揭示长尾拉动，最高值标记上限。</p></div>
              </header>
              <div className="metric-band">
                <div><b>{data.baseline.medianLikes.toLocaleString()}</b><span>互动中位数</span></div>
                <div><b>{data.baseline.meanLikes.toLocaleString()}</b><span>平均值</span></div>
                <div><b>{data.baseline.maxLikes.toLocaleString()}</b><span>最高点赞</span></div>
                <div><b>{data.baseline.postCount}</b><span>样本条数</span></div>
              </div>
              <Distribution data={data.baseline}/>
              {data.baseline.averageNote && <p className="console-note"><CircleAlert size={14}/>{data.baseline.averageNote}</p>}
            </section>}
            {!data.baseline && <section className="console-section">
              <header className="console-section__head"><span className="console-section__index">"01"</span><div><h2>基本盘</h2></div></header>
              <Missing reason={data.baselineHealth?.reason ?? "基本盘数据缺失"}/>
            </section>}
            <TierSection data={data}/>
            <details id="evidence" className="console-section">
              <summary>
                <header className="console-section__head">
                  <span className="console-section__index">"03"</span>
                  <div><h2>为什么好：证据级还原</h2><p>深度分析是价值引擎——每条"为什么好"都能下钻到真实帧、文字稿与时间码。</p></div>
                </header>
              </summary>
              <div className="console-section__inner">
                <div className="evidence-links">
                  {data.evidenceLinks.map((link) => <a key={link.href} className="console-link-card" href={link.href}>
                    <span>{link.label}</span><b>{link.count} 条</b><ArrowRight size={15}/>
                  </a>)}
                </div>
              </div>
            </details>
            <ContentMap data={data}/>
            <details id="library" className="console-section">
              <summary>
                <header className="console-section__head">
                  <span className="console-section__index">"05"</span>
                  <div><h2>内容库</h2><p>全部样本按档排列；点击任一条进入视频证据页。</p></div>
                </header>
              </summary>
              <div className="console-section__inner">
                <div className="library-list">
                  {data.tiers.flatMap((tier) => tier.videos).map((video) => <Link key={video.id} to={`/creators/${data.meta.id}/videos/${video.id}`} className="library-row">
                    <span className="library-row__likes">{video.likes.toLocaleString()}</span>
                    <span className="library-row__title">{video.title}</span>
                    <span className="library-row__meta">{video.archetype ?? video.publishedLabel ?? ""}</span>
                    <ArrowRight size={13}/>
                  </Link>)}
                </div>
              </div>
            </details>
            <Rhythm data={data}/>
            <details id="position" className="console-section">
              <summary>
                <header className="console-section__head">
                  <span className="console-section__index">"07"</span>
                  <div><h2>赛道位置</h2><p>单 IP 只能看到"他这么做有效"；跨 IP 对比才能知道"这么做在 AI 赛道有效"。</p></div>
                </header>
              </summary>
              <div className="console-section__inner">
                <Link className="console-link-card console-link-card--action" to="/benchmark">
                  <span>进入跨 IP 对比台</span><b>规律可信度：赛道规律 / IP 能力 / 定位空缺</b><ArrowRight size={15}/>
                </Link>
              </div>
            </details>
            <Launch data={data}/>
            <section id="limits" className="console-section">
              <header className="console-section__head">
                <span className="console-section__index">"09"</span>
                <div><h2>方法边界</h2><p>知道什么、推断什么、不知道什么，必须分开写。</p></div>
              </header>
              <div className="boundary-list">
                {data.boundaries.map((boundary) => <p key={boundary.slice(0, 24)}>{boundary}</p>)}
              </div>
              <button className="text-button" onClick={() => navigate("/creators")}><ArrowLeft size={14}/> 返回总览</button>
            </section>
          </article>
        </>}
  </main>;
}
