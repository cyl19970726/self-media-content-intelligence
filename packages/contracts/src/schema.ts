import { z } from "zod";

export const platformSchema = z.enum(["xiaohongshu", "x"]);
export type Platform = z.infer<typeof platformSchema>;

export const runStatusSchema = z.enum([
  "queued",
  "running",
  "complete",
  "partial",
  "blocked",
  "failed"
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const stageStatusSchema = z.enum([
  "pending",
  "running",
  "complete",
  "partial",
  "blocked",
  "failed"
]);

export const stageRecordSchema = z.object({
  id: z.enum(["collect", "media", "analyze"]),
  label: z.string(),
  status: stageStatusSchema,
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  message: z.string().nullable(),
  artifactRefs: z.array(z.string())
});

export const metricSchema = z.object({
  views: z.number().nonnegative().nullable(),
  likes: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable(),
  bookmarks: z.number().nonnegative().nullable(),
  quotes: z.number().nonnegative().nullable(),
  followers: z.number().nonnegative().nullable()
});
export type Metrics = z.infer<typeof metricSchema>;

export const derivedMetricsSchema = z.object({
  engagementRate: z.number().nullable(),
  deepValueRate: z.number().nullable(),
  conversationRate: z.number().nullable(),
  amplificationRate: z.number().nullable()
});
export type DerivedMetrics = z.infer<typeof derivedMetricsSchema>;

export const comparablePostSchema = z.object({
  id: z.string(),
  title: z.string(),
  authorName: z.string(),
  sourceUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
  source: z.enum(["author", "topic"]),
  metrics: metricSchema
});
export type ComparablePost = z.infer<typeof comparablePostSchema>;

export const contextSnapshotSchema = z.object({
  status: z.enum(["ready", "partial", "unavailable"]),
  query: z.string().nullable(),
  authorPosts: z.array(comparablePostSchema),
  topicPosts: z.array(comparablePostSchema),
  notes: z.array(z.string()),
  rawArtifactRefs: z.array(z.string())
});
export type ContextSnapshot = z.infer<typeof contextSnapshotSchema>;

export const mediaItemSchema = z.object({
  kind: z.enum(["image", "video", "unknown"]),
  url: z.string().nullable(),
  localPath: z.string().nullable(),
  mimeType: z.string().nullable()
});
export type MediaItem = z.infer<typeof mediaItemSchema>;

export const commentSchema = z.object({
  id: z.string(),
  author: z.string().nullable(),
  text: z.string(),
  likes: z.number().nullable()
});
export type Comment = z.infer<typeof commentSchema>;

export const sourceSnapshotSchema = z.object({
  platform: platformSchema,
  sourceUrl: z.string(),
  externalId: z.string(),
  retrievedAt: z.string(),
  author: z.object({
    id: z.string().nullable(),
    handle: z.string().nullable(),
    name: z.string(),
    followers: z.number().nullable(),
    avatarUrl: z.string().nullable()
  }),
  title: z.string(),
  text: z.string(),
  publishedAt: z.string().nullable(),
  tags: z.array(z.string()),
  metrics: metricSchema,
  media: z.array(mediaItemSchema),
  comments: z.array(commentSchema),
  rawArtifactRef: z.string().nullable()
});
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;

export const transcriptSegmentSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string()
});

export const shotSchema = z.object({
  id: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  frameRef: z.string().nullable(),
  transcript: z.string(),
  function: z.enum(["hook", "context", "proof", "turn", "payoff", "cta", "unknown"]),
  observation: z.string(),
  boundaryReason: z.enum(["scene-change", "duration-fallback", "single-scene"]).default("duration-fallback"),
  onScreenText: z.array(z.string()).default([])
});

export const mediaBreakdownSchema = z.object({
  durationSeconds: z.number().nonnegative().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  hasAudio: z.boolean().nullable(),
  contactSheetRef: z.string().nullable(),
  transcript: z.array(transcriptSegmentSchema),
  shots: z.array(shotSchema),
  sceneDetectionMethod: z.string().default("unknown"),
  cutsPerMinute: z.number().nonnegative().nullable().default(null),
  averageShotSeconds: z.number().nonnegative().nullable().default(null),
  speechWordsPerMinute: z.number().nonnegative().nullable().default(null),
  silenceRatio: z.number().min(0).max(1).nullable().default(null)
});
export type MediaBreakdown = z.infer<typeof mediaBreakdownSchema>;

