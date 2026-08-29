import { z } from "zod";
import { creatorPortfolioAnalysisSchema, creatorSelectionSchema } from "../portfolio/contracts.js";
import { creatorSynthesisGateSchema, creatorSynthesisSchema } from "../creator-synthesis/contracts.js";

export const comparisonMemberInputSchema = z.object({
  creatorRunId: z.string().min(1),
  creatorId: z.string().min(1),
  sourceRunId: z.string().min(1),
  revision: z.string().min(1),
  creatorName: z.string(),
  portfolioRevision: z.string(),
  analysis: creatorPortfolioAnalysisSchema,
  selection: creatorSelectionSchema,
  synthesis: creatorSynthesisSchema.nullable().default(null),
  synthesisGate: creatorSynthesisGateSchema.nullable().default(null)
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
  contentPatterns: z.array(z.object({
    role: z.string().min(1),
    classification: z.enum(["conditional", "track_wide"]),
    statement: z.string().min(1),
    boundary: z.string().min(1),
    creatorIds: z.array(z.string().min(1)).min(2),
    condition: z.object({ format: z.string().min(1).nullable().default(null) }),
    support: z.array(z.object({
      creatorRunId: z.string().min(1), creatorId: z.string().min(1), creatorName: z.string().min(1),
      postExternalId: z.string().min(1), tier: z.enum(["high", "base", "low"]),
      evidenceStatus: z.enum(["deep_validated", "surface_only"]),
      contentForm: z.array(z.string().min(1)).min(1), evidenceRefs: z.array(z.string().min(1)).min(1)
    })).min(6)
  })).default([]),
  exceptions: z.array(z.object({ creatorId: z.string().min(1), role: z.string().min(1), reason: z.string().min(1) })).default([]),
  gaps: z.array(z.string().min(1)).default([]),
  limitations: z.array(z.string())
});
export type CreatorComparison = z.infer<typeof creatorComparisonSchema>;

export type ComparisonResearchCompletion = {
  comparisonProjectId: string;
  comparisonArtifactRef: string;
  sourceArtifactRefs: string[];
  comparison: CreatorComparison;
};

export interface ComparisonResearchCompletionPort {
  publish(completion: Readonly<ComparisonResearchCompletion>): void;
}
