import { createHash, randomUUID } from "node:crypto";
import {
  learningLoopArtifactKindSchema,
  learningLoopRunSchema,
  type LearningLoopArtifact,
  type LearningLoopBlindTrace,
  type LearningLoopCase,
  type LearningLoopDiagnosis,
  type LearningLoopGate,
  type LearningLoopObservationAdjudication,
  type LearningLoopRegression,
  type LearningLoopRun,
  type LearningLoopStatus
} from "../../../contracts/index.js";
import type { LearningLoopRepository } from "./repository.js";

const forbiddenBlindKinds = new Set(["candidate", "audit", "evaluator"]);
const threeLensKinds = ["content_restoration", "directing_logic", "visual_editing_logic"] as const;

export class LearningLoopGateError extends Error {
  constructor(public readonly gate: string, message: string) {
    super(message);
    this.name = "LearningLoopGateError";
  }
}

function commandHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function now(): string { return new Date().toISOString(); }

function requireStatus(run: LearningLoopRun, allowed: LearningLoopStatus[]): void {
  if (!allowed.includes(run.status)) throw new LearningLoopGateError("state_transition", `status ${run.status} cannot perform this operation`);
}

function evolve(run: LearningLoopRun, patch: Partial<LearningLoopRun>): LearningLoopRun {
  return learningLoopRunSchema.parse({ ...run, ...patch, revision: run.revision + 1, updatedAt: now() });
}

function latestGate(run: LearningLoopRun, caseId: string | null, kind: LearningLoopGate["kind"]): LearningLoopGate | undefined {
  return [...run.gates].reverse().find((item) => item.caseId === caseId && item.kind === kind);
}

export class LearningLoopService {
  constructor(private readonly repository: LearningLoopRepository) {}

  create(input: { id?: string; policyVersion: string; inputHash: string; upstreamHashes: Record<string, string>; targetCreatorIds: string[]; pendingObservationIds?: string[]; operationKey: string }): LearningLoopRun {
    const timestamp = now();
    const run = learningLoopRunSchema.parse({
      id: input.id ?? randomUUID(), status: "draft", policyVersion: input.policyVersion,
      inputHash: input.inputHash, upstreamHashes: input.upstreamHashes,
      targetCreatorIds: input.targetCreatorIds, cases: [], artifacts: [], gates: [], blindTraces: [],
      diagnoses: [], regressions: [], observationAdjudications: [], pendingObservationIds: input.pendingObservationIds ?? [],
      blockedReason: null, failureReason: null, staleReason: null, revision: 0, createdAt: timestamp, updatedAt: timestamp
    });
    return this.repository.create(run, input.operationKey, commandHash(input));
  }

  get(runId: string): LearningLoopRun | null { return this.repository.get(runId); }

  move(runId: string, operationKey: string, target: "sampling" | "creator_running" | "video_evaluating"): LearningLoopRun {
    const allowed: Record<typeof target, LearningLoopStatus[]> = {
      sampling: ["draft"], creator_running: ["sampling"], video_evaluating: ["creator_running"]
    };
    return this.repository.mutate(runId, operationKey, commandHash({ target }), (run) => {
      requireStatus(run, allowed[target]);
      if (target === "creator_running" && (!run.cases.some((item) => item.role === "development") || !run.cases.some((item) => item.role === "holdout"))) {
        throw new LearningLoopGateError("sample_split", "development and holdout cases are both required");
      }
      if (target === "creator_running") {
        const sourceGates: LearningLoopGate[] = [];
        for (const item of run.cases) {
          const source = run.artifacts.find((artifact) => artifact.caseId === item.id && artifact.kind === "source" && artifact.sha256 === item.sourceHash);
          if (!source) throw new LearningLoopGateError("source_integrity", `${item.id} is missing its immutable source hash`);
          sourceGates.push({
            id: `source-integrity:${item.id}:${item.sourceHash}`, runId, caseId: item.id, kind: "source_integrity",
            pass: true, evaluatorId: "learning-loop-source-gate", evaluatorVersion: run.policyVersion,
            evidenceArtifactIds: [source.id], reasons: [], passedChecks: 1, requiredChecks: 1, createdAt: now()
          });
        }
        return evolve(run, { status: target, gates: [...run.gates, ...sourceGates] });
      }
      return evolve(run, { status: target });
    });
  }

