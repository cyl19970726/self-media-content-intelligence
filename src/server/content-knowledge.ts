import fs from "node:fs";
import path from "node:path";
import { runtimeDir, SQLiteContentKnowledgeRepository, SQLiteResearchLearningEventStore } from "../../packages/adapters/index.js";
import { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";

export function createDurableKnowledgeSystem(
  filePath = path.join(runtimeDir(), "content-knowledge.sqlite"),
  legacyResearchPath = path.join(runtimeDir(), "research-learning.sqlite")
): { researchLearning: ResearchLearningService; contentKnowledge: ContentKnowledgeService } {
  const repository = new SQLiteContentKnowledgeRepository(filePath);
  if (repository.load().length === 0 && fs.existsSync(legacyResearchPath) && path.resolve(filePath) !== path.resolve(legacyResearchPath)) {
    const legacy = new SQLiteResearchLearningEventStore(legacyResearchPath);
    try {
      repository.transaction(() => { for (const event of legacy.load()) repository.append(event); });
    } finally {
      legacy.close();
    }
  }
  const researchLearning = new ResearchLearningService(undefined, undefined, repository);
  const contentKnowledge = new ContentKnowledgeService(repository, researchLearning);
  contentKnowledge.syncProjection();
  return { researchLearning, contentKnowledge };
}
