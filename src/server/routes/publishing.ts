import type express from "express";
import { z } from "zod";
import type { PublishingService } from "../../../packages/creation/index.js";
import {
  approvePublicationInputSchema,
  createContentPackageInputSchema,
  createPublicationInputSchema,
  variantInputSchema
} from "../../../packages/creation/index.js";

function publishingError(response: express.Response, error: unknown): express.Response {
  const message = error instanceof z.ZodError
    ? error.issues[0]?.message ?? "输入无效"
    : error instanceof Error ? error.message : "发布操作失败";
  const status = message.includes("不存在") ? 404
    : message.includes("不能") || message.includes("不一致") || message.includes("变化") || message.includes("冻结") ? 409 : 400;
  return response.status(status).json({ error: message });
}

export function registerPublishingRoutes(app: express.Express, service: PublishingService): void {
  app.get("/api/v1/content-packages", (request, response) => {
    const limit = Math.min(200, Math.max(1, Number(request.query.limit ?? 100)));
    return response.json({ packages: service.listPackages(limit) });
  });

  app.post("/api/v1/content-packages", (request, response) => {
    try { return response.status(201).json(service.createPackage(createContentPackageInputSchema.parse(request.body))); }
    catch (error) { return publishingError(response, error); }
  });

  app.get("/api/v1/content-packages/:id", (request, response) => {
    const value = service.getPackage(request.params.id);
    return value ? response.json(value) : response.status(404).json({ error: "内容包不存在" });
  });

  app.get("/api/v1/content-packages/:id/snapshots", (request, response) => {
    try { return response.json({ snapshots: service.listPackageSnapshots(request.params.id) }); }
    catch (error) { return publishingError(response, error); }
  });

  app.post("/api/v1/content-packages/:id/snapshots", (request, response) => {
    try { return response.status(201).json(service.createWorkingSnapshot(request.params.id)); }
    catch (error) { return publishingError(response, error); }
  });

  app.post("/api/v1/content-packages/:id/variants", (request, response) => {
    try { return response.status(201).json(service.createVariant(request.params.id, variantInputSchema.parse(request.body))); }
    catch (error) { return publishingError(response, error); }
  });

  app.put("/api/v1/content-variants/:id", (request, response) => {
    try { return response.json(service.updateVariant(request.params.id, variantInputSchema.parse(request.body))); }
    catch (error) { return publishingError(response, error); }
  });

  app.get("/api/v1/publications", (request, response) => {
    const limit = Math.min(200, Math.max(1, Number(request.query.limit ?? 100)));
    return response.json({ publications: service.listRuns(limit) });
  });

  app.post("/api/v1/publications", (request, response) => {
    try {
      const input = createPublicationInputSchema.parse(request.body);
      return response.status(201).json(service.createRun(input.variantId));
    } catch (error) { return publishingError(response, error); }
  });

  app.get("/api/v1/publications/:id", (request, response) => {
    const value = service.getRun(request.params.id);
    return value ? response.json(value) : response.status(404).json({ error: "发布任务不存在" });
  });

  app.get("/api/v1/publications/:id/events", (request, response) => {
    const value = service.getRun(request.params.id);
    if (!value) return response.status(404).json({ error: "发布任务不存在" });
    const after = Math.max(0, Number(request.query.after ?? 0));
    return response.json({ events: service.events(value.id, Number.isFinite(after) ? after : 0) });
  });

  app.post("/api/v1/publications/:id/prepare", (request, response) => {
    try { return response.status(202).json(service.prepare(request.params.id)); }
    catch (error) { return publishingError(response, error); }
  });

  app.post("/api/v1/publications/:id/approve", (request, response) => {
    try {
      const input = approvePublicationInputSchema.parse(request.body);
      return response.status(202).json(service.approve(request.params.id, input.revision));
    } catch (error) { return publishingError(response, error); }
  });

  app.post("/api/v1/publications/:id/cancel", (request, response) => {
    try { return response.status(202).json(service.cancel(request.params.id)); }
    catch (error) { return publishingError(response, error); }
  });

  app.post("/api/v1/publications/:id/resume", (request, response) => {
    try { return response.status(202).json(service.resume(request.params.id)); }
    catch (error) { return publishingError(response, error); }
  });
}
