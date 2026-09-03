import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCandidateArtifactsUnchanged,
  builderIntegrityContractRevision,
  builderIntegrityRepairPrompt,
  candidatePrompt,
  candidateArtifactFingerprints,
  codexInvocationArgs,
  evaluatorContractRevision,
  evaluatorPrompt,
  hardEvaluationGateFailures,
  normalizeRuntimeLensEvidence,
  reconstructionFailureGateId,
  runtimeThreeLensBoundToEvaluator,
  runCodex,
  shouldRefreshOcrEvidence
} from "./codex-video-reconstruction-executor.js";
import { videoReconstructionOutcomeSchema, type VideoReconstructionLifecycleEvent } from "../../../../research/index.js";

const protocol = { captureActions: [{ mode: "ocr_review" }] };
const targeted = { frames: [{ id: "FRAME-1" }, { id: "FRAME-2" }] };

describe("video reconstruction OCR recovery", () => {
  it("keeps a complete failed OCR pass as checked evidence", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "failed" }, { frameId: "FRAME-2", status: "failed" }]
    })).toBe(false);
  });

  it("refreshes OCR when a repair adds targeted frames", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "processed" }]
    })).toBe(true);
  });

  it("keeps a complete successful OCR artifact", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "processed" }, { frameId: "FRAME-2", status: "processed" }]
    })).toBe(false);
  });

  it("does not invent an OCR requirement for a visual-only protocol", () => {
    expect(shouldRefreshOcrEvidence({ captureActions: [{ mode: "exact_times" }] }, targeted, null)).toBe(false);
  });
});

describe("video reconstruction failure diagnostics", () => {
  it("preserves the exact Builder integrity failure instead of collapsing it into runner_execution", () => {
    expect(reconstructionFailureGateId("BUILDER_INTEGRITY_UNCHECKED_AVAILABLE_CHANNEL"))
      .toBe("builder_integrity_unchecked_available_channel");
    expect(reconstructionFailureGateId("BUILDER_INTEGRITY_CARRIER_STATUS:CAR-AUDIO"))
      .toBe("builder_integrity_carrier_status");
  });

  it("keeps unknown process failures generic", () => {
    expect(reconstructionFailureGateId("unexpected child failure")).toBe("runner_execution");
  });
});

describe("runtime lens evidence normalization", () => {
  it("omits empty optional JSON pointers without changing real pointers", () => {
    expect(normalizeRuntimeLensEvidence([{ ruleId: "CR-01", evidenceRefs: [
      { refId: "artifact", jsonPointer: "" }, { refId: "unit", jsonPointer: "/knowledgeUnits/0" }
    ] }])).toEqual([{ ruleId: "CR-01", evidenceRefs: [
      { refId: "artifact" }, { refId: "unit", jsonPointer: "/knowledgeUnits/0" }
    ] }]);
  });

  it("invalidates an aggregate that belongs to an older evaluator run", () => {
    const lenses = Object.fromEntries(["contentRestoration", "directingLogic", "visualEditing"]
      .map((key) => [key, { evaluator: { evaluatorRunId: "old-run" } }]));
    expect(runtimeThreeLensBoundToEvaluator({ lenses }, "old-run")).toBe(true);
    expect(runtimeThreeLensBoundToEvaluator({ lenses }, "new-run")).toBe(false);
  });
});

