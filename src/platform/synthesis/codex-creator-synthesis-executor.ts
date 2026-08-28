import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFileInput } from "../../core/process.js";
import type { CreatorArtifactStore } from "../../modules/creator-research/artifact-store.js";
import { LocalCreatorArtifactStore } from "../artifacts/local-creator-artifact-store.js";
import {
  creatorSynthesisIndependentEvaluationSchema,
  creatorSynthesisLifecycleEventSchema,
  creatorSynthesisSchema,
  type CreatorSynthesisChildRole,
  type CreatorSynthesisExecutor,
  type CreatorSynthesisLifecycleObserver,
  type CreatorSynthesisRequest
} from "../../../packages/research/index.js";
import { combineCreatorSynthesisGates, validateCreatorSynthesis } from "../../../packages/research/index.js";
import { withSystemProxy } from "../network/system-proxy.js";

const creatorSkill = process.env.SELF_MEDIA_CREATOR_ANALYSIS_SKILL ??
  path.join(os.homedir(), ".codex", "skills", "analyze-creator-videos", "SKILL.md");

function fileSha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function synthesisOutputRevisions(outputDir: string, lastMessagePath: string): Record<string, string> {
  return Object.fromEntries([
    "creator-analysis.json", "creator-synthesis-evaluation.json", path.basename(lastMessagePath)
  ].flatMap((relative) => {
    const absolute = path.join(outputDir, relative);
    return fs.existsSync(absolute) ? [[relative, fileSha256(absolute)]] : [];
  }));
}

