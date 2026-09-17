import { randomUUID } from "node:crypto";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type {
  ArtifactDraft, ArtifactRef, AttemptRecord, EventDraft, RunRecord,
  RunStore, StepRecord, WorkflowEvent,
} from "../../../workflow/index.js";
import { artifactPayloadSha256, canonicalWorkflowValue } from "../../../workflow/index.js";

type RecordTable = "workflow_runs" | "workflow_steps" | "workflow_attempts";

/** Execution ledger only. Job leases and scheduling belong to the research queue. */
export class SQLiteWorkflowRunStore implements RunStore {
  constructor(private readonly database: DatabaseSync) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY, document TEXT NOT NULL CHECK(json_valid(document))
      );
      CREATE INDEX IF NOT EXISTS workflow_runs_creator ON workflow_runs(json_extract(document, '$.metadata.creatorRunId'));
      CREATE INDEX IF NOT EXISTS workflow_runs_parent ON workflow_runs(json_extract(document, '$.parentRunId'));
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id),
        document TEXT NOT NULL CHECK(json_valid(document))
      );
      CREATE INDEX IF NOT EXISTS workflow_steps_run ON workflow_steps(run_id);
      CREATE TABLE IF NOT EXISTS workflow_attempts (
        id TEXT PRIMARY KEY, step_run_id TEXT NOT NULL REFERENCES workflow_steps(id),
        document TEXT NOT NULL CHECK(json_valid(document))
      );
      CREATE INDEX IF NOT EXISTS workflow_attempts_step ON workflow_attempts(step_run_id);
      CREATE TABLE IF NOT EXISTS workflow_events (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id),
        seq INTEGER NOT NULL, document TEXT NOT NULL CHECK(json_valid(document)), UNIQUE(run_id, seq)
      );
      CREATE TABLE IF NOT EXISTS workflow_artifacts (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id),
        document TEXT NOT NULL CHECK(json_valid(document)), payload TEXT NOT NULL CHECK(json_valid(payload))
      );
      CREATE INDEX IF NOT EXISTS workflow_artifacts_run ON workflow_artifacts(run_id);
    `);
  }

  private read<T>(table: RecordTable, id: string): T | undefined {
    const row = this.database.prepare(`SELECT document FROM ${table} WHERE id = ?`).get(id);
    return row ? JSON.parse(String(row.document)) as T : undefined;
  }

  private patch(table: RecordTable, id: string, patch: object): void {
    const record = this.read<Record<string, unknown>>(table, id);
    if (!record) throw new Error(`Workflow record not found: ${id}`);
    this.database.prepare(`UPDATE ${table} SET document = ? WHERE id = ?`)
      .run(JSON.stringify({ ...record, ...patch }), id);
  }

  private rows<T>(sql: string, ...args: SQLInputValue[]): T[] {
    return this.database.prepare(sql).all(...args).map((row) => JSON.parse(String(row.document)) as T);
  }

  async createRun(input: Omit<RunRecord, "id">): Promise<RunRecord> {
    const record = { ...input, id: randomUUID() };
    this.database.prepare("INSERT INTO workflow_runs(id, document) VALUES (?, ?)").run(record.id, JSON.stringify(record));
    return record;
  }

  async getRun(id: string): Promise<RunRecord | undefined> { return this.read("workflow_runs", id); }

  async listRuns(filter?: { parentRunId?: string; creatorRunId?: string }): Promise<RunRecord[]> {
    const clauses: string[] = [];
    const args: string[] = [];
    if (filter?.parentRunId !== undefined) { clauses.push("json_extract(document, '$.parentRunId') = ?"); args.push(filter.parentRunId); }
    if (filter?.creatorRunId !== undefined) { clauses.push("json_extract(document, '$.metadata.creatorRunId') = ?"); args.push(filter.creatorRunId); }
    return this.rows(`SELECT document FROM workflow_runs${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY rowid DESC`, ...args);
  }

  async updateRun(id: string, patch: Parameters<RunStore["updateRun"]>[1]): Promise<void> { this.patch("workflow_runs", id, patch); }

  async createStep(input: Omit<StepRecord, "id">): Promise<StepRecord> {
    const record = { ...input, id: randomUUID() };
    if (!await this.getRun(record.runId)) throw new Error("Workflow run not found");
    this.database.prepare("INSERT INTO workflow_steps(id, run_id, document) VALUES (?, ?, ?)").run(record.id, record.runId, JSON.stringify(record));
    return record;
  }

  async listSteps(runId: string): Promise<StepRecord[]> { return this.rows("SELECT document FROM workflow_steps WHERE run_id = ? ORDER BY rowid", runId); }

  async findReusableStep(query: Parameters<RunStore["findReusableStep"]>[0]): Promise<StepRecord | undefined> {
    return (await this.listSteps(query.runId)).reverse().find((step) =>
      step.state === "succeeded" && step.validation === "valid"
      && (["runId", "workflowId", "workflowRevision", "key", "kind", "inputFingerprint", "configFingerprint"] as const)
        .every((key) => step[key] === query[key]));
  }

  async updateStep(id: string, patch: Parameters<RunStore["updateStep"]>[1]): Promise<void> { this.patch("workflow_steps", id, patch); }

  async createAttempt(input: Omit<AttemptRecord, "id">): Promise<AttemptRecord> {
    const step = this.read<StepRecord>("workflow_steps", input.stepRunId);
    if (!step || step.runId !== input.runId) throw new Error("Attempt does not belong to workflow step");
    const record = { ...input, id: randomUUID() };
    this.database.prepare("INSERT INTO workflow_attempts(id, step_run_id, document) VALUES (?, ?, ?)").run(record.id, record.stepRunId, JSON.stringify(record));
    return record;
  }

  async listAttempts(stepRunId: string): Promise<AttemptRecord[]> { return this.rows("SELECT document FROM workflow_attempts WHERE step_run_id = ? ORDER BY rowid", stepRunId); }
  async updateAttempt(id: string, patch: Parameters<RunStore["updateAttempt"]>[1]): Promise<void> { this.patch("workflow_attempts", id, patch); }

  async appendEvent(draft: EventDraft): Promise<WorkflowEvent> {
    // A single SQLite statement allocates the per-run sequence atomically across connections.
    const event = { ...draft, id: randomUUID(), timestamp: new Date().toISOString() };
    const row = this.database.prepare(`INSERT INTO workflow_events(id, run_id, seq, document)
      SELECT ?, ?, COALESCE(MAX(seq), 0) + 1,
        json_set(?, '$.seq', COALESCE(MAX(seq), 0) + 1)
      FROM workflow_events WHERE run_id = ? RETURNING document`)
      .get(event.id, event.runId, JSON.stringify(event), event.runId);
    return JSON.parse(String(row!.document)) as WorkflowEvent;
  }

  async listEvents(runId: string, afterSeq = 0): Promise<WorkflowEvent[]> {
    return this.rows("SELECT document FROM workflow_events WHERE run_id = ? AND seq > ? ORDER BY seq LIMIT 1000", runId, afterSeq);
  }

  async publishArtifact(draft: ArtifactDraft): Promise<ArtifactRef> {
    const step = this.read<StepRecord>("workflow_steps", draft.producedBy.stepRunId);
    const attempt = this.read<AttemptRecord>("workflow_attempts", draft.producedBy.attemptId);
    if (!step || !attempt || step.runId !== draft.producedBy.workflowRunId || attempt.stepRunId !== step.id) {
      throw new Error("Artifact provenance does not identify its producing attempt");
    }
    for (const dependency of draft.dependsOn) {
      const found = await this.getArtifact(dependency.artifactId);
      if (!found || found.revision !== dependency.revision || found.sha256 !== dependency.sha256) throw new Error("Artifact dependency mismatch");
    }
    const { payload, ...metadata } = draft;
    const canonicalPayload = canonicalWorkflowValue(payload);
    const canonicalSha256 = await artifactPayloadSha256(canonicalPayload);
    if (canonicalSha256 !== draft.sha256) throw new Error("Artifact payload SHA-256 mismatch");
    const artifact = { ...metadata, id: randomUUID() };
    this.database.prepare("INSERT INTO workflow_artifacts(id, run_id, document, payload) VALUES (?, ?, ?, ?)")
      .run(artifact.id, artifact.producedBy.workflowRunId, JSON.stringify(artifact), JSON.stringify(canonicalPayload));
    return artifact;
  }

  async getArtifact(id: string): Promise<ArtifactRef | undefined> {
    return this.rows<ArtifactRef>("SELECT document FROM workflow_artifacts WHERE id = ?", id)[0];
  }
  async getArtifactPayload(id: string): Promise<unknown> {
    const row = this.database.prepare("SELECT document, payload FROM workflow_artifacts WHERE id = ?").get(id);
    if (!row) return undefined;
    const artifact = JSON.parse(String(row.document)) as ArtifactRef;
    const payload = JSON.parse(String(row.payload)) as unknown;
    if (await artifactPayloadSha256(payload) !== artifact.sha256) throw new Error("Artifact payload integrity check failed");
    return payload;
  }
  async listArtifacts(runId: string): Promise<ArtifactRef[]> { return this.rows("SELECT document FROM workflow_artifacts WHERE run_id = ? ORDER BY rowid", runId); }
}
