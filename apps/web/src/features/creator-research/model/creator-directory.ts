import type { CreatorDossier, CreatorResearchRun } from "../../../shared/contracts/core";
import { creatorProgress } from "./creator-progress";

export function isCompletedResearch(run: CreatorResearchRun): boolean {
  return run.status === "ready" && Boolean(run.synthesisArtifactRef)
    && run.stages.some((stage) => stage.id === "synthesis" && stage.status === "complete");
}

/** Keep an earlier completed result available while a newer research run advances. */
export function splitCreatorResearch(runs: CreatorResearchRun[]) {
  const latest = new Map<string, CreatorResearchRun>();
  const completed = new Map<string, CreatorResearchRun>();
  const ordered = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.updatedAt.localeCompare(a.updatedAt));
  for (const run of ordered) {
    if (!run.creatorId && run.source.kind === "legacy_import") continue;
    const key = run.creatorId ?? run.profileUrl.replace(/[?#].*$/, "").replace(/\/$/, "");
    if (!latest.has(key)) latest.set(key, run);
    if (isCompletedResearch(run) && !completed.has(key)) completed.set(key, run);
  }
  return { active: [...latest.values()].filter((run) => !isCompletedResearch(run)), completed: [...completed.values()] };
}

export function researchStageLabel(run: CreatorResearchRun): string {
  return creatorProgress({ run } as CreatorDossier).headline;
}
