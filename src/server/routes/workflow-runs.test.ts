import express from "express";
import crypto from "node:crypto";
import type { Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
import { SQLiteWorkflowRunStore } from "../../../packages/adapters/index.js";
import { artifactPayloadSha256 } from "@signal-room/workflow";
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

it("reads an explicitly selected post child through its root and only exposes a revision bound to the current candidate", async () => {
  const { store, url } = await setup();
  const creator = await store.createRun({ workflowId: "creator.analyze", workflowRevision: "v5", inputFingerprint: "creator", state: "running",
    metadata: { creatorRunId: "creator-a" } });
  const root = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v5", inputFingerprint: "root", state: "succeeded",
    parentRunId: creator.id, metadata: { creatorRunId: "creator-a", postId: "post-a", createdAt: "2026-09-18T01:00:00.000Z" } });
  const child = await store.createRun({ workflowId: "post.repair", workflowRevision: "v5", inputFingerprint: "child", state: "succeeded",
    parentRunId: root.id, metadata: { creatorRunId: "creator-a", postId: "post-a" } });
  const step = await store.createStep({ runId: root.id, key: "build", kind: "agent", workflowId: root.workflowId,
    workflowRevision: root.workflowRevision, inputFingerprint: "input", configFingerprint: "config", state: "succeeded", validation: "valid" });
  const attempt = await store.createAttempt({ runId: root.id, stepRunId: step.id, state: "succeeded" });
  const publish = async (payload: unknown, type: string, review: "pending" | "passed" | "findings" = "pending", dependsOn = [] as Array<{ artifactId: string; revision: string; sha256: string }>) => store.publishArtifact({
    type, schemaVersion: "v1", revision: type === "post-candidate" ? crypto.randomUUID() : "revision-1",
    sha256: await artifactPayloadSha256(payload), uri: "workflow://test", payload, producedBy: { workflowRunId: root.id, stepRunId: step.id, attemptId: attempt.id }, dependsOn, validation: "valid", review
  });
  const old = await publish({ report: "old" }, "post-candidate", "passed");
  const current = await publish({ report: "current" }, "post-candidate", "pending", [{ artifactId: old.id, revision: old.revision, sha256: old.sha256 }]);
  await publish({ schemaVersion: "research-revision@1", baseCandidate: old, review: old, candidate: current,
    dispositions: [{ id: "finding-1", status: "changed", reason: "已补证据。" }], validation: { valid: true } }, "research-revision", "findings");

  const base = url.replace("/api/workflow-runs", "");
  const response = await fetch(`${base}/api/creator-runs/creator-a/posts/post-a/workflow-reading?workflowRunId=${child.id}`);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ workflow: { rootRunId: root.id, selectedFrom: "explicit" },
    candidate: { ownerRunId: root.id, artifactId: current.id, reviewStatus: "pending", revisionStatus: "revision_unverified" },
    baseCandidate: { ownerRunId: root.id, artifactId: old.id },
    dispositions: [{ id: "finding-1", status: "changed" }] });
  expect((await fetch(`${base}/api/creator-runs/creator-a/posts/post-b/workflow-reading?workflowRunId=${child.id}`)).status).toBe(404);
});

it("projects review status only from a valid receipt bound to the exact current candidate and report hash", async () => {
  const { store, url } = await setup();
  const root = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v5", inputFingerprint: "root", state: "succeeded",
    metadata: { creatorRunId: "creator", postId: "post" } });
  const builder = await store.createRun({ workflowId: "post.build", workflowRevision: "v1", inputFingerprint: "builder", state: "succeeded",
    parentRunId: root.id, metadata: { creatorRunId: "creator", postId: "post" } });
  const reviewer = await store.createRun({ workflowId: "post.review", workflowRevision: "v2", inputFingerprint: "reviewer", state: "succeeded",
    parentRunId: root.id, metadata: { creatorRunId: "creator", postId: "post" } });
  const producer = async (runId: string) => {
    const step = await store.createStep({ runId, key: "publish", kind: "publish", workflowId: "post.analyze", workflowRevision: "v5",
      inputFingerprint: "input", configFingerprint: "config", state: "succeeded", validation: "valid" });
    const attempt = await store.createAttempt({ runId, stepRunId: step.id, state: "succeeded" });
    return { workflowRunId: runId, stepRunId: step.id, attemptId: attempt.id };
  };
  const buildProducer = await producer(builder.id); const reviewProducer = await producer(reviewer.id);
  const reportSha256 = "a".repeat(64);
  const oldPayload = { reportSha256: "b".repeat(64) };
  const old = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "old", sha256: await artifactPayloadSha256(oldPayload),
    uri: "workflow://old", payload: oldPayload, producedBy: buildProducer, dependsOn: [], validation: "valid", review: "pending" });
  const candidatePayload = { reportSha256 };
  const candidate = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "current", sha256: await artifactPayloadSha256(candidatePayload),
    uri: "workflow://current", payload: candidatePayload, producedBy: buildProducer,
    dependsOn: [{ artifactId: old.id, revision: old.revision, sha256: old.sha256 }], validation: "valid", review: "pending" });
  const publishReview = async (boundCandidate: typeof candidate, hash: string, review: "passed" | "findings") => {
    const payload = { kind: "post", schemaVersion: "research-review@1", candidate: {
      id: boundCandidate.id, revision: boundCandidate.revision, sha256: boundCandidate.sha256 }, candidateReportSha256: hash,
      summary: "独立复核", findings: review === "passed" ? [] : [{ id: "f1", location: "contentRestoration",
        issue: "证据不足", evidenceRefs: [], suggestedChange: "补充可核对证据", priority: "major", kind: "missing_evidence" }] };
    return store.publishArtifact({ type: "post-review", schemaVersion: "research-review@1", revision: crypto.randomUUID(),
      sha256: await artifactPayloadSha256(payload), uri: "workflow://review", payload, producedBy: reviewProducer,
      dependsOn: [{ artifactId: boundCandidate.id, revision: boundCandidate.revision, sha256: boundCandidate.sha256 }], validation: "valid", review });
  };
  const reading = async () => fetch(`${url.replace("/api/workflow-runs", "")}/api/creator-runs/creator/posts/post/workflow-reading?workflowRunId=${root.id}`)
    .then((response) => response.json()) as Promise<{ candidate: { reviewStatus: string } }>;
  await publishReview(old, oldPayload.reportSha256, "passed");
  expect((await reading()).candidate.reviewStatus).toBe("pending");
  await publishReview(candidate, "c".repeat(64), "passed");
  expect((await reading()).candidate.reviewStatus).toBe("pending");
  await publishReview(candidate, reportSha256, "passed");
  expect((await reading()).candidate.reviewStatus).toBe("reviewed");
});

