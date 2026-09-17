import { workflow, type ArtifactRef, type WorkflowContext, type WorkflowDefinition } from "../../../workflow/index.js";
import type { ResearchAgentDefinitions } from "./agents.js";
import type {
  CreatorSynthesisEvaluationReceipt, CreatorSynthesisReceipt, CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput,
  PostCandidateReceipt, PostEvaluationReceipt, PostWorkflowInput, PostWorkflowOutput,
} from "./contracts.js";
import { createCreatorSynthesisWorkflowSuite, type CreatorSynthesisWorkflowValidators } from "./creator-synthesis.js";
import { createPostWorkflowSuite, type PostWorkflowValidators } from "./post.js";
import { researchReviewReceiptSchema, revisionResponseSchema, type CandidateStatus, type ResearchReviewReceipt, type ReviewStatus } from "./simple-review-contract.js";

type CandidateReceipt = PostCandidateReceipt | CreatorSynthesisReceipt;
type LegacyReviewReceipt = PostEvaluationReceipt | CreatorSynthesisEvaluationReceipt;
export type SimpleSourceCheckOutput = { ok: true; artifact: ArtifactRef; receipt: { artifact: { verdict: "consistent" | "conflict" | "uncertain" } } } |
  { ok: false; state: "blocked" | "needs_review"; details: unknown };
type RegistrationSource = PostWorkflowInput | CreatorSynthesisWorkflowInput;

export type SimpleRegistrationInput = {
  registrationKey: string;
  registeredBy: { workflowRunId: string; stepRunId: string; attemptId: string };
  source: RegistrationSource;
  candidate: ArtifactRef;
  candidateReceipt: CandidateReceipt;
  review?: ArtifactRef;
  reviewReceipt?: LegacyReviewReceipt;
  revisionRecord?: ArtifactRef;
  reviewStatus: ReviewStatus;
  candidateStatus: CandidateStatus;
};

export type SimplePostWorkflowSuiteOptions = {
  sourceCheck?: WorkflowDefinition<PostWorkflowInput, SimpleSourceCheckOutput>;
  registerCandidate?: (input: SimpleRegistrationInput) => Promise<unknown>;
};
export type SimpleCreatorWorkflowSuiteOptions = {
  registerCandidate?: (input: SimpleRegistrationInput) => Promise<unknown>;
};

type SimpleReviewOutput = { ok: true; review: ArtifactRef; receipt: ResearchReviewReceipt; legacyReceipt: LegacyReviewReceipt } |
  { ok: false; state: "needs_review"; details: unknown };
type SimpleRepairOutput = { ok: true; candidate: ArtifactRef; receipt: CandidateReceipt; revisionRecord: ArtifactRef } |
  { ok: false; state: "needs_review"; details: unknown };

function deps(...refs: ArtifactRef[]) {
  return refs.map((ref) => ({ artifactId: ref.id, revision: ref.revision, sha256: ref.sha256 }));
}
function candidateBindingMatches(receipt: ResearchReviewReceipt, candidate: ArtifactRef, kind: "post" | "creator") {
  return receipt.kind === kind && receipt.candidate.id === candidate.id && receipt.candidate.revision === candidate.revision &&
    receipt.candidate.sha256 === candidate.sha256;
}
function revisionResponse(value: CandidateReceipt, findings: ResearchReviewReceipt["findings"]) {
  const parsed = revisionResponseSchema.safeParse((value.artifact as { revisionResponse?: unknown } | null)?.revisionResponse);
  if (!parsed.success) return { valid: false as const, details: parsed.error.flatten() };
  const ids = new Set(parsed.data.map((entry) => entry.id));
  const missing = findings.filter((finding) => !ids.has(finding.id)).map((finding) => finding.id);
  const unexpected = parsed.data.filter((entry) => !findings.some((finding) => finding.id === entry.id)).map((entry) => entry.id);
  const duplicates = parsed.data.filter((entry, index) => parsed.data.findIndex((other) => other.id === entry.id) !== index).map((entry) => entry.id);
  return missing.length || unexpected.length || duplicates.length ? { valid: false as const, details: { kind: "revision_response_findings_mismatch", missing, unexpected, duplicates } } :
    { valid: true as const, value: parsed.data };
}