export const findingSchema = z.object({
  id: z.string(),
  title: z.string(),
  statement: z.string(),
  grade: z.enum(["fact", "observation", "inference"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string())
});
export type Finding = z.infer<typeof findingSchema>;

const evidenceCoverageSchema = z.object({
  percent: z.number().min(0).max(100),
  available: z.array(z.string()),
  missing: z.array(z.string()),
  warnings: z.array(z.string()),
  tiers: z.array(z.object({
    id: z.enum(["public", "comparative", "owner"]),
    label: z.string(),
    status: z.enum(["ready", "partial", "missing"]),
    note: z.string()
  }))
});

const benchmarkMetricSchema = z.object({
  key: z.enum(["likes", "comments", "shares", "bookmarks", "quotes", "views"]),
  label: z.string(),
  subject: z.number().nullable(),
  authorMedian: z.number().nullable(),
  topicMedian: z.number().nullable(),
  authorPercentile: z.number().min(0).max(100).nullable(),
  topicPercentile: z.number().min(0).max(100).nullable()
});

const benchmarkAnalysisSchema = z.object({
  status: z.enum(["ready", "partial", "unavailable"]),
  authorSampleSize: z.number().int().nonnegative(),
  topicSampleSize: z.number().int().nonnegative(),
  metrics: z.array(benchmarkMetricSchema),
  verdict: z.string(),
  caveat: z.string()
});

const dataIndicatorSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number().nullable(),
  unit: z.enum(["percent", "multiple", "per-thousand", "per-day"]),
  numerator: z.number().nullable(),
  denominator: z.number().nullable(),
  formula: z.string(),
  status: z.enum(["ready", "partial", "unavailable"]),
  interpretation: z.string()
});

const interactionMixItemSchema = z.object({
  key: z.enum(["likes", "comments", "shares", "bookmarks", "quotes"]),
  label: z.string(),
  value: z.number().nullable(),
  sharePercent: z.number().min(0).max(100).nullable(),
  perThousandViews: z.number().nonnegative().nullable(),
  authorLift: z.number().nonnegative().nullable(),
  topicLift: z.number().nonnegative().nullable()
});

const dataAnalysisSchema = z.object({
  status: z.enum(["ready", "partial", "unavailable"]),
  totalInteractions: z.number().nonnegative().nullable(),
  highIntentInteractions: z.number().nonnegative().nullable(),
  knownMetricCount: z.number().int().nonnegative(),
  expectedMetricCount: z.number().int().positive(),
  completenessPercent: z.number().min(0).max(100),
  ageDays: z.number().nonnegative().nullable(),
  interactionMix: z.array(interactionMixItemSchema),
  indicators: z.array(dataIndicatorSchema),
  headline: z.string(),
  caveats: z.array(z.string())
});

const packagingAnalysisSchema = z.object({
  promise: z.string(),
  audience: z.string(),
  tension: z.string(),
  specificitySignals: z.array(z.string()),
  searchSignals: z.array(z.string()),
  titlePattern: z.string(),
  evidenceRefs: z.array(z.string())
});

const scriptSegmentAnalysisSchema = z.object({
  id: z.string(),
  function: z.enum(["hook", "problem", "mechanism", "proof", "payoff", "cta"]),
  text: z.string(),
  source: z.enum(["transcript", "post-copy"]),
  start: z.number().nonnegative().nullable(),
  end: z.number().nonnegative().nullable(),
  evidenceRef: z.string()
});

const scriptAnalysisSchema = z.object({
  source: z.enum(["transcript", "post-copy", "unavailable"]),
  wordCount: z.number().int().nonnegative(),
  estimatedReadSeconds: z.number().nonnegative().nullable(),
  informationUnits: z.number().int().nonnegative(),
  claimCount: z.number().int().nonnegative(),
  proofCount: z.number().int().nonnegative(),
  claimProofRatio: z.number().nonnegative().nullable(),
  rhetoricalDevices: z.array(z.string()),
  segments: z.array(scriptSegmentAnalysisSchema),
  diagnosis: z.string()
});

