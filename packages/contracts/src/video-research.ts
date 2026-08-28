import { z } from "zod";

const evidenceClassSchema = z.enum(["raw_fact", "visual_observation", "author_claim", "system_inference", "unknown"]);
const lensCoverageSchema = z.object({
  state: z.enum(["ready", "partial", "missing"]),
  covered: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  evidenceRefs: z.array(z.string()),
  conflicts: z.array(z.string()),
  uncheckedChannels: z.array(z.string()),
  failedGateIds: z.array(z.string()),
  note: z.string(),
  evaluator: z.object({ id: z.string(), version: z.string(), checkedAt: z.string() }).nullable(),
  rules: z.array(z.object({ id: z.string(), pass: z.boolean(), note: z.string(), evidenceRefs: z.array(z.string()), failedReason: z.string().nullable() }))
});

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
  directingLogic: z.object({
    viewerBefore: z.string().nullable(),
    viewerAfter: z.string().nullable(),
    activatedQuestion: z.string().nullable(),
    promise: z.string().nullable(),
    payoff: z.string().nullable(),
    endingResolution: z.string().nullable(),
    stages: z.array(z.object({
      label: z.string(), start: z.number().nullable(), end: z.number().nullable(),
      viewerQuestion: z.string().nullable(), function: z.string(), proof: z.string().nullable(),
      cognitiveChange: z.string().nullable(), comprehensionLoad: z.string().nullable(), payoff: z.string().nullable(), evidenceRefs: z.array(z.string())
    })),
    informationDesign: z.array(z.object({ kind: z.string().min(1), statement: z.string(), start: z.number().nullable(), end: z.number().nullable(), evidenceRefs: z.array(z.string()) })),
    proofDesign: z.array(z.object({
      proofType: z.enum(["visible_proof", "creator_claim", "system_inference"]),
      statement: z.string(), boundary: z.string(), start: z.number().nullable(), end: z.number().nullable(), evidenceRefs: z.array(z.string())
    })).default([]),
    loadAndPayoff: z.object({
      compression: z.string(), repetition: z.string(), payoffDistance: z.string(), comprehensionCosts: z.array(z.string())
    }).default({ compression: "尚未分析", repetition: "尚未分析", payoffDistance: "尚未分析", comprehensionCosts: [] }),
    notes: z.array(z.string())
  }),
  visualEditing: z.object({
    orientation: z.string().nullable(), composition: z.string().nullable(),
    shotCount: z.number().int().nonnegative().nullable(), cutsPerMinute: z.number().nonnegative().nullable(),
    resultFirstAt: z.number().nonnegative().nullable(),
    carriers: z.array(z.object({
      name: z.string(), roles: z.array(z.string()), start: z.number().nullable(), end: z.number().nullable()
    })),
    analyzedDuration: z.number().nonnegative().nullable(),
    claims: z.array(z.object({ statement: z.string(), function: z.string(), start: z.number().nullable(), end: z.number().nullable(), evidenceRefs: z.array(z.string()) })),
    shotSemantics: z.array(z.object({ start: z.number().nullable(), end: z.number().nullable(), role: z.string(), carrier: z.string(), meaningChange: z.string(), evidenceRefs: z.array(z.string()) })),
    uiProcedureStates: z.array(z.object({
      label: z.string(), before: z.string(), during: z.string(), after: z.string(), input: z.string().nullable(),
      parameters: z.array(z.string()), output: z.string().nullable(), continuity: z.string(), start: z.number().nullable(), end: z.number().nullable(), evidenceRefs: z.array(z.string())
    })).default([]),
    audioRole: z.string().nullable(),
    notes: z.array(z.string())
  }),
  performanceContext: z.object({
    tier: z.enum(["high", "base", "low", "unknown"]),
    creatorMedianLikes: z.number().nullable(), medianMultiple: z.number().nullable(), percentileRank: z.number().nullable(),
    interpretation: z.string(), confounds: z.array(z.string())
  }),
  relations: z.array(z.object({ from: z.string(), to: z.string(), relation: z.string(), evidenceRefs: z.array(z.string()) })),
  transcript: z.array(z.object({
    id: z.string(), start: z.number().nullable(), end: z.number().nullable(), text: z.string(),
    representativeFrame: z.string().nullable(), overlappingShots: z.array(z.string())
  })),
  frames: z.object({
    sparse: z.array(z.object({ id: z.string(), time: z.number().nullable(), src: z.string(), reason: z.string().nullable() })),
    dense: z.array(z.object({ id: z.string(), time: z.number().nullable(), src: z.string(), reason: z.string().nullable() }))
  }),
  lensCoverage: z.object({
    contentRestoration: lensCoverageSchema,
    directingLogic: lensCoverageSchema,
    visualEditingLogic: lensCoverageSchema
  }),
  coverage: z.object({ coreCovered: z.number().int().nonnegative(), coreTotal: z.number().int().nonnegative(), uncheckedChannels: z.array(z.string()) }),
  conflicts: z.array(z.string()),
  unknowns: z.array(z.string()),
  gate: z.object({ ready: z.boolean(), failedGateIds: z.array(z.string()) })
});

export type VideoResearch = z.infer<typeof videoResearchSchema>;
