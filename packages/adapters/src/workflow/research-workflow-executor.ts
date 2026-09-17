import type { DatabaseSync } from "node:sqlite";
import type {
  CreatorAnalysisWorkflowInput, CreatorAnalysisWorkflowStartInput, CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowStartInput,
  PostWorkflowInput, PostWorkflowStartInput, ResearchWorkflowDefinitions,
  ResearchWorkflowExecutor, WorkflowQueueReceipt,
} from "../../../research/index.js";
import { canonicalWorkflowValue, runWorkflow, workflowFingerprint, type AgentRunner, type ChildWorkflowDispatchRequest, type ChildWorkflowDispatcher,
  type ChildWorkflowSnapshot, type RunState, type RunStore, type WorkflowDefinition } from "../../../workflow/index.js";

type WorkflowKind = "post" | "creator_synthesis" | "creator_analysis" | "child";
type QueueState = WorkflowQueueReceipt["state"];

type ExecutionRecord = {
  id: string;
  creatorRunId: string;
  kind: WorkflowKind;
  definitionRevision: string;
  generation: number;
  state: QueueState;
  stepKey?: string;
  frozenInput: unknown;
  workflowId: string;
  parentWorkflowRunId?: string;
  parentStepRunId?: string;
  error?: string;
};

export interface ResearchWorkflowInputFreezer {
  post(input: PostWorkflowStartInput): Promise<PostWorkflowInput>;
  creator(input: CreatorSynthesisWorkflowStartInput): Promise<CreatorSynthesisWorkflowInput>;
  analysis(input: CreatorAnalysisWorkflowStartInput): Promise<CreatorAnalysisWorkflowInput>;
}

export interface WorkflowDefinitionRegistry {
  resolve(id: string, revision: string): WorkflowDefinition<unknown, unknown> | undefined;
}

export interface WorkflowAdvanceScheduler {
  enqueue(input: { creatorRunId: string; workflowRunId: string; workflowId: string; workflowRevision: string;
    generation: number; idempotencyKey: string }): unknown | Promise<unknown>;
}

/**
 * Queue-facing composition adapter. The existing research queue remains the
 * only dispatcher; this class freezes inputs and advances one root workflow
 * inside the queue's lease.
 */
export class SQLiteResearchWorkflowExecutor implements ResearchWorkflowExecutor, ChildWorkflowDispatcher {
  private readonly active = new Map<string, AbortController>();

  constructor(
    private readonly database: DatabaseSync,
    private readonly store: RunStore,
    private readonly runner: AgentRunner,
    private readonly definitions: ResearchWorkflowDefinitions,
    private readonly inputFreezer: ResearchWorkflowInputFreezer,
    private readonly registry?: WorkflowDefinitionRegistry,
    private readonly scheduler?: WorkflowAdvanceScheduler,
  ) {
    database.exec(`CREATE TABLE IF NOT EXISTS research_workflow_executions (
      id TEXT PRIMARY KEY,
      creator_run_id TEXT NOT NULL,
      document TEXT NOT NULL CHECK(json_valid(document))
    );
    CREATE INDEX IF NOT EXISTS research_workflow_execution_creator
      ON research_workflow_executions(creator_run_id);`);
  }

  async createPost(input: PostWorkflowStartInput): Promise<WorkflowQueueReceipt> {
    const frozen = await this.inputFreezer.post(input);
    if (frozen.creatorRunId !== input.creatorRunId || frozen.postExternalId !== input.postExternalId) throw new Error("Frozen post input identity mismatch");
    return this.create("post", input.creatorRunId, this.definitions.post, frozen);
  }

  async createSynthesis(input: CreatorSynthesisWorkflowStartInput): Promise<WorkflowQueueReceipt> {
    const frozen = await this.inputFreezer.creator(input);
    if (frozen.creatorRunId !== input.creatorRunId) throw new Error("Frozen synthesis input identity mismatch");
    return this.create("creator_synthesis", input.creatorRunId, this.definitions.creatorSynthesis, frozen);
  }

  async createAnalysis(input: CreatorAnalysisWorkflowStartInput): Promise<WorkflowQueueReceipt> {
    if (!this.definitions.creatorAnalysis) throw new Error("Creator analysis workflow is not configured");
    const frozen = await this.inputFreezer.analysis(input);
    if (frozen.creatorRunId !== input.creatorRunId) throw new Error("Frozen creator analysis input identity mismatch");
    return this.create("creator_analysis", input.creatorRunId, this.definitions.creatorAnalysis, frozen);
  }

