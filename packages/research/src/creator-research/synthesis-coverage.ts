import type { CreatorSelection } from "../portfolio/contracts.js";
import type { VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";

const requiredGroups = ["high", "median", "mean", "low"] as const;
const builtStates = new Set(["built_unevaluated", "evaluated_with_findings", "verified", "ready"]);
const verifiedStates = new Set(["verified", "ready"]);

export type CreatorSynthesisCoverage = {
  allowed: boolean;
  provisionalAllowed: boolean;
  formalAllowed: boolean;
  boundedMediaGap: boolean;
  builtPosts: number;
  verifiedPosts: number;
  missingProvisionalGroups: string[];
  missingFormalGroups: string[];
};

function coveredGroups(selection: CreatorSelection, acceptedIds: Set<string>): string[] {
  return requiredGroups.filter((group) => selection.items.some((item) =>
    item.deepCandidate && item.deepGroups.includes(group) && acceptedIds.has(item.externalId)));
}

/** One authoritative policy for preview synthesis and formal Wiki synthesis. */
export function creatorSynthesisCoverage(selection: CreatorSelection, batch: VideoReconstructionBatch): CreatorSynthesisCoverage {
  const builtItems = batch.items.filter((item) => builtStates.has(item.state));
  const verifiedItems = batch.items.filter((item) => verifiedStates.has(item.state));
  const builtIds = new Set(builtItems.map((item) => item.postExternalId));
  const verifiedIds = new Set(verifiedItems.map((item) => item.postExternalId));
  const provisionalGroups = coveredGroups(selection, builtIds);
  const formalGroups = coveredGroups(selection, verifiedIds);
  const missingProvisionalGroups = requiredGroups.filter((group) => !provisionalGroups.includes(group));
  const missingFormalGroups = requiredGroups.filter((group) => !formalGroups.includes(group));
  const boundedMediaDeclared = batch.limitations.some((item) => item.startsWith("bounded_media_retry_once:"));
  const unavailable = batch.items.filter((item) => !verifiedStates.has(item.state));
  const onlyBoundedMediaUnavailable = unavailable.length > 0 && unavailable.every((item) =>
    item.state === "blocked" && item.failedGateIds.includes("media_verification"));
  const allVerified = batch.requestedPosts > 0 && verifiedItems.length === batch.requestedPosts;
  const boundedMediaGap = !allVerified && boundedMediaDeclared && onlyBoundedMediaUnavailable && missingFormalGroups.length === 0;
  const formalAllowed = allVerified || boundedMediaGap;
  const provisionalAllowed = builtItems.length > 0 && missingProvisionalGroups.length === 0;
  return {
    allowed: formalAllowed,
    provisionalAllowed,
    formalAllowed,
    boundedMediaGap,
    builtPosts: builtItems.length,
    verifiedPosts: verifiedItems.length,
    missingProvisionalGroups,
    missingFormalGroups
  };
}
