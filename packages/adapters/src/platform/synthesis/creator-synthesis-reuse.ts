import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  assertValidCrossPostResearch,
  creatorCorpusSchema,
  creatorPortfolioAnalysisSchema,
  creatorSynthesisSchema,
  validateAdaptivePortfolioClassification,
  type CreatorSynthesis,
  type CreatorSynthesisRequest,
  videoReconstructionBatchSchema
} from "../../../../research/index.js";
import { artifactPath } from "../../core/artifacts.js";

const fixedFields = {
  schemaVersion: true,
  creatorRunId: true,
  generatedAt: true,
  inputs: true,
  portfolioClassification: true,
  postAnalyses: true
} as const;

/** The Builder may only author research conclusions in a reuse trial. */
export const creatorSynthesisResearchDraftSchema = creatorSynthesisSchema.omit(fixedFields).strict();
export type CreatorSynthesisResearchDraft = z.infer<typeof creatorSynthesisResearchDraftSchema>;
export const creatorSynthesisFixedFieldsSchema = creatorSynthesisSchema.pick(fixedFields).strict();
export type CreatorSynthesisFixedFields = z.infer<typeof creatorSynthesisFixedFieldsSchema>;
export const creatorSynthesisChildFixedFieldsSchema = creatorSynthesisFixedFieldsSchema.omit({ generatedAt: true }).strict();

export type ReuseBase = {
  sourcePath: string;
  sourceSha256: string;
  candidate: CreatorSynthesis;
};

function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function pinnedInputs(request: CreatorSynthesisRequest): CreatorSynthesis["inputs"] {
  return {
    portfolioArtifactRef: request.portfolioArtifactRef,
    portfolioAnnotationsArtifactRef: request.portfolioAnnotationsArtifactRef ?? null,
    selectionArtifactRef: request.selectionArtifactRef,
    detailArtifactRef: request.detailArtifactRef,
    reconstructionBatchArtifactRef: request.reconstructionBatchArtifactRef
  };
}

/** A reuse candidate is valid only when every frozen source is byte-for-byte the same reference set. */
export function loadReuseBase(reusePath: string, request: CreatorSynthesisRequest): ReuseBase {
  const sourcePath = path.resolve(reusePath);
  let candidate: CreatorSynthesis;
  try {
    candidate = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(sourcePath, "utf8")) as unknown);
  } catch (error) {
    throw new Error(`CREATOR_SYNTHESIS_REUSE_INVALID:${error instanceof Error ? error.message : "unreadable"}`);
  }
  const expected = pinnedInputs(request);
  const actual = { ...candidate.inputs, portfolioAnnotationsArtifactRef: candidate.inputs.portfolioAnnotationsArtifactRef ?? null };
  if (candidate.creatorRunId !== request.creatorRunId) {
    throw new Error("CREATOR_SYNTHESIS_REUSE_RUN_MISMATCH");
  }
  if (Object.entries(expected).some(([key, value]) => actual[key as keyof typeof actual] !== value)) {
    throw new Error("CREATOR_SYNTHESIS_REUSE_INPUT_MISMATCH");
  }
  if (!candidate.portfolioClassification) throw new Error("CREATOR_SYNTHESIS_REUSE_CLASSIFICATION_MISSING");
  return { sourcePath, sourceSha256: sha256File(sourcePath), candidate };
}

/** Validate the reused compatibility fields against the current registered frozen inputs. */
export function assertReuseBaseBindings(input: { base: ReuseBase; request: CreatorSynthesisRequest; readArtifact: (reference: string) => unknown }): void {
  const portfolio = creatorPortfolioAnalysisSchema.parse(input.readArtifact(input.request.portfolioArtifactRef));
  const corpus = creatorCorpusSchema.parse(input.readArtifact(portfolio.corpusArtifactRef));
  const batch = videoReconstructionBatchSchema.parse(input.readArtifact(input.request.reconstructionBatchArtifactRef));
  const candidate = input.base.candidate;
  if (!candidate.portfolioClassification) throw new Error("CREATOR_SYNTHESIS_REUSE_CLASSIFICATION_MISSING");
  try {
    validateAdaptivePortfolioClassification({ classification: candidate.portfolioClassification, corpus,
      corpusArtifactRef: portfolio.corpusArtifactRef, reconstructionBatch: batch });
    assertValidCrossPostResearch({ selection: input.readArtifact(input.request.selectionArtifactRef), batch, synthesis: candidate });
  } catch (error) {
    throw new Error(`CREATOR_SYNTHESIS_REUSE_BINDING_INVALID:${error instanceof Error ? error.message : "invalid"}`);
  }
}

/** Keep complete deep sources available to the new Builder; never replace them with a prior synthesis narrative. */
export function buildReuseMaterialIndex(input: {
  request: CreatorSynthesisRequest;
  readArtifact: (reference: string) => unknown;
}): Record<string, unknown> {
  const batch = videoReconstructionBatchSchema.parse(input.readArtifact(input.request.reconstructionBatchArtifactRef));
  return {
    schemaVersion: "creator-synthesis-reuse-material-index@1",
    reconstructionBatchArtifactRef: input.request.reconstructionBatchArtifactRef,
    deepMaterials: batch.items.filter((item) => item.reconstructionArtifactRef).map((item) => {
      const reconstructionArtifactRef = item.reconstructionArtifactRef!;
      const reconstructionPath = artifactPath(reconstructionArtifactRef);
      const reconstruction = input.readArtifact(reconstructionArtifactRef) as { builderLenses?: unknown };
      const evaluationBoundaries = [item.evaluationArtifactRef, item.gateReportArtifactRef,
        item.threeLensEvaluationArtifactRef, item.threeLensGateReportArtifactRef].flatMap((reference) => {
        if (!reference) return [];
        const value = input.readArtifact(reference) as Record<string, unknown>;
        const valuePath = artifactPath(reference);
        return [{ artifactRef: reference, path: valuePath, sha256: sha256File(valuePath),
          boundary: value.boundaries ?? value.boundary ?? value.gates ?? value.failedGateIds ?? null }];
      });
      return {
        postExternalId: item.postExternalId,
        tier: item.tier,
        state: item.state,
        evaluationPolicy: item.evaluationPolicy,
        failedGateIds: item.failedGateIds,
        reconstructionArtifactRef,
        reconstructionPath,
        reconstructionSha256: sha256File(reconstructionPath),
        builderLenses: reconstruction.builderLenses ?? null,
        evaluationBoundaries
      };
    })
  };
}