  async advance(input: { creatorRunId: string; workflowRunId: string; generation: number; signal: AbortSignal }): Promise<WorkflowQueueReceipt> {
    let record = this.required(input.workflowRunId, input.creatorRunId);
    if (record.generation !== input.generation) throw new Error("Stale workflow generation");
    if (record.state === "cancel_requested" || input.signal.aborted) {
      record = this.patch(record, { state: "canceled" });
      return receipt(record);
    }
    if (isTerminal(record.state)) {
      await this.reconcileTerminalProjection(record);
      return receipt(record);
    }

    let definition: WorkflowDefinition<unknown, unknown>;
    try {
      definition = this.definition(record);
    } catch (error) {
      const message = safeError(error);
      await this.projectCoreFailure(record.id, message);
      record = this.patch(record, { state: "failed", error: message });
      return receipt(record);
    }
    if (definition.revision !== record.definitionRevision) {
      await this.projectCoreFailure(record.id, "WORKFLOW_DEFINITION_REVISION_MISMATCH");
      record = this.patch(record, { state: "failed", error: "WORKFLOW_DEFINITION_REVISION_MISMATCH" });
      return receipt(record);
    }
    const controller = new AbortController();
    const signal = AbortSignal.any([input.signal, controller.signal]);
    this.active.set(record.id, controller);
    record = this.patch(record, { state: "running", error: undefined });
    const cancelPoll = setInterval(() => {
      const persisted = this.read(record.id);
      if (persisted?.state === "cancel_requested" || persisted?.state === "canceled") {
        controller.abort(new Error("WORKFLOW_CANCEL_REQUESTED"));
      }
    }, 250);
    try {
      const result = await runWorkflow({
        workflow: definition,
        input: record.frozenInput,
        store: this.store,
        agentRunner: this.runner,
        signal,
        resumeRunId: record.id,
        metadata: { creatorRunId: record.creatorRunId, workflowKind: record.kind },
        childDispatcher: this.registry && this.scheduler ? this : undefined,
      });
      record = this.patch(record, { state: toQueueState(result.run.state) });
    } catch (error) {
      const coreRun = await this.store.getRun(record.id);
      const state = signal.aborted || coreRun?.state === "canceled" ? "canceled" : "failed";
      if (state === "failed") await this.projectCoreFailure(record.id, safeError(error));
      record = this.patch(record, { state, error: safeError(error) });
    } finally {
      clearInterval(cancelPoll);
      this.active.delete(record.id);
    }
    if (isTerminal(record.state)) await this.wakeParent(record);
    return receipt(record);
  }

