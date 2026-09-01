import { z } from "zod";
import { creatorResearchStatusSchema } from "./schema.js";

export const creatorRunOperationActionSchema = z.enum([
  "none", "resume", "retry_failed_videos", "continue_with_media_gaps", "revalidate_synthesis"
]);

export const creatorRunAuthorityStateSchema = z.enum(["canonical", "candidate", "superseded"]);
export const creatorRunResolutionStateSchema = z.enum([
  "ready", "active", "actionable", "waiting_external", "provisional", "failed_terminal"
]);

export const creatorRunOperationSchema = z.object({
  runId: z.string().uuid(),
  creatorKey: z.string(),
  authorityState: creatorRunAuthorityStateSchema,
  resolutionState: creatorRunResolutionStateSchema,
  canonicalRunId: z.string().uuid(),
  lastGoodRunId: z.string().uuid().nullable(),
  supersededByRunId: z.string().uuid().nullable(),
  status: creatorResearchStatusSchema,
  currentStageLabel: z.string(),
  coverage: z.object({
    discovered: z.number().int().nonnegative(),
    discoveredTarget: z.number().int().nonnegative().nullable(),
    enriched: z.number().int().nonnegative(),
    enrichedTarget: z.number().int().positive(),
    compared: z.number().int().nonnegative(),
    comparedTarget: z.number().int().positive(),
    reconstructed: z.number().int().nonnegative(),
    reconstructedTarget: z.number().int().positive()
  }),
  blockerCodes: z.array(z.string()),
  failedGateIds: z.array(z.string()),
  action: creatorRunOperationActionSchema,
  actionLabel: z.string().nullable(),
  waitingReason: z.string().nullable(),
  terminal: z.boolean(),
  lastEvent: z.object({ sequence: z.number().int().positive(), message: z.string(), createdAt: z.string() }).nullable()
});

export type CreatorRunOperation = z.infer<typeof creatorRunOperationSchema>;
export type CreatorRunOperationAction = z.infer<typeof creatorRunOperationActionSchema>;
export type CreatorRunAuthorityState = z.infer<typeof creatorRunAuthorityStateSchema>;
export type CreatorRunResolutionState = z.infer<typeof creatorRunResolutionStateSchema>;
