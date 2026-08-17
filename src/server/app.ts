import fs from "node:fs";
import express from "express";
import path from "node:path";
import { z } from "zod";
import { AnalysisService } from "../core/service.js";
import { projectRoot, runtimeDir } from "../core/config.js";
import { createRunInputSchema } from "../shared/schema.js";

export function createApp(service = new AnalysisService()) {
  const app = express();
  const clientDirectory = path.join(projectRoot, "dist");
  app.use(express.json({ limit: "1mb" }));
  app.use("/artifacts", express.static(path.join(runtimeDir(), "runs"), {
    fallthrough: false,
    immutable: true,
    maxAge: "1h"
  }));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/runs", (request, response) => {
    const limit = Math.min(200, Math.max(1, Number(request.query.limit ?? 100)));
    response.json({ runs: service.list(limit) });
  });

  app.get("/api/runs/:id", (request, response) => {
    const report = service.get(request.params.id);
    if (!report) return response.status(404).json({ error: "分析任务不存在" });
    return response.json(report);
  });

  app.post("/api/runs", (request, response) => {
    try {
      const input = createRunInputSchema.parse(request.body);
      const report = service.create(input.url);
      response.status(202).json(report);
      void service.run(report.id, input.localVideoPath);
    } catch (error) {
      const message = error instanceof z.ZodError
        ? error.issues[0]?.message ?? "输入无效"
        : error instanceof Error ? error.message : "无法创建分析";
      response.status(400).json({ error: message });
    }
  });

  app.post("/api/runs/:id/retry", (request, response) => {
    const report = service.get(request.params.id);
    if (!report) return response.status(404).json({ error: "分析任务不存在" });
    if (report.status === "running") return response.status(409).json({ error: "任务仍在运行" });
    response.status(202).json(report);
    void service.run(report.id, typeof request.body?.localVideoPath === "string" ? request.body.localVideoPath : undefined);
    return undefined;
  });

  if (fs.existsSync(path.join(clientDirectory, "index.html"))) {
    app.use(express.static(clientDirectory));
    app.use((request, response, next) => {
      if (request.method === "GET" && !request.path.startsWith("/api") && !request.path.startsWith("/artifacts")) {
        return response.sendFile(path.join(clientDirectory, "index.html"));
      }
      return next();
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    void _next;
    const message = error instanceof Error ? error.message : "服务异常";
    response.status(500).json({ error: message });
  });
  return app;
}
