import { expect, it } from "vitest";
import type { ArtifactRef } from "@signal-room/workflow";
import { projectWorkflowPhases } from "./workflow-phase-projection.js";

const artifact = (id: string, owner: string): ArtifactRef => ({ id, type: "post-candidate", schemaVersion: "v1", revision: "1", sha256: id.padEnd(64, "a"), uri: `workflow://${id}`,
  producedBy: { workflowRunId: owner, stepRunId: "step", attemptId: "attempt" }, dependsOn: [], validation: "valid", review: "pending" });

it("projects explicit same-creator phase bindings while rejecting another creator's asset", async () => {
  const root = { id: "root", workflowId: "creator.analyze", workflowRevision: "v2", inputFingerprint: "x", state: "running" as const, metadata: { creatorRunId: "creator-a" } };
  const reused = artifact("reused", "other-same-creator");
  const foreign = artifact("foreign", "other-creator");
  const childOutput = artifact("child-output", "child");
  const steps = [{ id: "phase-step", runId: "root", key: "build", kind: "workflow" as const, workflowId: "creator.analyze", workflowRevision: "v2", inputFingerprint: "x", configFingerprint: "x", state: "running" as const, validation: "pending" as const,
    phaseId: "research", phasePath: ["research"], phaseDefinition: { title: "构建研究", purpose: "建立可读候选", order: 2, expectedArtifacts: [{ role: "candidate", required: true }, { role: "evaluation", title: "独立复核", required: true }] },
    artifactBindings: [{ artifact: reused, role: "candidate", primary: true }, { artifact: foreign, role: "evaluation" }] },
  { id: "agent-step", runId: "child", key: "research:builder", kind: "agent" as const, workflowId: "post.build", workflowRevision: "v2", inputFingerprint: "x", configFingerprint: "x", state: "running" as const, validation: "pending" as const, phaseId: "research", phasePath: ["research"] }];
  const runs = [root, { ...root, id: "child", parentRunId: "root", metadata: { creatorRunId: "creator-a", phaseId: "research", postId: "post-1" } },
    { ...root, id: "other-same-creator", parentRunId: undefined }, { ...root, id: "other-creator", metadata: { creatorRunId: "creator-b" } }];
  const store = {
    listRuns: async () => runs,
    getRun: async (id: string) => runs.find((run) => run.id === id),
    listSteps: async (id: string) => id === root.id ? [steps[0]] : id === "child" ? [steps[1]] : [],
    listAttempts: async (id: string) => id === "agent-step" ? [{ id: "attempt", runId: "child", stepRunId: "agent-step", state: "running" }] : [],
    listEvents: async (id: string) => id === root.id
      ? [{ id: "usage-parent", runId: root.id, attemptId: "attempt", type: "agent.usage", data: { childRunId: "sdk-child", usage: { inputTokens: 5, cachedInputTokens: null, outputTokens: 3, reasoningOutputTokens: null } } },
        { id: "completed-parent", runId: root.id, attemptId: "attempt", type: "agent.completed", data: { threadId: "sdk-child", usage: { inputTokens: 999, cachedInputTokens: 999, outputTokens: 999, reasoningOutputTokens: 999 } } }]
      : id === "child" ? [{ id: "usage-child", runId: "child", attemptId: "attempt", type: "agent.usage", data: { childRunId: "sdk-child", usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 300, reasoningOutputTokens: 0 } } }] : [],
    listArtifacts: async (id: string) => id === "child" ? [childOutput, reused] : [],
    getArtifact: async (id: string) => id === reused.id ? reused : id === foreign.id ? foreign : undefined,
  };
  const phases = await projectWorkflowPhases(store as never, root as never);
  expect(phases).toMatchObject([{ id: "research", title: "构建研究", subjectId: "post-1", state: "running", expectedArtifacts: [{ role: "candidate" }, { role: "evaluation" }],
    usage: { attempts: 1, inputTokens: 5, outputTokens: 3, unknown: true }, artifacts: [{ role: "candidate", ownerRunId: "other-same-creator", artifact: { id: "reused" } }, { role: "published-output", ownerRunId: "child", artifact: { id: "child-output" } }] }]);
  expect(phases[0]?.artifacts).toHaveLength(2);
  expect(phases[0]?.artifacts.filter((asset) => asset.artifact.id === "reused")).toHaveLength(1);
});

