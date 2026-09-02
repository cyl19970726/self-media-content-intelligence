import { z } from "zod";
import { creatorResearchRunSchema, dataHealthSchema } from "./schema.js";
import { creatorResearchPipelineSchema } from "./creator-pipeline.js";
import { missingPostSourceFacts, postSourceFactsSchema } from "./post-source-facts.js";

export const researchStatementSchema = z.object({
  statement: z.string(),
  factClass: z.enum(["observed", "author_claim", "inference", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()),
  caveat: z.string().nullable()
});

export const portfolioClusterSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(1).nullable(),
  measuredCount: z.number().int().nonnegative(),
  medianLikes: z.number().nonnegative().nullable(),
  meanLikes: z.number().nonnegative().nullable(),
  maxLikes: z.number().nonnegative().nullable(),
  highCount: z.number().int().nonnegative().nullable(),
  interpretation: z.string().nullable(),
  evidenceRefs: z.array(z.string())
});

export const creatorDossierItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceHref: z.string(),
  evidenceHref: z.string().nullable(),
  coverHref: z.string().nullable(),
  tier: z.enum(["high", "base", "low"]),
  tierRank: z.number().int().positive(),
  anchors: z.array(z.enum(["median_near", "mean_near", "typical_form"])),
  deepSample: z.boolean(),
  likes: z.number().nonnegative().nullable(),
  collections: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable(),
  percentileRank: z.number().min(0).max(100).nullable(),
  publishedLabel: z.string().nullable(),
  durationSeconds: z.number().nonnegative().nullable(),
  topic: z.string().nullable(),
  format: z.string().nullable(),
  coreContent: z.string().nullable(),
  contentArchitecture: z.array(z.string()),
  mechanismHypothesis: z.string().nullable(),
  selectionReason: z.string(),
  evidenceStatus: z.enum(["deep_validated", "deep_built", "deep_pending", "surface_only", "missing"]),
  sourceFacts: postSourceFactsSchema.default(missingPostSourceFacts)
});

export const creatorDossierSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  canonicalId: z.string(),
  source: z.enum(["versioned_run", "legacy_adapter", "inventory_snapshot"]),
  generatedAt: z.string(),
  run: creatorResearchRunSchema.nullable(),
  pipeline: creatorResearchPipelineSchema.optional(),
  lastGood: z.object({
    active: z.boolean(),
    reason: z.string().nullable(),
    revisionLabel: z.string().nullable()
  }),
  identity: z.object({
    name: z.string(),
    profileHref: z.string(),
    positioning: researchStatementSchema,
    audience: z.array(researchStatementSchema),
    valuesProvided: z.array(researchStatementSchema),
    trustSources: z.array(researchStatementSchema),
    lifecycle: researchStatementSchema,
    commercialPaths: z.array(researchStatementSchema)
  }),
  corpus: z.object({
    postCount: z.number().int().nonnegative(),
    likesKnown: z.number().int().nonnegative(),
    coverageRate: z.number().min(0).max(1),
    medianLikes: z.number().nonnegative().nullable(),
    meanLikes: z.number().nonnegative().nullable(),
    maxLikes: z.number().nonnegative().nullable(),
    videoCount: z.number().int().nonnegative().nullable(),
    highCount: z.number().int().nonnegative().nullable(),
    percentiles: z.object({ p10: z.number().nullable(), p25: z.number().nullable(), p75: z.number().nullable(), p90: z.number().nullable() }),
    distribution: z.array(z.object({ label: z.string(), count: z.number().int().nonnegative(), share: z.number() })),
    notes: z.array(z.string()),
    health: dataHealthSchema,
    annotationCoverage: z.object({
      observedPosts: z.number().int().nonnegative(),
      annotatedPosts: z.number().int().nonnegative(),
      classifiedPosts: z.number().int().nonnegative(),
      unclassifiedPosts: z.number().int().nonnegative(),
      artifactRef: z.string()
    }).nullable().default(null)
  }),
  contentSystem: z.object({
    topicClusters: z.array(portfolioClusterSchema),
    formatClusters: z.array(portfolioClusterSchema),
    topics: z.array(researchStatementSchema),
    formats: z.array(researchStatementSchema),
    visualLanguage: z.array(researchStatementSchema),
    recurringStructures: z.array(researchStatementSchema),
    health: dataHealthSchema
  }),
  tiers: z.array(z.object({
    id: z.enum(["high", "base", "low"]),
    label: z.string(),
    conclusion: z.array(researchStatementSchema),
    mechanisms: z.array(researchStatementSchema),
    failurePatterns: z.array(researchStatementSchema),
    metrics: z.object({ medianLikes: z.number().nullable(), meanLikes: z.number().nullable(), minLikes: z.number().nullable(), maxLikes: z.number().nullable() }),
    count: z.number().int().nonnegative()
  })).length(3),
  portfolio: z.object({
    items: z.array(creatorDossierItemSchema),
    deepCount: z.number().int().nonnegative(),
    health: dataHealthSchema
  }),
  rhythm: z.object({
    statements: z.array(researchStatementSchema),
    weekdays: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative(), medianLikes: z.number().nullable() })),
    dayparts: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative(), medianLikes: z.number().nullable() })),
    health: dataHealthSchema
  }),
  audienceDemand: z.object({ statements: z.array(researchStatementSchema), health: dataHealthSchema }),
  growthEngines: z.object({ statements: z.array(researchStatementSchema), health: dataHealthSchema }),
  businessPath: z.object({ statements: z.array(researchStatementSchema), health: dataHealthSchema }),
  boundaries: z.array(z.string())
});

export type ResearchStatement = z.infer<typeof researchStatementSchema>;
export type CreatorDossier = z.infer<typeof creatorDossierSchema>;
