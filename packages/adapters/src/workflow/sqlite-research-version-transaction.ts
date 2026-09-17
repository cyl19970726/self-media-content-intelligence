import type { DatabaseSync } from "node:sqlite";
import type { ResearchVersionRegistrationTransaction } from "../../../research/index.js";

/** Keeps source checks, latest-batch merge and run-pointer update in one SQLite write transaction. */
export class SQLiteResearchVersionRegistrationTransaction implements ResearchVersionRegistrationTransaction {
  constructor(private readonly database: DatabaseSync) {}

  run<T>(_creatorRunId: string, operation: () => T): T {
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
}
