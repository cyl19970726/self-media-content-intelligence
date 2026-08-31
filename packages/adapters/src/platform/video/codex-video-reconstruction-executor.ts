import fs from "node:fs";
import crypto from "node:crypto";
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
import { prepareBuilderInputs } from "./video-reconstruction-media-preparer.js";
import { validateBuilderIntegrity } from "./video-builder-integrity.js";

const skillDir = process.env.SELF_MEDIA_VIDEO_RECONSTRUCTION_SKILL_DIR ??
  path.join(projectRoot, ".agents", "skills", "video-content-reconstruction");
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
  // A complete failed OCR artifact still proves that the channel was checked
  // for this immutable frame revision. Repeating it cannot add information.
  return missingTargetedFrame;
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
  if (!shouldRefreshOcrEvidence(
    readJsonIfPresent(protocolPath),
    readJsonIfPresent(targetedPath),
    readJsonIfPresent(ocrPath)
  )) return;
  try {
    await runFile(process.execPath, [path.join(skillDir, "scripts/run-ocr.mjs"),
      "--manifest", targetedPath, "--out", ocrPath], { cwd: outputDir, timeout: 10 * 60_000 });
  } catch {
    // One immutable manifest gets one host attempt; failure remains explicit.
  }
}

function commandUnavailable(message: string): boolean {
  return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|command not found|authentication|login required|unauthorized/i.test(message);
}

