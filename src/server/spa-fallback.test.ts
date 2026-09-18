import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import express from "express";
import { afterEach, expect, it } from "vitest";
import { registerSpaFallback } from "./app.js";

const roots: string[] = [];
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

it("serves SPA deep links beneath a hidden ancestor without exposing hidden client files", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spa-fallback-"));
  roots.push(root);
  const clientDirectory = path.join(root, ".codex", "worktrees", "test", "dist");
  fs.mkdirSync(clientDirectory, { recursive: true });
  fs.writeFileSync(path.join(clientDirectory, "index.html"), "<main>SPA entry</main>");
  fs.writeFileSync(path.join(clientDirectory, ".private"), "private contents");

  const app = express();
  app.get("/api/health", (_request, response) => response.json({ ok: true }));
  registerSpaFallback(app, clientDirectory);
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  const base = `http://127.0.0.1:${address.port}`;

  const deepLink = await fetch(`${base}/creators/example/videos/one`);
  expect(deepLink.status).toBe(200);
  expect(await deepLink.text()).toBe("<main>SPA entry</main>");
  expect(deepLink.headers.get("cache-control")).toBe("no-cache");

  const api = await fetch(`${base}/api/health`);
  expect(api.status).toBe(200);
  expect(await api.json()).toEqual({ ok: true });
  const hidden = await fetch(`${base}/.private`);
  expect(await hidden.text()).not.toContain("private contents");
});
