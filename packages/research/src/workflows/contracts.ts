import type { ArtifactRef, WorkflowDefinition } from "@signal-room/workflow";
import { z } from "zod";

const sourceConsistencyProvenanceSchema = z.object({ model: z.literal("gpt-5.6-luna"), reasoningEffort: z.literal("medium"),
  methodSha256: z.string().regex(/^[a-f0-9]{64}$/), threadId: z.string().nullable() });

export const sourceConsistencyCheckV1Schema = z.object({
  schemaVersion: z.literal("post-source-consistency@1"), inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
  verdict: z.enum(["consistent", "conflict", "uncertain"]), summary: z.string().min(1),
  comparisons: z.array(z.object({ postClaim: z.string().min(1),
    relation: z.enum(["supports", "contradicts", "insufficient"]), evidenceRefs: z.array(z.string()).min(1),
    reason: z.string().min(1) })).min(1),
  provenance: sourceConsistencyProvenanceSchema
}).superRefine((value, context) => {
  const relations = value.comparisons.map((comparison) => comparison.relation);
  if (value.verdict === "consistent" && (!relations.includes("supports") || relations.includes("contradicts"))) {
    context.addIssue({ code: "custom", path: ["verdict"], message: "consistent requires support and forbids contradiction" });
  }
  if (value.verdict === "conflict" && !relations.includes("contradicts")) {
    context.addIssue({ code: "custom", path: ["verdict"], message: "conflict requires contradiction" });
  }
});
export const sourceConsistencyCheckV2Schema = z.object({
  schemaVersion: z.literal("post-source-consistency@2"), inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
  verdict: z.enum(["consistent", "conflict", "uncertain"]), summary: z.string().min(1),
  comparisons: z.array(z.object({ postClaim: z.string().min(1), bearing: z.enum(["identity", "claim_detail"]),
    relation: z.enum(["supports", "contradicts", "insufficient"]), evidenceRefs: z.array(z.string()).min(1),
    reason: z.string().min(1) })).min(1), provenance: sourceConsistencyProvenanceSchema
}).superRefine((value, context) => {
  const identity = value.comparisons.filter((comparison) => comparison.bearing === "identity");
  if (value.verdict === "consistent" &&
    (!identity.some((comparison) => comparison.relation === "supports") || identity.some((comparison) => comparison.relation === "contradicts"))) {
    context.addIssue({ code: "custom", path: ["verdict"], message: "consistent requires identity support and forbids identity contradiction" });
  }
  if (value.verdict === "conflict" && !identity.some((comparison) => comparison.relation === "contradicts")) {
    context.addIssue({ code: "custom", path: ["verdict"], message: "conflict requires identity contradiction" });
  }
});
export const sourceConsistencyCheckSchema = z.union([sourceConsistencyCheckV1Schema, sourceConsistencyCheckV2Schema]);
export type SourceConsistencyCheck = z.infer<typeof sourceConsistencyCheckSchema>;
export type SourceConsistencyReceipt = { artifact: SourceConsistencyCheck };

export type PostWorkflowInput = {
  creatorRunId: string;
  postExternalId: string;
  evidenceKind?: "video" | "image_post";
  evaluationMode?: "fresh" | "repair_existing_invalid";
  importedEvaluationArtifactRef?: string;
  evidence: ArtifactRef;
};

export type PostWorkflowStartInput = {
  creatorRunId: string;
  postExternalId: string;
  evidenceKind?: "video" | "image_post";
  evaluationMode?: "fresh" | "repair_existing_invalid";
  importedEvaluationArtifactRef?: string;
  sourceUrl: string;
  sourceMediaArtifactRef: string;
  detailArtifactRef: string;
  mediaManifestArtifactRef: string;
  selectionArtifactRef: string;
  reconstructionBatchArtifactRef: string;
};

export type PostCandidateReceipt = { artifact: unknown; validation?: unknown };
export type PostEvaluationReceipt = {
  artifact: unknown;
  route: "deliver" | "repair_post" | "missing_evidence";
  findings?: unknown;
  candidateRevisionSha256?: string;
};

export type PostEvaluationRepairInput = {
  creatorRunId: string;
  postExternalId: string;
  candidate: ArtifactRef;
  candidateRevisionSha256: string;
  evidence: ArtifactRef;
  prior: { receipt: PostEvaluationReceipt; artifactRef?: ArtifactRef };
  failure: { kind: "evaluation_contract"; details: unknown; validationRef?: ArtifactRef };
};

export type PostEvaluationRepairReceipt = PostEvaluationReceipt & {
  repair: { candidateSha256: string; priorEvaluationSha256?: string; diagnosticRefs: string[] };
};

export type PostBuildOutput =
  | { ok: true; candidate: ArtifactRef; receipt: PostCandidateReceipt }
  | { ok: false; state: "needs_review"; details: unknown };

