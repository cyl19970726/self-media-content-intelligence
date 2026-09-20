import { describe, expect, it } from "vitest";
import { MemoryRunStore, runWorkflow, workflow, type AgentRunner } from "@signal-room/workflow";
import { createCreatorSynthesisWorkflow, createCreatorSynthesisWorkflowSuite } from "./creator-synthesis.js";
import { createCreatorAnalysisWorkflow, createCreatorAnalysisWorkflowV3, postWorkflowArtifacts } from "./creator-analysis.js";
import { createPostWorkflow, createPostWorkflowSuite, createPostWorkflowSuiteV3, createPostWorkflowSuiteV4 } from "./post.js";
import { createResearchAgentDefinitions } from "./agents.js";
import type { CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput, PostWorkflowInput, PostWorkflowOutput } from "./contracts.js";

async function inputArtifact(store: MemoryRunStore, type: string) {
  return store.publishArtifact({ type, schemaVersion: "v1", revision: "r1", sha256: `${type}-sha`,
    uri: `memory://${type}`, payload: {}, producedBy: { workflowRunId: "seed", stepRunId: "seed", attemptId: "seed" },
    dependsOn: [], validation: "valid", review: "not_applicable" });
}

describe("research workflows", () => {
  it("retains the review asset when a new-workflow revision fails", async () => {
    const store = new MemoryRunStore();
    const candidate = await inputArtifact(store, "post-candidate");
    const review = await inputArtifact(store, "post-review");
    expect(postWorkflowArtifacts({ ok: false, state: "needs_review", details: {
      kind: "revision_incomplete", candidate, review, reviewStatus: "completed_with_findings",
    } })).toEqual({ candidate, evaluation: review });
  });

  const agentConfig = { prompt: "test", promptRevision: "test", skillSnapshotsRevision: "test",
    permissionsRevision: "test", config: {} };
  const agents = createResearchAgentDefinitions({ postSourceChecker: agentConfig, postBuilder: agentConfig, postReviewer: agentConfig,
    postRepair: agentConfig, postEvaluationRepair: agentConfig,
    creatorBuilder: agentConfig, creatorReviewer: agentConfig, creatorRepair: agentConfig });
  it("defaults every project research agent to Luna at medium effort", () => {
    expect(Object.values(agents).map(({ model, reasoningEffort }) => ({ model, reasoningEffort })))
      .toEqual(Array.from({ length: 8 }, () => ({ model: "gpt-5.6-luna", reasoningEffort: "medium" })));
  });
  it("keeps the post candidate and stops for an invalid evaluation contract", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const calls: string[] = [];
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-builder") return { output: { artifact: { lenses: true } } };
      return { output: { artifact: { invalid: true }, route: "deliver" } };
    } } as AgentRunner;
    const definition = createPostWorkflow({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: false }) }, agents);
    const input = { creatorRunId: crypto.randomUUID(), postExternalId: "p1", evidence };
    const first = await runWorkflow({ workflow: definition, input, store, agentRunner: runner });
    expect(first.run.state).toBe("needs_review");
    expect((await store.listArtifacts(first.run.id)).map((item) => item.type)).toEqual(["post-candidate"]);

    await runWorkflow({ workflow: definition, input, store, agentRunner: runner, resumeRunId: first.run.id });
    expect(calls.filter((id) => id === "post-builder")).toHaveLength(1);
  });

  it("composes post v2 nodes and repairs only an invalid evaluation contract", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const calls: string[] = [];
    const registrations: string[] = [];
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-builder") return { output: { artifact: { candidate: true } } };
      if (request.definition.id === "post-reviewer") return { output: {
        artifact: { valid: false }, route: "deliver", candidateRevisionSha256: "candidate-file-sha" } };
      if (request.definition.id === "post-evaluation-repair") {
        const input = request.input as { candidateRevisionSha256: string };
        return { output: { artifact: { valid: true }, route: "deliver",
          repair: { candidateSha256: input.candidateRevisionSha256, diagnosticRefs: ["repair-diagnostic"] } } };
      }
      throw new Error(`unexpected agent ${request.definition.id}`);
    } } as AgentRunner;
    const suite = createPostWorkflowSuite({ candidate: () => ({ valid: true }),
      evaluation: (value) => ({ valid: (value.artifact as { valid?: boolean }).valid === true }) }, agents, {
      registerPostVersion: async (input) => { registrations.push(input.registrationKey); },
    });
    const result = await runWorkflow({ workflow: suite.analyze,
      input: { creatorRunId: crypto.randomUUID(), postExternalId: "p-v2", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect(calls).toEqual(["post-builder", "post-reviewer", "post-evaluation-repair"]);
    expect(registrations).toHaveLength(1);
    expect((await store.listRuns({ parentRunId: result.run.id })).map((run) => `${run.workflowId}@${run.workflowRevision}`))
      .toEqual(["post.build@v1", "post.review@v1", "post.repair-evaluation@v1"]);
  });

  it("binds V3 post artifacts to candidate and independent-review phases", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const suite = createPostWorkflowSuiteV3({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents);
    const runner: AgentRunner = { async run(request) {
      return { output: request.definition.id === "post-reviewer"
        ? { artifact: { reviewed: true }, route: "deliver" } : { artifact: { candidate: true } } };
    } } as AgentRunner;
    const result = await runWorkflow({ workflow: suite.analyze,
      input: { creatorRunId: crypto.randomUUID(), postExternalId: "phase-v3", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    const phases = (await store.listSteps(result.run.id)).filter((step) => step.kind === "phase");
    expect(phases.map((phase) => phase.key)).toEqual(["candidate-build", "independent-review-1"]);
    const bindings = (await store.listEvents(result.run.id)).filter((event) => event.type === "phase.artifact_bound")
      .map((event) => (event.data as { binding: { role: string } }).binding.role);
    expect(bindings).toEqual(expect.arrayContaining(["candidate", "evaluation"]));
  });

  it.each(["conflict", "uncertain"] as const)("V4 blocks %s source checks before candidate work", async (verdict) => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const calls: string[] = [];
    const suite = createPostWorkflowSuiteV4({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents);
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      return { output: { artifact: { schemaVersion: "post-source-consistency@1", inputSha256: "a".repeat(64), verdict,
        summary: "source mismatch", comparisons: [{ postClaim: "title", relation: verdict === "conflict" ? "contradicts" : "insufficient",
          evidenceRefs: ["frames/sample-1.jpg"], reason: "direct evidence" }], provenance: {
          model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256: "b".repeat(64), threadId: "thread"
        } } } };
    } } as AgentRunner;
    const result = await runWorkflow({ workflow: suite.analyze,
      input: { creatorRunId: crypto.randomUUID(), postExternalId: `source-${verdict}`, evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("blocked");
    expect(calls).toEqual(["post-source-checker"]);
    expect(result.output).toMatchObject({ ok: false, details: { kind: verdict === "conflict"
      ? "source_identity_conflict" : "source_identity_uncertain" } });
  });

  it("V4 checks source before entering the unchanged V3 candidate path", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const calls: string[] = [];
    const suite = createPostWorkflowSuiteV4({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents);
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-source-checker") return { output: { artifact: {
        schemaVersion: "post-source-consistency@1", inputSha256: "a".repeat(64), verdict: "consistent", summary: "same source",
        comparisons: [{ postClaim: "title", relation: "supports", evidenceRefs: ["frames/sample-1.jpg"], reason: "same subject" }],
        provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256: "b".repeat(64), threadId: "thread" }
      } } };
      if (request.definition.id === "post-reviewer") return { output: { artifact: { reviewed: true }, route: "deliver" } };
      return { output: { artifact: { candidate: true } } };
    } } as AgentRunner;
    const input = { creatorRunId: crypto.randomUUID(), postExternalId: "source-ok", evidenceKind: "video" as const, evidence };
    const first = await runWorkflow({ workflow: suite.analyze, input, store, agentRunner: runner });
    expect(first.run.state).toBe("succeeded");
    expect(calls).toEqual(["post-source-checker", "post-builder", "post-reviewer"]);
    expect((await store.listSteps(first.run.id)).filter((step) => step.kind === "phase").map((step) => step.key))
      .toEqual(["source-consistency", "candidate-build", "independent-review-1"]);
    const second = await runWorkflow({ workflow: suite.analyze, input, store, agentRunner: runner, resumeRunId: first.run.id });
    expect(second.run.state).toBe("succeeded");
    expect(calls).toEqual(["post-source-checker", "post-builder", "post-reviewer"]);
  });

  it("fails closed before video agents for image-post evidence", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const suite = createPostWorkflowSuite({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents);
    const runner: AgentRunner = { run: async () => { throw new Error("video agent must not run"); } };
    const result = await runWorkflow({ workflow: suite.analyze,
      input: { creatorRunId: crypto.randomUUID(), postExternalId: "image-v2", evidenceKind: "image_post", evidence },
      store, agentRunner: runner });
    expect(result.run.state).toBe("blocked");
    expect(result.output).toMatchObject({ ok: false, state: "blocked",
      details: { kind: "unsupported_media_review", evidenceKind: "image_post", evidence } });
    expect(await store.listRuns({ parentRunId: result.run.id })).toHaveLength(0);
  });

  it("registers the final readable post revision even when findings need review", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    let registrations = 0;
    const suite = createPostWorkflowSuite({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, {
      registerPostVersion: async () => { registrations += 1; },
    });
    const runner: AgentRunner = { async run(request) {
      if (request.definition.id === "post-reviewer") return { output: { artifact: { reviewed: true }, route: "repair_post", findings: ["quality"] } };
      return { output: { artifact: { candidate: true } } };
    } } as AgentRunner;
    const result = await runWorkflow({ workflow: suite.analyze,
      input: { creatorRunId: crypto.randomUUID(), postExternalId: "findings-v2", evidenceKind: "video", evidence },
      store, agentRunner: runner });
    expect(result.run.state).toBe("needs_review");
    expect(registrations).toBe(1);
    expect(result.output).toMatchObject({ ok: false, state: "needs_review",
      details: { findings: ["quality"] } });
  });

  it("repairs creator synthesis once and publishes the reviewed revision", async () => {
    const store = new MemoryRunStore();
    const frozenInputs = await inputArtifact(store, "creator-inputs");
    let review = 0;
    const runner: AgentRunner = { async run(request) {
      if (request.definition.id === "creator-synthesis-builder") return { output: { artifact: { revision: 1 } } };
      if (request.definition.id === "creator-synthesis-repair") return { output: { artifact: { revision: 2 } } };
      review += 1;
      return { output: { artifact: { review }, route: review === 1 ? "repair" : "deliver", findings: ["f1"] } };
    } } as AgentRunner;
    const definition = createCreatorSynthesisWorkflow({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents);
    const result = await runWorkflow({ workflow: definition,
      input: { creatorRunId: crypto.randomUUID(), frozenInputs }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect((await store.listArtifacts(result.run.id)).filter((item) => item.type === "creator-synthesis")).toHaveLength(2);
    expect(review).toBe(2);
  });

  it("composes creator synthesis v2 from independently registered nodes", async () => {
    const store = new MemoryRunStore();
    const frozenInputs = await inputArtifact(store, "creator-inputs");
    const runner: AgentRunner = { async run(request) {
      if (request.definition.id === "creator-synthesis-builder") return { output: { artifact: { revision: 1 } } };
      return { output: { artifact: { reviewed: true }, route: "deliver" } };
    } } as AgentRunner;
    const suite = createCreatorSynthesisWorkflowSuite({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents);
    const result = await runWorkflow({ workflow: suite.analyze,
      input: { creatorRunId: crypto.randomUUID(), frozenInputs }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect((await store.listRuns({ parentRunId: result.run.id })).map((run) => run.workflowId))
      .toEqual(["creator.build", "creator.review"]);
  });

  it("connects stable post child keys before creator synthesis", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const frozenInputs = await inputArtifact(store, "creator-inputs");
    const runner = { async run(request: { definition: { id: string } }) {
      if (request.definition.id.includes("reviewer")) return { output: { artifact: {}, route: "deliver" } };
      return { output: { artifact: {} } };
    } } as AgentRunner;
    const validators = { candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) };
    let preparedPosts = 0;
    const parent = createCreatorAnalysisWorkflow(createPostWorkflow(validators, agents),
      createCreatorSynthesisWorkflow(validators, agents), async (input, posts) => {
        preparedPosts = posts.length;
        expect(input.source.id).toBe(frozenInputs.id);
        return { creatorRunId: input.creatorRunId, frozenInputs };
      });
    const result = await runWorkflow({ workflow: parent, input: { creatorRunId: crypto.randomUUID(),
      source: frozenInputs,
      posts: [{ creatorRunId: crypto.randomUUID(), postExternalId: "a", evidence },
        { creatorRunId: crypto.randomUUID(), postExternalId: "b", evidence }] }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect((await store.listSteps(result.run.id)).filter((step) => step.kind === "workflow").map((step) => step.key))
      .toEqual(["post:a", "post:b", "synthesis"]);
    expect(preparedPosts).toBe(2);
    expect((await store.listSteps(result.run.id)).some((step) => step.key === "freeze-synthesis-inputs")).toBe(true);
  });

  it("keeps every V3 post candidate expected and binds only readable completed posts", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const frozenInputs = await inputArtifact(store, "creator-inputs");
    const candidate = await inputArtifact(store, "post-candidate");
    const evaluation = await inputArtifact(store, "post-evaluation");
    const post = workflow<PostWorkflowInput, PostWorkflowOutput>("post.phase-test", { revision: "v1" }, async (_ctx, input) =>
      input.postExternalId === "available" ? { ok: true, candidate, evaluation } : ({ ok: false, state: "blocked", details: { kind: "missing" } }));
    const synthesis = workflow<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>("creator.unused", { revision: "v1" }, async () => {
      throw new Error("synthesis must not start with an unavailable post");
    });
    const parent = createCreatorAnalysisWorkflowV3(post, synthesis, async () => ({ creatorRunId: "creator-1", frozenInputs }));
    const result = await runWorkflow({ workflow: parent, input: { creatorRunId: "creator-1", source: frozenInputs,
      posts: [{ creatorRunId: "creator-1", postExternalId: "available", evidence }, { creatorRunId: "creator-1", postExternalId: "missing", evidence }] },
    store, agentRunner: { run: async () => { throw new Error("agent not expected"); } } });
    expect(result.run.state).toBe("blocked");
    const phase = (await store.listSteps(result.run.id)).find((step) => step.key === "post-research")!;
    expect((phase.phaseDefinition as unknown as { expectedArtifacts: ReadonlyArray<{ role: string; required: boolean }> }).expectedArtifacts)
      .toEqual([{ role: "post:available:candidate", title: "单帖候选 available", required: true },
        { role: "post:missing:candidate", title: "单帖候选 missing", required: true }]);
    const bindings = (await store.listEvents(result.run.id)).filter((event) => event.type === "phase.artifact_bound")
      .map((event) => (event.data as { binding: { role: string } }).binding.role);
    expect(bindings).toEqual(expect.arrayContaining(["post:available:candidate", "post:available:evaluation"]));
    expect(bindings).not.toContain("post:missing:candidate");
  });

  it("synthesizes a readable candidate with findings without promoting its state", async () => {
    const store = new MemoryRunStore();
    const evidence = await inputArtifact(store, "post-evidence");
    const candidate = await inputArtifact(store, "post-candidate");
    const evaluation = await inputArtifact(store, "post-evaluation");
    const frozenInputs = await inputArtifact(store, "creator-inputs");
    const findingPost = workflow<PostWorkflowInput, PostWorkflowOutput>("post.with-findings", { revision: "v1" }, async (ctx) =>
      ctx.needsReview({ candidate, evaluation, findings: ["quality-boundary"] }) as PostWorkflowOutput);
    const synthesis = workflow<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>("creator.test-synthesis", { revision: "v1" }, async () => ({
      ok: true as const, synthesis: frozenInputs, evaluation,
    }));
    let receivedState = "";
    const parent = createCreatorAnalysisWorkflow(findingPost, synthesis, async (input, posts) => {
      receivedState = posts[0]?.ok ? "ok" : posts[0]?.state ?? "missing";
      expect(postWorkflowArtifacts(posts[0]!)).toEqual({ candidate, evaluation });
      return { creatorRunId: input.creatorRunId, frozenInputs };
    });
    const result = await runWorkflow({ workflow: parent, input: { creatorRunId: crypto.randomUUID(), source: frozenInputs,
      posts: [{ creatorRunId: crypto.randomUUID(), postExternalId: "finding", evidence }] },
    store, agentRunner: { run: async () => { throw new Error("agent not expected"); } } });
    expect(result.run.state).toBe("succeeded");
    expect(receivedState).toBe("needs_review");
    expect(result.output?.ok).toBe(true);
    if (!result.output?.ok) throw new Error("creator analysis unexpectedly blocked");
    expect(result.output.posts[0]).toMatchObject({ ok: false, state: "needs_review",
      details: { findings: ["quality-boundary"] } });
  });
});
