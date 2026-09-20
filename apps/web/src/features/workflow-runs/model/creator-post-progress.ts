import type { RunView, StageView } from "@signal-room/workflow-read-model/contracts";
import type { CreatorPostGroup } from "../workflow-runs-api";

const groupPriority: Record<string, number> = {
  running: 0, blocked: 1, needs_review: 1, failed: 1, queued: 2, waiting: 3,
  succeeded: 4, canceled: 5, unknown: 6,
};

/** Bring live work forward while retaining creation order within each state. */
export function orderCreatorPostGroups(groups: CreatorPostGroup[]): CreatorPostGroup[] {
  return groups.map((group, index) => ({ group, index }))
    .sort((a, b) => (groupPriority[a.group.state] ?? 6) - (groupPriority[b.group.state] ?? 6) || a.index - b.index)
    .map(({ group }) => group);
}

const liveStatePriority: Record<string, number> = { running: 0, blocked: 1, needs_review: 2, queued: 3, waiting: 4 };

/** Reflect a known live child on its parent phase without changing the source DTO. */
export function projectStageProgress(stage: StageView, runs: RunView[]): { state: string; child?: RunView } {
  if (stage.state !== "waiting" || !stage.waitingForRunId) return { state: stage.state };
  const byId = new Map(runs.map((run) => [run.id, run]));
  const direct = byId.get(stage.waitingForRunId);
  if (!direct) return { state: stage.state };
  const descendants = runs.filter((run) => {
    let parentId = run.parentRunId;
    const seen = new Set<string>();
    while (parentId && !seen.has(parentId)) {
      if (parentId === direct.id) return true;
      seen.add(parentId);
      parentId = byId.get(parentId)?.parentRunId;
    }
    return false;
  });
  const liveDescendant = descendants.filter((run) => liveStatePriority[run.state] !== undefined)
    .sort((a, b) => liveStatePriority[a.state]! - liveStatePriority[b.state]!)[0];
  const child = direct.state === "running" || direct.state === "queued" || direct.state === "blocked" || direct.state === "needs_review"
    ? direct : liveDescendant;
  if (child && liveStatePriority[child.state] !== undefined) return { state: child.state, child };
  return { state: stage.state, child: direct };
}

export function childWorkflowTitle(workflowId: string): string {
  return ({ "post.build": "候选构建", "post.review": "独立复核", "post.source-check": "来源核对",
    "post.repair": "候选修订", "creator.synthesize": "博主综合" } as Record<string, string>)[workflowId] ?? workflowId;
}
