import { z } from "zod";

export const creatorDetailCollectionSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().uuid(),
  generatedAt: z.string(),
  sourceSelectionArtifactRef: z.string(),
  requestedPosts: z.number().int().nonnegative(),
  inspectedPosts: z.number().int().nonnegative(),
  posts: z.array(z.object({
    externalId: z.string(),
    finalUrl: z.string().url(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    publishedLabel: z.string().nullable(),
    mediaType: z.enum(["video", "image", "unknown"]),
    inspectedAt: z.string(),
    warnings: z.array(z.string())
  })),
  warnings: z.array(z.string()),
  unknowns: z.array(z.string())
});
export type CreatorDetailCollection = z.infer<typeof creatorDetailCollectionSchema>;
