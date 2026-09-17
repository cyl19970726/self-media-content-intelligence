import type { WorkflowArtifact, WorkflowEvent, WorkflowRunDetail, WorkflowRunRecord } from "./model/contracts";
import type { WorkflowArtifactReader } from "../../shared/contracts/workflow-reader";

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
export const getWorkflowEvents = (id: string, after = 0) => request<{ events: WorkflowEvent[] }>(`/api/workflow-runs/${encodeURIComponent(id)}/events?after=${after}`);
export const getWorkflowArtifacts = (id: string) => request<{ artifacts: WorkflowArtifact[] }>(`/api/workflow-runs/${encodeURIComponent(id)}/artifacts`);
export const getWorkflowArtifact = (id: string, artifactId: string) => request<{ artifact: WorkflowArtifact; payload: unknown }>(`/api/workflow-runs/${encodeURIComponent(id)}/artifacts/${encodeURIComponent(artifactId)}`);
export const getWorkflowArtifactReader = (id: string, artifactId: string) => request<WorkflowArtifactReader>(`/api/workflow-runs/${encodeURIComponent(id)}/artifacts/${encodeURIComponent(artifactId)}/reader`);
export const retryWorkflowStep = (id: string, key: string) => request<unknown>(`/api/workflow-runs/${encodeURIComponent(id)}/steps/${encodeURIComponent(key)}/retry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
export const cancelWorkflowRun = (id: string) => request<unknown>(`/api/workflow-runs/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
