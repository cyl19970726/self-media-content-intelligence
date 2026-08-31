import { describe, expect, it } from "vitest";
import {
  contentRestorationRuleIds,
  deriveRuntimeThreeLensGateReport,
  directingLogicRuleIds,
  runtimeThreeLensEvaluationSchema,
  runtimeThreeLensGateReportSchema,
  inspectRuntimeThreeLensArtifacts,
  visualEditingRuleIds
} from "./runtime-three-lens-contracts.js";
import { videoReconstructionBatchSchema } from "./batch-contracts.js";

const fingerprint = "a".repeat(64);

function rules(ids: readonly string[], status: "pass" | "fail" | "not_checked" = "pass") {
  return ids.map((ruleId, index) => ({
    ruleId,
    status,
    finding: `${ruleId} has a concrete finding`,
    evidenceRefs: status === "pass" ? [{
      kind: "frame",
      refId: `FRAME-${index + 1}`,
      artifactRef: "/artifacts/run/evidence/frames.json",
      jsonPointer: `/frames/${index}`,
      startMs: index * 1000,
      endMs: index * 1000 + 500
    }] : [],
    evaluatorNotes: `${ruleId} was independently checked`
  }));
}

function evaluator(lens: string) {
  return {
    evaluatorId: `runtime-${lens}`,
    evaluatorVersion: "three-lens-v1",
    evaluatorRunId: "00000000-0000-4000-8000-000000000001",
    lens,
    evaluatedAt: "2026-08-21T06:00:00.000Z",
    independentOfCandidate: true,
    candidateRevisionFingerprint: fingerprint
  };
}

function candidate(overrides: { dlStatus?: "pass" | "fail" | "not_checked" } = {}) {
  return {
    schemaVersion: "runtime-three-lens-evaluation@2",
    postExternalId: "post-1",
    candidateRevision: {
      algorithm: "sha256",
      fingerprint,
      reconstructionArtifactRef: "/artifacts/run/reconstruction.json"
    },
    lenses: {
      contentRestoration: { evaluator: evaluator("content_restoration"), rules: rules(contentRestorationRuleIds) },
      directingLogic: { evaluator: evaluator("directing_logic"), rules: rules(directingLogicRuleIds, overrides.dlStatus) },
      visualEditing: { evaluator: evaluator("visual_editing"), rules: rules(visualEditingRuleIds) }
    }
  };
}

