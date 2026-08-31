import { z } from "zod";
import {
  childWorkerLifecycleEventSchema,
  type ChildWorkerLifecycleObserver
} from "../orchestration/contracts.js";

export const videoReconstructionRequestSchema = z.object({
  runId: z.string().uuid(),
  creatorRunId: z.string().uuid(),
  postExternalId: z.string(),
  sourceUrl: z.string().url(),
  sourceMediaArtifactRef: z.string(),
  evidencePackArtifactRef: z.string().nullable(),
  evaluationPolicy: z.enum(["skip", "single_pass"]).default("skip"),
  contractVersion: z.literal("video-content-reconstruction@1")
});
export type VideoReconstructionRequest = z.infer<typeof videoReconstructionRequestSchema>;

export const videoReconstructionOutcomeSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("built_unevaluated"),
    reconstructionArtifactRef: z.string(),
    articleArtifactRef: z.string().nullable(),
    builderValidationArtifactRef: z.string(),
    evaluationMode: z.literal("skipped")
  }),
  z.object({
    state: z.literal("verified"),
    reconstructionArtifactRef: z.string(),
    articleArtifactRef: z.string().nullable(),
    builderValidationArtifactRef: z.string(),
    evaluationArtifactRef: z.string(),
    gateReportArtifactRef: z.string(),
    threeLensEvaluationArtifactRef: z.string(),
    threeLensGateReportArtifactRef: z.string(),
    threeLensGateCount: z.literal(19),
    gateCount: z.number().int().positive(),
    failedGateIds: z.array(z.string()).length(0),
    qualityWarningGateIds: z.array(z.string()),
    evaluationMode: z.literal("single_pass")
  }),
  z.object({
    state: z.literal("ready"),
    reconstructionArtifactRef: z.string(),
    articleArtifactRef: z.string(),
    builderValidationArtifactRef: z.string().optional(),
    evaluationArtifactRef: z.string(),
    gateReportArtifactRef: z.string(),
    threeLensEvaluationArtifactRef: z.string(),
    threeLensGateReportArtifactRef: z.string(),
    threeLensGateCount: z.literal(19),
    gateCount: z.number().int().positive(),
    failedGateIds: z.array(z.string()).length(0),
    qualityWarningGateIds: z.array(z.string()),
    evaluationMode: z.literal("single_pass")
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

export const videoReconstructionChildRoleSchema = z.enum([
  "candidate",
  "generic_evaluator",
  "generic_repair",
  "content_restoration_evaluator",
  "directing_logic_evaluator",
  "visual_editing_evaluator",
  "runtime_repair",
  "generic_recheck"
]);
export type VideoReconstructionChildRole = z.infer<typeof videoReconstructionChildRoleSchema>;

export const videoReconstructionLifecycleEventSchema = childWorkerLifecycleEventSchema.extend({
  role: videoReconstructionChildRoleSchema,
});
export type VideoReconstructionLifecycleEvent = z.infer<typeof videoReconstructionLifecycleEventSchema>;
export type VideoReconstructionLifecycleObserver = ChildWorkerLifecycleObserver<VideoReconstructionLifecycleEvent>;

export interface VideoReconstructionExecutor {
  reconstruct(
    request: VideoReconstructionRequest,
    observeLifecycle?: VideoReconstructionLifecycleObserver
  ): Promise<VideoReconstructionOutcome>;
}
