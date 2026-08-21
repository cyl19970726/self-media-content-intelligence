import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type {
  LearningLoopArtifact,
  LearningLoopBlindTrace,
  LearningLoopCase,
  LearningLoopGate
} from "../../shared/learning-loop.js";
import { LearningLoopGateError, LearningLoopService } from "../../modules/learning-loop/service.js";
import { SQLiteLearningLoopRepository } from "./sqlite-learning-loop-repository.js";

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);
const hashC = "c".repeat(64);
const timestamp = "2026-08-21T00:00:00.000Z";

function harness() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learning-loop-"));
  const filePath = path.join(directory, "loop.sqlite");
  const repository = new SQLiteLearningLoopRepository(filePath);
  const service = new LearningLoopService(repository);
  const run = service.create({
    id: "run-1", policyVersion: "loop-v1", inputHash: "input-v1",
    upstreamHashes: { corpus: "corpus-v1", method: "method-v1" },
    targetCreatorIds: ["creator-1"], pendingObservationIds: ["obs-1"], operationKey: "create"
  });
  return { directory, filePath, repository, service, run };
}

function artifact(id: string, caseId: string | null, kind: LearningLoopArtifact["kind"], sha256 = hashC, parents: string[] = []): LearningLoopArtifact {
  return { id, runId: "run-1", caseId, kind, uri: `artifact://${id}`, sha256, parentArtifactIds: parents, createdAt: timestamp };
}

function gate(id: string, caseId: string | null, kind: LearningLoopGate["kind"], evidenceArtifactId: string, pass = true, requiredChecks = 1): LearningLoopGate {
  return {
    id, runId: "run-1", caseId, kind, pass, evaluatorId: "independent-evaluator",
    evaluatorVersion: "1", evidenceArtifactIds: [evidenceArtifactId], reasons: pass ? [] : ["fixture failure"],
    passedChecks: pass ? requiredChecks : 0, requiredChecks, createdAt: timestamp
  };
}

function cases(): LearningLoopCase[] {
  return [
    { id: "dev", runId: "run-1", role: "development", creatorId: "creator-1", videoId: "video-dev", sourceRevisionId: "source-dev-v1", sourceHash: hashA, untouched: false, createdAt: timestamp },
    { id: "holdout", runId: "run-1", role: "holdout", creatorId: "creator-1", videoId: "video-holdout", sourceRevisionId: "source-holdout-v1", sourceHash: hashB, untouched: true, createdAt: timestamp }
  ];
}

function toSampling(context: ReturnType<typeof harness>): void {
  context.service.move("run-1", "sampling", "sampling");
  context.service.addCases("run-1", "cases", cases());
}

function addSources(context: ReturnType<typeof harness>): void {
  context.service.addArtifact("run-1", "source-dev", artifact("source-dev", "dev", "source", hashA));
  context.service.addArtifact("run-1", "source-holdout", artifact("source-holdout", "holdout", "source", hashB));
}

function toVideoEvaluating(context: ReturnType<typeof harness>): void {
  toSampling(context);
  addSources(context);
  context.service.move("run-1", "creator-running", "creator_running");
  context.service.move("run-1", "video-evaluating", "video_evaluating");
  context.service.addArtifact("run-1", "candidate-dev", artifact("candidate-dev", "dev", "candidate", hashC, ["source-dev"]));
  context.service.addArtifact("run-1", "candidate-holdout", artifact("candidate-holdout", "holdout", "candidate", hashC, ["source-holdout"]));
}

function addPassingLensGates(context: ReturnType<typeof harness>): void {
  for (const caseId of ["dev", "holdout"]) {
    const evidence = `candidate-${caseId}`;
    context.service.recordLensGate("run-1", `${caseId}-cr`, gate(`${caseId}-cr`, caseId, "content_restoration", evidence, true, 6));
    context.service.recordLensGate("run-1", `${caseId}-dl`, gate(`${caseId}-dl`, caseId, "directing_logic", evidence, true, 6));
    context.service.recordLensGate("run-1", `${caseId}-ve`, gate(`${caseId}-ve`, caseId, "visual_editing_logic", evidence, true, 7));
  }
}

function blindTrace(caseId = "holdout", inputId = "source-holdout"): LearningLoopBlindTrace {
  return {
    id: `trace-${caseId}`, runId: "run-1", caseId, inputArtifactIds: [inputId], allowedKinds: ["source", "capture"],
    outputArtifactId: null, leakageKinds: [], pass: null, createdAt: timestamp, completedAt: null
  };
}

function toDiagnosing(context: ReturnType<typeof harness>, blindPass: boolean): void {
  toVideoEvaluating(context);
  addPassingLensGates(context);
  context.service.beginBlindTesting("run-1", "blind-start", [blindTrace()]);
  context.service.addArtifact("run-1", "blind-output", artifact("blind-output", "holdout", "blind_trace", hashC, ["source-holdout"]));
  context.service.recordBlindResults("run-1", "blind-result", [{ traceId: "trace-holdout", pass: blindPass, outputArtifactId: "blind-output", completedAt: timestamp }]);
}

