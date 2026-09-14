import { evidenceAccessProjectionSchema, evidenceCatalogPageSchema, type EvidenceAccessProjection, type EvidenceCatalogPage } from "../contracts/core";
import { json } from "./http";

export async function getEvidenceAccess(evidenceId: string): Promise<EvidenceAccessProjection> {
  return json(await fetch(`/api/v1/evidence/${encodeURIComponent(evidenceId)}`, { cache: "no-store" }),
    (value) => evidenceAccessProjectionSchema.parse(value));
}

export async function listEvidenceCatalog(input: { q?: string; classification?: string; offset?: number; limit?: number } = {}): Promise<EvidenceCatalogPage> {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  if (input.classification) query.set("classification", input.classification);
  if (input.offset) query.set("offset", String(input.offset));
  if (input.limit) query.set("limit", String(input.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return json(await fetch(`/api/v1/evidence${suffix}`, { cache: "no-store" }), (value) => evidenceCatalogPageSchema.parse(value));
}
