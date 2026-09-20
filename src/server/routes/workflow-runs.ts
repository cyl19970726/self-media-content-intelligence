import { createResearchReadingService, resolveReadingRoot } from "../workflow-reading-service.js";
import type express from "express";
import type { RunStore } from "@signal-room/workflow";
import { projectCreatorWorkflowProgress, type CreatorRegisteredPostReviews, type CreatorRegisteredReview } from "../workflow-creator-progress.js";
import { projectArtifactPayload, projectWorkflowArtifact, projectWorkflowAttempt, projectWorkflowEvent, projectWorkflowHttpError, projectWorkflowRun, projectWorkflowStep } from "../workflow-public-projection.js";
import { projectWorkflowPhases } from "../workflow-phase-projection.js";
import { projectPostWorkflowReading } from "../post-workflow-reading.js";

type CreatorPostGroup = { rootRunId: string; postId: string; stageIds: string[]; state: string };

/**
 * The shared read model intentionally withholds run metadata.  A creator run
 * still needs a safe way to distinguish its per-post child research, so expose
 * only the already-public post identifier and structural ownership.
 */
async function projectCreatorPostGroups(store: RunStore, snapshot: { rootRunId: string; runs: Array<{ id: string; parentRunId?: string; workflowId: string; state: string }>; stages: Array<{ id: string; runId: string }> }): Promise<CreatorPostGroup[] | undefined> {
  const root = snapshot.runs.find((run) => run.id === snapshot.rootRunId);
  if (root?.workflowId !== "creator.analyze") return undefined;
  const records = await Promise.all(snapshot.runs.map((run) => store.getRun(run.id)));
  const postRoots = new Map<string, CreatorPostGroup>();
  for (let index = 0; index < snapshot.runs.length; index += 1) {
    const run = snapshot.runs[index]!; const record = records[index];
    const postId = record?.metadata?.postId;
    if (run.workflowId !== "post.analyze" || typeof postId !== "string" || !/^[a-zA-Z0-9._:-]{1,160}$/u.test(postId)) continue;
    postRoots.set(run.id, { rootRunId: run.id, postId, stageIds: [], state: run.state });
  }
  if (!postRoots.size) return [];
  const byId = new Map(snapshot.runs.map((run) => [run.id, run]));
  const ownerFor = (runId: string): CreatorPostGroup | undefined => {
    let current = byId.get(runId); const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const owner = postRoots.get(current.id);
      if (owner) return owner;
      current = current.parentRunId ? byId.get(current.parentRunId) : undefined;
    }
    return undefined;
  };
  for (const stage of snapshot.stages) ownerFor(stage.runId)?.stageIds.push(stage.id);
  // Parent post runs wait while their child builders execute. Surface that live
  // child state in the compact row, while retaining a terminal root state.
  for (const group of postRoots.values()) {
    const family = snapshot.runs.filter((run) => ownerFor(run.id) === group);
    const live = family.find((run) => run.state === "running")
      ?? family.find((run) => run.state === "blocked" || run.state === "needs_review")
      ?? family.find((run) => run.state === "waiting");
    if (live) group.state = live.state;
  }
  return [...postRoots.values()];
}

export interface WorkflowHttpService {
  store: RunStore;
  artifactPayload(id: string): Promise<unknown>;
  artifactReader?(runId: string, artifactId: string): Promise<unknown>;
  retry(creatorRunId: string, workflowRunId: string, stepKey: string): Promise<unknown>;
  cancel(creatorRunId: string, workflowRunId: string): Promise<unknown>;
  startPost?(creatorRunId: string, input: unknown): Promise<unknown>;
  startCreatorAnalysis?(creatorRunId: string, input: unknown): Promise<unknown>;
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
  const reading = createResearchReadingService(service.store, service.artifactPayload);
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

  app.get("/api/creator-runs/:creatorRunId/posts/:postId/workflow-reading", handler(async (request, response) => {
    const requested = typeof request.query.workflowRunId === "string" && request.query.workflowRunId.length > 0
      ? request.query.workflowRunId : undefined;
    const reading = await projectPostWorkflowReading(service.store, service.artifactPayload,
      String(request.params.creatorRunId), String(request.params.postId), requested);
    if (!reading) { response.status(404).json({ error: "未找到该单帖对应的工作流" }); return; }
    response.json(reading);
  }));

  app.get(prefix, handler(async (request, response) => {
    const creatorRunId = typeof request.query.creatorRunId === "string" ? request.query.creatorRunId : undefined;
    response.json({ runs: (await service.store.listRuns({ metadata: creatorRunId === undefined ? undefined : { creatorRunId } })).map(projectWorkflowRun) });
  }));

