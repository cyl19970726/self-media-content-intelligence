import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "../../core/config.js";
import {
  creatorResearchEventSchema,
  creatorResearchRunSchema,
  type CreatorResearchEvent,
  type CreatorResearchRun
} from "../../shared/schema.js";
import type { AppendEventInput, CreatorResearchRepository, ResearchJobLane } from "../../modules/creator-research/repository.js";
import {
  researchJobSchema,
  type ResearchJob,
  type ResearchJobStatus
} from "../../../packages/research/index.js";

interface CreatorResearchRow { run_json: string }

interface ResearchJobRow {
  id: string;
  run_id: string;
  node_key: string;
  status: string;
  idempotency_key: string;
  attempts: number;
  max_attempts: number;
  available_at: string;
  lease_owner: string | null;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  payload_json: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface ResearchEventRow {
  sequence: number;
  run_id: string;
  job_id: string | null;
  type: string;
  created_at: string;
  message: string;
  payload_json: string;
}

function parseJob(row: ResearchJobRow): ResearchJob {
  return researchJobSchema.parse({
    id: row.id,
    runId: row.run_id,
    nodeKey: row.node_key,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
    heartbeatAt: row.heartbeat_at,
    payload: JSON.parse(row.payload_json) as unknown,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function parseEvent(row: ResearchEventRow): CreatorResearchEvent {
  return creatorResearchEventSchema.parse({
    sequence: row.sequence,
    runId: row.run_id,
    jobId: row.job_id,
    type: row.type,
    createdAt: row.created_at,
    message: row.message,
    payload: JSON.parse(row.payload_json) as unknown
  });
}

export class SQLiteCreatorResearchRepository implements CreatorResearchRepository {
  private readonly db: DatabaseSync;

  constructor(filePath = databasePath()) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS creator_research_runs (
        id TEXT PRIMARY KEY,
        profile_url TEXT NOT NULL,
        status TEXT NOT NULL,
        current_stage TEXT NOT NULL,
        creator_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        run_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_creator_research_runs_updated_at
        ON creator_research_runs(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_creator_research_runs_profile_url
        ON creator_research_runs(profile_url, updated_at DESC);

      CREATE TABLE IF NOT EXISTS research_jobs (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        node_key TEXT NOT NULL,
        status TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL,
        available_at TEXT NOT NULL,
        lease_owner TEXT,
        lease_expires_at TEXT,
        heartbeat_at TEXT,
        payload_json TEXT NOT NULL,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES creator_research_runs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_research_jobs_claim
        ON research_jobs(status, available_at, created_at);
      CREATE INDEX IF NOT EXISTS idx_research_jobs_run
        ON research_jobs(run_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS research_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        job_id TEXT,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES creator_research_runs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_research_events_run_sequence
        ON research_events(run_id, sequence);
    `);
  }

  save(run: CreatorResearchRun): void {
    const parsed = creatorResearchRunSchema.parse(run);
    this.db.prepare(`
      INSERT INTO creator_research_runs (
        id, profile_url, status, current_stage, creator_id,
        created_at, updated_at, run_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        profile_url = excluded.profile_url,
        status = excluded.status,
        current_stage = excluded.current_stage,
        creator_id = excluded.creator_id,
        updated_at = excluded.updated_at,
        run_json = excluded.run_json
    `).run(parsed.id, parsed.profileUrl, parsed.status, parsed.currentStage, parsed.creatorId,
      parsed.createdAt, parsed.updatedAt, JSON.stringify(parsed));
  }

  get(id: string): CreatorResearchRun | null {
    const row = this.db.prepare("SELECT run_json FROM creator_research_runs WHERE id = ?").get(id) as CreatorResearchRow | undefined;
    return row ? creatorResearchRunSchema.parse(JSON.parse(row.run_json) as unknown) : null;
  }

  list(limit = 50): CreatorResearchRun[] {
    const rows = this.db.prepare("SELECT run_json FROM creator_research_runs ORDER BY updated_at DESC LIMIT ?")
      .all(limit) as unknown as CreatorResearchRow[];
    return rows.map((row) => creatorResearchRunSchema.parse(JSON.parse(row.run_json) as unknown));
  }

  findLatestByProfileUrl(profileUrl: string): CreatorResearchRun | null {
    const row = this.db.prepare(`
      SELECT run_json FROM creator_research_runs
      WHERE profile_url = ?
      ORDER BY updated_at DESC LIMIT 1
    `).get(profileUrl) as CreatorResearchRow | undefined;
    return row ? creatorResearchRunSchema.parse(JSON.parse(row.run_json) as unknown) : null;
  }

  enqueue(job: ResearchJob): ResearchJob {
    const parsed = researchJobSchema.parse(job);
    this.db.prepare(`
      INSERT OR IGNORE INTO research_jobs (
        id, run_id, node_key, status, idempotency_key, attempts, max_attempts,
        available_at, lease_owner, lease_expires_at, heartbeat_at,
        payload_json, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(parsed.id, parsed.runId, parsed.nodeKey, parsed.status, parsed.idempotencyKey,
      parsed.attempts, parsed.maxAttempts, parsed.availableAt, parsed.leaseOwner,
      parsed.leaseExpiresAt, parsed.heartbeatAt, JSON.stringify(parsed.payload),
      parsed.lastError, parsed.createdAt, parsed.updatedAt);
    const stored = this.db.prepare("SELECT * FROM research_jobs WHERE idempotency_key = ?")
      .get(parsed.idempotencyKey) as ResearchJobRow | undefined;
    if (!stored) throw new Error("任务写入失败");
    return parseJob(stored);
  }

  requeueRun(runId: string, availableAt: string): ResearchJob | null {
    const row = this.db.prepare(`
      SELECT * FROM research_jobs
      WHERE run_id = ? AND status IN ('needs_user','backoff','failed')
      ORDER BY created_at DESC LIMIT 1
    `).get(runId) as ResearchJobRow | undefined;
    if (!row) return null;
    this.db.prepare(`
      UPDATE research_jobs SET status = 'queued', available_at = ?, lease_owner = NULL,
        lease_expires_at = NULL, heartbeat_at = NULL, last_error = NULL, updated_at = ?
      WHERE id = ?
    `).run(availableAt, availableAt, row.id);
    const updated = this.db.prepare("SELECT * FROM research_jobs WHERE id = ?").get(row.id) as unknown as ResearchJobRow;
    return parseJob(updated);
  }

  claimNext(workerId: string, now: string, leaseExpiresAt: string, lane: ResearchJobLane = "any"): ResearchJob | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const laneClause = lane === "video" ? "AND node_key = 'video.reconstruct'"
        : lane === "serial" ? "AND node_key != 'video.reconstruct'" : "";
      const row = this.db.prepare(`
        SELECT * FROM research_jobs
        WHERE ((status IN ('queued','backoff') AND available_at <= ?)
          OR (status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?))
          AND run_id IN (SELECT id FROM creator_research_runs WHERE status NOT IN ('needs_user','failed'))
          ${laneClause}
        ORDER BY available_at ASC, created_at ASC LIMIT 1
      `).get(now, now) as ResearchJobRow | undefined;
      if (!row) {
        this.db.exec("COMMIT");
        return null;
      }
      const result = this.db.prepare(`
        UPDATE research_jobs SET status = 'leased', attempts = attempts + 1,
          lease_owner = ?, lease_expires_at = ?, heartbeat_at = ?, updated_at = ?
        WHERE id = ?
      `).run(workerId, leaseExpiresAt, now, now, row.id);
      if (result.changes !== 1) throw new Error("任务租约竞争失败");
      const claimed = this.db.prepare("SELECT * FROM research_jobs WHERE id = ?").get(row.id) as unknown as ResearchJobRow;
      this.db.exec("COMMIT");
      return parseJob(claimed);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  updateJobStatus(input: { jobId: string; status: ResearchJobStatus; updatedAt: string; lastError?: string | null }): void {
    this.db.prepare(`
      UPDATE research_jobs SET status = ?, updated_at = ?, last_error = ?,
        lease_owner = CASE WHEN ? IN ('succeeded','failed','needs_user','canceled') THEN NULL ELSE lease_owner END,
        lease_expires_at = CASE WHEN ? IN ('succeeded','failed','needs_user','canceled') THEN NULL ELSE lease_expires_at END
      WHERE id = ?
    `).run(input.status, input.updatedAt, input.lastError ?? null, input.status, input.status, input.jobId);
  }

  heartbeat(jobId: string, workerId: string, at: string, leaseExpiresAt: string): boolean {
    const result = this.db.prepare(`
      UPDATE research_jobs SET heartbeat_at = ?, lease_expires_at = ?, updated_at = ?
      WHERE id = ? AND lease_owner = ? AND status IN ('leased','running')
    `).run(at, leaseExpiresAt, at, jobId, workerId);
    return result.changes === 1;
  }

  appendEvent(event: AppendEventInput): CreatorResearchEvent {
    const parsed = creatorResearchEventSchema.omit({ sequence: true }).parse(event);
    const result = this.db.prepare(`
      INSERT INTO research_events (run_id, job_id, type, created_at, message, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(parsed.runId, parsed.jobId, parsed.type, parsed.createdAt, parsed.message, JSON.stringify(parsed.payload));
    const row = this.db.prepare("SELECT * FROM research_events WHERE sequence = ?")
      .get(Number(result.lastInsertRowid)) as unknown as ResearchEventRow;
    return parseEvent(row);
  }

  listEvents(runId: string, afterSequence = 0): CreatorResearchEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM research_events WHERE run_id = ? AND sequence > ?
      ORDER BY sequence ASC LIMIT 500
    `).all(runId, afterSequence) as unknown as ResearchEventRow[];
    return rows.map(parseEvent);
  }

  close(): void { this.db.close(); }
}
