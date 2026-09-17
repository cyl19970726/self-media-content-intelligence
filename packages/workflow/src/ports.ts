import type { AgentDefinition, ArtifactRef, PhaseArtifactBinding, PhaseDefinition, RunState, StepKind, ValidationState } from "./contracts.js";

export interface RunRecord {
  id: string;
  workflowId: string;
  workflowRevision: string;
  inputFingerprint: string;
  state: RunState;
  parentRunId?: string;
  parentStepRunId?: string;
  metadata?: Readonly<Record<string, unknown>>;
  output?: unknown;
  error?: string;
}

export interface StepRecord {
  id: string;
  runId: string;
  key: string;
  kind: StepKind;
  workflowId: string;
  workflowRevision: string;
  inputFingerprint: string;
  configFingerprint: string;
  state: RunState;
  validation: ValidationState;
  phaseId?: string;
  phasePath?: readonly string[];
  phaseDefinition?: PhaseDefinition;
  artifactBindings?: readonly PhaseArtifactBinding[];
  output?: unknown;
  error?: string;
}

export interface AttemptRecord {
  id: string;
  runId: string;
  stepRunId: string;
  state: RunState;
  error?: string;
}

export interface WorkflowEvent {
  id: string;
  runId: string;
  seq: number;
  type: string;
  timestamp: string;
  stepRunId?: string;
  attemptId?: string;
  parentRunId?: string;
  data?: unknown;
}

export type EventDraft = Omit<WorkflowEvent, "id" | "seq" | "timestamp">;

export interface ArtifactDraft {
  type: string;
  schemaVersion: string;
  revision: string;
  sha256: string;
  uri: string;
  payload: unknown;
  producedBy: ArtifactRef["producedBy"];
  dependsOn: ArtifactRef["dependsOn"];
  validation: ArtifactRef["validation"];
  review: ArtifactRef["review"];
}

export interface RunStore {
  createRun(record: Omit<RunRecord, "id">): Promise<RunRecord>;
  getRun(id: string): Promise<RunRecord | undefined>;
  listRuns(filter?: { parentRunId?: string; creatorRunId?: string }): Promise<RunRecord[]>;
  updateRun(id: string, patch: Partial<Pick<RunRecord, "state" | "output" | "error">>): Promise<void>;
  createStep(record: Omit<StepRecord, "id">): Promise<StepRecord>;
  listSteps(runId: string): Promise<StepRecord[]>;
  findReusableStep(query: Pick<StepRecord, "runId" | "workflowId" | "workflowRevision" | "key" | "kind" | "inputFingerprint" | "configFingerprint">): Promise<StepRecord | undefined>;
  updateStep(id: string, patch: Partial<Pick<StepRecord, "state" | "validation" | "output" | "error" | "artifactBindings">>): Promise<void>;
  createAttempt(record: Omit<AttemptRecord, "id">): Promise<AttemptRecord>;
  listAttempts(stepRunId: string): Promise<AttemptRecord[]>;
  updateAttempt(id: string, patch: Partial<Pick<AttemptRecord, "state" | "error">>): Promise<void>;
  /** The store atomically assigns a strictly increasing, per-run sequence. */
  appendEvent(event: EventDraft): Promise<WorkflowEvent>;
  listEvents(runId: string, afterSeq?: number): Promise<WorkflowEvent[]>;
  publishArtifact(artifact: ArtifactDraft): Promise<ArtifactRef>;
  getArtifact(id: string): Promise<ArtifactRef | undefined>;
  listArtifacts(runId: string): Promise<ArtifactRef[]>;
}

export interface AgentRunRequest<Input> {
  runId: string;
  stepRunId: string;
  attemptId: string;
  definition: AgentDefinition<Input, unknown>;
  input: Input;
  signal: AbortSignal;
  runMetadata?: Readonly<Record<string, unknown>>;
  emit: (type: string, data?: unknown) => Promise<void>;
}

export interface AgentRunResult<Output> {
  output: Output;
  validation?: ValidationState;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface AgentRunner {
  run<Input, Output>(request: AgentRunRequest<Input>): Promise<AgentRunResult<Output>>;
}

export interface ChildWorkflowDispatchRequest<Input> {
  parentRunId: string;
  parentStepRunId: string;
  key: string;
  definition: { id: string; revision: string };
  input: Input;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ChildWorkflowSnapshot<Output> {
  childRunId: string;
  state: RunState;
  output?: Output;
  error?: string;
}

/** Persistent implementations must be idempotent by parentStepRunId. */
export interface ChildWorkflowDispatcher {
  ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>): Promise<ChildWorkflowSnapshot<Output>>;
  cancelChildren?(parentRunId: string, reason?: unknown): Promise<void>;
}