describe("runtime three-lens contract", () => {
  it("is ready only when one independent evaluator process checks all 19 rules", () => {
    const evaluation = runtimeThreeLensEvaluationSchema.parse(candidate());
    const report = deriveRuntimeThreeLensGateReport(evaluation, "/artifacts/run/runtime-three-lens-evaluation.json");
    expect(report).toMatchObject({ status: "ready", ready: true, gateCount: 19 });
    expect(report.passedGateIds).toHaveLength(19);
    expect(report.failedGateIds).toEqual([]);
    expect(report.uncheckedGateIds).toEqual([]);
  });

  it("fails closed when a lens has unchecked work", () => {
    const evaluation = runtimeThreeLensEvaluationSchema.parse(candidate({ dlStatus: "not_checked" }));
    const report = deriveRuntimeThreeLensGateReport(evaluation, "/artifacts/run/runtime-three-lens-evaluation.json");
    expect(report.status).toBe("partial");
    expect(report.ready).toBe(false);
    expect(report.uncheckedGateIds).toEqual(directingLogicRuleIds);
  });

  it("fails closed when an inspected lens gate fails", () => {
    const evaluation = runtimeThreeLensEvaluationSchema.parse(candidate({ dlStatus: "fail" }));
    const report = deriveRuntimeThreeLensGateReport(evaluation, "/artifacts/run/runtime-three-lens-evaluation.json");
    expect(report.status).toBe("not_ready");
    expect(report.ready).toBe(false);
    expect(report.failedGateIds).toEqual(directingLogicRuleIds);
  });

  it("rejects missing gates, evidence-free passes, revision drift, and split evaluator processes", () => {
    const missing = candidate();
    missing.lenses.contentRestoration.rules.pop();
    expect(runtimeThreeLensEvaluationSchema.safeParse(missing).success).toBe(false);

    const noEvidence = candidate();
    noEvidence.lenses.visualEditing.rules[0]!.evidenceRefs = [];
    expect(runtimeThreeLensEvaluationSchema.safeParse(noEvidence).success).toBe(false);

    const drifted = candidate();
    drifted.lenses.directingLogic.evaluator.candidateRevisionFingerprint = "b".repeat(64);
    expect(runtimeThreeLensEvaluationSchema.safeParse(drifted).success).toBe(false);

    const splitRun = candidate();
    splitRun.lenses.visualEditing.evaluator.evaluatorRunId = "00000000-0000-4000-8000-000000000002";
    expect(runtimeThreeLensEvaluationSchema.safeParse(splitRun).success).toBe(false);
  });

  it("rejects a report that claims ready without the complete partition", () => {
    const evaluation = runtimeThreeLensEvaluationSchema.parse(candidate({ dlStatus: "not_checked" }));
    const report = deriveRuntimeThreeLensGateReport(evaluation, "/artifacts/run/runtime-three-lens-evaluation.json");
    expect(runtimeThreeLensGateReportSchema.safeParse({ ...report, ready: true, status: "ready" }).success).toBe(false);
  });

  it("does not infer runtime readiness when artifacts are absent, stale, or inconsistent", () => {
    expect(inspectRuntimeThreeLensArtifacts(null, null, fingerprint)).toMatchObject({
      state: "not_ready",
      reason: "runtime_three_lens_artifact_missing"
    });
    const evaluation = runtimeThreeLensEvaluationSchema.parse(candidate());
    const report = deriveRuntimeThreeLensGateReport(evaluation, "/artifacts/run/runtime-three-lens-evaluation.json");
    expect(inspectRuntimeThreeLensArtifacts(evaluation, report, "b".repeat(64))).toMatchObject({
      state: "not_ready",
      reason: "runtime_three_lens_revision_mismatch"
    });
    expect(inspectRuntimeThreeLensArtifacts(evaluation, { ...report, postExternalId: "different" }, fingerprint)).toMatchObject({
      state: "not_ready",
      reason: "runtime_three_lens_revision_mismatch"
    });
  });

  it("preserves runtime evaluation and gate refs through the batch contract", () => {
    const batch = videoReconstructionBatchSchema.parse({
      schemaVersion: "1.0.0",
      creatorRunId: "00000000-0000-4000-8000-000000000010",
      revision: 1,
      generatedAt: "2026-08-21T06:00:00.000Z",
      requestedPosts: 1,
      readyPosts: 1,
      pendingPosts: 0,
      failedPosts: 0,
      items: [{
        postExternalId: "post-1",
        tier: "high",
        tierRank: 1,
        state: "ready",
        sourceMediaArtifactRef: "/artifacts/run/source.mp4",
        reconstructionArtifactRef: "/artifacts/run/reconstruction.json",
        articleArtifactRef: "/artifacts/run/article.md",
        evaluationArtifactRef: "/artifacts/run/evaluation.json",
        gateReportArtifactRef: "/artifacts/run/gate-report.json",
        threeLensEvaluationArtifactRef: "/artifacts/run/runtime-three-lens-evaluation.json",
        threeLensGateReportArtifactRef: "/artifacts/run/runtime-three-lens-gate-report.json",
        failedGateIds: [],
        message: "ready",
        updatedAt: "2026-08-21T06:00:00.000Z"
      }],
      limitations: []
    });
    expect(batch.items[0]?.threeLensEvaluationArtifactRef).toContain("runtime-three-lens-evaluation.json");
    expect(batch.items[0]?.threeLensGateReportArtifactRef).toContain("runtime-three-lens-gate-report.json");
  });
});
