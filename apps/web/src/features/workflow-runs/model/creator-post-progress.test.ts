import { describe, expect, it } from "vitest";
import type { RunView, StageView } from "@signal-room/workflow-read-model/contracts";
import { childWorkflowTitle, orderCreatorPostGroups, projectStageProgress } from "./creator-post-progress";

describe("creator post progress projection", () => {
  it("brings active posts first and keeps their existing order within each state", () => {
    const groups = [
      { rootRunId: "queued-old", postId: "q1", stageIds: [], state: "queued" },
      { rootRunId: "done", postId: "done", stageIds: [], state: "succeeded" },
      { rootRunId: "running-a", postId: "r1", stageIds: [], state: "running" },
      { rootRunId: "waiting", postId: "w1", stageIds: [], state: "waiting" },
      { rootRunId: "failed", postId: "f1", stageIds: [], state: "failed" },
      { rootRunId: "running-b", postId: "r2", stageIds: [], state: "running" },
    ];
    expect(orderCreatorPostGroups(groups).map((group) => group.rootRunId))
      .toEqual(["running-a", "running-b", "failed", "queued-old", "waiting", "done"]);
    expect(groups.map((group) => group.rootRunId)).toEqual(["queued-old", "done", "running-a", "waiting", "failed", "running-b"]);
  });

  it("projects a directly running child onto its waiting parent stage", () => {
    const projected = projectStageProgress({ state: "waiting", waitingForRunId: "build-child" } as StageView,
      [{ id: "build-child", workflowId: "post.build", state: "running", childRunIds: [] }] as RunView[]);
    expect(projected).toMatchObject({ state: "running", child: { id: "build-child", state: "running" } });
  });

  it("surfaces a known running descendant on the waiting phase", () => {
    const stage = { state: "waiting", waitingForRunId: "build-parent" } as StageView;
    const runs = [
      { id: "build-parent", workflowId: "post.build", state: "waiting", childRunIds: ["build-worker"] },
      { id: "build-worker", workflowId: "post.build", parentRunId: "build-parent", state: "running", childRunIds: [] },
    ] as RunView[];
    const projected = projectStageProgress(stage, runs);
    expect(projected).toMatchObject({ state: "running", child: { id: "build-worker" } });
    expect(childWorkflowTitle(projected.child!.workflowId)).toBe("候选构建");
    expect(stage.state).toBe("waiting");
  });

  it("uses queued child state and preserves unknown or terminal parent status when evidence is absent", () => {
    const queued = projectStageProgress({ state: "waiting", waitingForRunId: "queued-child" } as StageView,
      [{ id: "queued-child", workflowId: "post.build", state: "queued", childRunIds: [] }] as RunView[]);
    expect(queued.state).toBe("queued");
    expect(projectStageProgress({ state: "waiting", waitingForRunId: "missing" } as StageView, []).state).toBe("waiting");
    expect(projectStageProgress({ state: "succeeded", waitingForRunId: "queued-child" } as StageView,
      [{ id: "queued-child", workflowId: "post.build", state: "running", childRunIds: [] }] as RunView[]).state).toBe("succeeded");
    expect(projectStageProgress({ state: "waiting", waitingForRunId: "failed-child" } as StageView,
      [{ id: "failed-child", workflowId: "post.build", state: "failed", childRunIds: [] }] as RunView[]))
      .toMatchObject({ state: "waiting", child: { state: "failed" } });
  });
});
