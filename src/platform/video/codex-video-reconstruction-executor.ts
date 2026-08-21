import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { runArtifactDir } from "../../core/config.js";
import { runFile, runFileInput } from "../../core/process.js";
import {
  videoReconstructionOutcomeSchema,
  videoReconstructionRequestSchema,
  type VideoReconstructionExecutor,
  type VideoReconstructionOutcome
} from "../../modules/video-analysis/contracts.js";
import {
  contentRestorationRuleResultsSchema,
  deriveRuntimeThreeLensGateReport,
  directingLogicRuleResultsSchema,
  inspectRuntimeThreeLensArtifacts,
  runtimeThreeLensEvaluationSchema,
  visualEditingRuleResultsSchema,
  type RuntimeThreeLensEvaluation,
  type RuntimeThreeLensGateReport
} from "../../modules/video-analysis/runtime-three-lens-contracts.js";
import { withSystemProxy } from "../network/system-proxy.js";

const skillDir = process.env.SELF_MEDIA_VIDEO_RECONSTRUCTION_SKILL_DIR ??
  path.join(os.homedir(), ".codex", "skills", "video-content-reconstruction");
const mediaSkillDir = process.env.SELF_MEDIA_MEDIA_SKILL_DIR ??
  path.join(os.homedir(), ".agents", "skills", "media-use");

type GateReport = { ready?: boolean; gates?: Array<{ id?: string; pass?: boolean }>; failedGateIds?: string[] };

type RuntimeLensName = "content_restoration" | "directing_logic" | "visual_editing";

function exists(file: string): boolean { return fs.existsSync(file) && fs.statSync(file).isFile(); }

function commandUnavailable(message: string): boolean {
  return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|command not found|authentication|login required|unauthorized/i.test(message);
}

