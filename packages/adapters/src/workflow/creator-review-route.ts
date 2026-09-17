export type CreatorReviewRoute = "deliver" | "source_gap" | "repair";

/**
 * Routes a creator synthesis review without treating provisional maturity as
 * evidence that every failed quality gate is an acceptable source gap.
 */
export function creatorReviewRoute(
  outcome: { state?: string },
  gate: { ready?: boolean; failedGateIds?: string[] }
): CreatorReviewRoute {
  if (gate.ready === true) return "deliver";

  const failedGateIds = gate.failedGateIds;
  if (!failedGateIds?.length) return "repair";

  const sourceIncompleteOnly = failedGateIds.every((id) => id === "deep_9_ready");
  if (!sourceIncompleteOnly) return "repair";

  return outcome.state === "provisional" ? "deliver" : "source_gap";
}
