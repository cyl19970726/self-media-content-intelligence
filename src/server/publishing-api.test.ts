import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalysisService } from "../core/service.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import type { ComparisonProjectService } from "../../packages/research/index.js";
import { PublishingService, contentPackageSchema, platformVariantSchema, publicationRunSchema } from "../../packages/creation/index.js";
import { SQLitePublishingRepository } from "../../packages/adapters/index.js";
import type { ResearchLearningService } from "./research-learning.js";
import type { LearningLoopControlPlane } from "./learning-loop.js";
import type { RedFoxCreatorDiscoveryService } from "../../packages/adapters/index.js";
import type { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { createApp } from "./app.js";

const directories: string[] = [];
const servers: Server[] = [];
const publishingServices: PublishingService[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  publishingServices.splice(0).forEach((service) => service.close());
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

async function fixtureServer() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "publishing-api-"));
  directories.push(directory);
  const mediaPath = path.join(directory, "video.mp4");
  fs.writeFileSync(mediaPath, "fixture");
  const publishing = new PublishingService(
    new SQLitePublishingRepository(path.join(directory, "db.sqlite")),
    { exists: fs.existsSync }
  );
  publishingServices.push(publishing);
  const unused = {} as unknown;
  const app = createApp({
    analysis: unused as AnalysisService,
    creatorResearch: unused as CreatorResearchService,
    comparisons: unused as ComparisonProjectService,
    researchLearning: { list: () => [], get: () => null } as unknown as ResearchLearningService,
    learningLoop: unused as LearningLoopControlPlane,
    publishing,
    creatorDiscovery: unused as RedFoxCreatorDiscoveryService,
    contentKnowledge: unused as ContentKnowledgeService,
    evidence: { resolve: async () => null }
  });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  return { base: `http://127.0.0.1:${address.port}`, mediaPath };
}

describe("publishing API", () => {
  it("creates package, platform variant, run, and durable prepare request", async () => {
    const { base, mediaPath } = await fixtureServer();
    const post = async (route: string, body: unknown) => {
      const response = await fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { response, value: await response.json() };
    };
    const packageResponse = await post("/api/v1/content-packages", { name: "API 内容包", brief: "测试", sourceRefs: [] });
    expect(packageResponse.response.status).toBe(201);
    const contentPackage = contentPackageSchema.parse(packageResponse.value);
    const variantResponse = await post(`/api/v1/content-packages/${contentPackage.id}/variants`, {
      platform: "douyin", title: "API 发布测试", body: "正文", contentType: "video",
      media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }], tags: [], visibility: "private", scheduledAt: null,
      platformOptions: { douyin: { declaration: "self_made" } }
    });
    expect(variantResponse.response.status).toBe(201);
    const variant = platformVariantSchema.parse(variantResponse.value);
    const runResponse = await post("/api/v1/publications", { variantId: variant.id });
    expect(runResponse.response.status).toBe(201);
    const run = publicationRunSchema.parse(runResponse.value);
    const preparedResponse = await post(`/api/v1/publications/${run.id}/prepare`, {});
    expect(preparedResponse.response.status).toBe(202);
    expect(publicationRunSchema.parse(preparedResponse.value).status).toBe("queued_prepare");

    const events = await fetch(`${base}/api/v1/publications/${run.id}/events`).then((response) => response.json()) as { events: unknown[] };
    expect(events.events).toHaveLength(2);
    const invalidApproval = await post(`/api/v1/publications/${run.id}/approve`, { revision: 1 });
    expect(invalidApproval.response.status).toBe(409);
  });

  it("rejects relative media paths at the API boundary", async () => {
    const { base } = await fixtureServer();
    const contentPackage = contentPackageSchema.parse(await fetch(`${base}/api/v1/content-packages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "校验", brief: "", sourceRefs: [] })
    }).then((response) => response.json()));
    const response = await fetch(`${base}/api/v1/content-packages/${contentPackage.id}/variants`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        platform: "douyin", title: "路径错误", body: "", contentType: "video",
        media: [{ kind: "video", localPath: "relative.mp4", mimeType: "video/mp4" }], tags: [], visibility: "private", scheduledAt: null
      })
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "素材必须使用绝对路径" });
  });
});
