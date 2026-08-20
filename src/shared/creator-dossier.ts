import { z } from "zod";
import { creatorResearchRunSchema, dataHealthSchema } from "./schema.js";

export const researchStatementSchema = z.object({
  statement: z.string(),
  factClass: z.enum(["observed", "author_claim", "inference", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()),
  caveat: z.string().nullable()
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
  publishedLabel: z.string().nullable(),
  durationSeconds: z.number().nonnegative().nullable(),
  topic: z.string().nullable(),
  format: z.string().nullable(),
  coreContent: z.string().nullable(),
  contentArchitecture: z.array(z.string()),
  mechanismHypothesis: z.string().nullable(),
  selectionReason: z.string(),
  evidenceStatus: z.enum(["deep_validated", "deep_pending", "surface_only", "missing"])
});

export const creatorDossierSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  canonicalId: z.string(),
  source: z.enum(["versioned_run", "legacy_adapter"]),
  generatedAt: z.string(),
  run: creatorResearchRunSchema.nullable(),
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
    distribution: z.array(z.object({ label: z.string(), count: z.number().int().nonnegative(), share: z.number() })),
    health: dataHealthSchema
  }),
  contentSystem: z.object({
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
