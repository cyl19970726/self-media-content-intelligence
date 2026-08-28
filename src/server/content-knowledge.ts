import path from "node:path";
import { runtimeDir } from "../core/config.js";
import { ContentKnowledgeService } from "../modules/content-knowledge/service.js";
import { SQLiteContentKnowledgeRepository } from "../platform/database/sqlite-content-knowledge-repository.js";
import type { ResearchLearningService } from "./research-learning.js";

export function createDurableContentKnowledgeService(
  research: ResearchLearningService,
  filePath = path.join(runtimeDir(), "content-knowledge.sqlite")
): ContentKnowledgeService {
  return new ContentKnowledgeService(new SQLiteContentKnowledgeRepository(filePath), research);
}
