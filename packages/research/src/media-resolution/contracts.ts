import { z } from "zod";

export const deepMediaManifestSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().uuid(),
  generatedAt: z.string(),
  requestedPosts: z.number().int().nonnegative(),
  readyPosts: z.number().int().nonnegative(),
  requestedCovers: z.number().int().nonnegative(),
  readyCovers: z.number().int().nonnegative(),
  items: z.array(z.object({
    externalId: z.string(),
    videoRequested: z.boolean(),
    state: z.enum(["not_requested", "verified_complete", "missing", "download_failed", "verification_failed"]),
    coverState: z.enum(["ready", "missing", "download_failed"]),
    coverMessage: z.string(),
    videoArtifactRef: z.string().nullable(),
    verificationArtifactRef: z.string().nullable().optional(),
    coverArtifactRef: z.string().nullable(),
    imageRequested: z.boolean().optional(),
    imageState: z.enum(["not_requested", "ready", "partial", "missing", "download_failed"]).optional(),
    imageArtifactRefs: z.array(z.string()).optional(),
    imageMessage: z.string().optional(),
    sha256: z.string().nullable(),
    bytes: z.number().int().nonnegative().nullable(),
    durationSeconds: z.number().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    hasAudio: z.boolean().nullable(),
    message: z.string()
  })),
  unknowns: z.array(z.string())
});
export type DeepMediaManifest = z.infer<typeof deepMediaManifestSchema>;

export interface DeepMediaResolver {
  resolve(input: {
    runId: string;
    posts: Array<{ externalId: string; videoCandidateUrl: string | null; coverCandidateUrl: string | null;
      imageCandidateUrls?: string[]; downloadVideo: boolean; downloadImages?: boolean }>;
  }): Promise<DeepMediaManifest>;
}
