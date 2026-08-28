import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFile, runFileInput } from "../../core/process.js";
import {
  videoReconstructionOutcomeSchema,
  videoReconstructionRequestSchema,
  videoReconstructionLifecycleEventSchema,
  type VideoReconstructionChildRole,
  type VideoReconstructionExecutor,
  type VideoReconstructionLifecycleObserver,
  type VideoReconstructionOutcome
} from "../../../../research/index.js";
import {
  contentRestorationRuleResultsSchema,
  deriveRuntimeThreeLensGateReport,
  directingLogicRuleResultsSchema,
  inspectRuntimeThreeLensArtifacts,
  runtimeThreeLensEvaluationSchema,
  visualEditingRuleResultsSchema,
  type RuntimeThreeLensEvaluation,
  type RuntimeThreeLensGateReport
} from "../../../../research/index.js";
import { withSystemProxy } from "../network/system-proxy.js";

const skillDir = process.env.SELF_MEDIA_VIDEO_RECONSTRUCTION_SKILL_DIR ??
  path.join(os.homedir(), ".codex", "skills", "video-content-reconstruction");
const mediaSkillDir = process.env.SELF_MEDIA_MEDIA_SKILL_DIR ??
  path.join(os.homedir(), ".agents", "skills", "media-use");

type GateReport = { ready?: boolean; gates?: Array<{ id?: string; pass?: boolean }>; failedGateIds?: string[] };

function exists(file: string): boolean { return fs.existsSync(file) && fs.statSync(file).isFile(); }

type OcrEvidenceLike = { frames?: Array<{ frameId?: string; status?: string }> };
type TargetedEvidenceLike = { frames?: Array<{ id?: string }> };

export function shouldRefreshOcrEvidence(
  protocolInput: unknown,
  targetedInput: unknown,
  ocrInput: unknown
): boolean {
  const protocolRequestsOcr = /"(?:ocr_review|ui_state_review)"/.test(JSON.stringify(protocolInput));
  const targetedFrames = (targetedInput as TargetedEvidenceLike | null)?.frames ?? [];
  const ocrFrames = (ocrInput as OcrEvidenceLike | null)?.frames ?? [];
  if (!protocolRequestsOcr && ocrFrames.length === 0) return false;
  if (ocrFrames.length === 0) return targetedFrames.length > 0;
  const coveredFrameIds = new Set(ocrFrames.map((frame) => frame.frameId).filter((id): id is string => Boolean(id)));
  const missingTargetedFrame = targetedFrames.some((frame) => Boolean(frame.id) && !coveredFrameIds.has(frame.id as string));
  const everyFrameFailed = ocrFrames.every((frame) => frame.status === "failed");
  return missingTargetedFrame || everyFrameFailed;
}

export function normalizeRuntimeLensEvidence(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map((rule) => {
    if (!rule || typeof rule !== "object") return rule;
    const value = rule as Record<string, unknown>;
    if (!Array.isArray(value.evidenceRefs)) return rule;
    return {
      ...value,
      evidenceRefs: value.evidenceRefs.map((reference) => {
        if (!reference || typeof reference !== "object") return reference;
        const normalized = { ...(reference as Record<string, unknown>) };
        if (normalized.jsonPointer === "") delete normalized.jsonPointer;
        return normalized;
      })
    };
  });
}

function readJsonIfPresent(file: string): unknown {
  if (!exists(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return null; }
}

async function refreshOcrEvidenceIfNeeded(outputDir: string): Promise<void> {
  const protocolPath = path.join(outputDir, "capture-protocol.json");
  const targetedPath = path.join(outputDir, "targeted-evidence/targeted-evidence.json");
  const ocrPath = path.join(outputDir, "targeted-evidence/ocr-evidence.json");
  if (!exists(protocolPath) || !exists(targetedPath)) return;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!shouldRefreshOcrEvidence(
      readJsonIfPresent(protocolPath),
      readJsonIfPresent(targetedPath),
      readJsonIfPresent(ocrPath)
    )) return;
    try {
      await runFile("swift", [path.join(skillDir, "scripts/ocr-frames.swift"),
        "--manifest", targetedPath, "--out", ocrPath], { cwd: outputDir, timeout: 10 * 60_000 });
    } catch {
      // The independent evaluator keeps the channel failed if both bounded attempts fail.
    }
  }
}