async function register(ctx: Pick<WorkflowContext, "task">, callback: SimplePostWorkflowSuiteOptions["registerCandidate"],
  input: RegistrationSource, candidate: ArtifactRef, candidateReceipt: CandidateReceipt, review: ArtifactRef | undefined,
  reviewReceipt: LegacyReviewReceipt | undefined, revisionRecord: ArtifactRef | undefined,
  reviewStatus: ReviewStatus, candidateStatus: CandidateStatus) {
  if (!callback) return;
  await ctx.task("register-candidate", async (_: null, execution: { runId: string; stepRunId: string; attemptId: string }) => callback({
    registrationKey: `${execution.runId}:${execution.stepRunId}`, registeredBy: { workflowRunId: execution.runId,
      stepRunId: execution.stepRunId, attemptId: execution.attemptId }, source: input, candidate, candidateReceipt,
    review, reviewReceipt, revisionRecord, reviewStatus, candidateStatus,
  }), null);
}

async function retryReview<Input>(ctx: WorkflowContext, key: string, definition: WorkflowDefinition<Input, SimpleReviewOutput>, input: Input) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const settled = await ctx.mapSettled(`${key}:attempt:${attempt + 1}`, [attempt], { concurrency: 1, itemKey: (value: number) => String(value) },
      () => ctx.call(`${key}:${attempt + 1}`, definition, input));
    const result = settled[0]!;
    if (result.status === "fulfilled" && result.value.ok) return result.value;
  }
  return undefined;
}
async function settledCall<Input, Output>(ctx: WorkflowContext, key: string, definition: WorkflowDefinition<Input, Output>, input: Input) {
  const settled = await ctx.mapSettled(`${key}:attempt:1`, [0], { concurrency: 1, itemKey: String },
    () => ctx.call(`${key}:1`, definition, input));
  const result = settled[0];
  if (!result) throw new Error("settled child call returned no result");
  return result;
}

