import { freezePostSourceInput } from "./video-post-source-input.js";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir, runtimeDir } from "../../core/config.js";
import { runFile, runFileInput } from "../../core/process.js";
import { attachVerifiedSkillSnapshots, codexInstalledVersions, defaultCodexSdkFactory, invokeCodexSdk } from "../../workflow/codex-sdk-runner.js";
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
import {
  assembleHostOwnedReconstruction,
  type HostAssemblyReport
} from "./video-reconstruction-host-assembler.js";
import {
  safeOutputRelativeRoot,
  preservedHostAssembly,
  sdkModel,
  sdkReasoningEffort,
  type VideoCodexExecutionOptions
} from "./video-codex-execution.js";
import { validateEvaluationArtifacts, type GateReport } from "./video-evaluation-contract.js";
import { recoverOcrWithBuilderContinuation } from "./video-ocr-builder-continuation.js";
import { shouldRetryHostOcr } from "./video-ocr-host-recovery.js";

export { safeOutputRelativeRoot, type VideoCodexExecutionOptions } from "./video-codex-execution.js";
export { validateEvaluationArtifacts } from "./video-evaluation-contract.js";

const skillDir = process.env.SELF_MEDIA_VIDEO_RECONSTRUCTION_SKILL_DIR ??
  path.join(projectRoot, ".agents", "skills", "video-content-reconstruction");
const evaluatorPromptVersion = "single-pass-v3-isolated-source-overview";
const builderIntegrityContractVersion = "builder-integrity-v7-host-cue-candidates";

function exists(file: string): boolean { return fs.existsSync(file) && fs.statSync(file).isFile(); }

function mergeHostAssemblyReports(previous: HostAssemblyReport, current: HostAssemblyReport): HostAssemblyReport {
  return {
    ...current,
    transcriptCuesRestored: Math.max(previous.transcriptCuesRestored, current.transcriptCuesRestored),
    cueAccountabilityRowsRestored: previous.cueAccountabilityRowsRestored + current.cueAccountabilityRowsRestored,
    cueAccountabilityRowsRepaired: previous.cueAccountabilityRowsRepaired + current.cueAccountabilityRowsRepaired,
    cueAccountabilityRowsHostOwned: current.cueAccountabilityRowsHostOwned,
    invalidAbsoluteSourceRefsRemoved: previous.invalidAbsoluteSourceRefsRemoved + current.invalidAbsoluteSourceRefsRemoved,
    carrierRationalesSynchronized: previous.carrierRationalesSynchronized + current.carrierRationalesSynchronized,
    probeWarnings: [...new Set([...previous.probeWarnings, ...current.probeWarnings])]
  };
}