function commandUnavailable(message: string): boolean {
  return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|command not found|authentication|login required|unauthorized/i.test(message);
}

function childRole(label: string): VideoReconstructionChildRole {
  if (label === "candidate") return "candidate";
  if (label.startsWith("evaluator-")) return "generic_evaluator";
  if (label.startsWith("repair-")) return "generic_repair";
  if (label.startsWith("runtime-repair-")) return "runtime_repair";
  if (label.startsWith("runtime-recheck-")) return "generic_recheck";
  if (label === "runtime-content_restoration") return "content_restoration_evaluator";
  if (label === "runtime-directing_logic") return "directing_logic_evaluator";
  if (label === "runtime-visual_editing") return "visual_editing_evaluator";
  throw new Error(`UNKNOWN_CHILD_ROLE:${label}`);
}

function childPolicy(role: VideoReconstructionChildRole): { staleAfterMs: number; timeoutMs: number } {
  const defaults = role === "candidate"
    ? { staleAfterMs: 15 * 60_000, timeoutMs: 90 * 60_000 }
    : ["generic_repair", "runtime_repair"].includes(role)
      ? { staleAfterMs: 10 * 60_000, timeoutMs: 45 * 60_000 }
      : { staleAfterMs: 8 * 60_000, timeoutMs: 30 * 60_000 };
  const staleOverride = Number(process.env.SELF_MEDIA_CHILD_STALE_MS);
  const timeoutOverride = Number(process.env.SELF_MEDIA_CHILD_TIMEOUT_MS);
  return {
    staleAfterMs: Number.isFinite(staleOverride) && staleOverride > 0 ? staleOverride : defaults.staleAfterMs,
    timeoutMs: Number.isFinite(timeoutOverride) && timeoutOverride > 0 ? timeoutOverride : defaults.timeoutMs
  };
}

function outputArtifactRevisions(cwd: string, lastMessage: string): Record<string, string> {
  const relativeFiles = [
    "probe.json", "capture-protocol.json", "targeted-evidence/targeted-evidence.json",
    "targeted-evidence/ocr-evidence.json", "reconstruction.json", "article.md", "run-notes.md",
    "evaluation.json", "gate-report.json", "runtime-three-lens-evaluation.json",
    "runtime-three-lens-gate-report.json", "runtime-three-lens/content-restoration.json",
    "runtime-three-lens/directing-logic.json", "runtime-three-lens/visual-editing.json",
    path.basename(lastMessage)
  ];
  return Object.fromEntries(relativeFiles.flatMap((relative) => {
    const absolute = path.join(cwd, relative);
    return exists(absolute) ? [[relative, sha256(absolute)]] : [];
  }));
}

function observeSafely(
  observer: VideoReconstructionLifecycleObserver | undefined,
  event: Parameters<VideoReconstructionLifecycleObserver>[0]
): void {
  if (!observer) return;
  try { observer(videoReconstructionLifecycleEventSchema.parse(event)); }
  catch {
    // Control-plane reporting must never corrupt the research worker itself.
  }
}

