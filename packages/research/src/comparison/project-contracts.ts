import { z } from "zod";

/**
 * A source is deliberately more explicit than a run ID.  Some of our most
 * valuable dossiers pre-date Creator Research Runs; those are immutable legacy
 * projections, not missing data or invented runs.
 */
export const comparisonCreatorSourceSchema = z.object({
  creatorId: z.string().trim().min(1).max(160),
  sourceRunId: z.string().trim().min(1).max(240),
  revision: z.string().trim().min(1).max(500)
});
export type ComparisonCreatorSource = z.infer<typeof comparisonCreatorSourceSchema>;

export const createComparisonProjectInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  creatorSources: z.array(comparisonCreatorSourceSchema).min(2).max(12)
    .refine((sources) => new Set(sources.map((source) => source.creatorId)).size === sources.length, "同一博主只能固定一个版本")
}).strict();

// Existing local projects may have been created before source provenance was
// introduced. Keep them readable; new writes always contain the explicit
// fields below. Their fallback revision is visibly a legacy compatibility tag,
// never a claim that an old project was version-pinned correctly.
const comparisonMemberSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return value;
  const member = value as Record<string, unknown>;
  const creatorRunId = typeof member.creatorRunId === "string" ? member.creatorRunId : "";
  return {
    ...member,
    creatorId: member.creatorId ?? creatorRunId,
    sourceRunId: member.sourceRunId ?? creatorRunId,
    revision: member.revision ?? "legacy-project-without-explicit-revision"
  };
}, z.object({
  /** Stable comparison member key; a legacy projection has no physical run. */
  creatorRunId: z.string().min(1),
  creatorId: z.string().min(1),
  sourceRunId: z.string().min(1),
  revision: z.string().min(1),
  creatorName: z.string(),
  portfolioArtifactRef: z.string(),
  selectionArtifactRef: z.string(),
  pinnedAt: z.string()
}));

export const comparisonProjectSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(["queued", "running", "ready", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(comparisonMemberSchema).min(2),
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
