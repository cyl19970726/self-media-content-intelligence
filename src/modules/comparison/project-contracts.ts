import { z } from "zod";

export const createComparisonProjectInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  creatorRunIds: z.array(z.string().uuid()).min(2).max(12).refine((ids) => new Set(ids).size === ids.length, "博主任务不能重复")
});

export const comparisonProjectSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(["queued", "running", "ready", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(z.object({
    creatorRunId: z.string().uuid(),
    creatorName: z.string(),
    portfolioArtifactRef: z.string(),
    selectionArtifactRef: z.string(),
    pinnedAt: z.string()
  })).min(2),
  inputArtifactRef: z.string(),
  comparisonArtifactRef: z.string().nullable(),
  job: z.object({
    state: z.enum(["queued", "running", "succeeded", "failed"]),
    attempt: z.number().int().nonnegative(),
    leaseOwner: z.string().nullable(),
    leaseExpiresAt: z.string().nullable(),
    lastHeartbeatAt: z.string().nullable()
  }),
  error: z.string().nullable()
});

export type ComparisonProject = z.infer<typeof comparisonProjectSchema>;
export type CreateComparisonProjectInput = z.infer<typeof createComparisonProjectInputSchema>;
