import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { evidenceAccessProjectionSchema } from "../../packages/contracts/index.js";
import { registerEvidenceRoutes } from "./routes/evidence.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function fixtureServer() {
  const app = express();
  registerEvidenceRoutes(app, {
    resolve: async (evidenceId) => evidenceId === "known/id" ? evidenceAccessProjectionSchema.parse({
      evidenceId,
      classification: "research_evidence",
      availability: "missing",
      content: { sha256: "a".repeat(64), bytes: 12, mediaType: "image/jpeg" },
      storageUri: `cas://sha256/${"a".repeat(64)}`,
      originalPath: "artifacts/creator-research/known.jpg",
      checkedAt: "2026-08-28T00:00:00.000Z",
      reason: "object_missing"
    }) : null
  });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  return `http://127.0.0.1:${address.port}`;
}

describe("Evidence API", () => {
  it("projects explicit unavailable state and preserves unknown IDs as 404", async () => {
    const base = await fixtureServer();
    const known = await fetch(`${base}/api/v1/evidence/${encodeURIComponent("known/id")}`);
    expect(known.status).toBe(200);
    expect(evidenceAccessProjectionSchema.parse(await known.json())).toMatchObject({ availability: "missing", reason: "object_missing" });
    expect((await fetch(`${base}/api/v1/evidence/unknown`)).status).toBe(404);
  });
});
