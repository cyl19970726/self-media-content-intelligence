import { creatorResearchBatchProjectionSchema, type CreateCreatorResearchBatchInput, type CreatorResearchBatchProjection } from "../contracts/core";

async function parseJson<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = value && typeof value === "object" && "error" in value ? String(value.error) : "批次请求失败";
    throw new Error(message);
  }
  return parse(value);
}

export async function createCreatorResearchBatch(input: Omit<CreateCreatorResearchBatchInput, "operationKey">): Promise<CreatorResearchBatchProjection> {
  return parseJson(await fetch("/api/v1/creator-research-batches", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, operationKey: crypto.randomUUID() })
  }), (value) => creatorResearchBatchProjectionSchema.parse(value));
}

export async function listCreatorResearchBatches(limit = 20): Promise<CreatorResearchBatchProjection[]> {
  return parseJson(await fetch(`/api/v1/creator-research-batches?limit=${limit}`, { cache: "no-store" }), (value) => {
    const batches = value && typeof value === "object" && "batches" in value ? value.batches : [];
    return creatorResearchBatchProjectionSchema.array().parse(batches);
  });
}

export async function getCreatorResearchBatch(id: string): Promise<CreatorResearchBatchProjection> {
  return parseJson(await fetch(`/api/v1/creator-research-batches/${encodeURIComponent(id)}`, { cache: "no-store" }),
    (value) => creatorResearchBatchProjectionSchema.parse(value));
}
