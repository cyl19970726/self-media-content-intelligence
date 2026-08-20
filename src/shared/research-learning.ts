import { z } from "zod";

export const researchConceptKindSchema = z.enum([
  "content_mechanism",
  "directing_device",
  "visual_grammar",
  "proof_mode",
  "failure_mode",
  "value_mode",
  "condition"
]);

export const researchConceptScopeSchema = z.enum([
  "video_specific",
  "creator_specific",
  "conditional",
  "track_wide"
]);

export const researchConceptStatusSchema = z.enum([
  "candidate",
  "active",
  "qualified",
  "contradicted",
  "invalidated",
  "retired"
]);

export const researchObservationRelationSchema = z.enum(["confirm", "qualify", "contradict"]);
export const researchObservationGateStateSchema = z.enum(["eligible", "quarantined", "invalid"]);
export const researchSourceGateStateSchema = z.enum(["ready", "partial", "not_ready", "stale", "invalid"]);

export const researchConditionSchema = z.object({
  tier: z.enum(["high", "base", "low"]).nullable().default(null),
  topic: z.string().min(1).nullable().default(null),
  format: z.string().min(1).nullable().default(null),
  era: z.string().min(1).nullable().default(null),
  audienceProblem: z.string().min(1).nullable().default(null),
  proofContext: z.string().min(1).nullable().default(null)
});

export const researchConceptSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  kind: researchConceptKindSchema,
  name: z.string().min(1),
  scope: researchConceptScopeSchema,
  status: researchConceptStatusSchema,
  currentRevisionId: z.string().min(1),
  createdAt: z.string().datetime()
});

export const researchObservationSchema = z.object({
  id: z.string().min(1),
  conceptId: z.string().min(1),
  conceptRevisionId: z.string().min(1),
  subjectType: z.enum(["video", "creator", "comparison"]),
  subjectId: z.string().min(1),
  creatorId: z.string().min(1).nullable(),
  videoId: z.string().min(1).nullable(),
  relation: researchObservationRelationSchema,
  condition: researchConditionSchema,
  statement: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  analysisRevisionId: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  sourceGateState: researchSourceGateStateSchema,
  gateState: researchObservationGateStateSchema,
  deepReconstruction: z.boolean(),
  createdAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.subjectType === "video" && (!value.creatorId || !value.videoId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "video observations require creatorId and videoId" });
  }
});

export const researchConceptRevisionSchema = z.object({
  id: z.string().min(1),
  conceptId: z.string().min(1),
  revision: z.number().int().positive(),
  parentRevisionId: z.string().min(1).nullable(),
  changeType: z.enum(["create", "confirm", "qualify", "contradict", "promote", "demote", "invalidate", "restore", "retire"]),
  definition: z.string().min(1),
  exclusions: z.array(z.string().min(1)).min(1),
  condition: researchConditionSchema,
  decision: z.string().min(1),
  eligibleObservationIds: z.array(z.string()),
  excludedObservationIds: z.array(z.object({ id: z.string(), reason: z.string().min(1) })),
  scopeBefore: researchConceptScopeSchema.nullable(),
  scopeAfter: researchConceptScopeSchema,
  statusAfter: researchConceptStatusSchema,
  createdAt: z.string().datetime()
});

export const researchDependentConclusionSchema = z.object({
  id: z.string().min(1),
  conceptIds: z.array(z.string().min(1)).min(1),
  statement: z.string().min(1),
  status: z.enum(["current", "stale_available", "invalidated"]),
  staleReason: z.string().nullable()
});

export const researchConceptReadSchema = z.object({
  concept: researchConceptSchema,
  currentRevision: researchConceptRevisionSchema,
  revisions: z.array(researchConceptRevisionSchema),
  observations: z.array(researchObservationSchema),
  counts: z.object({
    confirm: z.number().int().nonnegative(),
    qualify: z.number().int().nonnegative(),
    contradict: z.number().int().nonnegative(),
    quarantined: z.number().int().nonnegative(),
    invalid: z.number().int().nonnegative(),
    distinctEligibleVideos: z.number().int().nonnegative(),
    distinctEligibleCreators: z.number().int().nonnegative()
  }),
  dependentConclusions: z.array(researchDependentConclusionSchema)
});

export const analysisLensGateStateSchema = z.enum(["ready", "partial", "stale", "invalid"]);

export const ingestAnalysisRevisionSchema = z.object({
  analysisRevisionId: z.string().min(1),
  subjectType: z.enum(["video", "creator", "comparison"]),
  subjectId: z.string().min(1),
  creatorId: z.string().min(1).nullable(),
  videoId: z.string().min(1).nullable(),
  deepReconstruction: z.boolean().default(false),
  lensGates: z.object({
    contentRestoration: analysisLensGateStateSchema,
    directingLogic: analysisLensGateStateSchema,
    visualEditingLogic: analysisLensGateStateSchema
  }),
  observations: z.array(z.object({
    conceptId: z.string().min(1).optional(),
    concept: z.object({
      slug: z.string().min(1),
      kind: researchConceptKindSchema,
      name: z.string().min(1),
      definition: z.string().min(1),
      exclusions: z.array(z.string().min(1)).min(1)
    }).optional(),
    relation: researchObservationRelationSchema,
    condition: researchConditionSchema.partial().optional(),
    statement: z.string().min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    confidence: z.enum(["low", "medium", "high"])
  }).superRefine((value, context) => {
    if (!value.conceptId && !value.concept) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "observation requires conceptId or concept definition" });
    }
  }))
});

export type ResearchConceptKind = z.infer<typeof researchConceptKindSchema>;
export type ResearchConceptScope = z.infer<typeof researchConceptScopeSchema>;
export type ResearchConceptStatus = z.infer<typeof researchConceptStatusSchema>;
export type ResearchCondition = z.infer<typeof researchConditionSchema>;
export type ResearchConcept = z.infer<typeof researchConceptSchema>;
export type ResearchObservation = z.infer<typeof researchObservationSchema>;
export type ResearchConceptRevision = z.infer<typeof researchConceptRevisionSchema>;
export type ResearchDependentConclusion = z.infer<typeof researchDependentConclusionSchema>;
export type ResearchConceptRead = z.infer<typeof researchConceptReadSchema>;
export type AnalysisLensGateState = z.infer<typeof analysisLensGateStateSchema>;
export type IngestAnalysisRevision = z.infer<typeof ingestAnalysisRevisionSchema>;
