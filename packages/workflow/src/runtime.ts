import type {
  AgentDefinition, ArtifactDependency, ArtifactRef, MapSettledOptions, ParallelBranches, ParallelOptions,
  ParallelResults, ParallelSettledResults, PhaseArtifactBinding, PhaseContext, PhaseDefinition, StepKind, TaskImplementation,
  ValidationResult, ValidationState, WorkflowContext, WorkflowDefinition, WorkflowTerminal,
} from "./contracts.js";
import type { AgentRunner, ChildWorkflowDispatcher, RunRecord, RunStore, StepRecord } from "./ports.js";

export class WorkflowCanceledError extends Error {
  constructor() { super("Workflow execution was canceled"); this.name = "WorkflowCanceledError"; }
}

export interface RunWorkflowOptions<Input, Output> {
  workflow: WorkflowDefinition<Input, Output>;
  input: Input;
  store: RunStore;
  agentRunner: AgentRunner;
  signal?: AbortSignal;
  resumeRunId?: string;
  metadata?: Readonly<Record<string, unknown>>;
  parent?: { runId: string; stepRunId: string };
  childDispatcher?: ChildWorkflowDispatcher;
}

export interface RunWorkflowResult<Output> {
  run: RunRecord;
  output?: Output;
}

type RuntimeSharedState = { pending: Promise<void>[]; producerSteps: WeakMap<object, string[]> };
type PhaseScope = { phaseId: string; phasePath: readonly string[]; controlStepId: string;
  ownerRunId: string; bindings: PhaseArtifactBinding[] };

export function workflow<Input, Output>(
  id: string,
  options: { revision: string },
  execute: (context: WorkflowContext, input: Input) => Promise<Output>,
): WorkflowDefinition<Input, Output> {
  if (!id || !options.revision) throw new Error("Workflow id and revision are required");
  return Object.freeze({ id, revision: options.revision, execute });
}

export function defineAgent<Input, Output>(definition: AgentDefinition<Input, Output>): AgentDefinition<Input, Output> {
  if (!definition.model || !definition.reasoningEffort) throw new Error("Agent model and reasoningEffort must be explicit");
  return Object.freeze({ ...definition });
}

export async function runWorkflow<Input, Output>(options: RunWorkflowOptions<Input, Output>): Promise<RunWorkflowResult<Output>> {
  const inputFingerprint = workflowFingerprint(options.input);
  const existing = options.resumeRunId ? await options.store.getRun(options.resumeRunId) : undefined;
  if (options.resumeRunId && !existing) throw new Error(`Cannot resume unknown workflow run: ${options.resumeRunId}`);
  if (existing && (existing.workflowId !== options.workflow.id || existing.workflowRevision !== options.workflow.revision || existing.inputFingerprint !== inputFingerprint)) {
    throw new Error("Resume requires the exact workflow revision and input fingerprint");
  }
  const run = existing ?? await options.store.createRun({
    workflowId: options.workflow.id, workflowRevision: options.workflow.revision, inputFingerprint,
    state: "queued", parentRunId: options.parent?.runId, parentStepRunId: options.parent?.stepRunId,
    metadata: options.metadata,
  });
  const signal = options.signal ?? new AbortController().signal;
  await options.store.updateRun(run.id, { state: "running", error: undefined });
  await options.store.appendEvent({ runId: run.id, parentRunId: run.parentRunId, type: "workflow.started" });
  const context = new RuntimeContext(options.store, options.agentRunner, run, signal, options.childDispatcher,
    undefined, inheritedPhaseScope(run.metadata));
  try {
    context.assertActive();
    const output = await options.workflow.execute(context, options.input);
    await context.flush();
    context.assertActive();
    const terminalState = terminalStateOf(output) ?? "succeeded";
    await options.store.updateRun(run.id, { state: terminalState, output });
    await options.store.appendEvent({ runId: run.id, parentRunId: run.parentRunId, type: `workflow.${terminalState === "succeeded" ? "completed" : terminalState}`, data: output });
    return { run: (await options.store.getRun(run.id))!, output };
  } catch (error) {
    if (error instanceof WorkflowSuspendedError) {
      await context.flush();
      await options.store.updateRun(run.id, { state: "waiting", error: undefined });
      await options.store.appendEvent({ runId: run.id, parentRunId: run.parentRunId, type: "workflow.waiting", data: { childRunId: error.childRunId, stepRunId: error.stepRunId } });
      return { run: (await options.store.getRun(run.id))! };
    }
    const canceled = signal.aborted || error instanceof WorkflowCanceledError;
    const state = canceled ? "canceled" : "failed";
    if (canceled) await options.childDispatcher?.cancelChildren?.(run.id, signal.reason);
    await options.store.updateRun(run.id, { state, error: safeError(error) });
    await options.store.appendEvent({ runId: run.id, parentRunId: run.parentRunId, type: canceled ? "workflow.canceled" : "workflow.failed", data: { error: safeError(error) } });
    throw error;
  }
}