const audienceThemeSchema = z.object({
  id: z.string(),
  label: z.string(),
  intent: z.enum(["approval", "question", "implementation", "objection", "follow-up", "other"]),
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(100),
  examples: z.array(z.string()),
  evidenceRefs: z.array(z.string())
});

const audienceAnalysisSchema = z.object({
  sampleSize: z.number().int().nonnegative(),
  weightedSampleLikes: z.number().nonnegative(),
  themes: z.array(audienceThemeSchema),
  unansweredQuestions: z.array(z.string()),
  objections: z.array(z.string()),
  nextContentDemand: z.array(z.string()),
  caveat: z.string()
});

const causalNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  mechanism: z.string(),
  status: z.enum(["supported", "plausible", "unknown", "contradicted"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()),
  counterEvidence: z.array(z.string()),
  alternativeExplanations: z.array(z.string())
});

const qualityStatusSchema = z.enum(["strong", "mixed", "weak", "unknown"]);
const qualityDimensionIdSchema = z.enum([
  "source", "scale", "retention", "depth", "fit", "conversion", "durability", "negative"
]);
const ratioBenchmarkSchema = z.object({
  id: z.string(),
  label: z.string(),
  subject: z.number().nullable(),
  authorMedian: z.number().nullable(),
  topicMedian: z.number().nullable(),
  liftVsAuthorPercent: z.number().nullable(),
  liftVsTopicPercent: z.number().nullable(),
  status: qualityStatusSchema
});
const qualityDimensionSchema = z.object({
  id: qualityDimensionIdSchema,
  label: z.string(),
  status: qualityStatusSchema,
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string(),
  metrics: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  missing: z.array(z.string())
});
const objectiveProfileSchema = z.object({
  id: z.enum(["awareness", "growth", "authority", "conversion"]),
  label: z.string(),
  requiredDimensions: z.array(qualityDimensionIdSchema),
  verdict: z.string()
});
const trafficQualitySchema = z.object({
  defaultObjective: z.enum(["awareness", "growth", "authority", "conversion"]),
  verdict: z.string(),
  ratioBenchmarks: z.array(ratioBenchmarkSchema),
  dimensions: z.array(qualityDimensionSchema),
  objectiveProfiles: z.array(objectiveProfileSchema)
});

const creatorAnalysisSchema = z.object({
  status: z.enum(["ready", "partial", "unavailable"]),
  sampleSize: z.number().int().nonnegative(),
  medianInteractions: z.number().nonnegative().nullable(),
  topTwentySharePercent: z.number().min(0).max(100).nullable(),
  hitRatePercent: z.number().min(0).max(100).nullable(),
  medianCadenceDays: z.number().nonnegative().nullable(),
  stability: z.enum(["stable", "mixed", "volatile", "unknown"]),
  pillars: z.array(z.object({ label: z.string(), postCount: z.number().int().positive(), medianInteractions: z.number().nonnegative().nullable() })),
  repeatableSignals: z.array(z.string()),
  outliers: z.array(z.object({ id: z.string(), title: z.string(), direction: z.enum(["high", "low"]), interactions: z.number().nonnegative().nullable(), multipleOfMedian: z.number().nonnegative().nullable() })),
  verdict: z.string(),
  limitations: z.array(z.string())
});

const reportV2Schema = z.object({
  evidenceCoverage: evidenceCoverageSchema,
  context: contextSnapshotSchema,
  benchmark: benchmarkAnalysisSchema,
  dataAnalysis: dataAnalysisSchema,
  packaging: packagingAnalysisSchema,
  scriptAnalysis: scriptAnalysisSchema,
  audienceAnalysis: audienceAnalysisSchema,
  causalModel: z.array(causalNodeSchema),
  trafficQuality: trafficQualitySchema,
  creatorAnalysis: creatorAnalysisSchema
});
export type ReportV2 = z.infer<typeof reportV2Schema>;

