import path from "node:path";
import { runtimeDir, SQLiteContentKnowledgeRepository } from "../../packages/adapters/index.js";
import { ContentKnowledgeService, type KnowledgeResearchPort } from "../../packages/knowledge/index.js";

export function createDurableContentKnowledgeService(
  research: KnowledgeResearchPort,
  filePath = path.join(runtimeDir(), "content-knowledge.sqlite")
): ContentKnowledgeService {
  return new ContentKnowledgeService(new SQLiteContentKnowledgeRepository(filePath), research);
}