class RuntimeContext implements WorkflowContext {
  private readonly shared: RuntimeSharedState;
  constructor(private readonly store: RunStore, private readonly runner: AgentRunner, private readonly run: RunRecord, private readonly signal: AbortSignal,
    private readonly childDispatcher?: ChildWorkflowDispatcher, shared?: RuntimeSharedState,
    private readonly phaseScope?: PhaseScope) {
    this.shared = shared ?? { pending: [], producerSteps: new WeakMap<object, string[]>() };
  }

  async task<Input, Output>(key: string, implementation: TaskImplementation<Input, Output>, input: Input): Promise<Output> {
    return this.step(key, "task", input, "task:v1", "valid", (execution) => implementation(input, execution));
  }
  async agent<Input, Output>(key: string, definition: AgentDefinition<Input, Output>, input: Input): Promise<Output> {
    const config = workflowFingerprint({ id: definition.id, revision: definition.revision, model: definition.model,
      reasoningEffort: definition.reasoningEffort, promptRevision: definition.promptRevision,
      skillsRevision: definition.skillsRevision, permissionsRevision: definition.permissionsRevision, config: definition.config });
    return this.step(key, "agent", input, config, "pending", async (execution, emit) => {
      const result = await this.runner.run<Input, Output>({ ...execution, definition, input, signal: this.signal, emit, runMetadata: this.executionMetadata() });
      return { value: result.output, validation: result.validation ?? "pending" };
    });
  }
  async call<Input, Output>(key: string, definition: WorkflowDefinition<Input, Output>, input: Input): Promise<Output> {
    if (this.childDispatcher) return this.dispatchChild(key, definition, input);
    return this.step(key, "workflow", input, `${definition.id}:${definition.revision}`, "valid", async (execution) => {
      const child = await runWorkflow({ workflow: definition, input, store: this.store, agentRunner: this.runner,
        signal: this.signal, metadata: this.executionMetadata(), parent: { runId: this.run.id, stepRunId: execution.stepRunId } });
      return child.output as Output;
    });
  }
  private async dispatchChild<Input, Output>(key: string, definition: WorkflowDefinition<Input, Output>, input: Input): Promise<Output> {
    const dispatcher = this.childDispatcher;
    if (!dispatcher) throw new Error("Durable child dispatcher is not configured");
    this.assertActive();
    assertKey(key);
    const stepKey = this.scopedKey(key);
    const inputFingerprint = workflowFingerprint(input);
    const configFingerprint = `${definition.id}:${definition.revision}:durable-child-v1`;
    const matches = (await this.store.listSteps(this.run.id)).filter((step) => step.key === stepKey && step.kind === "workflow"
      && step.workflowId === this.run.workflowId && step.workflowRevision === this.run.workflowRevision
      && step.inputFingerprint === inputFingerprint && step.configFingerprint === configFingerprint);
    const reusable = [...matches].reverse().find((step) => step.state === "succeeded" && step.validation === "valid");
    if (reusable) {
      await this.store.appendEvent({ runId: this.run.id, stepRunId: reusable.id, type: "step.reused" });
      return reusable.output as Output;
    }
    let step = [...matches].reverse().find((item) => ["waiting", "running", "failed", "canceled", "needs_review"].includes(item.state));
    let attemptId: string;
    if (!step) {
      step = await this.store.createStep({ runId: this.run.id, key: stepKey, kind: "workflow", workflowId: this.run.workflowId,
        workflowRevision: this.run.workflowRevision, inputFingerprint, configFingerprint, state: "running", validation: "pending",
        ...this.phaseRecord() });
      const attempt = await this.store.createAttempt({ runId: this.run.id, stepRunId: step.id, state: "running" });
      attemptId = attempt.id;
      await this.store.appendEvent({ runId: this.run.id, stepRunId: step.id, attemptId, type: "step.started" });
    } else if (step.state === "waiting" || step.state === "running") {
      attemptId = (await this.store.listAttempts(step.id)).at(-1)?.id ?? (await this.store.createAttempt({ runId: this.run.id, stepRunId: step.id, state: "running" })).id;
    } else {
      const attempt = await this.store.createAttempt({ runId: this.run.id, stepRunId: step.id, state: "running" });
      attemptId = attempt.id;
      await this.store.updateStep(step.id, { state: "running", error: undefined });
      await this.store.appendEvent({ runId: this.run.id, stepRunId: step.id, attemptId, type: "step.started", data: { retry: true } });
    }
    const activeStep = step!;
    const child = await dispatcher.ensureChild<Input, Output>({ parentRunId: this.run.id, parentStepRunId: activeStep.id,
      key: stepKey, definition: { id: definition.id, revision: definition.revision }, input, metadata: this.executionMetadata() });
    if (child.state === "queued" || child.state === "running" || child.state === "waiting") {
      await this.store.updateStep(activeStep.id, { state: "waiting" });
      await this.store.updateAttempt(attemptId, { state: "waiting" });
      throw new WorkflowSuspendedError(child.childRunId, activeStep.id);
    }
    if (child.state === "failed" || child.state === "canceled") {
      const error = child.error ?? `Child workflow ${child.childRunId} ${child.state}`;
      await this.store.updateStep(activeStep.id, { state: child.state, error });
      await this.store.updateAttempt(attemptId, { state: child.state, error });
      throw new Error(error);
    }
    await this.store.updateStep(activeStep.id, { state: "succeeded", validation: "valid", output: child.output });
    await this.store.updateAttempt(attemptId, { state: "succeeded" });
    await this.store.appendEvent({ runId: this.run.id, stepRunId: activeStep.id, attemptId, type: "step.completed", data: { childRunId: child.childRunId, childState: child.state } });
    return child.output as Output;
  }
  async mapSettled<Input, Output>(key: string, inputs: readonly Input[], options: MapSettledOptions<Input>, callback: (input: Input, index: number) => Promise<Output>): Promise<PromiseSettledResult<Output>[]> {
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error("mapSettled concurrency must be a positive integer");
    const itemKeys = inputs.map(options.itemKey);
    if (new Set(itemKeys).size !== itemKeys.length || itemKeys.some((itemKey) => !itemKey)) throw new Error("mapSettled item keys must be stable, non-empty, and unique");
    return this.step(key, "map", { inputs, itemKeys }, `map:${options.concurrency}`, "valid", async () => {
      const results: PromiseSettledResult<Output>[] = new Array(inputs.length);
      const suspensions: WorkflowSuspendedError[] = [];
      let cancellation: WorkflowCanceledError | undefined;
      let cursor = 0;
      const worker = async () => {
        while (cursor < inputs.length) {
          const index = cursor++;
          try { results[index] = { status: "fulfilled", value: await callback(inputs[index]!, index) }; }
          catch (error) {
            if (error instanceof WorkflowSuspendedError) suspensions.push(error);
            else if (error instanceof WorkflowCanceledError || this.signal.aborted) { cancellation = new WorkflowCanceledError(); cursor = inputs.length; }
            else results[index] = { status: "rejected", reason: safeError(error) };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(options.concurrency, inputs.length) }, worker));
      if (cancellation) throw cancellation;
      if (suspensions.length) throw suspensions[0]!;
      return { value: results, validation: results.some((result) => result.status === "rejected") ? "invalid" : "valid" };
    });
  }
  async parallel<Branches extends ParallelBranches>(key: string, branches: Branches,
    options: ParallelOptions): Promise<ParallelResults<Branches>> {
    const settled = await this.parallelSettled(key, branches, options);
    const failures = Object.entries(settled).filter((entry) => entry[1].status === "rejected");
    if (failures.length) throw new Error(`Parallel group ${key} failed: ${failures
      .map(([name, result]) => `${name}: ${(result as PromiseRejectedResult).reason}`).join("; ")}`);
    return Object.fromEntries(Object.entries(settled).map(([name, result]) =>
      [name, (result as PromiseFulfilledResult<unknown>).value])) as ParallelResults<Branches>;
  }
  async parallelSettled<Branches extends ParallelBranches>(key: string, branches: Branches,
    options: ParallelOptions): Promise<ParallelSettledResults<Branches>> {
    assertKey(key);
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
      throw new Error("parallel concurrency must be a positive integer");
    }
    const names = Object.keys(branches).sort();
    if (!names.length) throw new Error("parallel branches must not be empty");
    for (const name of names) assertKey(name);
    const results: Record<string, PromiseSettledResult<unknown>> = {};
    const suspensions: WorkflowSuspendedError[] = [];
    let cancellation: WorkflowCanceledError | undefined;
    let cursor = 0;
    const worker = async () => {
      while (cursor < names.length && !cancellation) {
        const name = names[cursor++]!;
        try {
          const value = await this.step(`${key}:${name}`, "parallel", { group: key, branch: name },
            `parallel:v1`, "valid", () => branches[name]!());
          results[name] = { status: "fulfilled", value };
        } catch (error) {
          if (error instanceof WorkflowSuspendedError) {
            suspensions.push(error);
            // A durable child still occupies this branch's concurrency slot. Do not dispatch another branch on this worker.
            return;
          }
          if (error instanceof WorkflowCanceledError || this.signal.aborted) {
            cancellation = new WorkflowCanceledError();
            return;
          }
          results[name] = { status: "rejected", reason: safeError(error) };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(options.concurrency, names.length) }, worker));
    if (cancellation) throw cancellation;
    if (suspensions.length) throw suspensions[0]!;
    return results as ParallelSettledResults<Branches>;
  }
  async phase<Output>(key: string, definition: PhaseDefinition,
    execute: (context: PhaseContext) => Output | Promise<Output>): Promise<Output> {
    assertKey(key);
    assertPhaseDefinition(definition);
    const phasePath = [...(this.phaseScope?.phasePath ?? []), key];
    const phaseId = `phase:${this.run.id}:${phasePath.map(encodeURIComponent).join("/")}`;
    return this.step(key, "phase", definition, `phase:v1:${workflowFingerprint(definition)}`, "valid",
      async (execution) => {
        const scope: PhaseScope = { phaseId, phasePath, controlStepId: execution.stepRunId, ownerRunId: this.run.id, bindings: [] };
        const context = new RuntimeContext(this.store, this.runner, this.run, this.signal, this.childDispatcher, this.shared, scope);
        return execute(context as PhaseContext);
      }, false, { phaseId, phasePath, phaseDefinition: canonicalWorkflowValue(definition) });
  }
  get phaseId(): string {
    if (!this.phaseScope) throw new Error("phaseId is only available inside ctx.phase");
    return this.phaseScope.phaseId;
  }
  get phasePath(): readonly string[] {
    if (!this.phaseScope) throw new Error("phasePath is only available inside ctx.phase");
    return this.phaseScope.phasePath;
  }
  async bindArtifact(artifact: ArtifactRef, binding: Omit<PhaseArtifactBinding, "artifact">): Promise<void> {
    const scope = this.phaseScope;
    if (!scope) throw new Error("bindArtifact is only available inside ctx.phase");
    if (scope.ownerRunId !== this.run.id) throw new Error("Inherited child phase context cannot bind its parent phase; create a child phase first");
    if (!binding.role?.trim()) throw new Error("Phase artifact binding role is required");
    const persisted = await this.store.getArtifact(artifact.id);
    if (!persisted || persisted.sha256 !== artifact.sha256 || persisted.revision !== artifact.revision) {
      throw new Error("Phase artifact binding must reference an existing exact artifact revision");
    }
    const value: PhaseArtifactBinding = { artifact: persisted, ...binding };
    const index = scope.bindings.findIndex((item) => item.artifact.id === artifact.id && item.role === binding.role);
    if (index >= 0) scope.bindings[index] = value;
    else scope.bindings.push(value);
    await this.store.updateStep(scope.controlStepId, { artifactBindings: canonicalWorkflowValue(scope.bindings) });
    await this.store.appendEvent({ runId: this.run.id, stepRunId: scope.controlStepId, type: "phase.artifact_bound",
      data: { phaseId: scope.phaseId, phasePath: scope.phasePath, binding: value } });
  }
  decide<Value>(key: string, decision: Value): Value {
    this.shared.pending.push(this.recordDecision(key, decision));
    return decision;
  }
  async validate<Value>(key: string, artifact: Value, validator: (artifact: Value) => ValidationResult | Promise<ValidationResult>, options: { producerStepKey?: string } = {}): Promise<ValidationResult> {
    return this.step(key, "validation", artifact, "validation:v1", "valid", async (_execution, emit) => {
      const result = await validator(artifact);
      await this.markProducerValidation(artifact, result.valid ? "valid" : "invalid", options.producerStepKey);
      await emit("validation.completed", result);
      return { value: result, validation: result.valid ? "valid" : "invalid" };
    }, true);
  }
  async publish(key: string, artifactType: string, payload: unknown, provenance: { schemaVersion?: string; revision?: string; dependsOn?: ArtifactDependency[]; validation?: ValidationState; review?: ArtifactRef["review"] } = {}): Promise<ArtifactRef> {
    return this.step(key, "publish", { artifactType, payload, provenance }, "publish:v1", provenance.validation ?? "pending", async (execution, emit) => {
      const digest = await artifactPayloadSha256(payload);
      const artifact = await this.store.publishArtifact({ type: artifactType, schemaVersion: provenance.schemaVersion ?? "v1",
        revision: provenance.revision ?? digest, sha256: digest, uri: `workflow-artifact://${this.run.id}/${execution.stepRunId}/${digest}`,
        payload, producedBy: { workflowRunId: this.run.id, stepRunId: execution.stepRunId, attemptId: execution.attemptId },
        dependsOn: provenance.dependsOn ?? [], validation: provenance.validation ?? "pending", review: provenance.review ?? "pending" });
      await emit("artifact.published", artifact);
      return { value: artifact, validation: artifact.validation };
    });
  }
  blocked(details: unknown): WorkflowTerminal<never> { return { ok: false, state: "blocked", details }; }
  needsReview(details: unknown): WorkflowTerminal<never> { return { ok: false, state: "needs_review", details }; }
  assertActive(): void { if (this.signal.aborted) throw new WorkflowCanceledError(); }
  async flush(): Promise<void> { await Promise.all(this.shared.pending); }

  private async recordDecision(key: string, decision: unknown): Promise<void> {
    await this.step(key, "decision", decision, "decision:v1", "valid", async (_execution, emit) => {
      await emit("decision.recorded", decision); return decision;
    });
  }
  private async step<Input, Output>(key: string, kind: StepKind, input: Input, configFingerprint: string,
    defaultValidation: ValidationState, execute: (context: { signal: AbortSignal; idempotencyKey: string; runId: string; stepRunId: string; attemptId: string }, emit: (type: string, data?: unknown) => Promise<void>) => Promise<Output | { value: Output; validation: ValidationState }> | Output | { value: Output; validation: ValidationState },
    reuseInvalidOutput = false, recordMetadata: Partial<Pick<StepRecord, "phaseId" | "phasePath" | "phaseDefinition">> = {}): Promise<Output> {
    this.assertActive();
    assertKey(key);
    const stepKey = this.scopedKey(key);
    const inputFingerprint = workflowFingerprint(input);
    const query = { runId: this.run.id, workflowId: this.run.workflowId, workflowRevision: this.run.workflowRevision,
      key: stepKey, kind, inputFingerprint, configFingerprint };
    const reusable = await this.store.findReusableStep(query);
    if (reusable) {
      await this.store.appendEvent({ runId: this.run.id, stepRunId: reusable.id, type: "step.reused" });
      if (kind === "agent") this.rememberProducer(reusable.output, reusable.id);
      if (kind === "validation" && isValidationResult(reusable.output)) {
        await this.markProducerValidation(input, reusable.output.valid ? "valid" : "invalid");
      }
      return reusable.output as Output;
    }
    await this.closeStaleAttempts(stepKey);
    const step = await this.store.createStep({ ...query, state: "running", validation: defaultValidation,
      ...this.phaseRecord(), ...recordMetadata });
    const attempt = await this.store.createAttempt({ runId: this.run.id, stepRunId: step.id, state: "running" });
    const emit = async (type: string, data?: unknown) => { await this.store.appendEvent({ runId: this.run.id, stepRunId: step.id, attemptId: attempt.id, type, data }); };
    await emit("step.started");
    if (kind === "phase") await emit("phase.started", { phaseId: step.phaseId, phasePath: step.phasePath, definition: step.phaseDefinition });
    try {
      this.assertActive();
      const raw = await execute({ signal: this.signal, idempotencyKey: `${this.run.id}:${stepKey}`, runId: this.run.id, stepRunId: step.id, attemptId: attempt.id }, emit);
      this.assertActive();
      const wrapped = isStepOutput<Output>(raw) ? raw : { value: raw, validation: defaultValidation };
      const phaseTerminal = kind === "phase" ? terminalStateOf(wrapped.value) : undefined;
      const state = phaseTerminal ?? (wrapped.validation === "invalid" && !reuseInvalidOutput ? "needs_review" : "succeeded");
      await this.store.updateStep(step.id, { state, validation: wrapped.validation, output: wrapped.value });
      await this.store.updateAttempt(attempt.id, { state });
      await emit("step.completed", { validation: wrapped.validation });
      if (kind === "phase") await emit(`phase.${state === "succeeded" ? "completed" : state}`,
        { phaseId: step.phaseId, phasePath: step.phasePath, state });
      if (kind === "agent") this.rememberProducer(wrapped.value, step.id);
      return wrapped.value;
    } catch (error) {
      if (error instanceof WorkflowSuspendedError) {
        await this.store.updateStep(step.id, { state: "waiting" });
        await this.store.updateAttempt(attempt.id, { state: "waiting" });
        await emit("step.waiting", { childRunId: error.childRunId });
        if (kind === "phase") await emit("phase.waiting", { phaseId: step.phaseId, phasePath: step.phasePath,
          childRunId: error.childRunId });
        throw error;
      }
      const state = this.signal.aborted ? "canceled" : "failed";
      await this.store.updateStep(step.id, { state, error: safeError(error) });
      await this.store.updateAttempt(attempt.id, { state, error: safeError(error) });
      await emit("step.failed", { error: safeError(error) });
      if (kind === "phase") await emit(state === "canceled" ? "phase.canceled" : "phase.failed",
        { phaseId: step.phaseId, phasePath: step.phasePath, error: safeError(error) });
      throw error;
    }
  }
  private async closeStaleAttempts(key: string): Promise<void> {
    const steps = await this.store.listSteps(this.run.id);
    for (const step of steps.filter((item) => item.key === key && item.state === "running")) {
      for (const attempt of await this.store.listAttempts(step.id)) {
        if (attempt.state === "running") await this.store.updateAttempt(attempt.id, { state: "failed", error: "Interrupted before resume" });
      }
      await this.store.updateStep(step.id, { state: "failed", error: "Interrupted before resume" });
    }
  }
  private rememberProducer(output: unknown, stepId: string): void {
    if (!isObject(output)) return;
    const steps = this.shared.producerSteps.get(output) ?? [];
    if (!steps.includes(stepId)) steps.push(stepId);
    this.shared.producerSteps.set(output, steps);
  }
  private async markProducerValidation(output: unknown, validation: ValidationState, producerStepKey?: string): Promise<void> {
    const identityMatches = isObject(output) ? this.shared.producerSteps.get(output) ?? [] : [];
    const explicitMatches = producerStepKey
      ? (await this.store.listSteps(this.run.id)).filter((step) => step.key === this.scopedKey(producerStepKey) && step.kind === "agent").map((step) => step.id)
      : [];
    for (const stepId of new Set([...identityMatches, ...explicitMatches])) {
      await this.store.updateStep(stepId, { validation });
    }
  }
  private phaseRecord(): Partial<Pick<StepRecord, "phaseId" | "phasePath">> {
    return this.phaseScope ? { phaseId: this.phaseScope.phaseId, phasePath: this.phaseScope.phasePath } : {};
  }
  private scopedKey(key: string): string {
    return this.phaseScope ? [...this.phaseScope.phasePath, key].join(":") : key;
  }
  private executionMetadata(): Readonly<Record<string, unknown>> | undefined {
    if (!this.phaseScope) return this.run.metadata;
    return { ...this.run.metadata, phaseId: this.phaseScope.phaseId, phasePath: this.phaseScope.phasePath,
      phaseControlStepId: this.phaseScope.controlStepId, phaseOwnerRunId: this.phaseScope.ownerRunId };
  }
}

