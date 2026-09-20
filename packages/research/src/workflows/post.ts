import { workflow, type ArtifactRef, type ValidationResult } from "@signal-room/workflow";
import type { ResearchAgentDefinitions } from "./agents.js";
import type {
  PostBuildOutput, PostCandidateReceipt, PostEvaluationReceipt, PostEvaluationRepairInput,
  PostRepairInput, PostReviewInput, PostReviewOutput, PostWorkflowInput, PostWorkflowOutput,
  SourceConsistencyReceipt,
} from "./contracts.js";
import { sourceConsistencyCheckSchema } from "./contracts.js";

export type PostWorkflowValidators = {
  candidate(value: PostCandidateReceipt): ValidationResult | Promise<ValidationResult>;
  evaluation(value: PostEvaluationReceipt): ValidationResult | Promise<ValidationResult>;
};

function dependencies(ref: ArtifactRef) {
  return [{ artifactId: ref.id, revision: ref.revision, sha256: ref.sha256 }];
}

export function createPostWorkflow(validators: PostWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "postBuilder" | "postReviewer" | "postRepair">) {
  return workflow<PostWorkflowInput, PostWorkflowOutput>("post.analyze", { revision: "v1" }, async (ctx, input) => {
    let produced = await ctx.agent("builder", agents.postBuilder, input);
    let checked = await ctx.validate("candidate-check:0", produced, validators.candidate);
    if (!checked.valid) return ctx.needsReview({ kind: "candidate_contract", checked }) as PostWorkflowOutput;
    let candidate = await ctx.publish("candidate:0", "post-candidate", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependencies(input.evidence), validation: "valid", review: "pending",
    });

    for (let round = 0; round < 2; round += 1) {
      const review = await ctx.agent(`review:${round}`, agents.postReviewer, { candidate, evidence: input.evidence });
      const reviewCheck = await ctx.validate(`review-check:${round}`, review, validators.evaluation);
      if (!reviewCheck.valid) return ctx.needsReview({ kind: "evaluation_contract", candidate, review, checked: reviewCheck }) as PostWorkflowOutput;
      const evaluation = await ctx.publish(`evaluation:${round}`, "post-evaluation", review.artifact, {
        schemaVersion: "v1", dependsOn: dependencies(candidate), validation: "valid",
        review: review.route === "deliver" ? "passed" : "findings",
      });
      const route = ctx.decide(`route:${round}`, review.route);
      if (route === "deliver") return { ok: true, candidate, evaluation };
      if (route === "missing_evidence") return ctx.blocked({ candidate, evaluation, findings: review.findings }) as PostWorkflowOutput;
      if (round === 1) return ctx.needsReview({ candidate, evaluation, findings: review.findings }) as PostWorkflowOutput;
      produced = await ctx.agent(`repair-post:${round}`, agents.postRepair, { candidate, findings: review.findings });
      checked = await ctx.validate(`candidate-check:${round + 1}`, produced, validators.candidate);
      if (!checked.valid) return ctx.needsReview({ kind: "candidate_contract", candidate, checked }) as PostWorkflowOutput;
      candidate = await ctx.publish(`candidate:${round + 1}`, "post-candidate", produced.artifact, {
        schemaVersion: "v1", dependsOn: dependencies(candidate), validation: "valid", review: "pending",
      });
    }
    return ctx.needsReview({ candidate, reason: "review_round_limit" }) as PostWorkflowOutput;
  });
}

export type PostWorkflowRegistrationInput = {
  registrationKey: string;
  registeredBy: { workflowRunId: string; stepRunId: string; attemptId: string };
  source: PostWorkflowInput;
  candidate: ArtifactRef;
  evaluation: ArtifactRef;
  candidateReceipt: PostCandidateReceipt;
  reviewReceipt: PostEvaluationReceipt;
};

export type PostWorkflowSuiteOptions = {
  registerPostVersion?: (input: PostWorkflowRegistrationInput) => Promise<unknown>;
};

