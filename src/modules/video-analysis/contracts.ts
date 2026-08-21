import { z } from "zod";

export const videoReconstructionRequestSchema = z.object({
  runId: z.string().uuid(),
  creatorRunId: z.string().uuid(),
  postExternalId: z.string(),
  sourceUrl: z.string().url(),
  sourceMediaArtifactRef: z.string(),
  evidencePackArtifactRef: z.string().nullable(),
  contractVersion: z.literal("video-content-reconstruction@1")
});
export type VideoReconstructionRequest = z.infer<typeof videoReconstructionRequestSchema>;

export const videoReconstructionOutcomeSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("ready"),
    reconstructionArtifactRef: z.string(),
    articleArtifactRef: z.string(),
    evaluationArtifactRef: z.string(),
    gateReportArtifactRef: z.string(),
    threeLensEvaluationArtifactRef: z.string(),
    threeLensGateReportArtifactRef: z.string(),
    threeLensGateCount: z.literal(19),
    gateCount: z.number().int().positive(),
    failedGateIds: z.array(z.string()).length(0)
  }),
  z.object({
    state: z.literal("not_ready"),
    reconstructionArtifactRef: z.string().nullable(),
    evaluationArtifactRef: z.string().nullable(),
    gateReportArtifactRef: z.string().nullable(),
    threeLensEvaluationArtifactRef: z.string().nullable(),
    threeLensGateReportArtifactRef: z.string().nullable(),
    failedGateIds: z.array(z.string()).min(1),
    message: z.string()
  }),
  z.object({
    state: z.literal("blocked"),
    code: z.enum(["media_missing", "media_unverified", "runner_unavailable", "needs_user"]),
    message: z.string(),
    userActionRequired: z.boolean()
  })
]);
export type VideoReconstructionOutcome = z.infer<typeof videoReconstructionOutcomeSchema>;

export interface VideoReconstructionExecutor {
  reconstruct(request: VideoReconstructionRequest): Promise<VideoReconstructionOutcome>;
}
