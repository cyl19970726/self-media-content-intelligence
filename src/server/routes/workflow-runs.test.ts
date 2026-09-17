import express from "express";
import type { Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
import { SQLiteWorkflowRunStore } from "../../../packages/adapters/index.js";
import { artifactPayloadSha256 } from "../../../packages/workflow/index.js";
import { registerWorkflowRoutes } from "./workflow-runs.js";

const servers: Server[] = [];
const databases: DatabaseSync[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  databases.splice(0).forEach((db) => db.close());
});

async function setup() {
  const database = new DatabaseSync(":memory:"); databases.push(database);
  const store = new SQLiteWorkflowRunStore(database);
  const retry = vi.fn(async () => ({ state: "queued" }));
  const cancel = vi.fn(async () => ({ state: "canceled" }));
  const artifactReader = vi.fn(async () => ({ kind: "post", data: { thesis: "exact candidate" } }));
  const app = express(); app.use(express.json());
  registerWorkflowRoutes(app, { store, retry, cancel, artifactReader, artifactPayload: (id) => store.getArtifactPayload(id) });
  const server = app.listen(0, "127.0.0.1"); servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server port");
  return { store, retry, cancel, artifactReader, url: `http://127.0.0.1:${address.port}/api/workflow-runs` };
}

it("reads persisted progress and incremental events; routes recovery through the queue service", async () => {
  const { store, retry, cancel, url } = await setup();
  const run = await store.createRun({ workflowId: "post", workflowRevision: "1", inputFingerprint: "a", state: "failed", metadata: { creatorRunId: "creator" } });
  await store.appendEvent({ runId: run.id, type: "workflow.started" });
  await store.appendEvent({ runId: run.id, type: "workflow.failed" });
  const detail = await fetch(`${url}/${run.id}`).then((response) => response.json());
  expect(detail).toMatchObject({ run: { state: "failed" }, steps: [], attempts: [], artifacts: [] });
  const events = await fetch(`${url}/${run.id}/events?after=1`).then((response) => response.json());
  expect(events.events).toHaveLength(1);
  expect(events.events[0].seq).toBe(2);
  expect((await fetch(`${url}/${run.id}/steps/review%2Fround-1/retry`, { method: "POST" })).status).toBe(202);
  expect(retry).toHaveBeenCalledWith("creator", run.id, "review/round-1");
  expect((await fetch(`${url}/${run.id}/cancel`, { method: "POST" })).status).toBe(202);
  expect(cancel).toHaveBeenCalledWith("creator", run.id);
  expect((await fetch(`${url}/missing`)).status).toBe(404);
  expect((await fetch(`${url}/${run.id}/events?after=-1`)).status).toBe(409);
});

it("only serves assets belonging to the requested workflow", async () => {
  const { store, artifactReader, url } = await setup();
  const run = await store.createRun({ workflowId: "post", workflowRevision: "1", inputFingerprint: "a", state: "running" });
  const step = await store.createStep({ runId: run.id, key: "publish", kind: "publish", workflowId: "post", workflowRevision: "1", inputFingerprint: "a", configFingerprint: "a", state: "running", validation: "pending" });
  const attempt = await store.createAttempt({ runId: run.id, stepRunId: step.id, state: "running" });
  const payload = { candidate: "visible" };
  const artifact = await store.publishArtifact({ type: "unknown/custom", schemaVersion: "2026", revision: "1", sha256: await artifactPayloadSha256(payload), uri: "private://reference", payload, producedBy: { workflowRunId: run.id, stepRunId: step.id, attemptId: attempt.id }, dependsOn: [], validation: "valid", review: "pending" });
  const response = await fetch(`${url}/${run.id}/artifacts/${artifact.id}`);
  expect(response.status).toBe(200);
  expect((await response.json()).payload).toMatchObject({ kind: "withheld" });
  expect((await fetch(`${url}/another/artifacts/${artifact.id}`)).status).toBe(404);
  expect((await fetch(`${url}/another/artifacts/${artifact.id}/reader`)).status).toBe(404);
  expect(artifactReader).not.toHaveBeenCalled();
  expect(await fetch(`${url}/${run.id}/artifacts/${artifact.id}/reader`).then((result) => result.json()))
    .toEqual({ kind: "post", data: { thesis: "exact candidate" } });
  expect(artifactReader).toHaveBeenCalledWith(run.id, artifact.id);
});

