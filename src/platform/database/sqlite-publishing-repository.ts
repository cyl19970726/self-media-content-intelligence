import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "../../core/config.js";
import type { PublishingRepository } from "../../../packages/creation/index.js";
import {
  contentPackageSchema, platformVariantSchema, publicationEventSchema, publicationJobSchema,
  publicationRunSchema, type ContentPackage, type PlatformVariant, type PublicationEvent,
  type PublicationJob, type PublicationJobStatus, type PublicationRun
} from "../../../packages/creation/index.js";

type JsonRow = { value_json: string };
type JobRow = {
  id: string; run_id: string; node_key: string; status: string; idempotency_key: string;
  attempts: number; max_attempts: number; available_at: string; lease_owner: string | null;
  lease_expires_at: string | null; last_error: string | null; created_at: string; updated_at: string;
};
type EventRow = {
  sequence: number; run_id: string; job_id: string | null; type: string;
  message: string; payload_json: string; created_at: string;
};

function parseJob(row: JobRow): PublicationJob {
  return publicationJobSchema.parse({
    id: row.id, runId: row.run_id, nodeKey: row.node_key, status: row.status,
    idempotencyKey: row.idempotency_key, attempts: row.attempts, maxAttempts: row.max_attempts,
    availableAt: row.available_at, leaseOwner: row.lease_owner, leaseExpiresAt: row.lease_expires_at,
    lastError: row.last_error, createdAt: row.created_at, updatedAt: row.updated_at
  });
}

function parseEvent(row: EventRow): PublicationEvent {
  return publicationEventSchema.parse({
    sequence: row.sequence, runId: row.run_id, jobId: row.job_id, type: row.type,
    message: row.message, payload: JSON.parse(row.payload_json) as unknown, createdAt: row.created_at
  });
}

export class SQLitePublishingRepository implements PublishingRepository {
  private readonly db: DatabaseSync;

  constructor(filePath = databasePath()) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        value_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_content_packages_updated_at ON content_packages(updated_at DESC);

