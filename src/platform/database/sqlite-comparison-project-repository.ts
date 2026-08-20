import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "../../core/config.js";
import type { ComparisonProjectRepository } from "../../modules/comparison/repository.js";
import { comparisonProjectSchema, type ComparisonProject } from "../../modules/comparison/project-contracts.js";

interface ProjectRow { project_json: string }

export class SQLiteComparisonProjectRepository implements ComparisonProjectRepository {
  private readonly db: DatabaseSync;

  constructor(filePath = databasePath()) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comparison_projects (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        lease_owner TEXT,
        lease_expires_at TEXT,
        project_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_comparison_projects_claim
        ON comparison_projects(status, updated_at, created_at);
    `);
  }

  save(project: ComparisonProject): void {
    const parsed = comparisonProjectSchema.parse(project);
    this.db.prepare(`
      INSERT INTO comparison_projects (id, status, created_at, updated_at, lease_owner, lease_expires_at, project_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at,
        lease_owner=excluded.lease_owner, lease_expires_at=excluded.lease_expires_at,
        project_json=excluded.project_json
    `).run(parsed.id, parsed.status, parsed.createdAt, parsed.updatedAt, parsed.job.leaseOwner,
      parsed.job.leaseExpiresAt, JSON.stringify(parsed));
  }

  get(id: string): ComparisonProject | null {
    const row = this.db.prepare("SELECT project_json FROM comparison_projects WHERE id = ?").get(id) as ProjectRow | undefined;
    return row ? comparisonProjectSchema.parse(JSON.parse(row.project_json) as unknown) : null;
  }

  list(limit = 50): ComparisonProject[] {
    const rows = this.db.prepare("SELECT project_json FROM comparison_projects ORDER BY updated_at DESC LIMIT ?")
      .all(limit) as unknown as ProjectRow[];
    return rows.map((row) => comparisonProjectSchema.parse(JSON.parse(row.project_json) as unknown));
  }

  claimNext(workerId: string, at: string, leaseExpiresAt: string): ComparisonProject | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare(`
        SELECT project_json FROM comparison_projects
        WHERE status = 'queued' OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
        ORDER BY updated_at ASC, created_at ASC LIMIT 1
      `).get(at) as ProjectRow | undefined;
      if (!row) { this.db.exec("COMMIT"); return null; }
      const project = comparisonProjectSchema.parse(JSON.parse(row.project_json) as unknown);
      project.status = "running";
      project.updatedAt = at;
      project.job = { state: "running", attempt: project.job.attempt + 1, leaseOwner: workerId,
        leaseExpiresAt, lastHeartbeatAt: at };
      this.db.prepare(`UPDATE comparison_projects SET status='running', updated_at=?, lease_owner=?, lease_expires_at=?, project_json=? WHERE id=?`)
        .run(at, workerId, leaseExpiresAt, JSON.stringify(project), project.id);
      this.db.exec("COMMIT");
      return project;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  heartbeat(id: string, workerId: string, at: string, leaseExpiresAt: string): boolean {
    const project = this.get(id);
    if (!project || project.status !== "running" || project.job.leaseOwner !== workerId) return false;
    project.updatedAt = at;
    project.job.lastHeartbeatAt = at;
    project.job.leaseExpiresAt = leaseExpiresAt;
    this.save(project);
    return true;
  }

  close(): void { this.db.close(); }
}
