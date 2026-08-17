import { useMemo, useState } from 'react'
import { ArrowUpRight, BookOpen, CheckCircle2, Search, ShieldAlert, Sparkles, X } from 'lucide-react'
import metadata from './generated-metadata.json'
import { launchBlueprint, strategicFindings, tierEditorial, tierLabels, videoModes, type Tier } from './editorial'

type Unit = { id: string; title: string; statement: string; provenance: string; confidence: string; timeRange?: { start: number; end: number } }
type Video = {
  id: string; title: string; tier: Tier; featured: boolean; duration: number; publishedLocal: string; cutsPerMinute: number; cuesPerMinute: number; ready: boolean; reportPath: string | null
  engagement: { likes: number; collections: number; comments: number; shares: number; collectionToLike: number; shareToLike: number }
  frames: { id: string; time: number; src: string }[]
  denseFrames: { id: string; time: number; src: string }[]
  content: {
    viewerChange: { before?: string; after?: string }
    coreUnits: Unit[]
    transcript: { id: string; start: number; end: number; text: string; overlappingShots: string[]; frame: string | null }[]
    unknowns: string[]
  }
}

const allVideos = metadata.videos as Video[]
const videos = allVideos.filter((video) => video.featured)
const tiers: Tier[] = ['high', 'median', 'low']
const fmt = (value: number) => new Intl.NumberFormat('zh-CN', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
const dur = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}` : `${Math.round(seconds)}s`
const tc = (seconds?: number) => seconds === undefined ? '' : `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
const provenance: Record<string, string> = { raw_fact: '原始事实', visual_observation: '画面观察', author_claim: '作者主张', system_inference: '系统推断', unknown: '未知' }

function TierPill({ tier }: { tier: Tier }) { return <span className={`tier-pill tier-${tier}`}>{tierLabels[tier]}</span> }

function Scatter({ select }: { select: (video: Video) => void }) {
  const width = 760, height = 330, left = 48, right = 24, top = 24, bottom = 42
  const x = (value: number) => left + Math.min(value, 230) / 230 * (width - left - right)
  const y = (value: number) => top + (1 - (Math.log10(Math.max(value, 10)) - 1) / 4) * (height - top - bottom)
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="时长与点赞散点图">
    {[1, 2, 3, 4, 5].map((log) => <g key={log}><line className="grid-line" x1={left} x2={width - right} y1={y(10 ** log)} y2={y(10 ** log)} /><text className="axis-label" x={left - 10} y={y(10 ** log) + 4} textAnchor="end">{log === 5 ? '10万' : log === 4 ? '1万' : log === 3 ? '1千' : log === 2 ? '100' : '10'}</text></g>)}
    {[0, 30, 60, 120, 180, 225].map((tick) => <g key={tick}><line className="tick-line" x1={x(tick)} x2={x(tick)} y1={top} y2={height - bottom} /><text className="axis-label" x={x(tick)} y={height - 14} textAnchor="middle">{tick}s</text></g>)}
    {videos.map((video) => <g key={video.id} className="plot-point" onClick={() => select(video)}><circle className={`dot dot-${video.tier}`} cx={x(video.duration)} cy={y(video.engagement.likes)} r={video.tier === 'high' ? 7 : 5.5} /><title>{video.title}｜{dur(video.duration)}｜{fmt(video.engagement.likes)}赞</title></g>)}
  </svg><div className="chart-caption"><span>横轴：时长</span><span>纵轴：点赞（对数）</span><span>点击圆点查看详情</span></div></div>
}

