import type { Express } from "express";
import type { EvidenceAccessPort } from "../../../packages/contracts/index.js";

export function registerEvidenceRoutes(app: Express, evidence: EvidenceAccessPort): void {
  app.get("/api/v1/evidence", (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q : undefined;
    const classification = ["research_evidence", "fixture", "example"].includes(String(request.query.classification))
      ? request.query.classification as "research_evidence" | "fixture" | "example" : undefined;
    const offset = Number(request.query.offset ?? 0);
    const limit = Number(request.query.limit ?? 30);
    return response.json(evidence.list({ query, classification,
      offset: Number.isFinite(offset) ? offset : 0, limit: Number.isFinite(limit) ? limit : 30 }));
  });

  app.get("/api/v1/evidence/:evidenceId", async (request, response, next) => {
    try {
      const projection = await evidence.resolve(request.params.evidenceId);
      if (!projection) return response.status(404).json({ error: "Evidence manifest entry does not exist" });
      return response.json(projection);
    } catch (error) {
      next(error);
      return undefined;
    }
  });
}
