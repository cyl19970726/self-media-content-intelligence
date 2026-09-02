import type express from "express";
import type { KnowledgeActivationService } from "../knowledge-activation.js";

export function registerKnowledgeActivationRoutes(app: express.Express, activation: KnowledgeActivationService): void {
  app.get("/api/v1/knowledge/activation-plan", (_request, response) => response.json(activation.plan()));
  app.post("/api/v1/knowledge/activation-stage", (_request, response) => {
    const result = activation.stageReady();
    return response.status(result.failed.length ? 207 : 201).json(result);
  });
}