export function emptyContext(): ContextSnapshot {
  return { status: "unavailable", query: null, authorPosts: [], topicPosts: [], notes: [], rawArtifactRefs: [] };
}

export function emptyReportV2(): ReportV2 {
  return {
    evidenceCoverage: { percent: 0, available: [], missing: [], warnings: [], tiers: [
      { id: "public", label: "公开内容证据", status: "missing", note: "等待采集" },
      { id: "comparative", label: "作者与竞品基线", status: "missing", note: "等待采集" },
      { id: "owner", label: "账号后台数据", status: "missing", note: "未导入" }
    ] },
    context: emptyContext(),
    benchmark: { status: "unavailable", authorSampleSize: 0, topicSampleSize: 0, metrics: [], verdict: "没有基线，不能判断是否异常。", caveat: "等待上下文数据。" },
    dataAnalysis: { status: "unavailable", totalInteractions: null, highIntentInteractions: null, knownMetricCount: 0, expectedMetricCount: 6,
      completenessPercent: 0, ageDays: null, interactionMix: [], indicators: [], headline: "等待公开指标。", caveats: [] },
    packaging: { promise: "等待分析", audience: "等待分析", tension: "等待分析", specificitySignals: [], searchSignals: [], titlePattern: "等待分析", evidenceRefs: [] },
    scriptAnalysis: { source: "unavailable", wordCount: 0, estimatedReadSeconds: null, informationUnits: 0, claimCount: 0, proofCount: 0, claimProofRatio: null, rhetoricalDevices: [], segments: [], diagnosis: "等待分析" },
    audienceAnalysis: { sampleSize: 0, weightedSampleLikes: 0, themes: [], unansweredQuestions: [], objections: [], nextContentDemand: [], caveat: "等待评论证据。" },
    causalModel: [],
    trafficQuality: {
      defaultObjective: "authority",
      verdict: "证据尚未形成流量质量判断。",
      ratioBenchmarks: [],
      dimensions: [],
      objectiveProfiles: []
    },
    creatorAnalysis: { status: "unavailable", sampleSize: 0, medianInteractions: null, topTwentySharePercent: null,
      hitRatePercent: null, medianCadenceDays: null, stability: "unknown", pillars: [], repeatableSignals: [], outliers: [],
      verdict: "尚未取得博主主页样本。", limitations: ["需要作者主页与至少 5 条公开笔记。"] }
  };
}

export const reportEnvelopeSchema = z.object({
  schemaVersion: z.enum(["1.0.0", "2.0.0"]),
  id: z.string().uuid(),
  sourceUrl: z.string(),
  shareTitle: z.string().nullable().default(null),
  platform: platformSchema,
  status: runStatusSchema,
  currentStage: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stages: z.array(stageRecordSchema),
  source: sourceSnapshotSchema.nullable(),
  mediaBreakdown: mediaBreakdownSchema.nullable(),
  derivedMetrics: derivedMetricsSchema,
  executiveSummary: z.string(),
  findings: z.array(findingSchema),
  limitations: z.array(z.string())
}).and(reportV2Schema.partial()).transform((report) => ({ ...emptyReportV2(), ...report }));
export type ReportEnvelope = z.infer<typeof reportEnvelopeSchema>;

export const runSummarySchema = z.object({
  id: z.string().uuid(),
  sourceUrl: z.string(),
  platform: platformSchema,
  status: runStatusSchema,
  currentStage: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  executiveSummary: z.string(),
  title: z.string(),
  authorName: z.string()
});
export type RunSummary = z.infer<typeof runSummarySchema>;

export const createRunInputSchema = z.object({
  url: z.string().min(1),
  localVideoPath: z.string().optional()
});

export const parsedSourceSchema = z.object({
  platform: platformSchema,
  sourceUrl: z.string(),
  externalId: z.string(),
  xsecToken: z.string().nullable(),
  shareTitle: z.string().nullable().default(null),
  fixture: z.boolean()
});
export type ParsedSource = z.infer<typeof parsedSourceSchema>;

