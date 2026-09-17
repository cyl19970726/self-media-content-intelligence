import { describe, expect, it, vi } from "vitest";
import type { ArtifactRef, PhaseContext } from "./contracts.js";
import type { AgentRunRequest, AgentRunResult, AgentRunner, ChildWorkflowDispatcher, ChildWorkflowDispatchRequest } from "./ports.js";
import { MemoryRunStore } from "./memory-run-store.js";
import { artifactPayloadSha256, defineAgent, runWorkflow, workflow, workflowFingerprint, WorkflowCanceledError } from "./runtime.js";

class StubRunner implements AgentRunner {
  calls = 0;
  constructor(private readonly implementation: (request: AgentRunRequest<unknown>) => Promise<AgentRunResult<unknown>>) {}
  async run<Input, Output>(request: AgentRunRequest<Input>): Promise<AgentRunResult<Output>> {
    this.calls++;
    return this.implementation(request as AgentRunRequest<unknown>) as Promise<AgentRunResult<Output>>;
  }
}

const noAgent = new StubRunner(async () => { throw new Error("Unexpected agent call"); });

describe("workflow runtime", () => {
  it("runs fresh, replays exact validated nodes, and invalidates changed input", async () => {
    const store = new MemoryRunStore();
    const action = vi.fn((value: number) => value * 2);
    const flow = workflow<number, number>("double", { revision: "v1" }, (ctx, input) => ctx.task("double", action, input));
    const first = await runWorkflow({ workflow: flow, input: 2, store, agentRunner: noAgent });
    const replay = await runWorkflow({ workflow: flow, input: 2, store, agentRunner: noAgent, resumeRunId: first.run.id });
    expect(replay.output).toBe(4);
    expect(action).toHaveBeenCalledTimes(1);
    await expect(runWorkflow({ workflow: flow, input: 3, store, agentRunner: noAgent, resumeRunId: first.run.id }))
      .rejects.toThrow("exact workflow revision and input fingerprint");
  });

  it("reruns an agent when its explicit configuration fingerprint changes", async () => {
    const store = new MemoryRunStore();
    const runner = new StubRunner(async () => ({ output: "done", validation: "valid" }));
    const makeFlow = (model: string) => workflow("agent-config", { revision: "1" }, (ctx, input: string) => ctx.agent("build",
      defineAgent({ id: "builder", revision: "1", model, reasoningEffort: "medium", promptRevision: "1",
        skillsRevision: "1", permissionsRevision: "1" }), input));
    const first = await runWorkflow({ workflow: makeFlow("model-a"), input: "same", store, agentRunner: runner });
    await runWorkflow({ workflow: makeFlow("model-a"), input: "same", store, agentRunner: runner, resumeRunId: first.run.id });
    await runWorkflow({ workflow: makeFlow("model-b"), input: "same", store, agentRunner: runner, resumeRunId: first.run.id });
    expect(runner.calls).toBe(2);
  });

  it("reuses an agent receipt after its explicit downstream validation passes", async () => {
    const store = new MemoryRunStore();
    const runner = new StubRunner(async () => ({ output: { artifact: "candidate" } }));
    const agent = defineAgent({ id: "builder", revision: "1", model: "model", reasoningEffort: "medium",
      promptRevision: "1", skillsRevision: "1", permissionsRevision: "1" });
    const flow = workflow("validated-agent", { revision: "1" }, async (ctx, input: string) => {
      const receipt = await ctx.agent("builder", agent, input);
      await ctx.validate("candidate-check", receipt, () => ({ valid: true }));
      return receipt;
    });
    const first = await runWorkflow({ workflow: flow, input: "same", store, agentRunner: runner });
    await runWorkflow({ workflow: flow, input: "same", store, agentRunner: runner, resumeRunId: first.run.id });
    expect(runner.calls).toBe(1);
    expect((await store.listSteps(first.run.id)).find((step) => step.key === "builder")?.validation).toBe("valid");
  });

  it("creates linked child run and step identities", async () => {
    const store = new MemoryRunStore();
    const child = workflow("child", { revision: "1" }, (ctx, input: string) => ctx.task("work", (value) => value, input));
    const parent = workflow("parent", { revision: "1" }, (ctx, input: string) => ctx.call("child:a", child, input));
    const result = await runWorkflow({ workflow: parent, input: "x", store, agentRunner: noAgent });
    const children = await store.listRuns({ parentRunId: result.run.id });
    expect(children).toHaveLength(1);
    expect(children[0]!.parentStepRunId).toBe((await store.listSteps(result.run.id))[0]!.id);
    expect(children[0]!.id).not.toBe(result.run.id);
  });

  it("settles every mapped item with bounded concurrency", async () => {
    const store = new MemoryRunStore();
    let active = 0;
    let maximum = 0;
    const flow = workflow("map", { revision: "1" }, (ctx, input: number[]) => ctx.mapSettled("items", input,
      { concurrency: 2, itemKey: String }, async (value) => {
        active++; maximum = Math.max(maximum, active);
        await Promise.resolve();
        active--;
        if (value === 2) throw new Error("bad item");
        return value;
      }));
    const result = await runWorkflow({ workflow: flow, input: [1, 2, 3], store, agentRunner: noAgent });
    expect(result.output?.map((item) => item.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
    expect(maximum).toBe(2);
  });

  it("does not reuse a map containing rejected items", async () => {
    const store = new MemoryRunStore();
    let calls = 0;
    const flow = workflow("map-retry", { revision: "1" }, (ctx, input: number[]) => ctx.mapSettled("items", input,
      { concurrency: 1, itemKey: String }, async (value) => { calls++; if (value === 2) throw new Error("retry"); return value; }));
    const first = await runWorkflow({ workflow: flow, input: [1, 2], store, agentRunner: noAgent });
    await runWorkflow({ workflow: flow, input: [1, 2], store, agentRunner: noAgent, resumeRunId: first.run.id });
    expect(calls).toBe(4);
    expect((await store.listSteps(first.run.id)).filter((step) => step.key === "items").every((step) => step.validation === "invalid")).toBe(true);
  });

  it("re-reads a repaired durable child without rerunning successful map children", async () => {
    const store = new MemoryRunStore();
    const childStates = new Map<string, { state: "succeeded" | "failed"; output?: string; error?: string }>([
      ["good", { state: "succeeded", output: "GOOD" }],
      ["bad", { state: "failed", error: "child failed validation" }],
    ]);
    const dispatchCounts = new Map<string, number>();
    const dispatcher: ChildWorkflowDispatcher = { async ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>) {
      const value = (request.input as Input & { value: string }).value;
      dispatchCounts.set(value, (dispatchCounts.get(value) ?? 0) + 1);
      const child = childStates.get(value)!;
      return { childRunId: `child:${value}`, state: child.state,
        output: child.output as Output | undefined, error: child.error };
    } };
    const child = workflow("repairable-map-child", { revision: "1" }, async (_ctx, input: { value: string }) => input.value.toUpperCase());
    const parent = workflow("repairable-map-parent", { revision: "1" }, async (ctx, input: string[]) => {
      const settled = await ctx.mapSettled("children", input,
        { concurrency: 2, itemKey: String }, (value) => ctx.call(`child:${value}`, child, { value }));
      return settled.some((item) => item.status === "rejected") ? ctx.needsReview(settled) : settled;
    });

    const first = await runWorkflow({ workflow: parent, input: ["good", "bad"], store, agentRunner: noAgent,
      childDispatcher: dispatcher });
    expect(first.run.state).toBe("needs_review");
    expect(first.output).toEqual({ ok: false, state: "needs_review", details: [
      { status: "fulfilled", value: "GOOD" },
      { status: "rejected", reason: "child failed validation" },
    ] });

    childStates.set("bad", { state: "succeeded", output: "BAD" });
    const resumed = await runWorkflow({ workflow: parent, input: ["good", "bad"], store, agentRunner: noAgent,
      childDispatcher: dispatcher, resumeRunId: first.run.id });

    expect(resumed.run.state).toBe("succeeded");
    expect(resumed.output).toEqual([
      { status: "fulfilled", value: "GOOD" },
      { status: "fulfilled", value: "BAD" },
    ]);
    expect(dispatchCounts.get("good")).toBe(1);
    expect(dispatchCounts.get("bad")).toBe(2);
    expect((await store.listSteps(first.run.id)).filter((step) => step.key === "children"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ state: "needs_review", validation: "invalid" }),
        expect.objectContaining({ state: "succeeded", validation: "valid" }),
      ]));
  });

  it("runs heterogeneous named branches with bounded concurrency and independent settlement", async () => {
    const store = new MemoryRunStore();
    let active = 0;
    let maximum = 0;
    let stableCalls = 0;
    const flow = workflow("parallel", { revision: "1" }, (ctx) => ctx.parallelSettled("research", {
      text: () => ctx.task("text", async () => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--; stableCalls++; return "ok"; }, null),
      score: () => ctx.task("score", async () => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--; return 7; }, null),
      failure: () => ctx.task("failure", async () => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--; throw new Error("branch failed"); }, null),
    }, { concurrency: 2 }));
    const first = await runWorkflow({ workflow: flow, input: null, store, agentRunner: noAgent });
    expect(first.output).toEqual({ failure: { status: "rejected", reason: "branch failed" },
      score: { status: "fulfilled", value: 7 }, text: { status: "fulfilled", value: "ok" } });
    expect(maximum).toBe(2);
    await runWorkflow({ workflow: flow, input: null, store, agentRunner: noAgent, resumeRunId: first.run.id });
    expect(stableCalls).toBe(1);
  });

  it("limits durable parallel dispatch and resumes successful branches without duplication", async () => {
    const store = new MemoryRunStore();
    const children = new Map<string, { state: "waiting" | "succeeded"; value: string }>();
    const dispatchCounts = new Map<string, number>();
    const dispatcher: ChildWorkflowDispatcher = { async ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>) {
      const value = (request.input as Input & { value: string }).value;
      dispatchCounts.set(value, (dispatchCounts.get(value) ?? 0) + 1);
      const child = children.get(request.parentStepRunId) ?? { state: "waiting" as const, value };
      children.set(request.parentStepRunId, child);
      return { childRunId: `child:${request.parentStepRunId}`, state: child.state,
        output: (child.state === "succeeded" ? child.value.toUpperCase() : undefined) as Output | undefined };
    } };
    const child = workflow("parallel-child", { revision: "1" }, async (_ctx, input: { value: string }) => input.value.toUpperCase());
    const parent = workflow("parallel-parent", { revision: "1" }, (ctx) => ctx.parallel("fanout", {
      alpha: () => ctx.call("child:alpha", child, { value: "alpha" }),
      beta: () => ctx.call("child:beta", child, { value: "beta" }),
      gamma: () => ctx.call("child:gamma", child, { value: "gamma" }),
    }, { concurrency: 2 }));
    const first = await runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent, childDispatcher: dispatcher });
    expect(first.run.state).toBe("waiting");
    expect(children.size).toBe(2);
    for (const item of children.values()) item.state = "succeeded";
    const second = await runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent,
      childDispatcher: dispatcher, resumeRunId: first.run.id });
    expect(second.run.state).toBe("waiting");
    expect(children.size).toBe(3);
    for (const item of children.values()) item.state = "succeeded";
    const completed = await runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent,
      childDispatcher: dispatcher, resumeRunId: first.run.id });
    expect(completed.output).toEqual({ alpha: "ALPHA", beta: "BETA", gamma: "GAMMA" });
    expect(dispatchCounts.get("alpha")).toBe(2);
    expect(dispatchCounts.get("beta")).toBe(2);
    expect(dispatchCounts.get("gamma")).toBe(2);
    expect((await store.listSteps(first.run.id)).filter((step) => step.kind === "parallel" && step.state === "succeeded"))
      .toHaveLength(3);
  });

  it("persists nested phase definitions, scoped steps, events, and artifact bindings", async () => {
    const store = new MemoryRunStore();
    const flow = workflow("phased", { revision: "1" }, (ctx) => ctx.phase("outer", {
      title: "Collect evidence", purpose: "Create the evidence package", order: 1,
      expectedArtifacts: [{ role: "evidence", title: "Evidence", required: true }],
    }, async (outer) => {
      const artifact = await outer.publish("evidence", "evidence", { frozen: true }, { validation: "valid" });
      await outer.bindArtifact({ ...artifact, type: "forged-caller-type",
        producedBy: { ...artifact.producedBy, workflowRunId: "forged-run" } },
      { role: "evidence", title: "Primary evidence", primary: true });
      const nested = await outer.phase("review", { title: "Review", purpose: "Check evidence" },
        (review) => review.task("check", () => "accepted", null));
      return { artifact, nested };
    }));
    const result = await runWorkflow({ workflow: flow, input: null, store, agentRunner: noAgent });
    expect(result.run.state).toBe("succeeded");
    const steps = await store.listSteps(result.run.id);
    const outer = steps.find((step) => step.key === "outer")!;
    const nested = steps.find((step) => step.key === "outer:review")!;
    expect(outer).toMatchObject({ kind: "phase", phasePath: ["outer"],
      phaseDefinition: { title: "Collect evidence", purpose: "Create the evidence package" },
      artifactBindings: [{ role: "evidence", title: "Primary evidence", primary: true }] });
    expect(outer.artifactBindings?.[0]?.artifact.id).toBe(result.output?.artifact.id);
    expect(outer.artifactBindings?.[0]?.artifact).toMatchObject({ type: "evidence",
      producedBy: { workflowRunId: result.run.id } });
    expect(nested).toMatchObject({ kind: "phase", phasePath: ["outer", "review"] });
    expect(steps.find((step) => step.key === "outer:evidence")?.phaseId).toBe(outer.phaseId);
    expect(steps.find((step) => step.key === "outer:review:check")?.phaseId).toBe(nested.phaseId);
    expect((await store.listEvents(result.run.id)).map((event) => event.type)).toEqual(expect.arrayContaining([
      "phase.started", "phase.artifact_bound", "phase.completed",
    ]));
  });

  it("keeps parallel phase ownership isolated", async () => {
    const store = new MemoryRunStore();
    const flow = workflow("parallel-phases", { revision: "1" }, (ctx) => ctx.parallel("round", {
      alpha: () => ctx.phase("alpha", { title: "Alpha", purpose: "Alpha branch" },
        (phase) => phase.task("work", () => "a", null)),
      beta: () => ctx.phase("beta", { title: "Beta", purpose: "Beta branch" },
        (phase) => phase.task("work", () => "b", null)),
    }, { concurrency: 2 }));
    const result = await runWorkflow({ workflow: flow, input: null, store, agentRunner: noAgent });
    const steps = await store.listSteps(result.run.id);
    const alpha = steps.find((step) => step.key === "alpha")!;
    const beta = steps.find((step) => step.key === "beta")!;
    expect(alpha.phaseId).not.toBe(beta.phaseId);
    expect(steps.find((step) => step.key === "alpha:work")).toMatchObject({ phaseId: alpha.phaseId, phasePath: ["alpha"] });
    expect(steps.find((step) => step.key === "beta:work")).toMatchObject({ phaseId: beta.phaseId, phasePath: ["beta"] });
  });

  it("keeps a stable phase instance and child metadata across durable resume", async () => {
    const store = new MemoryRunStore();
    let childState: "waiting" | "succeeded" = "waiting";
    const metadata: Array<Readonly<Record<string, unknown>> | undefined> = [];
    const dispatcher: ChildWorkflowDispatcher = { async ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>) {
      metadata.push(request.metadata);
      return { childRunId: "durable-phase-child", state: childState,
        output: (childState === "succeeded" ? "done" : undefined) as Output | undefined };
    } };
    const child = workflow("phase-child", { revision: "1" }, async () => "done");
    const parent = workflow("phase-parent", { revision: "1" }, (ctx) => ctx.phase("research",
      { title: "Research", purpose: "Run durable child" }, (phase) => phase.call("child", child, null)));
    const first = await runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent, childDispatcher: dispatcher });
    expect(first.run.state).toBe("waiting");
    childState = "succeeded";
    const resumed = await runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent,
      childDispatcher: dispatcher, resumeRunId: first.run.id });
    expect(resumed.output).toBe("done");
    const phaseSteps = (await store.listSteps(first.run.id)).filter((step) => step.kind === "phase");
    expect(new Set(phaseSteps.map((step) => step.phaseId)).size).toBe(1);
    expect(metadata).toHaveLength(2);
    expect(metadata[0]).toMatchObject({ phaseId: phaseSteps[0]!.phaseId, phasePath: ["research"] });
    expect(metadata[1]).toMatchObject({ phaseId: phaseSteps[0]!.phaseId, phasePath: ["research"] });
  });

  it("does not let an inherited child context bind artifacts to its parent phase", async () => {
    const store = new MemoryRunStore();
    const child = workflow<{ artifact: ArtifactRef }, void>("phase-binding-child", { revision: "1" },
      async (ctx, input) => {
        await (ctx as PhaseContext).bindArtifact(input.artifact, { role: "forbidden-child-binding" });
      });
    const parent = workflow("phase-binding-parent", { revision: "1" }, (ctx) => ctx.phase("parent",
      { title: "Parent", purpose: "Own artifact bindings" }, async (phase) => {
        const artifact = await phase.publish("artifact", "evidence", { value: true }, { validation: "valid" });
        await phase.call("child", child, { artifact });
      }));
    await expect(runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent }))
      .rejects.toThrow("Inherited child phase context cannot bind its parent phase");
    const runs = await store.listRuns();
    const parentRun = runs.find((run) => run.workflowId === "phase-binding-parent")!;
    const childRun = runs.find((run) => run.workflowId === "phase-binding-child")!;
    expect(parentRun.state).toBe("failed");
    expect(childRun.state).toBe("failed");
    const phaseStep = (await store.listSteps(parentRun.id)).find((step) => step.kind === "phase")!;
    expect(phaseStep.artifactBindings).toBeUndefined();
    expect((await store.listEvents(childRun.id)).some((event) => event.type === "workflow.failed")).toBe(true);
  });

  it("records terminal phase quality separately from successful execution", async () => {
    const store = new MemoryRunStore();
    const flow = workflow("blocked-phase", { revision: "1" }, (ctx) => ctx.phase("evidence",
      { title: "Evidence", purpose: "Require source" }, (phase) => phase.blocked({ missing: "source" })));
    const result = await runWorkflow({ workflow: flow, input: null, store, agentRunner: noAgent });
    expect(result.run.state).toBe("blocked");
    expect((await store.listSteps(result.run.id))[0]).toMatchObject({ kind: "phase", state: "blocked" });
  });

  it("propagates a directly returned blocked child result to the parent run", async () => {
    const store = new MemoryRunStore();
    const child = workflow("blocked-child", { revision: "1" }, async (ctx) => ctx.blocked({ reason: "missing" }));
    const parent = workflow("blocked-parent", { revision: "1" }, (ctx) => ctx.call("child", child, null));
    const result = await runWorkflow({ workflow: parent, input: null, store, agentRunner: noAgent });
    expect(result.run.state).toBe("blocked");
    expect((await store.listRuns({ parentRunId: result.run.id }))[0]?.state).toBe("blocked");
  });

  it("dispatches every bounded map child before suspending and reuses them on resume", async () => {
    const store = new MemoryRunStore();
    const children = new Map<string, { state: "waiting" | "succeeded"; value: number }>();
    const dispatcher: ChildWorkflowDispatcher = { async ensureChild<Input, Output>(request: ChildWorkflowDispatchRequest<Input>) {
      const child = children.get(request.parentStepRunId) ?? { state: "waiting" as const, value: (request.input as Input & { value: number }).value };
      children.set(request.parentStepRunId, child);
      return { childRunId: `child:${request.parentStepRunId}`, state: child.state,
        output: (child.state === "succeeded" ? child.value * 2 : undefined) as Output | undefined };
    } };
    const child = workflow("mapped-child", { revision: "1" }, async (_ctx, input: { value: number }) => input.value * 2);
    const parent = workflow("mapped-parent", { revision: "1" }, (ctx, input: number[]) => ctx.mapSettled("mapped", input,
      { concurrency: 2, itemKey: String }, (value) => ctx.call(`child:${value}`, child, { value })));
    const first = await runWorkflow({ workflow: parent, input: [1, 2, 3], store, agentRunner: noAgent, childDispatcher: dispatcher });
    expect(first.run.state).toBe("waiting");
    expect(children.size).toBe(3);
    for (const item of children.values()) item.state = "succeeded";
    const resumed = await runWorkflow({ workflow: parent, input: [1, 2, 3], store, agentRunner: noAgent,
      childDispatcher: dispatcher, resumeRunId: first.run.id });
    expect(resumed.run.state).toBe("succeeded");
    expect(resumed.output).toEqual([
      { status: "fulfilled", value: 2 }, { status: "fulfilled", value: 4 }, { status: "fulfilled", value: 6 },
    ]);
    expect(children.size).toBe(3);
  });

  it("propagates cancellation to an active agent and records canceled state", async () => {
    const store = new MemoryRunStore();
    const controller = new AbortController();
    const runner = new StubRunner((request) => new Promise((_resolve, reject) => {
      request.signal.addEventListener("abort", () => reject(new WorkflowCanceledError()), { once: true });
    }));
    const agent = defineAgent({ id: "a", revision: "1", model: "gpt-explicit", reasoningEffort: "medium",
      promptRevision: "1", skillsRevision: "1", permissionsRevision: "1" });
    const flow = workflow("cancel", { revision: "1" }, (ctx, input: string) => ctx.agent("agent", agent, input));
    const running = runWorkflow({ workflow: flow, input: "x", store, agentRunner: runner, signal: controller.signal });
    await vi.waitFor(() => expect(runner.calls).toBe(1));
    controller.abort();
    await expect(running).rejects.toThrow("canceled");
    expect(store.runs[0]!.state).toBe("canceled");
    expect(store.steps[0]!.state).toBe("canceled");
  });

  it("keeps execution failure, invalid validation, and needs-review terminal distinct", async () => {
    const failedStore = new MemoryRunStore();
    const failed = workflow("failed", { revision: "1" }, (ctx, input: string) => ctx.task("explode", () => { throw new Error("boom"); }, input));
    await expect(runWorkflow({ workflow: failed, input: "x", store: failedStore, agentRunner: noAgent })).rejects.toThrow("boom");
    expect(failedStore.runs[0]!.state).toBe("failed");

    const reviewStore = new MemoryRunStore();
    const review = workflow("review", { revision: "1" }, async (ctx, input: string) => {
      const checked = await ctx.validate("check", input, () => ({ valid: false, details: "contract" }));
      return ctx.needsReview(checked);
    });
    const result = await runWorkflow({ workflow: review, input: "x", store: reviewStore, agentRunner: noAgent });
    expect(result.run.state).toBe("needs_review");
    expect((await reviewStore.listSteps(result.run.id))[0]!.validation).toBe("invalid");
  });

  it("stores an immutable artifact snapshot with a SHA-256 digest", async () => {
    const store = new MemoryRunStore();
    const payload = { nested: { value: 1 } };
    const flow = workflow("publish", { revision: "1" }, (ctx) => ctx.publish("artifact", "example", payload, { validation: "valid" }));
    const result = await runWorkflow({ workflow: flow, input: null, store, agentRunner: noAgent });
    payload.nested.value = 2;
    const artifact = result.output!;
    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect((store.artifacts[0]!.payload as { nested: { value: number } }).nested.value).toBe(1);
    await expect(store.getArtifact(artifact.id)).resolves.toEqual(artifact);
  });

  it("fingerprints the JSON-persisted value when optional fields are undefined", async () => {
    const memoryValue = { required: "same", optional: undefined, nested: [1, undefined] };
    const persistedValue = JSON.parse(JSON.stringify(memoryValue)) as unknown;
    expect(workflowFingerprint(memoryValue)).toBe(workflowFingerprint(persistedValue));
    await expect(artifactPayloadSha256(memoryValue)).resolves.toBe(await artifactPayloadSha256(persistedValue));
  });
});
