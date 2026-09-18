import { videoResearchSchema, type VideoResearch } from "../contracts/core";
import type { PostWorkflowReading } from "../contracts/post-workflow-reading";
export type { PostWorkflowReading } from "../contracts/post-workflow-reading";

async function responseJson(response: Response): Promise<unknown> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = value && typeof value === "object" && "error" in value ? String(value.error) : "无法读取工作流报告";
    throw new Error(message);
  }
  return value;
}

export async function getPostWorkflowReading(creatorRunId: string, postId: string, workflowRunId?: string): Promise<PostWorkflowReading> {
  const query = workflowRunId ? `?workflowRunId=${encodeURIComponent(workflowRunId)}` : "";
  const url = `/api/creator-runs/${encodeURIComponent(creatorRunId)}/posts/${encodeURIComponent(postId)}/workflow-reading${query}`;
  return await responseJson(await fetch(url, { cache: "no-store" })) as PostWorkflowReading;
}

export async function getPostCandidateReader(readerHref: string): Promise<VideoResearch> {
  if (!/^\/api\/workflow-runs\/[^/?#]+\/artifacts\/[^/?#]+\/reader$/u.test(readerHref)) throw new Error("候选报告读取地址无效");
  const value = await responseJson(await fetch(readerHref, { cache: "no-store" }));
  if (!value || typeof value !== "object" || !('kind' in value) || value.kind !== "post" || !('data' in value)) {
    throw new Error("候选报告不是单帖阅读版本");
  }
  return videoResearchSchema.parse(value.data);
}
