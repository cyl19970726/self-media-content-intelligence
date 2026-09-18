export async function startFreshPostWorkflow(creatorRunId: string, postExternalId: string): Promise<{ workflowRunId: string }> {
  const response = await fetch(`/api/creator-runs/${encodeURIComponent(creatorRunId)}/workflows/post`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postExternalId, evaluationMode: "fresh" })
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const body = value && typeof value === "object" ? value as Record<string, unknown> : undefined;
    const message = body && "error" in body ? String(body.error) : "工作流请求失败";
    const errorId = body && typeof body.errorId === "string" ? body.errorId : null;
    throw new Error(errorId ? `${message}（诊断编号 ${errorId}）` : message);
  }
  return value as { workflowRunId: string };
}