it("returns persisted phase reading data with the artifact owner's run id", async () => {
  const root = { id: "phase-root", workflowId: "creator.analyze", workflowRevision: "v2", inputFingerprint: "x", state: "waiting" as const, metadata: { creatorRunId: "creator" } };
  const child = { id: "phase-child", workflowId: "post.build", workflowRevision: "v2", inputFingerprint: "x", state: "succeeded" as const, parentRunId: root.id, metadata: { creatorRunId: "creator", phaseId: "phase:research" } };
  const artifact = { id: "phase-asset", type: "post-candidate", schemaVersion: "v1", revision: "1", sha256: "a".repeat(64), uri: "workflow://phase-asset",
    producedBy: { workflowRunId: child.id, stepRunId: "child-step", attemptId: "child-attempt" }, dependsOn: [], validation: "valid" as const, review: "pending" as const };
  const phaseStep = { id: "phase-control", runId: root.id, key: "research", kind: "phase" as const, workflowId: root.workflowId, workflowRevision: root.workflowRevision, inputFingerprint: "x", configFingerprint: "x", state: "waiting" as const, validation: "valid" as const,
    phaseId: "phase:research", phasePath: ["research"], phaseDefinition: { title: "深度研究", purpose: "构建并复核候选", expectedArtifacts: [{ role: "candidate", required: true }] } };
  const store = {
    getRun: async (id: string) => id === root.id ? root : id === child.id ? child : undefined,
    listRuns: async () => [root, child], listSteps: async (id: string) => id === root.id ? [phaseStep] : [], listAttempts: async () => [], listEvents: async () => [],
    listArtifacts: async (id: string) => id === child.id ? [artifact] : [], getArtifact: async (id: string) => id === artifact.id ? artifact : undefined,
  };
  const app = express(); app.use(express.json());
  registerWorkflowRoutes(app, { store: store as never, retry: async () => ({}), cancel: async () => ({}), artifactPayload: async () => ({}) });
  const server = app.listen(0, "127.0.0.1"); servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No test server port");
  const detail = await fetch(`http://127.0.0.1:${address.port}/api/workflow-runs/${root.id}`).then((response) => response.json());
  expect(detail.phases).toMatchObject([{ id: "phase:research", state: "waiting", artifacts: [{ role: "published-output", ownerRunId: child.id, artifact: { id: artifact.id } }] }]);
});

