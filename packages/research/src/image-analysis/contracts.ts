import { z } from "zod";
import type {
  VideoReconstructionLifecycleObserver,
  VideoReconstructionOutcome
} from "../video-analysis/contracts.js";

const imageClaimSchema = z.object({
  statement: z.string().min(1),
  factClass: z.enum(["observed", "author_claim", "inference", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()).min(1),
  caveat: z.string().nullable()
});

export const imagePostReconstructionSchema = z.object({
  schemaVersion: z.literal("image-post-reconstruction@1"),
  creatorRunId: z.string().uuid(),
  postExternalId: z.string().min(1),
  sourceUrl: z.string().url(),
  generatedAt: z.string(),
  inputs: z.object({
    detailArtifactRef: z.string().min(1),
    imageArtifactRefs: z.array(z.string().min(1)).min(1)
  }),
  contentRestoration: z.object({
    summary: z.string().min(1),
    hook: z.string().min(1),
    architecture: z.array(z.string().min(1)).min(1),
    knowledgeUnits: z.array(z.string().min(1)),
    proofModes: z.array(z.string().min(1)),
    intendedAudienceAction: z.string().min(1)
  }),
  visualSystem: z.object({
    carouselLogic: z.string().min(1),
    consistency: z.string().min(1),
    pages: z.array(z.object({
      imageArtifactRef: z.string().min(1),
      role: z.string().min(1),
      readableText: z.array(z.string()),
      composition: z.string().min(1),
      contribution: z.string().min(1)
    })).min(1)
  }),
  claims: z.array(imageClaimSchema).min(1),
  readableArticle: z.string().min(1),
  unknowns: z.array(z.string()).min(1)
});

export type ImagePostReconstruction = z.infer<typeof imagePostReconstructionSchema>;

export type ImagePostReconstructionRequest = {
  runId: string;
  creatorRunId: string;
  postExternalId: string;
  sourceUrl: string;
  detailArtifactRef: string;
  imageArtifactRefs: string[];
};

export interface ImagePostReconstructionExecutor {
  reconstruct(
    request: ImagePostReconstructionRequest,
    observeLifecycle?: VideoReconstructionLifecycleObserver
  ): Promise<VideoReconstructionOutcome>;
}
