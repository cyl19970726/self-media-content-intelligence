import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "../../packages/adapters/index.js";
import {
  reportEnvelopeSchema,
  type ReportEnvelope,
  type RunSummary
} from "../shared/schema.js";

interface RunRow {
  id: string;
  source_url: string;
  platform: string;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
  report_json: string;
}

export class RunStore {
  private readonly db: DatabaseSync;

  constructor(filePath = databasePath(), options: { readOnly?: boolean } = {}) {
    if (!options.readOnly) fs.mkdirSync(path.dirname(filePath), { recursive: true });
    else if (!fs.existsSync(filePath)) throw new Error(`run database does not exist: ${filePath}`);
    this.db = new DatabaseSync(filePath, { readOnly: options.readOnly ?? false });
    if (options.readOnly) {
      this.db.exec("PRAGMA query_only = ON");
      return;
    }
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        source_url TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        current_stage TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        report_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_runs_updated_at ON runs(updated_at DESC);
    `);
  }

  save(report: ReportEnvelope): void {
    const parsed = reportEnvelopeSchema.parse(report);
    this.db.prepare(`
      INSERT INTO runs (
        id, source_url, platform, status, current_stage,
        created_at, updated_at, report_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        current_stage = excluded.current_stage,
        updated_at = excluded.updated_at,
        report_json = excluded.report_json
    `).run(
      parsed.id,
      parsed.sourceUrl,
      parsed.platform,
      parsed.status,
      parsed.currentStage,
      parsed.createdAt,
      parsed.updatedAt,
      JSON.stringify(parsed)
    );
  }

  get(id: string): ReportEnvelope | null {
    const row = this.db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
    return row ? reportEnvelopeSchema.parse(JSON.parse(row.report_json)) : null;
  }

  list(limit = 100): RunSummary[] {
    const rows = this.db.prepare("SELECT * FROM runs ORDER BY updated_at DESC LIMIT ?").all(limit) as unknown as RunRow[];
    return rows.map((row) => {
      const report = reportEnvelopeSchema.parse(JSON.parse(row.report_json));
      return {
        id: report.id,
        sourceUrl: report.sourceUrl,
        platform: report.platform,
        status: report.status,
        currentStage: report.currentStage,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        executiveSummary: report.executiveSummary,
        title: report.source?.title ?? "等待采集",
        authorName: report.source?.author.name ?? "未知作者"
      };
    });
  }

  listReports(limit = 10_000): ReportEnvelope[] {
    const rows = this.db.prepare("SELECT report_json FROM runs ORDER BY updated_at ASC, id ASC LIMIT ?").all(limit) as unknown as Array<{ report_json: string }>;
    return rows.map((row) => reportEnvelopeSchema.parse(JSON.parse(row.report_json) as unknown));
  }

  close(): void {
    this.db.close();
  }
}
