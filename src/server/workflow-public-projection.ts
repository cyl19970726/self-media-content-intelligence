import { createHash } from "node:crypto";
import { creatorSynthesisGateSchema, researchReviewArtifactSchema, sourceConsistencyCheckSchema, videoReconstructionOutcomeSchema } from "../../packages/research/index.js";
import type { ArtifactRef } from "@signal-room/workflow";
import type { AttemptRecord, RunRecord, StepRecord, WorkflowEvent } from "@signal-room/workflow";

type PublicDiagnostic = { errorId: string; message: string };

function diagnosticId(scope: string, raw: unknown, identity: string): string {
  const digest = createHash("sha256").update(`${scope}\u0000${identity}\u0000${String(raw)}`).digest("hex");
  return `wf-${digest.slice(0, 16)}`;
}

function errorProjection(scope: string, raw: unknown, identity: string): PublicDiagnostic {
  const known: Record<string, string> = {
    SOURCE_CONSISTENCY_EVIDENCE_REF_INVALID: "来源核对引用了未登记的证据，结果尚未采用。修复证据登记后可重试来源核对步骤。",
    SOURCE_CONSISTENCY_INPUT_MUTATED: "来源核对期间输入证据发生变化，结果尚未采用。请确认当前证据后发起新的研究。",
    CODEX_SDK_TIMEOUT: "模型执行超时，尚未产生可采用的结果。可以重试失败步骤。",
  };
  return { errorId: diagnosticId(scope, raw, identity), message: typeof raw === "string" && Object.hasOwn(known, raw)
    ? known[raw]! : "执行未能完成；可凭诊断编号在本地查看详情。" };
}

function safeIdentifier(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9._:@/-]{1,160}$/u.test(value) ? value : undefined;
}

function safeHash(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-f0-9]{32,128}$/iu.test(value) ? value : undefined;
}

function safeIdentifiers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.map(safeIdentifier).filter((entry): entry is string => Boolean(entry));
  return values.length === value.length && values.length <= 64 ? values : undefined;
}

function safeUsage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const keys = ["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens"] as const;
  if (!keys.every((key) => typeof source[key] === "number" || source[key] === null)) return undefined;
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function publicEventData(event: WorkflowEvent): unknown {
  const source = object(event.data);
  if (event.type === "agent.lifecycle") return {
    role: safeIdentifier(source?.role), status: safeIdentifier(source?.status), childRunId: safeIdentifier(source?.childRunId)
  };
  if (event.type === "agent.delegate") return {
    role: safeIdentifier(source?.role), model: safeIdentifier(source?.model), reasoningEffort: safeIdentifier(source?.reasoningEffort)
  };
  if (event.type === "agent.started") return {
    agentId: safeIdentifier(source?.agentId), model: safeIdentifier(source?.model),
    reasoningEffort: safeIdentifier(source?.reasoningEffort), sdkVersion: safeIdentifier(source?.sdkVersion),
    codexRuntimeVersion: safeIdentifier(source?.codexRuntimeVersion)
  };
  if (event.type === "agent.completed") return {
    threadId: safeIdentifier(source?.threadId), usage: safeUsage(source?.usage)
  };
  if (event.type === "agent.usage") return {
    childRunId: safeIdentifier(source?.childRunId), usage: safeUsage(source?.usage),
    model: safeIdentifier(source?.model), reasoningEffort: safeIdentifier(source?.reasoningEffort),
    sdkVersion: safeIdentifier(source?.sdkVersion), codexRuntimeVersion: safeIdentifier(source?.codexRuntimeVersion)
  };
  if (event.type === "candidate.copied") return { reason: safeIdentifier(source?.reason) };
  if (event.type === "workflow.waiting" || event.type === "step.waiting") return {
    childRunId: safeIdentifier(source?.childRunId), stepRunId: safeIdentifier(source?.stepRunId)
  };
  if (event.type.startsWith("phase.")) {
    const binding = object(source?.binding); const artifact = object(binding?.artifact);
    return { phaseId: safeIdentifier(source?.phaseId), phasePath: Array.isArray(source?.phasePath) ? safeIdentifiers(source.phasePath) : undefined,
      childRunId: safeIdentifier(source?.childRunId), artifactId: safeIdentifier(artifact?.id), state: safeIdentifier(source?.state) };
  }
  if (event.type === "validation.completed") {
    const details = object(source?.details);
    const outcome = object(details?.outcome);
    return {
      valid: source?.valid === true,
      kind: safeIdentifier(details?.kind),
      failedGateIds: safeIdentifiers(outcome?.failedGateIds ?? source?.failedGateIds),
      qualityWarningGateIds: safeIdentifiers(outcome?.qualityWarningGateIds ?? source?.qualityWarningGateIds)
    };
  }
  if (event.type === "decision.recorded") {
    const route = typeof event.data === "string" ? event.data : source?.route;
    const safeRoute = safeIdentifier(route);
    return safeRoute ? { route: safeRoute } : undefined;
  }
  if (event.type === "artifact.published") return {
    id: safeIdentifier(source?.id), type: safeIdentifier(source?.type), schemaVersion: safeIdentifier(source?.schemaVersion),
    revision: safeIdentifier(source?.revision), sha256: safeHash(source?.sha256), validation: safeIdentifier(source?.validation),
    review: safeIdentifier(source?.review)
  };
  if (["agent.failed", "workflow.failed", "step.failed"].includes(event.type)) {
    return errorProjection(event.type, source?.error, `${event.runId}:${event.id}`);
  }
  if (["workflow.started", "workflow.completed", "workflow.blocked", "workflow.needs_review", "workflow.canceled",
    "step.started", "step.completed", "step.reused", "artifact.published", "cancellation.requested", "decision.recorded", "agent.completed",
    "phase.started", "phase.completed", "phase.waiting", "phase.blocked", "phase.needs_review", "phase.failed", "phase.canceled", "phase.artifact_bound"].includes(event.type)) {
    return undefined;
  }
  // SDK stream events and future event payloads are audit-private until explicitly projected.
  return { message: "执行事件已记录。", errorId: diagnosticId("event", event.type, `${event.runId}:${event.id}`) };
}