export const creatorResearchStatusSchema = z.enum([
  "queued",
  "preflight",
  "collecting",
  "needs_user",
  "backoff",
  "reviewable",
  "ready",
  "failed",
  "stale"
]);
export type CreatorResearchStatus = z.infer<typeof creatorResearchStatusSchema>;

export const creatorResearchStageIdSchema = z.enum([
  "preflight",
  "inventory",
  "tiering",
  "deep_capture",
  "synthesis",
  "dashboard"
]);

export const creatorResearchStageSchema = z.object({
  id: creatorResearchStageIdSchema,
  label: z.string(),
  status: z.enum(["pending", "running", "complete", "blocked", "failed", "skipped"]),
  message: z.string().nullable()
});

export const creatorResearchWorkerStateSchema = z.enum([
  "queued",
  "leased",
  "running",
  "needs_user",
  "backoff",
  "succeeded",
  "failed"
]);

const creatorResearchWorkerSchema = z.object({
  state: creatorResearchWorkerStateSchema,
  attempt: z.number().int().nonnegative(),
  jobId: z.string().uuid().nullable(),
  workerId: z.string().nullable(),
  lastHeartbeatAt: z.string().nullable()
});

export const creatorAcquisitionAdapterSchema = z.enum(["ego-browser", "redfox"]);
export type CreatorAcquisitionAdapter = z.infer<typeof creatorAcquisitionAdapterSchema>;

export const creatorResearchRunSchema = z.object({
  schemaVersion: z.enum(["1.0.0", "1.1.0", "1.2.0", "1.3.0"]),
  id: z.string().uuid(),
  platform: z.literal("xiaohongshu"),
  profileUrl: z.string().url(),
  status: creatorResearchStatusSchema,
  currentStage: creatorResearchStageIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  creatorId: z.string().nullable(),
  creatorName: z.string().nullable(),
  canonicalSlug: z.string().nullable().optional(),
  source: z.object({
    kind: z.enum(["live_collection", "legacy_import"]),
    sourceRefs: z.array(z.string()),
    importedAt: z.string().nullable()
  }).default({ kind: "live_collection", sourceRefs: [], importedAt: null }),
  publicProfile: z.object({
    bio: z.string().nullable(),
    followers: z.number().int().nonnegative().nullable(),
    likesAndCollections: z.number().int().nonnegative().nullable(),
    displayedPostCount: z.number().int().nonnegative().nullable(),
    identityAnchors: z.array(z.object({ kind: z.string(), value: z.string(), source: z.string() }))
  }).default({ bio: null, followers: null, likesAndCollections: null, displayedPostCount: null, identityAnchors: [] }),
  dashboardPath: z.string().nullable(),
  stages: z.array(creatorResearchStageSchema),
  coverage: z.object({
    discoveredPosts: z.number().int().nonnegative(),
    enrichedPosts: z.number().int().nonnegative(),
    comparisonPosts: z.number().int().nonnegative(),
    reconstructedPosts: z.number().int().nonnegative()
  }),
  collectionPolicy: z.object({
    adapter: creatorAcquisitionAdapterSchema.default("ego-browser"),
    browserProfile: z.literal("hhh-01").nullable().default("hhh-01"),
    readOnly: z.literal(true),
    incremental: z.literal(true),
    bypassChallenges: z.literal(false),
    cacheTtlHours: z.number().int().positive(),
    budgets: z.object({
      maxScrollRounds: z.number().int().positive(),
      maxDetailOpens: z.number().int().positive(),
      maxMediaDownloads: z.number().int().nonnegative()
    })
  }),
  blockers: z.array(z.object({
    code: z.string(),
    message: z.string(),
    userActionRequired: z.boolean()
  })),
  nextAction: z.string(),
  lastSnapshotAt: z.string().nullable(),
  worker: creatorResearchWorkerSchema.default({
    state: "queued",
    attempt: 0,
    jobId: null,
    workerId: null,
    lastHeartbeatAt: null
  }),
  videoWork: z.object({
    concurrencyLimit: z.number().int().min(1).max(3),
    activePostExternalIds: z.array(z.string()),
    queuedPosts: z.number().int().nonnegative(),
    analyzedPosts: z.number().int().nonnegative(),
    failedPosts: z.number().int().nonnegative()
  }).default({
    concurrencyLimit: 3,
    activePostExternalIds: [],
    queuedPosts: 0,
    analyzedPosts: 0,
    failedPosts: 0
  }),
  inventoryArtifactRef: z.string().nullable().default(null),
  portfolioAnnotationsArtifactRef: z.string().nullable().optional(),
  portfolioArtifactRef: z.string().nullable().default(null),
  selectionArtifactRef: z.string().nullable().default(null),
  detailArtifactRef: z.string().nullable().default(null),
  mediaManifestArtifactRef: z.string().nullable().default(null),
  reconstructionBatchArtifactRef: z.string().nullable().default(null),
  synthesisArtifactRef: z.string().nullable().default(null),
  synthesisGateArtifactRef: z.string().nullable().default(null),
  browserTaskSpaceId: z.number().int().positive().nullable().default(null)
});
export type CreatorResearchRun = z.infer<typeof creatorResearchRunSchema>;