export function shouldRefreshOcrEvidence(
  protocolInput: unknown,
  targetedInput: unknown,
  ocrInput: unknown
): boolean {
  return shouldRetryHostOcr(protocolInput, targetedInput, ocrInput);
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

export function runtimeThreeLensBoundToEvaluator(value: unknown, evaluatorRunId: string): boolean {
  if (!value || typeof value !== "object" || !("lenses" in value)) return false;
  const lenses = (value as { lenses?: Record<string, { evaluator?: { evaluatorRunId?: string } }> }).lenses ?? {};
  return Object.values(lenses).length === 3 &&
    Object.values(lenses).every((lens) => lens.evaluator?.evaluatorRunId === evaluatorRunId);
}

function readJsonIfPresent(file: string): unknown {
  if (!exists(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return null; }
}

function commandUnavailable(message: string): boolean {
  return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|command not found|authentication|login required|unauthorized/i.test(message);
}

function definedEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
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
  const isBuilder = ["candidate", "generic_repair", "runtime_repair"].includes(role);
  const model = isBuilder
    ? environment.SELF_MEDIA_BUILDER_MODEL ?? "gpt-5.6-terra"
    : environment.SELF_MEDIA_EVALUATOR_MODEL ?? "gpt-5.6-luna";
  const reasoningEffort = isBuilder
    ? environment.SELF_MEDIA_BUILDER_REASONING_EFFORT ?? "medium"
    : environment.SELF_MEDIA_EVALUATOR_REASONING_EFFORT ?? "medium";
  const sessionArgs = environment.SELF_MEDIA_CODEX_EPHEMERAL === "false" ? [] : ["--ephemeral"];
  return [
    "exec", "-", "--skip-git-repo-check", ...sessionArgs, "--json", "--color", "never",
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

/** Relocates only path projections in a copied manifest; every frozen content digest must already match. */
export function preservePreparedCandidateInputs(outputDir: string, videoPath: string): void {
  const required = ["post-source-input.json", "media-preparation.json", "evidence/evidence-pack.json", "probe.json",
    "capture-protocol.json", "targeted-evidence/targeted-evidence.json", "reconstruction.json"];
  const missing = required.filter((relative) => !exists(path.join(outputDir, relative)));
  if (missing.length) throw new Error(`PRESERVED_CANDIDATE_INCOMPLETE:${missing.join(",")}`);
  const manifestPath = path.join(outputDir, "media-preparation.json");
  const manifest = readJsonIfPresent(manifestPath) as { sourceMedia?: { fingerprint?: string }; evidencePack?: { path?: string; fingerprint?: string }; transcript?: { path?: string | null; fingerprint?: string | null } } | null;
  const evidencePath = path.join(outputDir, "evidence/evidence-pack.json");
  if (!manifest || manifest.sourceMedia?.fingerprint !== sha256(videoPath)
    || manifest.evidencePack?.fingerprint !== sha256(evidencePath)) throw new Error("PRESERVED_CANDIDATE_PREPARATION_MISMATCH");
  if (manifest.transcript?.path && manifest.transcript.fingerprint !== sha256(manifest.transcript.path)) {
    throw new Error("PRESERVED_CANDIDATE_TRANSCRIPT_MISMATCH");
  }
  if (manifest.evidencePack.path !== evidencePath) {
    manifest.evidencePack.path = evidencePath;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
}

export async function runCodex(
  prompt: string,
  cwd: string,
  label: string,
  inputRevision: string,
  observer?: VideoReconstructionLifecycleObserver,
  options: VideoCodexExecutionOptions = {}
): Promise<CodexRunReceipt> {
  const binary = process.env.SELF_MEDIA_CODEX_BIN ?? "codex";
  const lastMessage = path.join(cwd, `${label}-last-message.txt`);
  const role = childRole(label);
  const policy = childPolicy(role);
  const builderRole = role === "candidate" || role === "generic_repair" || role === "runtime_repair";
  const requiredSkillFiles = !builderRole
    ? [path.join(skillDir, "references", "evaluator-operator.md"), path.join(skillDir, "schemas", "evaluation.schema.json"),
      path.join(projectRoot, "packages", "research", "src", "video-analysis", "runtime-three-lens-contracts.ts")]
    : [path.join(skillDir, "references", "builder-operator.md"), path.join(skillDir, "references", "single-post-depth.md"),
      path.join(skillDir, "schemas", "capture-protocol.schema.json"), path.join(skillDir, "schemas", "reconstruction.schema.json")];
  const skill = attachVerifiedSkillSnapshots(prompt, requiredSkillFiles, { outputDirectory: cwd });
  prompt = skill.prompt;
  const childRunId = crypto.randomUUID();
  const traceDir = path.join(runtimeDir(), "worker-traces", childRunId);
  fs.mkdirSync(traceDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(traceDir, "prompt.txt"), prompt, { mode: 0o600 });
  fs.writeFileSync(path.join(cwd, `${label}-trace.json`), JSON.stringify({ childRunId, traceDir,
    sessionMode: process.env.SELF_MEDIA_CODEX_EPHEMERAL === "false" ? "retained" : "ephemeral",
    executionMode: options.executionMode ?? "cli", ...codexInstalledVersions(), startedAt: new Date().toISOString() }, null, 2));
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
  const actualModel = options.executionMode === "sdk" ? sdkModel(role, options)
    : builderRole ? environment.SELF_MEDIA_BUILDER_MODEL ?? "gpt-5.6-terra"
      : environment.SELF_MEDIA_EVALUATOR_MODEL ?? "gpt-5.6-luna";
  const actualReasoningEffort = options.executionMode === "sdk" ? sdkReasoningEffort(role, options)
    : builderRole ? environment.SELF_MEDIA_BUILDER_REASONING_EFFORT ?? "medium"
      : environment.SELF_MEDIA_EVALUATOR_REASONING_EFFORT ?? "medium";
  fs.writeFileSync(path.join(traceDir, "runtime.json"), JSON.stringify({ childRunId, role, label, startedAt, inputRevision,
    executionMode: options.executionMode ?? "cli", model: actualModel, reasoningEffort: actualReasoningEffort, skillLoad: skill.receipt,
    sessionMode: options.executionMode === "sdk" ? "sdk_fresh_thread"
      : environment.SELF_MEDIA_CODEX_EPHEMERAL === "false" ? "retained" : "ephemeral", ...codexInstalledVersions() }, null, 2), { mode: 0o600 });
  try {
    if (options.executionMode === "sdk") {
      const model = sdkModel(role, options);
      const reasoningEffort = sdkReasoningEffort(role, options);
      fs.writeFileSync(path.join(cwd, `${label}-trace.json`), JSON.stringify({ childRunId, traceDir,
        sessionMode: "sdk_fresh_thread", executionMode: "sdk", model, reasoningEffort,
        ...codexInstalledVersions(), startedAt }, null, 2), { mode: 0o600 });
      const result = await invokeCodexSdk(options.sdkFactory ?? defaultCodexSdkFactory, {
        prompt, outputDir: cwd, role, model, reasoningEffort, lastMessage, signal: options.signal ?? new AbortController().signal,
        timeoutMs: policy.timeoutMs, codexOptions: { codexPathOverride: process.env.SELF_MEDIA_CODEX_BIN, env: definedEnvironment(environment) },
        observer: (event) => {
          fs.appendFileSync(path.join(traceDir, "events.jsonl"), `${JSON.stringify(event)}\n`, { mode: 0o600 });
          const at = Date.now();
          lastProgressAt = new Date(at).toISOString();
          staleEmitted = false;
        }
      });
      fs.writeFileSync(path.join(traceDir, "result.json"), JSON.stringify({ threadId: result.threadId, usage: result.usage }, null, 2), { mode: 0o600 });
    } else await runFileInput(binary, codexInvocationArgs(role, cwd, lastMessage, environment), prompt, {
      cwd,
      timeout: policy.timeoutMs,
      env: environment,
      onOutput: (stream, chunk) => {
        fs.appendFileSync(path.join(traceDir, stream === "stdout" ? "events.jsonl" : "stderr.log"), chunk, { mode: 0o600 });
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
    fs.writeFileSync(path.join(traceDir, "failure.json"), JSON.stringify({ message: error instanceof Error ? error.message : "unknown runner failure" }, null, 2), { mode: 0o600 });
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
Frozen post identity and independent cover: ${path.join(outputDir, "post-source-input.json")}
Read ${skillDir}/references/single-post-depth.md and fulfill depthContractVersion: single-post-depth@1.
Missing artifacts that this resume run is allowed to create: ${JSON.stringify(missingArtifacts)}
Existing canonical artifacts that must be reused: ${JSON.stringify(existingArtifacts)}

Resume contract:
- Generate only the listed missing artifacts and their strictly necessary derived files.
- Do not rebuild, overwrite, or re-probe any listed existing canonical artifact.
- Media preparation is complete. Never run whisper, whisper-cli, ffprobe, direct ffmpeg extraction, or build-evidence-pack.mjs.
- Treat media-preparation.json and evidence/evidence-pack.json as frozen host inputs.
- When probe, protocol, or targeted evidence already exists, treat it as frozen input and inspect it directly.

Execute only the missing Builder closures: first-round open probe, one merged video-specific capture protocol, targeted capture, real OCR/UI inspection when required, structured three-lens reconstruction, coverage/meta-gate self-audit, and schema validation. New protocol output must use capture-protocol-2.0; new reconstruction output must use video-reconstruction-2.0. Preserve the transcript provenance recorded in media-preparation.json. Machine transcription remains a lower-confidence proposal and must be checked against audible speech and visible captions when consequential.
Every evidence item with refType "source" must use the exact ID of a matching top-level derivedSources entry, never a file path or JSON pointer. If media-preparation.json supports a technical fact, register it in derivedSources first and cite that registered ID.

Three-lens Builder contract:
- Round one leaves explicit unanswered questions for content restoration, directing logic, and visual editing.
- Round two merges capture requests for the same time range/carrier. Every capture-protocol-2.0 action declares consumers and presentationIntent. Never perform three independent full-video sweeps.
- reconstruction.builderLenses.contentRestoration is a multimodal reading path. Put key frames, detail crops, before/after states, and operation sequences beside the knowledge they establish; a separate frame gallery is not a substitute.
- Perform a reader-retelling check: when the report says the author lists N capabilities, steps, configurations, or a choice framework, restore the actual supported items, meanings, conditions, and key examples in contentRestoration. Merely saying that a list or framework was presented is not knowledge restoration. Check core knowledge units and cues for specifics stranded only in the audit layer. Mark individual unreadable items unknown; do not fill them from general knowledge. The directing lens's claimed viewer-after understanding must have corresponding content in the restoration. Make visual focus and limits specific to each frame instead of repeating generic caveats.
- reconstruction.builderLenses.directingLogic must explain distinct hook/problem/promise/progression/proof/payoff/ending functions and viewer cognitive changes. Do not repeat one generic description across stages.
- reconstruction.builderLenses.visualEditing must explain carrier roles, technical/semantic changes, subtitle/UI/voice division, pacing, result timing, continuity gaps, transitions, and only model-readable audio semantics.
- All lens evidenceRefs and frame refs must resolve to this revision's frozen cues/shots/frames/TARGET/OCR/registered sources.

Isolation and evidence rules:
- Do not read any previous report, creator analysis, audit, evaluation, or sibling video directory.
- Do not browse the web or verify the creator's product claims externally.
- Keep raw fact, visual observation, author claim, system inference, and unknown separate.
- Preserve every subtitle cue, representative frame, and all overlapping shots.
- Derive script paths from the frozen output root or use paths relative to it; do not repeatedly retype the absolute run ID.
- For one unchanged targeted-evidence manifest, execute OCR at most once. A complete OCR artifact is terminal for that revision, including when its frames record failures; never rerun successful OCR.
- targeted_frame references use TARGET-* frame IDs; ocr references use the recognized line's OCR-* ID, never a TARGET frame ID. Every frame/OCR evidence time must fall inside its knowledge unit's time range (±0.5s).
- Targeted capture produces targeted-evidence/contact-sheet.jpg. Inspect that overview first, then open at most 4 originals per unresolved question and normally no more than 12 originals total; never load dozens of full-resolution frames at once.
- When every OCR frame failed there is no valid OCR line ID: never invent an OCR-* placeholder. OCR failure does not mean visible text is unreadable. Personally inspect the relevant targeted frames; restore text you can actually read as a visual observation citing that frame, and mark only unreadable text unknown. Preserve the frozen ASR transcript unchanged, but use clearly readable frame text to identify names in Builder lenses, explicitly noting any ASR discrepancy and without claiming external verification.
- Never use afplay, a GUI player, or system speakers as proof that the model heard audio. Inspect only model-readable audio evidence and non-speech transcript labels; when only technical audio presence is available, preserve music/sound semantics as unknown.
- For every carrier, write inspectionStatus and inspectionRationale while retaining compatible available/inspected booleans. Technical audio presence without model-readable semantics is available:true, inspected:true, inspectionStatus:"checked_unreadable"; it must remain an explicit unknown and must not support semantic audio claims.
- informationCarriers[].discoveredIn contains only carrierSweep IDs. Put media/evidence file provenance in inspectionRationale or evidenceHints. An absent carrier is available:false and may be inspected:true when frozen host evidence was checked to establish absence.
- Write metaGate.questionId as "uncovered_information_audit". The display question may be localized and is not an identity key.
- Signed URLs, cookies, login data, and private browser state must never enter any output.
- Write all human-readable artifact values in concise, natural Chinese. Keep schema keys, IDs, enum values, file paths, and evidence refs unchanged in English.

Write candidate outputs only under ${outputDir}: evidence/, probe.json, capture-protocol.json, targeted-evidence/, and reconstruction.json. Do not generate article.md or verbose run-notes.md on the synchronous fast path. Do NOT create evaluation.json or gate-report.json; an independent process owns those. Before finishing, run the canonical schema validator for probe/protocol/reconstruction and OCR when applicable. If evidence cannot establish something, preserve it as unknown rather than inventing it.
`;
}

export function evaluatorPrompt(
  videoPath: string,
  candidateDirectory: string,
  candidateRevisionFingerprint: string,
  candidateFingerprints: Record<string, string>,
  evaluationOutputDirectory = candidateDirectory
): string {
  return `
You are the optional Evaluator in a fresh process, independent from the Builder. Read ${skillDir}/references/evaluator-operator.md and ${skillDir}/schemas/evaluation.schema.json completely. Those files plus the runtime lens contract below are the complete runtime instruction: do not read SKILL.md, references/evaluation.md, prior evaluation files, or repository-wide alternatives. Do not modify candidate files.
Read ${path.join(projectRoot, "packages/research/src/video-analysis/runtime-three-lens-contracts.ts")} completely as the authoritative CR/DL/VE rule contract; do not search the repository for alternate rule definitions.

Source video: ${videoPath}
Candidate root: ${candidateDirectory}
Frozen candidate revision: ${candidateRevisionFingerprint}
Frozen candidate artifact fingerprints: ${JSON.stringify(candidateFingerprints)}
Host-built source overview: ${path.join(candidateDirectory, "evaluator-evidence", "source-overview.jpg")}
Host-built source overview manifest: ${path.join(candidateDirectory, "evaluator-evidence", "manifest.json")}

Independently inspect the host-built source overview, its manifest, media-preparation.json, evidence/evidence-pack.json, targeted-evidence manifests and frames, OCR when present, probe.json, capture-protocol.json, reconstruction.json, and article.md only when it exists. You did not see the Builder's hidden context and must not read any prior report/audit/evaluation outside this directory. Do not create or read a global /tmp overview. The exact namespaced Host-built overview above is the only source-wide overview for this evaluation. Before reporting source/evidence mismatch, compare its manifest SHA-256 with media-preparation.json and inspect two named source frames under evaluator-evidence/frames; a visual impression from another image is not enough.

Evaluate GATE first: critical-question recall, core evidence coverage, unsupported positive inference, timestamp accuracy, applicable process dependencies, correct unknown discipline, unchecked channels, and the exact meta-gate. Only if every hard gate passes, run JUDGE for readability, knowledge prioritization, evidence usefulness, execution value, and compression without loss.

Carrier and OCR rules:
- Accept checked_unreadable as a closed carrier only when its rationale names the completed check and the candidate preserves the unavailable semantics as unknown without making claims from it. Do not convert checked_unreadable back to unchecked merely because semantic extraction was unavailable.
- Inspecting evidence-pack audio metadata, establishing that no model-readable semantic audio evidence exists, and preserving music/sound meaning as unknown is a completed availability/readability check. Do not require fake listening, source separation, or semantic classification when the Host supplied no model-readable audio evidence.
- Distinguish frozen ASR preservation from content restoration: readable names or text in a cited frame may be restored in Builder lenses even when ASR differs or OCR failed. Check the frame yourself; do not reward avoidable unknowns or require correcting the frozen transcript. Unreadable text remains unknown, and visible author wording is not external fact verification.
- OCR frame statuses processed and failed both prove one recognition execution for that immutable frame revision. Failed OCR supplies no text evidence; independently inspect consequential visibly legible text and fail genuine omissions.

Evidence-view budget:
- The Host already built one namespaced source-wide overview. Never build another. Inspect overviews/contact sheets at high detail, never original detail.
- Open original frames only for consequential exact text or visual state that remains unresolved after the overview. Normally inspect no more than 8 originals total.
- The lower bound is complete critical-question plus scene/carrier coverage. Exceed 8 originals only when that coverage remains unresolved, and record the reason in evaluator notes; never reduce evidence merely to satisfy the budget.
- Keep evidence reads bounded: do not enumerate the repository, dump the full transcript, dump all of reconstruction.json, or reread the full deterministic article. Use selected JSON fields and only read article.md when testing a suspected rendering divergence. Aim to finish in 5–8 evidence calls.

Write ${evaluationOutputDirectory}/evaluation.json against the canonical schema and ${evaluationOutputDirectory}/evaluation.md. Also perform one concise three-lens review in this same process and write these three JSON arrays:
- ${evaluationOutputDirectory}/runtime-three-lens/content-restoration.json with CR-01 through CR-06
- ${evaluationOutputDirectory}/runtime-three-lens/directing-logic.json with DL-01 through DL-06
- ${evaluationOutputDirectory}/runtime-three-lens/visual-editing.json with VE-01 through VE-07

This single Evaluator process owns all three lenses; do not claim three independent processes. Each three-lens item must contain ruleId, status (pass|fail|not_checked), a specific finding, evidenceRefs, and evaluatorNotes, following the runtime contracts in ${path.join(projectRoot, "packages/research/src/video-analysis/runtime-three-lens-contracts.ts")}. Keep the review short and evidence-bound. Do not write gate-report.json and do not repair the candidate. Record concrete discrepancies as quality warnings instead of triggering another evaluator or repair pass.
Write evaluation.md and every human-readable JSON finding, note, and message in concise, natural Chinese. Keep schema keys, IDs, enum values, paths, and evidence refs unchanged in English.
`;
}

export function builderIntegrityRepairPrompt(videoPath: string, outputDir: string, failure: string): string {
  return `
You are the Builder contract-repair role. Read ${skillDir}/references/builder-operator.md and
${skillDir}/references/single-post-depth.md completely. These selected operator files are the complete runtime instructions:
do NOT read SKILL.md, evaluation.md, or evaluator-operator.md. Read ${skillDir}/schemas/reconstruction.schema.json and,
when repairing capture protocol fields, ${skillDir}/schemas/capture-protocol.schema.json.

Source video: ${videoPath}
Candidate root: ${outputDir}
Deterministic integrity failure: ${failure}
For DEPTH failures read ${skillDir}/references/single-post-depth.md and frozen post-source-input.json. Never modify post-source-input.json or its cover. If legacy evidence cannot support depth, keep the candidate failed; do not fabricate missing observations.

The evidence collection is frozen. Do not modify media-preparation.json, evidence/, capture-protocol.json,
targeted-evidence/, article.md, or any evaluator artifact. Inspect the existing evidence and repair every violation listed in
the failure, not only the first one. Normally modify only reconstruction.json. For CARRIER_STATUS, probe.json is also a
Builder-owned artifact and may be corrected together with the matching reconstruction coverage channel; do not change carrier
semantics merely to pass validation. Correct the stated integrity violation without deleting supported knowledge. Preserve
unknowns, all transcript cues, evidence identity, and source boundaries. For carrier-state failures, make availability,
inspection status, and rationale mutually consistent with evidence already present in both probe and reconstruction. For
evidence-time failures, bind each listed reference to the correct knowledge unit or correct that unit's truthful time range;
never fabricate timestamps. A timeRange is one semantically continuous interval: never stretch it across disjoint opening and
closing evidence merely to make every reference fit. Split the unit or move each reference to the unit that owns its actual
interval. For META_GATE, overlookedMeaningChanges and overlookedRelationships contain only items the protocol
genuinely failed to inspect. A relationship that was inspected but cannot be established from available evidence is an explicit
unknown or boundary, not an overlooked relationship; preserve that limitation in the appropriate knowledge unit or coverage
unknowns and remove it from the overlooked arrays. Run the canonical schema validator once before finishing. Do not create
article.md or any evaluation artifact. Repair the existing reconstruction.json only, plus the matching probe.json carrier fields
when CARRIER_STATUS requires them.
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
  "post-source-input.json",
  "media-preparation.json",
  "evidence/evidence-pack.json",
  "probe.json",
  "capture-protocol.json",
  "targeted-evidence/targeted-evidence.json",
  "targeted-evidence/ocr-evidence.json",
  "reconstruction.json",
  "article.md"
] as const;

async function renderBuilderReport(outputDir: string, title: string): Promise<void> {
  const receiptPath = path.join(outputDir, "builder-report-render.json");
  const reportPath = path.join(outputDir, "article.md");
  try {
    await runFile(process.execPath, [
      path.join(skillDir, "scripts/render-reconstruction-report.mjs"),
      "--reconstruction", path.join(outputDir, "reconstruction.json"),
      "--targeted", path.join(outputDir, "targeted-evidence/targeted-evidence.json"),
      "--title", title,
      "--out", reportPath
    ], { cwd: outputDir, timeout: 60_000 });
    fs.writeFileSync(receiptPath, `${JSON.stringify({
      schemaVersion: "builder-report-render@1",
      state: "ready",
      generatedAt: new Date().toISOString(),
      reportSha256: sha256(reportPath)
    }, null, 2)}\n`, "utf8");
  } catch (error) {
    fs.writeFileSync(receiptPath, `${JSON.stringify({
      schemaVersion: "builder-report-render@1",
      state: "failed",
      generatedAt: new Date().toISOString(),
      reason: error instanceof Error ? error.message : "unknown"
    }, null, 2)}\n`, "utf8");
  }
}

async function prepareEvaluatorOverview(videoPath: string, outputDir: string): Promise<string> {
  const evidenceDir = path.join(outputDir, "evaluator-evidence");
  const overviewPath = path.join(evidenceDir, "source-overview.jpg");
  const manifestPath = path.join(evidenceDir, "manifest.json");
  const sourceFingerprint = sha256(videoPath);
  const existingManifest = readJsonIfPresent(manifestPath) as { sourceVideoSha256?: string } | null;
  if (!exists(overviewPath) || existingManifest?.sourceVideoSha256 !== sourceFingerprint) {
    await runFile(process.execPath, [
      path.join(skillDir, "scripts/build-evaluator-overview.mjs"),
      "--video", videoPath,
      "--out", overviewPath
    ], { cwd: outputDir, timeout: 10 * 60_000 });
  }
  const manifest = readJsonIfPresent(manifestPath) as { sourceVideoSha256?: string } | null;
  if (manifest?.sourceVideoSha256 !== sourceFingerprint) throw new Error("EVALUATOR_SOURCE_OVERVIEW_MISMATCH");
  return overviewPath;
}

export function candidateArtifactFingerprints(outputDir: string): Record<string, string> {
  return Object.fromEntries(frozenCandidateFiles.flatMap((relative) => {
    const absolute = path.join(outputDir, relative);
    return exists(absolute) ? [[relative, sha256(absolute)]] : [];
  }));
}

export function evaluatorContractRevision(): string {
  const hash = crypto.createHash("sha256").update(evaluatorPromptVersion);
  for (const snapshot of evaluatorContractSnapshots()) hash.update(snapshot.sha256);
  return hash.digest("hex");
}

/** Exact evaluator method files loaded into a private per-attempt trace. */
export function evaluatorContractSnapshots(): Array<{ path: string; sha256: string }> {
  const files = [
    path.join(skillDir, "references/evaluator-operator.md"),
    path.join(skillDir, "schemas/evaluation.schema.json"),
    path.join(skillDir, "scripts/build-evaluator-overview.mjs"),
    path.join(projectRoot, "packages/research/src/video-analysis/runtime-three-lens-contracts.ts")
  ];
  return files.map((file) => ({ path: file, sha256: sha256(file) }));
}

export function builderIntegrityContractRevision(): string {
  const contractFiles = [
    path.join(skillDir, "references/builder-operator.md"),
    path.join(skillDir, "references/single-post-depth.md"),
    path.join(skillDir, "schemas/capture-protocol.schema.json"),
    path.join(skillDir, "schemas/reconstruction.schema.json")
  ];
  const hash = crypto.createHash("sha256").update(builderIntegrityContractVersion);
  for (const file of contractFiles) hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

export function assertCandidateArtifactsUnchanged(before: Record<string, string>, outputDir: string): void {
  const after = candidateArtifactFingerprints(outputDir);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("EVALUATOR_MUTATED_CANDIDATE");
}

async function validateBuilder(outputDir: string, videoPath: string, hostAssembly: HostAssemblyReport): Promise<void> {
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
    ...(exists(path.join(outputDir, "post-source-input.json")) ? ["post-source-input.json"] : []),
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
    hostAssembly,
    integrityValidation,
    artifactFingerprints
  }, null, 2)}\n`, "utf8");
}

export async function evaluateRuntimeThreeLens(
  candidateDirectory: string,
  evaluationDirectory: string,
  postExternalId: string,
  reconstructionArtifactRef: string,
  evaluationArtifactRef: string,
  evaluatorRunId: string
): Promise<RuntimeThreeLensGateReport> {
  const reconstructionPath = path.join(candidateDirectory, "reconstruction.json");
  const fingerprint = sha256(reconstructionPath);
  const evaluationPath = path.join(evaluationDirectory, "runtime-three-lens-evaluation.json");
  const gatePath = path.join(evaluationDirectory, "runtime-three-lens-gate-report.json");

  if (exists(evaluationPath) && exists(gatePath)) {
    try {
      const previousEvaluation = JSON.parse(fs.readFileSync(evaluationPath, "utf8")) as unknown;
      const boundToCurrentEvaluator = runtimeThreeLensBoundToEvaluator(previousEvaluation, evaluatorRunId);
      const inspection = inspectRuntimeThreeLensArtifacts(
        previousEvaluation,
        JSON.parse(fs.readFileSync(gatePath, "utf8")),
        fingerprint
      );
      if (boundToCurrentEvaluator && inspection.gateReport && (
        inspection.state === "ready" ||
        ("reason" in inspection && ["runtime_three_lens_unchecked", "runtime_three_lens_failed"].includes(inspection.reason))
      )) {
        return inspection.gateReport;
      }
    } catch {
      // Invalid or stale runtime artifacts are replaced by fresh independent evaluations.
    }
  }

  const lensDir = path.join(evaluationDirectory, "runtime-three-lens");
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

export class CodexVideoReconstructionExecutor implements VideoReconstructionExecutor {
  constructor(private readonly execution: VideoCodexExecutionOptions = {}) {}
  async reconstruct(
    rawRequest: unknown,
    observeLifecycle?: VideoReconstructionLifecycleObserver
  ): Promise<VideoReconstructionOutcome> {
    const request = videoReconstructionRequestSchema.parse(rawRequest);
    const evaluationPolicy = this.execution.evaluationPolicy
      ?? (process.env.SELF_MEDIA_VIDEO_EVALUATION_POLICY === "single_pass" ? "single_pass" : request.evaluationPolicy);
    let videoPath: string;
    try { videoPath = artifactPath(request.sourceMediaArtifactRef); }
    catch (error) {
      return videoReconstructionOutcomeSchema.parse({ state: "blocked", code: "media_missing",
        message: error instanceof Error ? error.message : "源媒体引用无效", userActionRequired: false });
    }
    if (!exists(videoPath)) return { state: "blocked", code: "media_missing", message: "本地源视频不存在。", userActionRequired: false };

    const relativeRoot = safeOutputRelativeRoot(this.execution.outputRelativeRoot ?? `video-reconstructions/${request.postExternalId}`);
    const outputDir = path.join(runArtifactDir(request.creatorRunId), relativeRoot);
    fs.mkdirSync(outputDir, { recursive: true });
    let builderAccepted = false;
    try {
      const existingCandidate = readJsonIfPresent(path.join(outputDir, "reconstruction.json")) as { depthContractVersion?: string } | null;
      if (existingCandidate && existingCandidate.depthContractVersion !== "single-post-depth@1") {
        throw new Error("BUILDER_INTEGRITY_DEPTH_LEGACY_REBUILD_REQUIRED");
      }
      const sourceInput = freezePostSourceInput(request, outputDir);
      const sourceInputHash = sha256(path.join(outputDir, "post-source-input.json"));
      if (this.execution.preservePreparedCandidate) preservePreparedCandidateInputs(outputDir, videoPath);
      else await prepareBuilderInputs({ videoPath, outputDir, skillDir });
      // A copied candidate may need its manifest's local path projection updated,
      // but none of the frozen candidate contents may change after that point.
      const preservedCandidateFingerprints = this.execution.preservePreparedCandidate
        ? candidateArtifactFingerprints(outputDir) : null;
      const requiredCandidate = [
        "evidence/evidence-pack.json", "probe.json", "capture-protocol.json",
        "targeted-evidence/targeted-evidence.json", "reconstruction.json"
      ];
      let missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      if (missing.length > 0) {
        if (this.execution.reviewerOnly || this.execution.preservePreparedCandidate) throw new Error("REVIEWER_CANDIDATE_INCOMPLETE");
        await runCodex(
          candidatePrompt(videoPath, outputDir, missing, path.join(outputDir, "media-preparation.json")), outputDir, "candidate",
          request.sourceMediaArtifactRef, observeLifecycle, this.execution
        );
        missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      }
      if (missing.length > 0) return { state: "not_ready", reconstructionArtifactRef: null, evaluationArtifactRef: null,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["candidate_output_contract"], message: `候选重建缺少：${missing.join("、")}` };
      if (this.execution.reviewerOnly && (!this.execution.expectedCandidateSha256
        || sha256(path.join(outputDir, "reconstruction.json")) !== this.execution.expectedCandidateSha256)) {
        throw new Error("REVIEWER_CANDIDATE_FINGERPRINT_MISMATCH");
      }
      if (this.execution.repairFindings !== undefined) {
        if (this.execution.reviewerOnly) throw new Error("REVIEWER_CANNOT_REPAIR_CANDIDATE");
        const repairPrompt = `${candidatePrompt(videoPath, outputDir, [], path.join(outputDir, "media-preparation.json"))}

Bounded repair scope: read the existing frozen evidence and reconstruction. Repair only the reported Builder findings below; do not rerun media preparation, replace source inputs, or perform independent evaluation.
Findings: ${JSON.stringify(this.execution.repairFindings)}
Revalidate the repaired reconstruction and preserve all unaffected evidence bindings.
When these findings contain a research-review@1 review, also write ${path.join(outputDir, "revision-response.json")} as a JSON array with exactly one Builder-owned disposition for every finding: {"id":"finding id","status":"changed|disputed|missing_evidence","reason":"specific evidence-based reason"}. For this bounded repair, revision-response.json is the sole additional permitted output and this permission overrides the earlier candidate-output-only list. Do not claim changed unless you actually changed the candidate.`;
        await runCodex(repairPrompt, outputDir, "repair-findings", request.sourceMediaArtifactRef, observeLifecycle, this.execution);
      }
      if (sha256(path.join(outputDir, "post-source-input.json")) !== sourceInputHash ||
          (sourceInput.cover && sha256(path.join(outputDir, sourceInput.cover.path)) !== sourceInput.cover.sha256)) {
        throw new Error("BUILDER_INTEGRITY_POST_SOURCE_MUTATED");
      }
      if (!this.execution.preservePreparedCandidate && !this.execution.reviewerOnly) {
        await recoverOcrWithBuilderContinuation({ outputDir, videoPath, skillDir,
          continueBuilder: (prompt, label) => runCodex(prompt, outputDir, label,
            request.sourceMediaArtifactRef, observeLifecycle, this.execution) });
      }
      let hostAssembly = this.execution.preservePreparedCandidate ? preservedHostAssembly() : assembleHostOwnedReconstruction(outputDir);
      if (this.execution.reviewerOnly && sha256(path.join(outputDir, "reconstruction.json")) !== this.execution.expectedCandidateSha256) {
        throw new Error("REVIEWER_CANDIDATE_FINGERPRINT_MISMATCH");
      }
      let integrityRepairAttempts = 0;
      while (true) {
        try {
          await validateBuilder(outputDir, videoPath, hostAssembly);
          break;
        } catch (error) {
          if (this.execution.reviewerOnly || this.execution.preservePreparedCandidate) throw error;
          const failure = error instanceof Error ? error.message : "unknown builder integrity failure";
          if (!failure.startsWith("BUILDER_INTEGRITY_") || integrityRepairAttempts >= 2) throw error;
          integrityRepairAttempts += 1;
          await runCodex(
            builderIntegrityRepairPrompt(videoPath, outputDir, failure), outputDir, "candidate",
            request.sourceMediaArtifactRef, observeLifecycle, this.execution
          );
          hostAssembly = mergeHostAssemblyReports(hostAssembly, assembleHostOwnedReconstruction(outputDir));
        }
      }
      if (preservedCandidateFingerprints) {
        if (JSON.stringify(preservedCandidateFingerprints) !== JSON.stringify(candidateArtifactFingerprints(outputDir))) {
          throw new Error("PRESERVED_CANDIDATE_MUTATED");
        }
      }
      // article.md is part of the candidate revision when supplied. Do not silently
      // regenerate it for imported/reviewer candidates.
      if (!this.execution.preservePreparedCandidate || !exists(path.join(outputDir, "article.md"))) {
        await renderBuilderReport(outputDir, `Builder 内容还原｜${request.postExternalId}`);
      }
      builderAccepted = true;

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
      const currentFingerprints = candidateArtifactFingerprints(outputDir);
      const currentCandidateRevision = sha256(path.join(outputDir, "reconstruction.json"));
      const currentEvaluatorContractRevision = evaluatorContractRevision();
      const priorEvaluatorRun = readJsonIfPresent(path.join(outputDir, "evaluator-run.json")) as {
        candidateRevision?: string;
        candidateFingerprints?: Record<string, string>;
        evaluatorContractRevision?: string;
      } | null;
      const evaluatorMatchesCandidate = priorEvaluatorRun?.candidateRevision === currentCandidateRevision
        && JSON.stringify(priorEvaluatorRun.candidateFingerprints) === JSON.stringify(currentFingerprints)
        && priorEvaluatorRun.evaluatorContractRevision === currentEvaluatorContractRevision;
      const singlePassLensFiles = [
        "runtime-three-lens/content-restoration.json",
        "runtime-three-lens/directing-logic.json",
        "runtime-three-lens/visual-editing.json"
      ];
      if (this.execution.forceEvaluation || !gate || !evaluatorMatchesCandidate ||
          singlePassLensFiles.some((relative) => !exists(path.join(outputDir, relative)))) {
        await prepareEvaluatorOverview(videoPath, outputDir);
        const frozenFingerprints = currentFingerprints;
        const candidateRevision = currentCandidateRevision;
        const evaluatorReceipt = await runCodex(
          evaluatorPrompt(videoPath, outputDir, candidateRevision, frozenFingerprints), outputDir, "evaluator-1",
          candidateRevision, observeLifecycle, this.execution
        );
        assertCandidateArtifactsUnchanged(frozenFingerprints, outputDir);
        if (!exists(evaluationPath)) return { state: "not_ready", reconstructionArtifactRef: refs.reconstructionArtifactRef,
          evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
          threeLensGateReportArtifactRef: null, failedGateIds: ["independent_evaluation_missing"],
          message: "单轮独立评估没有产生 evaluation.json。" };
        gate = await validateEvaluationArtifacts(outputDir, outputDir);
        fs.writeFileSync(path.join(outputDir, "evaluator-run.json"), `${JSON.stringify({
          schemaVersion: "video-evaluator-run@1",
          evaluatorRunId: evaluatorReceipt.childRunId,
          modelRole: evaluatorReceipt.role,
          model: this.execution.executionMode === "sdk" ? sdkModel(evaluatorReceipt.role, this.execution)
            : process.env.SELF_MEDIA_EVALUATOR_MODEL ?? "gpt-5.6-luna",
          reasoningEffort: this.execution.executionMode === "sdk" ? sdkReasoningEffort(evaluatorReceipt.role, this.execution)
            : process.env.SELF_MEDIA_EVALUATOR_REASONING_EFFORT ?? "medium",
          sessionMode: this.execution.executionMode === "sdk" ? "sdk_fresh_thread"
            : process.env.SELF_MEDIA_CODEX_EPHEMERAL === "false" ? "retained" : "ephemeral",
          startedAt: evaluatorReceipt.startedAt,
          completedAt: evaluatorReceipt.completedAt,
          candidateRevision,
          candidateFingerprints: frozenFingerprints,
          evaluatorContractRevision: currentEvaluatorContractRevision
        }, null, 2)}\n`, "utf8");
      }

      const evaluatorRun = readJsonIfPresent(path.join(outputDir, "evaluator-run.json")) as { evaluatorRunId?: string } | null;
      if (!evaluatorRun?.evaluatorRunId) throw new Error("EVALUATOR_RUN_PROVENANCE_MISSING");

      let threeLensGate: RuntimeThreeLensGateReport;
      try {
        threeLensGate = await evaluateRuntimeThreeLens(
          outputDir, outputDir,
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
          state: "evaluated_with_findings",
          reconstructionArtifactRef: refs.reconstructionArtifactRef,
          articleArtifactRef: refs.articleArtifactRef,
          builderValidationArtifactRef: refs.builderValidationArtifactRef,
          evaluationArtifactRef: refs.evaluationArtifactRef,
          gateReportArtifactRef: refs.gateReportArtifactRef,
          threeLensEvaluationArtifactRef: refs.threeLensEvaluationArtifactRef,
          threeLensGateReportArtifactRef: refs.threeLensGateReportArtifactRef,
          threeLensGateCount: 19,
          gateCount: gate.gates?.length ?? 1,
          failedGateIds: [],
          qualityWarningGateIds: hardGateFailures,
          evaluationMode: "single_pass"
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
      const reconstructionArtifactRef = exists(path.join(outputDir, "reconstruction.json"))
        ? artifactRef(request.creatorRunId, `${relativeRoot}/reconstruction.json`) : null;
      const evaluationArtifactRef = exists(path.join(outputDir, "evaluation.json"))
        ? artifactRef(request.creatorRunId, `${relativeRoot}/evaluation.json`) : null;
      const gateReportArtifactRef = exists(path.join(outputDir, "gate-report.json"))
        ? artifactRef(request.creatorRunId, `${relativeRoot}/gate-report.json`) : null;
      const failedGateId = reconstructionFailureGateId(message);
      if (builderAccepted && reconstructionArtifactRef) {
        return videoReconstructionOutcomeSchema.parse({
          state: "built_unevaluated",
          reconstructionArtifactRef,
          articleArtifactRef: exists(path.join(outputDir, "article.md"))
            ? artifactRef(request.creatorRunId, `${relativeRoot}/article.md`)
            : null,
          builderValidationArtifactRef: artifactRef(request.creatorRunId, `${relativeRoot}/builder-validation.json`),
          evaluationMode: "failed",
          qualityWarningGateIds: [failedGateId],
          message: "Builder 结果已保留；本次独立评估未形成可接受结论，可稍后单独重试。"
        });
      }
      if (commandUnavailable(message)) return { state: "blocked", code: "runner_unavailable", message, userActionRequired: true };
      const publicMessage = message.includes("DEPTH_LEGACY_REBUILD_REQUIRED")
        ? "旧版报告已保留。新增深度合同需要在新运行中重建，不能在原冻结目录补写。"
        : /DETERMINISTIC_VALIDATOR_FAILED/.test(message)
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
