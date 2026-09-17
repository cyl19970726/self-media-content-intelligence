import { z } from "zod";
import { crossPostResearchSchema } from "../../../contracts/index.js";
import {
  childWorkerLifecycleEventSchema,
  type ChildWorkerLifecycleObserver
} from "../orchestration/contracts.js";

export const evidenceClaimSchema = z.object({
  statement: z.string().min(1),
  factClass: z.enum(["observed", "author_claim", "inference", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceRefs: z.array(z.string()).min(1),
  caveat: z.string().nullable()
});

const adaptiveClassificationAxisSchema = z.enum(["topic", "format", "commercial_signal"]);
const adaptiveClassificationSourceSchema = z.enum(["surface_title", "deep_builder"]);
export const portfolioClassificationSchema = z.object({
  schemaVersion: z.literal("creator-portfolio-classification@1"),
  sourceCorpusArtifactRef: z.string().min(1),
  observedPosts: z.number().int().nonnegative(),
  labelRegistry: z.array(z.object({
    id: z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/),
    axis: adaptiveClassificationAxisSchema,
    name: z.string().trim().min(1),
    definition: z.string().trim().min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    boundary: z.string().trim().min(1)
  })),
  rows: z.array(z.object({
    postExternalId: z.string().min(1),
    memberships: z.array(z.object({
      labelId: z.string().min(1),
      sourceLevel: adaptiveClassificationSourceSchema,
      evidenceRefs: z.array(z.string().min(1)).min(1),
      boundary: z.string().trim().min(1)
    })),
    unknowns: z.array(z.string().min(1))
  })),
  boundaries: z.array(z.string().min(1)).min(1)
}).superRefine((value, context) => {
  const labelIds = value.labelRegistry.map((label) => label.id);
  if (new Set(labelIds).size !== labelIds.length) {
    context.addIssue({ code: "custom", path: ["labelRegistry"], message: "自适应分类 label id 必须唯一。" });
  }
  const labelNames = value.labelRegistry.map((label) => `${label.axis}:${label.name.toLocaleLowerCase("zh-CN")}`);
  if (new Set(labelNames).size !== labelNames.length) {
    context.addIssue({ code: "custom", path: ["labelRegistry"], message: "同一分类轴不能登记重名标签。" });
  }
  const knownLabels = new Set(labelIds);
  const postIds = value.rows.map((row) => row.postExternalId);
  if (new Set(postIds).size !== postIds.length || value.observedPosts !== value.rows.length) {
    context.addIssue({ code: "custom", path: ["rows"], message: "自适应分类必须一帖一行并与 observedPosts 一致。" });
  }
  value.rows.forEach((row, rowIndex) => {
    const memberships = row.memberships.map((membership) => membership.labelId);
    if (new Set(memberships).size !== memberships.length) {
      context.addIssue({ code: "custom", path: ["rows", rowIndex, "memberships"], message: "同一帖子不能重复登记同一标签。" });
    }
    row.memberships.forEach((membership, membershipIndex) => {
      if (!knownLabels.has(membership.labelId)) context.addIssue({ code: "custom",
        path: ["rows", rowIndex, "memberships", membershipIndex, "labelId"], message: "帖子分类引用了未登记标签。" });
    });
    if (row.memberships.length === 0 && row.unknowns.length === 0) context.addIssue({ code: "custom",
      path: ["rows", rowIndex, "unknowns"], message: "零分类帖子必须说明未知原因。" });
  });
});
export type PortfolioClassification = z.infer<typeof portfolioClassificationSchema>;

export const creatorSynthesisSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  creatorRunId: z.string().uuid(),
  generatedAt: z.string(),
  inputs: z.object({
    portfolioArtifactRef: z.string(),
    portfolioAnnotationsArtifactRef: z.string().nullable().optional(),
    selectionArtifactRef: z.string(),
    detailArtifactRef: z.string(),
    reconstructionBatchArtifactRef: z.string()
  }),
  identity: z.object({
    positioning: evidenceClaimSchema,
    audience: z.array(evidenceClaimSchema).min(1),
    problemsAddressed: z.array(evidenceClaimSchema).min(1),
    valueProvided: z.array(evidenceClaimSchema).min(1),
    trustSources: z.array(evidenceClaimSchema).min(1),
    lifecycleStage: evidenceClaimSchema,
    commercialPaths: z.array(evidenceClaimSchema)
  }),
  contentSystem: z.object({
    topicClusters: z.array(evidenceClaimSchema).min(1),
    formatClusters: z.array(evidenceClaimSchema).min(1),
    visualLanguage: z.array(evidenceClaimSchema).min(1),
    publishingRhythm: z.array(evidenceClaimSchema),
    recurringStructure: z.array(evidenceClaimSchema).min(1)
  }),
  performance: z.object({
    baseline: z.array(evidenceClaimSchema).min(1),
    high: z.array(evidenceClaimSchema).min(1),
    low: z.array(evidenceClaimSchema).min(1),
    timing: z.array(evidenceClaimSchema),
    confounds: z.array(z.string()).min(1)
  }),
  postAnalyses: z.array(z.object({
    postExternalId: z.string(),
    tier: z.enum(["high", "base", "low"]),
    tierRank: z.number().int().positive(),
    title: z.string().nullable(),
    evidenceStatus: z.enum(["deep_validated", "deep_provisional", "surface_only"]),
    contentRole: z.string().min(1),
    contentForm: z.array(z.string()).min(1),
    performanceInterpretation: z.string().min(1),
    evidenceRefs: z.array(z.string()).min(1),
    unknowns: z.array(z.string())
  })).length(21),
  portfolioClassification: portfolioClassificationSchema.optional(),
  crossPostResearch: crossPostResearchSchema.optional(),
  boundaries: z.array(z.string()).min(1)
});
export type CreatorSynthesis = z.infer<typeof creatorSynthesisSchema>;

