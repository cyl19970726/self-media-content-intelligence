import { z } from "zod";

export const publishingPlatformSchema = z.enum([
  "xiaohongshu",
  "douyin",
  "wechat_channels",
  "wechat_official_account",
  "bilibili"
]);
export type PublishingPlatform = z.infer<typeof publishingPlatformSchema>;

export const publicationMediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  localPath: z.string().min(1),
  mimeType: z.string().nullable().default(null)
}).superRefine((media, context) => {
  const absolute = media.localPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(media.localPath);
  if (!absolute) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["localPath"], message: "素材必须使用绝对路径" });
  }
});
export type PublicationMedia = z.infer<typeof publicationMediaSchema>;

export const contentPackageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  brief: z.string().max(8_000),
  sourceRefs: z.array(z.string()).max(50),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ContentPackage = z.infer<typeof contentPackageSchema>;

export const xiaohongshuOptionsSchema = z.object({
  location: z.string().max(120).nullable().default(null),
  allowDownload: z.boolean().default(true),
  allowCopy: z.boolean().default(true)
});
export const douyinOptionsSchema = z.object({
  coverPath: z.string().nullable().default(null),
  declaration: z.enum(["self_made", "repost"]).default("self_made"),
  sourceUrl: z.string().url().nullable().default(null),
  location: z.string().max(120).nullable().default(null),
  allowDownload: z.boolean().default(true)
});
export const wechatChannelsOptionsSchema = z.object({
  coverPath: z.string().nullable().default(null),
  location: z.string().max(120).nullable().default(null),
  activity: z.string().max(120).nullable().default(null),
  linkUrl: z.string().url().nullable().default(null),
  original: z.boolean().default(true),
  allowDownload: z.boolean().default(true)
});
export const bilibiliOptionsSchema = z.object({
  coverPath: z.string().nullable().default(null),
  copyright: z.enum(["original", "repost"]).default("original"),
  sourceUrl: z.string().url().nullable().default(null),
  partition: z.string().trim().min(1).max(120),
  dynamicText: z.string().max(233).default(""),
  allowRepost: z.boolean().default(false)
});
export const wechatOfficialAccountOptionsSchema = z.object({
  author: z.string().max(16).default(""),
  digest: z.string().max(120).default(""),
  coverPath: z.string().nullable().default(null),
  bodyMode: z.enum(["rich_text", "one_image"]).default("rich_text"),
  original: z.boolean().default(false),
  comments: z.enum(["all", "followers", "off"]).default("all"),
  contentSourceUrl: z.string().url().nullable().default(null)
});

export const platformOptionsSchema = z.object({
  xiaohongshu: xiaohongshuOptionsSchema.optional(),
  douyin: douyinOptionsSchema.optional(),
  wechat_channels: wechatChannelsOptionsSchema.optional(),
  bilibili: bilibiliOptionsSchema.optional(),
  wechat_official_account: wechatOfficialAccountOptionsSchema.optional()
}).default({});
export type PlatformOptions = z.infer<typeof platformOptionsSchema>;

