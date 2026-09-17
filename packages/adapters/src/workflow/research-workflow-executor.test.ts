import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPostWorkflow } from "../../../research/src/workflows/post.js";
import { createResearchAgentDefinitions } from "../../../research/src/workflows/agents.js";
import type { PostWorkflowInput, PostWorkflowOutput, ResearchWorkflowDefinitions } from "../../../research/src/workflows/contracts.js";
import { artifactPayloadSha256, workflow, workflowFingerprint, type AgentRunRequest, type AgentRunResult, type AgentRunner, type ArtifactRef } from "@signal-room/workflow";
import { SQLiteResearchWorkflowExecutor, type ResearchWorkflowInputFreezer, type WorkflowAdvanceScheduler,
  type WorkflowDefinitionRegistry } from "./research-workflow-executor.js";
import { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((database) => database.close()));

class ResearchRunner implements AgentRunner {
  readonly calls: string[] = [];
  constructor(private readonly reviewResult: () => { valid: boolean }) {}
  async run<Input, Output>(request: AgentRunRequest<Input>): Promise<AgentRunResult<Output>> {
    this.calls.push(request.definition.id);
    if (request.definition.id === "post-builder") return { output: { artifact: { report: "candidate" } } as Output };
    if (request.definition.id === "post-reviewer") {
      return { output: { artifact: { review: "evaluation" }, route: "deliver", contractValid: this.reviewResult().valid } as Output };
    }
    throw new Error(`Unexpected agent: ${request.definition.id}`);
  }
}

async function seedEvidence(store: SQLiteWorkflowRunStore): Promise<ArtifactRef> {
  const run = await store.createRun({ workflowId: "seed", workflowRevision: "1", inputFingerprint: "seed", state: "succeeded" });
  const step = await store.createStep({ runId: run.id, key: "evidence", kind: "publish", workflowId: "seed",
    workflowRevision: "1", inputFingerprint: "seed", configFingerprint: "seed", state: "succeeded", validation: "valid" });
  const attempt = await store.createAttempt({ runId: run.id, stepRunId: step.id, state: "succeeded" });
  const payload = { frozen: true };
  return store.publishArtifact({ type: "post-evidence", schemaVersion: "v1", revision: "1", sha256: await artifactPayloadSha256(payload),
    uri: "artifact://evidence", payload, producedBy: { workflowRunId: run.id, stepRunId: step.id, attemptId: attempt.id },
    dependsOn: [], validation: "valid", review: "not_applicable" });
}

function definitions(reviewValid: () => boolean): ResearchWorkflowDefinitions {
  const config = { prompt: "test", promptRevision: "1", skillSnapshotsRevision: "1", permissionsRevision: "1", config: {} };
  const agents = createResearchAgentDefinitions({ postSourceChecker: config, postBuilder: config, postReviewer: config, postRepair: config,
    postEvaluationRepair: config, creatorBuilder: config, creatorReviewer: config, creatorRepair: config });
  return {
    post: createPostWorkflow({
      candidate: (value) => ({ valid: typeof value === "object" && value !== null && "artifact" in value }),
      evaluation: (value) => ({ valid: reviewValid() && (value as { contractValid?: boolean }).contractValid === true }),
    }, agents),
    creatorSynthesis: workflow("creator.test", { revision: "v1" }, async (ctx, input) => {
      const artifact = await ctx.publish("synthesis", "creator-synthesis", input, { validation: "valid" });
      return { ok: true, synthesis: artifact, evaluation: artifact };
    }),
  };
}

function freezer(evidence: ArtifactRef): ResearchWorkflowInputFreezer {
  return {
    post: async (input) => ({ creatorRunId: input.creatorRunId, postExternalId: input.postExternalId,
      evidenceKind: input.evidenceKind ?? "video", evaluationMode: input.evaluationMode,
      importedEvaluationArtifactRef: input.importedEvaluationArtifactRef, evidence }),
    creator: async (input) => ({ creatorRunId: input.creatorRunId, frozenInputs: evidence }),
    analysis: async (input) => ({ creatorRunId: input.creatorRunId, source: evidence,
      posts: input.posts.map((post) => ({ creatorRunId: post.creatorRunId, postExternalId: post.postExternalId,
        evidenceKind: post.evidenceKind ?? "video", evidence })) }),
  };
}

