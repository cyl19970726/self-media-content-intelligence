import { z } from "zod";

export const creatorInventoryPostSchema = z.object({
  externalId: z.string().min(1),
  url: z.string().url(),
  title: z.string().nullable(),
  visibleText: z.string().nullable(),
  mediaType: z.enum(["video", "image", "unknown"]),
  likesLabel: z.string().nullable(),
  likes: z.number().int().nonnegative().nullable()
});

export const creatorInventorySchema = z.object({
  schemaVersion: z.literal("1.1.0"),
  runId: z.string().uuid(),
  capturedAt: z.string(),
  sourceUrl: z.string().url(),
  finalUrl: z.string().url(),
  creatorId: z.string().nullable(),
  creatorName: z.string().nullable(),
  stopReason: z.enum(["explicit_end", "quiescent_incomplete", "budget_reached"]),
  crawlDiagnostics: z.array(z.object({
    round: z.number().int().positive(),
    globalCountBefore: z.number().int().nonnegative(),
    globalCountAfter: z.number().int().nonnegative(),
    newGlobalIds: z.array(z.string()),
    heightBefore: z.number(), heightAfter: z.number(), heightDelta: z.number(),
    scrollTopBefore: z.number(), scrollTopAfter: z.number(), scrollDelta: z.number(),
    atBottom: z.boolean(), waitElapsedMs: z.number().nonnegative(), waitReason: z.string(),
    action: z.enum(["advance", "bottom_observe", "bounded_retrigger", "stop"])
  })).optional(),
  posts: z.array(creatorInventoryPostSchema),
  warnings: z.array(z.string())
});
export type CreatorInventory = z.infer<typeof creatorInventorySchema>;
export type CreatorInventoryPost = z.infer<typeof creatorInventoryPostSchema>;

const numericSummarySchema = z.object({
  min: z.number().nullable(),
  p25: z.number().nullable(),
  median: z.number().nullable(),
  mean: z.number().nullable(),
  p75: z.number().nullable(),
  max: z.number().nullable()
});

export const creatorCorpusSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().uuid(),
  generatedAt: z.string(),
  sourceArtifactRef: z.string(),
  denominator: z.object({
    discoveredPosts: z.number().int().nonnegative(),
    likesKnown: z.number().int().nonnegative(),
    likesMissing: z.number().int().nonnegative(),
    likesCoverage: z.number().min(0).max(1),
    stopReason: z.enum(["explicit_end", "quiescent_incomplete", "budget_reached"]),
    corpusCompleteness: z.enum(["observed_converged", "bounded_partial"])
  }),
  likes: numericSummarySchema,
  mediaTypes: z.record(z.number().int().nonnegative()),
  records: z.array(creatorInventoryPostSchema),
  unknowns: z.array(z.string())
});
export type CreatorCorpus = z.infer<typeof creatorCorpusSchema>;

const portfolioAnnotationFieldSchema = z.object({
  value: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1)
});

export const creatorPortfolioAnnotationRowSchema = z.object({
  postExternalId: z.string().min(1),
  sourceUrl: z.string().url(),
  title: z.string().nullable(),
  mediaType: z.enum(["video", "image", "unknown"]),
  likes: z.number().int().nonnegative().nullable(),
  classification: z.enum(["classified", "unclassified"]),
  confidence: z.enum(["medium", "low"]),
  evidenceScope: z.array(z.enum(["title", "visible_text", "public_metric", "media_type"])).min(1),
  topics: z.array(portfolioAnnotationFieldSchema),
  formats: z.array(portfolioAnnotationFieldSchema),
  audienceProblems: z.array(portfolioAnnotationFieldSchema),
  promises: z.array(portfolioAnnotationFieldSchema),
  values: z.array(portfolioAnnotationFieldSchema),
  proofModes: z.array(portfolioAnnotationFieldSchema),
  visualSignals: z.array(portfolioAnnotationFieldSchema),
  contentArchitectureSignals: z.array(portfolioAnnotationFieldSchema),
  conflicts: z.array(z.string()),
  unknowns: z.array(z.string()).min(1)
});
export type CreatorPortfolioAnnotationRow = z.infer<typeof creatorPortfolioAnnotationRowSchema>;

