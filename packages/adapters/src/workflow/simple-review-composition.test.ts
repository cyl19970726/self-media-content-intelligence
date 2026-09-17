import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { CreatorArtifactStore, CreatorResearchRepository, ResearchWorkflowDefinitions } from "../../../research/index.js";
import type { WorkflowDefinitionRegistry } from "./research-workflow-executor.js";
import { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";
import { createProductionResearchWorkflow } from "./production-research-runner.js";

describe("production reviewer workflow composition", () => {
  it("selects new review definitions while preserving all durable historical revisions", () => {
    const db = new DatabaseSync(":memory:");
    try {
      const store = new SQLiteWorkflowRunStore(db);
      const executor = createProductionResearchWorkflow(db, store, {} as CreatorArtifactStore, {} as CreatorResearchRepository);
      const wired = executor as unknown as { definitions: ResearchWorkflowDefinitions; registry: WorkflowDefinitionRegistry };
      expect(wired.definitions.post.revision).toBe("v5");
      expect(wired.definitions.creatorSynthesis.revision).toBe("v4");
      expect(wired.definitions.creatorAnalysis?.revision).toBe("v5");
      for (const [id, revisions] of Object.entries({ "post.analyze": ["v1", "v2", "v3", "v4", "v5"],
        "creator.synthesize": ["v1", "v2", "v3", "v4"], "creator.analyze": ["v1", "v2", "v3", "v4", "v5"],
        "post.review": ["v1", "v2"], "creator.review": ["v1", "v2"], "post.repair": ["v1", "v2"], "creator.repair": ["v1", "v2"] })) {
        for (const revision of revisions) expect(wired.registry.resolve(id, revision), `${id}@${revision}`).toBeDefined();
      }
      expect(wired.registry.resolve("post.analyze", "v5")).toBe(wired.definitions.post);
      expect(wired.registry.resolve("creator.synthesize", "v4")).toBe(wired.definitions.creatorSynthesis);
    } finally { db.close(); }
  });
});
