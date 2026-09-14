import { z } from "zod";

export const crossPostResearchSectionIdSchema = z.enum([
  "value",
  "knowledge",
  "patterns",
  "performance",
  "next_questions"
]);

export const crossPostResearchSupportSchema = z.object({
  postExternalId: z.string().min(1),
  observation: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1)
});

export const crossPostResearchFindingSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  factClass: z.enum(["observed", "author_claim", "inference", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  support: z.array(crossPostResearchSupportSchema).min(1),
  counterexamples: z.array(crossPostResearchSupportSchema),
  boundary: z.string().min(1),
  openQuestions: z.array(z.string().min(1))
});

export const crossPostResearchSectionSchema = z.object({
  id: crossPostResearchSectionIdSchema,
  title: z.string().min(1),
  findings: z.array(crossPostResearchFindingSchema).min(1)
});

export const crossPostResearchSchema = z.object({
  sections: z.array(crossPostResearchSectionSchema)
});

export type CrossPostResearch = z.infer<typeof crossPostResearchSchema>;