export const creatorPortfolioAnnotationsSchema = z.object({
  schemaVersion: z.literal("portfolio-annotations@1"),
  runId: z.string().uuid(),
  annotationRevision: z.string().min(1),
  generatedAt: z.string(),
  sourceCorpusArtifactRef: z.string().min(1),
  denominator: z.object({
    observedPosts: z.number().int().nonnegative(),
    annotatedPosts: z.number().int().nonnegative(),
    classifiedPosts: z.number().int().nonnegative(),
    unclassifiedPosts: z.number().int().nonnegative(),
    parity: z.boolean()
  }),
  rows: z.array(creatorPortfolioAnnotationRowSchema),
  boundaries: z.array(z.string()).min(1)
}).superRefine((value, context) => {
  const ids = value.rows.map((row) => row.postExternalId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "每个作品 ID 只能有一条表层标注。" });
  if (value.denominator.observedPosts !== value.rows.length
    || value.denominator.annotatedPosts !== value.rows.length
    || value.denominator.classifiedPosts + value.denominator.unclassifiedPosts !== value.rows.length
    || !value.denominator.parity) {
    context.addIssue({ code: "custom", message: "表层标注 denominator 必须与逐帖行严格一致。" });
  }
});
export type CreatorPortfolioAnnotations = z.infer<typeof creatorPortfolioAnnotationsSchema>;

export const creatorSelectionItemSchema = creatorInventoryPostSchema.extend({
  tier: z.enum(["high", "base", "low"]),
  tierRank: z.number().int().positive(),
  anchors: z.array(z.enum(["median_near", "mean_near", "typical_form"])),
  selectionReason: z.string(),
  deepCandidate: z.boolean(),
  deepGroups: z.array(z.enum(["high", "median", "mean", "low"])).default([]),
  deepState: z.literal("pending"),
  confounds: z.array(z.string())
});

export const creatorSelectionSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().uuid(),
  generatedAt: z.string(),
  sourceCorpusArtifactRef: z.string(),
  ruleVersion: z.enum(["ranked-7x3-v1", "four-groups-3-each-v2", "four-groups-video-refined-v3", "four-groups-media-refined-v4"]),
  rules: z.object({
    targetPerTier: z.literal(7),
    deepCandidatesPerTier: z.literal(3),
    deepCandidatesPerGroup: z.literal(3).optional(),
    deepGroupContract: z.string().optional(),
    high: z.string(),
    base: z.string(),
    low: z.string(),
    unknownMetricPolicy: z.literal("exclude_from_metric_tiering")
  }),
  denominator: z.object({
    discoveredPosts: z.number().int().nonnegative(),
    eligiblePosts: z.number().int().nonnegative(),
    selectedPosts: z.number().int().nonnegative(),
    excludedMissingLikes: z.number().int().nonnegative()
  }),
  anchors: z.object({
    median: z.number().nullable(),
    mean: z.number().nullable(),
    medianNearPostId: z.string().nullable(),
    meanNearPostId: z.string().nullable(),
    meanGap: z.boolean(),
    meanGapReason: z.string().nullable()
  }),
  tierCounts: z.object({ high: z.number().int(), base: z.number().int(), low: z.number().int() }),
  items: z.array(creatorSelectionItemSchema),
  limitations: z.array(z.string())
});
export type CreatorSelection = z.infer<typeof creatorSelectionSchema>;

export const creatorPortfolioAnalysisSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().uuid(),
  generatedAt: z.string(),
  corpusArtifactRef: z.string(),
  selectionArtifactRef: z.string(),
  metricCoverage: z.object({ known: z.number().int(), missing: z.number().int(), rate: z.number() }),
  likes: numericSummarySchema,
  tierCounts: z.object({ high: z.number().int(), base: z.number().int(), low: z.number().int() }),
  anchors: creatorSelectionSchema.shape.anchors,
  interpretationBoundary: z.string(),
  unknowns: z.array(z.string())
});
export type CreatorPortfolioAnalysis = z.infer<typeof creatorPortfolioAnalysisSchema>;
