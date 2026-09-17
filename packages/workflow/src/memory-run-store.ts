import type { ArtifactRef } from "./contracts.js";
import type { ArtifactDraft, AttemptRecord, EventDraft, RunRecord, RunStore, StepRecord, WorkflowEvent } from "./ports.js";

const copy = <T>(value: T): T => structuredClone(value);

export class MemoryRunStore implements RunStore {
  readonly runs: RunRecord[] = [];
  readonly steps: StepRecord[] = [];
  readonly attempts: AttemptRecord[] = [];
  readonly events: WorkflowEvent[] = [];
  readonly artifacts: Array<ArtifactRef & { payload: unknown }> = [];
  #nextId = 1;

  async createRun(record: Omit<RunRecord, "id">): Promise<RunRecord> {
    const result = { ...copy(record), id: this.#id("run") };
    this.runs.push(result);
    return copy(result);
  }
  async getRun(id: string): Promise<RunRecord | undefined> { return copy(this.runs.find((run) => run.id === id)); }
  async listRuns(filter: { parentRunId?: string; creatorRunId?: string } = {}): Promise<RunRecord[]> {
    return copy(this.runs.filter((run) =>
      (filter.parentRunId === undefined || run.parentRunId === filter.parentRunId)
      && (filter.creatorRunId === undefined || run.metadata?.creatorRunId === filter.creatorRunId)));
  }
  async updateRun(id: string, patch: Partial<Pick<RunRecord, "state" | "output" | "error">>): Promise<void> {
    Object.assign(this.#required(this.runs, id), copy(patch));
  }
  async createStep(record: Omit<StepRecord, "id">): Promise<StepRecord> {
    const result = { ...copy(record), id: this.#id("step") };
    this.steps.push(result);
    return copy(result);
  }
  async listSteps(runId: string): Promise<StepRecord[]> { return copy(this.steps.filter((step) => step.runId === runId)); }
  async findReusableStep(query: Pick<StepRecord, "runId" | "workflowId" | "workflowRevision" | "key" | "kind" | "inputFingerprint" | "configFingerprint">): Promise<StepRecord | undefined> {
    return copy([...this.steps].reverse().find((step) => step.runId === query.runId
      && step.workflowId === query.workflowId && step.workflowRevision === query.workflowRevision
      && step.key === query.key && step.kind === query.kind && step.inputFingerprint === query.inputFingerprint
      && step.configFingerprint === query.configFingerprint && step.state === "succeeded" && step.validation === "valid"));
  }
  async updateStep(id: string, patch: Partial<Pick<StepRecord, "state" | "validation" | "output" | "error" | "artifactBindings">>): Promise<void> {
    Object.assign(this.#required(this.steps, id), copy(patch));
  }
  async createAttempt(record: Omit<AttemptRecord, "id">): Promise<AttemptRecord> {
    const result = { ...copy(record), id: this.#id("attempt") };
    this.attempts.push(result);
    return copy(result);
  }
  async listAttempts(stepRunId: string): Promise<AttemptRecord[]> { return copy(this.attempts.filter((attempt) => attempt.stepRunId === stepRunId)); }
  async updateAttempt(id: string, patch: Partial<Pick<AttemptRecord, "state" | "error">>): Promise<void> {
    Object.assign(this.#required(this.attempts, id), copy(patch));
  }
  async appendEvent(event: EventDraft): Promise<WorkflowEvent> {
    const seq = this.events.reduce((max, item) => item.runId === event.runId ? Math.max(max, item.seq) : max, 0) + 1;
    const result = { ...copy(event), id: this.#id("event"), seq, timestamp: new Date().toISOString() };
    this.events.push(result);
    return copy(result);
  }
  async listEvents(runId: string, afterSeq = 0): Promise<WorkflowEvent[]> {
    return copy(this.events.filter((event) => event.runId === runId && event.seq > afterSeq).sort((a, b) => a.seq - b.seq));
  }
  async publishArtifact(draft: ArtifactDraft): Promise<ArtifactRef> {
    const artifact: ArtifactRef & { payload: unknown } = { ...copy(draft), id: this.#id("artifact") };
    this.artifacts.push(artifact);
    return copy(artifact);
  }
  async getArtifact(id: string): Promise<ArtifactRef | undefined> { return copy(this.artifacts.find((item) => item.id === id)); }
  async listArtifacts(runId: string): Promise<ArtifactRef[]> {
    return copy(this.artifacts.filter((item) => item.producedBy.workflowRunId === runId));
  }
  #id(prefix: string): string { return `${prefix}-${this.#nextId++}`; }
  #required<T extends { id: string }>(records: T[], id: string): T {
    const record = records.find((item) => item.id === id);
    if (!record) throw new Error(`Unknown record: ${id}`);
    return record;
  }
}