/** Compact compatibility context informs subject coverage without exposing prior research prose. */
export function reuseClassificationContext(candidate: CreatorSynthesis): Record<string, unknown> {
  const classification = candidate.portfolioClassification!;
  const counts = Object.fromEntries(classification.labelRegistry.map((label) => [label.id,
    classification.rows.filter((row) => row.memberships.some((membership) => membership.labelId === label.id)).length]));
  const deepIds = new Set(candidate.postAnalyses.filter((post) => post.evidenceStatus !== "surface_only").map((post) => post.postExternalId));
  return { labelRegistry: classification.labelRegistry, membershipCounts: counts,
    deepSampleMemberships: classification.rows.filter((row) => deepIds.has(row.postExternalId)) };
}

/** Fixed compatibility fields always come from the validated old Builder output, never a new draft. */
export function assembleReuseCandidate(input: {
  request: CreatorSynthesisRequest;
  base: ReuseBase;
  draft: unknown;
  reconstructionBatch?: unknown;
  generatedAt?: string;
}): CreatorSynthesis {
  const fixed = prepareReuseFixedFields(input.base.candidate, input.reconstructionBatch);
  return assembleReuseCandidateFromFixed({ request: input.request, draft: input.draft,
    fixed,
    generatedAt: input.generatedAt });
}

/** Compatibility rows retain their prose, while their own frozen evaluator and gate refs are made reachable. */
export function prepareReuseFixedFields(candidate: CreatorSynthesis, reconstructionBatch?: unknown): CreatorSynthesisFixedFields {
  const { schemaVersion, creatorRunId, generatedAt, inputs, portfolioClassification } = candidate;
  const batch = reconstructionBatch ? videoReconstructionBatchSchema.parse(reconstructionBatch) : null;
  const byPost = new Map(batch?.items.map((item) => [item.postExternalId, item]) ?? []);
  const built = new Set(["built_unevaluated", "evaluated_with_findings", "verified", "ready"]);
  const postAnalyses = candidate.postAnalyses.map((post) => {
    const item = byPost.get(post.postExternalId);
    if (!item || !built.has(item.state)) return post;
    const ownFrozenRefs = [item.evaluationArtifactRef, item.gateReportArtifactRef,
      item.threeLensEvaluationArtifactRef, item.threeLensGateReportArtifactRef].filter((reference): reference is string => Boolean(reference));
    return { ...post, evidenceRefs: [...new Set([...post.evidenceRefs, ...ownFrozenRefs])] };
  });
  return creatorSynthesisFixedFieldsSchema.parse({ schemaVersion, creatorRunId, generatedAt, inputs, portfolioClassification, postAnalyses });
}

/** Assembly accepts only the non-research compatibility fields exposed to the child validator. */
export function assembleReuseCandidateFromFixed(input: {
  request: CreatorSynthesisRequest;
  fixed: unknown;
  draft: unknown;
  generatedAt?: string;
}): CreatorSynthesis {
  const draft = creatorSynthesisResearchDraftSchema.parse(input.draft);
  const fixed = creatorSynthesisFixedFieldsSchema.parse({ ...(input.fixed as Record<string, unknown>),
    generatedAt: input.generatedAt ?? new Date().toISOString() });
  const expectedInputs = pinnedInputs(input.request);
  if (fixed.creatorRunId !== input.request.creatorRunId
    || Object.entries(expectedInputs).some(([key, value]) => fixed.inputs[key as keyof typeof fixed.inputs] !== value)) {
    throw new Error("CREATOR_SYNTHESIS_REUSE_FIXED_INPUT_MISMATCH");
  }
  return creatorSynthesisSchema.parse({
    ...draft,
    schemaVersion: fixed.schemaVersion,
    creatorRunId: fixed.creatorRunId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    inputs: fixed.inputs,
    portfolioClassification: fixed.portfolioClassification,
    postAnalyses: fixed.postAnalyses
  });
}

export function reuseProvenance(input: { base: ReuseBase; materialIndexPath: string; materialIndexSha256: string;
  draftPath: string; draftSha256: string; loadedSkill: Array<{ path: string; sha256: string }> }): Record<string, unknown> {
  return {
    source: "same_input_research_draft",
    reuseBasePath: input.base.sourcePath,
    reuseBaseSha256: input.base.sourceSha256,
    derivedParts: {
      portfolioClassification: { source: "reuse_base", sha256: input.base.sourceSha256 },
      postAnalyses: { source: "reuse_base_compatibility", sha256: input.base.sourceSha256,
        evidenceRefs: "supplemented_from_frozen_batch_per_post" },
      researchDraft: { source: "new_builder", path: input.draftPath, sha256: input.draftSha256, generatedWithLoadedSkill: true }
    },
    materialIndexPath: input.materialIndexPath,
    materialIndexSha256: input.materialIndexSha256,
    loadedSkill: input.loadedSkill
  };
}