async function runCodex(prompt: string, cwd: string, label: string): Promise<void> {
  const binary = process.env.SELF_MEDIA_CODEX_BIN ?? "codex";
  const lastMessage = path.join(cwd, `${label}-last-message.txt`);
  const environment = await withSystemProxy({ ...process.env, SELF_MEDIA_CHILD_ROLE: label, SELF_MEDIA_CHILD_OUTPUT: cwd });
  try { await runFileInput(binary, [
    "exec", "-", "--skip-git-repo-check", "--ephemeral", "--color", "never",
    "--approve-for-me", "-C", cwd, "-o", lastMessage
  ], prompt, { cwd, timeout: 3 * 60 * 60_000, env: environment }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (commandUnavailable(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
    throw new Error(`CODEX_RUNNER_FAILED:${label}`);
  }
}

function candidatePrompt(videoPath: string, outputDir: string): string {
  return `
You are the isolated reconstruction runner for one video. Read the complete canonical Skill at ${skillDir}/SKILL.md and every directly required reference/schema before acting.

Input media: ${videoPath}
Writable output root: ${outputDir}

Execute the Skill's evidence-pack, first-round open probe, video-specific capture protocol, targeted capture, real OCR/UI inspection when required, structured reconstruction, coverage/meta-gate self-audit, schema validation, and a human-readable article generated from reconstruction. If the source has speech and no subtitle file is supplied, use the transcription capability documented at ${mediaSkillDir}/SKILL.md and mark it as machine transcription.

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

Write ${outputDir}/evaluation.json against the canonical schema and ${outputDir}/evaluation.md. Do not write gate-report.json and do not repair the candidate. Record concrete discrepancies instead of giving benefit of doubt.
`;
}

function repairPrompt(videoPath: string, outputDir: string, historyDir: string, attempt: number): string {
  return `
You are the candidate repair runner for attempt ${attempt}. Read the complete canonical Skill at ${skillDir}/SKILL.md and its directly required references/schemas.

Source video: ${videoPath}
Candidate root: ${outputDir}
Independent failed evaluation and gate from the previous attempt: ${historyDir}/evaluation.json and ${historyDir}/gate-report.json

Repair only the failed evidence closures. Independently inspect the source frames/timeline named by the evaluator; do not blindly copy evaluator prose. You may add video-specific capture actions, resample/crop frames, run real OCR/UI reading, correct time ranges and fact/unknown classifications, and update probe.json, capture-protocol.json, targeted-evidence manifests, reconstruction.json, article.md, and run-notes.md. Preserve valid prior work and all raw cue text. Do not read old reports, sibling videos, or any audit outside this candidate root. Do not create a new evaluation.json or gate-report.json; a fresh independent evaluator will do that.

Before finishing, run canonical schema validation for the repaired candidate and explicitly check every failed gate from the archived report.
`;
}

function archiveEvaluation(outputDir: string, attempt: number): string {
  const historyDir = path.join(outputDir, "evaluation-history", `attempt-${attempt}`);
  fs.mkdirSync(historyDir, { recursive: true });
  for (const filename of ["evaluation.json", "evaluation.md", "evaluator-last-message.txt", "gate-report.json"]) {
    const source = path.join(outputDir, filename);
    if (exists(source)) fs.renameSync(source, path.join(historyDir, filename));
  }
  return historyDir;
}

function failedIds(gate: GateReport): string[] {
  return Array.isArray(gate.failedGateIds)
    ? gate.failedGateIds
    : (gate.gates ?? []).filter((item) => item.pass === false).map((item) => item.id).filter((id): id is string => Boolean(id));
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function threeLensEvaluatorPrompt(
  videoPath: string,
  outputDir: string,
  lens: RuntimeLensName,
  fingerprint: string,
  evaluatorRunId: string
): string {
  const lensContract = lens === "content_restoration"
    ? `CR-01 thesis + viewer change are substantive and evidenced; CR-02 >=3 knowledge units and all core units have time/evidence; CR-03 complete ordered transcript or explicit carrier substitute; CR-04 standalone article preserves every core unit; CR-05 process/argument dependencies resolve; CR-06 conflicts and unknowns remain explicit.`
    : lens === "directing_logic"
      ? `DL-01 distinct evidenced viewer-before/after; DL-02 >=2 time-ranged stages with directing function and cognitive change; DL-03 every promise resolves/defers/remains explicitly unresolved; DL-04 visible proof vs author claim vs inference; DL-05 concrete comprehension cost; DL-06 stages coherently cover every consequential meaning change.`
      : `VE-01 concrete orientation/composition; VE-02 >=3 sparse and >=5 dense timecoded frames; VE-03 consequential visual claims resolve to evidence and name their role; VE-04 core cues map to all overlapping shots or explicit absence; VE-05 editing metrics disclose duration/denominator; VE-06 applicable UI procedure has before/during/after and montage is not causality; VE-07 non-speech audio is analyzed or explicitly unchecked.`;
  const filename = lens.replaceAll("_", "-");
  return `
You are an independent runtime evaluator for the ${lens} lens only. You are not the candidate runner and must not repair candidate files.

Source video: ${videoPath}
Candidate root: ${outputDir}
Candidate revision fingerprint: ${fingerprint}
Evaluator run id: ${evaluatorRunId}

Inspect the source media and candidate evidence directly. Apply these gates without averaging or borrowing success from another lens:
${lensContract}

Write only a JSON array to ${outputDir}/runtime-three-lens/${filename}.json. It must contain exactly the required rule IDs for this lens, once each. Every item has:
{"ruleId":"CR-01|DL-01|VE-01","status":"pass|fail|not_checked","finding":"specific finding","evidenceRefs":[{"kind":"subtitle_cue|shot|frame|ocr|ui_state|operation|parameter|input_output|claim|case|counterexample|limitation|unknown|artifact","refId":"stable id","artifactRef":"artifact path","jsonPointer":"/optional/pointer","startMs":0,"endMs":1}],"evaluatorNotes":"why this status follows"}

A passing rule must cite resolvable evidence. Use not_checked when a carrier was not inspected; use fail when inspected evidence violates the contract. Never infer readiness from the generic evaluation.json or gate-report.json, and do not read static legacy three-lens fixtures or prior creator reports.
`;
}

async function evaluateRuntimeThreeLens(
  videoPath: string,
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
    await runCodex(
      threeLensEvaluatorPrompt(videoPath, outputDir, definition.lens, fingerprint, evaluatorRunId),
      outputDir,
      `runtime-${definition.lens}`
    );
    const rulesPath = path.join(lensDir, definition.file);
    if (!exists(rulesPath)) throw new Error(`RUNTIME_THREE_LENS_MISSING:${definition.lens}`);
    const rules = definition.schema.parse(JSON.parse(fs.readFileSync(rulesPath, "utf8")));
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
  async reconstruct(rawRequest: unknown): Promise<VideoReconstructionOutcome> {
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
        await runCodex(candidatePrompt(videoPath, outputDir), outputDir, "candidate");
        missing = requiredCandidate.filter((item) => !exists(path.join(outputDir, item)));
      }
      if (missing.length > 0) return { state: "not_ready", reconstructionArtifactRef: null, evaluationArtifactRef: null,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["candidate_output_contract"], message: `候选重建缺少：${missing.join("、")}` };

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
      for (let repairAttempt = 0; repairAttempt <= 2; repairAttempt += 1) {
        if (!gate) {
          await runCodex(evaluatorPrompt(videoPath, outputDir), outputDir, `evaluator-${repairAttempt + 1}`);
          if (!exists(evaluationPath)) return { state: "not_ready", reconstructionArtifactRef: refs.reconstructionArtifactRef,
            evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
            threeLensGateReportArtifactRef: null, failedGateIds: ["independent_evaluation_missing"],
            message: "独立评估没有产生 evaluation.json。" };
          gate = await validate(outputDir);
        }
        const failures = failedIds(gate);
        if (gate.ready === true && failures.length === 0) {
          let threeLensGate: RuntimeThreeLensGateReport;
          try {
            threeLensGate = await evaluateRuntimeThreeLens(
              videoPath,
              outputDir,
              request.postExternalId,
              refs.reconstructionArtifactRef,
              refs.threeLensEvaluationArtifactRef
            );
          } catch (error) {
            const runtimeEvaluationExists = exists(path.join(outputDir, "runtime-three-lens-evaluation.json"));
            const runtimeGateExists = exists(path.join(outputDir, "runtime-three-lens-gate-report.json"));
            return videoReconstructionOutcomeSchema.parse({
              state: "not_ready",
              reconstructionArtifactRef: refs.reconstructionArtifactRef,
              evaluationArtifactRef: refs.evaluationArtifactRef,
              gateReportArtifactRef: refs.gateReportArtifactRef,
              threeLensEvaluationArtifactRef: runtimeEvaluationExists ? refs.threeLensEvaluationArtifactRef : null,
              threeLensGateReportArtifactRef: runtimeGateExists ? refs.threeLensGateReportArtifactRef : null,
              failedGateIds: [runtimeEvaluationExists ? "runtime_three_lens_artifact_invalid" : "runtime_three_lens_artifact_missing"],
              message: `通用重建门已通过，但运行时三镜头独立评测未形成有效产物：${error instanceof Error ? error.message : "unknown"}`
            });
          }
          if (threeLensGate.ready) return videoReconstructionOutcomeSchema.parse({
            state: "ready", ...refs, gateCount: gate.gates?.length ?? 1, threeLensGateCount: 19, failedGateIds: []
          });
          return videoReconstructionOutcomeSchema.parse({
            state: "not_ready",
            reconstructionArtifactRef: refs.reconstructionArtifactRef,
            evaluationArtifactRef: refs.evaluationArtifactRef,
            gateReportArtifactRef: refs.gateReportArtifactRef,
            threeLensEvaluationArtifactRef: refs.threeLensEvaluationArtifactRef,
            threeLensGateReportArtifactRef: refs.threeLensGateReportArtifactRef,
            failedGateIds: threeLensGate.failedGateIds.length > 0
              ? threeLensGate.failedGateIds
              : threeLensGate.uncheckedGateIds,
            message: threeLensGate.status === "partial"
              ? "运行时三镜头评测存在未检查通道；该视频保持 partial，不进入博主机制归纳。"
              : "运行时三镜头硬闸未通过；该视频不进入博主机制归纳。"
          });
        }
        if (repairAttempt === 2) return videoReconstructionOutcomeSchema.parse({ state: "not_ready",
          reconstructionArtifactRef: refs.reconstructionArtifactRef, evaluationArtifactRef: refs.evaluationArtifactRef,
          gateReportArtifactRef: refs.gateReportArtifactRef, threeLensEvaluationArtifactRef: null,
          threeLensGateReportArtifactRef: null,
          failedGateIds: failures.length > 0 ? failures : ["meta_gate"],
          message: "两轮定向修复后仍有硬闸未通过；该视频不进入博主机制归纳。" });
        const historyDir = archiveEvaluation(outputDir, repairAttempt + 1);
        await runCodex(repairPrompt(videoPath, outputDir, historyDir, repairAttempt + 1), outputDir, `repair-${repairAttempt + 1}`);
        gate = null;
      }
      throw new Error("RECONSTRUCTION_LOOP_INVALID");
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
