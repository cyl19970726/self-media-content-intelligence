import { z } from "zod";

export const workspaceStatusCountsSchema = z.record(z.string(), z.number().int().nonnegative());

export const workspaceAssetSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  statuses: workspaceStatusCountsSchema
}).strict();

export const workspaceRecentItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["post", "creator", "comparison", "learning_loop"]),
  title: z.string().min(1),
  meta: z.string(),
  status: z.string().min(1),
  updatedAt: z.string().datetime(),
  href: z.string().startsWith("/")
}).strict();

export const workspaceOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  evidence: z.object({
    manifestEntries: z.number().int().nonnegative(),
    storeConfigured: z.boolean(),
    storeReadable: z.boolean()
  }).strict(),
  assets: z.object({
    postRuns: workspaceAssetSummarySchema,
    creatorRuns: workspaceAssetSummarySchema.extend({
      discoveredPosts: z.number().int().nonnegative(),
      comparisonPosts: z.number().int().nonnegative(),
      reconstructedPosts: z.number().int().nonnegative()
    }).strict(),
    comparisons: workspaceAssetSummarySchema,
    learningLoops: workspaceAssetSummarySchema,
    knowledge: workspaceAssetSummarySchema,
    contentPackages: workspaceAssetSummarySchema,
    publications: workspaceAssetSummarySchema
  }).strict(),
  recent: z.array(workspaceRecentItemSchema)
}).strict();

export type WorkspaceOverview = z.infer<typeof workspaceOverviewSchema>;
