import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { artifactPayloadSha256 } from "@signal-room/workflow";
import { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";

const databases: DatabaseSync[] = [];
function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  return { db, store: new SQLiteWorkflowRunStore(db) };
}
afterEach(() => databases.splice(0).forEach((db) => db.close()));

describe("SQLite workflow ledger", () => {
  it("survives adapter recreation, scopes replay and preserves attempts", async () => {
    const { db, store } = setup();
    const run = await store.createRun({ workflowId: "post", workflowRevision: "1", inputFingerprint: "input", state: "running", metadata: { creatorRunId: "creator" } });
    const step = await store.createStep({ runId: run.id, key: "build", kind: "agent", workflowId: "post", workflowRevision: "1", inputFingerprint: "input", configFingerprint: "model+skill", state: "succeeded", validation: "valid", output: { candidate: "one" } });
    await store.createAttempt({ runId: run.id, stepRunId: step.id, state: "succeeded" });
    const reopened = new SQLiteWorkflowRunStore(db);
    expect(await reopened.listRuns({ metadata: { creatorRunId: "creator" } })).toHaveLength(1);
    expect(await reopened.findReusableStep(step)).toEqual(step);
    expect(await reopened.findReusableStep({ ...step, configFingerprint: "changed-model" })).toBeUndefined();
    expect(await reopened.findReusableStep({ ...step, runId: "another" })).toBeUndefined();
    expect(await reopened.listAttempts(step.id)).toHaveLength(1);
  });

  it("allocates monotonic events and supports incremental reads", async () => {
    const { store } = setup();
    const run = await store.createRun({ workflowId: "post", workflowRevision: "1", inputFingerprint: "x", state: "running" });
    const events = await Promise.all(Array.from({ length: 25 }, () => store.appendEvent({ runId: run.id, type: "progress" })));
    expect(events.map((event) => event.seq)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect((await store.listEvents(run.id, 23)).map((event) => event.seq)).toEqual([24, 25]);
  });

  it("keeps artifact versions immutable and rejects broken provenance", async () => {
    const { db, store } = setup();
    const run = await store.createRun({ workflowId: "post", workflowRevision: "1", inputFingerprint: "x", state: "running" });
    const step = await store.createStep({ runId: run.id, key: "publish", kind: "publish", workflowId: "post", workflowRevision: "1", inputFingerprint: "x", configFingerprint: "x", state: "running", validation: "pending" });
    const attempt = await store.createAttempt({ runId: run.id, stepRunId: step.id, state: "running" });
    const candidatePayload = { text: "candidate" };
    const draft = { type: "report", schemaVersion: "1", revision: "1", sha256: await artifactPayloadSha256(candidatePayload),
      uri: "artifact://candidate", payload: candidatePayload, producedBy: { workflowRunId: run.id, stepRunId: step.id, attemptId: attempt.id }, dependsOn: [], validation: "valid" as const, review: "pending" as const };
    const first = await store.publishArtifact(draft);
    const repairedPayload = { text: "repaired" };
    const second = await store.publishArtifact({ ...draft, revision: "2", sha256: await artifactPayloadSha256(repairedPayload),
      payload: repairedPayload, dependsOn: [{ artifactId: first.id, revision: first.revision, sha256: first.sha256 }] });
    expect(first.id).not.toBe(second.id);
    expect(await store.getArtifactPayload(first.id)).toEqual({ text: "candidate" });
    expect(await store.listArtifacts(run.id)).toHaveLength(2);
    await expect(store.publishArtifact({ ...draft, producedBy: { ...draft.producedBy, attemptId: "missing" } })).rejects.toThrow("provenance");
    await expect(store.publishArtifact({ ...draft, dependsOn: [{ artifactId: first.id, revision: "0", sha256: first.sha256 }] })).rejects.toThrow("dependency mismatch");
    await expect(store.publishArtifact({ ...draft, sha256: "0".repeat(64) })).rejects.toThrow("SHA-256 mismatch");
    db.prepare("UPDATE workflow_artifacts SET payload = ? WHERE id = ?")
      .run(JSON.stringify({ text: "tampered but valid JSON" }), first.id);
    await expect(store.getArtifactPayload(first.id)).rejects.toThrow("integrity check failed");
  });

  it("persists phase definitions, ownership, and artifact bindings without copying assets", async () => {
    const { db, store } = setup();
    const run = await store.createRun({ workflowId: "phase-test", workflowRevision: "1", inputFingerprint: "x", state: "running" });
    const phase = await store.createStep({ runId: run.id, key: "research", kind: "phase", workflowId: "phase-test",
      workflowRevision: "1", inputFingerprint: "phase", configFingerprint: "phase:v1", state: "running", validation: "valid",
      phaseId: `phase:${run.id}:research`, phasePath: ["research"],
      phaseDefinition: { title: "Research", purpose: "Collect evidence", expectedArtifacts: [{ role: "evidence", required: true }] } });
    const attempt = await store.createAttempt({ runId: run.id, stepRunId: phase.id, state: "running" });
    const payload = { evidence: true };
    const artifact = await store.publishArtifact({ type: "evidence", schemaVersion: "1", revision: "1",
      sha256: await artifactPayloadSha256(payload), uri: "artifact://phase-evidence", payload,
      producedBy: { workflowRunId: run.id, stepRunId: phase.id, attemptId: attempt.id }, dependsOn: [],
      validation: "valid", review: "not_applicable" });
    await store.updateStep(phase.id, { artifactBindings: [{ artifact, role: "evidence", primary: true }] });
    const reopened = new SQLiteWorkflowRunStore(db);
    expect((await reopened.listSteps(run.id))[0]).toMatchObject({ phaseId: `phase:${run.id}:research`,
      phasePath: ["research"], phaseDefinition: { title: "Research" },
      artifactBindings: [{ artifact: { id: artifact.id }, role: "evidence", primary: true }] });
    expect(await reopened.listArtifacts(run.id)).toHaveLength(1);
  });
});
