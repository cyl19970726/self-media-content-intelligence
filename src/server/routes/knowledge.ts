import type express from "express";
import { z } from "zod";
import type { ContentKnowledgeService } from "../../modules/content-knowledge/service.js";
import type { PublishingService } from "../../modules/publishing/service.js";

function knowledgeError(response: express.Response, error: unknown): express.Response {
  const message = error instanceof z.ZodError
    ? error.issues[0]?.message ?? "知识请求无效"
    : error instanceof Error ? error.message : "知识操作失败";
  const status = message.includes("not found") || message.includes("不存在") ? 404
    : message.includes("must") || message.includes("requires") || message.includes("cannot") || message.includes("forbidden") ? 409 : 400;
  return response.status(status).json({ error: message });
}

export function registerKnowledgeRoutes(
  app: express.Express,
  knowledge: ContentKnowledgeService,
  publishing: PublishingService
): void {
  const listKnowledge: express.RequestHandler = (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q : undefined;
    const scope = typeof request.query.scope === "string" ? request.query.scope : undefined;
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    return response.json({ concepts: knowledge.listKnowledge({ query, scope, status }) });
  };
  app.get("/api/v1/knowledge", listKnowledge);
  app.get("/api/v1/knowledge/search", listKnowledge);
  app.get("/api/v1/knowledge/gaps", (_request, response) => response.json({ gaps: knowledge.gaps() }));

  app.get("/api/v1/knowledge/contributions", (request, response) => {
    const subjectType = typeof request.query.subjectType === "string" ? request.query.subjectType : undefined;
    const subjectId = typeof request.query.subjectId === "string" ? request.query.subjectId : undefined;
    const analysisRevisionId = typeof request.query.analysisRevisionId === "string" ? request.query.analysisRevisionId : undefined;
    return response.json({ manifests: knowledge.listContributions(subjectType, subjectId, analysisRevisionId) });
  });

  app.get("/api/v1/knowledge/:conceptId", (request, response) => {
    const value = knowledge.getKnowledge(request.params.conceptId);
    return value ? response.json(value) : response.status(404).json({ error: "知识概念不存在" });
  });

  app.get("/api/v1/knowledge/:conceptId/lineage", (request, response) => {
    const value = knowledge.getKnowledge(request.params.conceptId);
    if (!value) return response.status(404).json({ error: "知识概念不存在" });
    return response.json({ conceptId: request.params.conceptId, observations: value.research.observations, edges: value.edges, bindings: value.bindings });
  });

  app.post("/api/v1/knowledge/compilations", (request, response) => {
    try { return response.status(201).json(knowledge.compile(request.body)); }
    catch (error) { return knowledgeError(response, error); }
  });

  app.post("/api/v1/knowledge/edges/adjudications", (request, response) => {
    try { return response.status(201).json(knowledge.adjudicateEdge(request.body)); }
    catch (error) { return knowledgeError(response, error); }
  });

  app.get("/api/v1/content-packages/:id/knowledge-bindings", (request, response) => {
    if (!publishing.getPackage(request.params.id)) return response.status(404).json({ error: "内容包不存在" });
    return response.json({ bindings: knowledge.listBindings(request.params.id), hypotheses: knowledge.listHypotheses(request.params.id) });
  });

  app.post("/api/v1/content-packages/:id/knowledge-bindings", (request, response) => {
    try {
      const pkg = publishing.getPackage(request.params.id);
      if (!pkg) return response.status(404).json({ error: "内容包不存在" });
      return response.status(201).json(knowledge.createBinding({ ...request.body, contentPackageId: pkg.package.id }));
    } catch (error) { return knowledgeError(response, error); }
  });

  app.post("/api/v1/content-packages/:id/hypotheses", (request, response) => {
    try {
      const pkg = publishing.getPackage(request.params.id);
      if (!pkg) return response.status(404).json({ error: "内容包不存在" });
      return response.status(201).json(knowledge.createHypothesis({ ...request.body, contentPackageId: pkg.package.id }));
    } catch (error) { return knowledgeError(response, error); }
  });

  app.get("/api/v1/practice-validations/:id", (request, response) => {
    const value = knowledge.getValidation(request.params.id);
    return value ? response.json(value) : response.status(404).json({ error: "实践验证不存在" });
  });

  app.post("/api/v1/publications/:id/practice-validations", (request, response) => {
    try {
      const run = publishing.getRun(request.params.id);
      if (!run) return response.status(404).json({ error: "发布任务不存在" });
      return response.status(201).json(knowledge.createValidation({
        ...request.body, publicationRunId: run.id, variantRevision: run.variantRevision
      }));
    } catch (error) { return knowledgeError(response, error); }
  });

  app.get("/api/v1/publications/:id/practice-validations", (request, response) => {
    if (!publishing.getRun(request.params.id)) return response.status(404).json({ error: "发布任务不存在" });
    return response.json({ validations: knowledge.listValidations(request.params.id) });
  });

  app.post("/api/v1/practice-validations/:id/submit", (request, response) => {
    try { return response.status(202).json(knowledge.submitValidation(request.params.id, request.body)); }
    catch (error) { return knowledgeError(response, error); }
  });

  app.post("/api/v1/practice-validations/:id/adjudicate", (request, response) => {
    try { return response.status(202).json(knowledge.adjudicateValidation(request.params.id, request.body)); }
    catch (error) { return knowledgeError(response, error); }
  });
}
