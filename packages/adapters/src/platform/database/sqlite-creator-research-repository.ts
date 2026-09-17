import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { creatorWorkerConcurrency, databasePath } from "../../core/config.js";
import {
  creatorResearchEventSchema,
  creatorResearchRunSchema,
  type CreatorAcquisitionAdapter,
  type CreatorResearchEvent,
  type CreatorResearchRun
} from "../../../../contracts/index.js";
import type { AppendEventInput, CreatorResearchRepository, ResearchJobLane } from "../../../../research/index.js";
import {
  researchJobSchema,
  type ResearchJob,
  type ResearchJobStatus
} from "../../../../research/index.js";

interface CreatorResearchRow { run_json: string }

interface ExpiredJobRunRow extends ResearchJobRow { run_json: string }

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

function lanePredicate(lane: ResearchJobLane, jobAlias: string, runAlias: string): string {
  if (lane === "redfox" || lane === "ego-browser") {
    return `${jobAlias}.node_key IN ('creator.acquire','creator.enrich')
      AND json_extract(${runAlias}.run_json, '$.collectionPolicy.adapter') = '${lane}'`;
  }
  if (lane === "portfolio") return `${jobAlias}.node_key = 'creator.portfolio'`;
  if (lane === "video") return allVideoWorkPredicate(jobAlias);
  if (lane === "synthesis") return `(${jobAlias}.node_key = 'creator.synthesize'
    OR (${jobAlias}.node_key = 'workflow.advance'
      AND json_extract(${jobAlias}.payload_json, '$.workflowId') IN (
        'creator.analyze','creator.synthesize','creator.build','creator.review','creator.repair'))
    OR (${jobAlias}.node_key = 'workflow.advance'
      AND json_extract(${jobAlias}.payload_json, '$.workflowId') = 'post.analyze'
      AND json_extract(${jobAlias}.payload_json, '$.workflowRevision') IN ('v2','v3','v4','v5')))`;
  return "1 = 1";
}

function legacyPostAnalyzePredicate(jobAlias: string): string {
  return `(${jobAlias}.node_key = 'workflow.advance'
    AND json_extract(${jobAlias}.payload_json, '$.workflowId') = 'post.analyze'
    AND COALESCE(json_extract(${jobAlias}.payload_json, '$.workflowRevision'), 'v1') = 'v1')`;
}

function allVideoWorkPredicate(jobAlias: string): string {
  return `(${videoLanePredicate(jobAlias)} OR ${legacyPostAnalyzePredicate(jobAlias)})`;
}

function postVideoWorkflowPredicate(jobAlias: string): string {
  return `(${postWorkerWorkflowPredicate(jobAlias)} OR ${legacyPostAnalyzePredicate(jobAlias)})`;
}

function videoLanePredicate(jobAlias: string): string {
  return `(${jobAlias}.node_key = 'video.reconstruct'
    OR ${postWorkerWorkflowPredicate(jobAlias)})`;
}

function postWorkerWorkflowPredicate(jobAlias: string): string {
  return `(${jobAlias}.node_key = 'workflow.advance'
    AND json_extract(${jobAlias}.payload_json, '$.workflowId') IN (
      'post.source-check','post.build','post.review','post.repair','post.repair-evaluation'))`;
}

function workflowControlPredicate(jobAlias: string): string {
  return `(${jobAlias}.node_key = 'workflow.advance' AND (
    json_extract(${jobAlias}.payload_json, '$.workflowId') = 'creator.analyze'
    OR (json_extract(${jobAlias}.payload_json, '$.workflowId') IN ('post.analyze','creator.synthesize')
      AND json_extract(${jobAlias}.payload_json, '$.workflowRevision') IN ('v2','v3','v4','v5'))))`;
}

export class SQLiteCreatorResearchRepository implements CreatorResearchRepository {
  private readonly db: DatabaseSync;
  private readonly ownsDatabase: boolean;