it("preserves legacy evaluation status for the exact candidate without requiring a research-review receipt", async () => {
  const { store, url } = await setup();
  const root = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v4", inputFingerprint: "legacy", state: "succeeded",
    metadata: { creatorRunId: "creator", postId: "post" } });
  const step = await store.createStep({ runId: root.id, key: "publish", kind: "publish", workflowId: root.workflowId,
    workflowRevision: root.workflowRevision, inputFingerprint: "input", configFingerprint: "config", state: "succeeded", validation: "valid" });
  const attempt = await store.createAttempt({ runId: root.id, stepRunId: step.id, state: "succeeded" });
  const producedBy = { workflowRunId: root.id, stepRunId: step.id, attemptId: attempt.id };
  const publish = async (type: string, dependsOn: Array<{ artifactId: string; revision: string; sha256: string }>, review: "pending" | "passed") => {
    const payload = { legacy: type, nonce: crypto.randomUUID() };
    return store.publishArtifact({ type, schemaVersion: "v1", revision: crypto.randomUUID(), sha256: await artifactPayloadSha256(payload),
      uri: `workflow://${type}`, payload, producedBy, dependsOn, validation: "valid", review });
  };
  const candidate = await publish("post-candidate", [], "pending");
  await publish("post-evaluation", [{ artifactId: candidate.id, revision: candidate.revision, sha256: candidate.sha256 }], "passed");
  const reading = async () => fetch(`${url.replace("/api/workflow-runs", "")}/api/creator-runs/creator/posts/post/workflow-reading?workflowRunId=${root.id}`)
    .then((response) => response.json()) as Promise<{ candidate: { reviewStatus: string } }>;
  expect((await reading()).candidate.reviewStatus).toBe("reviewed");
  const repaired = await publish("post-candidate", [{ artifactId: candidate.id, revision: candidate.revision, sha256: candidate.sha256 }], "pending");
  expect((await reading()).candidate.reviewStatus).toBe("pending");
  expect(repaired.id).not.toBe(candidate.id);
});

it("selects the newest post root by creation time and never falls back to an older candidate", async () => {
  const { store, url } = await setup();
  const older = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v5", inputFingerprint: "old", state: "succeeded",
    metadata: { creatorRunId: "creator-a", postId: "post-a", createdAt: "2026-09-18T01:00:00.000Z" } });
  const oldStep = await store.createStep({ runId: older.id, key: "build", kind: "agent", workflowId: older.workflowId, workflowRevision: "v5", inputFingerprint: "i", configFingerprint: "c", state: "succeeded", validation: "valid" });
  const oldAttempt = await store.createAttempt({ runId: older.id, stepRunId: oldStep.id, state: "succeeded" });
  const oldPayload = {};
  await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "old", sha256: await artifactPayloadSha256(oldPayload), uri: "workflow://old", payload: oldPayload, producedBy: { workflowRunId: older.id, stepRunId: oldStep.id, attemptId: oldAttempt.id }, dependsOn: [], validation: "valid", review: "passed" });
  const newest = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v5", inputFingerprint: "new", state: "failed",
    metadata: { creatorRunId: "creator-a", postId: "post-a", createdAt: "2026-09-18T02:00:00.000Z" } });
  const base = url.replace("/api/workflow-runs", "");
  const body = await fetch(`${base}/api/creator-runs/creator-a/posts/post-a/workflow-reading`).then((response) => response.json());
  expect(body).toMatchObject({ workflow: { rootRunId: newest.id, state: "failed", selectedFrom: "latest" }, candidate: null, baseCandidate: null, dispositions: [] });
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