export function createPostWorkflowSuiteV5(validators: PostWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "postBuilder" | "postReviewer" | "postRepair" | "postEvaluationRepair">,
  options: SimplePostWorkflowSuiteOptions = {}) {
  const legacy = createPostWorkflowSuite(validators, agents);
  const review = workflow<{ candidate: ArtifactRef; evidence: ArtifactRef }, SimpleReviewOutput>("post.review", { revision: "v2" }, async (ctx, input) => {
    const produced = await ctx.agent("reviewer", agents.postReviewer, { candidate: input.candidate, evidence: input.evidence });
    const parsed = researchReviewReceiptSchema.safeParse(produced.artifact);
    if (!parsed.success || !candidateBindingMatches(parsed.data, input.candidate, "post") ||
      (produced.candidateRevisionSha256 !== undefined && produced.candidateRevisionSha256 !== parsed.data.candidateReportSha256)) return ctx.needsReview({
      kind: "review_contract", candidate: input.candidate, produced, checked: parsed.success ? "candidate_binding_mismatch" : parsed.error.flatten(),
    }) as SimpleReviewOutput;
    const reviewArtifact = await ctx.publish("receipt", "post-review", parsed.data, { schemaVersion: parsed.data.schemaVersion,
      dependsOn: deps(input.candidate, input.evidence), validation: "valid", review: parsed.data.findings.length ? "findings" : "passed" });
    return { ok: true, review: reviewArtifact, receipt: parsed.data, legacyReceipt: produced };
  });
  const repair = workflow<{ candidate: ArtifactRef; evidence: ArtifactRef; findings: ResearchReviewReceipt["findings"]; review: ArtifactRef }, SimpleRepairOutput>("post.repair", { revision: "v2" }, async (ctx, input) => {
    const produced = await ctx.agent("repair", agents.postRepair, { candidate: input.candidate, evidence: input.evidence, findings: input.findings, review: input.review });
    const checked = await ctx.validate("candidate-check", produced, validators.candidate);
    const response = revisionResponse(produced, input.findings);
    if (!checked.valid || !response.valid) return ctx.needsReview({ kind: "revision_contract", candidate: input.candidate, review: input.review, produced, checked, response }) as SimpleRepairOutput;
    const candidate = await ctx.publish("candidate", "post-candidate", produced.artifact, { schemaVersion: "v1", dependsOn: deps(input.candidate, input.review), validation: "valid", review: "pending" });
    const revisionRecord = await ctx.publish("revision-record", "research-revision", { schemaVersion: "research-revision@1",
      baseCandidate: input.candidate, review: input.review, candidate, dispositions: response.value, validation: { valid: true } },
    { schemaVersion: "research-revision@1", dependsOn: deps(input.candidate, input.review, candidate), validation: "valid", review: "findings" });
    return { ok: true, candidate, receipt: produced, revisionRecord };
  });
  const analyze = workflow<PostWorkflowInput, PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus }>("post.analyze", { revision: "v5" }, async (ctx, input) => {
    if (input.evidenceKind !== "video") return ctx.blocked({ kind: "unsupported_media_review", evidence: input.evidence }) as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    if (!options.sourceCheck) return ctx.needsReview({ kind: "source_check_missing" }) as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    const source = await ctx.phase("source-consistency", { title: "来源一致性核对", purpose: "在构建前确认原帖与冻结视频来源一致。", order: 1 }, async (phase) => {
      const value = await phase.call("source-check", options.sourceCheck!, input);
      if (value.ok) await phase.bindArtifact(value.artifact, { role: "source-check", title: "来源一致性核对", primary: true });
      return value;
    });
    if (!source.ok) return source as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    if (source.receipt.artifact.verdict !== "consistent") return ctx.blocked({ kind: source.receipt.artifact.verdict === "conflict" ? "source_identity_conflict" : "source_identity_uncertain", sourceCheck: source.artifact }) as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    const built = await ctx.phase("candidate-build", { title: "候选构建", purpose: "基于冻结证据生成候选报告。", order: 2 }, async (phase) => {
      const value = await phase.call("build", legacy.build, input);
      if (value.ok) await phase.bindArtifact(value.candidate, { role: "candidate", title: "候选报告", primary: true });
      return value;
    });
    if (!built.ok) return built as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    const reviewed = await ctx.phase("simple-review", { title: "独立复核", purpose: "输出结构化 findings 或明确无 findings。", order: 3 }, async (phase) => {
      const value = await retryReview(phase, "review", review, { candidate: built.candidate, evidence: input.evidence });
      if (value?.ok) await phase.bindArtifact(value.review, { role: "review", title: "复核回执", primary: true });
      return value ?? { stageStatus: "review_incomplete" as const };
    });
    if (!("ok" in reviewed) || !reviewed.ok) {
      await register(ctx, options.registerCandidate, input, built.candidate, built.receipt, undefined, undefined, undefined, "failed", "review_incomplete");
      return ctx.needsReview({ kind: "review_incomplete", candidate: built.candidate, reviewAttempts: 2, reviewStatus: "failed", candidateStatus: "review_incomplete" }) as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    }
    if (!reviewed.receipt.findings.length) {
      await register(ctx, options.registerCandidate, input, built.candidate, built.receipt, reviewed.review, reviewed.legacyReceipt, undefined, "completed_no_findings", "original_reviewed");
      return { ok: true, candidate: built.candidate, evaluation: reviewed.review, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" };
    }
    const repaired = await ctx.phase("candidate-revision", { title: "候选修订", purpose: "按复核 findings 完成一次定向修订。", order: 4 }, async (phase) => {
      const value = await settledCall(phase, "repair", repair, { candidate: built.candidate, evidence: input.evidence, findings: reviewed.receipt.findings, review: reviewed.review });
      return value.status === "fulfilled" && value.value.ok ? value.value : { stageStatus: "revision_incomplete" as const };
    });
    if (!("ok" in repaired) || !repaired.ok) {
      await register(ctx, options.registerCandidate, input, built.candidate, built.receipt, reviewed.review, reviewed.legacyReceipt, undefined, "completed_with_findings", "original_reviewed");
      return ctx.needsReview({ kind: "revision_incomplete", candidate: built.candidate, review: reviewed.review, findings: reviewed.receipt.findings, reviewStatus: "completed_with_findings", candidateStatus: "original_reviewed" }) as PostWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    }
    const repairedValue = repaired;
    await ctx.phase("revision-artifacts", { title: "修订记录", purpose: "绑定候选与修订处置记录。", order: 5 }, async (phase) => { await phase.bindArtifact(repairedValue.candidate, { role: "candidate", title: "修订候选", primary: true }); await phase.bindArtifact(repairedValue.revisionRecord, { role: "revision", title: "修订记录" }); });
    await register(ctx, options.registerCandidate, input, repairedValue.candidate, repairedValue.receipt, reviewed.review, reviewed.legacyReceipt, repairedValue.revisionRecord, "completed_with_findings", "revised_unverified");
    return { ok: true, candidate: repairedValue.candidate, evaluation: reviewed.review, reviewStatus: "completed_with_findings", candidateStatus: "revised_unverified" };
  });
  return { build: legacy.build, sourceCheck: options.sourceCheck, review, repair, analyze, definitions: [legacy.build, review, repair, analyze] as const };
}

