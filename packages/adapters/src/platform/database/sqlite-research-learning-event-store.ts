import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  researchLearningEventSchema,
  type ResearchLearningEvent,
  type ResearchLearningEventStore
} from "../../../../research/index.js";

interface ResearchLearningEventRow {
  event_json: string;
}

export class SQLiteResearchLearningEventStore implements ResearchLearningEventStore {
  private readonly database: DatabaseSync;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.database = new DatabaseSync(filePath);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS research_learning_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        event_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  append(event: ResearchLearningEvent): void {
    const parsed = researchLearningEventSchema.parse(event);
    this.database.prepare(`
      INSERT INTO research_learning_events (event_type, event_json, created_at)
      VALUES (?, ?, ?)
    `).run(parsed.type, JSON.stringify(parsed), new Date().toISOString());
  }

  load(): ResearchLearningEvent[] {
    const rows = this.database.prepare("SELECT event_json FROM research_learning_events ORDER BY sequence ASC").all() as unknown as ResearchLearningEventRow[];
    return rows.map((row) => researchLearningEventSchema.parse(JSON.parse(row.event_json) as unknown));
  }

  transaction<T>(operation: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}