it("uses SDK completion usage when no legacy usage event exists", async () => {
  const root = { id: "root", workflowId: "post", workflowRevision: "v5", inputFingerprint: "x", state: "succeeded" as const };
  const phase = { id: "phase", runId: "root", key: "review", kind: "phase" as const, workflowId: "post", workflowRevision: "v5", inputFingerprint: "x", configFingerprint: "x", state: "succeeded" as const, validation: "valid" as const,
    phaseId: "review", phasePath: ["review"], phaseDefinition: { title: "Review", purpose: "Review candidate" } };
  const agent = { ...phase, id: "agent", key: "reviewer", kind: "agent" as const };
  const store = { listRuns: async () => [root], getRun: async () => root, listSteps: async () => [phase, agent],
    listAttempts: async (id: string) => id === "agent" ? [{ id: "attempt", runId: "root", stepRunId: "agent", state: "succeeded" }] : [],
    listEvents: async () => [{ id: "completed", runId: "root", attemptId: "attempt", type: "agent.completed", data: { threadId: "thread-1", usage: { inputTokens: 12, cachedInputTokens: 4, outputTokens: 5, reasoningOutputTokens: 2 } } }],
    listArtifacts: async () => [], getArtifact: async () => undefined };
  await expect(projectWorkflowPhases(store as never, root as never)).resolves.toMatchObject([{ usage: {
    attempts: 1, inputTokens: 12, cachedInputTokens: 4, outputTokens: 5, reasoningOutputTokens: 2, unknown: false
  } }]);
});

it.each(["review_incomplete", "revision_incomplete"] as const)("projects successful phase output %s as needs_review", async (stageStatus) => {
  const root = { id: "root", workflowId: "post", workflowRevision: "v5", inputFingerprint: "x", state: "succeeded" as const };
  const phase = { id: "phase", runId: "root", key: "review", kind: "phase" as const, workflowId: "post", workflowRevision: "v5", inputFingerprint: "x", configFingerprint: "x", state: "succeeded" as const, validation: "valid" as const,
    output: { stageStatus }, phaseId: "review", phasePath: ["review"], phaseDefinition: { title: "Review", purpose: "Review candidate" } };
  const store = { listRuns: async () => [root], getRun: async () => root, listSteps: async () => [phase], listAttempts: async () => [],
    listEvents: async () => [], listArtifacts: async () => [], getArtifact: async () => undefined };
  await expect(projectWorkflowPhases(store as never, root as never)).resolves.toMatchObject([{ state: "needs_review", reason: expect.any(String) }]);
});

it("groups nested phase instances under their durable parent", async () => {
  const root = { id: "root", workflowId: "post", workflowRevision: "v2", inputFingerprint: "x", state: "running" as const };
  const phase = (id: string, path: string[], state: "succeeded" | "failed") => ({ id, runId: "root", key: id, kind: "phase" as const, workflowId: "post", workflowRevision: "v2", inputFingerprint: "x", configFingerprint: "x", state, validation: "valid" as const,
    phaseId: id, phasePath: path, phaseDefinition: { title: id, purpose: "nested phase" } });
  const store = { listRuns: async () => [root], listSteps: async () => [phase("first", ["research"], "succeeded"), phase("second", ["research", "review"], "failed")], listAttempts: async () => [], listEvents: async () => [], listArtifacts: async () => [], getArtifact: async () => undefined };
  const phases = await projectWorkflowPhases(store as never, root as never);
  expect(phases.map((item) => [item.id, item.parentPhaseId, item.depth, item.state])).toEqual([["first", undefined, 0, "succeeded"], ["second", "first", 1, "failed"]]);
});

it("does not assign one post subject to a phase shared by multiple posts", async () => {
  const root = { id: "root", workflowId: "creator.analyze", workflowRevision: "v3", inputFingerprint: "x", state: "running" as const };
  const phase = (id: string, runId: string, postId: string) => ({ id, runId, key: id, kind: "phase" as const, workflowId: "post.build", workflowRevision: "v3", inputFingerprint: "x", configFingerprint: "x", state: "succeeded" as const, validation: "valid" as const,
    phaseId: id, phasePath: ["post-research"], phaseDefinition: { title: "单帖研究", purpose: "分别研究帖子" }, metadata: { phaseId: id, postId } });
  const runs = [root, { ...root, id: "child-a", parentRunId: "root", metadata: { phaseId: "shared", postId: "post-a" } }, { ...root, id: "child-b", parentRunId: "root", metadata: { phaseId: "shared", postId: "post-b" } }];
  const steps = [phase("shared", "root", "post-a"), phase("shared", "child-a", "post-a"), phase("shared", "child-b", "post-b")];
  const store = { listRuns: async () => runs, getRun: async (id: string) => runs.find((run) => run.id === id), listSteps: async (id: string) => steps.filter((step) => step.runId === id), listAttempts: async () => [], listEvents: async () => [], listArtifacts: async () => [], getArtifact: async () => undefined };
  const result = await projectWorkflowPhases(store as never, root as never);
  expect(result[0]).not.toHaveProperty("subjectId");
});

