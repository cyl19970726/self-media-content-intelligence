import fs from "node:fs";
import {
  creatorDetailCollectionSchema,
  creatorPortfolioAnalysisSchema,
  creatorPortfolioAnnotationsSchema,
  creatorSelectionSchema,
  videoReconstructionBatchSchema,
  type CreatorSynthesis,
  type CreatorSynthesisWorkflowStartInput
} from "../../packages/research/index.js";
import { artifactPath } from "../../packages/adapters/index.js";
import type { CrossPostResearch, ResearchStatement } from "../../packages/contracts/index.js";

export type WorkflowCreatorReaderData = {
  creatorName: string | null;
  audience: ResearchStatement[];
  corpus: { postCount: number; likesKnown: number; coverageRate: number };
  portfolio: Array<{
    id: string;
    title: string;
    sourceHref: string;
    evidenceHref: string | null;
    deepSample: boolean;
    likes: number | null;
    collections: number | null;
    comments: number | null;
    shares: number | null;
    publishedLabel: string | null;
  }>;
  crossPostResearch: CrossPostResearch | null;
};

function readArtifact(reference: string): unknown {
  return JSON.parse(fs.readFileSync(artifactPath(reference), "utf8")) as unknown;
}

function assertSourceBindings(report: CreatorSynthesis, source: CreatorSynthesisWorkflowStartInput): void {
  const inputs = report.inputs;
  const expected: Array<[string, string | null | undefined, string]> = [
    ["portfolio", inputs.portfolioArtifactRef, source.portfolioArtifactRef],
    ["portfolio annotations", inputs.portfolioAnnotationsArtifactRef, source.portfolioAnnotationsArtifactRef],
    ["selection", inputs.selectionArtifactRef, source.selectionArtifactRef],
    ["details", inputs.detailArtifactRef, source.detailArtifactRef],
    ["reconstruction batch", inputs.reconstructionBatchArtifactRef, source.reconstructionBatchArtifactRef]
  ];
  for (const [label, reportReference, sourceReference] of expected) {
    if (reportReference !== sourceReference) throw new Error(`CREATOR_CANDIDATE_SOURCE_MISMATCH: ${label}`);
  }
}

/**
 * Projects a workflow candidate from precisely the inputs frozen for that run.
 * It deliberately does not consult CreatorResearchService/current portfolio state.
 */
export function loadWorkflowCreatorReader(input: {
  report: CreatorSynthesis;
  source: CreatorSynthesisWorkflowStartInput;
  creatorName: string | null;
  evidenceHrefByPost?: ReadonlyMap<string, string>;
}): WorkflowCreatorReaderData {
  const { report, source, creatorName, evidenceHrefByPost } = input;
  assertSourceBindings(report, source);
  const analysis = creatorPortfolioAnalysisSchema.parse(readArtifact(source.portfolioArtifactRef));
  creatorPortfolioAnnotationsSchema.parse(readArtifact(source.portfolioAnnotationsArtifactRef));
  const selection = creatorSelectionSchema.parse(readArtifact(source.selectionArtifactRef));
  const details = creatorDetailCollectionSchema.parse(readArtifact(source.detailArtifactRef));
  videoReconstructionBatchSchema.parse(readArtifact(source.reconstructionBatchArtifactRef));
  if ([analysis.runId, selection.runId, details.runId].some((runId) => runId !== source.creatorRunId)) {
    throw new Error("CREATOR_CANDIDATE_SOURCE_RUN_MISMATCH");
  }
  const detailByPost = new Map(details.posts.map((post) => [post.externalId, post]));
  return {
    creatorName,
    audience: report.identity.audience,
    corpus: {
      postCount: analysis.metricCoverage.known + analysis.metricCoverage.missing,
      likesKnown: analysis.metricCoverage.known,
      coverageRate: analysis.metricCoverage.rate
    },
    portfolio: selection.items.map((item) => {
      const detail = detailByPost.get(item.externalId);
      return {
        id: item.externalId,
        title: detail?.title ?? item.title ?? "标题未识别",
        sourceHref: detail?.finalUrl ?? item.url,
        // Only links resolved from this synthesis candidate's pinned reconstruction batch are accepted.
        evidenceHref: evidenceHrefByPost?.get(item.externalId) ?? null,
        deepSample: item.deepCandidate,
        likes: item.likes,
        collections: item.collections ?? null,
        comments: item.comments ?? null,
        shares: null,
        publishedLabel: detail?.publishedLabel ?? null
      };
    }),
    crossPostResearch: report.crossPostResearch ?? null
  };
}
