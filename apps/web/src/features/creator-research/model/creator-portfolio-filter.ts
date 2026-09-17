import type { CreatorDossier } from "../../../shared/contracts/core";

type Item = CreatorDossier["portfolio"]["items"][number];

export function matchesPortfolioClassification(item: Item, topic: string, format: string): boolean {
  const topics = item.topics?.length ? item.topics : item.topic ? [item.topic] : [];
  const formats = item.formats?.length ? item.formats : item.format ? [item.format] : [];
  return (topic === "all" || topics.includes(topic)) && (format === "all" || formats.includes(format));
}

export function matchesPortfolioEvidence(item: Item, evidence: string): boolean {
  return evidence === "all" || (evidence === "deep" ? item.deepSample : item.evidenceStatus === evidence);
}
