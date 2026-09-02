import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CreatorResearchBatchProjection } from "../../packages/contracts/index.js";
import {
  registerCreatorResearchBatchRoutes,
  type CreatorResearchBatchHttpService
} from "./routes/creator-research-batches.js";

const servers: Server[] = [];
const batchId = "00000000-0000-4000-8000-000000000001";
const runId = "00000000-0000-4000-8000-000000000002";

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) =>
    new Promise<void>((resolve) => server.close(() => resolve()))));
});

function projection(): CreatorResearchBatchProjection {
  return {
    batch: {
      schemaVersion: "creator-research-batch@1",
      id: batchId,
      name: "AI 博主首批分析",
      runIds: [runId],
      createdAt: "2026-08-31T00:00:00.000Z"
    },
    status: "queued",
    counts: {
      queued: 1, preflight: 0, collecting: 0, needsUser: 0, backoff: 0,
      reviewable: 0, ready: 0, failed: 0, stale: 0
    },
    totalRuns: 1,
    completedRuns: 0,
    successfulRuns: 0,
    progressPercent: 0,
    dossierReadyRuns: 0,
    wikiReadyRuns: 0,
    dossierProgressPercent: 0,
    items: [{
      position: 1,
      runId,
      profileUrl: "https://www.xiaohongshu.com/user/profile/example",
      adapter: "redfox",
      creatorName: null,
      status: "queued",
      maturity: "incomplete",
      currentStage: "preflight",
      coverage: { discoveredPosts: 0, enrichedPosts: 0, comparisonPosts: 0, reconstructedPosts: 0 },
      blockerCodes: [],
      nextAction: "等待采集",
      dashboardPath: null,
      updatedAt: "2026-08-31T00:00:00.000Z"
    }],
    updatedAt: "2026-08-31T00:00:00.000Z"
  };
}

async function fixtureServer(overrides: Partial<CreatorResearchBatchHttpService> = {}) {
  const value = projection();
  const service: CreatorResearchBatchHttpService = {
    create: vi.fn(() => value),
    get: vi.fn((id: string) => id === batchId ? value : null),
    list: vi.fn(() => [value]),
    ...overrides
  };
  const app = express();
  app.use(express.json());
  registerCreatorResearchBatchRoutes(app, service);
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  return { baseUrl: `http://127.0.0.1:${address.port}`, service };
}

describe("creator research batch API", () => {
  it("creates one batch for a bounded list of creator URLs", async () => {
    const { baseUrl, service } = await fixtureServer();
    const body = {
      operationKey: "batch:create:one",
      name: "AI 博主首批分析",
      creators: [
        { profileUrl: "https://www.xiaohongshu.com/user/profile/a", adapter: "redfox" },
        { profileUrl: "https://www.xiaohongshu.com/user/profile/b" }
      ]
    };
    const response = await fetch(`${baseUrl}/api/v1/creator-research-batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ batch: { id: batchId }, totalRuns: 1 });
    expect(service.create).toHaveBeenCalledWith({
      ...body,
      creators: [body.creators[0], { ...body.creators[1], adapter: "redfox" }]
    });
  });

  it("lists batches with a bounded limit and gets one batch", async () => {
    const { baseUrl, service } = await fixtureServer();
    const listResponse = await fetch(`${baseUrl}/api/v1/creator-research-batches?limit=999`);
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject({ batches: [{ batch: { id: batchId } }] });
    expect(service.list).toHaveBeenCalledWith(100);

    const itemResponse = await fetch(`${baseUrl}/api/v1/creator-research-batches/${batchId}`);
    expect(itemResponse.status).toBe(200);
    expect(await itemResponse.json()).toMatchObject({ batch: { id: batchId } });
    expect((await fetch(`${baseUrl}/api/v1/creator-research-batches/missing`)).status).toBe(404);
  });

  it("returns 400 for invalid input and 409 for an idempotency conflict", async () => {
    const { baseUrl } = await fixtureServer({
      create: () => { throw new Error("idempotency conflict for operation batch:create:one"); }
    });
    const invalid = await fetch(`${baseUrl}/api/v1/creator-research-batches`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationKey: "invalid", creators: [] })
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ issues: [{ path: ["creators"], message: expect.any(String) }] });

    const conflict = await fetch(`${baseUrl}/api/v1/creator-research-batches`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationKey: "batch:create:one",
        creators: [{ profileUrl: "https://www.xiaohongshu.com/user/profile/a", adapter: "redfox" }]
      })
    });
    expect(conflict.status).toBe(409);
  });
});
