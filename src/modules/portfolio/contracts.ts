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
  ruleVersion: z.enum(["ranked-7x3-v1", "four-groups-3-each-v2", "four-groups-video-refined-v3"]),
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
