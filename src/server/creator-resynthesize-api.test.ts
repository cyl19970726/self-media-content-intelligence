import type { Server } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import type { CreatorResearchService, ComparisonProjectService } from "../../packages/research/index.js";
import type { PublishingService } from "../../packages/creation/index.js";
import type { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import type { LearningLoopControlPlane } from "./learning-loop.js";
import type { ResearchLearningService } from "./research-learning.js";
import type { RedFoxCreatorDiscoveryService } from "../../packages/adapters/index.js";
import { createApp } from "./app.js";

const servers: Server[] = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

it("exposes the narrowly scoped creator resynthesis operation", async () => {
  const run = { id: "run-1", synthesisArtifactRef: "/old/synthesis.json", worker: { state: "queued" } };
  const resynthesize = vi.fn(() => run);
  const app = createApp({
    creatorResearch: { resynthesize } as unknown as CreatorResearchService,
    comparisons: {} as ComparisonProjectService,
    researchLearning: {} as ResearchLearningService,
    learningLoop: {} as LearningLoopControlPlane,
    publishing: {} as PublishingService,
    creatorDiscovery: {} as RedFoxCreatorDiscoveryService,
    contentKnowledge: {} as ContentKnowledgeService,
    evidence: { resolve: async () => null, list: () => ({ entries: [], total: 0, offset: 0, limit: 30,
      summary: { manifestEntries: 0, storeConfigured: false, storeReadable: false, classifications: {}, declaredAvailability: {} } }),
      summary: () => ({ manifestEntries: 0, storeConfigured: false, storeReadable: false, classifications: {}, declaredAvailability: {} }) }
  });
  const server = app.listen(0, "127.0.0.1"); servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/creator-runs/run-1/resynthesize`, { method: "POST" });
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual(run);
  expect(resynthesize).toHaveBeenCalledWith("run-1");
});
