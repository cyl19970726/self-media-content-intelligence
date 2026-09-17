import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  assertValidCrossPostResearch,
  creatorCorpusSchema,
  creatorSynthesisSchema,
  validateAdaptivePortfolioClassification,
  videoReconstructionBatchSchema
} from "../../../../packages/research/index.ts";

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) as unknown;
}

function required(value: string | undefined, option: string): string {
  if (!value) throw new Error(`Usage: --${option} is required`);
  return value;
}

function main(): void {
  const { values } = parseArgs({ options: {
    candidate: { type: "string" }, corpus: { type: "string" }, selection: { type: "string" },
    batch: { type: "string" }, "corpus-ref": { type: "string" }
  }, strict: true });
  const candidatePath = required(values.candidate, "candidate");
  const corpusPath = required(values.corpus, "corpus");
  const selectionPath = required(values.selection, "selection");
  const batchPath = required(values.batch, "batch");
  const corpusArtifactRef = required(values["corpus-ref"], "corpus-ref");
  const synthesis = creatorSynthesisSchema.parse(readJson(candidatePath));
  const corpus = creatorCorpusSchema.parse(readJson(corpusPath));
  const batch = videoReconstructionBatchSchema.parse(readJson(batchPath));
  if (!synthesis.portfolioClassification) throw new Error("portfolio_classification_missing");
  validateAdaptivePortfolioClassification({ classification: synthesis.portfolioClassification, corpus,
    corpusArtifactRef, reconstructionBatch: batch });
  assertValidCrossPostResearch({ selection: readJson(selectionPath), batch, synthesis });
  process.stdout.write(`Creator synthesis candidate is valid: ${path.resolve(candidatePath)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Creator synthesis candidate validation failed: ${message}\n`);
  process.exitCode = 1;
}
