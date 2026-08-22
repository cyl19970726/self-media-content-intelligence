import { z } from "zod";

export const creatorPipelineStageIdSchema = z.enum([
  "run_contract",
  "identity_verification",
  "inventory_acquisition",
  "detail_enrichment",
  "portfolio_annotation",
  "corpus_statistics",
  "sample_selection",
  "media_verification",
  "video_reconstruction",
  "video_evaluation",
  "creator_synthesis",
  "creator_evaluation",
  "dashboard_projection"
]);

export const creatorPipelineStateSchema = z.enum([
  "pending", "running", "partial", "complete", "blocked", "failed", "stale"
]);

export const creatorPipelineGateStateSchema = z.enum([
  "not_checked", "running", "passed", "partial", "failed", "blocked"
]);

export const creatorPipelineStageSchema = z.object({
  id: creatorPipelineStageIdSchema,
  label: z.string(),
  skillId: z.string().nullable(),
  workerKind: z.string(),
  state: creatorPipelineStateSchema,
  gateState: creatorPipelineGateStateSchema,
  artifactRefs: z.array(z.string()),
  missingInputs: z.array(z.string()),
  message: z.string(),
  nextAction: z.string().nullable(),
  dashboardSections: z.array(z.string())
});

export const creatorResearchPipelineSchema = z.object({
  schemaVersion: z.literal("creator-research-pipeline@1"),
  ready: z.boolean(),
  state: z.enum(["running", "partial", "ready", "blocked", "failed", "stale"]),
  currentStageId: creatorPipelineStageIdSchema,
  completedStages: z.number().int().nonnegative(),
  totalStages: z.number().int().positive(),
  stages: z.array(creatorPipelineStageSchema).length(13)
});

export type CreatorPipelineStageId = z.infer<typeof creatorPipelineStageIdSchema>;
export type CreatorPipelineStage = z.infer<typeof creatorPipelineStageSchema>;
export type CreatorResearchPipeline = z.infer<typeof creatorResearchPipelineSchema>;
