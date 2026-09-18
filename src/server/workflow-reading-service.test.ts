import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { MemoryRunStore, artifactPayloadSha256 } from "@signal-room/workflow";
import { createResearchReadingService } from "./workflow-reading-service.js";
import { projectPostWorkflowReading } from "./post-workflow-reading.js";

const ref = (artifact: { id: string; revision: string; sha256: string }) => ({ id: artifact.id, revision: artifact.revision, sha256: artifact.sha256 });
const revisionRef = (artifact: { id: string; type: string; revision: string; sha256: string }) => ({ id: artifact.id, type: artifact.type, revision: artifact.revision, sha256: artifact.sha256 });

async function producer(store: MemoryRunStore, runId: string) {
  const step = await store.createStep({ runId, key: "agent", kind: "agent", workflowId: "post.analyze", workflowRevision: "v7",
    inputFingerprint: "i", configFingerprint: "c", state: "succeeded", validation: "valid" });
  const attempt = await store.createAttempt({ runId, stepRunId: step.id, state: "succeeded" });
  return { step, attempt, producedBy: { workflowRunId: runId, stepRunId: step.id, attemptId: attempt.id } };
}

describe("research workflow reading adapters", () => {
  it("maps a published receipt to its exact agent call without time or name inference", async () => {
    const store = new MemoryRunStore();
    const run = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v7", inputFingerprint: "root", state: "running", metadata: { creatorRunId: "creator", postId: "post" } });
    const { step, producedBy } = await producer(store, run.id);
    const receipt = { reportSha256: "a".repeat(64) };
    const candidate = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "1",
      sha256: await artifactPayloadSha256(receipt), uri: "private://candidate", payload: receipt, producedBy, dependsOn: [], validation: "valid", review: "pending" });
    await store.updateStep(step.id, { output: { artifact: receipt } });
    const payload = async (id: string) => (await store.getArtifact(id) as unknown as { payload?: unknown } | undefined)?.payload;
    const snapshot = await createResearchReadingService(store, payload).getSnapshot({ rootRunId: run.id });
    expect(snapshot.calls.find((call) => call.id === step.id)).toMatchObject({ artifactIds: [candidate.id], inputArtifactIds: [] });
  });

  it("accepts an exact same-creator external base only with its exact review witness, and rejects a foreign review", async () => {
    const store = new MemoryRunStore();
    const previous = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v7", inputFingerprint: "old", state: "succeeded", metadata: { creatorRunId: "creator", postId: "post" } });
    const current = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v7", inputFingerprint: "new", state: "succeeded", metadata: { creatorRunId: "creator", postId: "post" } });
    const foreign = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v7", inputFingerprint: "foreign", state: "succeeded", metadata: { creatorRunId: "other", postId: "post" } });
    const priorProducer = await producer(store, previous.id); const currentProducer = await producer(store, current.id); const foreignProducer = await producer(store, foreign.id);
    const basePayload = { reportSha256: "a".repeat(64) };
    const base = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "base", sha256: await artifactPayloadSha256(basePayload), uri: "private://base", payload: basePayload, producedBy: priorProducer.producedBy, dependsOn: [], validation: "valid", review: "pending" });
    const candidatePayload = { reportSha256: "b".repeat(64) };
    const candidate = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "current", sha256: await artifactPayloadSha256(candidatePayload), uri: "private://candidate", payload: candidatePayload, producedBy: currentProducer.producedBy, dependsOn: [], validation: "valid", review: "pending" });
    const reviewPayload = { schemaVersion: "research-review@1", kind: "post", candidate: ref(base), candidateReportSha256: basePayload.reportSha256, summary: "issue", findings: [{ id: "f1", location: "/x", issue: "issue", evidenceRefs: [], suggestedChange: "fix", priority: "major", kind: "content" }] };
    const review = await store.publishArtifact({ type: "post-review", schemaVersion: "research-review@1", revision: "review", sha256: await artifactPayloadSha256(reviewPayload), uri: "private://review", payload: reviewPayload, producedBy: priorProducer.producedBy, dependsOn: [{ artifactId: base.id, revision: base.revision, sha256: base.sha256 }], validation: "valid", review: "findings" });
    const publishRevision = async (reviewRef: typeof review) => {
      const payload = { schemaVersion: "research-revision@1", baseCandidate: revisionRef(base), review: revisionRef(reviewRef), candidate: revisionRef(candidate), dispositions: [{ id: "f1", status: "changed", reason: "fixed" }], validation: { valid: true } };
      return store.publishArtifact({ type: "research-revision", schemaVersion: "research-revision@1", revision: crypto.randomUUID(), sha256: await artifactPayloadSha256(payload), uri: "private://revision", payload, producedBy: currentProducer.producedBy, dependsOn: [ref(base), ref(reviewRef), ref(candidate)].map((item) => ({ artifactId: item.id, revision: item.revision, sha256: item.sha256 })), validation: "valid", review: "findings" });
    };
    await store.updateRun(current.id, { output: { candidate: ref(candidate) } });
    await publishRevision(review);
    const payload = async (id: string) => (await store.getArtifact(id) as unknown as { payload?: unknown } | undefined)?.payload;
    const reading = await projectPostWorkflowReading(store, payload, "creator", "post", current.id);
    expect(reading).toMatchObject({ baseCandidate: { ownerRunId: previous.id, artifactId: base.id }, candidate: { revisionStatus: "revision_unverified" } });

    const foreignReview = await store.publishArtifact({ type: "post-review", schemaVersion: "research-review@1", revision: "foreign", sha256: await artifactPayloadSha256(reviewPayload), uri: "private://foreign", payload: reviewPayload, producedBy: foreignProducer.producedBy, dependsOn: [{ artifactId: base.id, revision: base.revision, sha256: base.sha256 }], validation: "valid", review: "findings" });
    await publishRevision(foreignReview);
    const relations = (await createResearchReadingService(store, payload).getSnapshot({ rootRunId: current.id })).relations;
    expect(relations.filter((relation) => relation.kind === "revises" && relation.validity === "valid")).toHaveLength(1);
  });
});

