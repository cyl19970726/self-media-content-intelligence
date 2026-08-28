import path from "node:path";
import { runtimeDir, SQLiteResearchLearningEventStore } from "../../packages/adapters/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";

export * from "../../packages/research/index.js";

export function createDurableResearchLearningService(
  filePath = path.join(runtimeDir(), "research-learning.sqlite")
): ResearchLearningService {
  return new ResearchLearningService(undefined, undefined, new SQLiteResearchLearningEventStore(filePath));
}
