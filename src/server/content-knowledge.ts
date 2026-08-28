import path from "node:path";
import { runtimeDir } from "../core/config.js";
import { ContentKnowledgeService, type KnowledgeResearchPort } from "../../packages/knowledge/index.js";
import { SQLiteContentKnowledgeRepository } from "../platform/database/sqlite-content-knowledge-repository.js";

export function createDurableContentKnowledgeService(
  research: KnowledgeResearchPort,
  filePath = path.join(runtimeDir(), "content-knowledge.sqlite")
): ContentKnowledgeService {
  return new ContentKnowledgeService(new SQLiteContentKnowledgeRepository(filePath), research);
}
