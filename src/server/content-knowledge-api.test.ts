import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalysisService } from "../core/service.js";
import type { CreatorResearchService } from "../modules/creator-research/service.js";
import type { ComparisonProjectService } from "../modules/comparison/service.js";
import type { LearningLoopControlPlane } from "./learning-loop.js";
import { PublishingService } from "../modules/publishing/service.js";
import { ContentKnowledgeService } from "../modules/content-knowledge/service.js";
import { knowledgeConceptViewSchema, knowledgeContributionManifestSchema } from "../modules/content-knowledge/contracts.js";
import { SQLiteContentKnowledgeRepository } from "../platform/database/sqlite-content-knowledge-repository.js";
import { SQLitePublishingRepository } from "../platform/database/sqlite-publishing-repository.js";
import { RedFoxCreatorDiscoveryService } from "../modules/creator-discovery/redfox-service.js";
import { ResearchLearningService } from "./research-learning.js";
import { createApp } from "./app.js";

const directories: string[] = [];
const servers: Server[] = [];
const closeables: Array<{ close(): void }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  closeables.splice(0).forEach((value) => value.close());
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

async function fixtureServer() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-api-"));
  directories.push(directory);
  const research = new ResearchLearningService();
  const knowledge = new ContentKnowledgeService(new SQLiteContentKnowledgeRepository(path.join(directory, "knowledge.sqlite")), research);
  const publishing = new PublishingService(new SQLitePublishingRepository(path.join(directory, "publishing.sqlite")));
  closeables.push(knowledge, publishing);
  const unused = {} as unknown;
  const app = createApp(
    unused as AnalysisService, unused as CreatorResearchService, unused as ComparisonProjectService,
    research, unused as LearningLoopControlPlane, publishing, new RedFoxCreatorDiscoveryService(), knowledge
  );
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  return `http://127.0.0.1:${address.port}`;
}

describe("content knowledge API", () => {
  it("compiles, lists, searches, and resolves lineage without duplicate ingestion", async () => {
    const base = await fixtureServer();
    const body = {
      operationKey: "compile-api-1", compilerPolicyVersion: "v1", inputFingerprint: "sha256:api-1",
      analysis: {
        analysisRevisionId: "analysis-api-1", subjectType: "video", subjectId: "video-api-1",
        creatorId: "creator-api-1", videoId: "video-api-1", deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{ concept: { slug: "api-proof", kind: "proof_mode", name: "API 证据优先", definition: "先给证据。", exclusions: ["无证据。"] },
          relation: "confirm", statement: "先给结果证据。", evidenceRefs: ["frame:api:1"], confidence: "high" }]
      }
    };
    const post = () => fetch(`${base}/api/v1/knowledge/compilations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const first = await post();
    expect(first.status).toBe(201);
    const firstValue = await first.json() as { manifest: unknown; idempotent: boolean };
    const manifest = knowledgeContributionManifestSchema.parse(firstValue.manifest);
    const secondValue = await post().then((response) => response.json()) as { manifest: unknown; idempotent: boolean };
    expect(knowledgeContributionManifestSchema.parse(secondValue.manifest).id).toBe(manifest.id);
    expect(secondValue.idempotent).toBe(true);

    const list = await fetch(`${base}/api/v1/knowledge?q=证据`).then((response) => response.json()) as { concepts: unknown[] };
    const concept = knowledgeConceptViewSchema.parse(list.concepts[0]);
    expect(concept.research.counts.confirm).toBe(1);
    const lineage = await fetch(`${base}/api/v1/knowledge/${concept.research.concept.id}/lineage`);
    expect(lineage.status).toBe(200);
    expect(await lineage.json()).toMatchObject({ conceptId: concept.research.concept.id });
  });
});
