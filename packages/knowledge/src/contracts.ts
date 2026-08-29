import { z } from "zod";
import { ingestAnalysisRevisionSchema, researchConceptReadSchema, researchConditionSchema } from "../../contracts/index.js";

export const knowledgeMaturitySchema = z.enum([
  "raw_fact", "single_post_observation", "creator_pattern", "conditional_pattern",
  "track_wide_pattern", "creation_hypothesis", "first_party_validation_result"
]);

export const knowledgeManifestStatusSchema = z.enum([
  "staged", "accepted", "accepted_no_new_knowledge", "quarantined", "legacy_unverified", "invalidated"
]);

export const knowledgeContributionSchema = z.object({
  id: z.string().uuid(),
  manifestId: z.string().uuid(),
  disposition: z.enum(["create_concept", "confirm", "qualify", "contradict", "quarantined"]),
  targetConceptId: z.string().nullable(),
  createdConceptId: z.string().nullable(),
  observationId: z.string().nullable(),
  candidateStatement: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)),
  decisionReason: z.string().min(1)
});

export const knowledgeContributionManifestSchema = z.object({
  id: z.string().uuid(),
  subjectType: z.enum(["video", "creator", "comparison"]),
  subjectId: z.string().min(1),
  analysisRevisionId: z.string().min(1),
  compilerPolicyVersion: z.string().min(1),
  inputFingerprint: z.string().min(1),
  status: knowledgeManifestStatusSchema,
  contributionIds: z.array(z.string().uuid()),
  quarantineReasons: z.array(z.string().min(1)),
  promotionDecisions: z.array(z.object({
    conceptId: z.string().min(1).nullable(),
    conceptSlug: z.string().min(1),
    targetScope: z.enum(["creator_specific", "conditional", "track_wide"]),
    status: z.enum(["promoted", "already_promoted", "gate_failed", "concept_missing"]),
    reason: z.string().min(1)
  })).default([]),
  createdAt: z.string().datetime(),
  decidedAt: z.string().datetime().nullable()
});

export const compileKnowledgeInputSchema = z.object({
  operationKey: z.string().min(1),
  compilerPolicyVersion: z.string().min(1),
  inputFingerprint: z.string().min(1),
  evidenceGate: z.array(z.object({
    ref: z.string().min(1),
    availability: z.enum(["available", "pending_retrieval", "missing", "unauthorized", "integrity_failed"])
  })).default([]),
  promotionRequests: z.array(z.object({
    conceptSlug: z.string().min(1),
    targetScope: z.enum(["creator_specific", "conditional", "track_wide"]),
    creatorId: z.string().min(1).optional(),
    condition: researchConditionSchema.partial().optional(),
    comparableCreatorIds: z.array(z.string().min(1)).optional(),
    decision: z.string().min(1)
  })).default([]),
  analysis: ingestAnalysisRevisionSchema
});

export const legacyKnowledgeManifestInputSchema = z.object({
  operationKey: z.string().min(1),
  subjectType: z.enum(["video", "creator", "comparison"]),
  subjectId: z.string().min(1),
  analysisRevisionId: z.string().min(1),
  inputFingerprint: z.string().min(1),
  reason: z.string().min(1)
});

export const semanticEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceConceptId: z.string().min(1),
  sourceRevisionId: z.string().min(1),
  relation: z.enum(["depends_on", "combines_with", "competes_with", "special_case_of", "supersedes"]),
  targetConceptId: z.string().min(1),
  targetRevisionId: z.string().min(1),
  status: z.enum(["proposed", "active", "invalidated"]),
  provenanceRefs: z.array(z.string().min(1)).min(1),
  policyVersion: z.string().min(1),
  decisionReason: z.string().min(1),
  createdAt: z.string().datetime()
});

export const adjudicateSemanticEdgeInputSchema = semanticEdgeSchema.omit({ id: true, createdAt: true }).extend({
  operationKey: z.string().min(1)
});

