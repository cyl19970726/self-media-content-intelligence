import type { WorkflowArtifact, WorkflowEvent, WorkflowRunDetail, WorkflowRunRecord } from "./model/contracts";
import type { WorkflowArtifactReader } from "../../shared/contracts/workflow-reader";
import type { StageDetails, WorkflowChanges, WorkflowSnapshot } from "@signal-room/workflow-read-model/contracts";

export type WorkflowReading = WorkflowSnapshot & { selectedRunId: string; subject?: { creatorRunId?: string; postId?: string }; title?: string };
export function mergeWorkflowReading(previous: WorkflowReading, delta: Extract<WorkflowChanges, { resetRequired: false }>): WorkflowReading {
  const merge = <T>(before: T[], updates: T[], removed: string[], key: (item: T) => string): T[] => {
    const values = new Map(before.map((item) => [key(item), item]));
    for (const id of removed) values.delete(id);
    for (const item of updates) values.set(key(item), item);
    return [...values.values()];
  };
  return {
    ...previous, ...delta.changed, cursor: delta.cursor,
    runs: merge(previous.runs, delta.changed.runs, delta.removed.runs, (run) => run.id),
    stages: merge(previous.stages, delta.changed.stages, delta.removed.stages, (stage) => stage.id),
    calls: merge(previous.calls, delta.changed.calls, delta.removed.calls, (call) => call.id),
    artifacts: merge(previous.artifacts, delta.changed.artifacts, delta.removed.artifacts, (asset) => asset.identity.id),
    selectedRunId: previous.selectedRunId, subject: previous.subject, title: previous.title,
  };
}
export function appendWorkflowStageDetails(previous: StageDetails, page: StageDetails): StageDetails {
  if (previous.phaseId !== page.phaseId) throw new Error("阶段分页游标与当前阶段不匹配");
  return {
    ...page,
    calls: [...new Map([...previous.calls, ...page.calls].map((call) => [call.id, call])).values()],
    artifacts: [...new Map([...previous.artifacts, ...page.artifacts].map((asset) => [asset.identity.id, asset])).values()],
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  const value: unknown = await response.json();
  if (!response.ok) {
    const body = value && typeof value === "object" ? value as Record<string, unknown> : undefined;
    const message = body && "error" in body ? String(body.error) : "工作流请求失败";
    const errorId = body && typeof body.errorId === "string" ? body.errorId : null;
    throw new Error(errorId ? `${message}（诊断编号 ${errorId}）` : message);
  }
  return value as T;
}

export async function listWorkflowRuns(creatorRunId?: string): Promise<WorkflowRunRecord[]> {
  const query = creatorRunId ? `?creatorRunId=${encodeURIComponent(creatorRunId)}` : "";
  return (await request<{ runs: WorkflowRunRecord[] }>(`/api/workflow-runs${query}`)).runs;
}
export const getWorkflowRun = (id: string) => request<WorkflowRunDetail>(`/api/workflow-runs/${encodeURIComponent(id)}`);
export const getWorkflowReading = (id: string) => request<WorkflowReading>(`/api/workflow-runs/${encodeURIComponent(id)}/reading`);
export const getWorkflowReadingChanges = (id: string, cursor: string) => request<WorkflowChanges>(`/api/workflow-runs/${encodeURIComponent(id)}/reading/changes?cursor=${encodeURIComponent(cursor)}`);
export const getWorkflowStageDetails = (id: string, phaseId: string, cursor?: string) => request<StageDetails>(`/api/workflow-runs/${encodeURIComponent(id)}/reading/stages/${encodeURIComponent(phaseId)}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
export const getWorkflowEvents = (id: string, after = 0) => request<{ events: WorkflowEvent[] }>(`/api/workflow-runs/${encodeURIComponent(id)}/events?after=${after}`);
export const getWorkflowArtifacts = (id: string) => request<{ artifacts: WorkflowArtifact[] }>(`/api/workflow-runs/${encodeURIComponent(id)}/artifacts`);
export const getWorkflowArtifact = (id: string, artifactId: string) => request<{ artifact: WorkflowArtifact; payload: unknown }>(`/api/workflow-runs/${encodeURIComponent(id)}/artifacts/${encodeURIComponent(artifactId)}`);
export const getWorkflowArtifactReader = (id: string, artifactId: string) => request<WorkflowArtifactReader>(`/api/workflow-runs/${encodeURIComponent(id)}/artifacts/${encodeURIComponent(artifactId)}/reader`);
export const retryWorkflowStep = (id: string, key: string) => request<unknown>(`/api/workflow-runs/${encodeURIComponent(id)}/steps/${encodeURIComponent(key)}/retry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
export const cancelWorkflowRun = (id: string) => request<unknown>(`/api/workflow-runs/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
