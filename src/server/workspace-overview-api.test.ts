import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { workspaceOverviewSchema } from "../../packages/contracts/index.js";
import type { AnalysisService } from "../core/service.js";
import type { CreatorResearchService, ComparisonProjectService } from "../../packages/research/index.js";
import type { PublishingService } from "../../packages/creation/index.js";
import type { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import type { LearningLoopControlPlane } from "./learning-loop.js";
import type { ResearchLearningService } from "./research-learning.js";
import type { RedFoxCreatorDiscoveryService } from "../../packages/adapters/index.js";
import { createApp } from "./app.js";

const servers: Server[] = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

describe("workspace overview API", () => {
  it("projects authoritative asset counts and Evidence health", async () => {
    const now = "2026-08-30T12:00:00.000Z";
    const app = createApp({
      analysis: { list: () => [{ id: "post-1", title: "证据化单帖", platform: "xiaohongshu", authorName: "研究者", status: "complete", updatedAt: now }] } as unknown as AnalysisService,
      creatorResearch: { list: () => [{ id: "creator-run-1", creatorId: "creator-1", creatorName: "博主一", status: "ready", updatedAt: now,
        coverage: { discoveredPosts: 30, comparisonPosts: 21, reconstructedPosts: 12 } }] } as unknown as CreatorResearchService,
      comparisons: { list: () => [{ id: "comparison-1", name: "比较一", status: "ready", updatedAt: now, members: [{}, {}] }] } as unknown as ComparisonProjectService,
      researchLearning: { list: () => [], get: () => null } as unknown as ResearchLearningService,
      learningLoop: { list: () => [{ id: "loop-1", policyVersion: "policy-v1", targetCreatorIds: ["creator-1"], status: "draft", updatedAt: now }] } as unknown as LearningLoopControlPlane,
      publishing: { listPackages: () => [], listRuns: () => [] } as unknown as PublishingService,
      creatorDiscovery: {} as RedFoxCreatorDiscoveryService,
      contentKnowledge: { listKnowledge: () => [] } as unknown as ContentKnowledgeService,
      evidence: {
        resolve: async () => null,
        list: () => ({ entries: [], total: 22622, offset: 0, limit: 30, summary: { manifestEntries: 22622, storeConfigured: true, storeReadable: true, classifications: { research_evidence: 22622 }, declaredAvailability: { available: 22622 } } }),
        summary: () => ({ manifestEntries: 22622, storeConfigured: true, storeReadable: true, classifications: { research_evidence: 22622 }, declaredAvailability: { available: 22622 } })
      }
    });
    const server = app.listen(0, "127.0.0.1");
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server has no port");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/workspace-overview`);
    expect(response.status).toBe(200);
    const overview = workspaceOverviewSchema.parse(await response.json());
    expect(overview.assets.creatorRuns).toMatchObject({ total: 1, discoveredPosts: 30, comparisonPosts: 21, reconstructedPosts: 12 });
    expect(overview.evidence).toEqual({ manifestEntries: 22622, storeConfigured: true, storeReadable: true });
    expect(overview.recent.map((item) => item.kind)).toEqual(expect.arrayContaining(["post", "creator", "comparison", "learning_loop"]));
  });
});
