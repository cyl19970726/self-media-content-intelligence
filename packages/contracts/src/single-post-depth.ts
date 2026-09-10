import { z } from "zod";

const refs = z.array(z.string().min(1));
const words = z.string().min(1);
export const openingAnalysisSchema = z.object({
  duration: z.number().positive().max(10), inspectionBasis: words,
  segments: z.array(z.object({
    id: words, timeRange: z.object({ start: z.number().nonnegative(), end: z.number().positive() }),
    boundaryReason: words, spokenWords: words, burnedCaptions: words, composition: words,
    motion: words, audioRole: words, evidenceArrival: words, viewerQuestion: words,
    meaningChange: words, alignmentStatus: words, evidenceRefs: refs.min(1), frameRefs: refs.min(1), unknowns: refs
  })).min(1), unknowns: refs
});
const surfaceSchema = z.object({
  state: z.enum(["available", "partial", "missing"]), sourceRef: z.string().nullable(),
  audience: z.string().nullable(), promise: z.string().nullable(), tension: z.string().nullable(),
  specificity: z.string().nullable(), searchTerms: z.string().nullable(), composition: z.string().nullable(),
  typeHierarchy: z.string().nullable(), smallSizeReadability: z.string().nullable(), evidenceRefs: refs, unknowns: refs
});
export const packagingAnalysisSchema = z.object({
  title: surfaceSchema, cover: surfaceSchema, firstFrame: surfaceSchema,
  fulfillment: z.array(z.object({ origin: z.enum(["title", "cover", "first_sentence"]), promise: words,
    status: z.enum(["fulfilled", "partial", "not_shown", "unknown"]), bodyEvidenceRefs: refs, explanation: words })),
  unknowns: refs
});
export type OpeningAnalysis = z.infer<typeof openingAnalysisSchema>;
export type PackagingAnalysis = z.infer<typeof packagingAnalysisSchema>;
