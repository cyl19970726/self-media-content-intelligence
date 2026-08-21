import { z } from "zod";

export const learningLoopStatusSchema = z.enum([
  "draft",
  "sampling",
  "creator_running",
  "video_evaluating",
  "blind_testing",
  "diagnosing",
  "repair_queued",
  "regression_testing",
  "observation_adjudicating",
  "promoted",
  "completed_no_promotion",
  "blocked",
  "failed",
  "stale"
]);

export const learningLoopCaseRoleSchema = z.enum(["development", "holdout"]);
export const learningLoopLensSchema = z.enum([
  "content_restoration",
  "directing_logic",
  "visual_editing_logic"
]);
export const learningLoopArtifactKindSchema = z.enum([
  "source",
  "capture",
  "candidate",
  "evaluator",
  "audit",
  "blind_trace",
  "diagnosis",
  "repair",
  "regression",
  "meta_evaluation",
  "adjudication"
]);
export const learningLoopGateKindSchema = z.enum([
  "source_integrity",
  "content_restoration",
  "directing_logic",
  "visual_editing_logic",
  "blind_input_isolation",
  "blind_traceability",
  "blind_quality",
  "regression",
  "untouched_holdout",
  "meta_coverage",
  "observation_adjudication"
]);

export const learningLoopCaseSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  role: learningLoopCaseRoleSchema,
  creatorId: z.string().min(1),
  videoId: z.string().min(1),
  sourceRevisionId: z.string().min(1),
  sourceHash: z.string().min(1),
  untouched: z.boolean(),
  createdAt: z.string().datetime()
});

export const learningLoopArtifactSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  caseId: z.string().min(1).nullable(),
  kind: learningLoopArtifactKindSchema,
  uri: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  parentArtifactIds: z.array(z.string().min(1)),
  createdAt: z.string().datetime()
});

export const learningLoopGateSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  caseId: z.string().min(1).nullable(),
  kind: learningLoopGateKindSchema,
  pass: z.boolean(),
  evaluatorId: z.string().min(1),
  evaluatorVersion: z.string().min(1),
  evidenceArtifactIds: z.array(z.string().min(1)).min(1),
  reasons: z.array(z.string().min(1)),
  passedChecks: z.number().int().nonnegative(),
  requiredChecks: z.number().int().positive(),
  createdAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.pass !== (value.passedChecks === value.requiredChecks)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "gate pass must equal complete check coverage" });
  }
});

export const learningLoopBlindTraceSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  caseId: z.string().min(1),
  inputArtifactIds: z.array(z.string().min(1)).min(1),
  allowedKinds: z.array(learningLoopArtifactKindSchema).min(1),
  outputArtifactId: z.string().min(1).nullable(),
  leakageKinds: z.array(learningLoopArtifactKindSchema),
  pass: z.boolean().nullable(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable()
});

export const learningLoopDiagnosisSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  blindTraceIds: z.array(z.string().min(1)).min(1),
  failureClosures: z.array(z.string().min(1)),
  proposedRepairs: z.array(z.string().min(1)),
  artifactId: z.string().min(1),
  createdAt: z.string().datetime()
});

export const learningLoopRegressionSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  repairedCaseIds: z.array(z.string().min(1)),
  untouchedHoldoutCaseIds: z.array(z.string().min(1)).min(1),
  regressionGateId: z.string().min(1),
  holdoutGateId: z.string().min(1),
  metaGateId: z.string().min(1),
  artifactId: z.string().min(1),
  createdAt: z.string().datetime()
});

export const learningLoopObservationAdjudicationSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  observationId: z.string().min(1),
  decision: z.enum(["promote", "reject", "defer"]),
  eligible: z.boolean(),
  rationale: z.string().min(1),
  adjudicatorId: z.string().min(1),
  artifactId: z.string().min(1),
  createdAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.eligible !== (value.decision === "promote")) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "only a promote adjudication may be eligible" });
  }
});

