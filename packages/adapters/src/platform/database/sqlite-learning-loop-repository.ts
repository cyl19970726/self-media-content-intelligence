import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { learningLoopRunSchema, type LearningLoopRun } from "../../../../contracts/index.js";
import type { LearningLoopEvent, LearningLoopRepository } from "../../../../research/index.js";

interface RunRow { run_json: string }
interface OperationRow { command_hash: string; result_json: string }
interface EventRow {
  sequence: number; run_id: string; operation_key: string; from_status: string | null;
  to_status: string; revision: number; created_at: string;
}
export class SQLiteLearningLoopRepository implements LearningLoopRepository {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS learning_loop_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        revision INTEGER NOT NULL,
        input_hash TEXT NOT NULL,
        upstream_hashes_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        run_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_learning_loop_runs_updated
        ON learning_loop_runs(updated_at DESC);
      CREATE TABLE IF NOT EXISTS learning_loop_operations (
        operation_key TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        command_hash TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES learning_loop_runs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_learning_loop_operations_run
        ON learning_loop_operations(run_id, created_at);
      CREATE TABLE IF NOT EXISTS learning_loop_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        operation_key TEXT NOT NULL UNIQUE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        revision INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES learning_loop_runs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_learning_loop_events_run
        ON learning_loop_events(run_id, sequence);
    `);
  }

  create(run: LearningLoopRun, operationKey: string, commandHash: string): LearningLoopRun {
    const parsed = learningLoopRunSchema.parse(run);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.readOperation(operationKey, commandHash);
      if (prior) { this.db.exec("COMMIT"); return prior; }
      if (this.getInTransaction(parsed.id)) throw new Error(`learning loop run already exists: ${parsed.id}`);
      this.insertRun(parsed);
      this.insertOperation(operationKey, commandHash, parsed);
      this.insertEvent(operationKey, null, parsed);
      this.db.exec("COMMIT");
      return parsed;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  get(runId: string): LearningLoopRun | null {
    return this.getInTransaction(runId);
  }

  list(limit = 50): LearningLoopRun[] {
    const rows = this.db.prepare("SELECT run_json FROM learning_loop_runs ORDER BY updated_at DESC LIMIT ?").all(limit) as unknown as RunRow[];
    return rows.map((row) => learningLoopRunSchema.parse(JSON.parse(row.run_json) as unknown));
  }

  mutate(runId: string, operationKey: string, commandHash: string, apply: (run: LearningLoopRun) => LearningLoopRun): LearningLoopRun {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.readOperation(operationKey, commandHash);
      if (prior) {
        if (prior.id !== runId) throw new Error("operation key belongs to another run");
        this.db.exec("COMMIT");
        return prior;
      }
      const current = this.getInTransaction(runId);
      if (!current) throw new Error(`learning loop run not found: ${runId}`);
      const next = learningLoopRunSchema.parse(apply(current));
      if (next.id !== runId || next.revision !== current.revision + 1) throw new Error("mutation must preserve id and increment revision exactly once");
      const result = this.db.prepare(`
        UPDATE learning_loop_runs SET status = ?, revision = ?, input_hash = ?, upstream_hashes_json = ?, updated_at = ?, run_json = ?
        WHERE id = ? AND revision = ?
      `).run(next.status, next.revision, next.inputHash, JSON.stringify(next.upstreamHashes), next.updatedAt, JSON.stringify(next), runId, current.revision);
      if (result.changes !== 1) throw new Error("learning loop optimistic revision conflict");
      this.insertOperation(operationKey, commandHash, next);
      this.insertEvent(operationKey, current.status, next);
      this.db.exec("COMMIT");
      return next;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listEvents(runId: string): LearningLoopEvent[] {
    const rows = this.db.prepare(`
      SELECT sequence, run_id, operation_key, from_status, to_status, revision, created_at
      FROM learning_loop_events WHERE run_id = ? ORDER BY sequence
    `).all(runId) as unknown as EventRow[];
    return rows.map((row) => ({
      sequence: row.sequence, runId: row.run_id, operationKey: row.operation_key,
      fromStatus: row.from_status, toStatus: row.to_status, revision: row.revision, createdAt: row.created_at
    }));
  }

  close(): void { this.db.close(); }

  private getInTransaction(runId: string): LearningLoopRun | null {
    const row = this.db.prepare("SELECT run_json FROM learning_loop_runs WHERE id = ?").get(runId) as RunRow | undefined;
    return row ? learningLoopRunSchema.parse(JSON.parse(row.run_json) as unknown) : null;
  }

  private readOperation(operationKey: string, commandHash: string): LearningLoopRun | null {
    const row = this.db.prepare("SELECT command_hash, result_json FROM learning_loop_operations WHERE operation_key = ?").get(operationKey) as OperationRow | undefined;
    if (!row) return null;
    if (row.command_hash !== commandHash) throw new Error(`idempotency conflict for operation ${operationKey}`);
    return learningLoopRunSchema.parse(JSON.parse(row.result_json) as unknown);
  }

  private insertRun(run: LearningLoopRun): void {
    this.db.prepare(`
      INSERT INTO learning_loop_runs (id, status, revision, input_hash, upstream_hashes_json, created_at, updated_at, run_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(run.id, run.status, run.revision, run.inputHash, JSON.stringify(run.upstreamHashes), run.createdAt, run.updatedAt, JSON.stringify(run));
  }

  private insertOperation(operationKey: string, commandHash: string, run: LearningLoopRun): void {
    this.db.prepare(`
      INSERT INTO learning_loop_operations (operation_key, run_id, command_hash, result_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(operationKey, run.id, commandHash, JSON.stringify(run), run.updatedAt);
  }

  private insertEvent(operationKey: string, fromStatus: string | null, run: LearningLoopRun): void {
    this.db.prepare(`
      INSERT INTO learning_loop_events (run_id, operation_key, from_status, to_status, revision, created_at, snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(run.id, operationKey, fromStatus, run.status, run.revision, run.updatedAt, JSON.stringify(run));
  }
}