export function projectWorkflowRun(run: RunRecord) {
  const error = run.error ? errorProjection("run", run.error, run.id) : undefined;
  const metadata = object(run.metadata);
  return {
    id: run.id, workflowId: run.workflowId, workflowRevision: run.workflowRevision, state: run.state,
    parentRunId: run.parentRunId, parentStepRunId: run.parentStepRunId,
    metadata: {
      creatorRunId: safeIdentifier(metadata?.creatorRunId), workflowKind: safeIdentifier(metadata?.workflowKind),
      postId: safeIdentifier(metadata?.postId), sourceWorkflowRunId: safeIdentifier(metadata?.sourceWorkflowRunId)
    },
    ...(error ? { error: error.message, errorId: error.errorId } : {})
  };
}

export function projectWorkflowStep(step: StepRecord) {
  const error = step.error ? errorProjection("step", step.error, step.id) : undefined;
  return {
    id: step.id, runId: step.runId, key: step.key, kind: step.kind, workflowId: step.workflowId,
    workflowRevision: step.workflowRevision, state: step.state, validation: step.validation, phaseId: safeIdentifier(step.phaseId), phasePath: step.phasePath ? safeIdentifiers(step.phasePath) : undefined,
    ...(error ? { error: error.message, errorId: error.errorId } : {})
  };
}

export function projectWorkflowAttempt(attempt: AttemptRecord) {
  const error = attempt.error ? errorProjection("attempt", attempt.error, attempt.id) : undefined;
  return { id: attempt.id, runId: attempt.runId, stepRunId: attempt.stepRunId, state: attempt.state,
    ...(error ? { error: error.message, errorId: error.errorId } : {}) };
}

export function projectWorkflowEvent(event: WorkflowEvent) {
  const known = ["agent.lifecycle", "agent.delegate", "agent.usage", "candidate.copied", "workflow.waiting", "step.waiting",
    "validation.completed", "agent.failed", "workflow.failed", "step.failed", "workflow.started", "workflow.completed",
    "workflow.blocked", "workflow.needs_review", "workflow.canceled", "step.started", "step.completed", "step.reused",
    "artifact.published", "cancellation.requested", "decision.recorded", "agent.started", "agent.completed"].includes(event.type);
  return { id: event.id, runId: event.runId, seq: event.seq, type: known ? event.type : "workflow.event.redacted",
    timestamp: event.timestamp, stepRunId: event.stepRunId, attemptId: event.attemptId, parentRunId: event.parentRunId,
    data: publicEventData(event) };
}