export const creatorResearchEventSchema = z.object({
  sequence: z.number().int().positive(),
  runId: z.string().uuid(),
  jobId: z.string().uuid().nullable(),
  type: z.enum([
    "run.created",
    "job.queued",
    "job.leased",
    "node.started",
    "node.progress",
    "child.started",
    "child.progress",
    "child.stale",
    "child.completed",
    "child.failed",
    "handoff.required",
    "artifact.produced",
    "node.completed",
    "run.reviewable",
    "run.failed",
    "run.resumed"
  ]),
  createdAt: z.string(),
  message: z.string(),
  payload: z.record(z.unknown())
});
export type CreatorResearchEvent = z.infer<typeof creatorResearchEventSchema>;

function isSupportedCreatorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "xhslink.cn") return url.pathname.length > 1;
    if (url.hostname === "xiaohongshu.com" || url.hostname.endsWith(".xiaohongshu.com")) {
      return url.pathname.startsWith("/user/profile/");
    }
    return false;
  } catch {
    return false;
  }
}

export const createCreatorResearchRunInputSchema = z.object({
  profileUrl: z.string().trim().min(1, "请粘贴小红书博主主页链接").refine(
    isSupportedCreatorUrl,
    "请使用小红书博主主页链接，或 xhslink.cn 的主页分享链接"
  ),
  adapter: creatorAcquisitionAdapterSchema.default("ego-browser")
});

export const creatorDiscoveryCandidateSchema = z.object({
  creatorId: z.string().min(1),
  creatorName: z.string().min(1),
  profileUrl: z.string().url(),
  avatarUrl: z.string().url().nullable(),
  matchedKeywords: z.array(z.string()),
  observedNotes: z.number().int().positive(),
  observedLikes: z.number().int().nonnegative(),
  observedCollections: z.number().int().nonnegative(),
  observedComments: z.number().int().nonnegative(),
  observedForwards: z.number().int().nonnegative(),
  videoNotes: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
  scoreExplanation: z.array(z.string()),
  representativeNotes: z.array(z.object({
    noteId: z.string(), title: z.string().nullable(), url: z.string().url(), keyword: z.string(),
    likes: z.number().int().nonnegative(), collections: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(), forwards: z.number().int().nonnegative(),
    mediaType: z.enum(["video", "image", "unknown"])
  })).max(3)
});
export type CreatorDiscoveryCandidate = z.infer<typeof creatorDiscoveryCandidateSchema>;

export const creatorDiscoveryResultSchema = z.object({
  provider: z.literal("redfox"),
  capturedAt: z.string(),
  keywords: z.array(z.string()),
  requestsUsed: z.number().int().nonnegative(),
  estimatedCostCny: z.number().nonnegative(),
  candidates: z.array(creatorDiscoveryCandidateSchema),
  limitations: z.array(z.string())
});
export type CreatorDiscoveryResult = z.infer<typeof creatorDiscoveryResultSchema>;