  constructor(filePath: string | DatabaseSync = databasePath()) {
    this.ownsDatabase = typeof filePath === "string";
    if (typeof filePath === "string") fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = typeof filePath === "string" ? new DatabaseSync(filePath) : filePath;
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
      CREATE INDEX IF NOT EXISTS idx_creator_research_runs_profile_adapter
        ON creator_research_runs(profile_url, json_extract(run_json, '$.collectionPolicy.adapter'), updated_at DESC);

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

  findLatestByProfileUrlAndAdapter(profileUrl: string, adapter: CreatorAcquisitionAdapter): CreatorResearchRun | null {
    const row = this.db.prepare(`
      SELECT run_json FROM creator_research_runs
      WHERE profile_url = ?
        AND json_extract(run_json, '$.collectionPolicy.adapter') = ?
      ORDER BY updated_at DESC LIMIT 1
    `).get(profileUrl, adapter) as CreatorResearchRow | undefined;
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

  cancelWorkflowJobs(runId: string, workflowRunId: string, updatedAt: string): number {
    const result = this.db.prepare(`
      UPDATE research_jobs SET status = 'canceled', lease_owner = NULL, lease_expires_at = NULL,
        heartbeat_at = NULL, last_error = 'workflow_canceled', updated_at = ?
      WHERE run_id = ? AND node_key = 'workflow.advance'
        AND json_extract(payload_json, '$.workflowRunId') = ?
        AND status IN ('queued','backoff','needs_user')
    `).run(updatedAt, runId, workflowRunId);
    return Number(result.changes);
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

  claimNext(workerId: string, now: string, leaseExpiresAt: string, lane: ResearchJobLane = "any",
    runId?: string): ResearchJob | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const exhausted = this.db.prepare(`
        SELECT expired.*, run.run_json
        FROM research_jobs expired
        JOIN creator_research_runs run ON run.id = expired.run_id
        WHERE expired.status IN ('leased','running')
          AND expired.lease_expires_at IS NOT NULL AND expired.lease_expires_at <= ?
          AND expired.attempts >= expired.max_attempts
          AND (? IS NULL OR expired.run_id = ?)
      `).all(now, runId ?? null, runId ?? null) as unknown as ExpiredJobRunRow[];
      for (const expired of exhausted) this.exhaustRetryBudget(parseJob(expired), expired.run_json, now);
      this.db.prepare(`
        UPDATE research_jobs SET status = 'backoff', available_at = ?, lease_owner = NULL,
          lease_expires_at = NULL, heartbeat_at = NULL, last_error = 'lease_expired', updated_at = ?
        WHERE status IN ('leased','running') AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?
          AND attempts < max_attempts
          AND (? IS NULL OR run_id = ?)
      `).run(now, now, now, runId ?? null, runId ?? null);
      let laneAtCapacity = false;
      if (lane !== "any") {
        const limits = creatorWorkerConcurrency();
        const active = this.db.prepare(`
          SELECT COUNT(*) AS count
          FROM research_jobs active
          JOIN creator_research_runs active_run ON active_run.id = active.run_id
          WHERE active.status IN ('leased','running')
            AND COALESCE(active.lease_expires_at, '9999-12-31T23:59:59.999Z') > ?
            AND ${lanePredicate(lane, "active", "active_run")}
            AND NOT ${workflowControlPredicate("active")}
        `).get(now) as { count: number };
        laneAtCapacity = active.count >= limits[lane];
      }
      const row = this.db.prepare(`
        SELECT candidate.* FROM research_jobs candidate
        JOIN creator_research_runs candidate_run ON candidate_run.id = candidate.run_id
        WHERE ((candidate.status IN ('queued','backoff') AND candidate.available_at <= ?)
          OR (candidate.status IN ('leased','running') AND candidate.lease_expires_at IS NOT NULL
            AND candidate.lease_expires_at <= ?))
          AND (candidate_run.status IN ('queued','preflight','collecting','backoff','reviewable')
            OR (candidate.node_key = 'workflow.advance' AND candidate_run.status = 'ready'))
          AND ${lanePredicate(lane, "candidate", "candidate_run")}
          AND (? = 0 OR ${workflowControlPredicate("candidate")})
          AND (? IS NULL OR candidate.run_id = ?)
          AND (NOT ${postVideoWorkflowPredicate("candidate")}
            OR (SELECT COUNT(*) FROM research_jobs post_active
              WHERE post_active.status IN ('leased','running')
                AND COALESCE(post_active.lease_expires_at, '9999-12-31T23:59:59.999Z') > ?
                AND ${postVideoWorkflowPredicate("post_active")}) < 2)
          AND NOT EXISTS (
            SELECT 1 FROM research_jobs active_job
            WHERE active_job.run_id = candidate.run_id
              AND active_job.id != candidate.id
              AND active_job.status IN ('leased','running')
              AND COALESCE(active_job.lease_expires_at, '9999-12-31T23:59:59.999Z') > ?
              AND NOT (
                ${workflowControlPredicate("candidate")}
                OR ${workflowControlPredicate("active_job")}
                OR (${allVideoWorkPredicate("candidate")} AND ${allVideoWorkPredicate("active_job")})
              )
          )
        ORDER BY
          CASE WHEN candidate.status IN ('leased','running') THEN 0 ELSE 1 END ASC,
          CASE WHEN candidate.status = 'backoff' AND candidate.last_error = 'lease_expired' THEN 0 ELSE 1 END ASC,
          candidate.available_at ASC,
          candidate.created_at ASC
        LIMIT 1
      `).get(now, now, laneAtCapacity ? 1 : 0, runId ?? null, runId ?? null, now, now) as ResearchJobRow | undefined;
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

  activeVideoPostExternalIds(runId: string, at: string): string[] {
    const rows = this.db.prepare(`
      SELECT payload_json FROM research_jobs
      WHERE run_id = ? AND node_key = 'video.reconstruct'
        AND status IN ('leased','running')
        AND lease_expires_at IS NOT NULL AND lease_expires_at > ?
    `).all(runId, at) as Array<{ payload_json: string }>;
    return [...new Set(rows.flatMap((row) => {
      const payload = JSON.parse(row.payload_json) as { postExternalId?: unknown };
      return typeof payload.postExternalId === "string" && payload.postExternalId ? [payload.postExternalId] : [];
    }))];
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

  close(): void {
    if (this.ownsDatabase) this.db.close();
  }

  private exhaustRetryBudget(job: ResearchJob, runJson: string, timestamp: string): void {
    const run = creatorResearchRunSchema.parse(JSON.parse(runJson) as unknown);
    const failedStage = job.nodeKey === "creator.portfolio" ? "tiering"
      : ["creator.enrich", "video.reconstruct"].includes(job.nodeKey) ? "deep_capture"
        : job.nodeKey === "creator.synthesize" ? "synthesis" : "preflight";
    const message = `任务租约连续过期，已达到自动重试上限 ${job.maxAttempts} 次。请检查 Worker 或 Runner 后在 Dashboard 点击继续。`;
    const stage = run.stages.find((candidate) => candidate.id === failedStage);
    if (stage) {
      stage.status = "failed";
      stage.message = message;
    }
    run.status = "failed";
    run.updatedAt = timestamp;
    run.worker = {
      state: "failed",
      attempt: job.attempts,
      jobId: job.id,
      workerId: null,
      lastHeartbeatAt: timestamp
    };
    run.blockers = [{ code: "retry_limit_exhausted", message, userActionRequired: false }];
    run.nextAction = "自动重试已停止；检查失败原因后可在 Dashboard 点击继续。";
    this.save(run);
    this.db.prepare(`
      UPDATE research_jobs SET status = 'failed', lease_owner = NULL, lease_expires_at = NULL,
        heartbeat_at = NULL, last_error = 'retry_limit_exhausted', updated_at = ?
      WHERE id = ?
    `).run(timestamp, job.id);
    this.appendEvent({
      runId: run.id,
      jobId: job.id,
      type: "run.failed",
      createdAt: timestamp,
      message,
      payload: { code: "retry_limit_exhausted", attempts: job.attempts, maxAttempts: job.maxAttempts, nodeKey: job.nodeKey }
    });
  }
}