export const knowledgeBindingSchema = z.object({
  id: z.string().uuid(),
  contentPackageId: z.string().uuid(),
  contentPackageSnapshotId: z.string().min(1),
  targetType: z.enum(["concept_revision", "analysis_revision", "evidence"]),
  targetId: z.string().min(1),
  usage: z.enum(["adopt", "adapt", "reject", "test"]),
  rationale: z.string().min(1),
  status: z.enum(["current", "stale_available", "invalidated"]),
  createdAt: z.string().datetime()
});

export const createKnowledgeBindingInputSchema = knowledgeBindingSchema.omit({ id: true, status: true, createdAt: true }).extend({
  operationKey: z.string().min(1)
});

export const creationHypothesisSchema = z.object({
  id: z.string().uuid(),
  contentPackageId: z.string().uuid(),
  contentPackageSnapshotId: z.string().min(1),
  statement: z.string().min(1),
  linkedBindingIds: z.array(z.string().uuid()).min(1),
  expectedSignals: z.array(z.string().min(1)).min(1),
  unavailableSignals: z.array(z.string().min(1)),
  baselineDeclaration: z.string().min(1),
  confounders: z.array(z.string().min(1)),
  createdAt: z.string().datetime()
});

export const createHypothesisInputSchema = creationHypothesisSchema.omit({ id: true, createdAt: true }).extend({
  operationKey: z.string().min(1)
});

export const observedSignalSchema = z.object({
  name: z.string().min(1), value: z.number(), unit: z.string().min(1), source: z.string().min(1), collectedAt: z.string().datetime()
});

export const unavailableMetricSchema = z.object({
  name: z.string().min(1),
  reason: z.string().min(1),
  source: z.string().min(1),
  recordedAt: z.string().datetime()
});

export const practiceHypothesisSnapshotSchema = z.object({
  statement: z.string().min(1),
  expectedSignals: z.array(z.string().min(1)),
  unavailableSignals: z.array(z.string().min(1)),
  baselineDeclaration: z.string().min(1),
  confounders: z.array(z.string().min(1))
});

export const practiceExecutionSnapshotSchema = z.object({
  status: z.enum(["published", "draft_saved", "legacy_unverified"]),
  receipt: z.object({
    externalId: z.string().nullable(), externalUrl: z.string().nullable(), platformState: z.string().min(1), verifiedAt: z.string().min(1)
  }).nullable()
});

export const practiceValidationSchema = z.object({
  id: z.string().uuid(),
  publicationRunId: z.string().uuid(),
  contentPackageId: z.string().uuid(),
  contentPackageSnapshotId: z.string().min(1),
  variantId: z.string().uuid().nullable().default(null),
  variantRevision: z.number().int().positive(),
  hypothesisId: z.string().uuid(),
  hypothesisSnapshot: practiceHypothesisSnapshotSchema.nullable().default(null),
  executionSnapshot: practiceExecutionSnapshotSchema.nullable().default(null),
  status: z.enum(["draft", "evidence_ready", "adjudication_pending", "completed_no_promotion", "promoted", "blocked", "invalidated"]),
  observedSignals: z.array(observedSignalSchema),
  unavailableMetrics: z.array(unavailableMetricSchema).default([]),
  executionDeviations: z.array(z.string().min(1)),
  confounders: z.array(z.string().min(1)),
  proposedRelation: z.enum(["confirm", "qualify", "contradict", "inconclusive"]).nullable(),
  targetConceptId: z.string().nullable(),
  targetConceptRevisionId: z.string().nullable().default(null),
  decisionReason: z.string().nullable(),
  submittedBy: z.string().min(1).nullable().default(null),
  submittedAt: z.string().datetime().nullable().default(null),
  adjudicationDecision: z.enum(["promote", "complete_no_promotion", "block", "invalidate"]).nullable().default(null),
  adjudicatedBy: z.string().min(1).nullable().default(null),
  adjudicationReason: z.string().min(1).nullable().default(null),
  adjudicatedAt: z.string().datetime().nullable().default(null),
  promotedObservationId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createPracticeValidationInputSchema = practiceValidationSchema.pick({
  publicationRunId: true, contentPackageId: true, contentPackageSnapshotId: true, variantId: true, variantRevision: true,
  hypothesisId: true, executionSnapshot: true, observedSignals: true, unavailableMetrics: true,
  executionDeviations: true, confounders: true
}).extend({ operationKey: z.string().min(1) });

export const submitPracticeValidationInputSchema = z.object({
  operationKey: z.string().min(1),
  proposedRelation: z.enum(["confirm", "qualify", "contradict", "inconclusive"]),
  targetConceptId: z.string().nullable(),
  decisionReason: z.string().min(1),
  submittedBy: z.string().min(1)
});

export const adjudicatePracticeValidationInputSchema = z.object({
  operationKey: z.string().min(1),
  decision: z.enum(["promote", "complete_no_promotion", "block", "invalidate"]).optional(),
  promote: z.boolean().optional(),
  reason: z.string().min(1),
  adjudicatorId: z.string().min(1)
}).superRefine((value, context) => {
  if (!value.decision && value.promote === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "adjudication decision is required" });
  }
  if (value.decision && value.promote !== undefined) {
    const legacyDecision = value.promote ? "promote" : "complete_no_promotion";
    if (value.decision !== legacyDecision) context.addIssue({ code: z.ZodIssueCode.custom, message: "adjudication decision conflicts with promote" });
  }
});