function postStart() {
  return { creatorRunId: "creator-1", postExternalId: "post-1", sourceUrl: "https://example.test/post-1",
    sourceMediaArtifactRef: "media", detailArtifactRef: "detail", mediaManifestArtifactRef: "manifest",
    selectionArtifactRef: "selection", reconstructionBatchArtifactRef: "batch" };
}

describe("SQLiteResearchWorkflowExecutor", () => {
  it("freezes input across recreation and retries only invalid nodes", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    let reviewValid = false;
    const runner = new ResearchRunner(() => ({ valid: reviewValid }));
    const configured = definitions(() => reviewValid);
    let executor = new SQLiteResearchWorkflowExecutor(database, store, runner, configured, freezer(evidence));
    const created = await executor.createPost(postStart());
    expect((await store.getRun(created.workflowRunId))?.metadata).toMatchObject({ postId: "post-1", sourceWorkflowRunId: evidence.producedBy.workflowRunId });
    const first = await executor.advance({ ...created, signal: new AbortController().signal });
    expect(first.state).toBe("needs_review");
    expect(runner.calls.filter((id) => id === "post-builder")).toHaveLength(1);

    executor = new SQLiteResearchWorkflowExecutor(database, store, runner, configured, freezer(evidence));
    const retry = await executor.prepareRetry({ creatorRunId: "creator-1", workflowRunId: created.workflowRunId, stepKey: "review:0" });
    reviewValid = true;
    const completed = await executor.advance({ creatorRunId: "creator-1", workflowRunId: created.workflowRunId,
      generation: retry.generation, signal: new AbortController().signal });
    expect(completed.state).toBe("succeeded");
    expect(runner.calls.filter((id) => id === "post-builder")).toHaveLength(1);
    expect(runner.calls.filter((id) => id === "post-reviewer")).toHaveLength(2);
  });

  it("queues only the frozen legacy Builder attempt whose sole failure is core evidence count", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const frozenInput = { creatorRunId: "creator-1", postExternalId: "post-core-count", evidenceKind: "video", evidence };
    const error = `POST_CANDIDATE_INCOMPLETE:${JSON.stringify({ state: "not_ready", failedGateIds: ["builder_integrity_core_evidence_count"] })}`;
    const run = await store.createRun({ workflowId: "post.build", workflowRevision: "v1",
      inputFingerprint: workflowFingerprint(frozenInput), state: "failed", error,
      metadata: { creatorRunId: "creator-1", workflowKind: "child" } });
    const step = await store.createStep({ runId: run.id, key: "builder", kind: "agent", workflowId: "post.build",
      workflowRevision: "v1", inputFingerprint: workflowFingerprint(frozenInput), configFingerprint: "post-builder:v1",
      state: "failed", validation: "invalid", error });
    await store.createAttempt({ runId: run.id, stepRunId: step.id, state: "failed", error });
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })), definitions(() => true), freezer(evidence));
    database.prepare("INSERT INTO research_workflow_executions(id, creator_run_id, document) VALUES (?, ?, ?)").run(run.id, "creator-1", JSON.stringify({
      id: run.id, creatorRunId: "creator-1", kind: "child", workflowId: "post.build", definitionRevision: "v1",
      generation: 1, state: "failed", frozenInput, error,
    }));
    const queued = await executor.prepareCoreEvidenceCountBuilderRecovery({ creatorRunId: "creator-1", workflowRunId: run.id });
    expect(queued).toMatchObject({ workflowRunId: run.id, generation: 2, state: "queued", stepKey: "builder" });
    expect((await store.getRun(run.id))?.inputFingerprint).toBe(workflowFingerprint(frozenInput));
    expect(await store.listSteps(run.id)).toEqual([expect.objectContaining({ id: step.id, state: "failed", error })]);
    expect(await store.listEvents(run.id)).toEqual(expect.arrayContaining([expect.objectContaining({
      type: "workflow.core_evidence_recovery_queued", data: expect.objectContaining({ gateId: "builder_integrity_core_evidence_count" }),
    })]));

    database.prepare("UPDATE research_workflow_executions SET document = ? WHERE id = ?").run(JSON.stringify({
      id: run.id, creatorRunId: "creator-1", kind: "child", workflowId: "post.build", definitionRevision: "v1",
      generation: 2, state: "failed", frozenInput, error: `POST_CANDIDATE_INCOMPLETE:${JSON.stringify({ failedGateIds: ["builder_integrity_core_evidence_count", "another_failure"] })}`,
    }), run.id);
    await expect(executor.prepareCoreEvidenceCountBuilderRecovery({ creatorRunId: "creator-1", workflowRunId: run.id }))
      .rejects.toThrow("CORE_EVIDENCE_RECOVERY_REQUIRES_ONLY_CORE_EVIDENCE_COUNT_FAILURE");
  });

  it("retries a parent branch after its child honestly completed as needs review", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const frozenInput = { creatorRunId: "creator-1", postExternalId: "post-review", evidenceKind: "video", evidence };
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })), definitions(() => true), freezer(evidence));
    const parent = await store.createRun({ workflowId: "creator.analyze", workflowRevision: "v2", inputFingerprint: workflowFingerprint(frozenInput), state: "needs_review" });
    const branch = await store.createStep({ runId: parent.id, key: "post:post-review", kind: "workflow", workflowId: parent.workflowId,
      workflowRevision: parent.workflowRevision, inputFingerprint: "branch", configFingerprint: "post.analyze:v2", state: "needs_review", validation: "invalid" });
    await store.createAttempt({ runId: parent.id, stepRunId: branch.id, state: "needs_review" });
    database.prepare("INSERT INTO research_workflow_executions(id, creator_run_id, document) VALUES (?, ?, ?)").run(parent.id, "creator-1", JSON.stringify({
      id: parent.id, creatorRunId: "creator-1", kind: "creator_analysis", workflowId: parent.workflowId, definitionRevision: parent.workflowRevision,
      generation: 1, state: "needs_review", frozenInput,
    }));
    database.prepare("INSERT INTO research_workflow_executions(id, creator_run_id, document) VALUES (?, ?, ?)").run("post-child", "creator-1", JSON.stringify({
      id: "post-child", creatorRunId: "creator-1", kind: "child", workflowId: "post.analyze", definitionRevision: "v2",
      generation: 1, state: "needs_review", frozenInput, parentWorkflowRunId: parent.id, parentStepRunId: branch.id,
    }));
    await expect(executor.prepareRetry({ creatorRunId: "creator-1", workflowRunId: parent.id, stepKey: "post:post-review" }))
      .resolves.toMatchObject({ state: "queued", generation: 2 });
  });

  it("resumes an existing v2 run through the registry after the default advances to v3", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const legacy = workflow("post.analyze", { revision: "v2" }, async (ctx) =>
      ctx.blocked({ kind: "legacy-v2" }));
    const current = workflow<PostWorkflowInput, PostWorkflowOutput>("post.analyze", { revision: "v3" }, async (ctx) =>
      ctx.blocked({ kind: "current-v3" }) as PostWorkflowOutput);
    const configured = { ...definitions(() => true), post: current };
    const registry: WorkflowDefinitionRegistry = { resolve: (id, revision) =>
      id === legacy.id && revision === legacy.revision ? legacy : undefined };
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })), configured,
      freezer(evidence), registry);
    const frozenInput = { creatorRunId: "creator-1", postExternalId: "legacy", evidenceKind: "video" as const, evidence };
    const run = await store.createRun({ workflowId: legacy.id, workflowRevision: legacy.revision,
      inputFingerprint: workflowFingerprint(frozenInput), state: "queued", metadata: { creatorRunId: "creator-1", workflowKind: "post" } });
    database.prepare("INSERT INTO research_workflow_executions(id, creator_run_id, document) VALUES (?, ?, ?)").run(run.id, "creator-1", JSON.stringify({
      id: run.id, creatorRunId: "creator-1", kind: "post", workflowId: legacy.id, definitionRevision: legacy.revision,
      generation: 1, state: "queued", frozenInput,
    }));
    const advanced = await executor.advance({ creatorRunId: "creator-1", workflowRunId: run.id, generation: 1, signal: new AbortController().signal });
    expect(advanced.state).toBe("blocked");
    expect((await store.getRun(run.id))?.error).not.toBe("WORKFLOW_DEFINITION_REVISION_MISMATCH");
  });

  it("requeues only a pre-execution definition mismatch after its revision becomes registered", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const legacy = workflow("post.analyze", { revision: "v2" }, async (ctx) => ctx.blocked({ kind: "legacy" }));
    const current = workflow<PostWorkflowInput, PostWorkflowOutput>("post.analyze", { revision: "v3" }, async (ctx) =>
      ctx.blocked({ kind: "current" }) as PostWorkflowOutput);
    const frozenInput = { creatorRunId: "creator-1", postExternalId: "legacy", evidenceKind: "video" as const, evidence };
    const run = await store.createRun({ workflowId: legacy.id, workflowRevision: legacy.revision,
      inputFingerprint: workflowFingerprint(frozenInput), state: "failed", error: "WORKFLOW_DEFINITION_REVISION_MISMATCH" });
    const persisted = await store.createStep({ runId: run.id, key: "already-valid", kind: "task", workflowId: legacy.id,
      workflowRevision: legacy.revision, inputFingerprint: "frozen-step", configFingerprint: "v1", state: "succeeded", validation: "valid",
      output: { preserved: true } });
    const persistedAttempt = await store.createAttempt({ runId: run.id, stepRunId: persisted.id, state: "succeeded" });
    expect(persistedAttempt.state).toBe("succeeded");
    const registry: WorkflowDefinitionRegistry = { resolve: (id, revision) => id === legacy.id && revision === legacy.revision ? legacy : undefined };
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })),
      { ...definitions(() => true), post: current }, freezer(evidence), registry);
    database.prepare("INSERT INTO research_workflow_executions(id, creator_run_id, document) VALUES (?, ?, ?)").run(run.id, "creator-1", JSON.stringify({
      id: run.id, creatorRunId: "creator-1", kind: "post", workflowId: legacy.id, definitionRevision: legacy.revision,
      generation: 1, state: "failed", error: "WORKFLOW_DEFINITION_REVISION_MISMATCH", frozenInput,
    }));
    const recovered = await executor.recoverPreExecutionDefinitionMismatch({ creatorRunId: "creator-1", workflowRunId: run.id });
    expect(recovered).toMatchObject({ state: "queued", generation: 2 });
    expect((await store.getRun(run.id))?.state).toBe("queued");
    expect(await store.listSteps(run.id)).toHaveLength(1);
    expect(await executor.advance({ creatorRunId: "creator-1", workflowRunId: run.id, generation: recovered.generation,
      signal: new AbortController().signal })).toMatchObject({ state: "blocked" });
  });

  it("rejects stale generations and persists queued cancellation", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const runner = new ResearchRunner(() => ({ valid: true }));
    const executor = new SQLiteResearchWorkflowExecutor(database, store, runner, definitions(() => true), freezer(evidence));
    const created = await executor.createPost(postStart());
    await executor.cancel(created.workflowRunId);
    expect(await executor.snapshot("creator-1", created.workflowRunId)).toMatchObject({ state: "canceled" });
    const canceled = await executor.advance({ ...created, signal: new AbortController().signal });
    expect(canceled.state).toBe("canceled");
    await expect(executor.advance({ ...created, generation: 0, signal: new AbortController().signal })).rejects.toThrow("Stale workflow generation");
  });

  it("projects resume initialization failures into the public core run", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })),
      definitions(() => true), freezer(evidence));
    const created = await executor.createPost(postStart());
    database.prepare("UPDATE workflow_runs SET document = json_set(document, '$.inputFingerprint', 'corrupt') WHERE id = ?")
      .run(created.workflowRunId);
    await expect(executor.advance({ ...created, signal: new AbortController().signal })).resolves.toMatchObject({ state: "failed" });
    expect(await store.getRun(created.workflowRunId)).toMatchObject({ state: "failed", error: expect.stringContaining("exact workflow revision") });
    expect((await store.listEvents(created.workflowRunId)).at(-1)).toMatchObject({ type: "workflow.failed" });
  });

  it("repairs a historical canceled envelope whose public run projection is still queued", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })),
      definitions(() => true), freezer(evidence));
    const created = await executor.createPost(postStart());
    const row = database.prepare("SELECT document FROM research_workflow_executions WHERE id = ?").get(created.workflowRunId)!;
    const document = JSON.parse(String(row.document)) as Record<string, unknown>;
    database.prepare("UPDATE research_workflow_executions SET document = ? WHERE id = ?")
      .run(JSON.stringify({ ...document, state: "canceled" }), created.workflowRunId);
    expect((await store.getRun(created.workflowRunId))?.state).toBe("queued");
    await executor.cancel(created.workflowRunId);
    expect((await store.getRun(created.workflowRunId))?.state).toBe("canceled");
  });

  it("reconciles a historical failed envelope without turning it into cancellation", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    const executor = new SQLiteResearchWorkflowExecutor(database, store, new ResearchRunner(() => ({ valid: true })),
      definitions(() => true), freezer(evidence));
    const created = await executor.createPost(postStart());
    const row = database.prepare("SELECT document FROM research_workflow_executions WHERE id = ?").get(created.workflowRunId)!;
    const document = JSON.parse(String(row.document)) as Record<string, unknown>;
    database.prepare("UPDATE research_workflow_executions SET document = ? WHERE id = ?")
      .run(JSON.stringify({ ...document, state: "failed", error: "historical fingerprint mismatch" }), created.workflowRunId);

    await expect(executor.snapshot("creator-1", created.workflowRunId)).resolves.toMatchObject({ state: "failed" });
    expect(await store.getRun(created.workflowRunId)).toMatchObject({ state: "failed", error: "historical fingerprint mismatch" });
    await executor.cancel(created.workflowRunId);
    expect(await store.getRun(created.workflowRunId)).toMatchObject({ state: "failed", error: "historical fingerprint mismatch" });
    expect((await store.listEvents(created.workflowRunId)).filter((event) => event.type === "workflow.projection_reconciled"))
      .toHaveLength(1);
  });

  it("polls persistent cancellation and aborts a runner owned by another executor instance", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    let started = false;
    const runner: AgentRunner = { run: <Input, Output>(request: AgentRunRequest<Input>) => new Promise<AgentRunResult<Output>>((_resolve, reject) => {
      started = true;
      request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
    }) };
    const executor = new SQLiteResearchWorkflowExecutor(database, store, runner, definitions(() => true), freezer(evidence));
    const created = await executor.createPost(postStart());
    const advancing = executor.advance({ ...created, signal: new AbortController().signal });
    await vi.waitFor(() => expect(started).toBe(true));
    const secondProcess = new SQLiteResearchWorkflowExecutor(database, store, runner, definitions(() => true), freezer(evidence));
    await secondProcess.cancel(created.workflowRunId);
    await expect(advancing).resolves.toMatchObject({ state: "canceled" });
  });

  it("persists a child dependency, releases the parent, and resumes after executor recreation", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const store = new SQLiteWorkflowRunStore(database);
    const evidence = await seedEvidence(store);
    let failingChildRepaired = false;
    const child = workflow("durable-child", { revision: "v1" }, async (ctx, input: { value: string; postExternalId: string }) => {
      await ctx.publish("child-artifact", "child-output", input, { validation: "valid" });
      return ctx.task("child-work", (value) => {
        if (value.value === "fail" && !failingChildRepaired) throw new Error("child failed after artifact");
        return { child: value.value };
      }, input);
    });
    const parent = workflow("post.analyze", { revision: "v1" }, async (ctx, input: { postExternalId: string }) =>
      ({ ok: true, result: await ctx.call("durable", child, {
        value: input.postExternalId === "post-1" ? "saved" : "fail", postExternalId: input.postExternalId,
      }) }));
    const configured = { ...definitions(() => true), post: parent as unknown as ResearchWorkflowDefinitions["post"] };
    const scheduled: Array<{ creatorRunId: string; workflowRunId: string; workflowId: string; generation: number; idempotencyKey: string }> = [];
    const seen = new Set<string>();
    const scheduler: WorkflowAdvanceScheduler = { enqueue: async (item) => { if (!seen.has(item.idempotencyKey)) { seen.add(item.idempotencyKey); scheduled.push(item); } } };
    const registry: WorkflowDefinitionRegistry = { resolve: (id, revision) => id === child.id && revision === child.revision
      ? child as unknown as ReturnType<WorkflowDefinitionRegistry["resolve"]> : undefined };
    let executor = new SQLiteResearchWorkflowExecutor(database, store, noAgentRunner(), configured, freezer(evidence), registry, scheduler);
    const created = await executor.createPost(postStart());
    expect(await executor.advance({ ...created, signal: new AbortController().signal })).toMatchObject({ state: "waiting" });
    const childJob = scheduled.find((item) => item.idempotencyKey.startsWith("workflow-child:"))!;
    expect(childJob.workflowId).toBe("durable-child");
    expect((await store.getRun(childJob.workflowRunId))?.metadata).toMatchObject({ postId: "post-1" });

    executor = new SQLiteResearchWorkflowExecutor(database, store, noAgentRunner(), configured, freezer(evidence), registry, scheduler);
    const parentRow = database.prepare("SELECT document FROM research_workflow_executions WHERE id = ?").get(created.workflowRunId)!;
    const parentDocument = JSON.parse(String(parentRow.document)) as Record<string, unknown>;
    database.prepare("UPDATE research_workflow_executions SET document = ? WHERE id = ?")
      .run(JSON.stringify({ ...parentDocument, state: "running" }), created.workflowRunId);
    expect(await executor.advance({ ...childJob, signal: new AbortController().signal })).toMatchObject({ state: "succeeded" });
    const wake = scheduled.find((item) => item.idempotencyKey.startsWith("workflow-wake:"))!;
    expect(wake.workflowId).toBe("post.analyze");
    const completed = await executor.advance({ ...wake, signal: new AbortController().signal });
    expect(completed.state).toBe("succeeded");
    expect((await store.getRun(created.workflowRunId))?.output).toMatchObject({ ok: true, result: { child: "saved" } });
    expect((await store.listRuns({ parentRunId: created.workflowRunId }))).toHaveLength(1);

    const failingStart = { ...postStart(), postExternalId: "post-fail" };
    const failingParent = await executor.createPost(failingStart);
    expect(await executor.advance({ ...failingParent, signal: new AbortController().signal })).toMatchObject({ state: "waiting" });
    const failingChildJob = scheduled.filter((item) => item.idempotencyKey.startsWith("workflow-child:")).at(-1)!;
    expect(await executor.advance({ ...failingChildJob, signal: new AbortController().signal })).toMatchObject({ state: "failed" });
    expect(await store.listArtifacts(failingChildJob.workflowRunId)).toHaveLength(1);
    const failingWake = scheduled.filter((item) => item.idempotencyKey.startsWith("workflow-wake:")).at(-1)!;
    expect(await executor.advance({ ...failingWake, signal: new AbortController().signal })).toMatchObject({ state: "failed" });
    await expect(executor.prepareRetry({ creatorRunId: "creator-1", workflowRunId: failingParent.workflowRunId, stepKey: "durable" }))
      .rejects.toThrow("CHILD_WORKFLOW_RETRY_REQUIRED");
    const childRetry = await executor.prepareRetry({ creatorRunId: "creator-1", workflowRunId: failingChildJob.workflowRunId, stepKey: "child-work" });
    failingChildRepaired = true;
    expect(await executor.advance({ ...childRetry, signal: new AbortController().signal })).toMatchObject({ state: "succeeded" });
    const parentRetry = await executor.prepareRetry({ creatorRunId: "creator-1", workflowRunId: failingParent.workflowRunId, stepKey: "durable" });
    expect(await executor.advance({ ...parentRetry, signal: new AbortController().signal })).toMatchObject({ state: "succeeded" });
    expect((await store.listRuns({ parentRunId: failingParent.workflowRunId }))).toHaveLength(1);
    const durableStep = (await store.listSteps(failingParent.workflowRunId)).find((step) => step.key === "durable")!;
    expect(await store.listAttempts(durableStep.id)).toHaveLength(2);

    const canceledParent = await executor.createPost({ ...postStart(), postExternalId: "post-cancel" });
    expect(await executor.advance({ ...canceledParent, signal: new AbortController().signal })).toMatchObject({ state: "waiting" });
    const canceledChildJob = scheduled.filter((item) => item.idempotencyKey.startsWith("workflow-child:")).at(-1)!;
    await executor.cancel(canceledParent.workflowRunId);
    expect(await executor.snapshot("creator-1", canceledParent.workflowRunId)).toMatchObject({ state: "canceled" });
    expect(await executor.snapshot("creator-1", canceledChildJob.workflowRunId)).toMatchObject({ state: "canceled" });
  });
});

function noAgentRunner(): AgentRunner {
  return { run: async () => { throw new Error("Unexpected agent call"); } };
}
