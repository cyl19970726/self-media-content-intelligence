import { describe, expect, it } from "vitest";
import { MemoryRunStore, runWorkflow, workflow, type AgentRunner, type ChildWorkflowDispatcher, type ChildWorkflowDispatchRequest } from "../../../workflow/index.js";
import { createResearchAgentDefinitions } from "../../../research/src/workflows/agents.js";
import type { PostWorkflowInput } from "../../../research/src/workflows/contracts.js";
import { createPostWorkflowSuiteV5, type SimpleSourceCheckOutput } from "../../../research/src/workflows/simple-review.js";

const noAgent: AgentRunner = { async run() { throw new Error("agent runner must not execute durable children"); } };
const config = { prompt: "test", promptRevision: "1", skillSnapshotsRevision: "1", permissionsRevision: "1", config: { simpleReview: true } };
const agents = createResearchAgentDefinitions({ postSourceChecker: config, postBuilder: config, postReviewer: config, postRepair: config, postEvaluationRepair: config, creatorBuilder: config, creatorReviewer: config, creatorRepair: config });

describe("simple review durable retries", () => {
  it("does not repeat builder or failed review children after a retained candidate reaches needs review", async () => {
    const store = new MemoryRunStore();
    const evidence = await store.publishArtifact({ type: "evidence", schemaVersion: "v1", revision: "1", sha256: "evidence", uri: "memory://evidence", payload: {}, producedBy: { workflowRunId: "seed", stepRunId: "seed", attemptId: "seed" }, dependsOn: [], validation: "valid", review: "not_applicable" });
    const candidate = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "1", sha256: "candidate", uri: "memory://candidate", payload: {}, producedBy: { workflowRunId: "seed", stepRunId: "seed", attemptId: "seed" }, dependsOn: [], validation: "valid", review: "pending" });
    const source = workflow<PostWorkflowInput, SimpleSourceCheckOutput>("post.source-check", { revision: "v3" }, async (ctx) => {
      const artifact = await ctx.publish("source", "post-source-check", {}, { validation: "valid" });
      return { ok: true, artifact, receipt: { artifact: { verdict: "consistent" } } };
    });
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: source });
    const counts = new Map<string, number>();
    const dispatcher: ChildWorkflowDispatcher = { async ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>) {
      counts.set(request.key, (counts.get(request.key) ?? 0) + 1);
      if (request.definition.id === "post.source-check") return { childRunId: "source", state: "succeeded", output: { ok: true, artifact: evidence, receipt: { artifact: { verdict: "consistent" } } } as Output };
      if (request.definition.id === "post.build") return { childRunId: "build", state: "succeeded", output: { ok: true, candidate, receipt: { artifact: {} } } as Output };
      return { childRunId: `failed:${request.key}`, state: "failed", error: "review unavailable" };
    } };
    const input = { creatorRunId: "creator", postExternalId: "post", evidenceKind: "video" as const, evidence };
    const callsFor = (suffix: string) => [...counts.entries()].filter(([key]) => key.endsWith(suffix)).reduce((total, [, count]) => total + count, 0);
    const first = await runWorkflow({ workflow: suite.analyze, input, store, agentRunner: noAgent, childDispatcher: dispatcher });
    expect(first.run.state).toBe("needs_review");
    expect(callsFor("build")).toBe(1);
    expect(callsFor("review:1")).toBe(1);
    expect(callsFor("review:2")).toBe(1);
    const resumed = await runWorkflow({ workflow: suite.analyze, input, store, agentRunner: noAgent, childDispatcher: dispatcher, resumeRunId: first.run.id });
    expect(resumed.run.state).toBe("needs_review");
    expect(callsFor("build")).toBe(1);
    expect(callsFor("review:1")).toBe(1);
    expect(callsFor("review:2")).toBe(1);
  });
});
