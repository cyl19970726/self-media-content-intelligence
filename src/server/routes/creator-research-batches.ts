import type express from "express";
import { z } from "zod";
import {
  createCreatorResearchBatchInputSchema,
  type CreateCreatorResearchBatchInput,
  type CreatorResearchBatchProjection
} from "../../../packages/contracts/index.js";

export interface CreatorResearchBatchHttpService {
  create(input: CreateCreatorResearchBatchInput): CreatorResearchBatchProjection;
  get(batchId: string): CreatorResearchBatchProjection | null;
  list(limit?: number): CreatorResearchBatchProjection[];
}

function requestError(response: express.Response, error: unknown): express.Response {
  if (error instanceof z.ZodError) {
    return response.status(400).json({
      error: error.issues[0]?.message ?? "批次输入无效",
      issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
    });
  }
  const message = error instanceof Error ? error.message : "批次操作失败";
  const conflict = message.includes("idempotency conflict")
    || message.includes("references missing")
    || message.includes("冲突");
  return response.status(conflict ? 409 : 400).json({ error: message });
}

function queryLimit(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, Math.trunc(parsed))) : 50;
}

export function registerCreatorResearchBatchRoutes(
  app: express.Express,
  service: CreatorResearchBatchHttpService
): void {
  app.post("/api/v1/creator-research-batches", (request, response) => {
    try {
      const input = createCreatorResearchBatchInputSchema.parse(request.body);
      return response.status(202).json(service.create(input));
    } catch (error) {
      return requestError(response, error);
    }
  });

  app.get("/api/v1/creator-research-batches", (request, response) => {
    try {
      return response.json({ batches: service.list(queryLimit(request.query.limit)) });
    } catch (error) {
      return requestError(response, error);
    }
  });

  app.get("/api/v1/creator-research-batches/:id", (request, response) => {
    try {
      const batch = service.get(request.params.id);
      if (!batch) return response.status(404).json({ error: "博主分析批次不存在" });
      return response.json(batch);
    } catch (error) {
      return requestError(response, error);
    }
  });
}
