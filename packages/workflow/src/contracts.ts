export type RunState =
  | "queued"
  | "running"
  | "waiting"
  | "blocked"
  | "needs_review"
  | "succeeded"
  | "failed"
  | "canceled";

export type StepKind = "task" | "agent" | "workflow" | "map" | "parallel" | "phase" | "decision" | "validation" | "publish";
export type ValidationState = "pending" | "valid" | "invalid";
export type ReviewState = "pending" | "passed" | "findings" | "not_applicable";

export interface WorkflowDefinition<Input, Output> {
  readonly id: string;
  readonly revision: string;
  readonly execute: (context: WorkflowContext, input: Input) => Promise<Output>;
}

export interface AgentDefinition<Input = unknown, Output = unknown> {
  readonly id: string;
  readonly revision: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly promptRevision: string;
  readonly skillsRevision: string;
  readonly permissionsRevision: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly __input?: Input;
  readonly __output?: Output;
}

export interface ArtifactDependency {
  artifactId: string;
  revision: string;
  sha256: string;
}

export interface ArtifactRef {
  id: string;
  type: string;
  schemaVersion: string;
  revision: string;
  sha256: string;
  uri: string;
  producedBy: { workflowRunId: string; stepRunId: string; attemptId: string };
  dependsOn: ArtifactDependency[];
  validation: ValidationState;
  review: ReviewState;
}

export type WorkflowTerminal<T> =
  | { ok: true; state: "succeeded"; output: T }
  | { ok: false; state: "blocked" | "needs_review"; details: unknown };

export interface TaskExecutionContext {
  readonly signal: AbortSignal;
  readonly idempotencyKey: string;
  readonly runId: string;
  readonly stepRunId: string;
  readonly attemptId: string;
}

export type TaskImplementation<Input, Output> =
  (input: Input, context: TaskExecutionContext) => Output | Promise<Output>;

export interface ValidationResult {
  valid: boolean;
  details?: unknown;
  ref?: ArtifactRef;
}

export interface MapSettledOptions<Input> {
  concurrency: number;
  itemKey: (input: Input, index: number) => string;
}

export type ParallelBranches = Readonly<Record<string, () => unknown>>;
export type ParallelResults<Branches extends ParallelBranches> = {
  [Name in keyof Branches]: Awaited<ReturnType<Branches[Name]>>;
};
export type ParallelSettledResults<Branches extends ParallelBranches> = {
  [Name in keyof Branches]: PromiseSettledResult<Awaited<ReturnType<Branches[Name]>>>;
};
export interface ParallelOptions { concurrency: number }

export interface PhaseExpectedArtifact { role: string; title?: string; required?: boolean }
export interface PhaseDefinition {
  title: string;
  purpose: string;
  order?: number;
  expectedArtifacts?: readonly PhaseExpectedArtifact[];
}
export interface PhaseArtifactBinding {
  artifact: ArtifactRef;
  role: string;
  title?: string;
  order?: number;
  primary?: boolean;
}
export interface PhaseContext extends WorkflowContext {
  readonly phaseId: string;
  readonly phasePath: readonly string[];
  bindArtifact(artifact: ArtifactRef, binding: Omit<PhaseArtifactBinding, "artifact">): Promise<void>;
}

export interface WorkflowContext {
  task<Input, Output>(key: string, implementation: TaskImplementation<Input, Output>, input: Input): Promise<Output>;
  agent<Input, Output>(key: string, definition: AgentDefinition<Input, Output>, input: Input): Promise<Output>;
  call<Input, Output>(key: string, definition: WorkflowDefinition<Input, Output>, input: Input): Promise<Output>;
  mapSettled<Input, Output>(
    key: string,
    inputs: readonly Input[],
    options: MapSettledOptions<Input>,
    callback: (input: Input, index: number) => Promise<Output>,
  ): Promise<PromiseSettledResult<Output>[]>;
  parallel<Branches extends ParallelBranches>(
    key: string, branches: Branches, options: ParallelOptions,
  ): Promise<ParallelResults<Branches>>;
  parallelSettled<Branches extends ParallelBranches>(
    key: string, branches: Branches, options: ParallelOptions,
  ): Promise<ParallelSettledResults<Branches>>;
  phase<Output>(
    key: string, definition: PhaseDefinition, execute: (context: PhaseContext) => Output | Promise<Output>,
  ): Promise<Output>;
  decide<Value>(key: string, decision: Value): Value;
  validate<Value>(key: string, artifact: Value, validator: (artifact: Value) => ValidationResult | Promise<ValidationResult>, options?: { producerStepKey?: string }): Promise<ValidationResult>;
  publish(
    key: string,
    artifactType: string,
    payload: unknown,
    provenance?: { schemaVersion?: string; revision?: string; dependsOn?: ArtifactDependency[]; validation?: ValidationState; review?: ReviewState },
  ): Promise<ArtifactRef>;
  blocked(details: unknown): WorkflowTerminal<never>;
  needsReview(details: unknown): WorkflowTerminal<never>;
}
