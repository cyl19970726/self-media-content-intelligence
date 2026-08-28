import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { runtimeDir, SQLiteLearningLoopRepository } from "../../packages/adapters/index.js";
import { LearningLoopService, type LearningLoopEvent } from "../../packages/research/index.js";
import {
  learningLoopArtifactSchema,
  learningLoopBlindTraceSchema,
  learningLoopCaseSchema,
  learningLoopDiagnosisSchema,
  learningLoopGateSchema,
  learningLoopRegressionSchema,
  learningLoopRunSchema,
  type LearningLoopArtifact,
  type LearningLoopRun
} from "../shared/learning-loop.js";

const operationKeySchema = z.string().trim().min(8).max(160);

export const createLearningLoopInputSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  policyVersion: z.string().trim().min(1).max(80),
  inputHash: z.string().trim().min(1).max(256),
  upstreamHashes: z.record(z.string().min(1), z.string().min(1)),
  targetCreatorIds: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  pendingObservationIds: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
  operationKey: operationKeySchema
}).strict();

export const moveLearningLoopInputSchema = z.object({
  target: z.enum(["sampling", "creator_running", "video_evaluating"]),
  operationKey: operationKeySchema
}).strict();

export const addLearningLoopArtifactInputSchema = z.object({
  artifact: learningLoopArtifactSchema,
  operationKey: operationKeySchema
}).strict();

export const addLearningLoopCasesInputSchema = z.object({
  cases: z.array(learningLoopCaseSchema).min(1).max(100),
  operationKey: operationKeySchema
}).strict();

export const recordLearningLoopLensGateInputSchema = z.object({
  gate: learningLoopGateSchema.refine(
    (value) => ["content_restoration", "directing_logic", "visual_editing_logic"].includes(value.kind),
    "gate must be a content restoration, directing logic, or visual editing gate"
  ),
  operationKey: operationKeySchema
}).strict();

export const beginLearningLoopBlindInputSchema = z.object({
  traces: z.array(learningLoopBlindTraceSchema).min(1).max(50),
  operationKey: operationKeySchema
}).strict();

export const recordLearningLoopBlindResultInputSchema = z.object({
  updates: z.array(z.object({
    traceId: z.string().min(1),
    pass: z.boolean(),
    outputArtifactId: z.string().min(1),
    completedAt: z.string().datetime()
  }).strict()).min(1).max(50),
  operationKey: operationKeySchema
}).strict();

export const stopLearningLoopInputSchema = z.object({
  status: z.enum(["blocked", "failed"]),
  reason: z.string().trim().min(1).max(1000),
  operationKey: operationKeySchema
}).strict();

export const recordLearningLoopDiagnosisInputSchema = z.object({
  diagnosis: learningLoopDiagnosisSchema,
  operationKey: operationKeySchema
}).strict();

export const beginLearningLoopRegressionInputSchema = z.object({ operationKey: operationKeySchema }).strict();

export const recordLearningLoopRegressionInputSchema = z.object({
  regression: learningLoopRegressionSchema,
  gates: z.tuple([learningLoopGateSchema, learningLoopGateSchema, learningLoopGateSchema])
    .refine((gates) => {
      const kinds = new Set(gates.map((gate) => gate.kind));
      return kinds.size === 3 && ["regression", "untouched_holdout", "meta_coverage"].every((kind) => kinds.has(kind as typeof gates[number]["kind"]));
    }, "regression gates must contain exactly regression, untouched_holdout, and meta_coverage"),
  operationKey: operationKeySchema
}).strict();

