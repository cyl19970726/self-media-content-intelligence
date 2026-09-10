import { z } from "zod";

const builderSourcePath = z.string().regex(/^\/builderLenses\/.+/u)
  .refine((value) => !/~(?![01])/u.test(value), "Invalid JSON pointer escape");

/** A separately generated downstream synthesis; never a replacement for Builder lenses. */
export const reportOverviewSchema = z.object({
  schemaVersion: z.literal("report-overview@1"),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  generatedAt: z.string().datetime(),
  model: z.string().trim().min(1),
  reasoningEffort: z.string().trim().min(1),
  status: z.enum(["ready", "unknown", "failed"]),
  error: z.string().trim().min(1).nullable(),
  paragraphs: z.array(z.object({
    text: z.string().min(1).refine((value) => value.trim().length > 0),
    sourcePaths: z.array(builderSourcePath).min(1)
  }).strict())
}).strict().superRefine((value, context) => {
  if (value.status === "ready" && (value.paragraphs.length === 0 || value.error !== null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Ready overview requires paragraphs and no error" });
  }
  if (value.status !== "ready" && (value.error === null || value.paragraphs.length !== 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Unknown or failed overview requires an explanation and no paragraphs" });
  }
});
export type ReportOverview = z.infer<typeof reportOverviewSchema>;
export type ReportOverviewProjection = {
  state: "ready" | "missing" | "stale" | "invalid";
  overview: ReportOverview | null;
};