      CREATE TABLE IF NOT EXISTS content_variants (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        revision INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        value_json TEXT NOT NULL,
        FOREIGN KEY(package_id) REFERENCES content_packages(id)
      );
      CREATE INDEX IF NOT EXISTS idx_content_variants_package ON content_variants(package_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS publication_runs (
        id TEXT PRIMARY KEY,
        variant_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        value_json TEXT NOT NULL,
        FOREIGN KEY(variant_id) REFERENCES content_variants(id)
      );
      CREATE INDEX IF NOT EXISTS idx_publication_runs_updated_at ON publication_runs(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_publication_runs_variant ON publication_runs(variant_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS publication_jobs (
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
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES publication_runs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_publication_jobs_claim ON publication_jobs(status, available_at, created_at);

      CREATE TABLE IF NOT EXISTS publication_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        job_id TEXT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES publication_runs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_publication_events_run ON publication_events(run_id, sequence);
    `);
  }

  savePackage(value: ContentPackage): void {
    const parsed = contentPackageSchema.parse(value);
    this.db.prepare(`INSERT INTO content_packages(id,name,created_at,updated_at,value_json) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at,value_json=excluded.value_json`)
      .run(parsed.id, parsed.name, parsed.createdAt, parsed.updatedAt, JSON.stringify(parsed));
  }

  getPackage(id: string): ContentPackage | null {
    const row = this.db.prepare("SELECT value_json FROM content_packages WHERE id=?").get(id) as JsonRow | undefined;
    return row ? contentPackageSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  listPackages(limit = 100): ContentPackage[] {
    const rows = this.db.prepare("SELECT value_json FROM content_packages ORDER BY updated_at DESC LIMIT ?").all(limit) as unknown as JsonRow[];
    return rows.map((row) => contentPackageSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  saveVariant(value: PlatformVariant): void {
    const parsed = platformVariantSchema.parse(value);
    this.db.prepare(`INSERT INTO content_variants(id,package_id,platform,revision,created_at,updated_at,value_json) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET platform=excluded.platform,revision=excluded.revision,updated_at=excluded.updated_at,value_json=excluded.value_json`)
      .run(parsed.id, parsed.packageId, parsed.platform, parsed.revision, parsed.createdAt, parsed.updatedAt, JSON.stringify(parsed));
  }

  getVariant(id: string): PlatformVariant | null {
    const row = this.db.prepare("SELECT value_json FROM content_variants WHERE id=?").get(id) as JsonRow | undefined;
    return row ? platformVariantSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  listVariants(packageId: string): PlatformVariant[] {
    const rows = this.db.prepare("SELECT value_json FROM content_variants WHERE package_id=? ORDER BY updated_at DESC").all(packageId) as unknown as JsonRow[];
    return rows.map((row) => platformVariantSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  saveRun(value: PublicationRun): void {
    const parsed = publicationRunSchema.parse(value);
    this.db.prepare(`INSERT INTO publication_runs(id,variant_id,platform,status,created_at,updated_at,value_json) VALUES(?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,value_json=excluded.value_json`)
      .run(parsed.id, parsed.variantId, parsed.platform, parsed.status, parsed.createdAt, parsed.updatedAt, JSON.stringify(parsed));
  }

  getRun(id: string): PublicationRun | null {
    const row = this.db.prepare("SELECT value_json FROM publication_runs WHERE id=?").get(id) as JsonRow | undefined;
    return row ? publicationRunSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  listRuns(limit = 100): PublicationRun[] {
    const rows = this.db.prepare("SELECT value_json FROM publication_runs ORDER BY updated_at DESC LIMIT ?").all(limit) as unknown as JsonRow[];
    return rows.map((row) => publicationRunSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  listRunsByVariant(variantId: string): PublicationRun[] {
    const rows = this.db.prepare("SELECT value_json FROM publication_runs WHERE variant_id=? ORDER BY updated_at DESC").all(variantId) as unknown as JsonRow[];
    return rows.map((row) => publicationRunSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  enqueue(job: PublicationJob): PublicationJob {
    const parsed = publicationJobSchema.parse(job);
    this.db.prepare(`INSERT OR IGNORE INTO publication_jobs(
      id,run_id,node_key,status,idempotency_key,attempts,max_attempts,available_at,lease_owner,lease_expires_at,last_error,created_at,updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      parsed.id, parsed.runId, parsed.nodeKey, parsed.status, parsed.idempotencyKey, parsed.attempts,
      parsed.maxAttempts, parsed.availableAt, parsed.leaseOwner, parsed.leaseExpiresAt,
      parsed.lastError, parsed.createdAt, parsed.updatedAt
    );
    const row = this.db.prepare("SELECT * FROM publication_jobs WHERE idempotency_key=?").get(parsed.idempotencyKey) as JobRow | undefined;
    if (!row) throw new Error("发布任务写入失败");
    return parseJob(row);
  }

  claimNext(workerId: string, now: string, leaseExpiresAt: string): PublicationJob | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare(`SELECT * FROM publication_jobs
        WHERE ((status='queued' AND available_at<=?) OR (status IN ('leased','running') AND lease_expires_at<=?))
        ORDER BY available_at ASC,created_at ASC LIMIT 1`).get(now, now) as JobRow | undefined;
      if (!row) { this.db.exec("COMMIT"); return null; }
      this.db.prepare(`UPDATE publication_jobs SET status='leased',attempts=attempts+1,lease_owner=?,lease_expires_at=?,updated_at=? WHERE id=?`)
        .run(workerId, leaseExpiresAt, now, row.id);
      const claimed = this.db.prepare("SELECT * FROM publication_jobs WHERE id=?").get(row.id) as JobRow;
      this.db.exec("COMMIT");
      return parseJob(claimed);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  updateJobStatus(input: { jobId: string; status: PublicationJobStatus; updatedAt: string; lastError?: string | null }): void {
    this.db.prepare(`UPDATE publication_jobs SET status=?,updated_at=?,last_error=?,
      lease_owner=CASE WHEN ? IN ('succeeded','failed','needs_user','canceled') THEN NULL ELSE lease_owner END,
      lease_expires_at=CASE WHEN ? IN ('succeeded','failed','needs_user','canceled') THEN NULL ELSE lease_expires_at END
      WHERE id=?`).run(input.status, input.updatedAt, input.lastError ?? null, input.status, input.status, input.jobId);
  }

  appendEvent(input: Omit<PublicationEvent, "sequence">): PublicationEvent {
    const result = this.db.prepare(`INSERT INTO publication_events(run_id,job_id,type,message,payload_json,created_at) VALUES(?,?,?,?,?,?)`)
      .run(input.runId, input.jobId, input.type, input.message, JSON.stringify(input.payload), input.createdAt);
    const row = this.db.prepare("SELECT * FROM publication_events WHERE sequence=?").get(Number(result.lastInsertRowid)) as EventRow;
    return parseEvent(row);
  }

  listEvents(runId: string, afterSequence = 0): PublicationEvent[] {
    const rows = this.db.prepare("SELECT * FROM publication_events WHERE run_id=? AND sequence>? ORDER BY sequence ASC")
      .all(runId, afterSequence) as unknown as EventRow[];
    return rows.map(parseEvent);
  }

  close(): void { this.db.close(); }
}