  const readingRoot = async (request: express.Request) => {
    const root = await resolveReadingRoot(service.store, String(request.params.id));
    const scope = typeof request.query.creatorRunId === "string" ? request.query.creatorRunId : undefined;
    return root && (!scope || root.metadata?.creatorRunId === scope) ? root : undefined;
  };
  app.get(`${prefix}/:id/reading`, handler(async (request, response) => {
    const root = await readingRoot(request);
    if (!root) { response.status(404).json({ error: "未找到本次研究" }); return; }
    const snapshot = await reading.getSnapshot({ rootRunId: root.id, selectedRunId: String(request.params.id) });
    const creatorRunId = root.metadata?.creatorRunId; const postId = root.metadata?.postId;
    const creatorPostGroups = await projectCreatorPostGroups(service.store, snapshot);
    response.json({ ...snapshot, ...(creatorPostGroups ? { creatorPostGroups } : {}), title: "本次研究", subject: {
      creatorRunId: typeof creatorRunId === "string" && /^[a-zA-Z0-9-]+$/.test(creatorRunId) ? creatorRunId : undefined,
      postId: typeof postId === "string" && /^[a-zA-Z0-9-]+$/.test(postId) ? postId : undefined
    } });
  }));
  app.get(`${prefix}/:id/reading/changes`, handler(async (request, response) => {
    const root = await readingRoot(request);
    if (!root) { response.status(404).json({ error: "未找到本次研究" }); return; }
    const changes = await reading.getChanges({ rootRunId: root.id, cursor: String(request.query.cursor ?? "") });
    if (changes.resetRequired) { response.json(changes); return; }
    const snapshot = await reading.getSnapshot({ rootRunId: root.id });
    const creatorPostGroups = await projectCreatorPostGroups(service.store, snapshot);
    response.json({ ...changes, ...(creatorPostGroups ? { creatorPostGroups } : {}) });
  }));
  app.get(`${prefix}/:id/reading/stages/:phaseId`, handler(async (request, response) => {
    const root = await readingRoot(request);
    if (!root) { response.status(404).json({ error: "未找到本次研究" }); return; }
    const limit = request.query.limit === undefined ? 25 : Number(request.query.limit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid page size");
    response.json(await reading.getStageDetails({ rootRunId: root.id, phaseId: String(request.params.phaseId),
      cursor: typeof request.query.cursor === "string" ? request.query.cursor : undefined, limit }));
  }));

  app.get(`${prefix}/:id`, handler(async (request, response) => {
    const run = await service.store.getRun(String(request.params.id));
    if (!run) { response.status(404).json({ error: "工作流不存在" }); return; }
    const [steps, artifacts, phases] = await Promise.all([service.store.listSteps(run.id), service.store.listArtifacts(run.id), projectWorkflowPhases(service.store, run)]);
    const attempts = (await Promise.all(steps.map((step) => service.store.listAttempts(step.id)))).flat();
    response.json({ run: projectWorkflowRun(run), steps: steps.map(projectWorkflowStep), attempts: attempts.map(projectWorkflowAttempt), artifacts: artifacts.map(projectWorkflowArtifact), phases: phases.map(phase => ({ ...phase, artifacts: phase.artifacts.map(binding => ({ ...binding, artifact: projectWorkflowArtifact(binding.artifact) })) })) });
  }));

  app.get(`${prefix}/:id/events`, handler(async (request, response) => {
    const id = String(request.params.id);
    if (!await service.store.getRun(id)) { response.status(404).json({ error: "工作流不存在" }); return; }
    response.json({ events: (await service.store.listEvents(id, afterCursor(request.query.after))).map(projectWorkflowEvent) });
  }));

  app.get(`${prefix}/:id/artifacts`, handler(async (request, response) => {
    const id = String(request.params.id);
    if (!await service.store.getRun(id)) { response.status(404).json({ error: "工作流不存在" }); return; }
    response.json({ artifacts: (await service.store.listArtifacts(id)).map(projectWorkflowArtifact) });
  }));

  app.get(`${prefix}/:id/artifacts/:artifactId`, handler(async (request, response) => {
    const artifact = await service.store.getArtifact(String(request.params.artifactId));
    if (!artifact || artifact.producedBy.workflowRunId !== request.params.id) {
      response.status(404).json({ error: "资产不属于该工作流" }); return;
    }
    response.json({ artifact: projectWorkflowArtifact(artifact), payload: projectArtifactPayload(artifact, await service.artifactPayload(artifact.id)) });
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
    if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)
      || typeof request.body.postExternalId !== "string") {
      response.status(400).json({ error: "请指定研究样本 postExternalId" }); return;
    }
    if (request.body.candidateMode !== undefined && request.body.candidateMode !== "rebuild" && request.body.candidateMode !== "reuse") {
      response.status(400).json({ error: "candidateMode 必须是 rebuild 或 reuse" }); return;
    }
    if (request.body.evaluationMode !== undefined && request.body.evaluationMode !== "fresh"
      && request.body.evaluationMode !== "repair_existing_invalid") {
      response.status(400).json({ error: "evaluationMode 必须是 fresh 或 repair_existing_invalid" }); return;
    }
    if (request.body.importedEvaluationArtifactRef !== undefined
      && typeof request.body.importedEvaluationArtifactRef !== "string") {
      response.status(400).json({ error: "importedEvaluationArtifactRef 必须是 artifact reference 字符串" }); return;
    }
    if (request.body.importedEvaluationArtifactRef && request.body.evaluationMode !== "repair_existing_invalid") {
      response.status(400).json({ error: "importedEvaluationArtifactRef 仅能与 repair_existing_invalid 一起使用" }); return;
    }
    response.status(202).json(await service.startPost(String(request.params.id), request.body));
  }));
  app.post("/api/creator-runs/:id/workflows/creator-analyze", handler(async (request, response) => {
    if (!service.startCreatorAnalysis) throw new Error("完整博主工作流尚未启用");
    const input = request.body === undefined ? {} : request.body;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      response.status(400).json({ error: "creator-analyze 请求体必须是对象" }); return;
    }
    if (input.candidateMode !== undefined && input.candidateMode !== "rebuild" && input.candidateMode !== "reuse") {
      response.status(400).json({ error: "candidateMode 必须是 rebuild 或 reuse" }); return;
    }
    if (input.scope !== undefined && input.scope !== "selected" && input.scope !== "available_deep") {
      response.status(400).json({ error: "scope 必须是 selected 或 available_deep" }); return;
    }
    response.status(202).json(await service.startCreatorAnalysis(String(request.params.id), input));
  }));
  app.post("/api/creator-runs/:id/workflows/synthesis", handler(async (request, response) => {
    if (!service.startSynthesis) throw new Error("综合工作流尚未启用");
    response.status(202).json(await service.startSynthesis(String(request.params.id), request.body));
  }));
}
