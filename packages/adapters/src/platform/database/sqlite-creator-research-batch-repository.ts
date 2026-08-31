import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  creatorResearchBatchSchema,
  type CreatorResearchBatch
} from "../../../../contracts/index.js";
import type { CreatorResearchBatchRepository } from "../../../../research/index.js";
import { databasePath } from "../../core/config.js";

interface BatchRow {
  id: string;
  schema_version: string;
  name: string;
  created_at: string;
  operation_key: string;
  command_hash: string;
}

interface BatchItemRow { run_id: string }

export class SQLiteCreatorResearchBatchRepository implements CreatorResearchBatchRepository {
  private readonly db: DatabaseSync;

  constructor(filePath = databasePath()) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS creator_research_batches (
        id TEXT PRIMARY KEY,
        schema_version TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        operation_key TEXT NOT NULL UNIQUE,
        command_hash TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_creator_research_batches_created
        ON creator_research_batches(created_at DESC, id DESC);

      CREATE TABLE IF NOT EXISTS creator_research_batch_items (
        batch_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        run_id TEXT NOT NULL,
        PRIMARY KEY(batch_id, position),
        UNIQUE(batch_id, run_id),
        FOREIGN KEY(batch_id) REFERENCES creator_research_batches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_creator_research_batch_items_run
        ON creator_research_batch_items(run_id);
    `);
  }

  create(
    batch: CreatorResearchBatch,
    operationKey: string,
    commandHash: string
  ): CreatorResearchBatch {
    const parsed = creatorResearchBatchSchema.parse(batch);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.operation(operationKey);
      if (existing) {
        if (existing.command_hash !== commandHash) throw this.idempotencyConflict(operationKey);
        const result = this.read(existing);
        this.db.exec("COMMIT");
        return result;
      }
      this.db.prepare(`
        INSERT INTO creator_research_batches (
          id, schema_version, name, created_at, operation_key, command_hash
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(parsed.id, parsed.schemaVersion, parsed.name, parsed.createdAt, operationKey, commandHash);
      const insertItem = this.db.prepare(`
        INSERT INTO creator_research_batch_items (batch_id, position, run_id)
        VALUES (?, ?, ?)
      `);
      parsed.runIds.forEach((runId, position) => insertItem.run(parsed.id, position, runId));
      this.db.exec("COMMIT");
      return parsed;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getByOperationKey(operationKey: string, commandHash: string): CreatorResearchBatch | null {
    const row = this.operation(operationKey);
    if (!row) return null;
    if (row.command_hash !== commandHash) throw this.idempotencyConflict(operationKey);
    return this.read(row);
  }

  get(id: string): CreatorResearchBatch | null {
    const row = this.db.prepare(`
      SELECT * FROM creator_research_batches WHERE id = ?
    `).get(id) as BatchRow | undefined;
    return row ? this.read(row) : null;
  }

  list(limit = 50): CreatorResearchBatch[] {
    const boundedLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.trunc(limit)))
      : 50;
    const rows = this.db.prepare(`
      SELECT * FROM creator_research_batches
      ORDER BY created_at DESC, id DESC LIMIT ?
    `).all(boundedLimit) as unknown as BatchRow[];
    return rows.map((row) => this.read(row));
  }

  close(): void { this.db.close(); }

  private operation(operationKey: string): BatchRow | null {
    return (this.db.prepare(`
      SELECT * FROM creator_research_batches WHERE operation_key = ?
    `).get(operationKey) as BatchRow | undefined) ?? null;
  }

  private read(row: BatchRow): CreatorResearchBatch {
    const items = this.db.prepare(`
      SELECT run_id FROM creator_research_batch_items
      WHERE batch_id = ? ORDER BY position ASC
    `).all(row.id) as unknown as BatchItemRow[];
    return creatorResearchBatchSchema.parse({
      schemaVersion: row.schema_version,
      id: row.id,
      name: row.name,
      runIds: items.map((item) => item.run_id),
      createdAt: row.created_at
    });
  }

  private idempotencyConflict(operationKey: string): Error {
    return new Error(`idempotency conflict for operation ${operationKey}`);
  }
}