export const knowledgeConceptViewSchema = z.object({
  maturity: knowledgeMaturitySchema,
  research: researchConceptReadSchema,
  edges: z.array(semanticEdgeSchema),
  bindings: z.array(knowledgeBindingSchema),
  contributions: z.array(z.object({
    manifest: knowledgeContributionManifestSchema,
    contribution: knowledgeContributionSchema
  }))
});

export const knowledgeGapSchema = z.object({
  id: z.string().min(1),
  code: z.enum([
    "unresolved-contradiction", "orphan-concept", "missing-condition", "missing-exclusions",
    "obsolete-semantic-edge", "affected-creation-binding", "missing-contribution-manifest"
  ]),
  severity: z.enum(["info", "attention", "blocked"]),
  subjectType: z.enum(["concept", "analysis_revision", "semantic_edge", "knowledge_binding"]),
  subjectId: z.string().min(1),
  conceptId: z.string().nullable(),
  message: z.string().min(1),
  suggestedAction: z.string().min(1),
  lineageRefs: z.array(z.string().min(1))
});

export const knowledgeInvalidationCommandSchema = z.object({
  operationKey: z.string().min(1),
  targetType: z.enum(["analysis_revision", "evidence"]),
  targetId: z.string().min(1),
  reason: z.string().min(1),
  actorId: z.string().min(1)
});

export const knowledgeInvalidationRecordSchema = z.object({
  id: z.string().uuid(),
  operationKey: z.string().min(1),
  targetType: z.enum(["analysis_revision", "evidence"]),
  targetId: z.string().min(1),
  reason: z.string().min(1),
  actorId: z.string().min(1),
  affectedAnalysisRevisionIds: z.array(z.string().min(1)),
  affectedObservationIds: z.array(z.string().min(1)),
  affectedConceptIds: z.array(z.string().min(1)),
  affectedManifestIds: z.array(z.string().uuid()),
  affectedEdgeIds: z.array(z.string().uuid()),
  affectedBindingIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime()
});

export type KnowledgeContribution = z.infer<typeof knowledgeContributionSchema>;
export type KnowledgeContributionManifest = z.infer<typeof knowledgeContributionManifestSchema>;
export type CompileKnowledgeInput = z.input<typeof compileKnowledgeInputSchema>;
export type LegacyKnowledgeManifestInput = z.infer<typeof legacyKnowledgeManifestInputSchema>;
export type SemanticEdge = z.infer<typeof semanticEdgeSchema>;
export type KnowledgeBinding = z.infer<typeof knowledgeBindingSchema>;
export type CreationHypothesis = z.infer<typeof creationHypothesisSchema>;
export type PracticeValidation = z.infer<typeof practiceValidationSchema>;
export type KnowledgeConceptView = z.infer<typeof knowledgeConceptViewSchema>;
export type KnowledgeGap = z.infer<typeof knowledgeGapSchema>;
export type KnowledgeInvalidationCommand = z.infer<typeof knowledgeInvalidationCommandSchema>;
export type KnowledgeInvalidationRecord = z.infer<typeof knowledgeInvalidationRecordSchema>;