  async ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>): Promise<ChildWorkflowSnapshot<Output>> {
    if (!this.registry || !this.scheduler) throw new Error("Durable child dispatch is not configured");
    const parent = this.read(request.parentRunId);
    if (!parent) throw new Error("Durable child parent execution not found");
    let child = this.readByParentStep(request.parentStepRunId);
    if (!child) {
      const definition = this.registry.resolve(request.definition.id, request.definition.revision);
      if (!definition) throw new Error(`Workflow definition is not registered: ${request.definition.id}@${request.definition.revision}`);
      const childNavigation = navigationMetadata(request.input);
      const run = await this.store.createRun({ workflowId: definition.id, workflowRevision: definition.revision,
        inputFingerprint: workflowFingerprint(request.input), state: "queued", parentRunId: request.parentRunId,
        parentStepRunId: request.parentStepRunId, metadata: { ...request.metadata, creatorRunId: parent.creatorRunId,
          workflowKind: "child", ...childNavigation } });
      child = { id: run.id, creatorRunId: parent.creatorRunId, kind: "child", definitionRevision: definition.revision,
        workflowId: definition.id, generation: 1, state: "queued", frozenInput: canonicalWorkflowValue(request.input),
        parentWorkflowRunId: parent.id, parentStepRunId: request.parentStepRunId };
      this.insert(child);
    } else if (child.workflowId !== request.definition.id || child.definitionRevision !== request.definition.revision) {
      throw new Error("Durable child definition mismatch for parent step");
    }
    if (child.state === "queued" || child.state === "running" || child.state === "waiting") {
      await this.scheduler.enqueue({ creatorRunId: child.creatorRunId, workflowRunId: child.id, generation: child.generation,
        workflowId: child.workflowId,
        workflowRevision: child.definitionRevision,
        idempotencyKey: `workflow-child:${request.parentStepRunId}:${child.generation}` });
    }
    const run = await this.store.getRun(child.id);
    const state = run?.state ?? (child.state === "cancel_requested" ? "running" : child.state);
    return { childRunId: child.id, state, output: run?.output as Output | undefined, error: run?.error ?? child.error };
  }

  /**
   * Queues one legacy post Builder again only when its prior attempt failed the
   * documented core-evidence count gate. The frozen input and all prior
   * artifacts stay immutable; normal durable wake-ups then run the existing
   * independent review path.
   */
  async prepareCoreEvidenceCountBuilderRecovery(input: { creatorRunId: string; workflowRunId: string }): Promise<WorkflowQueueReceipt> {
    const record = this.required(input.workflowRunId, input.creatorRunId);
    if (record.workflowId !== "post.build" || record.definitionRevision !== "v1") {
      throw new Error("CORE_EVIDENCE_RECOVERY_REQUIRES_LEGACY_POST_BUILD");
    }
    if (record.state !== "failed" || !isCoreEvidenceCountFailure(record.error)) {
      throw new Error("CORE_EVIDENCE_RECOVERY_REQUIRES_ONLY_CORE_EVIDENCE_COUNT_FAILURE");
    }
    const coreRun = await this.store.getRun(record.id);
    if (!coreRun || coreRun.workflowId !== record.workflowId || coreRun.workflowRevision !== record.definitionRevision
      || coreRun.inputFingerprint !== workflowFingerprint(record.frozenInput)) {
      throw new Error("CORE_EVIDENCE_RECOVERY_FROZEN_INPUT_MISMATCH");
    }
    const builderSteps = (await this.store.listSteps(record.id)).filter((step) => step.key === "builder");
    if (builderSteps.length !== 1 || builderSteps[0]!.state !== "failed" || !isCoreEvidenceCountFailure(builderSteps[0]!.error)) {
      throw new Error("CORE_EVIDENCE_RECOVERY_REQUIRES_FAILED_BUILDER_STEP");
    }
    const queued = await this.prepareRetry({ ...input, stepKey: "builder" });
    await this.store.appendEvent({ runId: record.id, type: "workflow.core_evidence_recovery_queued", data: {
      workflowId: record.workflowId, workflowRevision: record.definitionRevision, stepKey: "builder",
      originalBuilderStepId: builderSteps[0]!.id, gateId: "builder_integrity_core_evidence_count",
      frozenInputFingerprint: coreRun.inputFingerprint,
    } });
    return queued;
  }

  async prepareRetry(input: { creatorRunId: string; workflowRunId: string; stepKey: string }): Promise<WorkflowQueueReceipt> {
    let record = this.required(input.workflowRunId, input.creatorRunId);
    if (record.state !== "failed" && record.state !== "needs_review") throw new Error("Only failed or needs-review workflows can be retried");
    const matches = (await this.store.listSteps(record.id)).filter((step) => step.key === input.stepKey);
    if (!matches.length) throw new Error(`Unknown workflow step: ${input.stepKey}`);
    if (!matches.some((step) => step.state === "failed" || step.state === "needs_review" || step.validation === "invalid")) {
      throw new Error(`Workflow step is not retryable: ${input.stepKey}`);
    }
    for (const step of matches) {
      const child = this.readByParentStep(step.id);
      if (child && child.state !== "succeeded" && child.state !== "blocked" && child.state !== "needs_review") {
        throw new Error(`CHILD_WORKFLOW_RETRY_REQUIRED:${child.id}:${child.state}`);
      }
    }
    record = this.patch(record, { generation: record.generation + 1, state: "queued", stepKey: input.stepKey, error: undefined });
    return receipt(record);
  }

  /**
   * Recovers only a root that was interrupted before dispatch because a newer
   * default temporarily hid its persisted definition revision. Existing durable
   * steps remain intact and are reused only by their ordinary fingerprints.
   */
  async recoverPreExecutionDefinitionMismatch(input: { creatorRunId: string; workflowRunId: string }): Promise<WorkflowQueueReceipt> {
    let record = this.required(input.workflowRunId, input.creatorRunId);
    if (record.state !== "failed" || record.error !== "WORKFLOW_DEFINITION_REVISION_MISMATCH") {
      throw new Error("Only pre-execution definition revision mismatches can be recovered");
    }
    const definition = this.definition(record);
    if (definition.id !== record.workflowId || definition.revision !== record.definitionRevision) {
      throw new Error("Persisted workflow definition is still unavailable");
    }
    const coreRun = await this.store.getRun(record.id);
    if (!coreRun || coreRun.workflowId !== record.workflowId || coreRun.workflowRevision !== record.definitionRevision
      || coreRun.inputFingerprint !== workflowFingerprint(record.frozenInput)) {
      throw new Error("Persisted workflow identity does not match frozen execution input");
    }
    record = this.patch(record, { generation: record.generation + 1, state: "queued", error: undefined });
    await this.store.updateRun(record.id, { state: "queued", error: undefined });
    await this.store.appendEvent({ runId: record.id, type: "workflow.definition_recovered", data: {
      workflowId: record.workflowId, workflowRevision: record.definitionRevision,
      preservedStepCount: (await this.store.listSteps(record.id)).length } });
    return receipt(record);
  }

  async cancel(workflowRunId: string): Promise<void> {
    const record = this.read(workflowRunId);
    if (!record) return;
    if (isTerminal(record.state)) {
      await this.reconcileTerminalProjection(record);
      return;
    }
    const controller = this.active.get(workflowRunId);
    const state = controller ? "cancel_requested" : "canceled";
    this.patch(record, { state });
    await this.store.appendEvent({ runId: record.id, type: "cancellation.requested" });
    if (state === "canceled") await this.store.updateRun(record.id, { state: "canceled" });
    controller?.abort(new Error("WORKFLOW_CANCEL_REQUESTED"));
    await this.cancelChildren(workflowRunId, "PARENT_WORKFLOW_CANCELED");
  }

  async cancelChildren(parentRunId: string, reason: unknown = "PARENT_WORKFLOW_CANCELED"): Promise<void> {
    const rows = this.database.prepare("SELECT document FROM research_workflow_executions WHERE json_extract(document, '$.parentWorkflowRunId') = ?")
      .all(parentRunId);
    for (const row of rows) {
      const child = JSON.parse(String(row.document)) as ExecutionRecord;
      if (isTerminal(child.state)) continue;
      const controller = this.active.get(child.id);
      const state = controller ? "cancel_requested" : "canceled";
      this.patch(child, { state, error: safeError(reason) });
      await this.store.appendEvent({ runId: child.id, type: "cancellation.requested", data: { parentRunId } });
      if (state === "canceled") await this.store.updateRun(child.id, { state: "canceled", error: safeError(reason) });
      controller?.abort(reason);
      await this.cancelChildren(child.id, reason);
    }
  }

  async snapshot(creatorRunId: string, workflowRunId: string): Promise<WorkflowQueueReceipt | null> {
    const record = this.read(workflowRunId);
    if (!record || record.creatorRunId !== creatorRunId) return null;
    if (isTerminal(record.state)) await this.reconcileTerminalProjection(record);
    return receipt(record);
  }

  private async create<Input>(kind: WorkflowKind, creatorRunId: string, definition: WorkflowDefinition<Input, unknown>, input: Input): Promise<WorkflowQueueReceipt> {
    const navigation = navigationMetadata(input);
    const run = await this.store.createRun({ workflowId: definition.id, workflowRevision: definition.revision,
      inputFingerprint: workflowFingerprint(input), state: "queued", metadata: { creatorRunId, workflowKind: kind, ...navigation } });
    const record: ExecutionRecord = {
      id: run.id, creatorRunId, kind, workflowId: definition.id, definitionRevision: definition.revision,
      generation: 1, state: "queued", frozenInput: canonicalWorkflowValue(input),
    };
    this.insert(record);
    return receipt(record);
  }

  private definition(record: ExecutionRecord): WorkflowDefinition<unknown, unknown> {
    // The default may advance to a newer revision while durable runs must resume
    // the exact registered definition recorded at creation time.
    if (record.kind === "post" && this.definitions.post.revision === record.definitionRevision) {
      return this.definitions.post as WorkflowDefinition<unknown, unknown>;
    }
    if (record.kind === "creator_synthesis" && this.definitions.creatorSynthesis.revision === record.definitionRevision) {
      return this.definitions.creatorSynthesis as WorkflowDefinition<unknown, unknown>;
    }
    if (record.kind === "creator_analysis" && this.definitions.creatorAnalysis?.revision === record.definitionRevision) {
      return this.definitions.creatorAnalysis as WorkflowDefinition<unknown, unknown>;
    }
    const definition = this.registry?.resolve(record.workflowId, record.definitionRevision);
    if (!definition) throw new Error(`Workflow definition is not registered: ${record.workflowId}@${record.definitionRevision}`);
    return definition;
  }

  private async projectCoreFailure(runId: string, error: string): Promise<void> {
    const run = await this.store.getRun(runId);
    if (!run || ["succeeded", "failed", "blocked", "needs_review", "canceled"].includes(run.state)) return;
    await this.store.updateRun(runId, { state: "failed", error });
    await this.store.appendEvent({ runId, type: "workflow.failed", data: { error } });
  }

  private async reconcileTerminalProjection(record: ExecutionRecord): Promise<void> {
    if (!isTerminal(record.state)) return;
    const run = await this.store.getRun(record.id);
    if (!run || (run.state === record.state && (!record.error || run.error === record.error))) return;
    await this.store.updateRun(record.id, { state: record.state as RunState, ...(record.error ? { error: record.error } : {}) });
    await this.store.appendEvent({ runId: record.id, type: "workflow.projection_reconciled",
      data: { state: record.state, source: "research_workflow_execution" } });
  }

  private async wakeParent(record: ExecutionRecord): Promise<void> {
    if (!record.parentWorkflowRunId || !this.scheduler) return;
    const parent = this.read(record.parentWorkflowRunId);
    if (!parent || (parent.state !== "running" && parent.state !== "waiting")) return;
    await this.scheduler.enqueue({ creatorRunId: parent.creatorRunId, workflowRunId: parent.id, generation: parent.generation,
      workflowId: parent.workflowId,
      workflowRevision: parent.definitionRevision,
      idempotencyKey: `workflow-wake:${record.id}:${record.generation}:${record.state}` });
  }

  private readByParentStep(parentStepRunId: string): ExecutionRecord | undefined {
    const row = this.database.prepare("SELECT document FROM research_workflow_executions WHERE json_extract(document, '$.parentStepRunId') = ? LIMIT 1").get(parentStepRunId);
    return row ? JSON.parse(String(row.document)) as ExecutionRecord : undefined;
  }

  private insert(record: ExecutionRecord): void {
    this.database.prepare("INSERT INTO research_workflow_executions(id, creator_run_id, document) VALUES (?, ?, ?)")
      .run(record.id, record.creatorRunId, JSON.stringify(record));
  }

  private read(id: string): ExecutionRecord | undefined {
    const row = this.database.prepare("SELECT document FROM research_workflow_executions WHERE id = ?").get(id);
    return row ? JSON.parse(String(row.document)) as ExecutionRecord : undefined;
  }

  private required(id: string, creatorRunId: string): ExecutionRecord {
    const record = this.read(id);
    if (!record || record.creatorRunId !== creatorRunId) throw new Error("Research workflow execution not found");
    return record;
  }

  private patch(record: ExecutionRecord, patch: Partial<ExecutionRecord>): ExecutionRecord {
    const updated = { ...record, ...patch };
    this.database.prepare("UPDATE research_workflow_executions SET document = ? WHERE id = ?")
      .run(JSON.stringify(updated), record.id);
    return updated;
  }
}