export function reconstructionFailureGateId(message: string): string {
  const builderIntegrity = message.match(/BUILDER_INTEGRITY_([A-Z0-9_]+)/)?.[1];
  if (builderIntegrity) return `builder_integrity_${builderIntegrity.toLowerCase()}`;
  if (message.includes("MEDIA_PREPARATION")) return "media_preparation";
  if (message.includes("EVALUATOR_MUTATED_CANDIDATE")) return "evaluator_candidate_mutation";
  if (message.includes("EVALUATOR_RUN_PROVENANCE")) return "evaluator_provenance";
  if (message.includes("BUILDER_SCHEMA_VALIDATION_FAILED")) return "builder_schema_validation";
  if (message.includes("BUILDER_OUTPUT_CONTRACT")) return "builder_output_contract";
  return "runner_execution";
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
    "builder-validation.json",
    "evaluation.json", "gate-report.json", "evaluator-run.json", "runtime-three-lens-evaluation.json",
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

export function codexInvocationArgs(
  role: VideoReconstructionChildRole,
  cwd: string,
  lastMessage: string,
  environment: NodeJS.ProcessEnv = process.env
): string[] {
  const isBuilder = role === "candidate";
  const model = isBuilder
    ? environment.SELF_MEDIA_BUILDER_MODEL ?? "gpt-5.6-terra"
    : environment.SELF_MEDIA_EVALUATOR_MODEL ?? "gpt-5.6-terra";
  const reasoningEffort = isBuilder
    ? environment.SELF_MEDIA_BUILDER_REASONING_EFFORT ?? "medium"
    : environment.SELF_MEDIA_EVALUATOR_REASONING_EFFORT ?? "medium";
  const sessionArgs = environment.SELF_MEDIA_CODEX_EPHEMERAL === "false" ? [] : ["--ephemeral"];
  return [
    "exec", "-", "--skip-git-repo-check", ...sessionArgs, "--color", "never",
    "-m", model, "-c", `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
    "--approve-for-me", "-C", cwd, "-o", lastMessage
  ];
}

export type CodexRunReceipt = {
  childRunId: string;
  role: VideoReconstructionChildRole;
  startedAt: string;
  completedAt: string;
  inputRevision: string;
};

export async function runCodex(
  prompt: string,
  cwd: string,
  label: string,
  inputRevision: string,
  observer?: VideoReconstructionLifecycleObserver
): Promise<CodexRunReceipt> {
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
    await runFileInput(binary, codexInvocationArgs(role, cwd, lastMessage, environment), prompt, {
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
    return { childRunId, role, startedAt, completedAt: lastProgressAt, inputRevision };
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

export function candidatePrompt(
  videoPath: string,
  outputDir: string,
  missingArtifacts: string[],
  mediaPreparationPath = path.join(outputDir, "media-preparation.json")
): string {
  const existingArtifacts = [
    "media-preparation.json", "evidence/evidence-pack.json", "probe.json", "capture-protocol.json",
    "targeted-evidence/targeted-evidence.json", "targeted-evidence/ocr-evidence.json",
    "reconstruction.json"
  ].filter((relative) => exists(path.join(outputDir, relative)));
  return `
You are the Builder for one isolated video reconstruction. Read ${skillDir}/references/builder-operator.md completely before acting. This operator contract is the complete runtime instruction: do NOT read SKILL.md, evaluation.md, known-limitations.md, or other explanatory references. Read only the canonical JSON schemas for artifacts you must create.

Input media: ${videoPath}
Writable output root: ${outputDir}
Prepared media manifest: ${mediaPreparationPath}
Frozen evidence pack: ${path.join(outputDir, "evidence", "evidence-pack.json")}
Missing artifacts that this resume run is allowed to create: ${JSON.stringify(missingArtifacts)}
Existing canonical artifacts that must be reused: ${JSON.stringify(existingArtifacts)}

Resume contract:
- Generate only the listed missing artifacts and their strictly necessary derived files.
- Do not rebuild, overwrite, or re-probe any listed existing canonical artifact.
- Media preparation is complete. Never run whisper, whisper-cli, ffprobe, direct ffmpeg extraction, or build-evidence-pack.mjs.
- Treat media-preparation.json and evidence/evidence-pack.json as frozen host inputs.
- When probe, protocol, or targeted evidence already exists, treat it as frozen input and inspect it directly.

Execute only the missing Builder closures: first-round open probe, video-specific capture protocol, targeted capture, real OCR/UI inspection when required, structured reconstruction, coverage/meta-gate self-audit, and schema validation. Preserve the transcript provenance recorded in media-preparation.json. Machine transcription remains a lower-confidence proposal and must be checked against audible speech and visible captions when consequential.

Isolation and evidence rules:
- Do not read any previous report, creator analysis, audit, evaluation, or sibling video directory.
- Do not browse the web or verify the creator's product claims externally.
- Keep raw fact, visual observation, author claim, system inference, and unknown separate.
- Preserve every subtitle cue, representative frame, and all overlapping shots.
- Derive script paths from the frozen output root or use paths relative to it; do not repeatedly retype the absolute run ID.
- For one unchanged targeted-evidence manifest, execute OCR at most once. A complete OCR artifact is terminal for that revision, including when its frames record failures; never rerun successful OCR.
- targeted_frame references use TARGET-* frame IDs; ocr references use the recognized line's OCR-* ID, never a TARGET frame ID. Every frame/OCR evidence time must fall inside its knowledge unit's time range (±0.5s).
- Targeted capture produces targeted-evidence/contact-sheet.jpg. Inspect that overview first, then open at most 4 originals per unresolved question and normally no more than 12 originals total; never load dozens of full-resolution frames at once.
- When every OCR frame failed there is no valid OCR line ID: cite targeted_frame evidence and preserve text as unknown; never invent an OCR-* placeholder.
- Never use afplay, a GUI player, or system speakers as proof that the model heard audio. Inspect only model-readable audio evidence and non-speech transcript labels; when only technical audio presence is available, preserve music/sound semantics as unknown.
- For every carrier, write inspectionStatus and inspectionRationale while retaining compatible available/inspected booleans. Technical audio presence without model-readable semantics is available:true, inspected:true, inspectionStatus:"checked_unreadable"; it must remain an explicit unknown and must not support semantic audio claims.
- informationCarriers[].discoveredIn contains only carrierSweep IDs. Put media/evidence file provenance in inspectionRationale or evidenceHints. An absent carrier is available:false and may be inspected:true when frozen host evidence was checked to establish absence.
- Write metaGate.questionId as "uncovered_information_audit". The display question may be localized and is not an identity key.
- Signed URLs, cookies, login data, and private browser state must never enter any output.

Write candidate outputs only under ${outputDir}: evidence/, probe.json, capture-protocol.json, targeted-evidence/, and reconstruction.json. Do not generate article.md or verbose run-notes.md on the synchronous fast path. Do NOT create evaluation.json or gate-report.json; an independent process owns those. Before finishing, run the canonical schema validator for probe/protocol/reconstruction and OCR when applicable. If evidence cannot establish something, preserve it as unknown rather than inventing it.
`;
}

export function evaluatorPrompt(
  videoPath: string,
  outputDir: string,
  candidateRevisionFingerprint: string,
  candidateFingerprints: Record<string, string>
): string {
  return `
You are the optional Evaluator in a fresh process, independent from the Builder. Read ${skillDir}/references/evaluator-operator.md and ${skillDir}/schemas/evaluation.schema.json completely. Do not modify candidate files.

Source video: ${videoPath}
Candidate root: ${outputDir}
Frozen candidate revision: ${candidateRevisionFingerprint}
Frozen candidate artifact fingerprints: ${JSON.stringify(candidateFingerprints)}

Independently inspect the source video, media-preparation.json, evidence/evidence-pack.json, targeted-evidence manifests and frames, OCR when present, probe.json, capture-protocol.json, reconstruction.json, and article.md only when it exists. You did not see the Builder's hidden context and must not read any prior report/audit/evaluation outside this directory.

Evaluate GATE first: critical-question recall, core evidence coverage, unsupported positive inference, timestamp accuracy, applicable process dependencies, correct unknown discipline, unchecked channels, and the exact meta-gate. Only if every hard gate passes, run JUDGE for readability, knowledge prioritization, evidence usefulness, execution value, and compression without loss.

Carrier and OCR rules:
- Accept checked_unreadable as a closed carrier only when its rationale names the completed check and the candidate preserves the unavailable semantics as unknown without making claims from it. Do not convert checked_unreadable back to unchecked merely because semantic extraction was unavailable.
- OCR frame statuses processed and failed both prove one recognition execution for that immutable frame revision. Failed OCR supplies no text evidence; independently inspect consequential visibly legible text and fail genuine omissions.

Write ${outputDir}/evaluation.json against the canonical schema and ${outputDir}/evaluation.md. Also perform one concise three-lens review in this same process and write these three JSON arrays:
- ${outputDir}/runtime-three-lens/content-restoration.json with CR-01 through CR-06
- ${outputDir}/runtime-three-lens/directing-logic.json with DL-01 through DL-06
- ${outputDir}/runtime-three-lens/visual-editing.json with VE-01 through VE-07

This single Evaluator process owns all three lenses; do not claim three independent processes. Each three-lens item must contain ruleId, status (pass|fail|not_checked), a specific finding, evidenceRefs, and evaluatorNotes, following the runtime contracts in ${path.join(projectRoot, "packages/research/src/video-analysis/runtime-three-lens-contracts.ts")}. Keep the review short and evidence-bound. Do not write gate-report.json and do not repair the candidate. Record concrete discrepancies as quality warnings instead of triggering another evaluator or repair pass.
`;
}

function failedIds(gate: GateReport): string[] {
  return Array.isArray(gate.failedGateIds)
    ? gate.failedGateIds
    : (gate.gates ?? []).filter((item) => item.pass === false).map((item) => item.id).filter((id): id is string => Boolean(id));
}

export function hardEvaluationGateFailures(
  gate: GateReport,
  threeLensGate: Pick<RuntimeThreeLensGateReport, "ready" | "failedGateIds" | "uncheckedGateIds">
): string[] {
  if (gate.ready === true && threeLensGate.ready === true) return [];
  const failures = [...new Set([
    ...failedIds(gate),
    ...threeLensGate.failedGateIds,
    ...threeLensGate.uncheckedGateIds
  ])];
  return failures.length > 0 ? failures : ["evaluation_not_ready"];
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const frozenCandidateFiles = [
  "media-preparation.json",
  "evidence/evidence-pack.json",
  "probe.json",
  "capture-protocol.json",
  "targeted-evidence/targeted-evidence.json",
  "targeted-evidence/ocr-evidence.json",
  "reconstruction.json",
  "builder-validation.json"
] as const;

export function candidateArtifactFingerprints(outputDir: string): Record<string, string> {
  return Object.fromEntries(frozenCandidateFiles.flatMap((relative) => {
    const absolute = path.join(outputDir, relative);
    return exists(absolute) ? [[relative, sha256(absolute)]] : [];
  }));
}

export function assertCandidateArtifactsUnchanged(before: Record<string, string>, outputDir: string): void {
  const after = candidateArtifactFingerprints(outputDir);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("EVALUATOR_MUTATED_CANDIDATE");
}

async function validateBuilder(outputDir: string, videoPath: string): Promise<void> {
  const args = [
    path.join(skillDir, "scripts/validate-schemas.py"),
    "--probe", path.join(outputDir, "probe.json"),
    "--protocol", path.join(outputDir, "capture-protocol.json"),
    "--reconstruction", path.join(outputDir, "reconstruction.json")
  ];
  const ocrPath = path.join(outputDir, "targeted-evidence/ocr-evidence.json");
  if (exists(ocrPath)) args.push("--ocr", ocrPath);
  const result = await runFile("python3", args, { cwd: outputDir, timeout: 10 * 60_000 });
  const schemaValidation = JSON.parse(result.stdout.trim()) as { pass?: boolean; validated?: string[]; failures?: unknown[] };
  if (schemaValidation.pass !== true) throw new Error("BUILDER_SCHEMA_VALIDATION_FAILED");
  const requiredEvidence = [
    "media-preparation.json",
    "evidence/evidence-pack.json",
    "probe.json",
    "capture-protocol.json",
    "targeted-evidence/targeted-evidence.json",
    "reconstruction.json"
  ];
  const missing = requiredEvidence.filter((relative) => !exists(path.join(outputDir, relative)));
  if (missing.length > 0) throw new Error(`BUILDER_OUTPUT_CONTRACT:${missing.join(",")}`);
  const integrityValidation = validateBuilderIntegrity(outputDir, videoPath);
  const artifactFingerprints = Object.fromEntries(requiredEvidence.map((relative) => [relative, sha256(path.join(outputDir, relative))]));
  fs.writeFileSync(path.join(outputDir, "builder-validation.json"), `${JSON.stringify({
    schemaVersion: "video-builder-validation@1",
    passed: true,
    validatedAt: new Date().toISOString(),
    sourceMedia: { algorithm: "sha256", fingerprint: sha256(videoPath) },
    schemaValidation,
    integrityValidation,
    artifactFingerprints
  }, null, 2)}\n`, "utf8");
}

async function evaluateRuntimeThreeLens(
  outputDir: string,
  postExternalId: string,
  reconstructionArtifactRef: string,
  evaluationArtifactRef: string,
  evaluatorRunId: string
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
    schemaVersion: "runtime-three-lens-evaluation@2",
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
    const evaluationPolicy = process.env.SELF_MEDIA_VIDEO_EVALUATION_POLICY === "single_pass"
      ? "single_pass"
      : request.evaluationPolicy;
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
      await prepareBuilderInputs({
        videoPath,
        outputDir,
        skillDir
      });
      const requiredCandidate = [
        "evidence/evidence-pack.json", "probe.json", "capture-protocol.json",
        "targeted-evidence/targeted-evidence.json", "reconstruction.json"
      ];
      let missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      if (missing.length > 0) {
        await runCodex(
          candidatePrompt(videoPath, outputDir, missing, path.join(outputDir, "media-preparation.json")), outputDir, "candidate",
          request.sourceMediaArtifactRef, observeLifecycle
        );
        missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      }
      if (missing.length > 0) return { state: "not_ready", reconstructionArtifactRef: null, evaluationArtifactRef: null,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["candidate_output_contract"], message: `候选重建缺少：${missing.join("、")}` };
      await refreshOcrEvidenceIfNeeded(outputDir);
      await validateBuilder(outputDir, videoPath);

      const evaluationPath = path.join(outputDir, "evaluation.json");
      const gatePath = path.join(outputDir, "gate-report.json");
      const refs = {
        reconstructionArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/reconstruction.json`),
        articleArtifactRef: exists(path.join(outputDir, "article.md"))
          ? artifactRef(request.creatorRunId, `${relativeRoot}/article.md`)
          : null,
        builderValidationArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/builder-validation.json`),
        evaluationArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/evaluation.json`),
        gateReportArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/gate-report.json`),
        threeLensEvaluationArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/runtime-three-lens-evaluation.json`),
        threeLensGateReportArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/runtime-three-lens-gate-report.json`)
      };
      if (evaluationPolicy === "skip") {
        return videoReconstructionOutcomeSchema.parse({
          state: "built_unevaluated",
          reconstructionArtifactRef: refs.reconstructionArtifactRef,
          articleArtifactRef: refs.articleArtifactRef,
          builderValidationArtifactRef: refs.builderValidationArtifactRef,
          evaluationMode: "skipped"
        });
      }
      let gate: GateReport | null = exists(gatePath) && exists(evaluationPath)
        ? JSON.parse(fs.readFileSync(gatePath, "utf8")) as GateReport : null;
      const singlePassLensFiles = [
        "runtime-three-lens/content-restoration.json",
        "runtime-three-lens/directing-logic.json",
        "runtime-three-lens/visual-editing.json"
      ];
      if (!gate || !exists(path.join(outputDir, "evaluator-run.json")) ||
          singlePassLensFiles.some((relative) => !exists(path.join(outputDir, relative)))) {
        const frozenFingerprints = candidateArtifactFingerprints(outputDir);
        const candidateRevision = sha256(path.join(outputDir, "reconstruction.json"));
        const evaluatorReceipt = await runCodex(
          evaluatorPrompt(videoPath, outputDir, candidateRevision, frozenFingerprints), outputDir, "evaluator-1",
          candidateRevision, observeLifecycle
        );
        assertCandidateArtifactsUnchanged(frozenFingerprints, outputDir);
        if (!exists(evaluationPath)) return { state: "not_ready", reconstructionArtifactRef: refs.reconstructionArtifactRef,
          evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
          threeLensGateReportArtifactRef: null, failedGateIds: ["independent_evaluation_missing"],
          message: "单轮独立评估没有产生 evaluation.json。" };
        gate = await validate(outputDir);
        fs.writeFileSync(path.join(outputDir, "evaluator-run.json"), `${JSON.stringify({
          schemaVersion: "video-evaluator-run@1",
          evaluatorRunId: evaluatorReceipt.childRunId,
          modelRole: evaluatorReceipt.role,
          startedAt: evaluatorReceipt.startedAt,
          completedAt: evaluatorReceipt.completedAt,
          candidateRevision,
          candidateFingerprints: frozenFingerprints
        }, null, 2)}\n`, "utf8");
      }

      const evaluatorRun = readJsonIfPresent(path.join(outputDir, "evaluator-run.json")) as { evaluatorRunId?: string } | null;
      if (!evaluatorRun?.evaluatorRunId) throw new Error("EVALUATOR_RUN_PROVENANCE_MISSING");

      let threeLensGate: RuntimeThreeLensGateReport;
      try {
        threeLensGate = await evaluateRuntimeThreeLens(
          outputDir,
          request.postExternalId,
          refs.reconstructionArtifactRef,
          refs.threeLensEvaluationArtifactRef,
          evaluatorRun.evaluatorRunId
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
      const hardGateFailures = hardEvaluationGateFailures(gate, threeLensGate);
      if (hardGateFailures.length > 0) {
        return videoReconstructionOutcomeSchema.parse({
          state: "not_ready",
          reconstructionArtifactRef: refs.reconstructionArtifactRef,
          evaluationArtifactRef: refs.evaluationArtifactRef,
          gateReportArtifactRef: refs.gateReportArtifactRef,
          threeLensEvaluationArtifactRef: refs.threeLensEvaluationArtifactRef,
          threeLensGateReportArtifactRef: refs.threeLensGateReportArtifactRef,
          failedGateIds: hardGateFailures,
          message: "独立评估发现质量硬闸未通过；Builder 产物已保留，但不能晋升为 VERIFIED。"
        });
      }
      return videoReconstructionOutcomeSchema.parse({
        state: "verified",
        ...refs,
        gateCount: gate.gates?.length ?? 1,
        threeLensGateCount: 19,
        failedGateIds: [],
        qualityWarningGateIds: [],
        evaluationMode: "single_pass"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频重建执行失败";
      if (commandUnavailable(message)) return { state: "blocked", code: "runner_unavailable", message, userActionRequired: true };
      const reconstructionArtifactRef = exists(path.join(outputDir, "reconstruction.json"))
        ? artifactRef(request.creatorRunId, `${relativeRoot}/reconstruction.json`) : null;
      const evaluationArtifactRef = exists(path.join(outputDir, "evaluation.json"))
        ? artifactRef(request.creatorRunId, `${relativeRoot}/evaluation.json`) : null;
      const gateReportArtifactRef = exists(path.join(outputDir, "gate-report.json"))
        ? artifactRef(request.creatorRunId, `${relativeRoot}/gate-report.json`) : null;
      const failedGateId = reconstructionFailureGateId(message);
      const publicMessage = /DETERMINISTIC_VALIDATOR_FAILED/.test(message)
        ? "确定性验证器没有产生 gate report。"
        : failedGateId.startsWith("builder_integrity_")
          ? `Builder 确定性完整性检查未通过：${failedGateId}。候选产物已保留。`
        : failedGateId === "media_preparation"
          ? "宿主媒体准备失败；Builder 未被启动。"
          : failedGateId === "evaluator_candidate_mutation"
            ? "独立 Evaluator 修改了冻结候选，评估已拒绝；Builder 产物仍被保留。"
            : failedGateId === "evaluator_provenance"
              ? "独立 Evaluator 缺少真实进程来源记录，不能晋升为已验证。"
              : "视频重建 Runner 执行失败；详细诊断仅保留在本地运行日志。";
      return { state: "not_ready", reconstructionArtifactRef, evaluationArtifactRef,
        gateReportArtifactRef, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: [failedGateId], message: publicMessage };
    }
  }
}