describe("single-pass evaluation policy", () => {
  it("keeps a validated Builder result explicitly unevaluated", () => {
    const root = "/artifacts/00000000-0000-4000-8000-000000000000/video-reconstructions/post";
    const outcome = videoReconstructionOutcomeSchema.parse({
      state: "built_unevaluated",
      reconstructionArtifactRef: `${root}/reconstruction.json`,
      articleArtifactRef: null,
      builderValidationArtifactRef: `${root}/builder-validation.json`,
      evaluationMode: "skipped"
    });
    expect(outcome.state).toBe("built_unevaluated");
    expect("evaluationArtifactRef" in outcome).toBe(false);
  });

  it("keeps a validated Builder result usable when the optional evaluator fails", () => {
    const root = "/artifacts/00000000-0000-4000-8000-000000000000/video-reconstructions/post";
    const outcome = videoReconstructionOutcomeSchema.parse({
      state: "built_unevaluated",
      reconstructionArtifactRef: `${root}/reconstruction.json`,
      articleArtifactRef: null,
      builderValidationArtifactRef: `${root}/builder-validation.json`,
      evaluationMode: "failed",
      qualityWarningGateIds: ["runner_execution"],
      message: "Builder 结果已保留。"
    });
    expect(outcome.state).toBe("built_unevaluated");
    if (outcome.state !== "built_unevaluated") throw new Error("expected built outcome");
    expect(outcome.evaluationMode).toBe("failed");
  });

  it("keeps evaluator gaps as warnings while marking the video analyzed", () => {
    const root = "/artifacts/00000000-0000-4000-8000-000000000000/video-reconstructions/post";
    const outcome = videoReconstructionOutcomeSchema.parse({
      state: "ready",
      reconstructionArtifactRef: `${root}/reconstruction.json`,
      articleArtifactRef: `${root}/article.md`,
      evaluationArtifactRef: `${root}/evaluation.json`,
      gateReportArtifactRef: `${root}/gate-report.json`,
      threeLensEvaluationArtifactRef: `${root}/runtime-three-lens-evaluation.json`,
      threeLensGateReportArtifactRef: `${root}/runtime-three-lens-gate-report.json`,
      threeLensGateCount: 19,
      gateCount: 22,
      failedGateIds: [],
      qualityWarningGateIds: ["eval_unchecked_channels"],
      evaluationMode: "single_pass"
    });
    expect(outcome.state).toBe("ready");
    if (outcome.state !== "ready") throw new Error("expected ready single-pass outcome");
    expect(outcome.qualityWarningGateIds).toEqual(["eval_unchecked_channels"]);
  });

  it("keeps an evaluated candidate usable without promoting it to verified", () => {
    const root = "/artifacts/00000000-0000-4000-8000-000000000000/video-reconstructions/post";
    const outcome = videoReconstructionOutcomeSchema.parse({
      state: "evaluated_with_findings",
      reconstructionArtifactRef: `${root}/reconstruction.json`,
      articleArtifactRef: null,
      builderValidationArtifactRef: `${root}/builder-validation.json`,
      evaluationArtifactRef: `${root}/evaluation.json`,
      gateReportArtifactRef: `${root}/gate-report.json`,
      threeLensEvaluationArtifactRef: `${root}/runtime-three-lens-evaluation.json`,
      threeLensGateReportArtifactRef: `${root}/runtime-three-lens-gate-report.json`,
      threeLensGateCount: 19,
      gateCount: 23,
      failedGateIds: [],
      qualityWarningGateIds: ["CR-01"],
      evaluationMode: "single_pass"
    });
    expect(outcome.state).toBe("evaluated_with_findings");
  });
});