function Detail({ video, close }: { video: Video; close: () => void }) {
  const mode = videoModes[video.id]
  const [frameMode, setFrameMode] = useState<'sparse' | 'dense'>('sparse')
  const visibleFrames = frameMode === 'sparse' ? video.frames : video.denseFrames
  return <div className="detail-backdrop" onMouseDown={close}><aside className="detail-panel" onMouseDown={(event) => event.stopPropagation()}>
    <button className="close-button" onClick={close}><X size={20} /></button>
    <div className="detail-heading"><TierPill tier={video.tier} /><span className="eyebrow">{mode.mode} · {dur(video.duration)}</span><span className={`audit-status ${video.ready ? 'ready' : 'pending'}`}>{video.ready ? '证据硬闸通过' : '复核收口中'}</span><h2>{video.title}</h2><p>{mode.hook}。核心价值：{mode.value}。</p></div>
    <div className="frame-mode"><span>画面浏览</span><div><button className={frameMode === 'sparse' ? 'active' : ''} onClick={() => setFrameMode('sparse')}>稀疏 3 帧</button><button className={frameMode === 'dense' ? 'active' : ''} onClick={() => setFrameMode('dense')}>密集 {video.denseFrames.length} 帧</button></div></div>
    <div className={`frame-strip ${frameMode === 'dense' ? 'dense' : ''}`}>{visibleFrames.map((frame) => <figure key={frame.id}><img src={frame.src} alt="代表帧" /><figcaption>{tc(frame.time)}</figcaption></figure>)}</div>
    <div className="metric-row compact"><div><strong>{fmt(video.engagement.likes)}</strong><span>点赞</span></div><div><strong>{fmt(video.engagement.collections)}</strong><span>收藏</span></div><div><strong>{fmt(video.engagement.shares)}</strong><span>分享</span></div><div><strong>{video.cutsPerMinute}</strong><span>切换/分钟</span></div></div>
    <section className="detail-section cognitive"><span className="section-kicker">观众认知变化</span><p><b>看前：</b>{video.content.viewerChange?.before ?? '未单独表述'}</p><p><b>看后：</b>{video.content.viewerChange?.after ?? '未单独表述'}</p></section>
    <section className="detail-section"><div className="section-title-row"><h3>核心内容还原</h3><span>{video.content.coreUnits.length} 个核心单元</span></div><div className="unit-list">{video.content.coreUnits.map((unit) => <article className="unit" key={unit.id}><div><span className={`provenance p-${unit.provenance}`}>{provenance[unit.provenance] ?? unit.provenance}</span>{unit.timeRange && <time>{tc(unit.timeRange.start)}–{tc(unit.timeRange.end)}</time>}</div><h4>{unit.title}</h4><p>{unit.statement}</p></article>)}</div></section>
    <section className="detail-section"><div className="section-title-row"><h3>完整文字稿 × 对应画面</h3><span>{video.content.transcript.length} 条 cue</span></div><div className="transcript-list">{video.content.transcript.map((cue) => <article className="transcript-cue" key={cue.id}>{cue.frame ? <img loading="lazy" src={cue.frame} alt={`${cue.id} 对应画面`} /> : <div className="frame-missing">无代表帧</div>}<div><div className="cue-meta"><time>{tc(cue.start)}–{tc(cue.end)}</time><span>{cue.overlappingShots.join(' · ')}</span></div><p>{cue.text}</p></div></article>)}</div></section>
    <section className="detail-section unknown-box"><div className="section-title-row"><h3>不能从视频得出的结论</h3><ShieldAlert size={18} /></div><ul>{video.content.unknowns.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
    <section className="detail-section evidence-legend"><h3>证据层如何读</h3><p><span className="provenance p-raw_fact">原始事实</span> 直接存在；<span className="provenance p-visual_observation">画面观察</span> 仅描述看见的状态；<span className="provenance p-author_claim">作者主张</span> 不自动等于事实；<span className="provenance p-system_inference">系统推断</span> 必须有推理链。</p></section>
    {video.reportPath && <a className="report-link" href={video.reportPath} target="_blank">打开完整文字稿与证据报告 <ArrowUpRight size={16} /></a>}
  </aside></div>
}

export default function App() {
  const [tier, setTier] = useState<'all' | Tier>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Video | null>(null)
  const filtered = useMemo(() => videos.filter((video) => (tier === 'all' || video.tier === tier) && `${video.title} ${videoModes[video.id].mode} ${videoModes[video.id].hook}`.toLowerCase().includes(query.toLowerCase())), [tier, query])

  return <main>
    <header className="topbar"><a className="brand" href="#top"><span>RW</span><div>AI 红发魔女<small>内容研究台 · 9 条重点深拆</small></div></a><nav><a href="#findings">核心结论</a><a href="#comparison">三档对照</a><a href="#library">逐条重建</a><a href="#launch">起号策略</a></nav><span className="snapshot">21 条数据底库 · {metadata.sourceGeneratedAt?.slice(0, 10)}</span></header>

    <section className="hero-section" id="top"><div className="hero-copy"><span className="eyebrow">Creator intelligence / evidence first</span><h1>不是找一个“爆款公式”，<br />而是拆开<strong>三种流量机制</strong>。</h1><p>高、中、低各选择 3 条重点深拆；21 条公开样本只用于建立数据背景。重点视频经过探针、字幕、密集帧、OCR、关系还原和独立审计，严格区分画面事实、作者主张、系统推断与未知。</p><div className="hero-actions"><a className="primary-button" href="#findings">先看结论</a><a className="text-link" href="#library">浏览 9 条重点重建 <ArrowUpRight size={16} /></a></div></div><div className="hero-proof"><div className="proof-index">01</div><p>当前样本能回答</p><ul><li>高/中/低内容形式有什么关联差异</li><li>这个博主在给谁提供什么价值</li><li>哪些结构值得复制，哪些只是强宣称</li><li>下一步起号应该测试什么</li></ul><div className="boundary">不能回答：真实曝光、点击率、留存、涨粉、投流与平台分发。</div></div></section>

    <section className="metric-row overview-metrics"><div><strong>9</strong><span>重点深拆视频</span><small>每档 3 条 · 21 条数据底库</small></div><div><strong>31K</strong><span>高表现点赞中位数</span><small>中位 320 · 低位 27</small></div><div><strong>5/7</strong><span>高表现少于 30 秒</span><small>来自 21 条数据底库</small></div><div><strong>无</strong><span>稳定黄金发布时间</span><small>三个档位时段高度重叠</small></div></section>

    <section className="section" id="findings"><div className="section-heading"><span>01 / 关键判断</span><h2>先把“为什么火”拆成不同的用户动作</h2><p>这是样本内关联，不是平台因果定律。</p></div><div className="finding-grid">{strategicFindings.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>

    <section className="section chart-section"><div className="section-heading compact-heading"><span>02 / 九条重点</span><h2>时长不是单独答案，结构与时长是否匹配更重要</h2><p>散点只显示每档 3 条重点视频；三档中位数和比例仍由 21 条数据底库计算。高表现呈两极：短而密的工具内容，或有足够叙事承载的长视频。</p></div><Scatter select={setSelected} /></section>

    <section className="section" id="comparison"><div className="section-heading"><span>03 / 三档内容对照</span><h2>同一个博主，三档内容在“理解成本”上分叉</h2></div><div className="tier-grid">{tiers.map((name) => { const data = metadata.tiers[name]; const edit = tierEditorial[name]; return <article className={`tier-card tier-card-${name}`} key={name}><div className="tier-card-head"><TierPill tier={name} /><strong>{fmt(data.medianLikes)}</strong><span>点赞中位数</span></div><h3>{edit.headline}</h3><p>{edit.description}</p><dl><div><dt>时长中位数</dt><dd>{data.medianDuration}s</dd></div><div><dt>切换/分钟</dt><dd>{data.medianCutsPerMinute}</dd></div><div><dt>收藏/赞中位</dt><dd>{data.medianCollectionToLike}</dd></div><div><dt>少于30秒</dt><dd>{data.under30Seconds}/7</dd></div></dl><ul>{edit.pattern.map((line) => <li key={line}>{line}</li>)}</ul><div className="caution"><ShieldAlert size={16} />{edit.caution}</div></article> })}</div></section>

    <section className="section format-section"><div className="section-heading compact-heading"><span>04 / 博主定位</span><h2>她卖的不是 AI 新闻，而是“把能力翻译成可见结果”</h2></div><div className="positioning-grid"><article className="positioning-main"><span>核心定位</span><h3>AI 产品侦察员 × 效果魔术师 × 效率翻译者</h3><p>面向对 AI 好奇、但不想读技术文档的创作者与职场人。她把新工具压缩成“能做什么、长什么样、我能不能马上用”的消费决策。</p></article><article><Sparkles /><h3>画面语法</h3><p>9:16 竖屏；真人直视镜头或圆形画中画；屏幕录制与结果样片交替；大号字幕/彩色步骤标签承担导航。</p></article><article><BookOpen /><h3>内容语法</h3><p>痛点或大结果先行，工具名后置；工具地图用“一卡一能力”，教程用“输入—界面—结果”，梗内容用开尾回环。</p></article><article><ShieldAlert /><h3>可信度债务</h3><p>高频使用“一键、任何、无限、免费、几分钟”等绝对化词。流量可能被放大，但复刻时必须加条件、失败例与真实操作桥接。</p></article></div></section>

    <section className="section" id="library"><div className="section-heading library-heading"><div><span>05 / 逐条视频重建</span><h2>9 条重点内容：从结论回到帧、字幕和未知</h2></div><p>每档 3 条，覆盖不同的高表现机制与低表现失效方式。点击查看完整逐字稿及对应画面。</p></div><div className="library-controls"><div className="tier-tabs"><button className={tier === 'all' ? 'active' : ''} onClick={() => setTier('all')}>全部 9</button>{tiers.map((name) => <button key={name} className={tier === name ? 'active' : ''} onClick={() => setTier(name)}>{tierLabels[name]} 3</button>)}</div><label className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、形式或钩子" /></label></div><div className="video-table"><div className="video-row table-head"><span>档位 / 内容</span><span>形式</span><span>发布</span><span>时长</span><span>点赞</span><span>收藏/赞</span><span>切换/分</span><span /></div>{filtered.map((video) => { const mode = videoModes[video.id]; return <button className="video-row" key={video.id} onClick={() => setSelected(video)}><span className="video-title"><TierPill tier={video.tier} /><b>{video.title}</b><small>{mode.hook}</small></span><span>{mode.mode}</span><span>{video.publishedLocal}</span><span>{dur(video.duration)}</span><span className="metric-strong">{fmt(video.engagement.likes)}</span><span>{video.engagement.collectionToLike.toFixed(3)}</span><span>{video.cutsPerMinute}</span><span><ArrowUpRight size={16} /></span></button> })}</div></section>

    <section className="section" id="launch"><div className="section-heading"><span>06 / 起号策略</span><h2>不要复制“红发魔女”，复制她的价值翻译能力</h2><p>用三条内容车道同时验证收藏、传播与信任，不用一套脚本承担所有目标。</p></div><div className="blueprint-grid">{launchBlueprint.map((item) => <article key={item.lane}><span className="lane">{item.lane}</span><h3>{item.format}</h3><dl><div><dt>频率</dt><dd>{item.cadence}</dd></div><div><dt>脚本</dt><dd>{item.script}</dd></div><div><dt>复盘</dt><dd>{item.metric}</dd></div></dl></article>)}</div><div className="experiment-box"><div><CheckCircle2 /><h3>第一轮 4 周实验</h3></div><p>每条只改变一个主变量：钩子、内容长度、证据呈现或 CTA。补录后台曝光、点击率、3 秒/30 秒留存、完播、主页访问、关注和目标动作。发布时间采用轮换，不在当前样本上预设黄金小时。</p></div></section>

    <section className="method-note"><BookOpen size={20} /><div><h3>方法与边界</h3><p>页面重点展示高、中、低各 3 条；三档数据比较来自 21 条公开样本底库。重点视频经过认知/载体/关系探针与专属捕捉协议，核对字幕、代表帧、重叠镜头、OCR、UI、操作和输入输出。样本量小且年份不平衡，所有“为什么火”均以关联假设表达。</p></div></section>
    <footer><span>AI 红发魔女 · content reconstruction v1</span><span>公开数据不是后台真相 · 证据层不等于增长因果</span></footer>
    {selected && <Detail video={selected} close={() => setSelected(null)} />}
  </main>
}
