import { expect, it } from "vitest";
import type { ArtifactRef } from "@signal-room/workflow";
import { projectWorkflowPhases } from "./workflow-phase-projection.js";

const run = (id: string, parentRunId?: string) => ({ id, workflowId: "post.analyze", workflowRevision: "v5", inputFingerprint: "x", state: "succeeded" as const,
  ...(parentRunId ? { parentRunId } : {}), metadata: { creatorRunId: "creator-a", postId: "post-a" } });
const phase = (id: string, runId: string, phaseId: string, path: string[], bindings: unknown[] = []) => ({ id, runId, key: id, kind: "phase" as const,
  workflowId: "post.analyze", workflowRevision: "v5", inputFingerprint: "x", configFingerprint: "x", state: "succeeded" as const, validation: "valid" as const,
  phaseId, phasePath: path, phaseDefinition: { title: phaseId, purpose: "研究阶段", expectedArtifacts: [{ role: "candidate", required: true }] }, artifactBindings: bindings });
const artifact = (id: string, owner: string): ArtifactRef => ({ id, type: "post-candidate", schemaVersion: "v1", revision: "1", sha256: id.padEnd(64, "a"), uri: `workflow://${id}`,
  producedBy: { workflowRunId: owner, stepRunId: "model", attemptId: "attempt" }, dependsOn: [], validation: "valid", review: "pending" });

function storeFor(runs: ReturnType<typeof run>[], steps: Array<ReturnType<typeof phase> | Record<string, unknown>>, assets: ArtifactRef[] = []) {
  return { listRuns: async () => runs, getRun: async (id: string) => runs.find((item) => item.id === id),
    listSteps: async (id: string) => steps.filter((step) => step.runId === id), listAttempts: async () => [], listEvents: async () => [],
    listArtifacts: async (id: string) => assets.filter((item) => item.producedBy.workflowRunId === id),
    getArtifact: async (id: string) => assets.find((item) => item.id === id) };
}

it("uses the shared stage identity and exact binding for advanced audit", async () => {
  const root = run("root"), output = artifact("candidate", "root"), foreign = artifact("foreign", "other");
  const binding = { artifact: output, role: "candidate", primary: true };
  const invalid = { artifact: { ...foreign, sha256: "wrong" }, role: "candidate" };
  const store = storeFor([root, run("other")], [phase("phase-step", "root", "build", ["build"], [binding, invalid])], [output, foreign]);
  const result = await projectWorkflowPhases(store as never, root as never);
  expect(result).toMatchObject([{ id: "phase-step", title: "build", state: "succeeded", subjectId: "post-a",
    expectedArtifacts: [{ role: "candidate" }], artifacts: [{ role: "candidate", ownerRunId: "root", artifact: { id: "candidate" } }] }]);
  expect(result[0]?.artifacts).toHaveLength(1);
});

it("keeps sibling run phases distinct and returns no invented historical stage", async () => {
  const root = run("root"), a = run("a", "root"), b = run("b", "root");
  const steps = [phase("parent", "root", "research", ["research"]), phase("a-phase", "a", "build", ["research", "build"]), phase("b-phase", "b", "build", ["research", "build"])];
  const store = storeFor([root, a, b], steps);
  const result = await projectWorkflowPhases(store as never, root as never);
  expect(result.map((item) => item.id)).toEqual(["parent", "a-phase", "b-phase"]);
  expect(result.filter((item) => item.parentPhaseId === "parent")).toHaveLength(2);
  expect(await projectWorkflowPhases(storeFor([root], []) as never, root as never)).toEqual([]);
});

it("keeps a successful phase with review incomplete in needs review state", async () => {
  const root = run("root");
  const step = { ...phase("review-step", "root", "review", ["review"]), output: { stageStatus: "review_incomplete" } };
  const result = await projectWorkflowPhases(storeFor([root], [step]) as never, root as never);
  expect(result).toMatchObject([{ id: "review-step", state: "needs_review" }]);
});
