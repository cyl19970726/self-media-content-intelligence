import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { LocalCreatorArtifactStore, assembleReuseCandidateFromFixed, creatorSynthesisResearchDraftSchema } from "../../../../packages/adapters/index.ts";
import { assertValidCrossPostResearch, creatorCorpusSchema, creatorPortfolioAnalysisSchema, validateAdaptivePortfolioClassification,
  videoReconstructionBatchSchema } from "../../../../packages/research/index.ts";

const { values } = parseArgs({ options: { draft: { type: "string" }, context: { type: "string" } }, strict: true });
if (!values.draft || !values.context) throw new Error("Usage: --draft and --context are required");
const draftPath = path.resolve(values.draft);
const context = JSON.parse(fs.readFileSync(path.resolve(values.context), "utf8")) as { request: Parameters<typeof assembleReuseCandidateFromFixed>[0]["request"]; fixed: unknown };
const draft = creatorSynthesisResearchDraftSchema.parse(JSON.parse(fs.readFileSync(draftPath, "utf8")) as unknown);
const artifacts = new LocalCreatorArtifactStore();
const candidate = assembleReuseCandidateFromFixed({ request: context.request, fixed: context.fixed, draft });
const portfolio = creatorPortfolioAnalysisSchema.parse(artifacts.read(context.request.portfolioArtifactRef));
const corpus = creatorCorpusSchema.parse(artifacts.read(portfolio.corpusArtifactRef));
const batch = videoReconstructionBatchSchema.parse(artifacts.read(context.request.reconstructionBatchArtifactRef));
if (!candidate.portfolioClassification) throw new Error("portfolio_classification_missing");
validateAdaptivePortfolioClassification({ classification: candidate.portfolioClassification, corpus,
  corpusArtifactRef: portfolio.corpusArtifactRef, reconstructionBatch: batch });
assertValidCrossPostResearch({ selection: artifacts.read(context.request.selectionArtifactRef), batch, synthesis: candidate });
process.stdout.write(`Creator synthesis research draft and assembled candidate are valid: ${draftPath}\n`);
