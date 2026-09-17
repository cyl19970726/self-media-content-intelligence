import type express from "express";
import type { RunStore } from "@signal-room/workflow";
import { projectCreatorWorkflowProgress, type CreatorRegisteredPostReviews, type CreatorRegisteredReview } from "../workflow-creator-progress.js";
import { projectArtifactPayload, projectWorkflowAttempt, projectWorkflowEvent, projectWorkflowHttpError, projectWorkflowRun, projectWorkflowStep } from "../workflow-public-projection.js";
import { projectWorkflowPhases } from "../workflow-phase-projection.js";

export interface WorkflowHttpService {
  store: RunStore;
  artifactPayload(id: string): Promise<unknown>;
  artifactReader?(runId: string, artifactId: string): Promise<unknown>;
  retry(creatorRunId: string, workflowRunId: string, stepKey: string): Promise<unknown>;
  cancel(creatorRunId: string, workflowRunId: string): Promise<unknown>;
  startPost?(creatorRunId: string, input: unknown): Promise<unknown>;
  startCreatorAnalysis?(creatorRunId: string): Promise<unknown>;
  startSynthesis?(creatorRunId: string, input: unknown): Promise<unknown>;
  registeredReview?(creatorRunId: string): CreatorRegisteredReview | null | undefined;
  registeredPostReviews?(creatorRunId: string): CreatorRegisteredPostReviews | undefined;
}

function afterCursor(value: unknown): number {
  const cursor = value === undefined ? 0 : Number(value);
  if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("Invalid event cursor");
  return cursor;
}

/** Raw prompts, command output and private trace files are never served here. */
export function registerWorkflowRoutes(app: express.Express, service: WorkflowHttpService): void {
  const prefix = "/api/workflow-runs";
  const handler = (fn: (request: express.Request, response: express.Response) => Promise<unknown>): express.RequestHandler =>
    (request, response) => { void fn(request, response).catch((error: unknown) => {
      if (response.headersSent) { response.end(); return; }
      const publicError = projectWorkflowHttpError(error);
      response.status(409).json({ error: publicError.message, errorId: publicError.errorId });
    }); };

  app.get(`${prefix}/creator-progress`, handler(async (request, response) => {
    const raw = typeof request.query.creatorRunIds === "string" ? request.query.creatorRunIds : "";
    const ids = [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0 || ids.length > 20) throw new Error("creatorRunIds 必须包含 1–20 个任务 ID");
    response.json({ items: await Promise.all(ids.map((id) => projectCreatorWorkflowProgress(service.store, id, service.registeredReview?.(id), service.registeredPostReviews?.(id)))) });
  }));

  app.get("/api/creator-runs/:id/workflow-progress", handler(async (request, response) => {
    const creatorRunId = String(request.params.id);
    response.json(await projectCreatorWorkflowProgress(service.store, creatorRunId, service.registeredReview?.(creatorRunId), service.registeredPostReviews?.(creatorRunId)));
  }));

  app.get(prefix, handler(async (request, response) => {
    const creatorRunId = typeof request.query.creatorRunId === "string" ? request.query.creatorRunId : undefined;
    response.json({ runs: (await service.store.listRuns({ metadata: creatorRunId === undefined ? undefined : { creatorRunId } })).map(projectWorkflowRun) });
  }));

  app.get(`${prefix}/:id`, handler(async (request, response) => {
    const run = await service.store.getRun(String(request.params.id));
    if (!run) { response.status(404).json({ error: "工作流不存在" }); return; }
    const [steps, artifacts, phases] = await Promise.all([service.store.listSteps(run.id), service.store.listArtifacts(run.id), projectWorkflowPhases(service.store, run)]);
    const attempts = (await Promise.all(steps.map((step) => service.store.listAttempts(step.id)))).flat();
    response.json({ run: projectWorkflowRun(run), steps: steps.map(projectWorkflowStep), attempts: attempts.map(projectWorkflowAttempt), artifacts, phases });
  }));

  app.get(`${prefix}/:id/events`, handler(async (request, response) => {
    const id = String(request.params.id);
    if (!await service.store.getRun(id)) { response.status(404).json({ error: "工作流不存在" }); return; }
    response.json({ events: (await service.store.listEvents(id, afterCursor(request.query.after))).map(projectWorkflowEvent) });
  }));

  app.get(`${prefix}/:id/artifacts`, handler(async (request, response) => {
    const id = String(request.params.id);
    if (!await service.store.getRun(id)) { response.status(404).json({ error: "工作流不存在" }); return; }
    response.json({ artifacts: await service.store.listArtifacts(id) });
  }));

  app.get(`${prefix}/:id/artifacts/:artifactId`, handler(async (request, response) => {
    const artifact = await service.store.getArtifact(String(request.params.artifactId));
    if (!artifact || artifact.producedBy.workflowRunId !== request.params.id) {
      response.status(404).json({ error: "资产不属于该工作流" }); return;
    }
    response.json({ artifact, payload: projectArtifactPayload(artifact, await service.artifactPayload(artifact.id)) });
  }));

  app.get(`${prefix}/:id/artifacts/:artifactId/reader`, handler(async (request, response) => {
    const artifact = await service.store.getArtifact(String(request.params.artifactId));
    if (!artifact || artifact.producedBy.workflowRunId !== request.params.id) {
      response.status(404).json({ error: "资产不属于该工作流" }); return;
    }
    const reader = await service.artifactReader?.(String(request.params.id), artifact.id);
    if (!reader) { response.status(404).json({ error: "该资产尚无对应阅读器" }); return; }
    response.json(reader);
  }));

  app.post(`${prefix}/:id/steps/:key/retry`, handler(async (request, response) => {
    const run = await service.store.getRun(String(request.params.id));
    if (!run) { response.status(404).json({ error: "工作流不存在" }); return; }
    const creatorRunId = run.metadata?.creatorRunId;
    if (typeof creatorRunId !== "string") throw new Error("该工作流尚未绑定研究任务");
    response.status(202).json(await service.retry(creatorRunId, run.id, String(request.params.key)));
  }));

  app.post(`${prefix}/:id/cancel`, handler(async (request, response) => {
    const run = await service.store.getRun(String(request.params.id));
    if (!run) { response.status(404).json({ error: "工作流不存在" }); return; }
    const creatorRunId = run.metadata?.creatorRunId;
    if (typeof creatorRunId !== "string") throw new Error("该工作流尚未绑定研究任务");
    response.status(202).json(await service.cancel(creatorRunId, run.id));
  }));

  app.post("/api/creator-runs/:id/workflows/post", handler(async (request, response) => {
    if (!service.startPost) throw new Error("单帖工作流尚未启用");
    response.status(202).json(await service.startPost(String(request.params.id), request.body));
  }));
  app.post("/api/creator-runs/:id/workflows/creator-analyze", handler(async (request, response) => {
    if (!service.startCreatorAnalysis) throw new Error("完整博主工作流尚未启用");
    response.status(202).json(await service.startCreatorAnalysis(String(request.params.id)));
  }));
  app.post("/api/creator-runs/:id/workflows/synthesis", handler(async (request, response) => {
    if (!service.startSynthesis) throw new Error("综合工作流尚未启用");
    response.status(202).json(await service.startSynthesis(String(request.params.id), request.body));
  }));
}