function toRegression(context: ReturnType<typeof harness>): void {
  toDiagnosing(context, false);
  context.service.addArtifact("run-1", "diagnosis-artifact", artifact("diagnosis-artifact", null, "diagnosis", hashC, ["blind-output"]));
  context.service.recordDiagnosis("run-1", "diagnosis", {
    id: "diagnosis-1", runId: "run-1", blindTraceIds: ["trace-holdout"], failureClosures: ["missing visual proof"],
    proposedRepairs: ["capture the missing state transition"], artifactId: "diagnosis-artifact", createdAt: timestamp
  });
  context.service.addArtifact("run-1", "repair-artifact", artifact("repair-artifact", "dev", "repair", hashC, ["candidate-dev", "diagnosis-artifact"]));
  context.service.beginRegression("run-1", "begin-regression");
  context.service.addArtifact("run-1", "regression-artifact", artifact("regression-artifact", null, "regression", hashC, ["repair-artifact", "source-holdout"]));
}

describe("SQLiteLearningLoopRepository and hard-gated loop", () => {
  it("recovers after restart and makes operations idempotent", () => {
    const context = harness();
    const first = context.service.move("run-1", "sampling", "sampling");
    const duplicate = context.service.move("run-1", "sampling", "sampling");
    expect(duplicate.revision).toBe(first.revision);
    expect(context.repository.listEvents("run-1")).toHaveLength(2);
    context.repository.close();
    const reopened = new SQLiteLearningLoopRepository(context.filePath);
    expect(reopened.get("run-1")?.status).toBe("sampling");
    expect(reopened.listEvents("run-1").map((item) => item.toStatus)).toEqual(["draft", "sampling"]);
    expect(() => reopened.mutate("run-1", "sampling", "different-command", (run) => run)).toThrow(/idempotency conflict/);
    reopened.close();
  });

  it("recovers cases, artifact DAG, gates, and blind traces after restart", () => {
    const context = harness();
    toDiagnosing(context, false);
    const before = context.service.get("run-1")!;
    context.repository.close();
    const reopened = new SQLiteLearningLoopRepository(context.filePath);
    const after = reopened.get("run-1")!;
    expect(after.status).toBe("diagnosing");
    expect(after.cases).toEqual(before.cases);
    expect(after.artifacts).toEqual(before.artifacts);
    expect(after.gates).toEqual(before.gates);
    expect(after.blindTraces).toEqual(before.blindTraces);
    expect(after.gates.find((item) => item.kind === "blind_quality")?.pass).toBe(false);
    reopened.close();
  });

  it("fails LOOP-SOURCE when a sampled source hash is absent", () => {
    const context = harness();
    toSampling(context);
    context.service.addArtifact("run-1", "source-dev", artifact("source-dev", "dev", "source", hashA));
    expect(() => context.service.move("run-1", "creator-running", "creator_running")).toThrowError(new LearningLoopGateError("source_integrity", "holdout is missing its immutable source hash"));
    expect(context.service.get("run-1")?.status).toBe("sampling");
  });

  it.each([
    ["content_restoration", 5, "6/6"],
    ["directing_logic", 5, "6/6"],
    ["visual_editing_logic", 6, "7/7"]
  ] as const)("fails the %s VIDEO-THREE-LENS gate at incomplete coverage", (kind, incompleteChecks, expected) => {
    const context = harness();
    toVideoEvaluating(context);
    addPassingLensGates(context);
    context.service.recordLensGate("run-1", `holdout-${kind}-regressed`, gate(`holdout-${kind}-regressed`, "holdout", kind, "candidate-holdout", true, incompleteChecks));
    expect(() => context.service.beginBlindTesting("run-1", "blind", [blindTrace()])).toThrowError(new RegExp(expected.replace("/", "\\/")));
    expect(context.service.get("run-1")?.status).toBe("video_evaluating");
  });

  it("fails BLIND-INPUT-ISOLATION if candidate, audit, or evaluator material leaks", () => {
    const context = harness();
    toVideoEvaluating(context);
    addPassingLensGates(context);
    const trace = blindTrace("holdout", "candidate-holdout");
    trace.allowedKinds = ["candidate"];
    expect(() => context.service.beginBlindTesting("run-1", "blind", [trace])).toThrowError(/blind input leak: candidate/);
  });

  it("fails BLIND-TRACEABILITY unless output lineage names every sealed input", () => {
    const context = harness();
    toVideoEvaluating(context);
    addPassingLensGates(context);
    context.service.beginBlindTesting("run-1", "blind", [blindTrace()]);
    context.service.addArtifact("run-1", "blind-output", artifact("blind-output", "holdout", "blind_trace"));
    expect(() => context.service.recordBlindResults("run-1", "result", [{ traceId: "trace-holdout", pass: true, outputArtifactId: "blind-output", completedAt: timestamp }])).toThrowError(/preserve every sealed input/);
    expect(context.service.get("run-1")?.status).toBe("blind_testing");
  });

  it("routes a blind failure only to diagnosing", () => {
    const context = harness();
    toDiagnosing(context, false);
    expect(context.service.get("run-1")?.status).toBe("diagnosing");
    expect(context.service.get("run-1")?.gates.find((item) => item.kind === "blind_quality")?.pass).toBe(false);
    expect(() => context.service.beginRegression("run-1", "skip-diagnosis")).toThrowError(/cannot perform/);
  });

  it.each([
    ["regression", "regression"],
    ["untouched_holdout", "untouched_holdout"],
    ["meta_coverage", "meta_coverage"]
  ] as const)("fails the %s gate before observation adjudication", (_label, failingKind) => {
    const context = harness();
    toRegression(context);
    const gates = [
      gate("regression-gate", null, "regression", "regression-artifact"),
      gate("holdout-gate", null, "untouched_holdout", "regression-artifact"),
      gate("meta-gate", null, "meta_coverage", "regression-artifact")
    ] as [LearningLoopGate, LearningLoopGate, LearningLoopGate];
    const failing = gates.find((item) => item.kind === failingKind)!;
    failing.pass = false; failing.passedChecks = 0; failing.reasons = ["fixture failure"];
    expect(() => context.service.recordRegression("run-1", `regression-${failingKind}`, {
      id: "regression-1", runId: "run-1", repairedCaseIds: ["dev"], untouchedHoldoutCaseIds: ["holdout"],
      regressionGateId: "regression-gate", holdoutGateId: "holdout-gate", metaGateId: "meta-gate",
      artifactId: "regression-artifact", createdAt: timestamp
    }, gates)).toThrowError(new RegExp(failingKind));
    expect(context.service.get("run-1")?.status).toBe("regression_testing");
  });

  it("fails HOLDOUT when the named case was touched or is not holdout", () => {
    const context = harness();
    toRegression(context);
    const gates = [
      gate("regression-gate", null, "regression", "regression-artifact"),
      gate("holdout-gate", null, "untouched_holdout", "regression-artifact"),
      gate("meta-gate", null, "meta_coverage", "regression-artifact")
    ] as [LearningLoopGate, LearningLoopGate, LearningLoopGate];
    expect(() => context.service.recordRegression("run-1", "bad-holdout", {
      id: "regression-1", runId: "run-1", repairedCaseIds: ["dev"], untouchedHoldoutCaseIds: ["dev"],
      regressionGateId: "regression-gate", holdoutGateId: "holdout-gate", metaGateId: "meta-gate", artifactId: "regression-artifact", createdAt: timestamp
    }, gates)).toThrowError(/untouched holdout/);
  });

  it("requires independent adjudication before any observation is eligible", () => {
    const context = harness();
    toRegression(context);
    const gates = [
      gate("regression-gate", null, "regression", "regression-artifact"),
      gate("holdout-gate", null, "untouched_holdout", "regression-artifact"),
      gate("meta-gate", null, "meta_coverage", "regression-artifact")
    ] as [LearningLoopGate, LearningLoopGate, LearningLoopGate];
    context.service.recordRegression("run-1", "regression-pass", {
      id: "regression-1", runId: "run-1", repairedCaseIds: ["dev"], untouchedHoldoutCaseIds: ["holdout"],
      regressionGateId: "regression-gate", holdoutGateId: "holdout-gate", metaGateId: "meta-gate", artifactId: "regression-artifact", createdAt: timestamp
    }, gates);
    context.service.addArtifact("run-1", "adjudication-artifact", artifact("adjudication-artifact", null, "adjudication", hashC, ["regression-artifact"]));
    expect(() => context.service.adjudicate("run-1", "empty-adjudication", [])).toThrowError(/every pending observation/);
    const completed = context.service.adjudicate("run-1", "adjudication", [{
      id: "decision-1", runId: "run-1", observationId: "obs-1", decision: "promote", eligible: false,
      rationale: "independent evidence survives regression", adjudicatorId: "independent-adjudicator", artifactId: "adjudication-artifact", createdAt: timestamp
    }]);
    expect(completed.status).toBe("promoted");
    expect(completed.observationAdjudications[0]?.eligible).toBe(true);
  });

  it("marks the run stale when any upstream hash changes", () => {
    const context = harness();
    const stale = context.service.checkUpstreamHashes("run-1", "hash-check", { corpus: "corpus-v2", method: "method-v1" });
    expect(stale.status).toBe("stale");
    expect(stale.staleReason).toContain("corpus");
  });
});
