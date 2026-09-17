import { workflow, type ArtifactRef, type ValidationResult } from "../../../workflow/index.js";
import type { ResearchAgentDefinitions } from "./agents.js";
import type {
  CreatorBuildOutput, CreatorRepairInput, CreatorReviewInput, CreatorReviewOutput, CreatorSynthesisEvaluationReceipt,
  CreatorSynthesisReceipt, CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput,
} from "./contracts.js";

export type CreatorSynthesisWorkflowValidators = {
  candidate(value: CreatorSynthesisReceipt): ValidationResult | Promise<ValidationResult>;
  evaluation(value: CreatorSynthesisEvaluationReceipt): ValidationResult | Promise<ValidationResult>;
};

function dependency(ref: ArtifactRef) {
  return [{ artifactId: ref.id, revision: ref.revision, sha256: ref.sha256 }];
}

export function createCreatorSynthesisWorkflow(validators: CreatorSynthesisWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "creatorBuilder" | "creatorReviewer" | "creatorRepair">) {
  return workflow<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>("creator.synthesize", { revision: "v1" }, async (ctx, input) => {
    let produced = await ctx.agent("builder", agents.creatorBuilder, input);
    let checked = await ctx.validate("candidate-check:0", produced, validators.candidate);
    if (!checked.valid) return ctx.needsReview({ kind: "synthesis_contract", checked }) as CreatorSynthesisWorkflowOutput;
    let candidate = await ctx.publish("candidate:0", "creator-synthesis", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependency(input.frozenInputs), validation: "valid", review: "pending",
    });
    for (let round = 0; round < 2; round += 1) {
      const review = await ctx.agent(`review:${round}`, agents.creatorReviewer, { candidate, frozenInputs: input.frozenInputs });
      const reviewCheck = await ctx.validate(`review-check:${round}`, review, validators.evaluation);
      if (!reviewCheck.valid) return ctx.needsReview({ kind: "synthesis_evaluation_contract", candidate, review, checked: reviewCheck }) as CreatorSynthesisWorkflowOutput;
      const evaluation = await ctx.publish(`evaluation:${round}`, "creator-synthesis-evaluation", review.artifact, {
        schemaVersion: "v1", dependsOn: dependency(candidate), validation: "valid",
        review: review.route === "deliver" ? "passed" : "findings",
      });
      const route = ctx.decide(`route:${round}`, review.route);
      if (route === "deliver") return { ok: true, synthesis: candidate, evaluation };
      if (route === "source_gap") return ctx.blocked({ candidate, evaluation, findings: review.findings }) as CreatorSynthesisWorkflowOutput;
      if (round === 1) return ctx.needsReview({ candidate, evaluation, findings: review.findings }) as CreatorSynthesisWorkflowOutput;
      produced = await ctx.agent(`repair:${round}`, agents.creatorRepair, { candidate, findings: review.findings });
      checked = await ctx.validate(`candidate-check:${round + 1}`, produced, validators.candidate);
      if (!checked.valid) return ctx.needsReview({ kind: "synthesis_contract", candidate, checked }) as CreatorSynthesisWorkflowOutput;
      candidate = await ctx.publish(`candidate:${round + 1}`, "creator-synthesis", produced.artifact, {
        schemaVersion: "v1", dependsOn: dependency(candidate), validation: "valid", review: "pending",
      });
    }
    return ctx.needsReview({ candidate, reason: "review_round_limit" }) as CreatorSynthesisWorkflowOutput;
  });
}

export type CreatorWorkflowRegistrationInput = {
  registrationKey: string;
  registeredBy: { workflowRunId: string; stepRunId: string; attemptId: string };
  source: CreatorSynthesisWorkflowInput;
  synthesis: ArtifactRef;
  evaluation: ArtifactRef;
  candidateReceipt: CreatorSynthesisReceipt;
  reviewReceipt: CreatorSynthesisEvaluationReceipt;
};

export type CreatorWorkflowSuiteOptions = {
  registerCreatorVersion?: (input: CreatorWorkflowRegistrationInput) => Promise<unknown>;
};

