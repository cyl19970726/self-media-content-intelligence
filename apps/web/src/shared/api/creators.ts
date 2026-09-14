import { creatorResearchRunSchema, creatorRunOperationSchema, creatorSummarySchema, type CreatorAcquisitionAdapter, type CreatorResearchRun, type CreatorRunOperation, type CreatorRunOperationAction, type CreatorSummary } from "../contracts/core";
import { creatorDossierSchema, type CreatorDossier } from "../contracts/core";
import { videoResearchSchema, type VideoResearch } from "../contracts/core";
import { json } from "./http";

export async function listCreators(): Promise<CreatorSummary[]> {
  return json(await fetch("/api/creators", { cache: "no-store" }), (value) => {
    const creators = value && typeof value === "object" && "creators" in value ? value.creators : [];
    return creatorSummarySchema.array().parse(creators);
  });
}

export async function listCreatorResearchRuns(): Promise<CreatorResearchRun[]> {
  return json(await fetch("/api/creator-runs", { cache: "no-store" }), (value) => {
    const runs = value && typeof value === "object" && "runs" in value ? value.runs : [];
    return creatorResearchRunSchema.array().parse(runs);
  });
}

export async function listCreatorRunOperations(): Promise<CreatorRunOperation[]> {
  return json(await fetch("/api/creator-run-operations", { cache: "no-store" }), (value) => {
    const operations = value && typeof value === "object" && "operations" in value ? value.operations : [];
    return creatorRunOperationSchema.array().parse(operations);
  });
}

export async function runCreatorOperation(id: string, action: CreatorRunOperationAction): Promise<CreatorResearchRun> {
  const paths: Record<Exclude<CreatorRunOperationAction, "none">, string> = {
    resume: "resume",
    retry_failed_videos: "retry-failed-videos",
    continue_with_media_gaps: "continue-with-media-gaps",
    revalidate_synthesis: "revalidate-synthesis"
  };
  if (action === "none") throw new Error("当前任务没有可执行的恢复动作");
  return json(await fetch(`/api/creator-runs/${id}/${paths[action]}`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}"
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function createCreatorResearchRun(
  profileUrl: string,
  adapter: CreatorAcquisitionAdapter = "ego-browser"
): Promise<CreatorResearchRun> {
  return json(await fetch("/api/creator-runs", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileUrl, adapter })
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function getCreatorDossier(id: string): Promise<CreatorDossier> {
  return json(await fetch(`/api/v1/creators/${encodeURIComponent(id)}`, { cache: "no-store" }),
    (value) => creatorDossierSchema.parse(value));
}

export async function getVideoResearch(creatorId: string, videoId: string, runId?: string): Promise<VideoResearch> {
  const query = runId ? `?run=${encodeURIComponent(runId)}` : "";
  return json(await fetch(`/api/v1/creators/${encodeURIComponent(creatorId)}/videos/${encodeURIComponent(videoId)}${query}`, { cache: "no-store" }),
    (value) => videoResearchSchema.parse(value));
}