async function runSynthesisChild(input: {
  prompt: string;
  outputDir: string;
  label: string;
  role: CreatorSynthesisChildRole;
  inputRevision: string;
  observer?: CreatorSynthesisLifecycleObserver;
}): Promise<void> {
  const lastMessagePath = path.join(input.outputDir, `${input.label}-last-message.txt`);
  const childRunId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  let lastProgressAt = startedAt;
  let lastProgressEmittedAt = 0;
  let staleEmitted = false;
  const staleAfterMs = input.role === "creator_synthesis" ? 15 * 60_000 : 8 * 60_000;
  const timeoutMs = input.role === "creator_synthesis" ? 90 * 60_000 : 30 * 60_000;
  const observe = (status: "started" | "progress" | "stale" | "completed" | "failed", errorCode: string | null = null) => {
    if (!input.observer) return;
    try {
      input.observer(creatorSynthesisLifecycleEventSchema.parse({
        childRunId,
        role: input.role,
        status,
        startedAt,
        lastProgressAt,
        inputRevision: input.inputRevision,
        outputArtifactRevisions: synthesisOutputRevisions(input.outputDir, lastMessagePath),
        errorCode
      }));
    } catch {
      // Lifecycle reporting cannot be allowed to corrupt the synthesis worker.
    }
  };
  observe("started");
  const staleTimer = setInterval(() => {
    if (staleEmitted || Date.now() - Date.parse(lastProgressAt) < staleAfterMs) return;
    staleEmitted = true;
    observe("stale");
  }, Math.min(60_000, staleAfterMs));
  try {
    const environment = await withSystemProxy();
    await runFileInput(process.env.SELF_MEDIA_CODEX_BIN ?? "codex", [
      "exec", "-", "--skip-git-repo-check", "--ephemeral", "--color", "never",
      "--approve-for-me", "-C", input.outputDir, "-o", lastMessagePath
    ], input.prompt, {
      cwd: input.outputDir,
      timeout: timeoutMs,
      env: environment,
      onOutput: () => {
        const at = Date.now();
        lastProgressAt = new Date(at).toISOString();
        staleEmitted = false;
        if (at - lastProgressEmittedAt < 20_000) return;
        lastProgressEmittedAt = at;
        observe("progress");
      }
    });
    lastProgressAt = new Date().toISOString();
    observe("completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    lastProgressAt = new Date().toISOString();
    observe("failed", /process_timeout/.test(message) ? "process_timeout" : "runner_failed");
    throw error;
  } finally { clearInterval(staleTimer); }
}

export class CodexCreatorSynthesisExecutor implements CreatorSynthesisExecutor {
  constructor(private readonly artifacts: CreatorArtifactStore = new LocalCreatorArtifactStore()) {}

  async synthesize(request: CreatorSynthesisRequest, observeLifecycle?: CreatorSynthesisLifecycleObserver) {
    const outputDir = path.join(runArtifactDir(request.creatorRunId), "creator-synthesis");
    fs.mkdirSync(outputDir, { recursive: true });
    const synthesisPath = path.join(outputDir, "creator-analysis.json");
    const evaluationPath = path.join(outputDir, "creator-synthesis-evaluation.json");
    const prompt = `
Read the complete creator-analysis Skill at ${creatorSkill}. Then build a research-only single-creator synthesis for ${request.creatorName ?? "the creator"}.

Pinned inputs (read all):
- portfolio: ${artifactPath(request.portfolioArtifactRef)}
- canonical 21 selection: ${artifactPath(request.selectionArtifactRef)}
- public detail evidence: ${artifactPath(request.detailArtifactRef)}
- single-pass reconstruction batch: ${artifactPath(request.reconstructionBatchArtifactRef)}
- each analyzed reconstruction/article/evaluation/gate referenced by that batch; failedGateIds on ready rows are quality warnings and must remain explicit limitations

Write only ${synthesisPath}. It must validate against ${path.join(projectRoot, "packages/research/src/creator-synthesis/contracts.ts")} and contain exactly the same 21 selected posts. Analyze account positioning, audience, problems, value provided, trust sources, lifecycle and possible commercial paths; content topics, formats, visual language, recurring structures and publishing rhythm; baseline/high/low performance patterns and confounds; and a per-record interpretation for every one of the 21 posts. Deep claims for batch-ready videos must cite their reconstruction artifacts and preserve evaluator warnings. A registered deep member that remains blocked only by media_verification after the batch's bounded media retry must instead be surface_only, cite only public detail/selection evidence, explicitly state that its video content is unknown, and never borrow a mechanism from ready videos. Other surface rows must also be explicitly surface_only and may use only title/copy/date/metric/form observations. Add a boundary naming the ready-video count and the media-unavailable post IDs whenever bounded_media_retry_once is present.

The batch can contain both legacy_iterative_repair and single_pass@37a03aae rows. Add an explicit boundary naming both policy groups and their post counts. Content evidence may be synthesized together, but never compare pass rates, warning counts, repair counts, or completeness scores across policies. Do not rewrite old policy provenance.

User product boundary overrides any launch-plan instruction in the Skill: do not write what we should copy, what we should post next, titles/covers/CTA for us, launch plans, or experiments. This artifact explains the creator only. Keep visible observation, author claim, inference, and unknown distinct. Public likes do not prove exposure, retention, conversion, ads, or sales; preserve those as unknown. Do not read old static reports or prior creator analyses.
`;
    try {
      try {
        await runSynthesisChild({
          prompt,
          outputDir,
          label: "synthesis",
          role: "creator_synthesis",
          inputRevision: crypto.createHash("sha256").update([
            request.portfolioArtifactRef,
            request.selectionArtifactRef,
            request.detailArtifactRef,
            request.reconstructionBatchArtifactRef
          ].join("\n")).digest("hex"),
          observer: observeLifecycle
        });
      }
      catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/ENOENT|not found|authentication|unauthorized/i.test(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
        throw new Error("CODEX_SYNTHESIS_RUNNER_FAILED");
      }
      if (!fs.existsSync(synthesisPath)) return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
        failedGateIds: ["synthesis_output_missing"], message: "博主归纳没有生成结构化产物。" };
      const synthesis = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(synthesisPath, "utf8")) as unknown);
      const synthesisRef = artifactRef(request.creatorRunId, "creator-synthesis/creator-analysis.json");
      const candidateRevisionFingerprint = fileSha256(synthesisPath);
      const evaluatorRunId = crypto.randomUUID();
      const evaluatorPrompt = `
You are a fresh independent evaluator for a creator research synthesis. You did not create the candidate and must not modify it.

Pinned candidate revision: ${candidateRevisionFingerprint}
Candidate: ${synthesisPath}
Portfolio: ${artifactPath(request.portfolioArtifactRef)}
Canonical selection: ${artifactPath(request.selectionArtifactRef)}
Public details: ${artifactPath(request.detailArtifactRef)}
Validated reconstruction batch: ${artifactPath(request.reconstructionBatchArtifactRef)}

Independently verify exactly these seven hard gates without averaging:
canonical_21_coverage, deep_9_ready, deep_evidence_binding, three_tiers_present, evidence_classification, research_creation_separation, backend_metrics_unknown.
Interpret deep_9_ready as a historical identifier, not a requirement for nine unique videos: high, median-near, mean-near, and low must each retain three registered group memberships and overlapping posts are analyzed once. Normally every unique registered deep candidate must be batch-ready. The only bounded exception is when the batch explicitly contains bounded_media_retry_once, every non-ready item is blocked solely by media_verification, and each of the four groups still has at least one batch-ready video; then pass with the exact unavailable IDs and coverage caveat, without inventing their video contents.
For deep_evidence_binding, inspect that every batch-ready deep row cites its reconstruction and independent evaluation and preserves evaluationPolicy provenance. A bounded media-unavailable deep row must be surface_only, cite only public detail/selection evidence, and explicitly state that video content is unknown. Under single_pass, failedGateIds on a batch-ready row are quality warnings and must remain explicit limitations; they do not make the row not ready. Fail for missing/unreadable/corrupt ready artifacts, missing deep-row bindings, invented claims for unavailable media, or missing mixed-policy/bounded-media boundaries. Do not reapply legacy iterative hard gates to single-pass rows.
Surface-only rows may not borrow deep evidence. Public likes never prove exposure, completion rate, conversion, ads, or sales. Reject any advice about what we should copy, publish, title, cover, test, or launch.

Write only ${evaluationPath} as:
{"schemaVersion":"creator-synthesis-independent-evaluation@1","creatorRunId":"${request.creatorRunId}","candidateRevisionFingerprint":"${candidateRevisionFingerprint}","evaluatorRunId":"${evaluatorRunId}","independentOfCandidate":true,"evaluatedAt":"ISO timestamp","gates":[{"id":"one required id","pass":true,"message":"specific finding","evidenceRefs":["resolvable artifact ref"]}]}
Include every required gate exactly once. Do not create or modify the final gate artifact.
`;
      try {
        await runSynthesisChild({
          prompt: evaluatorPrompt,
          outputDir,
          label: "synthesis-evaluator",
          role: "creator_synthesis_evaluator",
          inputRevision: candidateRevisionFingerprint,
          observer: observeLifecycle
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/ENOENT|not found|authentication|unauthorized/i.test(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
        throw new Error("CODEX_SYNTHESIS_EVALUATOR_FAILED");
      }
      if (!fs.existsSync(evaluationPath)) return { state: "not_ready" as const,
        synthesisArtifactRef: synthesisRef, gateArtifactRef: null,
        failedGateIds: ["independent_synthesis_evaluation_missing"],
        message: "博主归纳没有产生独立评估产物。" };
      const independentEvaluation = creatorSynthesisIndependentEvaluationSchema.parse(
        JSON.parse(fs.readFileSync(evaluationPath, "utf8")) as unknown
      );
      if (independentEvaluation.candidateRevisionFingerprint !== candidateRevisionFingerprint) {
        return { state: "not_ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: null,
          failedGateIds: ["independent_synthesis_revision_mismatch"], message: "独立评估未绑定当前博主归纳 revision。" };
      }
      const deterministicGate = validateCreatorSynthesis({ creatorRunId: request.creatorRunId,
        selection: this.artifacts.read(request.selectionArtifactRef), batch: this.artifacts.read(request.reconstructionBatchArtifactRef),
        synthesis, checkedAt: new Date().toISOString() });
      const evaluationRef = this.artifacts.write(
        request.creatorRunId,
        "creator-synthesis-evaluation.json",
        independentEvaluation,
        [synthesisRef, request.selectionArtifactRef, request.reconstructionBatchArtifactRef]
      );
      const gate = combineCreatorSynthesisGates({
        deterministicGate,
        independentEvaluation,
        candidateRevisionFingerprint,
        independentEvaluationArtifactRef: evaluationRef,
        checkedAt: new Date().toISOString()
      });
      const gateRef = this.artifacts.write(request.creatorRunId, "creator-synthesis-gate.json", gate, [synthesisRef, evaluationRef]);
      return gate.ready
        ? { state: "ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef }
        : { state: "not_ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef,
          failedGateIds: gate.failedGateIds, message: "博主归纳未通过研究边界或证据闭合硬闸。" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "博主归纳执行失败";
      return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|authentication|unauthorized/i.test(message)
        ? { state: "blocked" as const, message, userActionRequired: true }
        : { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null, failedGateIds: ["synthesis_execution"], message };
    }
  }
}
