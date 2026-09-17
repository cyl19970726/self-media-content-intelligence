export type CreatorWorkflowProgress = {
  creatorRunId: string;
  posts: Array<{ postId: string; workflowRunId: string; state: string; currentNode: string | null; built: boolean; reviewed: boolean }>;
  counts: { total: number; queued: number; running: number; built: number; reviewed: number; revised: number; needsReview: number; failed: number; canceled: number };
  activeSlots: number;
  synthesis: { state: string; workflowRunId: string; currentNode: string | null;
    terminalStatus?: "original_reviewed" | "revised_unverified" | "review_incomplete" } | null;
};

async function responseJson(response: Response): Promise<unknown> {
  const value = await response.json() as unknown;
  if (!response.ok) throw new Error(value && typeof value === "object" && "error" in value ? String(value.error) : "无法读取 Workflow 进度");
  return value;
}

export async function getCreatorWorkflowProgress(id: string): Promise<CreatorWorkflowProgress> {
  return await responseJson(await fetch(`/api/creator-runs/${encodeURIComponent(id)}/workflow-progress`, { cache: "no-store" })) as CreatorWorkflowProgress;
}

export async function getCreatorWorkflowProgressBatch(ids: string[]): Promise<Map<string, CreatorWorkflowProgress>> {
  if (!ids.length) return new Map();
  const chunks = Array.from({ length: Math.ceil(ids.length / 20) }, (_, index) => ids.slice(index * 20, index * 20 + 20));
  const values = await Promise.all(chunks.map(async (chunk) => await responseJson(await fetch(
    `/api/workflow-runs/creator-progress?creatorRunIds=${encodeURIComponent(chunk.join(","))}`, { cache: "no-store" }
  )) as { items: CreatorWorkflowProgress[] }));
  return new Map(values.flatMap((value) => value.items).map((item) => [item.creatorRunId, item]));
}