describe("Builder model contract", () => {
  it("freezes existing artifacts and tells a resumed Builder to create only missing outputs", () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-builder-resume-"));
    try {
      fs.mkdirSync(path.join(outputDir, "evidence"), { recursive: true });
      fs.writeFileSync(path.join(outputDir, "source-video.srt"), "1\n00:00:00,000 --> 00:00:01,000\n字幕\n");
      fs.writeFileSync(path.join(outputDir, "evidence/evidence-pack.json"), "{}");
      const prompt = candidatePrompt("/tmp/source.mp4", outputDir, ["reconstruction.json"]);
      expect(prompt).toContain('Missing artifacts that this resume run is allowed to create: ["reconstruction.json"]');
      expect(prompt).toContain("evidence/evidence-pack.json");
      expect(prompt).toContain(path.join(outputDir, "media-preparation.json"));
      expect(prompt).toContain("Never run whisper, whisper-cli, ffprobe, direct ffmpeg extraction");
      expect(prompt).toContain("builder-operator.md");
      expect(prompt).toContain("do NOT read SKILL.md");
      expect(prompt).toContain("execute OCR at most once");
      expect(prompt).toContain("ocr references use the recognized line's OCR-* ID");
      expect(prompt).toContain("Never use afplay");
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("passes Terra medium explicitly and keeps ordinary sessions ephemeral", () => {
    const args = codexInvocationArgs("candidate", "/tmp/run", "/tmp/run/last.txt", {});
    expect(args).toContain("gpt-5.6-terra");
    expect(args).toContain('model_reasoning_effort="medium"');
    expect(args).toContain("--ephemeral");
  });

  it("can retain a bounded diagnostic session without changing the model", () => {
    const args = codexInvocationArgs("candidate", "/tmp/run", "/tmp/run/last.txt", {
      SELF_MEDIA_CODEX_EPHEMERAL: "false"
    });
    expect(args).not.toContain("--ephemeral");
    expect(args).toContain("gpt-5.6-terra");
  });
});

describe("Evaluator role contract", () => {
  it("fingerprints the evaluator prompt, skill, schema, and lens contract for cache invalidation", () => {
    expect(evaluatorContractRevision()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never promotes a deterministic or three-lens hard failure to VERIFIED", () => {
    expect(hardEvaluationGateFailures(
      { ready: false, failedGateIds: ["core_evidence_references"] },
      { ready: true, failedGateIds: [], uncheckedGateIds: [] }
    )).toEqual(["core_evidence_references"]);
    expect(hardEvaluationGateFailures(
      { ready: true, failedGateIds: [] },
      { ready: false, failedGateIds: ["VE-03"], uncheckedGateIds: ["DL-04"] }
    )).toEqual(["VE-03", "DL-04"]);
    expect(hardEvaluationGateFailures(
      { ready: true, failedGateIds: [] },
      { ready: true, failedGateIds: [], uncheckedGateIds: [] }
    )).toEqual([]);
  });

  it("binds one fresh evaluator process to an immutable candidate revision", () => {
    const prompt = evaluatorPrompt("/tmp/source.mp4", "/tmp/candidate", "a".repeat(64), {
      "reconstruction.json": "b".repeat(64)
    });
    expect(prompt).toContain("evaluator-operator.md");
    expect(prompt).toContain("This single Evaluator process owns all three lenses");
    expect(prompt).toContain("Frozen candidate revision");
    expect(prompt).toContain("reconstruction.json");
    expect(prompt).toContain("Do not modify candidate files");
    expect(prompt).toContain("Inspect overviews/contact sheets at high detail, never original detail");
    expect(prompt).toContain("Host-built source overview");
    expect(prompt).toContain("Do not create or read a global /tmp overview");
    expect(prompt).toContain("inspect two named source frames");
    expect(prompt).toContain("do not read SKILL.md");
    expect(prompt).toContain("Aim to finish in 5–8 evidence calls");
    expect(prompt).toContain("Do not require fake listening");
    expect(prompt).toContain("critical-question plus scene/carrier coverage");
    expect(prompt).toContain("do not search the repository for alternate rule definitions");
  });

  it("fails when an evaluator mutates a frozen Builder artifact", () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-evaluator-freeze-"));
    try {
      fs.writeFileSync(path.join(outputDir, "reconstruction.json"), "revision-1");
      const before = candidateArtifactFingerprints(outputDir);
      fs.writeFileSync(path.join(outputDir, "reconstruction.json"), "revision-2");
      expect(() => assertCandidateArtifactsUnchanged(before, outputDir)).toThrow("EVALUATOR_MUTATED_CANDIDATE");
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("binds the deterministic Builder report when the evaluator can read it", () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-evaluator-builder-report-"));
    try {
      fs.writeFileSync(path.join(outputDir, "reconstruction.json"), "semantic-revision");
      fs.writeFileSync(path.join(outputDir, "article.md"), "builder-report-v1");
      const before = candidateArtifactFingerprints(outputDir);
      expect(before["article.md"]).toMatch(/^[a-f0-9]{64}$/);
      fs.writeFileSync(path.join(outputDir, "article.md"), "builder-report-v2");
      expect(() => assertCandidateArtifactsUnchanged(before, outputDir)).toThrow("EVALUATOR_MUTATED_CANDIDATE");
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("does not treat a regenerated Builder validation receipt as a semantic candidate mutation", () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-evaluator-receipt-"));
    try {
      fs.writeFileSync(path.join(outputDir, "reconstruction.json"), "semantic-revision");
      fs.writeFileSync(path.join(outputDir, "builder-validation.json"), "receipt-1");
      const before = candidateArtifactFingerprints(outputDir);
      fs.writeFileSync(path.join(outputDir, "builder-validation.json"), "receipt-2");
      expect(candidateArtifactFingerprints(outputDir)).toEqual(before);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe("Builder integrity contract", () => {
  it("fingerprints the repair contract used to authorize bounded reruns", () => {
    expect(builderIntegrityContractRevision()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps checked-but-unproven relationships as unknowns instead of meta-gate omissions", () => {
    const prompt = builderIntegrityRepairPrompt("/tmp/video.mp4", "/tmp/run", "BUILDER_INTEGRITY_META_GATE");
    expect(prompt).toContain("inspected but cannot be established");
    expect(prompt).toMatch(/explicit\s+unknown or boundary/);
  });
});

describe("child worker lifecycle", () => {
  it("reports started, stale, progress, and completed against one input revision", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-child-lifecycle-"));
    const binary = path.join(outputDir, "fake-codex.mjs");
    const previous = {
      binary: process.env.SELF_MEDIA_CODEX_BIN,
      stale: process.env.SELF_MEDIA_CHILD_STALE_MS,
      timeout: process.env.SELF_MEDIA_CHILD_TIMEOUT_MS
    };
    try {
      fs.writeFileSync(binary, `#!/usr/bin/env node\nsetTimeout(() => { process.stdout.write("working\\n"); setTimeout(() => process.exit(0), 30); }, 80);\n`);
      fs.chmodSync(binary, 0o755);
      process.env.SELF_MEDIA_CODEX_BIN = binary;
      process.env.SELF_MEDIA_CHILD_STALE_MS = "25";
      process.env.SELF_MEDIA_CHILD_TIMEOUT_MS = "5000";
      const events: VideoReconstructionLifecycleEvent[] = [];

      await runCodex("prompt", outputDir, "candidate", "source-revision-1", (event) => events.push(event));

      const statuses = events.map((event) => event.status);
      expect(statuses[0]).toBe("started");
      expect(statuses).toContain("stale");
      expect(statuses).toContain("progress");
      expect(statuses.at(-1)).toBe("completed");
      expect(statuses.indexOf("stale")).toBeLessThan(statuses.indexOf("progress"));
      expect(new Set(events.map((event) => event.childRunId)).size).toBe(1);
      expect(new Set(events.map((event) => event.inputRevision))).toEqual(new Set(["source-revision-1"]));
      expect(events.every((event) => event.role === "candidate")).toBe(true);
    } finally {
      if (previous.binary === undefined) delete process.env.SELF_MEDIA_CODEX_BIN;
      else process.env.SELF_MEDIA_CODEX_BIN = previous.binary;
      if (previous.stale === undefined) delete process.env.SELF_MEDIA_CHILD_STALE_MS;
      else process.env.SELF_MEDIA_CHILD_STALE_MS = previous.stale;
      if (previous.timeout === undefined) delete process.env.SELF_MEDIA_CHILD_TIMEOUT_MS;
      else process.env.SELF_MEDIA_CHILD_TIMEOUT_MS = previous.timeout;
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
