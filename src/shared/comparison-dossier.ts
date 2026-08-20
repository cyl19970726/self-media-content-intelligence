import { z } from "zod";
import { researchStatementSchema } from "./creator-dossier.js";

const comparisonCellSchema = z.object({
  creatorId: z.string(), creatorName: z.string(), statements: z.array(researchStatementSchema)
});

export const comparisonDossierSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string(), name: z.string(), status: z.enum(["queued", "running", "ready", "failed"]), generatedAt: z.string(),
  scope: z.object({
    platform: z.string(), windowLabel: z.string(), memberCount: z.number().int().nonnegative(),
    comparability: z.enum(["aligned", "partial", "blocked"]), warnings: z.array(z.string())
  }),
  members: z.array(z.object({
    creatorId: z.string(), creatorRunId: z.string(), name: z.string(), href: z.string(),
    postCount: z.number().int().nonnegative(), coverageRate: z.number(), medianLikes: z.number().nullable(), meanLikes: z.number().nullable(), maxLikes: z.number().nullable(),
    meanMedianMultiple: z.number().nullable(), maxMedianMultiple: z.number().nullable(),
    selectedCounts: z.object({ high: z.number().int(), base: z.number().int(), low: z.number().int() }),
    positioning: researchStatementSchema, values: z.array(researchStatementSchema), lifecycle: researchStatementSchema
  })),
  matrices: z.object({ values: z.array(comparisonCellSchema), topics: z.array(comparisonCellSchema), formats: z.array(comparisonCellSchema) }),
  tiers: z.array(z.object({ id: z.enum(["high", "base", "low"]), label: z.string(), cells: z.array(comparisonCellSchema) })).length(3),
  dimensions: z.object({
    structure: z.array(comparisonCellSchema), audience: z.array(comparisonCellSchema), rhythm: z.array(comparisonCellSchema), business: z.array(comparisonCellSchema)
  }),
  ledger: z.array(z.object({
    classification: z.enum(["track_wide", "creator_specific", "conditional", "anomaly", "unknown"]),
    statement: z.string(), boundary: z.string(), creatorHrefs: z.array(z.string())
  })),
  limitations: z.array(z.string())
});

export type ComparisonDossier = z.infer<typeof comparisonDossierSchema>;
