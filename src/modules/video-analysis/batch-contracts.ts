import { z } from "zod";

export const videoBatchItemSchema = z.object({
  postExternalId: z.string(),
  tier: z.enum(["high", "base", "low"]),
  tierRank: z.number().int().positive(),
  state: z.enum(["queued", "running", "ready", "not_ready", "blocked"]),
  sourceMediaArtifactRef: z.string().nullable(),
  reconstructionArtifactRef: z.string().nullable(),
  articleArtifactRef: z.string().nullable(),
  evaluationArtifactRef: z.string().nullable(),
  gateReportArtifactRef: z.string().nullable(),
  failedGateIds: z.array(z.string()),
  message: z.string(),
  updatedAt: z.string()
});

export const videoReconstructionBatchSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  creatorRunId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  generatedAt: z.string(),
  requestedPosts: z.number().int().nonnegative(),
  readyPosts: z.number().int().nonnegative(),
  pendingPosts: z.number().int().nonnegative(),
  failedPosts: z.number().int().nonnegative(),
  items: z.array(videoBatchItemSchema),
  limitations: z.array(z.string())
});

export type VideoReconstructionBatch = z.infer<typeof videoReconstructionBatchSchema>;