export function projectArtifactPayload(_artifact: ArtifactRef, raw: unknown) {
  if (_artifact.type === "post-evidence" || _artifact.type === "creator-evidence") {
    const pinned = object(raw);
    const source = object(pinned?.source);
    const sourceRefs = Object.fromEntries([
      "sourceMediaArtifactRef", "detailArtifactRef", "mediaManifestArtifactRef", "selectionArtifactRef",
      "reconstructionBatchArtifactRef", "portfolioArtifactRef", "portfolioAnnotationsArtifactRef"
    ].flatMap((key) => {
      const ref = safeArtifactRef(source?.[key]);
      return ref ? [[key, ref]] : [];
    }));
    return {
      kind: "frozen-input",
      source: { kind: pinned?.kind === "post" || pinned?.kind === "creator" ? pinned.kind : undefined,
        creatorRunId: safeIdentifier(source?.creatorRunId), postExternalId: safeIdentifier(source?.postExternalId), refs: sourceRefs },
      files: safeFrozenFiles(pinned?.files), methods: safeMethods(pinned?.methods),
      reuseCandidate: safeReuse(pinned?.reuseCandidate), reuseEvaluation: safeReuse(pinned?.reuseEvaluation)
    };
  }
  if (_artifact.type === "post-source-check") return projectPostSourceCheck(raw);
  if (_artifact.type === "post-review" || _artifact.type === "creator-review") return projectResearchReview(raw, _artifact.type);
  if (_artifact.type === "research-revision") return projectResearchRevision(raw);
  if (_artifact.type === "post-evaluation") return projectPostEvaluation(raw);
  if (_artifact.type === "creator-synthesis-evaluation" || _artifact.type === "creator-evaluation") return projectCreatorEvaluation(raw);
  return {
    kind: "withheld",
    message: "此资产的原始诊断数据仅保存在本地审计层；可读研究报告请使用对应阅读器。",
    errorId: diagnosticId("artifact-payload", typeof raw, _artifact.id)
  };
}

function safeEvidenceRef(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 500
    && !value.startsWith("/") && !value.includes("..") && /^[\p{L}\p{N}._:@/#-]+$/u.test(value)
    || safePublicArtifactPath(value);
}

function projectResearchReview(raw: unknown, artifactType: "post-review" | "creator-review") {
  const parsed = researchReviewArtifactSchema.safeParse(raw);
  const expectedKind = artifactType === "post-review" ? "post" : "creator";
  if (!parsed.success || parsed.data.kind !== expectedKind
    || !parsed.data.findings.every((finding) => finding.evidenceRefs.every(safeEvidenceRef))) {
    return { kind: "research-review", message: "研究复核载荷未通过公开业务合同校验。" };
  }
  const review = parsed.data;
  return {
    kind: "research-review", schemaVersion: review.schemaVersion, subjectKind: review.kind,
    candidate: review.candidate, candidateReportSha256: review.candidateReportSha256,
    summary: review.summary,
    findings: review.findings.map((finding) => ({ id: finding.id, location: finding.location, issue: finding.issue,
      evidenceRefs: finding.evidenceRefs, suggestedChange: finding.suggestedChange,
      priority: finding.priority, kind: finding.kind }))
  };
}

function projectResearchRevision(raw: unknown) {
  const payload = object(raw);
  const artifact = (value: unknown) => {
    const source = object(value);
    const id = safeIdentifier(source?.id); const type = safeIdentifier(source?.type);
    const revision = safeIdentifier(source?.revision); const sha256 = safeHash(source?.sha256);
    return id && type && revision && sha256 ? { id, type, revision, sha256 } : undefined;
  };
  const baseCandidate = artifact(payload?.baseCandidate); const review = artifact(payload?.review); const candidate = artifact(payload?.candidate);
  const validation = object(payload?.validation);
  const dispositions = Array.isArray(payload?.dispositions) ? payload.dispositions.flatMap((value) => {
    const row = object(value); const id = safeIdentifier(row?.id);
    const status = row?.status; const reason = typeof row?.reason === "string" && row.reason.length <= 2_000 ? row.reason : undefined;
    return id && reason && ["changed", "disputed", "missing_evidence"].includes(String(status))
      ? [{ id, status: status as "changed" | "disputed" | "missing_evidence", reason }] : [];
  }) : [];
  if (payload?.schemaVersion !== "research-revision@1" || !baseCandidate || !review || !candidate
    || !Array.isArray(payload?.dispositions) || dispositions.length !== payload.dispositions.length || validation?.valid !== true) {
    return { kind: "research-revision", message: "修订记录未通过公开业务合同校验。" };
  }
  return { kind: "research-revision", schemaVersion: payload.schemaVersion, baseCandidate, review, candidate,
    dispositions, validation: { valid: true } };
}

function projectPostSourceCheck(raw: unknown) {
  const parsed = sourceConsistencyCheckSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.comparisons.every((comparison) => comparison.evidenceRefs.every(safePublicArtifactPath))) {
    return {
      kind: "post-source-check",
      message: "来源检查载荷未通过公开业务合同校验；未展示未经核验的结论。"
    };
  }
  const check = parsed.data;
  return {
    kind: "post-source-check",
    schemaVersion: check.schemaVersion,
    inputSha256: check.inputSha256,
    verdict: check.verdict,
    summary: check.summary,
    comparisons: check.comparisons.map((comparison) => ({ postClaim: comparison.postClaim, relation: comparison.relation,
      evidenceRefs: comparison.evidenceRefs, reason: comparison.reason,
      ...(check.schemaVersion === "post-source-consistency@2" && "bearing" in comparison ? { bearing: comparison.bearing } : {}) })),
    provenance: {
      model: check.provenance.model,
      reasoningEffort: check.provenance.reasoningEffort,
      methodSha256: check.provenance.methodSha256,
      threadId: check.provenance.threadId
    }
  };
}

function safePublicArtifactPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/artifacts/")) return false;
  const segments = value.split("/").slice(2);
  return segments.length > 0 && segments.every((segment) => /^[a-zA-Z0-9._:@-]+$/u.test(segment) && segment !== "." && segment !== "..");
}

function safeArtifactRef(value: unknown): string | undefined {
  return typeof value === "string" && /^(?:\/artifacts\/|artifact:)[a-zA-Z0-9._:@/-]{1,500}$/u.test(value) ? value : undefined;
}

function safeFrozenFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = object(entry); const ref = safeArtifactRef(record?.ref); const sha256 = safeHash(record?.sha256);
    return ref && sha256 ? [{ ref, sha256 }] : [];
  });
}

function safeMethods(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = object(entry);
    const path = typeof record?.path === "string" && /^[a-zA-Z0-9._/-]{1,300}$/u.test(record.path) ? record.path : undefined;
    const sha256 = safeHash(record?.sha256);
    return path && sha256 ? [{ path, sha256 }] : [];
  });
}

function safeReuse(value: unknown) {
  const record = object(value); const artifactRef = safeArtifactRef(record?.artifactRef); const sha256 = safeHash(record?.sha256);
  const candidateSha256 = safeHash(record?.candidateSha256);
  return artifactRef && sha256 ? { artifactRef, sha256, ...(candidateSha256 ? { candidateSha256 } : {}) } : undefined;
}

function projectPostEvaluation(raw: unknown) {
  const payload = object(raw);
  const parsed = videoReconstructionOutcomeSchema.safeParse(payload?.outcome);
  if (!parsed.success) return withheldEvaluation("post-evaluation");
  const outcome = parsed.data;
  return {
    kind: "post-evaluation",
    outcome: {
      state: outcome.state,
      evaluationMode: "evaluationMode" in outcome ? outcome.evaluationMode : undefined,
      failedGateIds: "failedGateIds" in outcome ? safeIdentifiers(outcome.failedGateIds) : undefined,
      qualityWarningGateIds: "qualityWarningGateIds" in outcome ? safeIdentifiers(outcome.qualityWarningGateIds) : undefined,
      gateCount: "gateCount" in outcome && Number.isSafeInteger(outcome.gateCount) ? outcome.gateCount : undefined,
      threeLensGateCount: "threeLensGateCount" in outcome && Number.isSafeInteger(outcome.threeLensGateCount) ? outcome.threeLensGateCount : undefined
    }
  };
}

function projectCreatorEvaluation(raw: unknown) {
  const payload = object(raw);
  const parsed = creatorSynthesisGateSchema.safeParse(payload?.gate);
  if (!parsed.success) return withheldEvaluation("creator-evaluation");
  const gate = parsed.data;
  return {
    kind: "creator-evaluation",
    gate: { ready: gate.ready, failedGateIds: safeIdentifiers(gate.failedGateIds) ?? [],
      gates: gate.gates.map(({ id, pass, message }) => ({ id, pass, message })) }
  };
}

function withheldEvaluation(kind: string) {
  return { kind, message: "评估载荷未通过公开业务合同校验。" };
}

export function projectWorkflowHttpError(error: unknown): PublicDiagnostic {
  return errorProjection("http", error instanceof Error ? error.message : error, "workflow-http");
}
