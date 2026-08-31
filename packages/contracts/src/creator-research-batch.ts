import { z } from "zod";
import {
  createCreatorResearchRunInputSchema,
  creatorAcquisitionAdapterSchema,
  creatorResearchStageIdSchema,
  creatorResearchStatusSchema
} from "./schema.js";

export const creatorResearchBatchItemInputSchema = z.object({
  profileUrl: createCreatorResearchRunInputSchema.shape.profileUrl.transform((value) => {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  }),
  adapter: creatorAcquisitionAdapterSchema.default("redfox")
});

export const createCreatorResearchBatchInputSchema = z.object({
  operationKey: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(100).default("博主分析批次"),
  creators: z.array(creatorResearchBatchItemInputSchema).min(1).max(20)
}).superRefine((input, context) => {
  const seen = new Set<string>();
  input.creators.forEach((creator, index) => {
    const identity = creator.profileUrl;
    if (seen.has(identity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creators", index, "profileUrl"],
        message: "同一批次不能重复添加同一个博主"
      });
    }
    seen.add(identity);
  });
});

export const creatorResearchBatchSchema = z.object({
  schemaVersion: z.literal("creator-research-batch@1"),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  runIds: z.array(z.string().uuid()).min(1).max(20).superRefine((runIds, context) => {
    if (new Set(runIds).size !== runIds.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "batch runIds must be unique" });
    }
  }),
  createdAt: z.string()
});

export const creatorResearchBatchStatusSchema = z.enum([
  "queued",
  "running",
  "needs_user",
  "reviewable",
  "ready",
  "partial",
  "failed",
  "stale"
]);

export const creatorResearchBatchCountsSchema = z.object({
  queued: z.number().int().nonnegative(),
  preflight: z.number().int().nonnegative(),
  collecting: z.number().int().nonnegative(),
  needsUser: z.number().int().nonnegative(),
  backoff: z.number().int().nonnegative(),
  reviewable: z.number().int().nonnegative(),
  ready: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  stale: z.number().int().nonnegative()
});

export const creatorResearchBatchItemProjectionSchema = z.object({
  position: z.number().int().min(1).max(20),
  runId: z.string().uuid(),
  profileUrl: z.string().url(),
  adapter: creatorAcquisitionAdapterSchema,
  creatorName: z.string().nullable(),
  status: creatorResearchStatusSchema,
  currentStage: creatorResearchStageIdSchema,
  coverage: z.object({
    discoveredPosts: z.number().int().nonnegative(),
    enrichedPosts: z.number().int().nonnegative(),
    comparisonPosts: z.number().int().nonnegative(),
    reconstructedPosts: z.number().int().nonnegative()
  }),
  blockerCodes: z.array(z.string()),
  nextAction: z.string(),
  dashboardPath: z.string().nullable(),
  updatedAt: z.string()
});

export const creatorResearchBatchProjectionSchema = z.object({
  batch: creatorResearchBatchSchema,
  status: creatorResearchBatchStatusSchema,
  counts: creatorResearchBatchCountsSchema,
  totalRuns: z.number().int().min(1).max(20),
  completedRuns: z.number().int().nonnegative(),
  successfulRuns: z.number().int().nonnegative(),
  progressPercent: z.number().int().min(0).max(100),
  items: z.array(creatorResearchBatchItemProjectionSchema).min(1).max(20),
  updatedAt: z.string()
});

export type CreatorResearchBatchItemInput = z.infer<typeof creatorResearchBatchItemInputSchema>;
export type CreateCreatorResearchBatchInput = z.input<typeof createCreatorResearchBatchInputSchema>;
export type ParsedCreateCreatorResearchBatchInput = z.output<typeof createCreatorResearchBatchInputSchema>;
export type CreatorResearchBatch = z.infer<typeof creatorResearchBatchSchema>;
export type CreatorResearchBatchStatus = z.infer<typeof creatorResearchBatchStatusSchema>;
export type CreatorResearchBatchCounts = z.infer<typeof creatorResearchBatchCountsSchema>;
export type CreatorResearchBatchItemProjection = z.infer<typeof creatorResearchBatchItemProjectionSchema>;
export type CreatorResearchBatchProjection = z.infer<typeof creatorResearchBatchProjectionSchema>;
