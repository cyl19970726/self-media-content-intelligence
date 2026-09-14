import type { CreatorResearchBatch } from "../../../contracts/index.js";

export interface CreatorResearchBatchRepository {
  /** Returns the prior result or throws when the key exists for another command hash. */
  getByOperationKey(operationKey: string, commandHash: string): CreatorResearchBatch | null;
  /** Factory must run after reserving the operation and share the repository transaction. */
  create(batch: CreatorResearchBatch | (() => CreatorResearchBatch), operationKey: string, commandHash: string): CreatorResearchBatch;
  get(batchId: string): CreatorResearchBatch | null;
  list(limit?: number): CreatorResearchBatch[];
  close(): void;
}
