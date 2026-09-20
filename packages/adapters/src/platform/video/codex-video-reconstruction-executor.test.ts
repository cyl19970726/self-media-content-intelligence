import fs from "node:fs";
import crypto from "node:crypto";
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
  safeOutputRelativeRoot,
  preservePreparedCandidateInputs,
  runCodex,
  shouldRefreshOcrEvidence
} from "./codex-video-reconstruction-executor.js";
import { recoverOcrWithBuilderContinuation } from "./video-ocr-builder-continuation.js";
import { validateBuilderIntegrity } from "./video-builder-integrity.js";
import { videoReconstructionOutcomeSchema, type VideoReconstructionLifecycleEvent } from "../../../../research/index.js";
import { sdkModel } from "./video-codex-execution.js";

const protocol = { captureActions: [{ mode: "ocr_review" }] };
const targeted = { frames: [{ id: "FRAME-1" }, { id: "FRAME-2" }] };

describe("video reconstruction OCR recovery", () => {
  it("allows one host retry for a complete nilError pass", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "failed", error: "nilError" },
        { frameId: "FRAME-2", status: "failed", error: "nilError" }]
    })).toBe(true);
  });

  it("uses an existing failed OCR attempt as eligibility evidence for exact_times", () => {
    expect(shouldRefreshOcrEvidence({ captureActions: [{ mode: "exact_times" }] }, targeted, {
      frames: [{ frameId: "FRAME-1", status: "failed", error: "nilError" },
        { frameId: "FRAME-2", status: "failed", error: "nilError" }]
    })).toBe(true);
  });

  it("does not infer a new OCR request from exact_times alone", () => {
    expect(shouldRefreshOcrEvidence({ captureActions: [{ mode: "exact_times" }] }, targeted, null)).toBe(false);
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

  it("keeps processed empty OCR as a completed attempt", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "processed", lines: [] },
        { frameId: "FRAME-2", status: "processed", lines: [] }]
    })).toBe(false);
  });

  it("does not invent an OCR requirement for a visual-only protocol", () => {
    expect(shouldRefreshOcrEvidence({ captureActions: [{ mode: "exact_times" }] }, targeted, null)).toBe(false);
  });
});