it("projects raw failures and unknown SDK events into public-safe diagnostics", async () => {
  const { store, retry, url } = await setup();
  retry.mockRejectedValueOnce(new Error("Authorization: Bearer secret-token\nprompt: private instruction"));
  const run = await store.createRun({ workflowId: "post", workflowRevision: "1", inputFingerprint: "private-input", state: "failed",
    metadata: { creatorRunId: "creator", secret: "do-not-serve" }, error: "prompt: private instruction\nsecret-token" });
  const step = await store.createStep({ runId: run.id, key: "review:0", kind: "agent", workflowId: "post", workflowRevision: "1",
    inputFingerprint: "private-input", configFingerprint: "private-config", state: "failed", validation: "invalid", error: "stderr: secret-token" });
  const attempt = await store.createAttempt({ runId: run.id, stepRunId: step.id, state: "failed", error: "raw SDK prompt" });
  await store.appendEvent({ runId: run.id, stepRunId: step.id, attemptId: attempt.id, type: "agent.event", data: { rawPrompt: "secret-token", command: "private" } });
  await store.appendEvent({ runId: run.id, stepRunId: step.id, attemptId: attempt.id, type: "step.failed", data: { error: "stderr: secret-token" } });
  await store.appendEvent({ runId: run.id, stepRunId: step.id, attemptId: attempt.id, type: "decision.recorded", data: { route: "repair_post", privatePrompt: "secret-token" } });
  await store.appendEvent({ runId: run.id, stepRunId: step.id, attemptId: attempt.id, type: "artifact.published", data: {
    id: "published-asset", type: "post-evaluation", schemaVersion: "v1", revision: "1", sha256: "a".repeat(64), validation: "valid", review: "findings", rawError: "secret-token"
  } });
  await store.appendEvent({ runId: run.id, stepRunId: step.id, attemptId: attempt.id, type: "validation.completed", data: {
    valid: false, details: { kind: "evaluation_contract", outcome: { failedGateIds: ["gate-a"], qualityWarningGateIds: ["gate-b"] }, rawError: "secret-token" }
  } });
  await store.appendEvent({ runId: run.id, stepRunId: step.id, attemptId: attempt.id, type: "agent.usage", data: {
    childRunId: "child-a", usage: { inputTokens: 12, cachedInputTokens: null, outputTokens: 9, reasoningOutputTokens: null }, model: "gpt-5.6", reasoningEffort: "medium",
    sdkVersion: "0.1.2", codexRuntimeVersion: "2026.9.16", privateTrace: "secret-token"
  } });
  const frozenPayload = { kind: "post", source: { creatorRunId: "creator", postExternalId: "post", sourceMediaArtifactRef: "/artifacts/source.json" },
    files: [{ ref: "/artifacts/source.json", sha256: "b".repeat(64) }], methods: [{ path: "packages/research/contracts.ts", sha256: "c".repeat(64) }], prompt: "secret-token" };
  const frozen = await store.publishArtifact({ type: "post-evidence", schemaVersion: "research-input@1", revision: "1", sha256: await artifactPayloadSha256(frozenPayload), uri: "private://frozen", payload: frozenPayload,
    producedBy: { workflowRunId: run.id, stepRunId: step.id, attemptId: attempt.id }, dependsOn: [], validation: "valid", review: "not_applicable" });
  const evaluationPayload = { kind: "post", outcome: { state: "verified", reconstructionArtifactRef: "/artifacts/candidate.json", articleArtifactRef: null,
    builderValidationArtifactRef: "/artifacts/builder.json", evaluationArtifactRef: "/artifacts/evaluation.json", gateReportArtifactRef: "/artifacts/gate.json",
    threeLensEvaluationArtifactRef: "/artifacts/lenses.json", threeLensGateReportArtifactRef: "/artifacts/lens-gate.json", threeLensGateCount: 19, gateCount: 3,
    failedGateIds: [], qualityWarningGateIds: ["visual-coverage"], evaluationMode: "single_pass" }, diagnostics: { rawError: "secret-token" } };
  const evaluation = await store.publishArtifact({ type: "post-evaluation", schemaVersion: "v1", revision: "1", sha256: await artifactPayloadSha256(evaluationPayload), uri: "private://evaluation", payload: evaluationPayload,
    producedBy: { workflowRunId: run.id, stepRunId: step.id, attemptId: attempt.id }, dependsOn: [], validation: "valid", review: "findings" });
  const creatorEvaluationPayload = { kind: "creator", gate: { schemaVersion: "1.0.0", creatorRunId: run.id, ready: false,
    gates: [{ id: "deep_9_ready", pass: false, message: "仍缺少九篇深度研究。" }], failedGateIds: ["deep_9_ready"], checkedAt: "2026-09-16T00:00:00.000Z",
    candidateRevisionFingerprint: null, independentEvaluationArtifactRef: null, evaluator: null }, diagnostics: { rawError: "secret-token" } };
  const creatorEvaluation = await store.publishArtifact({ type: "creator-synthesis-evaluation", schemaVersion: "v1", revision: "1", sha256: await artifactPayloadSha256(creatorEvaluationPayload), uri: "private://creator-evaluation", payload: creatorEvaluationPayload,
    producedBy: { workflowRunId: run.id, stepRunId: step.id, attemptId: attempt.id }, dependsOn: [], validation: "valid", review: "findings" });
  const detail = await fetch(`${url}/${run.id}`).then((response) => response.json());
  const events = await fetch(`${url}/${run.id}/events`).then((response) => response.json());
  const frozenResponse = await fetch(`${url}/${run.id}/artifacts/${frozen.id}`).then((response) => response.json());
  const evaluationResponse = await fetch(`${url}/${run.id}/artifacts/${evaluation.id}`).then((response) => response.json());
  const creatorEvaluationResponse = await fetch(`${url}/${run.id}/artifacts/${creatorEvaluation.id}`).then((response) => response.json());
  const retryResponse = await fetch(`${url}/${run.id}/steps/review%3A0/retry`, { method: "POST" }).then((response) => response.json());
  expect(JSON.stringify({ detail, events, frozenResponse, evaluationResponse, creatorEvaluationResponse, retryResponse })).not.toContain("secret-token");
  expect(JSON.stringify({ detail, events, frozenResponse, evaluationResponse, creatorEvaluationResponse, retryResponse })).not.toContain("private instruction");
  expect(detail.run).toMatchObject({ error: "执行未能完成；可凭诊断编号在本地查看详情。" });
  expect(detail.steps[0]).not.toHaveProperty("inputFingerprint");
  expect(detail.steps[0]).not.toHaveProperty("output");
  expect(events.events[0]).toMatchObject({ type: "workflow.event.redacted", data: { errorId: expect.stringMatching(/^wf-/) } });
  expect(events.events[1]).toMatchObject({ type: "step.failed", data: { errorId: expect.stringMatching(/^wf-/) } });
  expect(events.events[2]).toMatchObject({ type: "decision.recorded", data: { route: "repair_post" } });
  expect(events.events[3]).toMatchObject({ type: "artifact.published", data: { id: "published-asset", type: "post-evaluation", sha256: "a".repeat(64) } });
  expect(events.events[4]).toMatchObject({ type: "validation.completed", data: { valid: false, kind: "evaluation_contract", failedGateIds: ["gate-a"], qualityWarningGateIds: ["gate-b"] } });
  expect(events.events[5]).toMatchObject({ type: "agent.usage", data: { sdkVersion: "0.1.2", codexRuntimeVersion: "2026.9.16", usage: { inputTokens: 12, outputTokens: 9 } } });
  expect(frozenResponse.payload).toMatchObject({ kind: "frozen-input", source: { refs: { sourceMediaArtifactRef: "/artifacts/source.json" } },
    files: [{ ref: "/artifacts/source.json", sha256: "b".repeat(64) }], methods: [{ path: "packages/research/contracts.ts", sha256: "c".repeat(64) }] });
  expect(evaluationResponse.payload).toMatchObject({ kind: "post-evaluation", outcome: { state: "verified", qualityWarningGateIds: ["visual-coverage"], gateCount: 3, threeLensGateCount: 19 } });
  expect(creatorEvaluationResponse.payload).toMatchObject({ kind: "creator-evaluation", gate: { ready: false, failedGateIds: ["deep_9_ready"],
    gates: [{ id: "deep_9_ready", pass: false, message: "仍缺少九篇深度研究。" }] } });
  expect(retryResponse).toMatchObject({ error: "执行未能完成；可凭诊断编号在本地查看详情。", errorId: expect.stringMatching(/^wf-/) });
});