export type PostReviewInput = { creatorRunId: string; postExternalId: string; candidate: ArtifactRef; evidence: ArtifactRef };
export type PostReviewOutput =
  | { ok: true; evaluation: ArtifactRef; receipt: PostEvaluationReceipt; route: PostEvaluationReceipt["route"]; findings?: unknown }
  | { ok: false; state: "needs_review"; details: { kind: "evaluation_contract"; candidate: ArtifactRef;
      evidence: ArtifactRef; produced: PostEvaluationReceipt; checked: unknown } };
export type PostRepairInput = PostReviewInput & { findings: unknown };

export type PostWorkflowOutput =
  | { ok: true; candidate: ArtifactRef; evaluation: ArtifactRef }
  | { ok: false; state: "blocked" | "needs_review"; details: unknown };

export type CreatorSynthesisWorkflowInput = {
  creatorRunId: string;
  frozenInputs: ArtifactRef;
};

export type CreatorSynthesisWorkflowStartInput = {
  creatorRunId: string;
  portfolioArtifactRef: string;
  portfolioAnnotationsArtifactRef: string;
  selectionArtifactRef: string;
  detailArtifactRef: string;
  reconstructionBatchArtifactRef: string;
  previousSynthesisArtifactRef?: string | null;
  previousSynthesisGateArtifactRef?: string | null;
};

export type CreatorSynthesisReceipt = { artifact: unknown };
export type CreatorSynthesisEvaluationReceipt = {
  artifact: unknown;
  route: "deliver" | "repair" | "source_gap";
  findings?: unknown;
};

export type CreatorBuildOutput =
  | { ok: true; candidate: ArtifactRef; receipt: CreatorSynthesisReceipt }
  | { ok: false; state: "needs_review"; details: unknown };
export type CreatorReviewInput = { creatorRunId: string; candidate: ArtifactRef; frozenInputs: ArtifactRef };
export type CreatorReviewOutput =
  | { ok: true; evaluation: ArtifactRef; receipt: CreatorSynthesisEvaluationReceipt; route: CreatorSynthesisEvaluationReceipt["route"]; findings?: unknown }
  | { ok: false; state: "needs_review"; details: unknown };
export type CreatorRepairInput = CreatorReviewInput & { findings: unknown };

export type CreatorSynthesisWorkflowOutput =
  | { ok: true; synthesis: ArtifactRef; evaluation: ArtifactRef }
  | { ok: false; state: "blocked" | "needs_review"; details: unknown };

export type ResearchWorkflowDefinitions = {
  post: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>;
  creatorSynthesis: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>;
  creatorAnalysis?: WorkflowDefinition<CreatorAnalysisWorkflowInput, CreatorAnalysisWorkflowOutput>;
};

export type CreatorAnalysisWorkflowInput = {
  creatorRunId: string;
  source: ArtifactRef;
  posts: PostWorkflowInput[];
};

export type CreatorAnalysisWorkflowStartInput = {
  creatorRunId: string;
  portfolioArtifactRef: string;
  portfolioAnnotationsArtifactRef: string;
  selectionArtifactRef: string;
  detailArtifactRef: string;
  reconstructionBatchArtifactRef: string;
  previousSynthesisArtifactRef?: string | null;
  previousSynthesisGateArtifactRef?: string | null;
  posts: PostWorkflowStartInput[];
};

export type CreatorAnalysisWorkflowOutput =
  | { ok: true; posts: PostWorkflowOutput[]; synthesis: CreatorSynthesisWorkflowOutput }
  | { ok: false; state: "blocked" | "needs_review"; details: unknown };

export type WorkflowQueueReceipt = {
  creatorRunId: string;
  workflowRunId: string;
  workflowId: string;
  workflowRevision: string;
  state: "queued" | "running" | "waiting" | "blocked" | "needs_review" | "succeeded" | "failed" | "cancel_requested" | "canceled";
  generation: number;
  stepKey?: string;
};

export interface ResearchWorkflowExecutor {
  createPost(input: PostWorkflowStartInput): Promise<WorkflowQueueReceipt>;
  createSynthesis(input: CreatorSynthesisWorkflowStartInput): Promise<WorkflowQueueReceipt>;
  createAnalysis(input: CreatorAnalysisWorkflowStartInput): Promise<WorkflowQueueReceipt>;
  advance(input: { creatorRunId: string; workflowRunId: string; generation: number; signal: AbortSignal }): Promise<WorkflowQueueReceipt>;
  prepareRetry(input: { creatorRunId: string; workflowRunId: string; stepKey: string }): Promise<WorkflowQueueReceipt>;
  cancel(workflowRunId: string): Promise<void>;
  snapshot(creatorRunId: string, workflowRunId: string): Promise<WorkflowQueueReceipt | null>;
}