  addCases(runId: string, operationKey: string, cases: LearningLoopCase[]): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(cases), (run) => {
      requireStatus(run, ["sampling"]);
      if (cases.some((item) => item.runId !== runId)) throw new LearningLoopGateError("case_ownership", "case belongs to another run");
      const ids = new Set(run.cases.map((item) => item.id));
      if (cases.some((item) => ids.has(item.id))) throw new LearningLoopGateError("case_identity", "duplicate case id");
      return evolve(run, { cases: [...run.cases, ...cases] });
    });
  }

  addArtifact(runId: string, operationKey: string, artifact: LearningLoopArtifact): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(artifact), (run) => {
      requireStatus(run, ["sampling", "creator_running", "video_evaluating", "blind_testing", "diagnosing", "repair_queued", "regression_testing", "observation_adjudicating"]);
      if (run.artifacts.some((item) => item.id === artifact.id)) throw new LearningLoopGateError("artifact_identity", "duplicate artifact id");
      for (const parentId of artifact.parentArtifactIds) if (!run.artifacts.some((item) => item.id === parentId)) throw new LearningLoopGateError("artifact_lineage", `missing parent ${parentId}`);
      return evolve(run, { artifacts: [...run.artifacts, artifact] });
    });
  }

  recordLensGate(runId: string, operationKey: string, gate: LearningLoopGate): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(gate), (run) => {
      requireStatus(run, ["video_evaluating"]);
      if (!gate.caseId || !threeLensKinds.includes(gate.kind as typeof threeLensKinds[number])) throw new LearningLoopGateError("lens_gate", "a CR/DL/VE case gate is required");
      if (gate.runId !== runId || !run.cases.some((item) => item.id === gate.caseId)) throw new LearningLoopGateError("gate_ownership", "unknown case");
      if (gate.evidenceArtifactIds.some((id) => !run.artifacts.some((item) => item.id === id))) throw new LearningLoopGateError("gate_evidence", "gate evidence is missing");
      return evolve(run, { gates: [...run.gates, gate] });
    });
  }

  beginBlindTesting(runId: string, operationKey: string, traces: LearningLoopBlindTrace[]): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(traces), (run) => {
      requireStatus(run, ["video_evaluating"]);
      for (const item of run.cases) {
        for (const kind of threeLensKinds) {
          const gate = latestGate(run, item.id, kind);
          const required = kind === "visual_editing_logic" ? 7 : 6;
          if (gate?.pass !== true || gate.requiredChecks !== required || gate.passedChecks !== required) throw new LearningLoopGateError("three_lens", `${item.id} has not passed ${kind} ${required}/${required}`);
        }
      }
      if (traces.length === 0 || traces.some((trace) => trace.runId !== runId || !run.cases.some((item) => item.id === trace.caseId))) throw new LearningLoopGateError("blind_trace", "a trace is required for a known case");
      for (const trace of traces) {
        const inputs = trace.inputArtifactIds.map((id) => run.artifacts.find((item) => item.id === id));
        if (inputs.some((item) => !item)) throw new LearningLoopGateError("blind_input_isolation", "blind input artifact is missing");
        const leaked = inputs.filter((item) => item && forbiddenBlindKinds.has(item.kind)).map((item) => item!.kind);
        const notAllowed = inputs.filter((item) => item && !trace.allowedKinds.includes(item.kind)).map((item) => item!.kind);
        if (leaked.length || notAllowed.length || trace.leakageKinds.length) throw new LearningLoopGateError("blind_input_isolation", `blind input leak: ${[...leaked, ...notAllowed, ...trace.leakageKinds].join(",")}`);
      }
      const isolationGates: LearningLoopGate[] = traces.map((trace) => ({
        id: `blind-input-isolation:${trace.id}`, runId, caseId: trace.caseId, kind: "blind_input_isolation",
        pass: true, evaluatorId: "learning-loop-isolation-gate", evaluatorVersion: run.policyVersion,
        evidenceArtifactIds: trace.inputArtifactIds, reasons: [], passedChecks: trace.inputArtifactIds.length,
        requiredChecks: trace.inputArtifactIds.length, createdAt: now()
      }));
      return evolve(run, { status: "blind_testing", blindTraces: [...run.blindTraces, ...traces], gates: [...run.gates, ...isolationGates] });
    });
  }

  recordBlindResults(runId: string, operationKey: string, updates: Array<{ traceId: string; pass: boolean; outputArtifactId: string; completedAt: string }>): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(updates), (run) => {
      requireStatus(run, ["blind_testing"]);
      const byId = new Map(updates.map((item) => [item.traceId, item]));
      const resultGates: LearningLoopGate[] = [];
      const traces = run.blindTraces.map((trace) => {
        const update = byId.get(trace.id);
        if (!update) return trace;
        if (!run.artifacts.some((item) => item.id === update.outputArtifactId)) throw new LearningLoopGateError("blind_output", "blind output artifact is missing");
        const output = run.artifacts.find((item) => item.id === update.outputArtifactId)!;
        if (output.kind !== "blind_trace" || trace.inputArtifactIds.some((id) => !output.parentArtifactIds.includes(id))) throw new LearningLoopGateError("blind_traceability", "blind output must preserve every sealed input as lineage");
        resultGates.push({
          id: `blind-traceability:${trace.id}`, runId, caseId: trace.caseId, kind: "blind_traceability", pass: true,
          evaluatorId: "learning-loop-lineage-gate", evaluatorVersion: run.policyVersion,
          evidenceArtifactIds: [update.outputArtifactId], reasons: [], passedChecks: 1, requiredChecks: 1, createdAt: now()
        }, {
          id: `blind-quality:${trace.id}`, runId, caseId: trace.caseId, kind: "blind_quality", pass: update.pass,
          evaluatorId: "independent-blind-user-agent", evaluatorVersion: run.policyVersion,
          evidenceArtifactIds: [update.outputArtifactId], reasons: update.pass ? [] : ["blind user task failed"],
          passedChecks: update.pass ? 1 : 0, requiredChecks: 1, createdAt: now()
        });
        return { ...trace, pass: update.pass, outputArtifactId: update.outputArtifactId, completedAt: update.completedAt };
      });
      if (traces.some((item) => item.pass === null)) throw new LearningLoopGateError("blind_completion", "every blind trace requires a result");
      return evolve(run, { status: "diagnosing", blindTraces: traces, gates: [...run.gates, ...resultGates] });
    });
  }

  recordDiagnosis(runId: string, operationKey: string, diagnosis: LearningLoopDiagnosis): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(diagnosis), (run) => {
      requireStatus(run, ["diagnosing"]);
      if (!run.artifacts.some((item) => item.id === diagnosis.artifactId) || diagnosis.blindTraceIds.some((id) => !run.blindTraces.some((item) => item.id === id))) throw new LearningLoopGateError("diagnosis_lineage", "diagnosis evidence is incomplete");
      const hasBlindFailure = run.blindTraces.some((item) => item.pass === false);
      if (hasBlindFailure && diagnosis.failureClosures.length === 0) throw new LearningLoopGateError("diagnosis_closure", "blind failures require a named failure closure");
      return evolve(run, { status: diagnosis.proposedRepairs.length ? "repair_queued" : "regression_testing", diagnoses: [...run.diagnoses, diagnosis] });
    });
  }

  beginRegression(runId: string, operationKey: string): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash({ action: "begin_regression" }), (run) => {
      requireStatus(run, ["repair_queued"]);
      return evolve(run, { status: "regression_testing" });
    });
  }

  recordRegression(runId: string, operationKey: string, regression: LearningLoopRegression, gates: [LearningLoopGate, LearningLoopGate, LearningLoopGate]): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash({ regression, gates }), (run) => {
      requireStatus(run, ["regression_testing"]);
      const expected = new Map(gates.map((item) => [item.kind, item]));
      for (const kind of ["regression", "untouched_holdout", "meta_coverage"] as const) {
        const gate = expected.get(kind);
        if (!gate || !gate.pass) throw new LearningLoopGateError(kind, `${kind} must pass`);
      }
      const holdouts = regression.untouchedHoldoutCaseIds.map((id) => run.cases.find((item) => item.id === id));
      if (holdouts.length === 0 || holdouts.some((item) => !item || item.role !== "holdout" || !item.untouched)) throw new LearningLoopGateError("untouched_holdout", "an untouched holdout is required");
      if (!run.artifacts.some((item) => item.id === regression.artifactId) || gates.some((gate) => gate.evidenceArtifactIds.some((id) => !run.artifacts.some((item) => item.id === id)))) throw new LearningLoopGateError("regression_lineage", "regression evidence is incomplete");
      if (expected.get("regression")?.id !== regression.regressionGateId
        || expected.get("untouched_holdout")?.id !== regression.holdoutGateId
        || expected.get("meta_coverage")?.id !== regression.metaGateId) {
        throw new LearningLoopGateError("regression_lineage", "regression gate ids do not match their closures");
      }
      return evolve(run, { status: "observation_adjudicating", gates: [...run.gates, ...gates], regressions: [...run.regressions, regression] });
    });
  }

  adjudicate(runId: string, operationKey: string, decisions: LearningLoopObservationAdjudication[]): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(decisions), (run) => {
      requireStatus(run, ["observation_adjudicating"]);
      const decided = new Set(decisions.map((item) => item.observationId));
      if (run.pendingObservationIds.some((id) => !decided.has(id))) throw new LearningLoopGateError("observation_adjudication", "every pending observation must be adjudicated");
      if (decisions.some((item) => item.runId !== runId || !run.artifacts.some((artifact) => artifact.id === item.artifactId && artifact.kind === "adjudication"))) throw new LearningLoopGateError("adjudication_lineage", "independent adjudication evidence is incomplete");
      const parsed = decisions.map((item) => ({ ...item, eligible: item.decision === "promote" }));
      const adjudicationGate: LearningLoopGate = {
        id: `observation-adjudication:${run.revision + 1}`, runId, caseId: null, kind: "observation_adjudication",
        pass: true, evaluatorId: "independent-observation-adjudicator", evaluatorVersion: run.policyVersion,
        evidenceArtifactIds: [...new Set(parsed.map((item) => item.artifactId))], reasons: [],
        passedChecks: parsed.length || 1, requiredChecks: parsed.length || 1, createdAt: now()
      };
      return evolve(run, {
        status: parsed.some((item) => item.eligible) ? "promoted" : "completed_no_promotion",
        observationAdjudications: [...run.observationAdjudications, ...parsed], gates: [...run.gates, adjudicationGate]
      });
    });
  }

  checkUpstreamHashes(runId: string, operationKey: string, current: Record<string, string>): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash(current), (run) => {
      const changed = Object.entries(run.upstreamHashes).filter(([key, value]) => current[key] !== value).map(([key]) => key);
      if (changed.length === 0) return evolve(run, {});
      return evolve(run, { status: "stale", staleReason: `upstream hash changed: ${changed.join(", ")}` });
    });
  }

  stop(runId: string, operationKey: string, status: "blocked" | "failed", reason: string): LearningLoopRun {
    return this.repository.mutate(runId, operationKey, commandHash({ status, reason }), (run) => {
      requireStatus(run, ["draft", "sampling", "creator_running", "video_evaluating", "blind_testing", "diagnosing", "repair_queued", "regression_testing", "observation_adjudicating"]);
      if (!reason.trim()) throw new LearningLoopGateError("terminal_reason", `${status} requires a reason`);
      return evolve(run, status === "blocked" ? { status, blockedReason: reason } : { status, failureReason: reason });
    });
  }
}

export { forbiddenBlindKinds, learningLoopArtifactKindSchema };