it("does not invent phases for historical runs without phase metadata", async () => {
  const root = { id: "old", workflowId: "post", workflowRevision: "v1", inputFingerprint: "x", state: "succeeded" as const };
  const store = { listRuns: async () => [root], listSteps: async () => [{ id: "step", runId: "old", key: "builder", kind: "agent", workflowId: "post", workflowRevision: "v1", inputFingerprint: "x", configFingerprint: "x", state: "succeeded", validation: "valid" }], listAttempts: async () => [], listEvents: async () => [], getArtifact: async () => undefined };
  await expect(projectWorkflowPhases(store as never, root as never)).resolves.toEqual([]);
});

it("projects a canceled owner onto a waiting phase without extending its elapsed time", async () => {
  const root = { id: "root", workflowId: "post", workflowRevision: "v3", inputFingerprint: "x", state: "canceled" as const };
  const phase = (id: string, state: "waiting" | "succeeded") => ({ id, runId: "root", key: id, kind: "phase" as const, workflowId: "post", workflowRevision: "v3", inputFingerprint: "x", configFingerprint: "x", state, validation: "valid" as const,
    phaseId: id, phasePath: [id], phaseDefinition: { title: id, purpose: "phase" } });
  const steps = [phase("canceled-phase", "waiting"), phase("completed-phase", "succeeded")];
  const store = { listRuns: async () => [root], getRun: async (id: string) => id === root.id ? root : undefined,
    listSteps: async () => steps, listAttempts: async () => [], listEvents: async () => [
      { id: "start-canceled", runId: "root", seq: 1, type: "phase.started", timestamp: "2026-09-16T00:00:00.000Z", data: { phaseId: "canceled-phase" } },
      { id: "start-completed", runId: "root", seq: 2, type: "phase.started", timestamp: "2026-09-16T00:00:00.000Z", data: { phaseId: "completed-phase" } },
      { id: "cancel", runId: "root", seq: 3, type: "cancellation.requested", timestamp: "2026-09-16T00:00:05.000Z" }
    ], listArtifacts: async () => [], getArtifact: async () => undefined };
  const result = await projectWorkflowPhases(store as never, root as never);
  expect(result.find((item) => item.id === "canceled-phase")).toMatchObject({ state: "canceled", elapsedMs: 5000, stepCounts: { canceled: 1 } });
  expect(result.find((item) => item.id === "canceled-phase")).not.toHaveProperty("reason");
  expect(result.find((item) => item.id === "completed-phase")).toMatchObject({ state: "succeeded" });
});

it("keeps generic sibling phase trees separate and aggregates only unique model attempts", async () => {
  const root = { id: "root", workflowId: "generic", workflowRevision: "1", state: "running" };
  const runs = [root, ...["a", "b"].map(id => ({ ...root, id, parentRunId: "root", metadata: { phaseId: "outer" } }))];
  const phase = (id: string, runId: string, phasePath: string[]) => ({ id, runId, key: id, kind: "phase", state: "succeeded", phaseId: id, phasePath, phaseDefinition: { title: id, purpose: id } });
  const model = (id: string, runId: string, phaseId: string, state: string) => ({ id, runId, key: "model", kind: "agent", phaseId, state });
  const steps = [phase("outer", "root", ["research"]), phase("a-child", "a", ["research", "build"]), phase("b-child", "b", ["research", "build"]), phase("a-deep", "a", ["research", "build", "check"]), phase("b-deep", "b", ["research", "build", "check"]), model("old", "a", "a-deep", "failed"), model("new", "a", "a-deep", "succeeded"), model("b-model", "b", "b-deep", "running")];
  const attempts = ["old", "new", "b-model"].map(id => ({ id: `attempt-${id}`, stepRunId: id }));
  const measured = { inputTokens: 10, cachedInputTokens: 0, outputTokens: 3, reasoningOutputTokens: 0 };
  const store = { listRuns: async () => runs, getRun: async (id: string) => runs.find(run => run.id === id), listSteps: async (id: string) => steps.filter(step => step.runId === id), listAttempts: async (id: string) => attempts.filter(attempt => attempt.stepRunId === id), listEvents: async (id: string) => id === "a" ? [1, 2].map(n => ({ id: String(n), type: "agent.usage", attemptId: "attempt-new", data: { usage: measured } })) : [], listArtifacts: async () => [], getArtifact: async () => undefined };
  const result = await projectWorkflowPhases(store as never, root as never);
  expect(result.find(phase => phase.id === "a-deep")).toMatchObject({ parentPhaseId: "a-child", depth: 2, stepCounts: { succeeded: 2 }, usage: { attempts: 2, inputTokens: 10, unknown: true } });
  expect(result.find(phase => phase.id === "b-deep")).toMatchObject({ parentPhaseId: "b-child", depth: 2 });
  expect(result.find(phase => phase.id === "outer")?.usage).toMatchObject({ attempts: 3, inputTokens: 10, outputTokens: 3, unknown: true });
});
