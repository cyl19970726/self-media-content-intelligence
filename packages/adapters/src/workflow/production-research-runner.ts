import fs from "node:fs";
import { researchTraceSummary } from "./research-trace-summary.js";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  createPostWorkflow, createPostWorkflowSuite, createPostWorkflowSuiteV3, createPostWorkflowSuiteV4, createCreatorSynthesisWorkflow, createCreatorSynthesisWorkflowSuite,
  createCreatorSynthesisWorkflowSuiteV3, createCreatorAnalysisWorkflow, createCreatorAnalysisWorkflowV2, createCreatorAnalysisWorkflowV3, createCreatorAnalysisWorkflowV4,
  createPostWorkflowSuiteV5, createPostWorkflowSuiteV6, createCreatorSynthesisWorkflowSuiteV4, createCreatorSynthesisWorkflowSuiteV5,
  createCreatorAnalysisWorkflowV5, createCreatorAnalysisWorkflowV6,
  postWorkflowArtifacts, createResearchAgentDefinitions,
  CreatorResearchWorkflowScheduler, RepositoryResearchVersionRegistrar,
  videoReconstructionBatchSchema, videoReconstructionOutcomeSchema, creatorSynthesisSchema, creatorSynthesisGateSchema,
  type CreatorArtifactStore, type PostWorkflowStartInput, type CreatorSynthesisWorkflowStartInput,
  type PostWorkflowInput, type CreatorSynthesisWorkflowInput, type PostWorkflowRegistrationInput,
  type CreatorWorkflowRegistrationInput, type ResearchAgentConfig,
  type VideoReconstructionOutcome, type CreatorSynthesisOutcome, type CreatorResearchRepository,
} from "../../../research/index.js";
import type { AgentRunRequest, AgentRunResult, AgentRunner, ArtifactRef, WorkflowDefinition } from "@signal-room/workflow";
import { artifactPath, artifactRef } from "../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../core/config.js";
import { CodexVideoReconstructionExecutor, evaluateRuntimeThreeLens, preservePreparedCandidateInputs } from "../platform/video/codex-video-reconstruction-executor.js";
import type { VideoCodexExecutionOptions } from "../platform/video/video-codex-execution.js";
import { validateEvaluationArtifacts } from "../platform/video/video-evaluation-contract.js";
import { CodexCreatorSynthesisExecutor } from "../platform/synthesis/codex-creator-synthesis-executor.js";
import { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";
import { SQLiteResearchWorkflowExecutor } from "./research-workflow-executor.js";
import { SQLiteResearchVersionRegistrationTransaction } from "./sqlite-research-version-transaction.js";
import { assertPinnedResearchInput, fileDigest, methodSnapshot, pinResearchInput, registerResearchInput, skillPackageSnapshot, type PinnedResearchInput } from "./research-inputs.js";
import { repairPostEvaluation } from "./post-evaluation-repair.js";
import { archivePredecessorEvaluation, materializeBoundReview, type BoundReviewInput } from "./post-repair-review-input.js";
import { runSourceConsistencyCheck } from "./source-consistency-checker.js";
import { simpleReviewRegistration } from "./simple-review-registration.js";
import { creatorReviewRoute } from "./creator-review-route.js";
import { runSimpleReview, simpleReviewReceipt, type SimpleReview } from "./simple-review-runner.js";
export { creatorReviewRoute } from "./creator-review-route.js";

type CandidatePayload = {
  kind: "post" | "creator";
  evidence: ArtifactRef;
  report: unknown;
  reportArtifactRef: string;
  reportSha256: string;
  relativeRoot: string;
  outcome: unknown;
};
type ReviewInput = { candidate: ArtifactRef; review?: ArtifactRef; evidence?: ArtifactRef; frozenInputs?: ArtifactRef; findings?: unknown; retryFeedback?: string };
type EvaluationRepairInput = ReviewInput & { prior: { receipt: { artifact?: unknown } }; failure: { details: unknown } };


/** Calls the existing complete production operators, never the generic receipt prompts. */
export class ProductionResearchRunner implements AgentRunner {
  constructor(private readonly store: SQLiteWorkflowRunStore, private readonly artifacts: CreatorArtifactStore,
    private readonly evaluationRepairRunner: typeof repairPostEvaluation = repairPostEvaluation,
    private readonly videoExecutorFactory: (options: VideoCodexExecutionOptions) => CodexVideoReconstructionExecutor =
      (options) => new CodexVideoReconstructionExecutor(options)) {}

  async run<Input, Output>(request: AgentRunRequest<Input>): Promise<AgentRunResult<Output>> {
    const id = request.definition.id;
    if (id === "post-source-checker") {
      const evidence = (request.input as PostWorkflowInput).evidence;
      const pinned = await this.payload<PinnedResearchInput>(evidence);
      assertPinnedResearchInput(pinned);
      await request.emit("agent.delegate", { role: id, executor: "codex-sdk", model: "gpt-5.6-luna",
        reasoningEffort: "medium", methods: pinned.methods, inputRevision: evidence.sha256 });
      return { output: await runSourceConsistencyCheck(request as AgentRunRequest<unknown>, pinned) as Output };
    }
    const evaluationRepair = id === "post-evaluation-repair";
    const reviewer = id.endsWith("reviewer");
    const repair = id.endsWith("repair") && !evaluationRepair;
    const simpleReview = request.definition?.config?.simpleReview === true;
    const post = id.startsWith("post-");
    const reviewInput = request.input as ReviewInput;
    const prior = (reviewer || repair || evaluationRepair) ? await this.payload<CandidatePayload>(reviewInput.candidate) : undefined;
    const evidence = prior?.evidence ?? (post
      ? (request.input as PostWorkflowInput).evidence
      : (request.input as CreatorSynthesisWorkflowInput).frozenInputs);
    const pinned = await this.payload<PinnedResearchInput>(evidence);
    assertPinnedResearchInput(pinned);
    if (prior && fileDigest(artifactPath(prior.reportArtifactRef)) !== prior.reportSha256) throw new Error("CANDIDATE_REVISION_CHANGED");
    await request.emit("agent.delegate", { role: id, executor: "codex-sdk", model: request.definition.model,
      reasoningEffort: request.definition.reasoningEffort, methods: pinned.methods, inputRevision: evidence.sha256 });
    if (reviewer && simpleReview) {
      if (!prior) throw new Error("SIMPLE_REVIEW_CANDIDATE_REQUIRED");
      const review = await this.simpleReview(request, pinned, reviewInput.candidate, prior, reviewInput.retryFeedback);
      const registeredAgain = await this.payload<CandidatePayload>((request.input as ReviewInput).candidate);
      const pinnedAgain = await this.payload<PinnedResearchInput>(evidence);
      assertPinnedResearchInput(pinnedAgain);
      if (registeredAgain.reportSha256 !== prior.reportSha256
        || fileDigest(artifactPath(prior.reportArtifactRef)) !== prior.reportSha256) throw new Error("SIMPLE_REVIEW_MUTATED_CANDIDATE");
      return { output: simpleReviewReceipt(review, (request.input as ReviewInput).candidate) as Output };
    }
    const coreEvidenceRecovery = post && !reviewer && !repair && await this.isCoreEvidenceCountRecovery(request);
    const result = evaluationRepair
      ? await this.repairPostEvaluation(request, pinned, prior)
      : post
      ? await this.post(request, pinned, evidence, prior, reviewer, repair, coreEvidenceRecovery)
      : await this.creator(request, pinned, evidence, prior, reviewer, repair);
    if (request.signal.aborted) throw request.signal.reason ?? new Error("WORKFLOW_CANCELED");
    return { output: result as Output };
  }

  private async simpleReview<Input>(request: AgentRunRequest<Input>, pinned: PinnedResearchInput,
    candidateRef: ArtifactRef, prior: CandidatePayload, retryFeedback?: string): Promise<SimpleReview> {
    const sourceRefs = prior.kind === "post"
      ? (() => { const source = pinned.source as PostWorkflowStartInput; return [source.detailArtifactRef,
        source.selectionArtifactRef, source.reconstructionBatchArtifactRef, source.sourceMediaArtifactRef,
        source.mediaManifestArtifactRef]; })()
      : (() => { const source = pinned.source as CreatorSynthesisWorkflowStartInput; return [source.portfolioArtifactRef,
        source.portfolioAnnotationsArtifactRef, source.selectionArtifactRef, source.detailArtifactRef,
        source.reconstructionBatchArtifactRef]; })();
    const candidateDirectory = path.dirname(artifactPath(prior.reportArtifactRef));
    const postEvidence = prior.kind === "post" ? ["post-source-input.json", "capture-protocol.json",
      "evidence/evidence-pack.json", "targeted-evidence/targeted-evidence.json", "targeted-evidence/ocr-evidence.json"]
      .map((relative) => path.join(candidateDirectory, relative)).filter((file) => fs.existsSync(file)) : [];
    const contractPaths = prior.kind === "post" ? [
      path.join(projectRoot, ".agents/skills/video-content-reconstruction/schemas/capture-protocol.schema.json"),
      path.join(projectRoot, ".agents/skills/video-content-reconstruction/schemas/reconstruction.schema.json")
    ] : [path.join(projectRoot, "packages/research/src/creator-synthesis/contracts.ts")];
    const sourcePaths = [...new Set([...sourceRefs.filter((ref): ref is string => typeof ref === "string" && ref.length > 0)
      .map((ref) => artifactPath(ref)), ...postEvidence, ...contractPaths])];
    const reviewerOperatorPath = path.join(projectRoot, ".agents", "skills",
      prior.kind === "post" ? "video-content-reconstruction" : "creator-synthesis", "references", "reviewer-operator.md");
    return runSimpleReview({ request, candidateRef, candidate: prior, reportPath: artifactPath(prior.reportArtifactRef),
      reviewerOperatorPath, sourcePaths, retryFeedback, sourceMappings: sourceRefs.filter((ref): ref is string => typeof ref === "string" && ref.length > 0)
        .map((ref) => ({ ref, path: artifactPath(ref) })) });
  }

  private async explicitSimpleReview(ref: ArtifactRef | undefined, candidate: ArtifactRef,
    prior: CandidatePayload): Promise<SimpleReview> {
    if (!ref) throw new Error("SIMPLE_REPAIR_REVIEW_REQUIRED");
    const review = await this.payload<SimpleReview>(ref);
    if (review.schemaVersion !== "research-review@1" || review.kind !== prior.kind
      || review.candidate.id !== candidate.id || review.candidate.revision !== candidate.revision
      || review.candidate.sha256 !== candidate.sha256 || review.candidateReportSha256 !== prior.reportSha256) {
      throw new Error("SIMPLE_REPAIR_REVIEW_CANDIDATE_MISMATCH");
    }
    return review;
  }

  private async isCoreEvidenceCountRecovery<Input>(request: AgentRunRequest<Input>): Promise<boolean> {
    if (request.definition.id !== "post-builder") return false;
    const events = await this.store.listEvents(request.runId);
    const recovery = [...events].reverse().find((event) => event.type === "workflow.core_evidence_recovery_queued"
      && event.data !== null && typeof event.data === "object"
      && (event.data as { gateId?: unknown; stepKey?: unknown; originalBuilderStepId?: unknown }).gateId === "builder_integrity_core_evidence_count"
      && (event.data as { stepKey?: unknown }).stepKey === "builder"
      && typeof (event.data as { originalBuilderStepId?: unknown }).originalBuilderStepId === "string");
    if (!recovery) return false;
    const originalBuilderStepId = (recovery.data as { originalBuilderStepId: string }).originalBuilderStepId;
    const builderSteps = (await this.store.listSteps(request.runId)).filter((step) => step.key === "builder");
    return builderSteps.length === 2 && builderSteps.some((step) => step.id === originalBuilderStepId && step.state === "failed")
      && builderSteps.some((step) => step.id === request.stepRunId && step.id !== originalBuilderStepId && step.state === "running");
  }

  private async payload<T>(ref: ArtifactRef): Promise<T> {
    if (!ref?.id) throw new Error("REGISTERED_ARTIFACT_REQUIRED");
    const registered = await this.store.getArtifact(ref.id);
    if (!registered || registered.sha256 !== ref.sha256 || registered.revision !== ref.revision) throw new Error("ARTIFACT_REVISION_MISMATCH");
    return await this.store.getArtifactPayload(ref.id) as T;
  }

  private async boundReviewInput<Input>(request: AgentRunRequest<Input>, candidate: ArtifactRef,
    prior: CandidatePayload): Promise<BoundReviewInput> {
    const repairRun = await this.store.getRun(request.runId);
    if (!repairRun?.parentRunId || !repairRun.parentStepRunId) throw new Error("POST_REPAIR_PARENT_REVIEW_MISSING");
    const parentSteps = await this.store.listSteps(repairRun.parentRunId);
    const repairStep = parentSteps.find((step) => step.id === repairRun.parentStepRunId);
    if (!repairStep) throw new Error("POST_REPAIR_PARENT_STEP_INVALID");
    const reviewKeys = this.reviewStepKeysForRepair(repairStep);
    if (!reviewKeys) throw new Error("POST_REPAIR_PARENT_STEP_INVALID");
    const exact = (key: string) => parentSteps.filter((step) => step.key === key && step.state === "succeeded")
      .filter((step) => {
        const output = step.output as { receipt?: { artifact?: { candidate?: ArtifactRef }; candidateRevisionSha256?: string } } | undefined;
        const reviewed = output?.receipt?.artifact?.candidate;
        return reviewed?.id === candidate.id && reviewed.revision === candidate.revision && reviewed.sha256 === candidate.sha256
          && output?.receipt?.candidateRevisionSha256 === prior.reportSha256;
      });
    const repairedMatches = exact(reviewKeys.evaluationRepair);
    const matches = repairedMatches.length > 0 ? repairedMatches : exact(reviewKeys.review);
    if (matches.length !== 1) throw new Error(matches.length === 0
      ? "POST_REPAIR_BOUND_REVIEW_MISSING" : "POST_REPAIR_BOUND_REVIEW_AMBIGUOUS");
    const output = matches[0]!.output as {
      evaluation?: ArtifactRef;
      receipt: { artifact: { candidate: ArtifactRef; outcome: Record<string, unknown>; evaluation: unknown } };
    };
    if (!output.evaluation?.id) throw new Error("POST_REPAIR_EVALUATION_ARTIFACT_MISSING");
    const payload = await this.payload<Record<string, unknown>>(output.evaluation);
    const reviewed = payload.candidate as ArtifactRef | undefined;
    if (reviewed?.id !== candidate.id || reviewed.revision !== candidate.revision || reviewed.sha256 !== candidate.sha256) {
      throw new Error("POST_REPAIR_EVALUATION_CANDIDATE_MISMATCH");
    }
    if (JSON.stringify(payload.evaluation) !== JSON.stringify(output.receipt.artifact.evaluation)) {
      throw new Error("POST_REPAIR_EVALUATION_PAYLOAD_MISMATCH");
    }
    return { evaluation: output.evaluation, payload, outcome: payload.outcome as Record<string, unknown> ?? output.receipt.artifact.outcome,
      parentRunId: repairRun.parentRunId, reviewStepId: matches[0]!.id };
  }

  /**
   * Durable child step keys are scoped by every inherited phase, not just the
   * immediate repair phase.  Derive sibling review keys from that complete
   * path so a nested creator post phase cannot bind another post's review.
   */
  private reviewStepKeysForRepair(repairStep: { key: string; phasePath?: readonly string[] }): {
    review: string; evaluationRepair: string;
  } | null {
    const segments = repairStep.key.split(":");
    const round = segments.at(-1);
    if (segments.at(-2) !== "repair-post" || !round || !/^\d+$/.test(round)) return null;
    const repairPhase = segments.at(-3);
    if (!repairPhase) {
      // V2 does not add presentation phases around its durable children.
      if (segments.length !== 2 || repairStep.phasePath?.length) return null;
      return { review: `review:${round}`, evaluationRepair: `repair-evaluation:${round}` };
    }
    const phase = repairPhase.match(/^candidate-repair-(\d+)$/);
    if (!phase || Number(phase[1]) !== Number(round) + 1) return null;
    const outerPath = segments.slice(0, -3);
    const phasePath = repairStep.phasePath;
    const expectedPhasePath = [...outerPath, repairPhase];
    if (phasePath && (phasePath.length !== expectedPhasePath.length
      || !phasePath.every((part, index) => part === expectedPhasePath[index]))) return null;
    const reviewPrefix = [...outerPath, `independent-review-${phase[1]}`, "review", round].join(":");
    const evaluationRepairPrefix = [...outerPath, `evaluation-contract-repair-${phase[1]}`, "repair-evaluation", round].join(":");
    return { review: reviewPrefix, evaluationRepair: evaluationRepairPrefix };
  }

  private async post<Input>(request: AgentRunRequest<Input>, pinned: PinnedResearchInput, evidence: ArtifactRef,
    prior: CandidatePayload | undefined, reviewer: boolean, repair: boolean, coreEvidenceRecovery = false): Promise<unknown> {
    const source = pinned.source as PostWorkflowStartInput;
    const relativeRoot = `workflow-reconstructions/${request.runId}/${request.attemptId}/${source.postExternalId}`;
    const directory = path.join(runArtifactDir(source.creatorRunId), relativeRoot);
    // Copy an existing candidate into the new attempt; old reports and earlier attempts stay immutable.
    let original = prior?.reportArtifactRef;
    if (!original && pinned.reuseCandidate) {
      original = pinned.reuseCandidate.artifactRef;
      if (fileDigest(artifactPath(original)) !== pinned.reuseCandidate.sha256) throw new Error("REUSE_CANDIDATE_CHANGED");
    }
    if (original) {
      const predecessorDirectory = path.dirname(artifactPath(original));
      // `.agents` is a per-attempt staged skill cache.  Never inherit it with
      // the candidate: the current frozen method package must stage afresh.
      fs.cpSync(predecessorDirectory, directory, { recursive: true,
        filter: (source) => path.relative(predecessorDirectory, source) !== ".agents" });
      if (repair || coreEvidenceRecovery) archivePredecessorEvaluation(directory, original);
      preservePreparedCandidateInputs(directory, artifactPath(source.sourceMediaArtifactRef));
      await request.emit("candidate.copied", { sourceArtifactRef: original, reason: reviewer ? "independent_review"
        : repair ? "targeted_repair" : coreEvidenceRecovery ? "core_evidence_count_repair" : "reuse_existing_candidate" });
    }
    if (reviewer && source.evaluationMode === "repair_existing_invalid" && pinned.reuseEvaluation && prior) {
      if (pinned.reuseEvaluation.candidateSha256 !== prior.reportSha256 ||
          fileDigest(artifactPath(pinned.reuseEvaluation.artifactRef)) !== pinned.reuseEvaluation.sha256) {
        throw new Error("REUSE_EVALUATION_REVISION_CHANGED");
      }
      const importDirectory = path.join(directory, "imported-invalid-evaluation");
      fs.mkdirSync(importDirectory, { recursive: true });
      const importedEvaluation = path.join(importDirectory, "evaluation.json");
      fs.copyFileSync(artifactPath(pinned.reuseEvaluation.artifactRef), importedEvaluation);
      let validationError: string | null = null;
      try {
        const gate = await validateEvaluationArtifacts(directory, importDirectory);
        const contractFailure = (gate.failedGateIds ?? []).find((id) => /evaluation.*(schema|relation)|schema.*evaluation|relation/i.test(id));
        if (contractFailure) validationError = contractFailure;
        if (!validationError) {
          const evaluatorRun = JSON.parse(fs.readFileSync(path.join(directory, "evaluator-run.json"), "utf8")) as { evaluatorRunId?: unknown };
          if (typeof evaluatorRun.evaluatorRunId !== "string") throw new Error("REUSE_EVALUATION_PROVENANCE_MISSING");
          await evaluateRuntimeThreeLens(directory, directory, source.postExternalId, prior.reportArtifactRef,
            artifactRef(source.creatorRunId, `${relativeRoot}/imported-invalid-evaluation/evaluation.json`), evaluatorRun.evaluatorRunId);
        }
      } catch (error) {
        validationError = error instanceof Error ? error.message : "evaluation_contract_invalid";
      }
      if (validationError) {
        const importedRef = artifactRef(source.creatorRunId, `${relativeRoot}/imported-invalid-evaluation/evaluation.json`);
        await request.emit("evaluation.imported", { sourceArtifactRef: pinned.reuseEvaluation.artifactRef,
          sha256: pinned.reuseEvaluation.sha256, candidateRevision: prior.reportSha256, validationError });
        return { artifact: { kind: "post", outcome: prior.outcome, evaluation: this.readDiagnostic(importedRef),
          candidate: (request.input as ReviewInput).candidate, evaluationArtifactRef: importedRef,
          diagnostics: { imported: true, validationError } }, route: "repair_post",
          findings: { kind: "evaluation_contract", validationError, imported: true }, candidateRevisionSha256: prior.reportSha256 };
      }
      // A structurally valid imported evaluation is not reused or shown to the
      // fresh reviewer; preserve independence for the normal review path.
      fs.rmSync(importDirectory, { recursive: true, force: true });
    }
    const simpleReview = request.definition?.config?.simpleReview === true;
    const explicitReview = repair && prior && simpleReview
      ? await this.explicitSimpleReview((request.input as ReviewInput).review, (request.input as ReviewInput).candidate, prior) : null;
    const boundReview = repair && prior && !simpleReview
      ? await this.boundReviewInput(request, (request.input as ReviewInput).candidate, prior) : null;
    const reviewInput = boundReview ? materializeBoundReview(directory, boundReview) : null;
    const repairFindings = repair ? simpleReview ? { review: explicitReview, findings: explicitReview?.findings }
      : { reportedGateIds: (request.input as ReviewInput).findings, currentReview: reviewInput }
      : coreEvidenceRecovery ? { gateId: "builder_integrity_core_evidence_count",
        instruction: "Correct only the declared core evidence coverage count from the existing knowledge units and evidence bindings." } : undefined;
    const executor = this.videoExecutorFactory({ executionMode: "sdk", signal: request.signal,
      evaluationPolicy: reviewer ? "single_pass" : "skip", forceEvaluation: reviewer, outputRelativeRoot: relativeRoot,
      preservePreparedCandidate: Boolean(original) && !repair && !coreEvidenceRecovery,
      ...(reviewer && prior ? { reviewerOnly: true, expectedCandidateSha256: prior.reportSha256 } : {}),
      ...(repairFindings !== undefined ? { repairFindings } : {}) });
    const outcome = await executor.reconstruct({ runId: source.creatorRunId, creatorRunId: source.creatorRunId,
      postExternalId: source.postExternalId, sourceUrl: source.sourceUrl, sourceMediaArtifactRef: source.sourceMediaArtifactRef,
      detailArtifactRef: source.detailArtifactRef, mediaManifestArtifactRef: source.mediaManifestArtifactRef,
      selectionArtifactRef: source.selectionArtifactRef, evidencePackArtifactRef: null, contractVersion: "video-content-reconstruction@2",
      evaluationPolicy: reviewer ? "single_pass" : "skip" }, (event) => {
        void request.emit("agent.lifecycle", { role: event.role, status: event.status, childRunId: event.childRunId });
        if (event.status === "completed" || event.status === "failed") void request.emit("agent.usage",
          researchTraceSummary("post", source.creatorRunId, event.childRunId));
      });
    if (request.signal.aborted) throw request.signal.reason ?? new Error("WORKFLOW_CANCELED");
    if (reviewer) {
      if (prior && fileDigest(artifactPath(prior.reportArtifactRef)) !== prior.reportSha256) throw new Error("REVIEW_MODIFIED_PRIOR_CANDIDATE");
      const evaluationArtifactRef = "evaluationArtifactRef" in outcome ? outcome.evaluationArtifactRef : null;
      if ((outcome.state === "not_ready" || outcome.state === "built_unevaluated") && evaluationArtifactRef) {
        const diagnostic = this.readDiagnostic(evaluationArtifactRef);
        return { artifact: { kind: "post", outcome, evaluation: diagnostic, candidate: (request.input as ReviewInput).candidate,
          evaluationArtifactRef, diagnostics: { message: outcome.message ?? null, qualityWarningGateIds: "qualityWarningGateIds" in outcome ? outcome.qualityWarningGateIds : [] } },
          route: "repair_post", findings: { kind: "evaluation_contract", diagnostic }, candidateRevisionSha256: prior?.reportSha256 };
      }
      if (outcome.state === "blocked" || outcome.state === "not_ready" || outcome.state === "built_unevaluated") {
        // Execution/contract failure is retryable and never turns into a positive research verdict.
        throw new Error(`POST_REVIEW_INCOMPLETE: ${JSON.stringify(outcome)}`);
      }
      const evaluation = "evaluationArtifactRef" in outcome && outcome.evaluationArtifactRef
        ? this.artifacts.read(outcome.evaluationArtifactRef) : null;
      const findings = "qualityWarningGateIds" in outcome ? outcome.qualityWarningGateIds : [];
      return { artifact: { kind: "post", outcome, evaluation, candidate: (request.input as ReviewInput).candidate },
        route: findings?.length ? "repair_post" : "deliver", findings, candidateRevisionSha256: prior?.reportSha256 };
    }
    if (!isBuilt(outcome)) throw new Error(`POST_CANDIDATE_INCOMPLETE: ${JSON.stringify(outcome)}`);
    const reportArtifactRef = outcome.reconstructionArtifactRef;
    const revisionResponse = repair && simpleReview ? this.readRevisionResponse(directory, explicitReview!) : undefined;
    const artifact: CandidatePayload & { revisionResponse?: unknown } = { kind: "post", evidence, report: this.artifacts.read(reportArtifactRef),
      reportArtifactRef, reportSha256: fileDigest(artifactPath(reportArtifactRef)), relativeRoot, outcome };
    if (revisionResponse) artifact.revisionResponse = revisionResponse;
    return { artifact, validation: outcome.builderValidationArtifactRef ? this.artifacts.read(outcome.builderValidationArtifactRef) : null };
  }

  private readRevisionResponse(directory: string, review: SimpleReview): unknown {
    const responsePath = path.join(directory, "revision-response.json");
    if (!fs.existsSync(responsePath)) throw new Error("BUILDER_REVISION_RESPONSE_MISSING");
    const value = JSON.parse(fs.readFileSync(responsePath, "utf8")) as unknown;
    if (!Array.isArray(value)) throw new Error("BUILDER_REVISION_RESPONSE_INVALID");
    const findings = new Set(review.findings.map((finding) => finding.id));
    const seen = new Set<string>();
    for (const row of value as Array<{ id?: unknown; status?: unknown; reason?: unknown }>) {
      if (typeof row.id !== "string" || !findings.has(row.id) || seen.has(row.id)
        || !["changed", "disputed", "missing_evidence"].includes(String(row.status))
        || typeof row.reason !== "string" || !row.reason.trim()) throw new Error("BUILDER_REVISION_RESPONSE_INVALID");
      seen.add(row.id);
    }
    if (seen.size !== findings.size) throw new Error("BUILDER_REVISION_RESPONSE_INCOMPLETE");
    return value;
  }

  private readDiagnostic(ref: string): unknown {
    try { return this.artifacts.read(ref); }
    catch {
      try { return JSON.parse(fs.readFileSync(artifactPath(ref), "utf8")); }
      catch { return { unreadable: true }; }
    }
  }

  private async repairPostEvaluation<Input>(request: AgentRunRequest<Input>, pinned: PinnedResearchInput,
    prior: CandidatePayload | undefined): Promise<unknown> {
    if (!prior || prior.kind !== "post") throw new Error("POST_EVALUATION_REPAIR_CANDIDATE_REQUIRED");
    const source = pinned.source as PostWorkflowStartInput;
    const input = request.input as EvaluationRepairInput;
    const priorArtifact = input.prior.receipt.artifact as { evaluationArtifactRef?: string } | undefined;
    const invalidEvaluationPath = priorArtifact?.evaluationArtifactRef;
    if (!invalidEvaluationPath) throw new Error("POST_EVALUATION_REPAIR_DIAGNOSTIC_REQUIRED");
    const relativeRoot = `workflow-reconstructions/${request.runId}/${request.attemptId}/${source.postExternalId}`;
    const childRunId = randomUUID();
    await request.emit("agent.lifecycle", { role: "post-evaluation-repair", status: "started", childRunId });
    let result;
    try {
      result = await this.evaluationRepairRunner({ candidateSha256: prior.reportSha256,
      candidateDirectory: path.dirname(artifactPath(prior.reportArtifactRef)), sourceVideoPath: artifactPath(source.sourceMediaArtifactRef),
      invalidEvaluationPath: artifactPath(invalidEvaluationPath), validationDetails: input.failure.details,
      source: "post.review.evaluation_contract", outputDirectory: path.join(runArtifactDir(source.creatorRunId), relativeRoot),
      signal: request.signal, childRunId, candidateArtifactRef: prior.reportArtifactRef,
      evaluationArtifactRef: (attemptDirectory) => artifactRef(source.creatorRunId,
        `${relativeRoot}/evaluation-repairs/${path.basename(attemptDirectory)}/evaluation.json`) });
    } catch (error) {
      await request.emit("agent.lifecycle", { role: "post-evaluation-repair", status: "failed", childRunId });
      await request.emit("agent.usage", researchTraceSummary("post", source.creatorRunId, childRunId));
      throw error;
    }
    await request.emit("agent.lifecycle", { role: "post-evaluation-repair", status: "completed", childRunId });
    await request.emit("agent.usage", researchTraceSummary("post", source.creatorRunId, childRunId));
    const attemptName = path.basename(result.attemptDirectory);
    const evaluationArtifactRef = artifactRef(source.creatorRunId, `${relativeRoot}/evaluation-repairs/${attemptName}/evaluation.json`);
    const gateArtifactRef = artifactRef(source.creatorRunId, `${relativeRoot}/evaluation-repairs/${attemptName}/gate-report.json`);
    const diagnosticRefs = result.diagnosticPaths.map((item) => artifactRef(source.creatorRunId,
      `${relativeRoot}/evaluation-repairs/${attemptName}/${path.basename(item)}`));
    const runtimeEvaluationArtifactRef = artifactRef(source.creatorRunId,
      `${relativeRoot}/evaluation-repairs/${attemptName}/runtime-three-lens-evaluation.json`);
    const runtimeGateArtifactRef = artifactRef(source.creatorRunId,
      `${relativeRoot}/evaluation-repairs/${attemptName}/runtime-three-lens-gate-report.json`);
    const priorOutcome = videoReconstructionOutcomeSchema.parse(prior.outcome);
    if (!isBuilt(priorOutcome)) throw new Error("POST_EVALUATION_REPAIR_CANDIDATE_OUTCOME_INVALID");
    const qualityWarningGateIds = [...new Set([...(result.gate.failedGateIds ?? []),
      ...(result.runtimeThreeLensGate.failedGateIds ?? []), ...(result.runtimeThreeLensGate.uncheckedGateIds ?? [])])];
    const outcome = qualityWarningGateIds.length > 0 || result.gate.ready !== true || result.runtimeThreeLensGate.ready !== true
      ? { state: "evaluated_with_findings" as const, reconstructionArtifactRef: priorOutcome.reconstructionArtifactRef,
        articleArtifactRef: priorOutcome.articleArtifactRef, builderValidationArtifactRef: priorOutcome.builderValidationArtifactRef,
        evaluationArtifactRef, gateReportArtifactRef: gateArtifactRef, threeLensEvaluationArtifactRef: runtimeEvaluationArtifactRef,
        threeLensGateReportArtifactRef: runtimeGateArtifactRef, threeLensGateCount: 19 as const, gateCount: 1,
        failedGateIds: [] as string[], qualityWarningGateIds: qualityWarningGateIds.length ? qualityWarningGateIds : ["evaluation_not_ready"], evaluationMode: "single_pass" as const }
      : { state: "verified" as const, reconstructionArtifactRef: priorOutcome.reconstructionArtifactRef,
        articleArtifactRef: priorOutcome.articleArtifactRef, builderValidationArtifactRef: priorOutcome.builderValidationArtifactRef,
        evaluationArtifactRef, gateReportArtifactRef: gateArtifactRef, threeLensEvaluationArtifactRef: runtimeEvaluationArtifactRef,
        threeLensGateReportArtifactRef: runtimeGateArtifactRef, threeLensGateCount: 19 as const, gateCount: 1,
        failedGateIds: [] as string[], qualityWarningGateIds: [] as string[], evaluationMode: "single_pass" as const };
    return { artifact: { kind: "post", outcome: videoReconstructionOutcomeSchema.parse(outcome), evaluation: this.artifacts.read(evaluationArtifactRef),
      gate: this.artifacts.read(gateArtifactRef), candidate: input.candidate, evaluationArtifactRef, gateArtifactRef },
      route: outcome.state === "verified" ? "deliver" : "repair_post", findings: qualityWarningGateIds, repair: { candidateSha256: result.candidateSha256,
        ...(result.priorEvaluationSha256 ? { priorEvaluationSha256: result.priorEvaluationSha256 } : {}), diagnosticRefs }, candidateRevisionSha256: prior.reportSha256 };
  }

  private async creator<Input>(request: AgentRunRequest<Input>, pinned: PinnedResearchInput, evidence: ArtifactRef,
    prior: CandidatePayload | undefined, reviewer: boolean, repair: boolean): Promise<unknown> {
    const source = pinned.source as CreatorSynthesisWorkflowStartInput;
    const relativeRoot = `workflow-synthesis/${request.runId}/${request.attemptId}`;
    const directory = path.join(runArtifactDir(source.creatorRunId), relativeRoot);
    const simpleReview = request.definition.config?.simpleReview === true;
    const explicitReview = repair && prior && simpleReview
      ? await this.explicitSimpleReview((request.input as ReviewInput).review, (request.input as ReviewInput).candidate, prior) : null;
    const executor = new CodexCreatorSynthesisExecutor(this.artifacts, { executionMode: "sdk", signal: request.signal,
      phase: reviewer ? "evaluate" : "build", outputDirectory: directory,
      ...(reviewer && prior ? { preparedCandidatePath: artifactPath(prior.reportArtifactRef) } : {}),
      ...(repair && prior ? { priorCandidatePath: artifactPath(prior.reportArtifactRef),
        reuseCandidatePath: artifactPath(prior.reportArtifactRef), repairFindings: simpleReview
          ? { review: explicitReview, findings: explicitReview?.findings } : (request.input as ReviewInput).findings } : {}) });
    const outcome = await executor.synthesize({ ...source, creatorName: null, mode: "provisional" }, (event) => {
      void request.emit("agent.lifecycle", { role: event.role, status: event.status, childRunId: event.childRunId });
      if (event.status === "completed" || event.status === "failed") void request.emit("agent.usage",
        researchTraceSummary("creator", source.creatorRunId, event.childRunId));
    });
    if (request.signal.aborted) throw request.signal.reason ?? new Error("WORKFLOW_CANCELED");
    if (reviewer) {
      if (!prior || fileDigest(artifactPath(prior.reportArtifactRef)) !== prior.reportSha256) throw new Error("REVIEW_MODIFIED_PRIOR_CANDIDATE");
      if (outcome.state === "blocked" || !outcome.gateArtifactRef) throw new Error(`SYNTHESIS_REVIEW_INCOMPLETE: ${JSON.stringify(outcome)}`);
      const gate = creatorSynthesisGateSchema.parse(this.artifacts.read(outcome.gateArtifactRef));
      return { artifact: { kind: "creator", outcome, gate, candidate: (request.input as ReviewInput).candidate },
        route: creatorReviewRoute(outcome, gate), findings: gate };
    }
    if (outcome.state === "blocked" || !outcome.synthesisArtifactRef) throw new Error(`SYNTHESIS_CANDIDATE_INCOMPLETE: ${JSON.stringify(outcome)}`);
    const reportArtifactRef = outcome.synthesisArtifactRef;
    const report = creatorSynthesisSchema.parse(this.artifacts.read(reportArtifactRef));
    const revisionResponse = repair && simpleReview ? this.readRevisionResponse(directory, explicitReview!) : undefined;
    const artifact: CandidatePayload & { revisionResponse?: unknown } = { kind: "creator", evidence, report, reportArtifactRef,
      reportSha256: fileDigest(artifactPath(reportArtifactRef)), relativeRoot, outcome };
    if (revisionResponse) artifact.revisionResponse = revisionResponse;
    return { artifact };
  }
}

function isBuilt(outcome: VideoReconstructionOutcome): outcome is Extract<VideoReconstructionOutcome, { state: "built_unevaluated" | "verified" | "ready" | "evaluated_with_findings" }> {
  return ["built_unevaluated", "verified", "ready", "evaluated_with_findings"].includes(outcome.state);
}

export function createProductionResearchWorkflow(database: DatabaseSync, store: SQLiteWorkflowRunStore, artifacts: CreatorArtifactStore, repository: CreatorResearchRepository) {
  const config = (kind: "post" | "creator") => {
    const methods = methodSnapshot(kind);
    const skillPackages = [skillPackageSnapshot(kind)];
    const digest = createHash("sha256").update(JSON.stringify({ methods, skillPackages })).digest("hex");
    return { prompt: "Delegates to the pinned production operator; complete prompts and raw SDK events are stored in its private child trace.",
      promptRevision: digest, skillSnapshotsRevision: digest, permissionsRevision: "isolated-production-attempt@1",
      config: { delegate: "existing-production-operator", methods, skillPackages } };
  };
  const configs: ResearchAgentConfig = { postSourceChecker: config("post"), postBuilder: config("post"), postReviewer: config("post"), postRepair: config("post"),
    postEvaluationRepair: config("post"),
    creatorBuilder: config("creator"), creatorReviewer: config("creator"), creatorRepair: config("creator") };
  const agents = createResearchAgentDefinitions(configs);
  const candidate = (value: { artifact: unknown; validation?: unknown }) => {
    try {
      const payload = value.artifact as CandidatePayload;
      if (!payload || fileDigest(artifactPath(payload.reportArtifactRef)) !== payload.reportSha256) return { valid: false, details: "candidate_revision_mismatch" };
      if (payload.kind === "creator") return { valid: creatorSynthesisSchema.safeParse(payload.report).success };
      const outcome = videoReconstructionOutcomeSchema.parse(payload.outcome);
      const passed = Boolean(value.validation && typeof value.validation === "object" && "passed" in value.validation && value.validation.passed === true);
      return { valid: isBuilt(outcome) && passed, details: passed ? undefined : "builder_validation_not_passed" };
    } catch (error) { return { valid: false, details: error instanceof Error ? error.message : "candidate_contract_invalid" }; }
  };
  const evaluation = (value: { artifact: unknown }) => {
    if (!value.artifact || typeof value.artifact !== "object") return { valid: false };
    const artifact = value.artifact as { kind?: unknown; outcome?: unknown; gate?: unknown };
    if (artifact.kind === "creator") {
      return { valid: creatorSynthesisGateSchema.safeParse(artifact.gate).success,
        details: { kind: "creator_evaluation_contract" } };
    }
    if (artifact.kind !== "post") return { valid: false, details: { kind: "evaluation_kind_missing" } };
    const parsed = videoReconstructionOutcomeSchema.safeParse(artifact.outcome);
    if (!parsed.success) return { valid: false, details: parsed.error.flatten() };
    if (parsed.data.state === "built_unevaluated" && parsed.data.evaluationMode === "failed") {
      return { valid: false, details: { kind: "evaluation_contract", outcome: parsed.data } };
    }
    return { valid: parsed.data.state === "verified" || parsed.data.state === "ready"
      || parsed.data.state === "evaluated_with_findings",
      details: { kind: "evaluation_incomplete", outcome: parsed.data } };
  };
  const validators = { candidate, evaluation };
  const postV1 = createPostWorkflow(validators, agents);
  const creatorSynthesisV1 = createCreatorSynthesisWorkflow(validators, agents);
  const prepareSynthesisV1 = async (input: Parameters<Parameters<typeof createCreatorAnalysisWorkflow>[2]>[0],
    posts: Parameters<Parameters<typeof createCreatorAnalysisWorkflow>[2]>[1]) => {
    const original = await store.getArtifactPayload(input.source.id) as PinnedResearchInput;
    assertPinnedResearchInput(original);
    const source = original.source as CreatorSynthesisWorkflowStartInput;
    const batch = videoReconstructionBatchSchema.parse(artifacts.read(source.reconstructionBatchArtifactRef));
    for (let index = 0; index < posts.length; index++) {
      const result = posts[index]!;
      const refs = postWorkflowArtifacts(result);
      if (!refs) throw new Error("SYNTHESIS_REQUIRES_REVIEWABLE_POST_OUTPUT");
      const produced = await store.getArtifactPayload(refs.candidate.id) as CandidatePayload;
      const review = refs.evaluation ? await store.getArtifactPayload(refs.evaluation.id) as { outcome: VideoReconstructionOutcome } : null;
      const outcome = (review?.outcome ?? produced.outcome) as VideoReconstructionOutcome;
      const item = batch.items.find((row) => row.postExternalId === input.posts[index]!.postExternalId);
      if (!item || !isBuilt(outcome)) throw new Error("SYNTHESIS_POST_BINDING_MISMATCH");
      Object.assign(item, outcome, { evaluationPolicy: review ? "single_pass@37a03aae" : "skip@builder-fast-path-v1", updatedAt: new Date().toISOString() });
    }
    batch.revision += 1;
    batch.generatedAt = new Date().toISOString();
    batch.builtPosts = batch.items.filter((row) => ["ready", "verified", "built_unevaluated", "evaluated_with_findings"].includes(row.state)).length;
    batch.verifiedPosts = batch.items.filter((row) => ["ready", "verified"].includes(row.state)).length;
    batch.readyPosts = batch.verifiedPosts;
    batch.pendingPosts = batch.items.filter((row) => ["pending", "running"].includes(row.state)).length;
    batch.failedPosts = batch.items.filter((row) => ["not_ready", "blocked"].includes(row.state)).length;
    const reconstructionBatchArtifactRef = artifacts.write(source.creatorRunId, "workflow-reconstruction-batch.json",
      videoReconstructionBatchSchema.parse(batch), [source.reconstructionBatchArtifactRef]);
    return { creatorRunId: source.creatorRunId, frozenInputs: await registerResearchInput(store,
      pinResearchInput("creator", { ...source, reconstructionBatchArtifactRef })) };
  };
  const creatorAnalysisV1 = createCreatorAnalysisWorkflow(postV1, creatorSynthesisV1, prepareSynthesisV1);
  const registrar = new RepositoryResearchVersionRegistrar(repository, artifacts,
    new SQLiteResearchVersionRegistrationTransaction(database));
  const postSuiteOptions = { registerPostVersion: async (input: PostWorkflowRegistrationInput) => {
    const pinned = await store.getArtifactPayload(input.source.evidence.id) as PinnedResearchInput;
    assertPinnedResearchInput(pinned);
    const source = pinned.source as PostWorkflowStartInput;
    const candidatePayload = input.candidateReceipt.artifact as CandidatePayload;
    const reviewPayload = input.reviewReceipt.artifact as CandidatePayload;
    return registrar.registerPostVersion({ creatorRunId: source.creatorRunId, postExternalId: source.postExternalId,
      source: { reconstructionBatchArtifactRef: source.reconstructionBatchArtifactRef, selectionArtifactRef: source.selectionArtifactRef,
        detailArtifactRef: source.detailArtifactRef, mediaManifestArtifactRef: source.mediaManifestArtifactRef,
        sourceMediaArtifactRef: source.sourceMediaArtifactRef },
      candidate: candidatePayload.outcome as VideoReconstructionOutcome,
      review: reviewPayload.outcome as VideoReconstructionOutcome, registeredBy: input.registeredBy });
  } };
  const postSuite = createPostWorkflowSuite(validators, agents, postSuiteOptions);
  const creatorSuiteOptions = { registerCreatorVersion: async (input: CreatorWorkflowRegistrationInput) => {
    const pinned = await store.getArtifactPayload(input.source.frozenInputs.id) as PinnedResearchInput;
    assertPinnedResearchInput(pinned);
    const source = pinned.source as CreatorSynthesisWorkflowStartInput;
    const candidatePayload = input.candidateReceipt.artifact as CandidatePayload;
    const reviewPayload = input.reviewReceipt.artifact as CandidatePayload;
    return registrar.registerCreatorVersion({ creatorRunId: source.creatorRunId,
      source: { reconstructionBatchArtifactRef: source.reconstructionBatchArtifactRef,
        portfolioArtifactRef: source.portfolioArtifactRef, portfolioAnnotationsArtifactRef: source.portfolioAnnotationsArtifactRef,
        selectionArtifactRef: source.selectionArtifactRef,
        detailArtifactRef: source.detailArtifactRef, previousSynthesisArtifactRef: source.previousSynthesisArtifactRef ?? null,
        previousSynthesisGateArtifactRef: source.previousSynthesisGateArtifactRef ?? null },
      candidate: candidatePayload.outcome as CreatorSynthesisOutcome,
      review: reviewPayload.outcome as CreatorSynthesisOutcome, registeredBy: input.registeredBy });
  } };
  const creatorSuite = createCreatorSynthesisWorkflowSuite(validators, agents, creatorSuiteOptions);
  const prepareSynthesisV2: Parameters<typeof createCreatorAnalysisWorkflowV2>[2] = async (input) => {
    const original = await store.getArtifactPayload(input.source.id) as PinnedResearchInput;
    assertPinnedResearchInput(original);
    const initial = original.source as CreatorSynthesisWorkflowStartInput;
    const current = repository.get(input.creatorRunId);
    if (!current?.reconstructionBatchArtifactRef) throw new Error("CREATOR_SYNTHESIS_LATEST_BATCH_MISSING");
    const source: CreatorSynthesisWorkflowStartInput = { ...initial,
      reconstructionBatchArtifactRef: current.reconstructionBatchArtifactRef,
      previousSynthesisArtifactRef: current.synthesisArtifactRef, previousSynthesisGateArtifactRef: current.synthesisGateArtifactRef };
    return { creatorRunId: input.creatorRunId, frozenInputs: await registerResearchInput(store, pinResearchInput("creator", source)) };
  };
  const creatorAnalysisV2 = createCreatorAnalysisWorkflowV2(postSuite.analyze, creatorSuite.analyze, prepareSynthesisV2);
  const postSuiteV3 = createPostWorkflowSuiteV3(validators, agents, postSuiteOptions);
  const postSuiteV4 = createPostWorkflowSuiteV4(validators, agents, postSuiteOptions);
  const creatorSuiteV3 = createCreatorSynthesisWorkflowSuiteV3(validators, agents, creatorSuiteOptions);
  const creatorAnalysisV3 = createCreatorAnalysisWorkflowV3(postSuiteV3.analyze, creatorSuiteV3.analyze, prepareSynthesisV2);
  const creatorAnalysisV4 = createCreatorAnalysisWorkflowV4(postSuiteV4.analyze, creatorSuiteV3.analyze, prepareSynthesisV2);
  const simpleConfig = (kind: "post" | "creator") => {
    const value = config(kind);
    return { ...value, promptRevision: `${value.promptRevision}:reviewer-v1`, config: { ...value.config, simpleReview: true } };
  };
  const simpleAgents = createResearchAgentDefinitions({ ...configs, postReviewer: simpleConfig("post"),
    postRepair: simpleConfig("post"), creatorReviewer: simpleConfig("creator"), creatorRepair: simpleConfig("creator") });
  const registerCandidate = simpleReviewRegistration(store, artifacts, registrar, repository);
  const sourceCheck = postSuiteV4.definitions.find((definition) => definition.id === "post.source-check");
  const postSuiteV5 = createPostWorkflowSuiteV5(validators, simpleAgents, { registerCandidate,
    sourceCheck: sourceCheck as NonNullable<Parameters<typeof createPostWorkflowSuiteV5>[2]>["sourceCheck"] });
  const postSuiteV6 = createPostWorkflowSuiteV6(validators, simpleAgents, { registerCandidate,
    sourceCheck: sourceCheck as NonNullable<Parameters<typeof createPostWorkflowSuiteV6>[2]>["sourceCheck"] });
  const creatorSuiteV4 = createCreatorSynthesisWorkflowSuiteV4(validators, simpleAgents, { registerCandidate });
  const creatorSuiteV5 = createCreatorSynthesisWorkflowSuiteV5(validators, simpleAgents, { registerCandidate });
  const prepareSynthesisV5: Parameters<typeof createCreatorAnalysisWorkflowV5>[2] = async (input, posts) => {
    const original = await store.getArtifactPayload(input.source.id) as PinnedResearchInput;
    assertPinnedResearchInput(original);
    const initial = original.source as CreatorSynthesisWorkflowStartInput;
    const current = repository.get(input.creatorRunId);
    if (!current?.reconstructionBatchArtifactRef) throw new Error("CREATOR_SYNTHESIS_LATEST_BATCH_MISSING");
    const scope = posts.map((post, index) => {
      const refs = postWorkflowArtifacts(post);
      if (!refs) throw new Error("SYNTHESIS_REQUIRES_REVIEWABLE_POST_OUTPUT");
      const state = (post.ok ? post : post.details) as { reviewStatus?: string; candidateStatus?: string };
      return { postExternalId: input.posts[index]!.postExternalId, candidate: refs.candidate,
        review: refs.evaluation, reviewStatus: state.reviewStatus ?? "failed",
        candidateStatus: state.candidateStatus ?? "review_incomplete" };
    });
    const pinned = pinResearchInput("creator", { ...initial, reconstructionBatchArtifactRef: current.reconstructionBatchArtifactRef,
      previousSynthesisArtifactRef: current.synthesisArtifactRef, previousSynthesisGateArtifactRef: current.synthesisGateArtifactRef });
    pinned.researchScope = { complete: scope.every((post) => post.reviewStatus === "completed_no_findings"), posts: scope };
    return { creatorRunId: input.creatorRunId, frozenInputs: await registerResearchInput(store, pinned) };
  };
  const creatorAnalysisV5 = createCreatorAnalysisWorkflowV5(postSuiteV5.analyze, creatorSuiteV4.analyze, prepareSynthesisV5);
  const creatorAnalysisV6 = createCreatorAnalysisWorkflowV6(postSuiteV6.analyze, creatorSuiteV5.analyze, prepareSynthesisV5);
  const definitions = { post: postSuiteV6.analyze, creatorSynthesis: creatorSuiteV5.analyze, creatorAnalysis: creatorAnalysisV6 };
  const registeredDefinitions = [postV1, creatorSynthesisV1, creatorAnalysisV1,
    ...postSuite.definitions, ...creatorSuite.definitions, creatorAnalysisV2,
    ...postSuiteV3.definitions, ...postSuiteV4.definitions, ...creatorSuiteV3.definitions, creatorAnalysisV3, creatorAnalysisV4,
    ...postSuiteV5.definitions, ...postSuiteV6.definitions, ...creatorSuiteV4.definitions, ...creatorSuiteV5.definitions,
    creatorAnalysisV5, creatorAnalysisV6];
  const registry = { resolve: (id: string, revision: string) => registeredDefinitions
    .find((definition) => definition.id === id && definition.revision === revision) as WorkflowDefinition<unknown, unknown> | undefined };
  const scheduler = new CreatorResearchWorkflowScheduler(repository);
  const freezePost = async (source: PostWorkflowStartInput) => ({ creatorRunId: source.creatorRunId, postExternalId: source.postExternalId,
    evidenceKind: source.evidenceKind, evaluationMode: source.evaluationMode,
    importedEvaluationArtifactRef: source.importedEvaluationArtifactRef,
    evidence: await registerResearchInput(store, pinResearchInput("post", source)) });
  return new SQLiteResearchWorkflowExecutor(database, store, new ProductionResearchRunner(store, artifacts), definitions, {
    post: freezePost,
    creator: async (source) => ({ creatorRunId: source.creatorRunId,
      frozenInputs: await registerResearchInput(store, pinResearchInput("creator", source)) }),
    analysis: async (source) => ({ creatorRunId: source.creatorRunId,
      posts: await Promise.all(source.posts.map(freezePost)),
      source: await registerResearchInput(store, pinResearchInput("creator", source)) }),
  }, registry, { enqueue: async (input) => scheduler.enqueue(input) });
}
