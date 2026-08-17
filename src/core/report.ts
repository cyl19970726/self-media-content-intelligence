import type {
  ContextSnapshot, DerivedMetrics, Finding, MediaBreakdown, Metrics, ReportEnvelope, SourceSnapshot
} from "../shared/schema.js";

function ratio(numerator: number, denominator: number | null): number | null {
  if (!denominator || denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function divide(numerator: number | null, denominator: number | null, multiplier = 1): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Number(((numerator / denominator) * multiplier).toFixed(2));
}

function sumKnown(values: Array<number | null>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function deriveMetrics(metrics: Metrics): DerivedMetrics {
  return {
    engagementRate: ratio(sumKnown([metrics.likes, metrics.comments, metrics.shares, metrics.bookmarks, metrics.quotes]), metrics.views),
    deepValueRate: ratio(sumKnown([metrics.bookmarks, metrics.shares]), metrics.views),
    conversationRate: ratio(metrics.comments ?? 0, metrics.views),
    amplificationRate: ratio(sumKnown([metrics.shares, metrics.quotes]), metrics.views)
  };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return Number((value ?? 0).toFixed(2));
}

function percentile(subject: number | null, values: number[]): number | null {
  if (subject === null || values.length < 3) return null;
  return Number(((values.filter((value) => value <= subject).length / values.length) * 100).toFixed(1));
}

function metricValues(context: ContextSnapshot, source: "author" | "topic", key: keyof Metrics): number[] {
  const posts = source === "author" ? context.authorPosts : context.topicPosts;
  return posts.map((post) => post.metrics[key]).filter((value): value is number => typeof value === "number");
}

function buildBenchmark(source: SourceSnapshot, context: ContextSnapshot): ReportEnvelope["benchmark"] {
  const definitions = [["likes", "点赞"], ["comments", "评论"], ["shares", "分享"], ["bookmarks", "收藏"], ["quotes", "引用"], ["views", "浏览"]] as const;
  const metrics = definitions.map(([key, label]) => {
    const authorValues = metricValues(context, "author", key);
    const topicValues = metricValues(context, "topic", key);
    const subject = source.metrics[key];
    return {
      key, label, subject, authorMedian: median(authorValues), topicMedian: median(topicValues),
      authorPercentile: percentile(subject, authorValues), topicPercentile: percentile(subject, topicValues)
    };
  }).filter((metric) => metric.subject !== null || metric.authorMedian !== null || metric.topicMedian !== null);
  const likeMetric = metrics.find((metric) => metric.key === "likes");
  const status = context.authorPosts.length >= 3 && context.topicPosts.length >= 3
    ? "ready" as const : context.authorPosts.length >= 3 || context.topicPosts.length >= 3 ? "partial" as const : "unavailable" as const;
  const percentiles = [likeMetric?.authorPercentile, likeMetric?.topicPercentile].filter((value): value is number => value !== null && value !== undefined);
  const strongest = percentiles.length ? Math.min(...percentiles) : null;
  const smallestSample = Math.min(context.authorPosts.length || Number.POSITIVE_INFINITY, context.topicPosts.length || Number.POSITIVE_INFINITY);
  const verdict = strongest === null
    ? "缺少足够基线，当前只能描述互动规模，不能证明这条内容异常优秀。"
    : strongest >= 90 && smallestSample < 20 ? `点赞在作者 ${context.authorPosts.length} 条与同题材 ${context.topicPosts.length} 条样本中均处于最高档；样本量不足以外推为“全平台前 1%”。`
      : strongest >= 90 ? `点赞同时进入可用基线的前 ${Math.max(1, 100 - strongest).toFixed(0)}% 左右，属于明确异常值。`
      : strongest >= 75 ? "点赞高于大多数可比样本，但尚未达到极端异常。"
        : "点赞没有显著脱离可比样本分布，不能仅凭总量称为爆款。";
  return {
    status, authorSampleSize: context.authorPosts.length, topicSampleSize: context.topicPosts.length,
    metrics, verdict,
    caveat: "公开互动会受发布时间、粉丝体量、投流与平台分发影响；百分位用于定位异常，不构成因果证明。"
  };
}

function buildDataAnalysis(source: SourceSnapshot, benchmark: ReportEnvelope["benchmark"]): ReportEnvelope["dataAnalysis"] {
  const definitions = source.platform === "x"
    ? [["likes", "点赞"], ["comments", "回复"], ["shares", "转发"], ["quotes", "引用"]] as const
    : [["likes", "点赞"], ["comments", "评论"], ["shares", "分享"], ["bookmarks", "收藏"]] as const;
  const interactionValues = definitions.map(([key]) => source.metrics[key]);
  const knownInteractionValues = interactionValues.filter((value): value is number => value !== null);
  const totalInteractions = knownInteractionValues.length ? sumKnown(interactionValues) : null;
  const highIntentValues = source.platform === "x"
    ? [source.metrics.shares, source.metrics.quotes]
    : [source.metrics.bookmarks, source.metrics.shares];
  const highIntentInteractions = highIntentValues.some((value) => value !== null) ? sumKnown(highIntentValues) : null;
  const completenessFields = source.platform === "x"
    ? [source.metrics.views, source.metrics.likes, source.metrics.comments, source.metrics.shares, source.metrics.quotes, source.metrics.followers]
    : [source.metrics.views, source.metrics.likes, source.metrics.comments, source.metrics.shares, source.metrics.bookmarks, source.metrics.followers];
  const knownMetricCount = completenessFields.filter((value) => value !== null).length;
  const expectedMetricCount = completenessFields.length;
  const completenessPercent = Number(((knownMetricCount / expectedMetricCount) * 100).toFixed(1));
  const publishedAt = source.publishedAt ? Date.parse(source.publishedAt) : Number.NaN;
  const retrievedAt = Date.parse(source.retrievedAt);
  const ageDays = Number.isFinite(publishedAt) && Number.isFinite(retrievedAt) && retrievedAt >= publishedAt
    ? Number(((retrievedAt - publishedAt) / 86_400_000).toFixed(2)) : null;
  const interactionMix = definitions.map(([key, label]) => {
    const value = source.metrics[key];
    const benchmarkMetric = benchmark.metrics.find((metric) => metric.key === key);
    return {
      key, label, value,
      sharePercent: divide(value, totalInteractions, 100),
      perThousandViews: divide(value, source.metrics.views, 1000),
      authorLift: divide(value, benchmarkMetric?.authorMedian ?? null),
      topicLift: divide(value, benchmarkMetric?.topicMedian ?? null)
    };
  });
  const indicators: ReportEnvelope["dataAnalysis"]["indicators"] = [
    { id: "engagement-rate", label: "总互动／浏览", value: divide(totalInteractions, source.metrics.views, 100), unit: "percent",
      numerator: totalInteractions, denominator: source.metrics.views, formula: "已知互动总数 ÷ 浏览量",
      status: totalInteractions !== null && source.metrics.views !== null ? knownInteractionValues.length === definitions.length ? "ready" : "partial" : "unavailable",
      interpretation: "衡量一次浏览转化为任一公开互动的比例；缺失互动字段时仅代表下限。" },
    { id: "high-intent-rate", label: "高意图互动／浏览", value: divide(highIntentInteractions, source.metrics.views, 100), unit: "percent",
      numerator: highIntentInteractions, denominator: source.metrics.views,
      formula: source.platform === "x" ? "转发 + 引用 ÷ 浏览量" : "收藏 + 分享 ÷ 浏览量",
      status: highIntentInteractions !== null && source.metrics.views !== null ? highIntentValues.every((value) => value !== null) ? "ready" : "partial" : "unavailable",
      interpretation: "把更接近保存、传播和公开引用的行为从轻量点赞中分离。" },
    { id: "save-like", label: "收藏／点赞", value: divide(source.metrics.bookmarks, source.metrics.likes, 100), unit: "percent",
      numerator: source.metrics.bookmarks, denominator: source.metrics.likes, formula: "收藏 ÷ 点赞",
      status: source.metrics.bookmarks !== null && source.metrics.likes !== null ? "ready" : "unavailable",
      interpretation: "观察内容是否更像可回看资料；跨平台不应直接横比。" },
    { id: "share-like", label: "分享／点赞", value: divide(source.metrics.shares, source.metrics.likes, 100), unit: "percent",
      numerator: source.metrics.shares, denominator: source.metrics.likes, formula: "分享 ÷ 点赞",
      status: source.metrics.shares !== null && source.metrics.likes !== null ? "ready" : "unavailable",
      interpretation: "观察互动中主动传播行为的相对强度。" },
    { id: "comment-like", label: "评论／点赞", value: divide(source.metrics.comments, source.metrics.likes, 100), unit: "percent",
      numerator: source.metrics.comments, denominator: source.metrics.likes, formula: "评论 ÷ 点赞",
      status: source.metrics.comments !== null && source.metrics.likes !== null ? "ready" : "unavailable",
      interpretation: "观察讨论相对轻量认可的强度，不等同于评论质量。" },
    { id: "reach-followers", label: "浏览／粉丝", value: divide(source.metrics.views, source.metrics.followers), unit: "multiple",
      numerator: source.metrics.views, denominator: source.metrics.followers, formula: "浏览量 ÷ 当前粉丝数",
      status: source.metrics.views !== null && source.metrics.followers !== null ? "ready" : "unavailable",
      interpretation: "粗看内容触达是否超出当前粉丝规模；粉丝数并非发布时间快照。" },
    { id: "interactions-day", label: "日均互动", value: ageDays && ageDays > 0 ? divide(totalInteractions, ageDays) : null, unit: "per-day",
      numerator: totalInteractions, denominator: ageDays, formula: "当前已知互动总数 ÷ 发布至采集天数",
      status: totalInteractions !== null && ageDays !== null ? knownInteractionValues.length === definitions.length ? "ready" : "partial" : "unavailable",
      interpretation: "这是生命周期平均速度，不是平台后台的逐日增长曲线。" }
  ];
  const highIntentShare = divide(highIntentInteractions, totalInteractions, 100);
  const strongest = interactionMix.filter((item) => item.value !== null).sort((a, b) => (b.sharePercent ?? 0) - (a.sharePercent ?? 0))[0];
  const status = knownMetricCount >= 5 ? "ready" as const : knownMetricCount >= 2 ? "partial" as const : "unavailable" as const;
  return {
    status, totalInteractions, highIntentInteractions, knownMetricCount, expectedMetricCount, completenessPercent, ageDays,
    interactionMix, indicators,
    headline: totalInteractions === null ? "没有足够公开指标，无法拆解互动结构。"
      : `已知互动 ${totalInteractions.toLocaleString("zh-CN")} 次；${strongest?.label ?? "主要互动"}占 ${strongest?.sharePercent ?? 0}%，高意图互动占 ${highIntentShare ?? "未知"}%。`,
    caveats: [
      ...(knownInteractionValues.length < definitions.length ? [`${definitions.length - knownInteractionValues.length} 个互动字段缺失；互动总数与构成按已知字段计算。`] : []),
      ...(source.metrics.views === null ? ["缺少浏览量，所有浏览转化率保持为空。"] : []),
      ...(ageDays === null ? ["缺少可靠发布时间，无法计算生命周期平均速度。"] : ageDays < 1 ? ["发布不足 24 小时，速度指标波动很大。"] : []),
      "公开计数是单次采集快照，不能替代曝光、点击、留存和逐日增长曲线。"
    ]
  };
}

function textUnits(value: string): string[] {
  return value.split(/(?<=[。！？!?；;])|\n+/).map((part) => part.trim()).filter(Boolean);
}

function countWords(value: string): number {
  return (value.match(/[\u4e00-\u9fff]/g)?.length ?? 0) + (value.match(/[A-Za-z0-9]+/g)?.length ?? 0);
}

function segmentFunction(text: string, index: number, total: number): ReportEnvelope["scriptAnalysis"]["segments"][number]["function"] {
  if (index === 0) return "hook";
  if (/问题|痛点|为什么|难|误区|别再/.test(text)) return "problem";
  if (/因为|机制|原理|第一|第二|第三|步骤|方法/.test(text)) return "mechanism";
  if (/数据|案例|例如|实测|证明|结果|对比/.test(text)) return "proof";
  if (/关注|评论|转发|下一期|试试/.test(text)) return "cta";
  return index === total - 1 ? "payoff" : "mechanism";
}

function buildScript(source: SourceSnapshot, media: MediaBreakdown | null): ReportEnvelope["scriptAnalysis"] {
  const transcriptText = media?.transcript.map((segment) => segment.text).join(" ").trim() ?? "";
  const scriptSource = transcriptText ? "transcript" as const : source.text ? "post-copy" as const : "unavailable" as const;
  const body = transcriptText || source.text;
  const units = textUnits(body);
  const segments = units.map((text, index) => {
    const transcript = scriptSource === "transcript" ? media?.transcript[index] : null;
    return {
      id: `script-${index + 1}`, function: segmentFunction(text, index, units.length), text,
      source: scriptSource === "transcript" ? "transcript" as const : "post-copy" as const,
      start: transcript?.start ?? null, end: transcript?.end ?? null,
      evidenceRef: scriptSource === "transcript" ? `mediaBreakdown.transcript.${index}` : `source.text.sentence.${index}`
    };
  });
  const claimCount = units.filter((unit) => /是|会|能|只要|问题|差别|发现|核心|真正/.test(unit)).length;
  const proofCount = units.filter((unit) => /数据|案例|例如|实测|证明|对比|\d+[%倍个条天]/.test(unit)).length;
  const rhetoricalDevices = [
    ...(/[？?]|为什么|怎么|如何/.test(`${source.title}${body}`) ? ["问题钩子"] : []),
    ...(/\d/.test(`${source.title}${body}`) ? ["数字化承诺"] : []),
    ...(/别再|不是.+而是|但|却/.test(`${source.title}${body}`) ? ["反常识／对立"] : []),
    ...(/第一|第二|第三|步骤|层/.test(body) ? ["枚举式压缩"] : []),
    ...(/你|我们/.test(body) ? ["直接对话"] : [])
  ];
  const wordCount = countWords(body);
  return {
    source: scriptSource, wordCount,
    estimatedReadSeconds: wordCount ? Number(((wordCount / 260) * 60).toFixed(1)) : null,
    informationUnits: units.length, claimCount, proofCount,
    claimProofRatio: claimCount ? Number((proofCount / claimCount).toFixed(2)) : null,
    rhetoricalDevices, segments,
    diagnosis: claimCount > 0 && proofCount === 0
      ? `文本提出 ${claimCount} 个判断，但没有识别到案例、数据或对比证据；结构清晰不等于可信度充分。`
      : `文本包含 ${units.length} 个信息单元、${claimCount} 个判断和 ${proofCount} 个可识别证明信号。`
  };
}

function buildPackaging(source: SourceSnapshot): ReportEnvelope["packaging"] {
  const combined = `${source.title} ${source.text}`;
  const specificitySignals = Array.from(new Set([
    ...(combined.match(/\d+\s*(?:天|步|层|个|条|分钟|秒|%|倍)/g) ?? []),
    ...(/第一|第二|第三/.test(combined) ? ["明确层级"] : []),
    ...(/案例|实测|清单|模板/.test(combined) ? ["可交付物"] : [])
  ]));
  return {
    promise: /\d/.test(source.title) ? "用数字限定交付范围，让读者预估理解成本。"
      : /如何|怎么|为什么|？|\?/.test(source.title) ? "承诺回答一个明确问题。" : "标题给出判断，但交付边界不够具体。",
    audience: source.tags.length ? `显式标签指向：${source.tags.slice(0, 3).join("、")}` : "标题和正文没有明确标记受众身份。",
    tension: /不是.+而是|别再|却|但/.test(combined) ? "通过否定常见做法建立认知冲突。" : "未识别到强对立，主要依赖主题本身吸引。",
    specificitySignals,
    searchSignals: Array.from(new Set([...source.tags, ...source.title.split(/[\s：:，。！？!?]+/).filter((part) => part.length >= 2)])).slice(0, 8),
    titlePattern: `${/别再/.test(source.title) ? "阻止旧行为" : /[？?]/.test(source.title) ? "问题" : "观点"} → ${/\d/.test(source.title) ? "数字化方案" : "结果承诺"}`,
    evidenceRefs: ["source.title", "source.tags", "source.text"]
  };
}

type ThemeDefinition = { id: string; label: string; intent: ReportEnvelope["audienceAnalysis"]["themes"][number]["intent"]; pattern: RegExp };
const themeDefinitions: ThemeDefinition[] = [
  { id: "follow-up", label: "请求继续交付", intent: "follow-up", pattern: /下一期|再做|求|模板|清单|完整案例|失败案例/ },
  { id: "objection", label: "边界与反对", intent: "objection", pattern: /但|不过|有点|不一样|太|少|不适合/ },
  { id: "implementation", label: "准备或已经实践", intent: "implementation", pattern: /照着|实践|准备|已经|改了|试了/ },
  { id: "question", label: "方法追问", intent: "question", pattern: /[？?]|怎么|如何|什么|区别|能不能|吗/ },
  { id: "approval", label: "认同与收藏", intent: "approval", pattern: /终于|清楚|很好|有用|收藏|学到|赞/ }
];

function buildAudience(source: SourceSnapshot): ReportEnvelope["audienceAnalysis"] {
  const buckets = new Map<string, typeof source.comments>();
  for (const definition of themeDefinitions) buckets.set(definition.id, []);
  buckets.set("other", []);
  for (const comment of source.comments) {
    const definition = themeDefinitions.find((item) => item.pattern.test(comment.text));
    buckets.get(definition?.id ?? "other")?.push(comment);
  }
  const themes = [...themeDefinitions, { id: "other", label: "其他反馈", intent: "other" as const, pattern: /./ }]
    .map((definition) => {
      const comments = buckets.get(definition.id) ?? [];
      return {
        id: definition.id, label: definition.label, intent: definition.intent, count: comments.length,
        share: source.comments.length ? Number(((comments.length / source.comments.length) * 100).toFixed(1)) : 0,
        examples: [...comments].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3).map((comment) => comment.text),
        evidenceRefs: comments.slice(0, 8).map((comment) => `source.comments.${comment.id}`)
      };
    }).filter((theme) => theme.count > 0);
  return {
    sampleSize: source.comments.length,
    weightedSampleLikes: sumKnown(source.comments.map((comment) => comment.likes)), themes,
    unansweredQuestions: source.comments.filter((comment) => themeDefinitions[3]?.pattern.test(comment.text)).slice(0, 8).map((comment) => comment.text),
    objections: source.comments.filter((comment) => themeDefinitions[1]?.pattern.test(comment.text)).slice(0, 8).map((comment) => comment.text),
    nextContentDemand: source.comments.filter((comment) => themeDefinitions[0]?.pattern.test(comment.text)).slice(0, 8).map((comment) => comment.text),
    caveat: source.comments.length >= 20 ? "评论样本可用于主题方向判断，但仍存在平台排序与沉默用户偏差。"
      : `仅采集 ${source.comments.length} 条评论；主题用于形成假设，不代表全部受众。`
  };
}

function buildCoverage(source: SourceSnapshot, media: MediaBreakdown | null, context: ContextSnapshot): ReportEnvelope["evidenceCoverage"] {
  const checks = [[true, "原帖正文与公开互动"], [source.comments.length >= 10, "至少 10 条评论"], [Boolean(media), "可读取媒体"],
    [Boolean(media?.transcript.length), "带时间码逐字稿"], [context.authorPosts.length >= 3, "作者历史基线"], [context.topicPosts.length >= 3, "同题材基线"]] as const;
  const available = checks.filter(([ready]) => ready).map(([, label]) => label);
  const missing: string[] = checks.filter(([ready]) => !ready).map(([, label]) => label);
  missing.push("账号后台完播、流量来源与关注转化");
  return {
    percent: Math.round((available.length / (checks.length + 1)) * 100), available, missing,
    warnings: [
      ...(source.platform === "xiaohongshu" && source.metrics.views !== null ? ["小红书公开浏览量需核验来源；若非后台导入，不用于最终因果判断。"] : []),
      ...(source.comments.length < 20 ? ["评论样本偏少，受众主题置信度有限。"] : []),
      ...(media && !media.transcript.length ? ["没有逐字稿，脚本分析退回帖子正文。"] : [])
    ],
    tiers: [
      { id: "public", label: "公开内容证据", status: media || source.comments.length ? "ready" : "partial", note: `正文、公开互动、${source.comments.length} 条评论${media ? "、媒体" : ""}` },
      { id: "comparative", label: "作者与竞品基线", status: context.status === "ready" ? "ready" : context.status === "partial" ? "partial" : "missing", note: `作者 ${context.authorPosts.length} 条 / 同题材 ${context.topicPosts.length} 条` },
      { id: "owner", label: "账号后台数据", status: "missing", note: "未导入完播、来源、转粉与投流数据" }
    ]
  };
}

function buildCausalModel(benchmark: ReportEnvelope["benchmark"], packaging: ReportEnvelope["packaging"],
  script: ReportEnvelope["scriptAnalysis"], audience: ReportEnvelope["audienceAnalysis"], media: MediaBreakdown | null): ReportEnvelope["causalModel"] {
  const likeMetric = benchmark.metrics.find((metric) => metric.key === "likes");
  const anomaly = Math.min(likeMetric?.authorPercentile ?? 0, likeMetric?.topicPercentile ?? 0);
  const demandCount = audience.themes.filter((theme) => ["question", "implementation", "follow-up"].includes(theme.intent)).reduce((sum, theme) => sum + theme.count, 0);
  return [
    { id: "performance-anomaly", label: "结果是否异常", mechanism: benchmark.verdict,
      status: benchmark.status === "ready" && anomaly >= 75 ? "supported" : benchmark.status === "unavailable" ? "unknown" : "plausible",
      confidence: benchmark.status === "ready" && Math.min(benchmark.authorSampleSize, benchmark.topicSampleSize) >= 20 ? "high" : benchmark.status !== "unavailable" ? "medium" : "low", evidenceRefs: ["benchmark.metrics.likes"],
      counterEvidence: benchmark.status !== "ready" ? ["作者或题材样本不足。"] : [], alternativeExplanations: ["发布时间差异", "粉丝体量差异", "投流或站外传播"] },
    { id: "packaging-entry", label: "包装可能降低进入成本", mechanism: `${packaging.promise}${packaging.tension}`,
      status: "plausible", confidence: "low", evidenceRefs: packaging.evidenceRefs,
      counterEvidence: ["没有曝光到点击数据，无法证明标题或封面实际提升点击率。"], alternativeExplanations: ["账号已有认知", "题材自然热度", "封面视觉吸引"] },
    { id: "structure-delivery", label: "结构促进理解与收藏", mechanism: `${script.rhetoricalDevices.join("、") || "未识别显著修辞"}；${script.diagnosis}`,
      status: script.segments.length >= 3 ? "plausible" : "unknown", confidence: script.source === "transcript" ? "medium" : "low",
      evidenceRefs: script.segments.map((segment) => segment.evidenceRef), counterEvidence: script.proofCount === 0 ? ["缺少可识别证明信号，结构可能只带来流畅感而非可信度。"] : [],
      alternativeExplanations: ["收藏可能来自题材刚需，而非脚本结构"] },
    { id: "audience-demand", label: "评论样本出现后续需求", mechanism: `${demandCount}/${audience.sampleSize || 0} 条样本表现为追问、实践或继续交付需求。`,
      status: audience.sampleSize >= 10 && demandCount >= 3 ? "supported" : audience.sampleSize ? "plausible" : "unknown",
      confidence: audience.sampleSize >= 20 ? "medium" : "low", evidenceRefs: audience.themes.flatMap((theme) => theme.evidenceRefs),
      counterEvidence: [audience.caveat], alternativeExplanations: ["高赞评论排序放大了积极反馈", "沉默用户未被观察"] },
    { id: "distribution", label: "平台分发与留存", mechanism: media ? `检测到 ${media.shots.length} 个场景、${media.cutsPerMinute ?? "未知"} 次/分钟切换，但没有真实留存曲线。` : "没有媒体或后台留存数据。",
      status: "unknown", confidence: "low", evidenceRefs: media ? ["mediaBreakdown.shots", "mediaBreakdown.cutsPerMinute"] : [],
      counterEvidence: ["缺少曝光、点击、完播、流量来源与关注转化。"], alternativeExplanations: ["平台推荐", "发布时间", "热点窗口", "付费投流", "站外导流"] }
  ];
}

function liftPercent(subject: number | null, baseline: number | null): number | null {
  if (subject === null || baseline === null || baseline <= 0) return null;
  return Number((((subject / baseline) - 1) * 100).toFixed(1));
}

function postRatio(post: ContextSnapshot["authorPosts"][number], numerator: keyof Metrics): number | null {
  return divide(post.metrics[numerator], post.metrics.likes, 100);
}

function buildTrafficQuality(source: SourceSnapshot, context: ContextSnapshot, benchmark: ReportEnvelope["benchmark"],
  audience: ReportEnvelope["audienceAnalysis"]): ReportEnvelope["trafficQuality"] {
  const definitions = source.platform === "xiaohongshu"
    ? [["save-like", "收藏／点赞", "bookmarks"], ["share-like", "分享／点赞", "shares"], ["comment-like", "评论／点赞", "comments"]] as const
    : [["share-like", "转发／点赞", "shares"], ["quote-like", "引用／点赞", "quotes"], ["comment-like", "回复／点赞", "comments"]] as const;
  const ratioBenchmarks = definitions.map(([id, label, numerator]) => {
    const subject = divide(source.metrics[numerator], source.metrics.likes, 100);
    const authorMedian = median(context.authorPosts.map((post) => postRatio(post, numerator)).filter((value): value is number => value !== null));
    const topicMedian = median(context.topicPosts.map((post) => postRatio(post, numerator)).filter((value): value is number => value !== null));
    const liftVsAuthorPercent = liftPercent(subject, authorMedian);
    const liftVsTopicPercent = liftPercent(subject, topicMedian);
    const comparableLifts = [liftVsAuthorPercent, liftVsTopicPercent].filter((value): value is number => value !== null);
    const strongestLift = comparableLifts.length ? Math.max(...comparableLifts) : null;
    const status = strongestLift === null ? "unknown" as const : strongestLift >= 20 ? "strong" as const
      : strongestLift <= -20 ? "weak" as const : "mixed" as const;
    return { id, label, subject, authorMedian, topicMedian, liftVsAuthorPercent, liftVsTopicPercent, status };
  });
  const depthSignals = ratioBenchmarks.filter((metric) => metric.status === "strong").length;
  const depthStatus = ratioBenchmarks.every((metric) => metric.status === "unknown") ? "unknown" as const
    : depthSignals >= 2 ? "strong" as const : depthSignals === 1 ? "mixed" as const : "weak" as const;
  const likeMetric = benchmark.metrics.find((metric) => metric.key === "likes");
  const scalePercentiles = [likeMetric?.authorPercentile, likeMetric?.topicPercentile].filter((value): value is number => value !== null && value !== undefined);
  const scaleFloor = scalePercentiles.length ? Math.min(...scalePercentiles) : null;
  const scaleStatus = scaleFloor === null ? "unknown" as const : scaleFloor >= 75 ? "strong" as const : scaleFloor >= 50 ? "mixed" as const : "weak" as const;
  const demandCount = audience.themes.filter((theme) => ["question", "implementation", "follow-up"].includes(theme.intent))
    .reduce((sum, theme) => sum + theme.count, 0);
  const fitStatus = audience.sampleSize >= 10 && demandCount >= 3 ? "mixed" as const : audience.sampleSize ? "weak" as const : "unknown" as const;
  const dimensions: ReportEnvelope["trafficQuality"]["dimensions"] = [
    { id: "source", label: "流量来源", status: "unknown", confidence: "low", summary: "不知道流量来自推荐、搜索、粉丝、投流还是站外。", metrics: [], evidenceRefs: [], missing: ["各来源曝光占比", "自然/付费标记", "新老用户占比"] },
    { id: "scale", label: "触达规模", status: scaleStatus, confidence: benchmark.status === "ready" ? "medium" : "low",
      summary: scaleStatus === "strong" ? "公开互动规模显著高于作者与题材样本；这证明量大，不直接证明质量好。" : "公开互动规模未形成稳定异常。",
      metrics: scalePercentiles.map((value) => `点赞位置 P${Math.round(value)}`), evidenceRefs: ["benchmark.metrics.likes"], missing: ["真实曝光人数", "新增触达占比"] },
    { id: "retention", label: "内容留存", status: "unknown", confidence: "low", summary: "镜头节奏不能替代真实观看留存。", metrics: [], evidenceRefs: [], missing: ["3秒留存", "平均观看时长", "完播率", "逐秒留存曲线"] },
    { id: "depth", label: "深度互动", status: depthStatus, confidence: ratioBenchmarks.length >= 3 ? "medium" : "low",
      summary: depthStatus === "strong" ? `${depthSignals} 个归一化互动比率至少高于一组可比基线，说明这波流量更倾向保存、传播或讨论。`
        : depthStatus === "mixed" ? "只有部分深度互动比率高于基线，质量信号不一致。" : "深度互动没有高于可比基线。",
      metrics: ratioBenchmarks.map((metric) => `${metric.label} ${metric.subject ?? "—"}%`), evidenceRefs: ratioBenchmarks.map((metric) => `trafficQuality.ratioBenchmarks.${metric.id}`), missing: [] },
    { id: "fit", label: "受众匹配", status: fitStatus, confidence: "low",
      summary: fitStatus === "mixed" ? `${demandCount}/${audience.sampleSize} 条被采集评论出现追问、实践或继续交付意图；排序偏差使它只能作为方向信号。` : "评论样本不足以判断目标受众匹配。",
      metrics: audience.sampleSize ? [`评论样本 ${audience.sampleSize}`, `后续意图 ${demandCount}`] : [], evidenceRefs: audience.themes.flatMap((theme) => theme.evidenceRefs), missing: ["目标人群标签", "新老受众结构", "沉默用户反馈"] },
    { id: "conversion", label: "业务转化", status: "unknown", confidence: "low", summary: "公开互动无法证明转粉、点击、留资或成交。", metrics: [], evidenceRefs: [], missing: ["主页访问", "新增关注", "链接点击", "线索", "订单与收入"] },
    { id: "durability", label: "长尾价值", status: "unknown", confidence: "low", summary: "单次快照无法区分短期推荐爆发与搜索长尾。", metrics: [], evidenceRefs: [], missing: ["逐日曝光/互动", "搜索流量占比", "7/30日长尾贡献"] },
    { id: "negative", label: "负反馈／成本", status: "unknown", confidence: "low", summary: "不知道这波流量是否伴随跳失、隐藏、举报或投流成本。", metrics: [], evidenceRefs: [], missing: ["不感兴趣/隐藏", "举报", "取关", "投流消耗与增量"] }
  ];
  const dimension = (id: ReportEnvelope["trafficQuality"]["dimensions"][number]["id"]) => dimensions.find((item) => item.id === id)?.status ?? "unknown";
  const verdictFor = (label: string, ids: ReportEnvelope["trafficQuality"]["objectiveProfiles"][number]["requiredDimensions"]) => {
    const statuses = ids.map(dimension);
    const unknown = statuses.filter((status) => status === "unknown").length;
    const strong = statuses.filter((status) => status === "strong").length;
    if (unknown) return `${label}：已有 ${strong} 个强信号，但 ${unknown} 个关键维度未知，暂不能闭环。`;
    if (statuses.every((status) => status === "strong" || status === "mixed")) return `${label}：当前证据整体偏正向，可进入重复验证。`;
    return `${label}：存在弱信号，不建议据此扩大投入。`;
  };
  const objectiveProfiles: ReportEnvelope["trafficQuality"]["objectiveProfiles"] = [
    { id: "awareness", label: "认知扩散", requiredDimensions: ["scale", "retention", "negative"], verdict: verdictFor("认知扩散", ["scale", "retention", "negative"]) },
    { id: "growth", label: "账号增长", requiredDimensions: ["scale", "fit", "conversion"], verdict: verdictFor("账号增长", ["scale", "fit", "conversion"]) },
    { id: "authority", label: "内容资产", requiredDimensions: ["depth", "fit", "durability"], verdict: verdictFor("内容资产", ["depth", "fit", "durability"]) },
    { id: "conversion", label: "商业转化", requiredDimensions: ["fit", "conversion", "source", "negative"], verdict: verdictFor("商业转化", ["fit", "conversion", "source", "negative"]) }
  ];
  const verdict = scaleStatus === "strong" && depthStatus === "strong"
    ? "大流量、深度互动倾向较强，但真实流量质量尚未闭环。"
    : "公开规模与深度信号尚不一致，不能把当前流量直接判为优质。";
  return { defaultObjective: "authority", verdict, ratioBenchmarks, dimensions, objectiveProfiles };
}

function postInteractions(post: ContextSnapshot["authorPosts"][number]): number | null {
  const values = [post.metrics.likes, post.metrics.comments, post.metrics.shares, post.metrics.bookmarks, post.metrics.quotes]
    .filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function recurringTitleTokens(titles: string[]): string[] {
  const stop = new Set(["如何", "怎么", "什么", "一个", "这个", "可以", "我们", "你的", "学会", "分钟", "内容", "视频"]);
  const counts = new Map<string, number>();
  for (const title of titles) {
    const normalized = title.replace(/[\d\s：:，。！？!?、｜|《》【】（）()]+/g, " ").trim();
    const tokens = new Set<string>();
    for (const word of normalized.match(/[A-Za-z][A-Za-z0-9-]{2,}/g) ?? []) tokens.add(word.toLowerCase());
    for (const chunk of normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
      for (const size of [4, 3, 2]) for (let index = 0; index <= chunk.length - size; index += 1) tokens.add(chunk.slice(index, index + size));
    }
    for (const token of tokens) if (!stop.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const selected: string[] = [];
  const overlaps = (left: string, right: string) => {
    if (left.includes(right) || right.includes(left)) return true;
    const cooccurrence = titles.filter((title) => title.toLowerCase().includes(left.toLowerCase()) && title.toLowerCase().includes(right.toLowerCase())).length;
    const smallerCount = Math.min(counts.get(left) ?? 0, counts.get(right) ?? 0);
    if (smallerCount > 0 && cooccurrence / smallerCount >= 0.8) return true;
    const grams = (value: string) => new Set(Array.from({ length: Math.max(0, value.length - 1) }, (_, index) => value.slice(index, index + 2)));
    const leftGrams = grams(left); const rightGrams = grams(right);
    const intersection = [...leftGrams].filter((gram) => rightGrams.has(gram)).length;
    const union = new Set([...leftGrams, ...rightGrams]).size;
    const chinese = /[\u4e00-\u9fff]/.test(left) && /[\u4e00-\u9fff]/.test(right);
    return chinese ? intersection > 0 : union > 0 && intersection / union >= 0.5;
  };
  for (const [token] of [...counts].filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)) {
    if (selected.some((existing) => overlaps(existing, token))) continue;
    selected.push(token);
    if (selected.length >= 4) break;
  }
  return selected;
}

function buildCreatorAnalysis(context: ContextSnapshot): ReportEnvelope["creatorAnalysis"] {
  const posts = context.authorPosts;
  const values = posts.map((post) => ({ post, interactions: postInteractions(post) }))
    .filter((item): item is { post: ContextSnapshot["authorPosts"][number]; interactions: number } => item.interactions !== null);
  const interactionValues = values.map((item) => item.interactions);
  const medianInteractions = median(interactionValues);
  const sampleSize = posts.length;
  if (sampleSize < 5 || medianInteractions === null) return {
    status: sampleSize ? "partial" : "unavailable", sampleSize, medianInteractions, topTwentySharePercent: null,
    hitRatePercent: null, medianCadenceDays: null, stability: "unknown", pillars: [], repeatableSignals: [], outliers: [],
    verdict: sampleSize ? `只取得 ${sampleSize} 条作者笔记，不能判断稳定模式。` : "尚未取得博主主页样本。",
    limitations: ["至少需要 5 条带公开互动的作者笔记。", "缺少后台曝光、转粉、成交与受众结构。"]
  };
  const sorted = [...interactionValues].sort((a, b) => b - a);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const topTwentySharePercent = total > 0 ? Number(((sorted.slice(0, topCount).reduce((sum, value) => sum + value, 0) / total) * 100).toFixed(1)) : null;
  const hitRatePercent = Number(((interactionValues.filter((value) => value >= medianInteractions * 1.5).length / interactionValues.length) * 100).toFixed(1));
  const normalizedDeviations = interactionValues.map((value) => Math.abs(value - medianInteractions) / Math.max(1, medianInteractions));
  const medianDeviation = median(normalizedDeviations) ?? 0;
  const stability = medianDeviation <= 0.35 ? "stable" as const : medianDeviation <= 0.8 ? "mixed" as const : "volatile" as const;
  const timestamps = posts.map((post) => post.publishedAt ? Date.parse(post.publishedAt) : Number.NaN).filter(Number.isFinite).sort((a, b) => a - b);
  const gaps = timestamps.slice(1).map((value, index) => (value - (timestamps[index] ?? value)) / 86_400_000).filter((value) => value >= 0);
  const medianCadenceDays = median(gaps);
  const tokens = recurringTitleTokens(posts.map((post) => post.title));
  const pillars = tokens.map((label) => {
    const matches = values.filter(({ post }) => post.title.toLowerCase().includes(label.toLowerCase()));
    return { label, postCount: matches.length, medianInteractions: median(matches.map((item) => item.interactions)) };
  }).filter((pillar) => pillar.postCount >= 2);
  const outliers = values.filter(({ interactions }) => interactions >= medianInteractions * 2 || interactions <= medianInteractions * 0.5)
    .sort((a, b) => b.interactions - a.interactions).slice(0, 6).map(({ post, interactions }) => ({
      id: post.id, title: post.title, direction: interactions >= medianInteractions * 2 ? "high" as const : "low" as const,
      interactions, multipleOfMedian: divide(interactions, medianInteractions)
    }));
  const saveRatios = posts.map((post) => postRatio(post, "bookmarks")).filter((value): value is number => value !== null);
  const shareRatios = posts.map((post) => postRatio(post, "shares")).filter((value): value is number => value !== null);
  const repeatableSignals = [
    topTwentySharePercent !== null && topTwentySharePercent >= 55 ? `Top 20% 帖子贡献 ${topTwentySharePercent}% 互动，账号明显依赖少数爆款。`
      : topTwentySharePercent !== null ? `Top 20% 帖子贡献 ${topTwentySharePercent}% 互动，组合分布相对均衡。` : null,
    median(saveRatios) !== null ? `作者历史收藏／点赞中位数为 ${median(saveRatios)}%。` : null,
    median(shareRatios) !== null ? `作者历史分享／点赞中位数为 ${median(shareRatios)}%。` : null,
    medianCadenceDays !== null ? `公开样本的发帖间隔中位数为 ${medianCadenceDays} 天。` : null
  ].filter((item): item is string => Boolean(item));
  const stabilityLabel = stability === "stable" ? "较稳定" : stability === "mixed" ? "波动中等" : "波动很大";
  return {
    status: context.status === "ready" ? "ready" : "partial", sampleSize, medianInteractions, topTwentySharePercent,
    hitRatePercent, medianCadenceDays, stability, pillars, repeatableSignals, outliers,
    verdict: `基于 ${sampleSize} 条公开笔记：表现${stabilityLabel}；${topTwentySharePercent !== null && topTwentySharePercent >= 55 ? "增长主要由少数爆款驱动" : "没有出现极端的单帖依赖"}。`,
    limitations: ["主页公开样本可能不是完整历史。", "互动受发布时间与分发规模影响。", "缺少曝光、转粉、成交和后台受众数据。"]
  };
}

type AnalysisOutput = Pick<ReportEnvelope, "derivedMetrics" | "executiveSummary" | "findings" | "limitations" | "actions" |
  "evidenceCoverage" | "context" | "benchmark" | "dataAnalysis" | "packaging" | "scriptAnalysis" | "audienceAnalysis" | "causalModel" | "trafficQuality" | "creatorAnalysis" | "replication" | "experiments">;

export function buildAnalysis(source: SourceSnapshot, media: MediaBreakdown | null, context: ContextSnapshot): AnalysisOutput {
  const derivedMetrics = deriveMetrics(source.metrics);
  const benchmark = buildBenchmark(source, context);
  const dataAnalysis = buildDataAnalysis(source, benchmark);
  const packaging = buildPackaging(source);
  const scriptAnalysis = buildScript(source, media);
  const audienceAnalysis = buildAudience(source);
  const trafficQuality = buildTrafficQuality(source, context, benchmark, audienceAnalysis);
  const creatorAnalysis = buildCreatorAnalysis(context);
  const evidenceCoverage = buildCoverage(source, media, context);
  const causalModel = buildCausalModel(benchmark, packaging, scriptAnalysis, audienceAnalysis, media);
  const observed = causalModel.find((node) => node.id === "audience-demand" && node.status === "supported");
  const hypothesis = causalModel.find((node) => node.id === "packaging-entry");
  const executiveSummary = `${trafficQuality.verdict} ${observed ? `评论样本信号：${observed.mechanism}` : "互动层面暂无足够评论证据。"} 包装机制仍是假设：${hypothesis?.mechanism ?? "证据不足"}`;
  const findings: Finding[] = causalModel.map((node) => ({
    id: node.id, title: node.label, statement: node.mechanism,
    grade: node.status === "supported" ? "fact" : node.status === "plausible" ? "observation" : "inference",
    confidence: node.confidence, evidenceRefs: node.evidenceRefs
  }));
  const replication = {
    invariants: [`保留“${packaging.titlePattern}”的进入逻辑，而不是照抄原句。`, `保留 ${scriptAnalysis.informationUnits} 个左右的信息单元，并让每一段只有一个功能。`,
      audienceAnalysis.nextContentDemand[0] ? `下一条优先回答真实追问：“${audienceAnalysis.nextContentDemand[0]}”` : "用真实评论问题决定下一条内容，而不是凭感觉续题。"],
    variables: ["案例、行业和目标人群必须替换为自己的真实经验。", "标题问题式与结果式可作为实验变量。", "视频时长和剪辑密度需随平台调整。"],
    accountDependencies: ["作者已有认知与粉丝基础不可复制。", "历史内容形成的选题预期可能影响点击。", "后台流量与转粉数据缺失，无法判断账号权重贡献。"],
    risks: ["只复制数字标题会制造承诺但不增加证明。", "若没有真实案例，结构越清楚越容易暴露内容空洞。", "跨平台直接搬运会忽略消费场景与篇幅差异。"],
    crossPlatform: [
      { platform: "小红书", adaptation: "封面先呈现结果或冲突；正文强化收藏型清单，并用评论承接下一期。" },
      { platform: "X", adaptation: "首条给出可引用判断，后续串文展示推理链与证据，结尾提出可回复的问题。" },
      { platform: "抖音／视频号", adaptation: "前 3 秒口播结论，10 秒内交付第一个证据，减少背景铺垫。" },
      { platform: "YouTube", adaptation: "开场先交付路线图，再扩展案例、反例和章节化证明。" }
    ]
  };
  const experiments = [
    { id: "title-promise", hypothesis: "数字化交付边界比纯问题标题更能提升高意图互动。",
      variantA: `问题式：${source.title.replace(/\d+\s*(层|步|个|条)/, "关键方法")}`, variantB: `数字式：${source.title}`,
      primaryMetric: source.platform === "xiaohongshu" ? "收藏/点赞比" : "书签+转发/浏览量", guardrails: ["评论问题率", "负面承诺落差评论"],
      successCriteria: "至少 4 次同题材配对发布，B 的主指标中位数高出 A 20% 以上。", minimumRuns: 4,
      measurementStatus: "ready" as const, missingMetrics: [] },
    { id: "proof-density", hypothesis: "在机制段加入真实案例会提升分享与方法追问。",
      variantA: "只讲三层框架。", variantB: "同框架 + 一个失败案例 + 一个成功前后对比。", primaryMetric: "分享率或分享/点赞比",
      guardrails: ["完播率", "平均观看时长"], successCriteria: "至少 3 组配对内容，B 的分享指标连续 2 组领先。", minimumRuns: 3,
      measurementStatus: "blocked" as const, missingMetrics: ["完播率", "平均观看时长"] },
    { id: "comment-loop", hypothesis: "用高赞追问做开场能提升评论质量与系列关注。",
      variantA: "创作者自拟开场。", variantB: `展示评论开场：${audienceAnalysis.nextContentDemand[0] ?? audienceAnalysis.unansweredQuestions[0] ?? "如何把框架用于真实案例？"}`,
      primaryMetric: "每千次曝光的高意图评论数", guardrails: ["关注转化", "隐藏/负反馈"], successCriteria: "3 次实验后，B 的高意图评论密度中位数提升 25%。", minimumRuns: 3,
      measurementStatus: "blocked" as const, missingMetrics: ["曝光量", "关注转化", "隐藏/负反馈"] }
  ];
  const limitations = [...evidenceCoverage.missing.map((item) => `缺失：${item}`), ...evidenceCoverage.warnings];
  return {
    derivedMetrics, executiveSummary, findings, limitations, context, evidenceCoverage, benchmark, dataAnalysis, packaging, scriptAnalysis, trafficQuality, creatorAnalysis,
    audienceAnalysis, causalModel, replication, experiments,
    actions: { reusablePatterns: replication.invariants, avoidCopying: replication.risks,
      hookRewrites: [experiments[0]?.variantA ?? source.title, experiments[0]?.variantB ?? source.title, experiments[2]?.variantB ?? source.title],
      nextExperiments: experiments.map((experiment) => `${experiment.hypothesis}｜${experiment.successCriteria}`) }
  };
}