class WorkflowSuspendedError extends Error {
  constructor(readonly childRunId: string, readonly stepRunId: string) { super("Workflow is waiting for a durable child"); }
}

function terminalStateOf(value: unknown): "blocked" | "needs_review" | undefined {
  if (!value || typeof value !== "object") return undefined;
  const state = (value as { state?: unknown }).state;
  return state === "blocked" || state === "needs_review" ? state : undefined;
}
function isStepOutput<T>(value: unknown): value is { value: T; validation: ValidationState } {
  return !!value && typeof value === "object" && "value" in value && "validation" in value;
}
function isValidationResult(value: unknown): value is ValidationResult {
  return isObject(value) && typeof (value as { valid?: unknown }).valid === "boolean";
}
function isObject(value: unknown): value is object { return typeof value === "object" && value !== null; }
function assertKey(key: string): void {
  if (!key || key.trim() !== key || /[\0\n\r]/u.test(key)) throw new Error("Step key must be a stable, non-empty explicit string");
}
function assertPhaseDefinition(definition: PhaseDefinition): void {
  if (!definition.title?.trim() || !definition.purpose?.trim()) throw new Error("Phase title and purpose are required");
  if (definition.order !== undefined && !Number.isFinite(definition.order)) throw new Error("Phase order must be finite");
  for (const expected of definition.expectedArtifacts ?? []) {
    if (!expected.role?.trim()) throw new Error("Expected phase artifact role is required");
  }
}
function inheritedPhaseScope(metadata: Readonly<Record<string, unknown>> | undefined): PhaseScope | undefined {
  if (typeof metadata?.phaseId !== "string" || !Array.isArray(metadata.phasePath)
    || !metadata.phasePath.every((item) => typeof item === "string") || typeof metadata.phaseControlStepId !== "string"
    || typeof metadata.phaseOwnerRunId !== "string") return undefined;
  return { phaseId: metadata.phaseId, phasePath: metadata.phasePath as string[],
    controlStepId: metadata.phaseControlStepId, ownerRunId: metadata.phaseOwnerRunId, bindings: [] };
}
function safeError(error: unknown): string { return error instanceof Error ? error.message : String(error); }
export function workflowFingerprint(value: unknown): string {
  const text = stableStringify(canonicalWorkflowValue(value));
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < text.length; index++) { hash ^= BigInt(text.charCodeAt(index)); hash = BigInt.asUintN(64, hash * 0x100000001b3n); }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}
/** Value that crosses a JSON persistence boundary; object `undefined` fields are omitted and array holes become null. */
export function canonicalWorkflowValue<T>(value: T): T {
  const serialized = JSON.stringify(value);
  return (serialized === undefined ? null : JSON.parse(serialized)) as T;
}
function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "bigint") return `bigint:${value}`;
  if (typeof value !== "object" || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}
/** Canonical artifact digest shared by runtimes and persistent stores. */
export async function artifactPayloadSha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(canonicalWorkflowValue(value)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