export const adjudicateLearningLoopInputSchema = z.object({
  decisions: z.array(z.object({
    id: z.string().min(1),
    runId: z.string().min(1),
    observationId: z.string().min(1),
    decision: z.enum(["promote", "reject", "defer"]),
    rationale: z.string().min(1),
    adjudicatorId: z.string().min(1),
    artifactId: z.string().min(1),
    createdAt: z.string().datetime()
  }).strict()).min(1).max(100),
  operationKey: operationKeySchema
}).strict().superRefine((value, context) => {
  const promotionCount = value.decisions.filter((decision) => decision.decision === "promote").length;
  if (promotionCount > 0 && promotionCount !== value.decisions.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "promotion requires every independent adjudication to pass" });
  }
});

export type LearningLoopLineage = {
  runId: string;
  nodes: Array<Pick<LearningLoopArtifact, "id" | "caseId" | "kind" | "uri" | "sha256" | "createdAt">>;
  edges: Array<{ from: string; to: string }>;
};

export class LearningLoopControlPlane {
  readonly service: LearningLoopService;

  constructor(private readonly repository: SQLiteLearningLoopRepository) {
    this.service = new LearningLoopService(repository);
  }

  list(limit = 50): LearningLoopRun[] { return this.repository.list(limit); }
  get(id: string): LearningLoopRun | null { return this.service.get(id); }
  events(id: string): LearningLoopEvent[] { return this.repository.listEvents(id); }
  importRun(run: LearningLoopRun, operationKey: string): LearningLoopRun {
    return this.repository.create(run, operationKey, hash(operationKey));
  }
  lineage(id: string): LearningLoopLineage | null {
    const run = this.get(id);
    if (!run) return null;
    return {
      runId: id,
      nodes: run.artifacts.map(({ id: artifactId, caseId, kind, uri, sha256, createdAt }) => ({ id: artifactId, caseId, kind, uri, sha256, createdAt })),
      edges: run.artifacts.flatMap((artifact) => artifact.parentArtifactIds.map((parentId) => ({ from: parentId, to: artifact.id })))
    };
  }
  close(): void { this.repository.close(); }
}

export function createDurableLearningLoopControlPlane(filePath = path.join(runtimeDir(), "learning-loop.sqlite")): LearningLoopControlPlane {
  return new LearningLoopControlPlane(new SQLiteLearningLoopRepository(filePath));
}

function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }

