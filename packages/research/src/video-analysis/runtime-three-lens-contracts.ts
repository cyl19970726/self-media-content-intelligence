import { z } from "zod";

export const contentRestorationRuleIds = ["CR-01", "CR-02", "CR-03", "CR-04", "CR-05", "CR-06"] as const;
export const directingLogicRuleIds = ["DL-01", "DL-02", "DL-03", "DL-04", "DL-05", "DL-06"] as const;
export const visualEditingRuleIds = ["VE-01", "VE-02", "VE-03", "VE-04", "VE-05", "VE-06", "VE-07"] as const;
export const runtimeThreeLensRuleIds = [
  ...contentRestorationRuleIds,
  ...directingLogicRuleIds,
  ...visualEditingRuleIds
] as const;

export const runtimeThreeLensRuleIdSchema = z.enum(runtimeThreeLensRuleIds);
export type RuntimeThreeLensRuleId = z.infer<typeof runtimeThreeLensRuleIdSchema>;

export const runtimeThreeLensArtifactRefSchema = z.object({
  kind: z.enum([
    "subtitle_cue",
    "shot",
    "frame",
    "ocr",
    "ui_state",
    "operation",
    "parameter",
    "input_output",
    "claim",
    "case",
    "counterexample",
    "limitation",
    "unknown",
    "artifact"
  ]),
  refId: z.string().min(1),
  artifactRef: z.string().min(1),
  jsonPointer: z.string().startsWith("/").optional(),
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional()
}).superRefine((reference, context) => {
  if (reference.startMs !== undefined && reference.endMs !== undefined && reference.endMs < reference.startMs) {
    context.addIssue({ code: "custom", message: "endMs must be greater than or equal to startMs" });
  }
});
export type RuntimeThreeLensArtifactRef = z.infer<typeof runtimeThreeLensArtifactRefSchema>;

export const runtimeThreeLensRuleResultSchema = z.object({
  ruleId: runtimeThreeLensRuleIdSchema,
  status: z.enum(["pass", "fail", "not_checked"]),
  finding: z.string().min(1),
  evidenceRefs: z.array(runtimeThreeLensArtifactRefSchema),
  evaluatorNotes: z.string().min(1)
}).superRefine((result, context) => {
  if (result.status === "pass" && result.evidenceRefs.length === 0) {
    context.addIssue({ code: "custom", message: "a passing rule must cite evidence" });
  }
});

export const runtimeThreeLensEvaluatorSchema = z.object({
  evaluatorId: z.string().min(1),
  evaluatorVersion: z.string().min(1),
  evaluatorRunId: z.string().uuid(),
  lens: z.enum(["content_restoration", "directing_logic", "visual_editing"]),
  evaluatedAt: z.string().datetime(),
  independentOfCandidate: z.literal(true),
  candidateRevisionFingerprint: z.string().regex(/^[a-f0-9]{64}$/)
});
export type RuntimeThreeLensEvaluator = z.infer<typeof runtimeThreeLensEvaluatorSchema>;

function exactRules<T extends readonly RuntimeThreeLensRuleId[]>(ids: T) {
  const expected = new Set<string>(ids);
  return z.array(runtimeThreeLensRuleResultSchema).length(ids.length).superRefine((rules, context) => {
    const actual = rules.map((rule) => rule.ruleId);
    if (new Set(actual).size !== actual.length) {
      context.addIssue({ code: "custom", message: "rule ids must be unique" });
    }
    const missing = ids.filter((id) => !actual.includes(id));
    const foreign = actual.filter((id) => !expected.has(id));
    if (missing.length > 0 || foreign.length > 0) {
      context.addIssue({ code: "custom", message: `rule set mismatch; missing=${missing.join(",")}; foreign=${foreign.join(",")}` });
    }
  });
}

export const contentRestorationRuleResultsSchema = exactRules(contentRestorationRuleIds);
export const directingLogicRuleResultsSchema = exactRules(directingLogicRuleIds);
export const visualEditingRuleResultsSchema = exactRules(visualEditingRuleIds);

const revisionSchema = z.object({
  algorithm: z.literal("sha256"),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reconstructionArtifactRef: z.string().min(1)
});

export const runtimeThreeLensEvaluationSchema = z.object({
  schemaVersion: z.literal("runtime-three-lens-evaluation@2"),
  postExternalId: z.string().min(1),
  candidateRevision: revisionSchema,
  lenses: z.object({
    contentRestoration: z.object({
      evaluator: runtimeThreeLensEvaluatorSchema,
      rules: contentRestorationRuleResultsSchema
    }),
    directingLogic: z.object({
      evaluator: runtimeThreeLensEvaluatorSchema,
      rules: directingLogicRuleResultsSchema
    }),
    visualEditing: z.object({
      evaluator: runtimeThreeLensEvaluatorSchema,
      rules: visualEditingRuleResultsSchema
    })
  })
}).superRefine((evaluation, context) => {
  const entries = [
    [evaluation.lenses.contentRestoration.evaluator, "content_restoration"],
    [evaluation.lenses.directingLogic.evaluator, "directing_logic"],
    [evaluation.lenses.visualEditing.evaluator, "visual_editing"]
  ] as const;
  const runIds = new Set<string>();
  for (const [evaluator, expectedLens] of entries) {
    if (evaluator.lens !== expectedLens) {
      context.addIssue({ code: "custom", message: `${expectedLens} must have its own evaluator metadata` });
    }
    if (evaluator.candidateRevisionFingerprint !== evaluation.candidateRevision.fingerprint) {
      context.addIssue({ code: "custom", message: `${expectedLens} evaluated a different candidate revision` });
    }
    runIds.add(evaluator.evaluatorRunId);
  }
  if (runIds.size !== 1) {
    context.addIssue({ code: "custom", message: "all three lenses must belong to the same independent evaluator process" });
  }
});
export type RuntimeThreeLensEvaluation = z.infer<typeof runtimeThreeLensEvaluationSchema>;