/** V2 composes durable, independently retryable workflow nodes; V1 above remains replayable. */
export function createPostWorkflowSuite(validators: PostWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "postBuilder" | "postReviewer" | "postRepair" | "postEvaluationRepair">,
  options: PostWorkflowSuiteOptions = {}, revisions: { build?: "v1" | "v2" } = {}) {
  const build = workflow<PostWorkflowInput, PostBuildOutput>("post.build", { revision: revisions.build ?? "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("builder", agents.postBuilder, input);
    const checked = await ctx.validate("candidate-check", produced, validators.candidate);
    if (!checked.valid) return ctx.needsReview({ kind: "candidate_contract", produced, checked }) as PostBuildOutput;
    const candidate = await ctx.publish("candidate", "post-candidate", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependencies(input.evidence), validation: "valid", review: "pending",
    });
    return { ok: true, candidate, receipt: produced };
  });

  const review = workflow<PostReviewInput, PostReviewOutput>("post.review", { revision: "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("reviewer", agents.postReviewer, { candidate: input.candidate, evidence: input.evidence });
    const checked = await ctx.validate("review-check", produced, validators.evaluation);
    if (!checked.valid) return ctx.needsReview({ kind: "evaluation_contract", candidate: input.candidate,
      evidence: input.evidence, produced, checked }) as unknown as PostReviewOutput;
    const evaluation = await ctx.publish("evaluation", "post-evaluation", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependencies(input.candidate), validation: "valid",
      review: produced.route === "deliver" ? "passed" : "findings",
    });
    return { ok: true, evaluation, receipt: produced, route: produced.route, findings: produced.findings };
  });

  const repairPost = workflow<PostRepairInput, PostBuildOutput>("post.repair", { revision: "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("repair", agents.postRepair, { candidate: input.candidate, findings: input.findings });
    const checked = await ctx.validate("candidate-check", produced, validators.candidate);
    if (!checked.valid) return ctx.needsReview({ kind: "candidate_contract", candidate: input.candidate, produced, checked }) as PostBuildOutput;
    const candidate = await ctx.publish("candidate", "post-candidate", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependencies(input.candidate), validation: "valid", review: "pending",
    });
    return { ok: true, candidate, receipt: produced };
  });

  const repairEvaluation = workflow<PostEvaluationRepairInput, PostReviewOutput>("post.repair-evaluation", { revision: "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("repair-evaluation", agents.postEvaluationRepair, input);
    const checked = await ctx.validate("review-check", produced, async (value) => {
      if (value.repair.candidateSha256 !== input.candidateRevisionSha256) {
        return { valid: false, details: { kind: "candidate_sha_mismatch",
          expected: input.candidateRevisionSha256, actual: value.repair.candidateSha256 } };
      }
      return validators.evaluation(value);
    });
    if (!checked.valid) return ctx.needsReview({ kind: "evaluation_contract", candidate: input.candidate,
      evidence: input.evidence, produced, checked }) as unknown as PostReviewOutput;
    const priorDependency = input.prior.artifactRef ? dependencies(input.prior.artifactRef) : [];
    const evaluation = await ctx.publish("evaluation", "post-evaluation", produced.artifact, {
      schemaVersion: "v1", dependsOn: [...dependencies(input.candidate), ...priorDependency], validation: "valid",
      review: produced.route === "deliver" ? "passed" : "findings",
    });
    return { ok: true, evaluation, receipt: produced, route: produced.route, findings: produced.findings };
  });

  const analyze = workflow<PostWorkflowInput, PostWorkflowOutput>("post.analyze", { revision: "v2" }, async (ctx, input) => {
    if (input.evidenceKind !== "video") return ctx.blocked({ kind: "unsupported_media_review",
      evidenceKind: input.evidenceKind ?? "unknown", evidence: input.evidence }) as PostWorkflowOutput;
    const built = await ctx.call("build", build, input);
    if (!built.ok) return built;
    let candidate = built.candidate;
    let candidateReceipt = built.receipt;
    for (let round = 0; round < 2; round += 1) {
      const reviewInput = { creatorRunId: input.creatorRunId, postExternalId: input.postExternalId, candidate, evidence: input.evidence };
      let reviewed = await ctx.call(`review:${round}`, review, reviewInput);
      if (!reviewed.ok && reviewed.details.kind === "evaluation_contract") {
        const candidateRevisionSha256 = reviewed.details.produced.candidateRevisionSha256;
        if (!candidateRevisionSha256) return ctx.needsReview({ kind: "evaluation_repair_binding_missing",
          candidate, evaluationContract: reviewed }) as PostWorkflowOutput;
        reviewed = await ctx.call(`repair-evaluation:${round}`, repairEvaluation, {
          ...reviewInput, candidateRevisionSha256, prior: { receipt: reviewed.details.produced },
          failure: { kind: "evaluation_contract", details: reviewed.details.checked },
        });
      }
      if (!reviewed.ok) return ctx.needsReview({ candidate, evaluationContract: reviewed }) as PostWorkflowOutput;
      const route = ctx.decide(`route:${round}`, reviewed.route);
      const registerVersion = async () => {
        if (options.registerPostVersion) await ctx.task("register-version", (_value, execution) => options.registerPostVersion!({
          registrationKey: `${execution.runId}:${execution.stepRunId}`, source: input, candidate, evaluation: reviewed.evaluation,
          registeredBy: { workflowRunId: execution.runId, stepRunId: execution.stepRunId, attemptId: execution.attemptId },
          candidateReceipt, reviewReceipt: reviewed.receipt,
        }), null);
      };
      if (route === "deliver") {
        await registerVersion();
        return { ok: true, candidate, evaluation: reviewed.evaluation };
      }
      if (route === "missing_evidence") return ctx.blocked({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as PostWorkflowOutput;
      if (round === 1) {
        await registerVersion();
        return ctx.needsReview({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as PostWorkflowOutput;
      }
      const repaired = await ctx.call(`repair-post:${round}`, repairPost, { ...reviewInput, findings: reviewed.findings });
      if (!repaired.ok) return repaired;
      candidate = repaired.candidate;
      candidateReceipt = repaired.receipt;
    }
    return ctx.needsReview({ candidate, reason: "review_round_limit" }) as PostWorkflowOutput;
  });

  const definitions = [build, review, repairPost, repairEvaluation, analyze] as const;
  return { build, review, repairPost, repairEvaluation, analyze, definitions };
}

/** V3 keeps V2 child definitions replayable and adds presentation phases around their real artifacts. */
export function createPostWorkflowSuiteV3(validators: PostWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "postBuilder" | "postReviewer" | "postRepair" | "postEvaluationRepair">,
  options: PostWorkflowSuiteOptions = {}) {
  return createPhasedPostWorkflowSuite("v3", validators, agents, options);
}

export type PostSourceCheckOutput = { ok: true; artifact: ArtifactRef; receipt: SourceConsistencyReceipt } |
  { ok: false; state: "blocked" | "needs_review"; details: unknown };

/** Source-check revisions track the effective frozen operator independently from post orchestration. */
export function createPostSourceCheckWorkflow(revision: "v1" | "v2" | "v3",
  agents: Partial<Pick<ResearchAgentDefinitions, "postSourceChecker">>) {
  return workflow<PostWorkflowInput, PostSourceCheckOutput>("post.source-check", { revision }, async (ctx, input) => {
    if (!agents.postSourceChecker) return ctx.blocked({ kind: "source_consistency_checker_missing" }) as PostSourceCheckOutput;
    const receipt = await ctx.agent("check", agents.postSourceChecker, input);
    const validation = sourceConsistencyCheckSchema.safeParse(receipt.artifact);
    if (!validation.success) return ctx.blocked({ kind: "source_consistency_contract_invalid", details: validation.error.flatten() }) as PostSourceCheckOutput;
    const artifact = await ctx.publish("result", "post-source-check", validation.data, {
      schemaVersion: validation.data.schemaVersion, dependsOn: dependencies(input.evidence), validation: "valid",
      review: validation.data.verdict === "consistent" ? "passed" : "findings"
    });
    return { ok: true, artifact, receipt: { artifact: validation.data } };
  });
}

function createPhasedPostWorkflowSuite(revision: "v3" | "v4", validators: PostWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "postBuilder" | "postReviewer" | "postRepair" | "postEvaluationRepair"> &
    Partial<Pick<ResearchAgentDefinitions, "postSourceChecker">>, options: PostWorkflowSuiteOptions) {
  const suite = createPostWorkflowSuite(validators, agents, options);
  const sourceCheck = createPostSourceCheckWorkflow(revision === "v4" ? "v2" : "v1", agents);
  const analyze = workflow<PostWorkflowInput, PostWorkflowOutput>("post.analyze", { revision }, async (ctx, input) => {
    if (input.evidenceKind !== "video") return ctx.blocked({ kind: "unsupported_media_review",
      evidenceKind: input.evidenceKind ?? "unknown", evidence: input.evidence }) as PostWorkflowOutput;
    if (revision === "v4") {
      const checked = await ctx.phase("source-consistency", { title: "来源一致性核对",
        purpose: "独立对比原帖标题正文与源视频字幕、抽帧。", order: 1,
        expectedArtifacts: [{ role: "source-check", title: "来源一致性核对", required: true }] }, async (phase) => {
        const value = await phase.call("check", sourceCheck, input);
        if (value.ok) await phase.bindArtifact(value.artifact, { role: "source-check", title: "来源一致性核对", primary: true });
        return value;
      });
      if (!checked.ok) return checked as PostWorkflowOutput;
      if (checked.receipt.artifact.verdict !== "consistent") return ctx.blocked({
        kind: checked.receipt.artifact.verdict === "conflict" ? "source_identity_conflict" : "source_identity_uncertain",
        sourceCheck: checked.artifact, summary: checked.receipt.artifact.summary
      }) as PostWorkflowOutput;
    }
    const built = await ctx.phase("candidate-build", { title: "候选构建", purpose: "基于冻结证据形成单帖候选。", order: revision === "v4" ? 2 : 1,
      expectedArtifacts: [{ role: "candidate", title: "单帖候选", required: true }] }, async (phase) => {
      const value = await phase.call("build", suite.build, input);
      if (value.ok) await phase.bindArtifact(value.candidate, { role: "candidate", title: "单帖候选", primary: true });
      return value;
    });
    if (!built.ok) return built;
    let candidate = built.candidate;
    let candidateReceipt = built.receipt;
    for (let round = 0; round < 2; round += 1) {
      const reviewInput = { creatorRunId: input.creatorRunId, postExternalId: input.postExternalId, candidate, evidence: input.evidence };
      let reviewed = await ctx.phase(`independent-review-${round + 1}`, { title: "独立复核", purpose: "由独立角色检查候选与证据边界。", order: revision === "v4" ? 3 : 2,
        expectedArtifacts: [{ role: "evaluation", title: "独立评估", required: true }] }, async (phase) => {
        const value = await phase.call(`review:${round}`, suite.review, reviewInput);
        if (value.ok) await phase.bindArtifact(value.evaluation, { role: "evaluation", title: "独立评估", primary: true });
        return value;
      });
      const reviewFailure = !reviewed.ok ? reviewed.details as { kind?: string; produced: PostEvaluationReceipt; checked: unknown } : undefined;
      if (reviewFailure?.kind === "evaluation_contract") {
        const candidateRevisionSha256 = reviewFailure.produced.candidateRevisionSha256;
        if (!candidateRevisionSha256) return ctx.needsReview({ kind: "evaluation_repair_binding_missing", candidate, evaluationContract: reviewed }) as PostWorkflowOutput;
        reviewed = await ctx.phase(`evaluation-contract-repair-${round + 1}`, { title: "评估合同修复", purpose: "只修复独立评估的合同产物。", order: revision === "v4" ? 4 : 3,
          expectedArtifacts: [{ role: "evaluation", title: "修复后评估", required: true }] }, async (phase) => {
          const value = await phase.call(`repair-evaluation:${round}`, suite.repairEvaluation, {
            ...reviewInput, candidateRevisionSha256, prior: { receipt: reviewFailure.produced },
            failure: { kind: "evaluation_contract" as const, details: reviewFailure.checked },
          });
          if (value.ok) await phase.bindArtifact(value.evaluation, { role: "evaluation", title: "修复后评估", primary: true });
          return value;
        });
      }
      if (!reviewed.ok) return ctx.needsReview({ candidate, evaluationContract: reviewed }) as PostWorkflowOutput;
      const route = ctx.decide(`route:${round}`, reviewed.route);
      const registerVersion = async () => {
        if (options.registerPostVersion) await ctx.task("register-version", (_value, execution) => options.registerPostVersion!({
          registrationKey: `${execution.runId}:${execution.stepRunId}`, source: input, candidate, evaluation: reviewed.evaluation,
          registeredBy: { workflowRunId: execution.runId, stepRunId: execution.stepRunId, attemptId: execution.attemptId },
          candidateReceipt, reviewReceipt: reviewed.receipt,
        }), null);
      };
      if (route === "deliver") { await registerVersion(); return { ok: true, candidate, evaluation: reviewed.evaluation }; }
      if (route === "missing_evidence") return ctx.blocked({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as PostWorkflowOutput;
      if (round === 1) { await registerVersion(); return ctx.needsReview({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as PostWorkflowOutput; }
      const repaired = await ctx.phase(`candidate-repair-${round + 1}`, { title: "候选修复", purpose: "依据独立评估 findings 定向修复候选。", order: revision === "v4" ? 4 : 3,
        expectedArtifacts: [{ role: "candidate", title: "修复后候选", required: true }] }, async (phase) => {
        const value = await phase.call(`repair-post:${round}`, suite.repairPost, { ...reviewInput, findings: reviewed.findings });
        if (value.ok) await phase.bindArtifact(value.candidate, { role: "candidate", title: "修复后候选", primary: true });
        return value;
      });
      if (!repaired.ok) return repaired;
      candidate = repaired.candidate;
      candidateReceipt = repaired.receipt;
    }
    return ctx.needsReview({ candidate, reason: "review_round_limit" }) as PostWorkflowOutput;
  });
  return { ...suite, analyze, definitions: revision === "v4"
    ? [...suite.definitions, sourceCheck, analyze] as const : [...suite.definitions, analyze] as const };
}

/** V4 fails closed on source identity before any candidate build or reuse. */
export function createPostWorkflowSuiteV4(validators: PostWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "postSourceChecker" | "postBuilder" | "postReviewer" | "postRepair" | "postEvaluationRepair">,
  options: PostWorkflowSuiteOptions = {}) {
  return createPhasedPostWorkflowSuite("v4", validators, agents, options);
}