/** Imports the first real product-blind audit. It is diagnosis evidence, never concept evidence. */
export function seedInitialProductBlindAudit(controlPlane: LearningLoopControlPlane): LearningLoopRun {
  const id = "product-blind-2026-08-21-v1";
  const existing = controlPlane.get(id);
  if (existing) return existing;
  const createdAt = "2026-08-21T12:00:00.000Z";
  const sourceId = "artifact:product-blind:task-contract";
  const captureId = "artifact:product-blind:operator-trace";
  const outputId = "artifact:product-blind:result";
  const diagnosisId = "artifact:product-blind:diagnosis";
  const run = learningLoopRunSchema.parse({
    id,
    status: "repair_queued",
    policyVersion: "product-blind/v1",
    inputHash: hash("/creators|three-creators|6801|comparison|new-link-status"),
    upstreamHashes: { dashboard: hash("http://127.0.0.1:4310/creators") },
    targetCreatorIds: ["ai-red-witch", "zhang-zala", "human-director"],
    cases: [{
      id: "case:product-workbench-walkthrough", runId: id, role: "development",
      creatorId: "product-workbench", videoId: "cross-surface-walkthrough",
      sourceRevisionId: "dashboard-2026-08-21", sourceHash: hash("product-blind-task-v1"),
      untouched: false, createdAt
    }],
    artifacts: [
      { id: sourceId, runId: id, caseId: "case:product-workbench-walkthrough", kind: "source", uri: "product://blind-task/creators-to-comparison", sha256: hash("识别3博主→判断基本盘/爆发/失效→6801三镜头与证据→创建2人比较→判断新链接任务状态"), parentArtifactIds: [], createdAt },
      { id: captureId, runId: id, caseId: "case:product-workbench-walkthrough", kind: "capture", uri: "audit://product-blind/TARGET-0003,TARGET-0023,TARGET-0025,TARGET-0033,TARGET-0055", sha256: hash("discoverability-pass|three-lens-pass|data-honesty-partial|evidence-jump-partial|comparison-fail|new-task-transparency-fail"), parentArtifactIds: [sourceId], createdAt },
      { id: outputId, runId: id, caseId: "case:product-workbench-walkthrough", kind: "blind_trace", uri: "audit://product-blind/result/fail-product-closure", sha256: hash("FAIL: product closure; content facts not failed"), parentArtifactIds: [sourceId, captureId], createdAt },
      { id: diagnosisId, runId: id, caseId: null, kind: "diagnosis", uri: "diagnosis://product-projection/comparison-dead-end-and-task-transparency", sha256: hash("P0 comparison dead-end; P1 task transparency, validation takeover, retry, dedupe, completion, actual sample count"), parentArtifactIds: [outputId], createdAt }
    ],
    gates: [
      { id: "gate:product-blind:isolation", runId: id, caseId: "case:product-workbench-walkthrough", kind: "blind_input_isolation", pass: true, evaluatorId: "independent-product-user", evaluatorVersion: "v1", evidenceArtifactIds: [sourceId, captureId], reasons: [], passedChecks: 2, requiredChecks: 2, createdAt },
      { id: "gate:product-blind:traceability", runId: id, caseId: "case:product-workbench-walkthrough", kind: "blind_traceability", pass: true, evaluatorId: "independent-product-user", evaluatorVersion: "v1", evidenceArtifactIds: [outputId], reasons: [], passedChecks: 1, requiredChecks: 1, createdAt },
      { id: "gate:product-blind:quality", runId: id, caseId: "case:product-workbench-walkthrough", kind: "blind_quality", pass: false, evaluatorId: "independent-product-user", evaluatorVersion: "v1", evidenceArtifactIds: [outputId], reasons: ["多博主比较入口形成死路", "新任务状态与接管方式不透明", "证据回跳仅部分可用"], passedChecks: 0, requiredChecks: 1, createdAt }
    ],
    blindTraces: [{ id: "trace:product-blind:v1", runId: id, caseId: "case:product-workbench-walkthrough", inputArtifactIds: [sourceId, captureId], allowedKinds: ["source", "capture"], outputArtifactId: outputId, leakageKinds: [], pass: false, createdAt, completedAt: createdAt }],
    diagnoses: [{ id: "diagnosis:product-blind:v1", runId: id, blindTraceIds: ["trace:product-blind:v1"], failureClosures: ["product_projection", "cross_surface_navigation", "task_state_transparency"], proposedRepairs: ["修复固定版本的多博主比较入口", "展示链接校验、阶段、接管、重试、去重和完成提示", "展示实际样本数并保持证据回跳"], artifactId: diagnosisId, createdAt }],
    regressions: [],
    observationAdjudications: [],
    pendingObservationIds: [],
    blockedReason: null,
    failureReason: null,
    staleReason: null,
    revision: 0,
    createdAt,
    updatedAt: createdAt
  });
  return controlPlane.importRun(run, "seed:product-blind:2026-08-21:v1");
}

/** Creates a separate, unpassed V2 regression task. It never rewrites the failed V1 audit. */
export function seedProductBlindRegressionV2(controlPlane: LearningLoopControlPlane): LearningLoopRun {
  const id = "product-blind-2026-08-21-regression-v2";
  const existing = controlPlane.get(id);
  if (existing) return existing;
  return controlPlane.service.create({
    id,
    policyVersion: "product-blind/v2-regression",
    inputHash: hash("regression-v2|comparison-fixed|task-state-fixed|second-blind-required"),
    upstreamHashes: { dashboard: hash("http://127.0.0.1:4310/creators") },
    targetCreatorIds: ["ai-red-witch", "zhang-zala", "human-director"],
    pendingObservationIds: [],
    operationKey: "seed:product-blind:regression-v2"
  });
}