export const runtimeThreeLensGateReportSchema = z.object({
  schemaVersion: z.literal("runtime-three-lens-gate-report@1"),
  postExternalId: z.string().min(1),
  candidateRevision: revisionSchema,
  status: z.enum(["ready", "partial", "not_ready"]),
  ready: z.boolean(),
  gateCount: z.literal(19),
  passedGateIds: z.array(runtimeThreeLensRuleIdSchema),
  failedGateIds: z.array(runtimeThreeLensRuleIdSchema),
  uncheckedGateIds: z.array(runtimeThreeLensRuleIdSchema),
  evaluationArtifactRef: z.string().min(1)
}).superRefine((report, context) => {
  const covered = [...report.passedGateIds, ...report.failedGateIds, ...report.uncheckedGateIds];
  if (covered.length !== 19 || new Set(covered).size !== 19) {
    context.addIssue({ code: "custom", message: "gate report must partition all 19 runtime rules exactly once" });
  }
  const derivedReady = report.failedGateIds.length === 0 && report.uncheckedGateIds.length === 0;
  if (report.ready !== derivedReady || (report.status === "ready") !== derivedReady) {
    context.addIssue({ code: "custom", message: "ready is derived only when all 19 rules pass" });
  }
  if (report.status === "partial" && report.uncheckedGateIds.length === 0) {
    context.addIssue({ code: "custom", message: "partial requires at least one unchecked gate" });
  }
  if (report.status === "not_ready" && report.failedGateIds.length === 0) {
    context.addIssue({ code: "custom", message: "not_ready requires at least one failed gate" });
  }
});
export type RuntimeThreeLensGateReport = z.infer<typeof runtimeThreeLensGateReportSchema>;

export function deriveRuntimeThreeLensGateReport(
  evaluation: RuntimeThreeLensEvaluation,
  evaluationArtifactRef: string
): RuntimeThreeLensGateReport {
  const rules = [
    ...evaluation.lenses.contentRestoration.rules,
    ...evaluation.lenses.directingLogic.rules,
    ...evaluation.lenses.visualEditing.rules
  ];
  const passedGateIds = rules.filter((rule) => rule.status === "pass").map((rule) => rule.ruleId);
  const failedGateIds = rules.filter((rule) => rule.status === "fail").map((rule) => rule.ruleId);
  const uncheckedGateIds = rules.filter((rule) => rule.status === "not_checked").map((rule) => rule.ruleId);
  const status = failedGateIds.length > 0 ? "not_ready" : uncheckedGateIds.length > 0 ? "partial" : "ready";
  return runtimeThreeLensGateReportSchema.parse({
    schemaVersion: "runtime-three-lens-gate-report@1",
    postExternalId: evaluation.postExternalId,
    candidateRevision: evaluation.candidateRevision,
    status,
    ready: status === "ready",
    gateCount: 19,
    passedGateIds,
    failedGateIds,
    uncheckedGateIds,
    evaluationArtifactRef
  });
}

export type RuntimeThreeLensArtifactInspection =
  | { state: "ready"; evaluation: RuntimeThreeLensEvaluation; gateReport: RuntimeThreeLensGateReport }
  | { state: "partial" | "not_ready"; reason: string; evaluation: RuntimeThreeLensEvaluation | null; gateReport: RuntimeThreeLensGateReport | null };

export function inspectRuntimeThreeLensArtifacts(
  evaluationInput: unknown,
  gateReportInput: unknown,
  expectedRevisionFingerprint: string
): RuntimeThreeLensArtifactInspection {
  if (evaluationInput == null || gateReportInput == null) {
    return { state: "not_ready", reason: "runtime_three_lens_artifact_missing", evaluation: null, gateReport: null };
  }
  const parsedEvaluation = runtimeThreeLensEvaluationSchema.safeParse(evaluationInput);
  const parsedGate = runtimeThreeLensGateReportSchema.safeParse(gateReportInput);
  if (!parsedEvaluation.success || !parsedGate.success) {
    return { state: "not_ready", reason: "runtime_three_lens_artifact_invalid", evaluation: null, gateReport: null };
  }
  const evaluation = parsedEvaluation.data;
  const gateReport = parsedGate.data;
  if (
    evaluation.candidateRevision.fingerprint !== expectedRevisionFingerprint ||
    gateReport.candidateRevision.fingerprint !== expectedRevisionFingerprint ||
    gateReport.postExternalId !== evaluation.postExternalId
  ) {
    return { state: "not_ready", reason: "runtime_three_lens_revision_mismatch", evaluation, gateReport };
  }
  const derived = deriveRuntimeThreeLensGateReport(evaluation, gateReport.evaluationArtifactRef);
  if (
    derived.status !== gateReport.status ||
    derived.ready !== gateReport.ready ||
    JSON.stringify(derived.passedGateIds) !== JSON.stringify(gateReport.passedGateIds) ||
    JSON.stringify(derived.failedGateIds) !== JSON.stringify(gateReport.failedGateIds) ||
    JSON.stringify(derived.uncheckedGateIds) !== JSON.stringify(gateReport.uncheckedGateIds)
  ) {
    return { state: "not_ready", reason: "runtime_three_lens_gate_report_drift", evaluation, gateReport };
  }
  if (gateReport.ready) return { state: "ready", evaluation, gateReport };
  return {
    state: gateReport.status,
    reason: gateReport.status === "partial" ? "runtime_three_lens_unchecked" : "runtime_three_lens_failed",
    evaluation,
    gateReport
  };
}
