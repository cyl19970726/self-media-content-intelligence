import type express from "express";
import { z } from "zod";
import {
  addLearningLoopArtifactInputSchema,
  addLearningLoopCasesInputSchema,
  adjudicateLearningLoopInputSchema,
  beginLearningLoopBlindInputSchema,
  beginLearningLoopRegressionInputSchema,
  createLearningLoopInputSchema,
  moveLearningLoopInputSchema,
  recordLearningLoopBlindResultInputSchema,
  recordLearningLoopDiagnosisInputSchema,
  recordLearningLoopLensGateInputSchema,
  recordLearningLoopRegressionInputSchema,
  stopLearningLoopInputSchema,
  type LearningLoopControlPlane
} from "../learning-loop.js";

function learningLoopError(response: express.Response, error: unknown): express.Response {
  const message = error instanceof z.ZodError
    ? error.issues[0]?.message ?? "输入无效"
    : error instanceof Error ? error.message : "学习循环操作失败";
  const status = message.includes("not found") || message.includes("不存在")
    ? 404
    : message.includes("cannot") || message.includes("required") || message.includes("missing") ? 409 : 400;
  return response.status(status).json({ error: message });
}

export function registerLearningLoopRoutes(app: express.Express, controlPlane: LearningLoopControlPlane): void {
  app.get("/api/v1/learning-loops", (request, response) => {
    const rawLimit = Number(request.query.limit ?? 50);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.trunc(rawLimit))) : 50;
    return response.json({ runs: controlPlane.list(limit) });
  });

  app.get("/api/v1/learning-loops/:id", (request, response) => {
    const run = controlPlane.get(request.params.id);
    if (!run) return response.status(404).json({ error: "学习循环不存在" });
    return response.json(run);
  });

  app.get("/api/v1/learning-loops/:id/events", (request, response) => {
    if (!controlPlane.get(request.params.id)) return response.status(404).json({ error: "学习循环不存在" });
    return response.json({ events: controlPlane.events(request.params.id) });
  });

  app.get("/api/v1/learning-loops/:id/gates", (request, response) => {
    const run = controlPlane.get(request.params.id);
    if (!run) return response.status(404).json({ error: "学习循环不存在" });
    return response.json({ gates: run.gates });
  });

  app.get("/api/v1/learning-loops/:id/lineage", (request, response) => {
    const lineage = controlPlane.lineage(request.params.id);
    if (!lineage) return response.status(404).json({ error: "学习循环不存在" });
    return response.json(lineage);
  });

  const mutation = <T,>(schema: z.ZodType<T>, action: (input: T) => unknown): express.RequestHandler =>
    (request, response) => {
      try { return response.status(202).json(action(schema.parse(request.body))); }
      catch (error) { return learningLoopError(response, error); }
    };

  app.post("/api/v1/learning-loops", mutation(createLearningLoopInputSchema,
    (input) => controlPlane.service.create(input)));

  // These handlers expose bounded orchestration commands. The Dashboard remains read-only.
  app.post("/api/v1/learning-loops/:id/artifacts", (request, response) => {
    try {
      const input = addLearningLoopArtifactInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.addArtifact(request.params.id, input.operationKey, input.artifact));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/cases", (request, response) => {
    try {
      const input = addLearningLoopCasesInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.addCases(request.params.id, input.operationKey, input.cases));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/move", (request, response) => {
    try {
      const input = moveLearningLoopInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.move(request.params.id, input.operationKey, input.target));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/blind-traces", (request, response) => {
    try {
      const input = beginLearningLoopBlindInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.beginBlindTesting(request.params.id, input.operationKey, input.traces));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/lens-gates", (request, response) => {
    try {
      const input = recordLearningLoopLensGateInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.recordLensGate(request.params.id, input.operationKey, input.gate));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/blind-results", (request, response) => {
    try {
      const input = recordLearningLoopBlindResultInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.recordBlindResults(request.params.id, input.operationKey, input.updates));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/stop", (request, response) => {
    try {
      const input = stopLearningLoopInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.stop(request.params.id, input.operationKey, input.status, input.reason));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/diagnoses", (request, response) => {
    try {
      const input = recordLearningLoopDiagnosisInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.recordDiagnosis(request.params.id, input.operationKey, input.diagnosis));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/regression/begin", (request, response) => {
    try {
      const input = beginLearningLoopRegressionInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.beginRegression(request.params.id, input.operationKey));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/regressions", (request, response) => {
    try {
      const input = recordLearningLoopRegressionInputSchema.parse(request.body);
      return response.status(202).json(controlPlane.service.recordRegression(request.params.id, input.operationKey, input.regression, input.gates));
    } catch (error) { return learningLoopError(response, error); }
  });
  app.post("/api/v1/learning-loops/:id/adjudications", (request, response) => {
    try {
      const input = adjudicateLearningLoopInputSchema.parse(request.body);
      const decisions = input.decisions.map((decision) => ({ ...decision, eligible: decision.decision === "promote" }));
      return response.status(202).json(controlPlane.service.adjudicate(request.params.id, input.operationKey, decisions));
    } catch (error) { return learningLoopError(response, error); }
  });
}
