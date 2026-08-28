import { z } from "zod";
import { ingestAnalysisRevisionSchema, researchConceptReadSchema } from "../../contracts/index.js";

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
  createdAt: z.string().datetime(),
  decidedAt: z.string().datetime().nullable()
});

export const compileKnowledgeInputSchema = z.object({
  operationKey: z.string().min(1),
  compilerPolicyVersion: z.string().min(1),
  inputFingerprint: z.string().min(1),
  analysis: ingestAnalysisRevisionSchema
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

export const practiceValidationSchema = z.object({
  id: z.string().uuid(),
  publicationRunId: z.string().uuid(),
  contentPackageId: z.string().uuid(),
  contentPackageSnapshotId: z.string().min(1),
  variantRevision: z.number().int().positive(),
  hypothesisId: z.string().uuid(),
  status: z.enum(["draft", "evidence_ready", "adjudication_pending", "completed_no_promotion", "promoted", "blocked", "invalidated"]),
  observedSignals: z.array(observedSignalSchema),
  executionDeviations: z.array(z.string().min(1)),
  confounders: z.array(z.string().min(1)),
  proposedRelation: z.enum(["confirm", "qualify", "contradict", "inconclusive"]).nullable(),
  targetConceptId: z.string().nullable(),
  decisionReason: z.string().nullable(),
  promotedObservationId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createPracticeValidationInputSchema = practiceValidationSchema.pick({
  publicationRunId: true, contentPackageId: true, contentPackageSnapshotId: true, variantRevision: true,
  hypothesisId: true, observedSignals: true, executionDeviations: true, confounders: true
}).extend({ operationKey: z.string().min(1) });

export const submitPracticeValidationInputSchema = z.object({
  operationKey: z.string().min(1),
  proposedRelation: z.enum(["confirm", "qualify", "contradict", "inconclusive"]),
  targetConceptId: z.string().nullable(),
  decisionReason: z.string().min(1)
});

export const knowledgeConceptViewSchema = z.object({
  maturity: knowledgeMaturitySchema,
  research: researchConceptReadSchema,
  edges: z.array(semanticEdgeSchema),
  bindings: z.array(knowledgeBindingSchema)
});

export const knowledgeGapSchema = z.object({
  code: z.string(), severity: z.enum(["info", "attention", "blocked"]), conceptId: z.string().nullable(), message: z.string()
});

export type KnowledgeContribution = z.infer<typeof knowledgeContributionSchema>;
export type KnowledgeContributionManifest = z.infer<typeof knowledgeContributionManifestSchema>;
export type CompileKnowledgeInput = z.infer<typeof compileKnowledgeInputSchema>;
export type SemanticEdge = z.infer<typeof semanticEdgeSchema>;
export type KnowledgeBinding = z.infer<typeof knowledgeBindingSchema>;
export type CreationHypothesis = z.infer<typeof creationHypothesisSchema>;
export type PracticeValidation = z.infer<typeof practiceValidationSchema>;
export type KnowledgeConceptView = z.infer<typeof knowledgeConceptViewSchema>;
export type KnowledgeGap = z.infer<typeof knowledgeGapSchema>;
