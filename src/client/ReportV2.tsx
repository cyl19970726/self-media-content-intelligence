import {
  AlertTriangle, ArrowRight, AudioLines, BarChart3, CheckCircle2, ChevronDown, CircleHelp,
  Database, FlaskConical, Layers3, LockKeyhole, MessageSquareText, ScanSearch, Split, Target, Users
} from "lucide-react";
import { useState } from "react";
import type { ReportEnvelope } from "../shared/schema";

function compact(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function percentile(value: number | null) {
  return value === null ? "—" : `P${Math.round(value)}`;
}

function decimal(value: number | null, suffix = "") {
  return value === null ? "—" : `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

function indicatorValue(value: number | null, unit: "percent" | "multiple" | "per-thousand" | "per-day") {
  if (value === null) return "—";
  if (unit === "percent") return decimal(value, "%");
  if (unit === "multiple") return decimal(value, "×");
  if (unit === "per-thousand") return decimal(value, "‰");
  return `${compact(value)}/天`;
}

function evidenceLabel(ref: string) {
  if (ref === "source.title") return "标题原文";
  if (ref === "source.tags") return "内容标签";
  if (ref === "source.text") return "帖子正文";
  if (ref.startsWith("source.text.sentence.")) return `正文第 ${Number(ref.split(".").at(-1) ?? 0) + 1} 段`;
  if (ref.startsWith("source.comments.")) return `评论 ${ref.split(".").at(-1)}`;
  if (ref.startsWith("benchmark.metrics.")) {
    const key = ref.split(".").at(-1);
    return `${({likes:"点赞", comments:"评论", shares:"分享", bookmarks:"收藏", quotes:"引用", views:"浏览"} as Record<string,string>)[key ?? ""] ?? key}基线`;
  }
  if (ref.startsWith("mediaBreakdown.shots")) return "镜头边界";
  if (ref.startsWith("mediaBreakdown.cutsPerMinute")) return "切换密度";
  if (ref.startsWith("mediaBreakdown.transcript.")) return `逐字稿 ${Number(ref.split(".").at(-1) ?? 0) + 1}`;
  return ref;
}

function SectionHeading({ index, title, english }: { index: string; title: string; english: string }) {
  return <div className="section-index"><span>{index}</span><h2>{title}</h2><p>{english}</p></div>;
}

function EvidenceCoverage({ report }: { report: ReportEnvelope }) {
  return <section className="evidence-header">
    <div className="evidence-score">
      <span>EVIDENCE COVERAGE</span>
      <strong>{report.evidenceCoverage.percent}<small>%</small></strong>
      <div><i style={{ width: `${report.evidenceCoverage.percent}%` }}/></div>
    </div>
    <div className="evidence-tiers">
      {report.evidenceCoverage.tiers.map((tier) => <article key={tier.id} className={`evidence-tier evidence-tier--${tier.status}`}>
        {tier.status === "ready" ? <CheckCircle2 size={17}/> : tier.status === "partial" ? <AlertTriangle size={17}/> : <CircleHelp size={17}/>}
        <div><strong>{tier.label}</strong><p>{tier.note}</p></div>
        <span>{tier.status === "ready" ? "已取得" : tier.status === "partial" ? "部分" : "缺失"}</span>
      </article>)}
    </div>
  </section>;
}

const qualityLabels = { strong: "强", mixed: "混合", weak: "弱", unknown: "未知" } as const;

function TrafficQualityWorkbench({ report }: { report: ReportEnvelope }) {
  const quality = report.trafficQuality;
  const [objective, setObjective] = useState(quality.defaultObjective);
  const profile = quality.objectiveProfiles.find((item) => item.id === objective) ?? quality.objectiveProfiles[0];
  const dimension = (id: ReportEnvelope["trafficQuality"]["dimensions"][number]["id"]) => quality.dimensions.find((item) => item.id === id);
  const chain = ["source", "scale", "retention", "depth", "conversion"] as const;
  const secondary = ["fit", "durability", "negative"] as const;
  const missing = Array.from(new Set((profile?.requiredDimensions ?? []).flatMap((id) => dimension(id)?.missing ?? [])));
  return <section className="quality-workbench" aria-label="流量质量诊断">
    <header className="quality-head">
      <div><span>TRAFFIC QUALITY / NO COMPOSITE SCORE</span><h2>{quality.verdict}</h2></div>
      <nav aria-label="选择运营目标">{quality.objectiveProfiles.map((item) => <button key={item.id} type="button"
        className={item.id === objective ? "active" : ""} onClick={() => setObjective(item.id)}>{item.label}</button>)}</nav>
    </header>
    <div className="objective-verdict"><Target size={19}/><div><span>当前目标</span><strong>{profile?.verdict ?? "等待质量诊断"}</strong></div></div>
    <div className="quality-chain" aria-label="流量质量链路">
      {chain.map((id, index) => {
        const item = dimension(id);
        return <div className="quality-chain-step" key={id}>
          <article className={`quality-node quality-node--${item?.status ?? "unknown"}`}>
            <span>{String(index + 1).padStart(2, "0")}</span><small>{item?.label ?? id}</small>
            <strong>{qualityLabels[item?.status ?? "unknown"]}</strong><p>{item?.summary ?? "缺少数据"}</p>
          </article>{index < chain.length - 1 && <ArrowRight size={18}/>} 
        </div>;
      })}
    </div>
    <div className="quality-secondary">{secondary.map((id) => { const item = dimension(id); return <article key={id} className={`quality-chip quality-chip--${item?.status ?? "unknown"}`}>
      <span>{item?.label}</span><strong>{qualityLabels[item?.status ?? "unknown"]}</strong><p>{item?.summary}</p></article>; })}</div>
    <div className="quality-lower">
      <div className="ratio-panel"><h3>归一化质量信号 <small>本条 / 作者中位 / 题材中位</small></h3>
        {quality.ratioBenchmarks.map((metric) => <article key={metric.id} className={`ratio-row ratio-row--${metric.status}`}>
          <strong>{metric.label}</strong><b>{decimal(metric.subject, "%")}</b>
          <span>{decimal(metric.authorMedian, "%")} <i>{metric.liftVsAuthorPercent === null ? "—" : `${metric.liftVsAuthorPercent >= 0 ? "+" : ""}${metric.liftVsAuthorPercent}%`}</i></span>
          <span>{decimal(metric.topicMedian, "%")} <i>{metric.liftVsTopicPercent === null ? "—" : `${metric.liftVsTopicPercent >= 0 ? "+" : ""}${metric.liftVsTopicPercent}%`}</i></span>
        </article>)}
      </div>
      <aside className="missing-panel"><h3><LockKeyhole size={17}/> 要闭环这个目标，还缺什么</h3>{missing.length
        ? missing.map((item) => <p key={item}>{item}</p>) : <p>当前目标所需字段已覆盖，可进入重复验证。</p>}</aside>
    </div>
  </section>;
}

function CreatorPortfolio({ report }: { report: ReportEnvelope }) {
  const creator = report.creatorAnalysis;
  const stabilityLabel = { stable: "较稳定", mixed: "中等波动", volatile: "高度波动", unknown: "未知" }[creator.stability];
  return <section className={`creator-portfolio creator-portfolio--${creator.status}`} id="creator-analysis">
    <header><div><span>CREATOR PORTFOLIO / CROSS-POST VIEW</span><h2>{report.source?.author.name ?? "对应博主"} · 组合画像</h2></div><Users size={28}/></header>
    <div className="creator-verdict"><strong>{creator.verdict}</strong><p>这是跨帖公开观察，不包含后台曝光、转粉或成交。</p></div>
    {creator.status === "unavailable" ? <div className="creator-empty"><LockKeyhole size={20}/><p>没有取得作者主页笔记。连接小红书扩展并重新分析后，这里会展示真实博主组合。</p></div> : <>
      <div className="creator-metrics">
        <article><span>主页样本</span><strong>{creator.sampleSize}</strong><small>条公开笔记</small></article>
        <article><span>互动中位</span><strong>{compact(creator.medianInteractions)}</strong><small>逐帖已知互动</small></article>
        <article><span>爆款依赖</span><strong>{decimal(creator.topTwentySharePercent, "%")}</strong><small>Top 20% 互动贡献</small></article>
        <article><span>命中率</span><strong>{decimal(creator.hitRatePercent, "%")}</strong><small>≥ 1.5×中位数</small></article>
        <article><span>稳定性</span><strong>{stabilityLabel}</strong><small>{creator.medianCadenceDays === null ? "节奏未知" : `${creator.medianCadenceDays} 天发布间隔`}</small></article>
      </div>
      <div className="creator-grid">
        <div><h3><Layers3 size={16}/> 可重复信号</h3>{creator.repeatableSignals.map((item) => <p key={item}>{item}</p>)}</div>
        <div><h3>内容支柱 <small>至少重复 2 次</small></h3>{creator.pillars.length ? creator.pillars.map((pillar) => <p key={pillar.label}><strong>{pillar.label}</strong><span>{pillar.postCount} 条 · 中位互动 {compact(pillar.medianInteractions)}</span></p>) : <p>标题样本中没有形成可审计的重复主题。</p>}</div>
      </div>
      {creator.outliers.length > 0 && <div className="creator-outliers"><h3>异常帖子：找偶然，也找失速</h3>{creator.outliers.map((item) => <article key={item.id}>
        <span className={`outlier outlier--${item.direction}`}>{item.direction === "high" ? "高异常" : "低异常"}</span><strong>{item.title}</strong><b>{decimal(item.multipleOfMedian, "×")}</b><small>{compact(item.interactions)} 互动</small>
      </article>)}</div>}
      <details className="creator-limitations"><summary>查看博主分析边界</summary>{creator.limitations.map((item) => <p key={item}>{item}</p>)}</details>
    </>}
  </section>;
}

function Benchmark({ report }: { report: ReportEnvelope }) {
  return <section className="report-section report-section--wide">
    <SectionHeading index="01" title="先证明它真的异常" english="PERFORMANCE / BASELINE"/>
    <div>
      <div className="benchmark-verdict"><BarChart3 size={22}/><div><strong>{report.benchmark.verdict}</strong><p>{report.benchmark.caveat}</p></div></div>
      <div className="benchmark-meta">
        <span>作者基线 <b>{report.benchmark.authorSampleSize}</b> 条</span>
        <span>同题材基线 <b>{report.benchmark.topicSampleSize}</b> 条</span>
        <span>状态 <b>{report.benchmark.status.toUpperCase()}</b></span>
      </div>
      <div className="benchmark-table" role="table" aria-label="内容与基准对比">
        <div className="benchmark-row benchmark-row--head" role="row">
          <span>指标</span><span>本条</span><span>作者中位</span><span>作者位置</span><span>题材中位</span><span>题材位置</span>
        </div>
        {report.benchmark.metrics.map((metric) => <div className="benchmark-row" role="row" key={metric.key}>
          <strong>{metric.label}</strong><b>{compact(metric.subject)}</b><span>{compact(metric.authorMedian)}</span>
          <span className="percentile">{percentile(metric.authorPercentile)}<i style={{ width: `${metric.authorPercentile ?? 0}%` }}/></span>
          <span>{compact(metric.topicMedian)}</span><span className="percentile">{percentile(metric.topicPercentile)}<i style={{ width: `${metric.topicPercentile ?? 0}%` }}/></span>
        </div>)}
      </div>
    </div>
  </section>;
}

function DataObservatory({ report }: { report: ReportEnvelope }) {
  const data = report.dataAnalysis;
  return <section className="report-section data-section">
    <SectionHeading index="02" title="数据观察台" english="MIX / CONVERSION / VELOCITY"/>
    <div>
      <div className="data-headline"><Database size={22}/><div><strong>{data.headline}</strong><p>字段完整度 {data.knownMetricCount}/{data.expectedMetricCount} · {data.completenessPercent}%{data.ageDays === null ? " · 发布时间缺失" : ` · 发布后 ${data.ageDays} 天快照`}</p></div></div>
      <div className="indicator-grid">
        {data.indicators.map((indicator) => <article key={indicator.id} className={`indicator indicator--${indicator.status}`}>
          <header><span>{indicator.label}</span><b>{indicatorValue(indicator.value, indicator.unit)}</b></header>
          <p>{indicator.interpretation}</p>
          <footer><code>{indicator.formula}</code><span>{indicator.numerator === null ? "—" : compact(indicator.numerator)} / {indicator.denominator === null ? "—" : compact(indicator.denominator)}</span></footer>
        </article>)}
      </div>
      <div className="mix-table" role="table" aria-label="互动构成与相对提升">
        <div className="mix-row mix-row--head" role="row"><span>互动</span><span>公开计数</span><span>互动构成</span><span>每千浏览</span><span>作者提升</span><span>题材提升</span></div>
        {data.interactionMix.map((item) => <div className="mix-row" role="row" key={item.key}>
          <strong>{item.label}</strong><b>{compact(item.value)}</b>
          <span className="mix-share">{decimal(item.sharePercent, "%")}<i style={{width:`${item.sharePercent ?? 0}%`}}/></span>
          <span>{decimal(item.perThousandViews)}</span><span>{decimal(item.authorLift, "×")}</span><span>{decimal(item.topicLift, "×")}</span>
        </div>)}
      </div>
      <div className="data-caveats">{data.caveats.map((item) => <p key={item}><AlertTriangle size={13}/>{item}</p>)}</div>
    </div>
  </section>;
}

function CausalMap({ report }: { report: ReportEnvelope }) {
  const statusLabel = { supported: "有证据支持", plausible: "合理但未证实", unknown: "无法判断", contradicted: "存在反证" };
  return <section className="report-section causal-section">
    <SectionHeading index="03" title="传播机制因果链" english="CAUSAL EVIDENCE MAP"/>
    <div className="causal-map causal-map--compact">
      {report.causalModel.map((node, index) => <div key={node.id} className="causal-step">
        <article className={`causal-node causal-node--${node.status}`}>
          <header><span>0{index + 1}</span><div><h3>{node.label}</h3><small>{statusLabel[node.status]} · {node.confidence.toUpperCase()}</small></div></header>
          <p className="causal-mechanism">{node.mechanism}</p>
          <details className="node-evidence"><summary>查看依据、缺口与替代解释 <ChevronDown size={14}/></summary>
            <div className="causal-evidence"><strong>依据</strong>{node.evidenceRefs.length ? node.evidenceRefs.slice(0, 4).map((ref) => <span key={ref}>{evidenceLabel(ref)}</span>) : <span>无直接证据</span>}{node.evidenceRefs.length > 4 && <small>+{node.evidenceRefs.length - 4} 项</small>}</div>
            {node.counterEvidence.length > 0 && <div className="causal-counter"><strong>反证／缺口</strong>{node.counterEvidence.map((item) => <p key={item}>{item}</p>)}</div>}
            <div className="causal-alternatives"><strong>替代解释</strong>{node.alternativeExplanations.map((item) => <span key={item}>{item}</span>)}</div>
          </details>
        </article>
        {index < report.causalModel.length - 1 && <ArrowRight className="causal-arrow" size={19}/>} 
      </div>)}
    </div>
  </section>;
}

function CreativeXray({ report }: { report: ReportEnvelope }) {
  const media = report.mediaBreakdown;
  return <section className="report-section xray-section">
    <SectionHeading index="04" title="创意 X-Ray" english="PACKAGING / SCRIPT / MEDIA"/>
    <div>
      <div className="packaging-grid">
        <article><span>PROMISE</span><h3>承诺</h3><p>{report.packaging.promise}</p></article>
        <article><span>TENSION</span><h3>冲突</h3><p>{report.packaging.tension}</p></article>
        <article><span>AUDIENCE</span><h3>受众</h3><p>{report.packaging.audience}</p></article>
      </div>
      <div className="signal-line"><strong>标题公式</strong><span>{report.packaging.titlePattern}</span>{report.packaging.specificitySignals.map((item) => <i key={item}>{item}</i>)}</div>
      <div className="script-diagnosis"><Split size={21}/><div><span>{report.scriptAnalysis.source.toUpperCase()} SOURCE</span><h3>{report.scriptAnalysis.diagnosis}</h3><p>{report.scriptAnalysis.wordCount} 字词 · {report.scriptAnalysis.informationUnits} 信息单元 · 判断/证明 {report.scriptAnalysis.claimCount}/{report.scriptAnalysis.proofCount}</p></div></div>
      <div className="script-map">
        {report.scriptAnalysis.segments.map((segment, index) => <article key={segment.id}>
          <span>{String(index + 1).padStart(2, "0")}</span><b>{segment.function.toUpperCase()}</b>
          <p>{segment.text}</p><code>{segment.start === null ? evidenceLabel(segment.evidenceRef) : `${segment.start.toFixed(1)}—${segment.end?.toFixed(1)}s`}</code>
        </article>)}
      </div>
      {media ? <>
        <div className="media-stats">
          <div><AudioLines size={17}/><span>语速</span><b>{media.speechWordsPerMinute ?? "—"}</b><small>字词/分钟</small></div>
          <div><ScanSearch size={17}/><span>场景</span><b>{media.shots.length}</b><small>{media.sceneDetectionMethod}</small></div>
          <div><Split size={17}/><span>切换密度</span><b>{media.cutsPerMinute ?? "—"}</b><small>次/分钟</small></div>
          <div><AudioLines size={17}/><span>静音比例</span><b>{media.silenceRatio === null ? "—" : `${Math.round(media.silenceRatio * 100)}%`}</b><small>{media.hasAudio ? "音轨检测" : "无音轨"}</small></div>
        </div>
        {media.contactSheetRef && <figure className="contact-sheet"><img src={media.contactSheetRef} alt="视频场景联络表"/><figcaption>{media.width}×{media.height} · {media.durationSeconds?.toFixed(1)} SEC · SCENE CHANGE DETECTION</figcaption></figure>}
        <div className="shot-timeline">{media.shots.map((shot) => <article key={shot.id}>
          {shot.frameRef && <img src={shot.frameRef} alt={`${shot.start.toFixed(1)} 秒代表帧`}/>}<div>
            <span>{shot.start.toFixed(1)}—{shot.end.toFixed(1)}s / {shot.function.toUpperCase()} / {shot.boundaryReason}</span>
            <p>{shot.observation}</p>{shot.transcript && <blockquote>{shot.transcript}</blockquote>}
          </div>
        </article>)}</div>
      </> : <div className="missing-evidence"><AlertTriangle size={22}/><p>没有获得可读取媒体；所有视听节奏结论均保持为空。</p></div>}
    </div>
  </section>;
}

function AudienceVoice({ report }: { report: ReportEnvelope }) {
  return <section className="report-section audience-section">
    <SectionHeading index="05" title="受众真正接收了什么" english="AUDIENCE VOICE"/>
    <div>
      <div className="audience-summary"><MessageSquareText size={22}/><strong>{report.audienceAnalysis.sampleSize} 条评论样本</strong><p>{report.audienceAnalysis.caveat}</p></div>
      <div className="theme-list">{report.audienceAnalysis.themes.map((theme) => <article key={theme.id}>
        <header><strong>{theme.label}</strong><span>{theme.count} 条 / {theme.share}%</span></header>
        <div className="theme-bar"><i style={{ width: `${theme.share}%` }}/></div>
        <p className="theme-example">“{theme.examples[0]}”</p>
      </article>)}</div>
      <div className="audience-columns"><div><h3>下一条内容只回答这些需求</h3>{Array.from(new Set(report.audienceAnalysis.nextContentDemand)).slice(0, 4).map((item) => <p key={item}>{item}</p>)}</div>
        <div><h3>不能忽略的边界</h3>{Array.from(new Set(report.audienceAnalysis.objections)).slice(0, 4).map((item) => <p key={item}>{item}</p>)}</div></div>
    </div>
  </section>;
}

function ActionLab({ report }: { report: ReportEnvelope }) {
  return <section className="report-section action-lab">
    <SectionHeading index="06" title="复用与验证" english="REPLICATION / EXPERIMENTS"/>
    <div>
      <div className="replication-grid">
        <div><h3><Target size={17}/> 保留的不变量</h3>{report.replication.invariants.map((item) => <p key={item}>{item}</p>)}</div>
        <div><h3><Split size={17}/> 主动测试的变量</h3>{report.replication.variables.map((item) => <p key={item}>{item}</p>)}</div>
        <div><h3><CircleHelp size={17}/> 不能复制的依赖</h3>{report.replication.accountDependencies.map((item) => <p key={item}>{item}</p>)}</div>
        <div><h3><AlertTriangle size={17}/> 复刻失败风险</h3>{report.replication.risks.map((item) => <p key={item}>{item}</p>)}</div>
      </div>
      <div className="experiment-list">{report.experiments.map((experiment, index) => <article key={experiment.id}>
        <header><span>EXP 0{index + 1}</span><h3>{experiment.hypothesis}</h3><b className={`experiment-state experiment-state--${experiment.measurementStatus}`}>{experiment.measurementStatus === "ready" ? "可验收" : "数据阻塞"}</b></header>
        <div className="variants"><p><b>A</b>{experiment.variantA}</p><p><b>B</b>{experiment.variantB}</p></div>
        {experiment.missingMetrics.length > 0 && <p className="experiment-missing"><LockKeyhole size={14}/> 先导入：{experiment.missingMetrics.join("、")}</p>}
        <dl><div><dt>主指标</dt><dd>{experiment.primaryMetric}</dd></div><div><dt>护栏</dt><dd>{experiment.guardrails.join("、")}</dd></div><div><dt>最低次数</dt><dd>{experiment.minimumRuns} 轮配对</dd></div><div><dt>判定</dt><dd>{experiment.successCriteria}</dd></div></dl>
      </article>)}</div>
      <div className="cross-platform"><h3><FlaskConical size={18}/> 跨平台转译</h3>{report.replication.crossPlatform.map((item) => <article key={item.platform}><strong>{item.platform}</strong><p>{item.adaptation}</p></article>)}</div>
    </div>
  </section>;
}

export function ReportV2({ report }: { report: ReportEnvelope }) {
  return <>
    <TrafficQualityWorkbench report={report}/>
    <CreatorPortfolio report={report}/>
    <ReportDrawer label="证据覆盖与数据边界" english="EVIDENCE COVERAGE"><EvidenceCoverage report={report}/></ReportDrawer>
    <ReportDrawer label="绝对规模与公开数据口径" english="SCALE / DATA TABLES"><Benchmark report={report}/><DataObservatory report={report}/></ReportDrawer>
    <ReportDrawer label="机制假设与因果证据" english="CAUSAL HYPOTHESES"><CausalMap report={report}/></ReportDrawer>
    <ReportDrawer label="创意与脚本拆解" english="CREATIVE X-RAY"><CreativeXray report={report}/></ReportDrawer>
    <ReportDrawer label="评论样本与受众信号" english="AUDIENCE SAMPLE"><AudienceVoice report={report}/></ReportDrawer>
    <ReportDrawer label="复用方案与可验收实验" english="ACTION LAB"><ActionLab report={report}/></ReportDrawer>
    <details className="limitations"><summary>查看全部证据缺口与判断边界</summary>{report.limitations.map((item) => <p key={item}>{item}</p>)}</details>
  </>;
}

function ReportDrawer({ label, english, children }: { label: string; english: string; children: React.ReactNode }) {
  return <details className="report-drawer"><summary><span><b>{label}</b><small>{english}</small></span><ChevronDown size={20}/></summary><div className="report-drawer__body">{children}</div></details>;
}