export const creatorSynthesisGateSchema = z.object({
  schemaVersion: z.enum(["1.0.0", "1.1.0"]),
  creatorRunId: z.string().uuid(),
  ready: z.boolean(),
  gates: z.array(z.object({ id: z.string(), pass: z.boolean(), message: z.string() })),
  failedGateIds: z.array(z.string()),
  checkedAt: z.string(),
  candidateRevisionFingerprint: z.string().nullable().default(null),
  independentEvaluationArtifactRef: z.string().nullable().default(null),
  evaluator: z.object({
    evaluatorRunId: z.string().uuid(),
    independentOfCandidate: z.literal(true),
    evaluatedAt: z.string()
  }).nullable().default(null)
});
export type CreatorSynthesisGate = z.infer<typeof creatorSynthesisGateSchema>;

export const creatorSynthesisIndependentEvaluationSchema = z.object({
  schemaVersion: z.literal("creator-synthesis-independent-evaluation@1"),
  creatorRunId: z.string().uuid(),
  candidateRevisionFingerprint: z.string().length(64),
  evaluatorRunId: z.string().uuid(),
  independentOfCandidate: z.literal(true),
  evaluatedAt: z.string(),
  gates: z.array(z.object({
    id: z.enum([
      "canonical_21_coverage",
      "deep_9_ready",
      "deep_evidence_binding",
      "three_tiers_present",
      "evidence_classification",
      "research_creation_separation",
      "backend_metrics_unknown"
    ]),
    pass: z.boolean(),
    message: z.string().min(1),
    evidenceRefs: z.array(z.string()).min(1)
  })).length(7)
}).superRefine((value, context) => {
  const ids = value.gates.map((gate) => gate.id);
  if (new Set(ids).size !== 7) context.addIssue({ code: "custom", message: "独立综合评估必须逐项覆盖 7 个 gate。" });
});
export type CreatorSynthesisIndependentEvaluation = z.infer<typeof creatorSynthesisIndependentEvaluationSchema>;

export const creatorSynthesisChildRoleSchema = z.enum(["creator_synthesis", "creator_synthesis_evaluator"]);
export type CreatorSynthesisChildRole = z.infer<typeof creatorSynthesisChildRoleSchema>;
export const creatorSynthesisLifecycleEventSchema = childWorkerLifecycleEventSchema.extend({ role: creatorSynthesisChildRoleSchema });
export type CreatorSynthesisLifecycleEvent = z.infer<typeof creatorSynthesisLifecycleEventSchema>;
export type CreatorSynthesisLifecycleObserver = ChildWorkerLifecycleObserver<CreatorSynthesisLifecycleEvent>;

export type CreatorSynthesisRequest = {
  creatorRunId: string;
  creatorName: string | null;
  portfolioArtifactRef: string;
  portfolioAnnotationsArtifactRef?: string | null;
  selectionArtifactRef: string;
  detailArtifactRef: string;
  reconstructionBatchArtifactRef: string;
  mode: "provisional" | "formal";
};

export type CreatorSynthesisOutcome =
  | { state: "ready"; synthesisArtifactRef: string; gateArtifactRef: string }
  | { state: "provisional"; synthesisArtifactRef: string; gateArtifactRef: string; failedGateIds: string[] }
  | { state: "not_ready"; synthesisArtifactRef: string | null; gateArtifactRef: string | null; failedGateIds: string[]; message: string }
  | { state: "blocked"; message: string; userActionRequired: boolean };

export interface CreatorSynthesisExecutor {
  synthesize(
    request: CreatorSynthesisRequest,
    observeLifecycle?: CreatorSynthesisLifecycleObserver
  ): Promise<CreatorSynthesisOutcome>;
}

export type CreatorResearchCompletion = {
  creatorRunId: string;
  creatorId: string;
  creatorName: string | null;
  synthesisArtifactRef: string;
  gateArtifactRef: string;
  synthesis: CreatorSynthesis;
  gate: CreatorSynthesisGate;
};

export interface CreatorResearchCompletionPort {
  publish(completion: Readonly<CreatorResearchCompletion>): void | Promise<void>;
}
