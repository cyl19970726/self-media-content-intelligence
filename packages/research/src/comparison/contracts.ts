import { z } from "zod";
import { creatorPortfolioAnalysisSchema, creatorSelectionSchema } from "../portfolio/contracts.js";

export const comparisonMemberInputSchema = z.object({
  creatorRunId: z.string().min(1),
  creatorId: z.string().min(1),
  sourceRunId: z.string().min(1),
  revision: z.string().min(1),
  creatorName: z.string(),
  portfolioRevision: z.string(),
  analysis: creatorPortfolioAnalysisSchema,
  selection: creatorSelectionSchema
});
export type ComparisonMemberInput = z.infer<typeof comparisonMemberInputSchema>;

export const creatorComparisonSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  generatedAt: z.string(),
  readiness: z.enum(["portfolio_only", "content_validated"]),
  members: z.array(z.object({
    creatorRunId: z.string().min(1),
    creatorId: z.string().min(1),
    sourceRunId: z.string().min(1),
    revision: z.string().min(1),
    creatorName: z.string(),
    portfolioRevision: z.string(),
    discoveredPosts: z.number().int(),
    likesCoverage: z.number(),
    medianLikes: z.number().nullable(),
    meanLikes: z.number().nullable(),
    maxLikes: z.number().nullable(),
    headToMedianRatio: z.number().nullable(),
    meanToMedianRatio: z.number().nullable(),
    selectedCounts: z.object({ high: z.number().int(), base: z.number().int(), low: z.number().int() })
  })),
  observations: z.array(z.object({
    classification: z.enum(["track_wide", "creator_specific", "conditional", "anomaly", "unknown"]),
    text: z.string(),
    evidenceCreatorRunIds: z.array(z.string().min(1)),
    boundary: z.string()
  })),
  limitations: z.array(z.string())
});
export type CreatorComparison = z.infer<typeof creatorComparisonSchema>;