export const discoverCreatorsInputSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(30)).min(1).max(8).optional(),
  pagesPerKeyword: z.number().int().min(1).max(2).default(1),
  limit: z.number().int().min(1).max(30).default(12)
});

export const creatorSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  followers: z.string(),
  likesAndCollections: z.string(),
  profileUrl: z.string(),
  positioning: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  stats: z.array(z.object({ label: z.string(), value: z.string() })),
  entries: z.array(z.object({ label: z.string(), href: z.string(), note: z.string().optional() }))
});
export type CreatorSummary = z.infer<typeof creatorSummarySchema>;

export const tierVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  likes: z.number(),
  collections: z.number(),
  publishedLabel: z.string().nullable(),
  cover: z.string().nullable(),
  selected: z.boolean(),
  archetype: z.string().nullable()
});
export type TierVideo = z.infer<typeof tierVideoSchema>;

export const tierSchema = z.object({
  id: z.enum(["high", "base", "low"]),
  name: z.string(),
  conclusion: z.string(),
  videos: z.array(tierVideoSchema)
});

export const distributionBucketSchema = z.object({ label: z.string(), count: z.number(), share: z.number() });

export const contentMapItemSchema = z.object({
  name: z.string(),
  signal: z.string().nullable(),
  mechanism: z.string().nullable()
});

export const dataHealthSchema = z.object({
  status: z.enum(["full", "partial", "missing"]),
  reason: z.string(),
  capturedAt: z.string().nullable()
});
export type DataHealth = z.infer<typeof dataHealthSchema>;

export const creatorConsoleSchema = z.object({
  meta: z.object({
    id: z.string(),
    name: z.string(),
    positioning: z.string(),
    profileUrl: z.string(),
    followers: z.string(),
    likesAndCollections: z.string(),
    capturedAt: z.string().nullable()
  }),
  baseline: z.object({
    postCount: z.number(),
    medianLikes: z.number(),
    meanLikes: z.number(),
    maxLikes: z.number(),
    distribution: z.array(distributionBucketSchema),
    averageNote: z.string().nullable()
  }).nullable(),
  baselineHealth: dataHealthSchema.nullable(),
  tiers: z.array(tierSchema),
  contentMap: z.object({ slotName: z.string(), items: z.array(contentMapItemSchema) }),
  rhythm: z.object({
    conclusion: z.string(),
    weekdays: z.array(z.object({ name: z.string(), count: z.number(), medianLikes: z.number().nullable() })),
    dayparts: z.array(z.object({ name: z.string(), count: z.number(), medianLikes: z.number().nullable() }))
  }).nullable(),
  rhythmHealth: dataHealthSchema.nullable(),
  boundaries: z.array(z.string()),
  evidenceLinks: z.array(z.object({ label: z.string(), href: z.string(), count: z.number() }))
});
export type CreatorConsole = z.infer<typeof creatorConsoleSchema>;

export const benchmarkIpSchema = z.object({
  id: z.string(),
  name: z.string(),
  sampleSize: z.number(),
  aggregateCollectionToLike: z.number(),
  medianLikes: z.number()
});
export const benchmarkSchema = z.object({
  metric: z.string(),
  metricNote: z.string(),
  ips: z.array(benchmarkIpSchema),
  findings: z.array(z.object({ kind: z.enum(["track", "ip", "gap"]), text: z.string() }))
});
export type Benchmark = z.infer<typeof benchmarkSchema>;

export const videoEvidenceSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  title: z.string(),
  lead: z.string(),
  architecture: z.string().nullable(),
  engagement: z.object({ likes: z.number(), collections: z.number(), comments: z.number(), shares: z.number() }).nullable(),
  frames: z.array(z.object({ id: z.string(), time: z.string().nullable(), src: z.string() })),
  cues: z.array(z.object({ id: z.string(), start: z.number().nullable(), text: z.string(), frame: z.string().nullable() })),
  knowledgeUnits: z.array(z.object({ id: z.string(), title: z.string(), statement: z.string() })),
  unknowns: z.array(z.string()),
  sourceLabel: z.string(),
  reportHref: z.string().nullable()
});
export type VideoEvidence = z.infer<typeof videoEvidenceSchema>;