it("uses the runtime's namespaced phase identity for pending and accepted review", async () => {
  const store = new MemoryRunStore();
  const root = await store.createRun({ workflowId: "post.analyze", workflowRevision: "v7", inputFingerprint: "root", state: "waiting", metadata: { creatorRunId: "creator", postId: "post" } });
  const produced = await producer(store, root.id);
  const body = { reportSha256: "c".repeat(64) };
  const candidate = await store.publishArtifact({ type: "post-candidate", schemaVersion: "v1", revision: "1", sha256: await artifactPayloadSha256(body), uri: "private", payload: body, producedBy: produced.producedBy, dependsOn: [], validation: "valid", review: "pending" });
  const phase = await store.createStep({ runId: root.id, key: "simple-review", kind: "phase", workflowId: root.workflowId, workflowRevision: "v7", inputFingerprint: "i", configFingerprint: "c", state: "waiting", validation: "pending", phaseId: `phase:${root.id}:simple-review`, phasePath: ["simple-review"], phaseDefinition: { title: "复核", purpose: "独立复核" } });
  const payload = async (id: string) => (await store.getArtifact(id) as unknown as { payload?: unknown } | undefined)?.payload;
  expect((await projectPostWorkflowReading(store, payload, "creator", "post", root.id))?.candidate?.reviewStatus).toBe("pending");
  const receipt = { schemaVersion: "research-review@1", kind: "post", candidate: ref(candidate), candidateReportSha256: body.reportSha256, summary: "无意见", findings: [] };
  const review = await store.publishArtifact({ type: "post-review", schemaVersion: "research-review@1", revision: "1", sha256: await artifactPayloadSha256(receipt), uri: "private", payload: receipt, producedBy: produced.producedBy, dependsOn: [{ artifactId: candidate.id, revision: candidate.revision, sha256: candidate.sha256 }], validation: "valid", review: "passed" });
  await store.updateStep(phase.id, { state: "succeeded", output: { ok: true, review } });
  const snapshot = await createResearchReadingService(store, payload).getSnapshot({ rootRunId: root.id });
  expect(snapshot.stages[0]?.review).toBe("passed");
  expect((await projectPostWorkflowReading(store, payload, "creator", "post", root.id))?.candidate?.reviewStatus).toBe("reviewed");
});
