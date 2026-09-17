import type { CreatorCorpus } from "../portfolio/contracts.js";
import type { CreatorSynthesis } from "./contracts.js";
import type { VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";

type PortfolioClassification = NonNullable<CreatorSynthesis["portfolioClassification"]>;

function surfaceEvidenceRefs(corpusRef: string, index: number, axis: PortfolioClassification["labelRegistry"][number]["axis"]): string[] {
  const titleAndVisibleText = [`${corpusRef}#/records/${index}/title`, `${corpusRef}#/records/${index}/visibleText`];
  return axis === "format" ? [...titleAndVisibleText, `${corpusRef}#/records/${index}/mediaType`] : titleAndVisibleText;
}

export function validateAdaptivePortfolioClassification(input: {
  classification: PortfolioClassification;
  corpus: CreatorCorpus;
  corpusArtifactRef: string;
  reconstructionBatch: VideoReconstructionBatch;
}): void {
  const { classification, corpus, corpusArtifactRef, reconstructionBatch } = input;
  if (classification.sourceCorpusArtifactRef !== corpusArtifactRef) {
    throw new Error("portfolio_classification_corpus_ref_mismatch");
  }
  const expectedIds = corpus.records.map((record) => record.externalId);
  const actualIds = classification.rows.map((row) => row.postExternalId);
  if (classification.observedPosts !== expectedIds.length || actualIds.length !== expectedIds.length
    || expectedIds.some((id) => !actualIds.includes(id))) {
    throw new Error("portfolio_classification_corpus_coverage");
  }
  const recordIndex = new Map(expectedIds.map((id, index) => [id, index]));
  const reconstructions = new Map(reconstructionBatch.items.flatMap((item) => item.reconstructionArtifactRef
    ? [[item.postExternalId, item.reconstructionArtifactRef] as const] : []));
  const allowedRegistryRefs = [corpusArtifactRef, ...reconstructions.values()];
  const labels = new Map(classification.labelRegistry.map((label) => [label.id, label]));
  for (const label of classification.labelRegistry) {
    if (label.evidenceRefs.some((reference) => !allowedRegistryRefs.includes(reference.split("#")[0] ?? ""))) {
      throw new Error("portfolio_classification_registry_evidence_binding");
    }
  }
  for (const row of classification.rows) {
    const index = recordIndex.get(row.postExternalId);
    if (index === undefined) throw new Error("portfolio_classification_unknown_post");
    for (const membership of row.memberships) {
      if (membership.sourceLevel === "surface_title") {
        const label = labels.get(membership.labelId);
        const allowed = surfaceEvidenceRefs(corpusArtifactRef, index, label?.axis ?? "topic");
        if (membership.evidenceRefs.some((reference) => !allowed.includes(reference))) {
          throw new Error("portfolio_classification_surface_evidence_binding");
        }
      } else {
        const reconstructionRef = reconstructions.get(row.postExternalId);
        if (!reconstructionRef || membership.evidenceRefs.some((reference) => reference.split("#")[0] !== reconstructionRef)) {
          throw new Error("portfolio_classification_deep_evidence_binding");
        }
      }
    }
  }
}
