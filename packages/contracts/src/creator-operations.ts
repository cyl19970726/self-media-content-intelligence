import { z } from "zod";
import { creatorResearchStatusSchema } from "./schema.js";

export const creatorRunOperationActionSchema = z.enum([
  "none", "resume", "retry_failed_videos", "continue_with_media_gaps", "revalidate_synthesis"
]);

export const creatorRunOperationSchema = z.object({
  runId: z.string().uuid(),
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