export function createCreatorSynthesisWorkflowSuiteV4(validators: CreatorSynthesisWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "creatorBuilder" | "creatorReviewer" | "creatorRepair">,
  options: SimpleCreatorWorkflowSuiteOptions = {}) {
  const legacy = createCreatorSynthesisWorkflowSuite(validators, agents);
  const review = workflow<{ candidate: ArtifactRef; frozenInputs: ArtifactRef }, SimpleReviewOutput>("creator.review", { revision: "v2" }, async (ctx, input) => {
    const produced = await ctx.agent("reviewer", agents.creatorReviewer, { candidate: input.candidate, frozenInputs: input.frozenInputs });
    const parsed = researchReviewReceiptSchema.safeParse(produced.artifact);
    if (!parsed.success || !candidateBindingMatches(parsed.data, input.candidate, "creator")) return ctx.needsReview({ kind: "review_contract", candidate: input.candidate, produced, checked: parsed.success ? "candidate_binding_mismatch" : parsed.error.flatten() }) as SimpleReviewOutput;
    const reviewArtifact = await ctx.publish("receipt", "creator-review", parsed.data, { schemaVersion: parsed.data.schemaVersion,
      dependsOn: deps(input.candidate, input.frozenInputs), validation: "valid", review: parsed.data.findings.length ? "findings" : "passed" });
    return { ok: true, review: reviewArtifact, receipt: parsed.data, legacyReceipt: produced };
  });
  const repair = workflow<{ candidate: ArtifactRef; frozenInputs: ArtifactRef; findings: ResearchReviewReceipt["findings"]; review: ArtifactRef }, SimpleRepairOutput>("creator.repair", { revision: "v2" }, async (ctx, input) => {
    const produced = await ctx.agent("repair", agents.creatorRepair, { candidate: input.candidate, frozenInputs: input.frozenInputs, findings: input.findings, review: input.review });
    const checked = await ctx.validate("candidate-check", produced, validators.candidate);
    const response = revisionResponse(produced, input.findings);
    if (!checked.valid || !response.valid) return ctx.needsReview({ kind: "revision_contract", candidate: input.candidate, review: input.review, produced, checked, response }) as SimpleRepairOutput;
    const candidate = await ctx.publish("candidate", "creator-synthesis", produced.artifact, { schemaVersion: "v1", dependsOn: deps(input.candidate, input.review), validation: "valid", review: "pending" });
    const revisionRecord = await ctx.publish("revision-record", "research-revision", { schemaVersion: "research-revision@1",
      baseCandidate: input.candidate, review: input.review, candidate, dispositions: response.value, validation: { valid: true } },
    { schemaVersion: "research-revision@1", dependsOn: deps(input.candidate, input.review, candidate), validation: "valid", review: "findings" });
    return { ok: true, candidate, receipt: produced, revisionRecord };
  });
  const analyze = workflow<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus }>("creator.synthesize", { revision: "v4" }, async (ctx, input) => {
    const built = await ctx.phase("candidate-build", { title: "博主综合", purpose: "基于冻结输入生成博主综合候选。", order: 1 }, async (phase) => {
      const value = await phase.call("build", legacy.build, input);
      if (value.ok) await phase.bindArtifact(value.candidate, { role: "candidate", title: "综合候选", primary: true });
      return value;
    });
    if (!built.ok) return built as CreatorSynthesisWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus };
    const reviewed = await ctx.phase("simple-review", { title: "独立复核", purpose: "输出结构化 findings 或明确无 findings。", order: 2 }, async (phase) => {
      const value = await retryReview(phase, "review", review, { candidate: built.candidate, frozenInputs: input.frozenInputs });
      if (value?.ok) await phase.bindArtifact(value.review, { role: "review", title: "复核回执", primary: true });
      return value ?? { stageStatus: "review_incomplete" as const };
    });
    if (!("ok" in reviewed) || !reviewed.ok) { await register(ctx, options.registerCandidate, input, built.candidate, built.receipt, undefined, undefined, undefined, "failed", "review_incomplete"); return ctx.needsReview({ kind: "review_incomplete", candidate: built.candidate, reviewAttempts: 2, reviewStatus: "failed", candidateStatus: "review_incomplete" }) as CreatorSynthesisWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus }; }
    if (!reviewed.receipt.findings.length) {
      await register(ctx, options.registerCandidate, input, built.candidate, built.receipt, reviewed.review, reviewed.legacyReceipt, undefined, "completed_no_findings", "original_reviewed");
      return { ok: true, synthesis: built.candidate, evaluation: reviewed.review, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" };
    }
    const repaired = await ctx.phase("candidate-revision", { title: "候选修订", purpose: "按复核 findings 完成一次定向修订。", order: 3 }, async (phase) => {
      const value = await settledCall(phase, "repair", repair, { candidate: built.candidate, frozenInputs: input.frozenInputs, findings: reviewed.receipt.findings, review: reviewed.review });
      return value.status === "fulfilled" && value.value.ok ? value.value : { stageStatus: "revision_incomplete" as const };
    });
    if (!("ok" in repaired) || !repaired.ok) { await register(ctx, options.registerCandidate, input, built.candidate, built.receipt, reviewed.review, reviewed.legacyReceipt, undefined, "completed_with_findings", "original_reviewed"); return ctx.needsReview({ kind: "revision_incomplete", candidate: built.candidate, review: reviewed.review, findings: reviewed.receipt.findings, reviewStatus: "completed_with_findings", candidateStatus: "original_reviewed" }) as CreatorSynthesisWorkflowOutput & { reviewStatus?: ReviewStatus; candidateStatus?: CandidateStatus }; }
    const repairedValue = repaired;
    await ctx.phase("revision-artifacts", { title: "修订记录", purpose: "绑定候选与修订处置记录。", order: 4 }, async (phase) => { await phase.bindArtifact(repairedValue.candidate, { role: "candidate", title: "修订综合", primary: true }); await phase.bindArtifact(repairedValue.revisionRecord, { role: "revision", title: "修订记录" }); });
    await register(ctx, options.registerCandidate, input, repairedValue.candidate, repairedValue.receipt, reviewed.review, reviewed.legacyReceipt, repairedValue.revisionRecord, "completed_with_findings", "revised_unverified");
    return { ok: true, synthesis: repairedValue.candidate, evaluation: reviewed.review, reviewStatus: "completed_with_findings", candidateStatus: "revised_unverified" };
  });
  return { build: legacy.build, review, repair, analyze, definitions: [legacy.build, review, repair, analyze] as const };
}
