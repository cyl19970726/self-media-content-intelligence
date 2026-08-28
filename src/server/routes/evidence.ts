import type { Express } from "express";
import type { EvidenceAccessPort } from "../../../packages/contracts/index.js";

export function registerEvidenceRoutes(app: Express, evidence: EvidenceAccessPort): void {
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
