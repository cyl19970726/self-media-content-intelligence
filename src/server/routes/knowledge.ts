import type express from "express";
import { z } from "zod";
import type { ContentKnowledgeService } from "../../../packages/knowledge/index.js";
import type { PublishingService } from "../../../packages/creation/index.js";

function knowledgeError(response: express.Response, error: unknown): express.Response {
  const message = error instanceof z.ZodError
    ? error.issues[0]?.message ?? "知识请求无效"
    : error instanceof Error ? error.message : "知识操作失败";
  const status = message.includes("not found") || message.includes("不存在") ? 404
    : message.includes("must") || message.includes("requires") || message.includes("cannot") || message.includes("forbidden") || message.includes("冻结") ? 409 : 400;
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
  app.get("/api/v1/knowledge/lint", (_request, response) => response.json({ items: knowledge.lint() }));
  app.get("/api/v1/knowledge/invalidations", (request, response) => {
    const conceptId = typeof request.query.conceptId === "string" ? request.query.conceptId : undefined;
    return response.json({ invalidations: knowledge.listInvalidations(conceptId) });
  });
  app.post("/api/v1/knowledge/invalidations", (request, response) => {
    try { return response.status(202).json(knowledge.invalidate(request.body)); }
    catch (error) { return knowledgeError(response, error); }
  });
  app.get("/api/v1/knowledge/projection-parity", (_request, response) => response.json(knowledge.projectionParity()));
  app.post("/api/v1/knowledge/projections/rebuild", (_request, response) => {
    try { return response.json(knowledge.rebuildProjections()); }
    catch (error) { return knowledgeError(response, error); }
  });

  app.get("/api/v1/knowledge/contributions", (request, response) => {
    const subjectType = typeof request.query.subjectType === "string" ? request.query.subjectType : undefined;
    const subjectId = typeof request.query.subjectId === "string" ? request.query.subjectId : undefined;
    const analysisRevisionId = typeof request.query.analysisRevisionId === "string" ? request.query.analysisRevisionId : undefined;
    return response.json({ manifests: knowledge.listContributions(subjectType, subjectId, analysisRevisionId) });
  });

  app.get("/api/v1/knowledge/proposals", (request, response) => {
    const subjectType = typeof request.query.subjectType === "string" ? request.query.subjectType : undefined;
    const subjectId = typeof request.query.subjectId === "string" ? request.query.subjectId : undefined;
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    return response.json({ proposals: knowledge.listProposals({ subjectType, subjectId, status }) });
  });

  app.post("/api/v1/knowledge/proposals/:id/adjudicate", (request, response) => {
    try { return response.status(202).json(knowledge.adjudicateProposal(request.params.id, request.body)); }
    catch (error) { return knowledgeError(response, error); }
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
  app.post("/api/v1/knowledge/proposals", (request, response) => {
    try { return response.status(201).json(knowledge.stage(request.body)); }
    catch (error) { return knowledgeError(response, error); }
  });
  app.post("/api/v1/knowledge/legacy-manifests", (request, response) => {
    try { return response.status(201).json(knowledge.recordLegacyUnverified(request.body)); }
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

  const requireWorkingSnapshot = (packageId: string, snapshotId: string) => {
    const snapshot = publishing.getPackageSnapshot(packageId, snapshotId);
    if (!snapshot) throw new Error("内容包快照不存在");
    if (snapshot.status !== "working") throw new Error("内容包快照已经冻结，请新建决策版本");
    return snapshot;
  };

  app.get("/api/v1/content-packages/:id/snapshots/:snapshotId/knowledge-bindings", (request, response) => {
    const snapshot = publishing.getPackageSnapshot(request.params.id, request.params.snapshotId);
    if (!snapshot) return response.status(404).json({ error: "内容包快照不存在" });
    return response.json({
      snapshot,
      bindings: knowledge.listBindings(request.params.id).filter((item) => item.contentPackageSnapshotId === snapshot.id),
      hypotheses: knowledge.listHypotheses(request.params.id).filter((item) => item.contentPackageSnapshotId === snapshot.id)
    });
  });

  app.post("/api/v1/content-packages/:id/snapshots/:snapshotId/knowledge-bindings", (request, response) => {
    try {
      const snapshot = requireWorkingSnapshot(request.params.id, request.params.snapshotId);
      return response.status(201).json(knowledge.createBinding({
        ...request.body, contentPackageId: snapshot.contentPackageId, contentPackageSnapshotId: snapshot.id
      }));
    } catch (error) { return knowledgeError(response, error); }
  });

  app.post("/api/v1/content-packages/:id/snapshots/:snapshotId/hypotheses", (request, response) => {
    try {
      const snapshot = requireWorkingSnapshot(request.params.id, request.params.snapshotId);
      return response.status(201).json(knowledge.createHypothesis({
        ...request.body, contentPackageId: snapshot.contentPackageId, contentPackageSnapshotId: snapshot.id
      }));
    } catch (error) { return knowledgeError(response, error); }
  });

  app.post("/api/v1/content-packages/:id/knowledge-bindings", (request, response) => {
    try {
      const pkg = publishing.getPackage(request.params.id);
      if (!pkg) return response.status(404).json({ error: "内容包不存在" });
      requireWorkingSnapshot(pkg.package.id, String(request.body.contentPackageSnapshotId ?? ""));
      return response.status(201).json(knowledge.createBinding({ ...request.body, contentPackageId: pkg.package.id }));
    } catch (error) { return knowledgeError(response, error); }
  });

  app.post("/api/v1/content-packages/:id/hypotheses", (request, response) => {
    try {
      const pkg = publishing.getPackage(request.params.id);
      if (!pkg) return response.status(404).json({ error: "内容包不存在" });
      requireWorkingSnapshot(pkg.package.id, String(request.body.contentPackageSnapshotId ?? ""));
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
      if (!run.contentPackageSnapshotId) return response.status(409).json({ error: "旧发布任务没有可解析的内容包快照" });
      if (!["published", "draft_saved"].includes(run.status) || !run.receipt) {
        return response.status(409).json({ error: "只有已发布或已验证保存的草稿才能进入实践验证" });
      }
      if (run.variant.id !== run.variantId || run.variant.revision !== run.variantRevision
        || run.variant.contentPackageSnapshotId !== run.contentPackageSnapshotId) {
        return response.status(409).json({ error: "发布任务的平台版本 lineage 无法解析" });
      }
      const snapshot = publishing.getPackageSnapshot(run.variant.packageId, run.contentPackageSnapshotId);
      if (!snapshot || snapshot.status !== "frozen") {
        return response.status(409).json({ error: "发布任务没有可解析的冻结内容包快照" });
      }
      return response.status(201).json(knowledge.createValidation({
        ...request.body, publicationRunId: run.id, contentPackageId: run.variant.packageId,
        contentPackageSnapshotId: run.contentPackageSnapshotId, variantId: run.variantId,
        variantRevision: run.variantRevision,
        executionSnapshot: { status: run.status, receipt: run.receipt }
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
