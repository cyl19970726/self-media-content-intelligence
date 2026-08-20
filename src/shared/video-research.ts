import { z } from "zod";

const evidenceClassSchema = z.enum(["raw_fact", "visual_observation", "author_claim", "system_inference", "unknown"]);

export const videoResearchSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string(),
  creatorId: z.string(),
  creatorName: z.string(),
  title: z.string(),
  sourceHref: z.string(),
  sourceLabel: z.string(),
  thesis: z.string(),
  article: z.string(),
  engagement: z.object({ likes: z.number().nullable(), collections: z.number().nullable(), comments: z.number().nullable(), shares: z.number().nullable() }),
  evidenceHealth: z.object({
    state: z.enum(["ready", "partial", "missing"]),
    transcript: z.boolean(), frames: z.boolean(), ocr: z.boolean(), audio: z.boolean(), baseline: z.boolean(),
    note: z.string()
  }),
  knowledgeUnits: z.array(z.object({
    id: z.string(), title: z.string(), statement: z.string(), importance: z.string(),
    evidenceClass: evidenceClassSchema, confidence: z.string(), start: z.number().nullable(), end: z.number().nullable(),
    evidenceRefs: z.array(z.string()), unknowns: z.array(z.string())
  })),
  relations: z.array(z.object({ from: z.string(), to: z.string(), relation: z.string(), evidenceRefs: z.array(z.string()) })),
  transcript: z.array(z.object({
    id: z.string(), start: z.number().nullable(), end: z.number().nullable(), text: z.string(),
    representativeFrame: z.string().nullable(), overlappingShots: z.array(z.string())
  })),
  frames: z.object({
    sparse: z.array(z.object({ id: z.string(), time: z.number().nullable(), src: z.string(), reason: z.string().nullable() })),
    dense: z.array(z.object({ id: z.string(), time: z.number().nullable(), src: z.string(), reason: z.string().nullable() }))
  }),
  coverage: z.object({ coreCovered: z.number().int().nonnegative(), coreTotal: z.number().int().nonnegative(), uncheckedChannels: z.array(z.string()) }),
  conflicts: z.array(z.string()),
  unknowns: z.array(z.string()),
  gate: z.object({ ready: z.boolean(), failedGateIds: z.array(z.string()) })
});

export type VideoResearch = z.infer<typeof videoResearchSchema>;