function receipt(record: ExecutionRecord): WorkflowQueueReceipt {
  return { creatorRunId: record.creatorRunId, workflowRunId: record.id, workflowId: record.workflowId,
    workflowRevision: record.definitionRevision,
    state: record.state, generation: record.generation, stepKey: record.stepKey };
}

function isTerminal(state: QueueState): boolean {
  return state === "blocked" || state === "needs_review" || state === "succeeded" || state === "failed" || state === "canceled";
}

function toQueueState(state: RunState): QueueState {
  return state;
}

function isCoreEvidenceCountFailure(error: string | undefined): boolean {
  if (!error?.startsWith("POST_CANDIDATE_INCOMPLETE:")) return false;
  try {
    const outcome = JSON.parse(error.slice("POST_CANDIDATE_INCOMPLETE:".length)) as { failedGateIds?: unknown };
    return Array.isArray(outcome.failedGateIds) && outcome.failedGateIds.length === 1
      && outcome.failedGateIds[0] === "builder_integrity_core_evidence_count";
  } catch {
    return false;
  }
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function navigationMetadata(input: unknown): Readonly<Record<string, string>> {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>;
  const artifact = [value.evidence, value.frozenInputs, value.source]
    .find((candidate): candidate is { producedBy: { workflowRunId: string } } => Boolean(candidate && typeof candidate === "object"
      && "producedBy" in candidate && typeof (candidate as { producedBy?: { workflowRunId?: unknown } }).producedBy?.workflowRunId === "string"));
  return {
    ...(typeof value.postExternalId === "string" ? { postId: value.postExternalId } : {}),
    ...(artifact ? { sourceWorkflowRunId: artifact.producedBy.workflowRunId } : {}),
  };
}
