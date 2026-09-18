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
      expect(wired.definitions.post.revision).toBe("v7");
      expect(wired.definitions.creatorSynthesis.revision).toBe("v6");
      expect(wired.definitions.creatorAnalysis?.revision).toBe("v7");
      for (const [id, revisions] of Object.entries({ "post.analyze": ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
        "creator.synthesize": ["v1", "v2", "v3", "v4", "v5", "v6"], "creator.analyze": ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
        "post.review": ["v1", "v2", "v3"], "creator.review": ["v1", "v2", "v3"], "post.repair": ["v1", "v2"], "creator.repair": ["v1", "v2"] })) {
        for (const revision of revisions) expect(wired.registry.resolve(id, revision), `${id}@${revision}`).toBeDefined();
      }
      expect(wired.registry.resolve("post.analyze", "v7")).toBe(wired.definitions.post);
      expect(wired.registry.resolve("creator.synthesize", "v6")).toBe(wired.definitions.creatorSynthesis);
      // A persisted v5 parent resolves its original v2 child definition, rather than the retry-aware v3 child.
      expect(wired.registry.resolve("post.review", "v2")?.revision).toBe("v2");
    } finally { db.close(); }
  });
});