export const platformVariantSchema = z.object({
  id: z.string().uuid(),
  packageId: z.string().uuid(),
  platform: publishingPlatformSchema,
  revision: z.number().int().positive(),
  title: z.string().min(1).max(200),
  body: z.string().max(20_000),
  contentType: z.enum(["image", "video", "article"]),
  media: z.array(publicationMediaSchema).min(1).max(18),
  tags: z.array(z.string().min(1).max(80)).max(20),
  visibility: z.enum(["public", "private"]),
  scheduledAt: z.string().nullable(),
  platformOptions: platformOptionsSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type PlatformVariant = z.infer<typeof platformVariantSchema>;

export const publicationStatusSchema = z.enum([
  "draft",
  "queued_prepare",
  "preparing",
  "preview_ready",
  "queued_submit",
  "submitting",
  "verifying",
  "published",
  "draft_saved",
  "queued_cancel",
  "canceled",
  "needs_user",
  "submission_unknown",
  "superseded",
  "failed"
]);
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;

export const publicationPreviewSchema = z.object({
  url: z.string(),
  pageTitle: z.string(),
  preparedTitle: z.string(),
  preparedBody: z.string(),
  mediaCount: z.number().int().nonnegative(),
  capturedAt: z.string()
});
export type PublicationPreview = z.infer<typeof publicationPreviewSchema>;

export const publicationReceiptSchema = z.object({
  externalId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  platformState: z.string(),
  verifiedAt: z.string()
});
export type PublicationReceipt = z.infer<typeof publicationReceiptSchema>;

export const publicationRunSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
  variantRevision: z.number().int().positive(),
  variant: platformVariantSchema,
  platform: publishingPlatformSchema,
  status: publicationStatusSchema,
  currentStage: z.string(),
  browserTaskSpaceId: z.number().int().positive().nullable(),
  preview: publicationPreviewSchema.nullable(),
  approvedRevision: z.number().int().positive().nullable(),
  blockerCode: z.string().nullable(),
  blockerMessage: z.string().nullable(),
  receipt: publicationReceiptSchema.nullable(),
  attempts: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type PublicationRun = z.infer<typeof publicationRunSchema>;

export const publicationJobStatusSchema = z.enum(["queued", "leased", "running", "succeeded", "needs_user", "failed", "canceled"]);
export type PublicationJobStatus = z.infer<typeof publicationJobStatusSchema>;
export const publicationJobSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  nodeKey: z.enum(["publication.prepare", "publication.submit", "publication.cancel"]),
  status: publicationJobStatusSchema,
  idempotencyKey: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  availableAt: z.string(),
  leaseOwner: z.string().nullable(),
  leaseExpiresAt: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type PublicationJob = z.infer<typeof publicationJobSchema>;

export const publicationEventSchema = z.object({
  sequence: z.number().int().positive(),
  runId: z.string().uuid(),
  jobId: z.string().uuid().nullable(),
  type: z.string(),
  message: z.string(),
  payload: z.record(z.unknown()),
  createdAt: z.string()
});
export type PublicationEvent = z.infer<typeof publicationEventSchema>;

export const createContentPackageInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  brief: z.string().max(8_000).default(""),
  sourceRefs: z.array(z.string()).max(50).default([])
});
export type CreateContentPackageInput = z.input<typeof createContentPackageInputSchema>;

export const variantInputSchema = z.object({
  platform: publishingPlatformSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20_000).default(""),
  contentType: z.enum(["image", "video", "article"]),
  media: z.array(publicationMediaSchema).min(1).max(18),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  visibility: z.enum(["public", "private"]).default("public"),
  scheduledAt: z.string().datetime().nullable().default(null),
  platformOptions: platformOptionsSchema
});
export type VariantInput = z.input<typeof variantInputSchema>;

export const createPublicationInputSchema = z.object({ variantId: z.string().uuid() });
export const approvePublicationInputSchema = z.object({ revision: z.number().int().positive() });

export type BrowserPublicationInput = {
  runId: string;
  taskSpaceId: number | null;
  variant: PlatformVariant;
};

export type BrowserPrepareResult =
  | { state: "preview_ready"; taskSpaceId: number; preview: PublicationPreview }
  | { state: "needs_user"; taskSpaceId: number | null; code: string; message: string }
  | { state: "failed"; taskSpaceId: number | null; code: string; message: string };

export type BrowserSubmitResult =
  | { state: "published"; taskSpaceId: number; receipt: PublicationReceipt }
  | { state: "draft_saved"; taskSpaceId: number; receipt: PublicationReceipt }
  | { state: "submission_unknown"; taskSpaceId: number; code: string; message: string }
  | { state: "needs_user"; taskSpaceId: number | null; code: string; message: string }
  | { state: "failed"; taskSpaceId: number | null; code: string; message: string };

export type BrowserCancelResult =
  | { state: "canceled"; taskSpaceId: number | null; draftSaved: boolean }
  | { state: "needs_user"; taskSpaceId: number | null; code: string; message: string }
  | { state: "failed"; taskSpaceId: number | null; code: string; message: string };

export interface BrowserPublisher {
  prepare(input: BrowserPublicationInput): Promise<BrowserPrepareResult>;
  submit(input: BrowserPublicationInput & { taskSpaceId: number }): Promise<BrowserSubmitResult>;
  cancel(input: BrowserPublicationInput): Promise<BrowserCancelResult>;
}
