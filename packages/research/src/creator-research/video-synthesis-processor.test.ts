import { expect, it } from "vitest";
import { dossierReadyNextAction, projectBuiltUnevaluatedOutcome, synthesisFailureArtifactRefs } from "./video-synthesis-processor.js";

it("retains the last-good synthesis when a source-revision rebuild is not ready", () => {
  expect(synthesisFailureArtifactRefs({
    payload: { previousSynthesisArtifactRef: "/old/synthesis.json", previousSynthesisGateArtifactRef: "/old/gate.json" },
    candidateArtifactRef: "/failed/candidate.json", candidateGateArtifactRef: "/failed/gate.json"
  })).toEqual({ synthesisArtifactRef: "/old/synthesis.json", synthesisGateArtifactRef: "/old/gate.json" });
});

it("keeps legacy behavior when the job has no last-good synthesis", () => {
  expect(synthesisFailureArtifactRefs({ payload: {}, candidateArtifactRef: "/candidate.json",
    candidateGateArtifactRef: "/gate.json" })).toEqual({
    synthesisArtifactRef: "/candidate.json", synthesisGateArtifactRef: "/gate.json"
  });
});

it("retains an attempted evaluator failure instead of projecting it as skipped", () => {
  const projected = projectBuiltUnevaluatedOutcome({
    state: "built_unevaluated", reconstructionArtifactRef: "/reconstruction.json", articleArtifactRef: null,
    builderValidationArtifactRef: "/builder-validation.json", evaluationMode: "failed",
    qualityWarningGateIds: ["independent_review_missing"], message: "evaluator runner unavailable"
  }, "2026-09-15T00:00:00.000Z");
  expect(projected).toMatchObject({
    evaluationPolicy: "single_pass@37a03aae", failedGateIds: ["independent_review_missing"],
    message: expect.stringContaining("evaluator runner unavailable")
  });
  expect(projected.message).not.toContain("已跳过");
});

it("keeps a genuinely skipped evaluator as the builder fast path", () => {
  const projected = projectBuiltUnevaluatedOutcome({
    state: "built_unevaluated", reconstructionArtifactRef: "/reconstruction.json", articleArtifactRef: null,
    builderValidationArtifactRef: "/builder-validation.json", evaluationMode: "skipped"
  }, "2026-09-15T00:00:00.000Z");
  expect(projected).toMatchObject({ evaluationPolicy: "skip@builder-fast-path-v1", failedGateIds: [] });
  expect(projected.message).toContain("已跳过");
});

it("only asks to complete Evaluator work when a Builder result is truly unevaluated", () => {
  expect(dossierReadyNextAction(["verified", "evaluated_with_findings"])).toContain("处理质量问题并复评");
  expect(dossierReadyNextAction(["verified", "evaluated_with_findings"])).not.toContain("补齐 Evaluator");
  expect(dossierReadyNextAction(["verified", "built_unevaluated"])).toContain("补齐 Evaluator");
});