describe("host OCR Builder continuation", () => {
  function recoveryDirectory(): { root: string; video: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-ocr-continuation-"));
    fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
    fs.mkdirSync(path.join(root, "targeted-evidence/frames"), { recursive: true });
    fs.writeFileSync(path.join(root, "post-source-input.json"), "{}");
    fs.writeFileSync(path.join(root, "media-preparation.json"), "{}");
    fs.writeFileSync(path.join(root, "evidence/evidence-pack.json"), "{}");
    fs.writeFileSync(path.join(root, "capture-protocol.json"), "{}");
    fs.writeFileSync(path.join(root, "targeted-evidence/targeted-evidence.json"), "{}");
    fs.writeFileSync(path.join(root, "targeted-evidence/ocr-evidence.json"), "{}");
    fs.writeFileSync(path.join(root, "reconstruction.json"), "{}");
    const video = path.join(root, "source.mp4");
    fs.writeFileSync(video, "video");
    return { root, video };
  }

  it("runs exactly one bounded Builder continuation after recovered text", async () => {
    const item = recoveryDirectory();
    const calls: string[] = [];
    const result = await recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video,
      skillDir: "/unused", recover: async () => {
        calls.push("host-ocr");
        return { attempted: true, recoveredText: true, reason: "recovered_text", receipt: null };
      }, continueBuilder: async (prompt, label) => {
        calls.push(label);
        expect(prompt).toContain("Repair only report conclusions");
        fs.writeFileSync(path.join(item.root, "reconstruction.json"), "{\"repaired\":true}");
      } });
    expect(result.recoveredText).toBe(true);
    expect(calls).toEqual(["host-ocr", "repair-ocr-evidence"]);
    const receipt = JSON.parse(fs.readFileSync(path.join(item.root, "ocr-builder-continuation.json"), "utf8"));
    expect(receipt).toMatchObject({ status: "completed", inputCandidateSha256: expect.any(String),
      inputCandidatePath: expect.any(String), afterCandidateSha256: expect.any(String),
      afterCandidatePath: "reconstruction.json", error: null });
    expect(fs.readFileSync(path.join(item.root, receipt.inputCandidatePath), "utf8")).toBe("{}");
    expect(fs.readFileSync(path.join(item.root, "reconstruction.json"), "utf8")).toBe("{\"repaired\":true}");

    const repeated = await recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video,
      skillDir: "/unused", recover: async () => { throw new Error("host must not repeat"); },
      continueBuilder: async () => { throw new Error("Builder must not repeat"); } });
    expect(repeated).toMatchObject({ attempted: false, recoveredText: true, reason: "continuation_already_completed" });
    expect(calls).toEqual(["host-ocr", "repair-ocr-evidence"]);
  });

  it("does not call Builder when host OCR adds no text", async () => {
    const item = recoveryDirectory();
    let builderCalls = 0;
    await recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video, skillDir: "/unused",
      recover: async () => ({ attempted: true, recoveredText: false, reason: "no_new_text", receipt: null }),
      continueBuilder: async () => { builderCalls += 1; } });
    expect(builderCalls).toBe(0);
  });

  it("rejects mutation of frozen OCR inputs by the continuation", async () => {
    const item = recoveryDirectory();
    await expect(recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video, skillDir: "/unused",
      recover: async () => ({ attempted: true, recoveredText: true, reason: "recovered_text", receipt: null }),
      continueBuilder: async () => { fs.writeFileSync(path.join(item.root, "targeted-evidence/ocr-evidence.json"), "mutated"); } }))
      .rejects.toThrow("OCR_RECOVERY_IMMUTABLE_INPUT_MUTATED");
  });

  it("records a failed continuation and refuses to silently reuse or repeat it", async () => {
    const item = recoveryDirectory();
    let builderCalls = 0;
    const invoke = () => recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video,
      skillDir: "/unused", recover: async () => ({ attempted: true, recoveredText: true,
        reason: "recovered_text", receipt: null }), continueBuilder: async () => {
        builderCalls += 1;
        throw new Error("Builder stopped");
      } });
    await expect(invoke()).rejects.toThrow("Builder stopped");
    expect(JSON.parse(fs.readFileSync(path.join(item.root, "ocr-builder-continuation.json"), "utf8")))
      .toMatchObject({ status: "failed", error: "Builder stopped", inputCandidateSha256: expect.any(String) });
    await expect(invoke()).rejects.toThrow("OCR_RECOVERY_CONTINUATION_FAILED_REQUIRES_NEW_OCR_REVISION");
    expect(builderCalls).toBe(1);
  });

  it("rejects an attempted mutation of the preserved input candidate bytes", async () => {
    const item = recoveryDirectory();
    await expect(recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video,
      skillDir: "/unused", recover: async () => ({ attempted: true, recoveredText: true,
        reason: "recovered_text", receipt: null }), continueBuilder: async () => {
        const receipt = JSON.parse(fs.readFileSync(path.join(item.root, "ocr-builder-continuation.json"), "utf8"));
        fs.writeFileSync(path.join(item.root, receipt.inputCandidatePath), "tampered");
      } })).rejects.toThrow("OCR_RECOVERY_INPUT_CANDIDATE_BACKUP_MUTATED");
    const receipt = JSON.parse(fs.readFileSync(path.join(item.root, "ocr-builder-continuation.json"), "utf8"));
    expect(receipt.status).toBe("failed");
    expect(fs.readFileSync(path.join(item.root, receipt.inputCandidatePath), "utf8")).toBe("{}");
  });

  it("restores the input backup and preserves both incidents when Builder mutates then throws", async () => {
    const item = recoveryDirectory();
    await expect(recoverOcrWithBuilderContinuation({ outputDir: item.root, videoPath: item.video,
      skillDir: "/unused", recover: async () => ({ attempted: true, recoveredText: true,
        reason: "recovered_text", receipt: null }), continueBuilder: async () => {
        const receipt = JSON.parse(fs.readFileSync(path.join(item.root, "ocr-builder-continuation.json"), "utf8"));
        fs.writeFileSync(path.join(item.root, receipt.inputCandidatePath), "tampered-before-throw");
        throw new Error("Builder original failure");
      } })).rejects.toThrow(/Builder original failure; OCR_RECOVERY_INPUT_CANDIDATE_BACKUP_MUTATED/);
    const receipt = JSON.parse(fs.readFileSync(path.join(item.root, "ocr-builder-continuation.json"), "utf8"));
    expect(receipt).toMatchObject({ status: "failed",
      error: "Builder original failure; OCR_RECOVERY_INPUT_CANDIDATE_BACKUP_MUTATED" });
    expect(fs.readFileSync(path.join(item.root, receipt.inputCandidatePath), "utf8")).toBe("{}");
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

describe("workflow output isolation", () => {
  it("rejects absolute and traversal output roots", () => {
    expect(() => safeOutputRelativeRoot("../other-run")).toThrow("WORKFLOW_OUTPUT_ROOT_INVALID");
    expect(() => safeOutputRelativeRoot("/tmp/other-run")).toThrow("WORKFLOW_OUTPUT_ROOT_INVALID");
    expect(safeOutputRelativeRoot("workflow-reconstructions/run-1/post-1")).toBe("workflow-reconstructions/run-1/post-1");
  });
});

describe("preserved candidate import", () => {
  it("relocates only the copied evidence path and retains a valid frozen candidate", () => {
    const fixtureRoot = path.join(process.cwd(), ".agents", "skills", "video-content-reconstruction", "tests", "fixtures", "valid");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-preserved-candidate-"));
    const sourcePath = path.join(root, "source-video.mp4");
    const original = path.join(root, "original");
    const copied = path.join(root, "copied");
    try {
      fs.writeFileSync(sourcePath, "source-video");
      fs.mkdirSync(path.join(original, "evidence"), { recursive: true });
      fs.mkdirSync(path.join(original, "targeted-evidence"), { recursive: true });
      for (const file of ["evidence-pack.json", "probe.json", "capture-protocol.json", "reconstruction.json"]) {
        const destination = file === "evidence-pack.json" ? path.join(original, "evidence", file) : path.join(original, file);
        fs.copyFileSync(path.join(fixtureRoot, file), destination);
      }
      fs.copyFileSync(path.join(fixtureRoot, "targeted-evidence.json"), path.join(original, "targeted-evidence", "targeted-evidence.json"));
      fs.writeFileSync(path.join(original, "post-source-input.json"), JSON.stringify({
        facts: { title: null, coverHref: null }, cover: null
      }));
      const originalEvidence = path.join(original, "evidence", "evidence-pack.json");
      const digest = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      fs.writeFileSync(path.join(original, "media-preparation.json"), JSON.stringify({
        sourceMedia: { fingerprint: digest(sourcePath) }, transcript: { path: null, fingerprint: null },
        evidencePack: { path: originalEvidence, fingerprint: digest(originalEvidence) }
      }));
      fs.cpSync(original, copied, { recursive: true });
      const preservedContent = Object.fromEntries([
        "post-source-input.json", "evidence/evidence-pack.json", "probe.json", "capture-protocol.json",
        "targeted-evidence/targeted-evidence.json", "reconstruction.json"
      ].map((relative) => [relative, digest(path.join(copied, relative))]));

      preservePreparedCandidateInputs(copied, sourcePath);
      expect(JSON.parse(fs.readFileSync(path.join(copied, "media-preparation.json"), "utf8")).evidencePack.path)
        .toBe(path.join(copied, "evidence", "evidence-pack.json"));
      // This legacy fixture predates the depth contract. Validate the same copied
      // evidence/reconstruction candidate with the optional source snapshot absent;
      // production imports retain and validate their already depth-valid snapshot.
      const sourceSnapshot = path.join(copied, "post-source-input.json");
      const sourceSnapshotContents = fs.readFileSync(sourceSnapshot);
      fs.rmSync(sourceSnapshot);
      expect(validateBuilderIntegrity(copied, sourcePath)).toMatchObject({ transcriptCues: 2, knowledgeUnits: 2 });
      fs.writeFileSync(sourceSnapshot, sourceSnapshotContents);
      expect(Object.fromEntries(Object.keys(preservedContent).map((relative) => [relative, digest(path.join(copied, relative))])))
        .toEqual(preservedContent);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
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

  it("routes the OCR continuation repair role to the configured Builder model", () => {
    expect(sdkModel("generic_repair", { builderModel: "gpt-5.6-terra", evaluatorModel: "gpt-5.6-luna" }))
      .toBe("gpt-5.6-terra");
  });

  it("uses Luna for evaluation and preserves explicit role overrides", () => {
    expect(codexInvocationArgs("generic_evaluator", "/tmp/run", "/tmp/last.txt", {})).toContain("gpt-5.6-luna");
    const args = codexInvocationArgs("candidate", "/tmp/run", "/tmp/last.txt", {
      SELF_MEDIA_BUILDER_MODEL: "gpt-5.6-terra",
      SELF_MEDIA_BUILDER_REASONING_EFFORT: "high"
    });
    expect(args).toContain("gpt-5.6-terra");
    expect(args).toContain('model_reasoning_effort="high"');
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
  it("runs OCR repair with Builder snapshots and model without activating the main skill entry", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-ocr-repair-role-"));
    const binary = path.join(outputDir, "fake-codex.mjs");
    const previous = { runtime: process.env.SELF_MEDIA_RUNTIME_DIR, binary: process.env.SELF_MEDIA_CODEX_BIN,
      builder: process.env.SELF_MEDIA_BUILDER_MODEL, evaluator: process.env.SELF_MEDIA_EVALUATOR_MODEL };
    try {
      fs.writeFileSync(binary, "#!/usr/bin/env node\nprocess.exit(0);\n");
      fs.chmodSync(binary, 0o755);
      process.env.SELF_MEDIA_RUNTIME_DIR = outputDir;
      process.env.SELF_MEDIA_CODEX_BIN = binary;
      process.env.SELF_MEDIA_BUILDER_MODEL = "gpt-5.6-terra";
      process.env.SELF_MEDIA_EVALUATOR_MODEL = "gpt-5.6-luna";

      await runCodex("OCR repair sentinel", outputDir, "repair-ocr-evidence", "source-revision-1");

      const trace = JSON.parse(fs.readFileSync(path.join(outputDir, "repair-ocr-evidence-trace.json"), "utf8"));
      const runtime = JSON.parse(fs.readFileSync(path.join(trace.traceDir, "runtime.json"), "utf8"));
      const prompt = fs.readFileSync(path.join(trace.traceDir, "prompt.txt"), "utf8");
      expect(runtime).toMatchObject({ role: "generic_repair", model: "gpt-5.6-terra" });
      expect(runtime.skillLoad.files).toHaveLength(4);
      expect(runtime.skillLoad.files.map((file: { path: string }) => path.basename(file.path)))
        .toEqual(["builder-operator.md", "single-post-depth.md", "capture-protocol.schema.json", "reconstruction.schema.json"]);
      expect(prompt).toContain("OCR repair sentinel");
      expect(prompt).not.toContain("Read each SKILL.md below");
      expect(runtime.skillLoad.files.some((file: { path: string }) => file.path.endsWith("/SKILL.md"))).toBe(false);
    } finally {
      if (previous.runtime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
      else process.env.SELF_MEDIA_RUNTIME_DIR = previous.runtime;
      if (previous.binary === undefined) delete process.env.SELF_MEDIA_CODEX_BIN;
      else process.env.SELF_MEDIA_CODEX_BIN = previous.binary;
      if (previous.builder === undefined) delete process.env.SELF_MEDIA_BUILDER_MODEL;
      else process.env.SELF_MEDIA_BUILDER_MODEL = previous.builder;
      if (previous.evaluator === undefined) delete process.env.SELF_MEDIA_EVALUATOR_MODEL;
      else process.env.SELF_MEDIA_EVALUATOR_MODEL = previous.evaluator;
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("reports started, stale, progress, and completed against one input revision", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-child-lifecycle-"));
    const binary = path.join(outputDir, "fake-codex.mjs");
    const previous = {
      runtime: process.env.SELF_MEDIA_RUNTIME_DIR,
      binary: process.env.SELF_MEDIA_CODEX_BIN,
      stale: process.env.SELF_MEDIA_CHILD_STALE_MS,
      timeout: process.env.SELF_MEDIA_CHILD_TIMEOUT_MS
    };
    try {
      fs.writeFileSync(binary, `#!/usr/bin/env node\nsetTimeout(() => { process.stdout.write("working\\n"); setTimeout(() => process.exit(0), 30); }, 80);\n`);
      fs.chmodSync(binary, 0o755);
      process.env.SELF_MEDIA_RUNTIME_DIR = outputDir;
      process.env.SELF_MEDIA_CODEX_BIN = binary;
      process.env.SELF_MEDIA_CHILD_STALE_MS = "25";
      process.env.SELF_MEDIA_CHILD_TIMEOUT_MS = "5000";
      const events: VideoReconstructionLifecycleEvent[] = [];

      await runCodex("prompt", outputDir, "candidate", "source-revision-1", (event) => events.push(event));

      const trace = JSON.parse(fs.readFileSync(path.join(outputDir, "candidate-trace.json"), "utf8")) as { childRunId: string; traceDir: string };
      expect(path.relative(outputDir, trace.traceDir)).toBe(path.join("worker-traces", trace.childRunId));
      expect(trace.childRunId).toBe(events[0]?.childRunId);
      expect(fs.readFileSync(path.join(trace.traceDir, "events.jsonl"), "utf8")).toContain("working");
      const effectivePrompt = fs.readFileSync(path.join(trace.traceDir, "prompt.txt"), "utf8");
      expect(effectivePrompt).toContain("prompt");
      expect(effectivePrompt).toContain("Verified required method snapshots");
      const runtime = JSON.parse(fs.readFileSync(path.join(trace.traceDir, "runtime.json"), "utf8"));
      expect(runtime.skillLoad.files).toHaveLength(4);
      fs.rmSync(trace.traceDir, { recursive: true, force: true });
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
      if (previous.runtime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
      else process.env.SELF_MEDIA_RUNTIME_DIR = previous.runtime;
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