/** V2 orchestration over independently retryable synthesis nodes. */
export function createCreatorSynthesisWorkflowSuite(validators: CreatorSynthesisWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "creatorBuilder" | "creatorReviewer" | "creatorRepair">,
  options: CreatorWorkflowSuiteOptions = {}) {
  const build = workflow<CreatorSynthesisWorkflowInput, CreatorBuildOutput>("creator.build", { revision: "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("builder", agents.creatorBuilder, input);
    const checked = await ctx.validate("candidate-check", produced, validators.candidate);
    if (!checked.valid) return ctx.needsReview({ kind: "synthesis_contract", produced, checked }) as CreatorBuildOutput;
    const candidate = await ctx.publish("candidate", "creator-synthesis", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependency(input.frozenInputs), validation: "valid", review: "pending",
    });
    return { ok: true, candidate, receipt: produced };
  });

  const review = workflow<CreatorReviewInput, CreatorReviewOutput>("creator.review", { revision: "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("reviewer", agents.creatorReviewer, { candidate: input.candidate, frozenInputs: input.frozenInputs });
    const checked = await ctx.validate("review-check", produced, validators.evaluation);
    if (!checked.valid) return ctx.needsReview({ kind: "synthesis_evaluation_contract", candidate: input.candidate, produced, checked }) as CreatorReviewOutput;
    const evaluation = await ctx.publish("evaluation", "creator-synthesis-evaluation", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependency(input.candidate), validation: "valid",
      review: produced.route === "deliver" ? "passed" : "findings",
    });
    return { ok: true, evaluation, receipt: produced, route: produced.route, findings: produced.findings };
  });

  const repair = workflow<CreatorRepairInput, CreatorBuildOutput>("creator.repair", { revision: "v1" }, async (ctx, input) => {
    const produced = await ctx.agent("repair", agents.creatorRepair, { candidate: input.candidate, findings: input.findings });
    const checked = await ctx.validate("candidate-check", produced, validators.candidate);
    if (!checked.valid) return ctx.needsReview({ kind: "synthesis_contract", candidate: input.candidate, produced, checked }) as CreatorBuildOutput;
    const candidate = await ctx.publish("candidate", "creator-synthesis", produced.artifact, {
      schemaVersion: "v1", dependsOn: dependency(input.candidate), validation: "valid", review: "pending",
    });
    return { ok: true, candidate, receipt: produced };
  });

  const analyze = workflow<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>("creator.synthesize", { revision: "v2" }, async (ctx, input) => {
    const built = await ctx.call("build", build, input);
    if (!built.ok) return built;
    let candidate = built.candidate;
    let candidateReceipt = built.receipt;
    for (let round = 0; round < 2; round += 1) {
      const reviewInput = { creatorRunId: input.creatorRunId, candidate, frozenInputs: input.frozenInputs };
      const reviewed = await ctx.call(`review:${round}`, review, reviewInput);
      if (!reviewed.ok) return reviewed;
      const route = ctx.decide(`route:${round}`, reviewed.route);
      if (route === "deliver") {
        if (options.registerCreatorVersion) await ctx.task("register-version", (_value, execution) => options.registerCreatorVersion!({
          registrationKey: `${execution.runId}:${execution.stepRunId}`, source: input, synthesis: candidate, evaluation: reviewed.evaluation,
          registeredBy: { workflowRunId: execution.runId, stepRunId: execution.stepRunId, attemptId: execution.attemptId },
          candidateReceipt, reviewReceipt: reviewed.receipt,
        }), null);
        return { ok: true, synthesis: candidate, evaluation: reviewed.evaluation };
      }
      if (route === "source_gap") return ctx.blocked({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as CreatorSynthesisWorkflowOutput;
      if (round === 1) return ctx.needsReview({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as CreatorSynthesisWorkflowOutput;
      const repaired = await ctx.call(`repair:${round}`, repair, { ...reviewInput, findings: reviewed.findings });
      if (!repaired.ok) return repaired;
      candidate = repaired.candidate;
      candidateReceipt = repaired.receipt;
    }
    return ctx.needsReview({ candidate, reason: "review_round_limit" }) as CreatorSynthesisWorkflowOutput;
  });

  const definitions = [build, review, repair, analyze] as const;
  return { build, review, repair, analyze, definitions };
}

/** V3 decorates the durable V2 children with UI-facing phases and artifact bindings. */
export function createCreatorSynthesisWorkflowSuiteV3(validators: CreatorSynthesisWorkflowValidators,
  agents: Pick<ResearchAgentDefinitions, "creatorBuilder" | "creatorReviewer" | "creatorRepair">,
  options: CreatorWorkflowSuiteOptions = {}) {
  const suite = createCreatorSynthesisWorkflowSuite(validators, agents, options);
  const analyze = workflow<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>("creator.synthesize", { revision: "v3" }, async (ctx, input) => {
    const built = await ctx.phase("candidate-build", { title: "博主综合", purpose: "基于冻结单帖研究形成博主候选。", order: 1,
      expectedArtifacts: [{ role: "synthesis", title: "博主综合候选", required: true }] }, async (phase) => {
      const value = await phase.call("build", suite.build, input);
      if (value.ok) await phase.bindArtifact(value.candidate, { role: "synthesis", title: "博主综合候选", primary: true });
      return value;
    });
    if (!built.ok) return built;
    let candidate = built.candidate;
    let candidateReceipt = built.receipt;
    for (let round = 0; round < 2; round += 1) {
      const reviewInput = { creatorRunId: input.creatorRunId, candidate, frozenInputs: input.frozenInputs };
      const reviewed = await ctx.phase(`independent-review-${round + 1}`, { title: "独立复核", purpose: "检查综合候选的证据与边界。", order: 2,
        expectedArtifacts: [{ role: "evaluation", title: "综合独立评估", required: true }] }, async (phase) => {
        const value = await phase.call(`review:${round}`, suite.review, reviewInput);
        if (value.ok) await phase.bindArtifact(value.evaluation, { role: "evaluation", title: "综合独立评估", primary: true });
        return value;
      });
      if (!reviewed.ok) return reviewed;
      const route = ctx.decide(`route:${round}`, reviewed.route);
      if (route === "deliver") {
        if (options.registerCreatorVersion) await ctx.task("register-version", (_value, execution) => options.registerCreatorVersion!({
          registrationKey: `${execution.runId}:${execution.stepRunId}`, source: input, synthesis: candidate, evaluation: reviewed.evaluation,
          registeredBy: { workflowRunId: execution.runId, stepRunId: execution.stepRunId, attemptId: execution.attemptId },
          candidateReceipt, reviewReceipt: reviewed.receipt,
        }), null);
        return { ok: true, synthesis: candidate, evaluation: reviewed.evaluation };
      }
      if (route === "source_gap") return ctx.blocked({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as CreatorSynthesisWorkflowOutput;
      if (round === 1) return ctx.needsReview({ candidate, evaluation: reviewed.evaluation, findings: reviewed.findings }) as CreatorSynthesisWorkflowOutput;
      const repaired = await ctx.phase(`candidate-repair-${round + 1}`, { title: "综合修复", purpose: "根据独立评估 findings 定向修复综合候选。", order: 3,
        expectedArtifacts: [{ role: "synthesis", title: "修复后综合候选", required: true }] }, async (phase) => {
        const value = await phase.call(`repair:${round}`, suite.repair, { ...reviewInput, findings: reviewed.findings });
        if (value.ok) await phase.bindArtifact(value.candidate, { role: "synthesis", title: "修复后综合候选", primary: true });
        return value;
      });
      if (!repaired.ok) return repaired;
      candidate = repaired.candidate;
      candidateReceipt = repaired.receipt;
    }
    return ctx.needsReview({ candidate, reason: "review_round_limit" }) as CreatorSynthesisWorkflowOutput;
  });
  return { ...suite, analyze, definitions: [...suite.definitions, analyze] as const };
}