export const learningLoopRunSchema = z.object({
  id: z.string().min(1),
  status: learningLoopStatusSchema,
  policyVersion: z.string().min(1),
  inputHash: z.string().min(1),
  upstreamHashes: z.record(z.string(), z.string().min(1)),
  targetCreatorIds: z.array(z.string().min(1)).min(1),
  cases: z.array(learningLoopCaseSchema),
  artifacts: z.array(learningLoopArtifactSchema),
  gates: z.array(learningLoopGateSchema),
  blindTraces: z.array(learningLoopBlindTraceSchema),
  diagnoses: z.array(learningLoopDiagnosisSchema),
  regressions: z.array(learningLoopRegressionSchema),
  observationAdjudications: z.array(learningLoopObservationAdjudicationSchema),
  pendingObservationIds: z.array(z.string().min(1)),
  blockedReason: z.string().min(1).nullable(),
  failureReason: z.string().min(1).nullable(),
  staleReason: z.string().min(1).nullable(),
  revision: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((run, context) => {
  const duplicateIds = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
  const duplicates = [
    ...duplicateIds(run.cases.map((item) => item.id)),
    ...duplicateIds(run.artifacts.map((item) => item.id)),
    ...duplicateIds(run.gates.map((item) => item.id)),
    ...duplicateIds(run.blindTraces.map((item) => item.id)),
    ...duplicateIds(run.diagnoses.map((item) => item.id)),
    ...duplicateIds(run.regressions.map((item) => item.id)),
    ...duplicateIds(run.observationAdjudications.map((item) => item.id))
  ];
  if (duplicates.length) context.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate lineage ids: ${[...new Set(duplicates)].join(",")}` });
  const caseIds = new Set(run.cases.map((item) => item.id));
  const artifactIds = new Set(run.artifacts.map((item) => item.id));
  const gateIds = new Set(run.gates.map((item) => item.id));
  const traceIds = new Set(run.blindTraces.map((item) => item.id));
  for (const item of run.cases) if (item.runId !== run.id) context.addIssue({ code: z.ZodIssueCode.custom, message: `case ${item.id} belongs to another run` });
  for (const artifact of run.artifacts) {
    if (artifact.runId !== run.id || (artifact.caseId && !caseIds.has(artifact.caseId))) context.addIssue({ code: z.ZodIssueCode.custom, message: `invalid artifact ownership: ${artifact.id}` });
    for (const parentId of artifact.parentArtifactIds) if (!artifactIds.has(parentId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `missing artifact parent: ${parentId}` });
  }
  const parentsByArtifact = new Map(run.artifacts.map((item) => [item.id, item.parentArtifactIds]));
  const visit = (id: string, ancestors: Set<string>): boolean => {
    if (ancestors.has(id)) return true;
    const next = new Set(ancestors).add(id);
    return (parentsByArtifact.get(id) ?? []).some((parentId) => visit(parentId, next));
  };
  if (run.artifacts.some((item) => visit(item.id, new Set()))) context.addIssue({ code: z.ZodIssueCode.custom, message: "artifact lineage must be acyclic" });
  for (const gate of run.gates) {
    if (gate.runId !== run.id || (gate.caseId && !caseIds.has(gate.caseId))) context.addIssue({ code: z.ZodIssueCode.custom, message: `invalid gate ownership: ${gate.id}` });
    for (const artifactId of gate.evidenceArtifactIds) if (!artifactIds.has(artifactId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `missing gate evidence: ${artifactId}` });
  }
  for (const trace of run.blindTraces) {
    if (trace.runId !== run.id || !caseIds.has(trace.caseId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `invalid blind trace ownership: ${trace.id}` });
    for (const artifactId of trace.inputArtifactIds) if (!artifactIds.has(artifactId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `missing blind input: ${artifactId}` });
    if (trace.outputArtifactId && !artifactIds.has(trace.outputArtifactId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `missing blind output: ${trace.outputArtifactId}` });
  }
  for (const diagnosis of run.diagnoses) {
    if (diagnosis.runId !== run.id || !artifactIds.has(diagnosis.artifactId) || diagnosis.blindTraceIds.some((id) => !traceIds.has(id))) context.addIssue({ code: z.ZodIssueCode.custom, message: `invalid diagnosis lineage: ${diagnosis.id}` });
  }
  for (const regression of run.regressions) {
    if (regression.runId !== run.id || !artifactIds.has(regression.artifactId) || !gateIds.has(regression.regressionGateId) || !gateIds.has(regression.holdoutGateId) || !gateIds.has(regression.metaGateId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `invalid regression lineage: ${regression.id}` });
  }
  for (const decision of run.observationAdjudications) if (decision.runId !== run.id || !artifactIds.has(decision.artifactId)) context.addIssue({ code: z.ZodIssueCode.custom, message: `invalid adjudication lineage: ${decision.id}` });
});

export type LearningLoopStatus = z.infer<typeof learningLoopStatusSchema>;
export type LearningLoopCase = z.infer<typeof learningLoopCaseSchema>;
export type LearningLoopArtifact = z.infer<typeof learningLoopArtifactSchema>;
export type LearningLoopGate = z.infer<typeof learningLoopGateSchema>;
export type LearningLoopBlindTrace = z.infer<typeof learningLoopBlindTraceSchema>;
export type LearningLoopDiagnosis = z.infer<typeof learningLoopDiagnosisSchema>;
export type LearningLoopRegression = z.infer<typeof learningLoopRegressionSchema>;
export type LearningLoopObservationAdjudication = z.infer<typeof learningLoopObservationAdjudicationSchema>;
export type LearningLoopRun = z.infer<typeof learningLoopRunSchema>;