export async function runCodex(
  prompt: string,
  cwd: string,
  label: string,
  inputRevision: string,
  observer?: VideoReconstructionLifecycleObserver
): Promise<void> {
  const binary = process.env.SELF_MEDIA_CODEX_BIN ?? "codex";
  const lastMessage = path.join(cwd, `${label}-last-message.txt`);
  const role = childRole(label);
  const policy = childPolicy(role);
  const childRunId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  let lastProgressAt = startedAt;
  let lastProgressEmittedAt = 0;
  let staleEmitted = false;
  const baseEvent = { childRunId, role, startedAt, inputRevision };
  observeSafely(observer, {
    ...baseEvent, status: "started", lastProgressAt, outputArtifactRevisions: {}, errorCode: null
  });
  const staleTimer = setInterval(() => {
    if (staleEmitted || Date.now() - Date.parse(lastProgressAt) < policy.staleAfterMs) return;
    staleEmitted = true;
    observeSafely(observer, {
      ...baseEvent, status: "stale", lastProgressAt,
      outputArtifactRevisions: outputArtifactRevisions(cwd, lastMessage), errorCode: null
    });
  }, Math.min(60_000, policy.staleAfterMs));
  const environment = await withSystemProxy({ ...process.env, SELF_MEDIA_CHILD_ROLE: label, SELF_MEDIA_CHILD_OUTPUT: cwd });
  try {
    await runFileInput(binary, [
      "exec", "-", "--skip-git-repo-check", "--ephemeral", "--color", "never",
      "--approve-for-me", "-C", cwd, "-o", lastMessage
    ], prompt, {
      cwd,
      timeout: policy.timeoutMs,
      env: environment,
      onOutput: () => {
        const at = Date.now();
        lastProgressAt = new Date(at).toISOString();
        staleEmitted = false;
        if (at - lastProgressEmittedAt < 20_000) return;
        lastProgressEmittedAt = at;
        observeSafely(observer, {
          ...baseEvent, status: "progress", lastProgressAt,
          outputArtifactRevisions: outputArtifactRevisions(cwd, lastMessage), errorCode: null
        });
      }
    });
    lastProgressAt = new Date().toISOString();
    observeSafely(observer, {
      ...baseEvent, status: "completed", lastProgressAt,
      outputArtifactRevisions: outputArtifactRevisions(cwd, lastMessage), errorCode: null
    });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    lastProgressAt = new Date().toISOString();
    observeSafely(observer, {
      ...baseEvent, status: "failed", lastProgressAt,
      outputArtifactRevisions: outputArtifactRevisions(cwd, lastMessage),
      errorCode: /process_timeout/.test(message) ? "process_timeout" : "runner_failed"
    });
    if (commandUnavailable(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
    throw new Error(`CODEX_RUNNER_FAILED:${label}`);
  } finally { clearInterval(staleTimer); }
}

function candidatePrompt(videoPath: string, outputDir: string): string {
  return `
You are the isolated reconstruction runner for one video. Read the complete canonical Skill at ${skillDir}/SKILL.md and every directly required reference/schema before acting.

Input media: ${videoPath}
Writable output root: ${outputDir}

Execute the Skill's evidence-pack, first-round open probe, video-specific capture protocol, targeted capture, real OCR/UI inspection when required, structured reconstruction, coverage/meta-gate self-audit, schema validation, and a human-readable article generated from reconstruction. If the source has speech and no subtitle file is supplied, use the transcription capability documented at ${mediaSkillDir}/SKILL.md and mark it as machine transcription.
For known Mandarin speech, always use a multilingual model (never an .en model). If the preferred small model cannot download, fall back to the installed local whisper CLI with explicit --model base --language Chinese --task transcribe; the cached base model is an acceptable lower-confidence proposal when checked against audible speech and visible captions. A preferred-model download timeout alone does not make the available speech carrier unchecked.

Isolation and evidence rules:
- Do not read any previous report, creator analysis, audit, evaluation, or sibling video directory.
- Do not browse the web or verify the creator's product claims externally.
- Keep raw fact, visual observation, author claim, system inference, and unknown separate.
- Preserve every subtitle cue, representative frame, and all overlapping shots.
- Explicitly inspect non-speech audio when audio exists; technical metadata alone is not semantic listening evidence.
- Signed URLs, cookies, login data, and private browser state must never enter any output.

Write candidate outputs only under ${outputDir}: evidence/, probe.json, capture-protocol.json, targeted-evidence/, reconstruction.json, article.md, and run-notes.md. Do NOT create evaluation.json or gate-report.json; an independent process owns those. Before finishing, run the canonical schema validator for probe/protocol/reconstruction and OCR when applicable. If evidence cannot establish something, preserve it as unknown rather than inventing it.
`;
}

function evaluatorPrompt(videoPath: string, outputDir: string): string {
  return `
You are an independent evaluator in a fresh process. Read ${skillDir}/references/evaluation.md and ${skillDir}/schemas/evaluation.schema.json completely. Do not modify candidate files.

Source video: ${videoPath}
Candidate root: ${outputDir}

Independently inspect the source video, evidence/evidence-pack.json, targeted-evidence manifests and frames, OCR when present, probe.json, capture-protocol.json, reconstruction.json, and article.md. You did not see the candidate runner's hidden context and must not read any prior report/audit/evaluation outside this directory.

Evaluate GATE first: critical-question recall, core evidence coverage, unsupported positive inference, timestamp accuracy, applicable process dependencies, correct unknown discipline, unchecked channels, and the exact meta-gate. Only if every hard gate passes, run JUDGE for readability, knowledge prioritization, evidence usefulness, execution value, and compression without loss.

Write ${outputDir}/evaluation.json against the canonical schema and ${outputDir}/evaluation.md. Also perform one concise three-lens review in this same process and write these three JSON arrays:
- ${outputDir}/runtime-three-lens/content-restoration.json with CR-01 through CR-06
- ${outputDir}/runtime-three-lens/directing-logic.json with DL-01 through DL-06
- ${outputDir}/runtime-three-lens/visual-editing.json with VE-01 through VE-07

Each three-lens item must contain ruleId, status (pass|fail|not_checked), a specific finding, evidenceRefs, and evaluatorNotes, following the runtime contracts in ${path.join(projectRoot, "packages/research/src/video-analysis/runtime-three-lens-contracts.ts")}. Keep the review short and evidence-bound. Do not write gate-report.json and do not repair the candidate. Record concrete discrepancies as quality warnings instead of triggering another evaluator or repair pass.
`;
}

function failedIds(gate: GateReport): string[] {
  return Array.isArray(gate.failedGateIds)
    ? gate.failedGateIds
    : (gate.gates ?? []).filter((item) => item.pass === false).map((item) => item.id).filter((id): id is string => Boolean(id));
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function evaluateRuntimeThreeLens(
  outputDir: string,
  postExternalId: string,
  reconstructionArtifactRef: string,
  evaluationArtifactRef: string
): Promise<RuntimeThreeLensGateReport> {
  const reconstructionPath = path.join(outputDir, "reconstruction.json");
  const fingerprint = sha256(reconstructionPath);
  const evaluationPath = path.join(outputDir, "runtime-three-lens-evaluation.json");
  const gatePath = path.join(outputDir, "runtime-three-lens-gate-report.json");

  if (exists(evaluationPath) && exists(gatePath)) {
    try {
      const inspection = inspectRuntimeThreeLensArtifacts(
        JSON.parse(fs.readFileSync(evaluationPath, "utf8")),
        JSON.parse(fs.readFileSync(gatePath, "utf8")),
        fingerprint
      );
      if (inspection.gateReport && (
        inspection.state === "ready" ||
        ("reason" in inspection && ["runtime_three_lens_unchecked", "runtime_three_lens_failed"].includes(inspection.reason))
      )) {
        return inspection.gateReport;
      }
    } catch {
      // Invalid or stale runtime artifacts are replaced by fresh independent evaluations.
    }
  }

  const lensDir = path.join(outputDir, "runtime-three-lens");
  fs.mkdirSync(lensDir, { recursive: true });
  const definitions = [
    { key: "contentRestoration" as const, lens: "content_restoration" as const, file: "content-restoration.json", schema: contentRestorationRuleResultsSchema },
    { key: "directingLogic" as const, lens: "directing_logic" as const, file: "directing-logic.json", schema: directingLogicRuleResultsSchema },
    { key: "visualEditing" as const, lens: "visual_editing" as const, file: "visual-editing.json", schema: visualEditingRuleResultsSchema }
  ];
  const lenses: Record<string, unknown> = {};
  for (const definition of definitions) {
    const evaluatorRunId = crypto.randomUUID();
    const rulesPath = path.join(lensDir, definition.file);
    if (!exists(rulesPath)) throw new Error(`RUNTIME_THREE_LENS_MISSING:${definition.lens}`);
    const rules = definition.schema.parse(normalizeRuntimeLensEvidence(JSON.parse(fs.readFileSync(rulesPath, "utf8"))));
    lenses[definition.key] = {
      evaluator: {
        evaluatorId: `runtime-${definition.lens}`,
        evaluatorVersion: "three-lens-v1",
        evaluatorRunId,
        lens: definition.lens,
        evaluatedAt: new Date().toISOString(),
        independentOfCandidate: true,
        candidateRevisionFingerprint: fingerprint
      },
      rules
    };
  }
  const evaluation: RuntimeThreeLensEvaluation = runtimeThreeLensEvaluationSchema.parse({
    schemaVersion: "runtime-three-lens-evaluation@1",
    postExternalId,
    candidateRevision: { algorithm: "sha256", fingerprint, reconstructionArtifactRef },
    lenses
  });
  fs.writeFileSync(evaluationPath, `${JSON.stringify(evaluation, null, 2)}\n`, "utf8");
  const gate = deriveRuntimeThreeLensGateReport(evaluation, evaluationArtifactRef);
  fs.writeFileSync(gatePath, `${JSON.stringify(gate, null, 2)}\n`, "utf8");
  return gate;
}

async function validate(outputDir: string): Promise<GateReport> {
  const evaluationPath = path.join(outputDir, "evaluation.json");
  const gatePath = path.join(outputDir, "gate-report.json");
  const validationArgs = [
    path.join(skillDir, "scripts/validate-reconstruction.mjs"),
    "--evidence", path.join(outputDir, "evidence/evidence-pack.json"),
    "--targeted", path.join(outputDir, "targeted-evidence/targeted-evidence.json"),
    "--probe", path.join(outputDir, "probe.json"),
    "--protocol", path.join(outputDir, "capture-protocol.json"),
    "--reconstruction", path.join(outputDir, "reconstruction.json"),
    "--evaluation", evaluationPath,
    "--out", gatePath
  ];
  const ocrPath = path.join(outputDir, "targeted-evidence/ocr-evidence.json");
  if (exists(ocrPath)) validationArgs.splice(validationArgs.length - 2, 0, "--ocr", ocrPath);
  try { await runFile(process.execPath, validationArgs, { cwd: outputDir, timeout: 10 * 60_000 }); }
  catch { if (!exists(gatePath)) throw new Error("DETERMINISTIC_VALIDATOR_FAILED"); }
  return JSON.parse(fs.readFileSync(gatePath, "utf8")) as GateReport;
}

export class CodexVideoReconstructionExecutor implements VideoReconstructionExecutor {
  async reconstruct(
    rawRequest: unknown,
    observeLifecycle?: VideoReconstructionLifecycleObserver
  ): Promise<VideoReconstructionOutcome> {
    const request = videoReconstructionRequestSchema.parse(rawRequest);
    let videoPath: string;
    try { videoPath = artifactPath(request.sourceMediaArtifactRef); }
    catch (error) {
      return videoReconstructionOutcomeSchema.parse({ state: "blocked", code: "media_missing",
        message: error instanceof Error ? error.message : "源媒体引用无效", userActionRequired: false });
    }
    if (!exists(videoPath)) return { state: "blocked", code: "media_missing", message: "本地源视频不存在。", userActionRequired: false };

    const relativeRoot = `video-reconstructions/${request.postExternalId}`;
    const outputDir = path.join(runArtifactDir(request.creatorRunId), relativeRoot);
    fs.mkdirSync(outputDir, { recursive: true });
    try {
      const requiredCandidate = ["evidence/evidence-pack.json", "probe.json", "capture-protocol.json", "reconstruction.json", "article.md"];
      let missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      if (missing.length > 0) {
        await runCodex(
          candidatePrompt(videoPath, outputDir), outputDir, "candidate",
          request.sourceMediaArtifactRef, observeLifecycle
        );
        missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      }
      if (missing.length > 0) return { state: "not_ready", reconstructionArtifactRef: null, evaluationArtifactRef: null,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["candidate_output_contract"], message: `候选重建缺少：${missing.join("、")}` };
      await refreshOcrEvidenceIfNeeded(outputDir);

      const evaluationPath = path.join(outputDir, "evaluation.json");
      const gatePath = path.join(outputDir, "gate-report.json");
      const refs = {
        reconstructionArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/reconstruction.json`),
        articleArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/article.md`),
        evaluationArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/evaluation.json`),
        gateReportArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/gate-report.json`),
        threeLensEvaluationArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/runtime-three-lens-evaluation.json`),
        threeLensGateReportArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/runtime-three-lens-gate-report.json`)
      };
      let gate: GateReport | null = exists(gatePath) && exists(evaluationPath)
        ? JSON.parse(fs.readFileSync(gatePath, "utf8")) as GateReport : null;
      const singlePassLensFiles = [
        "runtime-three-lens/content-restoration.json",
        "runtime-three-lens/directing-logic.json",
        "runtime-three-lens/visual-editing.json"
      ];
      if (!gate || singlePassLensFiles.some((relative) => !exists(path.join(outputDir, relative)))) {
        await runCodex(
          evaluatorPrompt(videoPath, outputDir), outputDir, "evaluator-1",
          sha256(path.join(outputDir, "reconstruction.json")), observeLifecycle
        );
        if (!exists(evaluationPath)) return { state: "not_ready", reconstructionArtifactRef: refs.reconstructionArtifactRef,
          evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
          threeLensGateReportArtifactRef: null, failedGateIds: ["independent_evaluation_missing"],
          message: "单轮独立评估没有产生 evaluation.json。" };
        gate = await validate(outputDir);
      }

      let threeLensGate: RuntimeThreeLensGateReport;
      try {
        threeLensGate = await evaluateRuntimeThreeLens(
          outputDir,
          request.postExternalId,
          refs.reconstructionArtifactRef,
          refs.threeLensEvaluationArtifactRef
        );
      } catch (error) {
        return videoReconstructionOutcomeSchema.parse({
          state: "not_ready",
          reconstructionArtifactRef: refs.reconstructionArtifactRef,
          evaluationArtifactRef: refs.evaluationArtifactRef,
          gateReportArtifactRef: refs.gateReportArtifactRef,
          threeLensEvaluationArtifactRef: null,
          threeLensGateReportArtifactRef: null,
          failedGateIds: ["single_pass_evaluation_contract"],
          message: `单轮评估产物不完整：${error instanceof Error ? error.message : "unknown"}`
        });
      }
      const qualityWarningGateIds = [...new Set([
        ...failedIds(gate),
        ...threeLensGate.failedGateIds,
        ...threeLensGate.uncheckedGateIds
      ])];
      return videoReconstructionOutcomeSchema.parse({
        state: "ready",
        ...refs,
        gateCount: gate.gates?.length ?? 1,
        threeLensGateCount: 19,
        failedGateIds: [],
        qualityWarningGateIds,
        evaluationMode: "single_pass"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频重建执行失败";
      if (commandUnavailable(message)) return { state: "blocked", code: "runner_unavailable", message, userActionRequired: true };
      return { state: "not_ready", reconstructionArtifactRef: null, evaluationArtifactRef: null,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["runner_execution"], message: /DETERMINISTIC_VALIDATOR_FAILED/.test(message)
          ? "确定性验证器没有产生 gate report。" : "视频重建 Runner 执行失败；详细诊断仅保留在本地运行日志。" };
    }
  }
}
