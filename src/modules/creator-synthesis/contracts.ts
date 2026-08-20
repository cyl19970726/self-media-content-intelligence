import { z } from "zod";

const evidenceClaimSchema = z.object({
  statement: z.string().min(1),
  factClass: z.enum(["observed", "author_claim", "inference", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()).min(1),
  caveat: z.string().nullable()
});

export const creatorSynthesisSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  creatorRunId: z.string().uuid(),
  generatedAt: z.string(),
  inputs: z.object({
    portfolioArtifactRef: z.string(),
    selectionArtifactRef: z.string(),
    detailArtifactRef: z.string(),
    reconstructionBatchArtifactRef: z.string()
  }),
  identity: z.object({
    positioning: evidenceClaimSchema,
    audience: z.array(evidenceClaimSchema).min(1),
    problemsAddressed: z.array(evidenceClaimSchema).min(1),
    valueProvided: z.array(evidenceClaimSchema).min(1),
    trustSources: z.array(evidenceClaimSchema).min(1),
    lifecycleStage: evidenceClaimSchema,
    commercialPaths: z.array(evidenceClaimSchema)
  }),
  contentSystem: z.object({
    topicClusters: z.array(evidenceClaimSchema).min(1),
    formatClusters: z.array(evidenceClaimSchema).min(1),
    visualLanguage: z.array(evidenceClaimSchema).min(1),
    publishingRhythm: z.array(evidenceClaimSchema),
    recurringStructure: z.array(evidenceClaimSchema).min(1)
  }),
  performance: z.object({
    baseline: z.array(evidenceClaimSchema).min(1),
    high: z.array(evidenceClaimSchema).min(1),
    low: z.array(evidenceClaimSchema).min(1),
    timing: z.array(evidenceClaimSchema),
    confounds: z.array(z.string()).min(1)
  }),
  postAnalyses: z.array(z.object({
    postExternalId: z.string(),
    tier: z.enum(["high", "base", "low"]),
    tierRank: z.number().int().positive(),
    title: z.string().nullable(),
    evidenceStatus: z.enum(["deep_validated", "surface_only"]),
    contentRole: z.string().min(1),
    contentForm: z.array(z.string()).min(1),
    performanceInterpretation: z.string().min(1),
    evidenceRefs: z.array(z.string()).min(1),
    unknowns: z.array(z.string())
  })).length(21),
  boundaries: z.array(z.string()).min(1)
});
export type CreatorSynthesis = z.infer<typeof creatorSynthesisSchema>;

export const creatorSynthesisGateSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  creatorRunId: z.string().uuid(),
  ready: z.boolean(),
  gates: z.array(z.object({ id: z.string(), pass: z.boolean(), message: z.string() })),
  failedGateIds: z.array(z.string()),
  checkedAt: z.string()
});
export type CreatorSynthesisGate = z.infer<typeof creatorSynthesisGateSchema>;

export type CreatorSynthesisRequest = {
  creatorRunId: string;
  creatorName: string | null;
  portfolioArtifactRef: string;
  selectionArtifactRef: string;
  detailArtifactRef: string;
  reconstructionBatchArtifactRef: string;
};

export type CreatorSynthesisOutcome =
  | { state: "ready"; synthesisArtifactRef: string; gateArtifactRef: string }
  | { state: "not_ready"; synthesisArtifactRef: string | null; gateArtifactRef: string | null; failedGateIds: string[]; message: string }
  | { state: "blocked"; message: string; userActionRequired: boolean };

export interface CreatorSynthesisExecutor {
  synthesize(request: CreatorSynthesisRequest): Promise<CreatorSynthesisOutcome>;
}
