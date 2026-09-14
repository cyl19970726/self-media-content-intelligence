import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { artifactPath } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFileInput } from "../../core/process.js";
import type { CreatorArtifactStore } from "../../../../research/index.js";
import { LocalCreatorArtifactStore } from "../artifacts/local-creator-artifact-store.js";
import {
  creatorSynthesisIndependentEvaluationSchema,
  creatorSynthesisLifecycleEventSchema,
  creatorSynthesisSchema,
  type CreatorSynthesisChildRole,
  type CreatorSynthesisExecutor,
  type CreatorSynthesisLifecycleObserver,
  type CreatorSynthesisRequest
} from "../../../../research/index.js";
import { assertValidCrossPostResearch, combineCreatorSynthesisGates, validateCreatorSynthesis } from "../../../../research/index.js";
import { withSystemProxy } from "../network/system-proxy.js";

function fileSha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function synthesisOutputRevisions(outputDir: string, lastMessagePath: string): Record<string, string> {
  return Object.fromEntries([
    "creator-analysis.json", "creator-analysis-provenance.json", "creator-synthesis-evaluation.json", path.basename(lastMessagePath)
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
    const model = input.role === "creator_synthesis"
      ? environment.SELF_MEDIA_CREATOR_SYNTHESIS_MODEL ?? "gpt-6-astra"
      : environment.SELF_MEDIA_CREATOR_SYNTHESIS_EVALUATOR_MODEL ?? "gpt-6-astra";
    const reasoningEffort = input.role === "creator_synthesis"
      ? environment.SELF_MEDIA_CREATOR_SYNTHESIS_REASONING_EFFORT ?? "medium"
      : environment.SELF_MEDIA_CREATOR_SYNTHESIS_EVALUATOR_REASONING_EFFORT ?? "medium";
    fs.writeFileSync(path.join(input.outputDir, `${input.label}-runtime.json`), JSON.stringify({
      role: input.role, childRunId, model, reasoningEffort, inputRevision: input.inputRevision, startedAt
    }, null, 2));
    const args = [
      "exec", "-", "--skip-git-repo-check", "--color", "never", "--approve-for-me",
      "-m", model, "-c", `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
      "-C", input.outputDir, "-o", lastMessagePath
    ];
    if (environment.SELF_MEDIA_CODEX_EPHEMERAL !== "false") args.splice(2, 0, "--ephemeral");
    await runFileInput(process.env.SELF_MEDIA_CODEX_BIN ?? "codex", args, input.prompt, {
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
    const preparedCandidatePath = process.env.SELF_MEDIA_CREATOR_SYNTHESIS_CANDIDATE_PATH;
    const prompt = `
Build a research-only single-creator synthesis for ${request.creatorName ?? "the creator"}. This prompt is the complete assignment: do not load another creator-analysis workflow, do not rerun or replace any individual-post Builder, and do not use an old static dashboard or report as a source.

Report maturity: ${request.mode === "formal" ? "WIKI_READY candidate (formal)" : "DOSSIER_READY candidate (provisional)"}.

Pinned inputs (read all):
- portfolio: ${artifactPath(request.portfolioArtifactRef)}
- every-post surface annotations: ${request.portfolioAnnotationsArtifactRef ? artifactPath(request.portfolioAnnotationsArtifactRef) : "not available (must remain an explicit report limitation)"}
- canonical 21 selection: ${artifactPath(request.selectionArtifactRef)}
- public detail evidence: ${artifactPath(request.detailArtifactRef)}
- media-aware reconstruction batch: ${artifactPath(request.reconstructionBatchArtifactRef)}
- each analyzed video or image-post reconstruction/article/evaluation/gate referenced by that batch; failedGateIds on ready rows are quality warnings and must remain explicit limitations

Write only ${synthesisPath}. It must validate against ${path.join(projectRoot, "packages/research/src/creator-synthesis/contracts.ts")} and contain exactly the same 21 selected posts. Set inputs.portfolioAnnotationsArtifactRef to the pinned annotation ref or null. Preserve postAnalyses for contract compatibility by reusing the already-produced per-post analyses and evidence; keep each row concise and do not perform or narrate 21 fresh summaries. Use the wider portfolio and every-post annotations only as background context and distribution evidence. The primary basis for cross-post conclusions is every one of the 12 selected deep reconstructions, including their existing Builder lenses and evaluation boundaries.

The required crossPostResearch object has exactly five sections, once each:
1. value（价值）：这个创作者持续给读者什么价值，价值如何被具体内容证明，边界是什么；
2. knowledge（知识/问题地图）：12 条深度内容共同覆盖哪些知识、问题、关系与空白；
3. patterns（反复出现的内容模式）：跨帖反复出现的选题、论证、编导、画面或剪辑模式，以及不符合模式的帖子；
4. performance（表现与反例）：把公开表现差异与内容差异并置，主动寻找反例和混杂因素，禁止把相关性写成因果；
5. next_questions（值得继续研究的问题）：只写关于该创作者和其内容系统仍值得研究的问题，不写我们的选题、标题、发布或实验建议。

每个 finding 必须是跨帖结论，不是单帖摘要；给出中文 statement、事实类别、置信度、逐帖 support、可得的 counterexamples、boundary 和 openQuestions。support/counterexamples 只能引用 canonical 21 的 postExternalId。对已构建深度样本的任何观察只能引用该帖自己的 reconstructionArtifactRef（可带 # 片段），不能借用另一帖或表层详情代替；固定输入中全部已构建深度样本必须至少各在一个 finding 的 support 或 counterexamples 中出现。每条引用要让读者看到帖子 ID、该帖具体观察和可解析的自身 artifact 指针。不要为了填表捏造反例；找不到时保持 counterexamples 为空，并在 boundary 明说当前未发现、证据不足或不可得。

Use the every-post annotation artifact for corpus-level topic, problem, promise, format and value distributions; keep its title-only proof and visual unknowns explicit. Analyze account positioning, audience, problems, value provided, trust sources, lifecycle and possible commercial paths; content topics, formats, visual language, recurring structures and publishing rhythm; baseline/high/low performance patterns and confounds. Deep claims for formally verified videos must use deep_validated, cite their reconstruction artifacts, and preserve evaluator warnings. Builder-complete videos or image posts that are not formally verified must use deep_provisional, cite their own reconstruction artifacts, name their evaluation state as a boundary, and must not be described as verified knowledge. A registered deep member that remains blocked only by media_verification after the batch's bounded media retry must instead be surface_only, cite only public detail/selection evidence, explicitly state that its media content is unknown, and never borrow a mechanism from built posts. Other surface rows must also be explicitly surface_only and may use only title/copy/date/metric/form observations. Add a boundary naming the built-post count, verified-post count, the every-post annotation denominator, and the media-unavailable post IDs whenever bounded_media_retry_once is present.

The batch can contain both legacy_iterative_repair and single_pass@37a03aae rows. Add an explicit boundary naming both policy groups and their post counts. Content evidence may be synthesized together, but never compare pass rates, warning counts, repair counts, or completeness scores across policies. Do not rewrite old policy provenance.

User product boundary overrides any launch-plan instruction in the Skill: do not write what we should copy, what we should post next, titles/covers/CTA for us, launch plans, or experiments. This artifact explains the creator only. Keep visible observation, author claim, inference, and unknown distinct. Public likes do not prove exposure, retention, conversion, ads, or sales; preserve those as unknown. Do not read old static reports or prior creator analyses.

All human-readable JSON values must be concise, natural Chinese that a content researcher can understand. Keep schema keys, IDs, enum values and artifact refs unchanged in English.
`;
    try {
      try {
        const inputRevision = crypto.createHash("sha256").update([
            request.portfolioArtifactRef,
            request.portfolioAnnotationsArtifactRef ?? "annotations:missing",
            request.selectionArtifactRef,
            request.detailArtifactRef,
            request.reconstructionBatchArtifactRef
          ].join("\n")).digest("hex");
        if (preparedCandidatePath) {
          const prepared = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(preparedCandidatePath, "utf8")) as unknown);
          const pinnedInputs = {
            portfolioArtifactRef: request.portfolioArtifactRef,
            portfolioAnnotationsArtifactRef: request.portfolioAnnotationsArtifactRef ?? null,
            selectionArtifactRef: request.selectionArtifactRef,
            detailArtifactRef: request.detailArtifactRef,
            reconstructionBatchArtifactRef: request.reconstructionBatchArtifactRef
          };
          const preparedInputs = { ...prepared.inputs,
            portfolioAnnotationsArtifactRef: prepared.inputs.portfolioAnnotationsArtifactRef ?? null };
          if (prepared.creatorRunId !== request.creatorRunId
            || (Object.keys(pinnedInputs) as (keyof typeof pinnedInputs)[])
              .some((key) => preparedInputs[key] !== pinnedInputs[key])) {
            throw new Error("PREPARED_SYNTHESIS_INPUT_MISMATCH");
          }
          assertValidCrossPostResearch({
            selection: this.artifacts.read(request.selectionArtifactRef),
            batch: this.artifacts.read(request.reconstructionBatchArtifactRef),
            synthesis: prepared
          });
          fs.copyFileSync(preparedCandidatePath, synthesisPath);
          fs.writeFileSync(path.join(outputDir, "creator-analysis-provenance.json"), JSON.stringify({
            source: "prepared_candidate",
            sourcePath: path.resolve(preparedCandidatePath),
            sourceSha256: fileSha256(preparedCandidatePath),
            inputRevision,
            importedAt: new Date().toISOString()
          }, null, 2));
        } else {
          await runSynthesisChild({
            prompt,
            outputDir,
            label: "synthesis",
            role: "creator_synthesis",
            inputRevision,
            observer: observeLifecycle
          });
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/^(PREPARED_SYNTHESIS_|cross_post_research_)/.test(message)) throw error;
        if (/ENOENT|not found|authentication|unauthorized/i.test(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
        throw new Error("CODEX_SYNTHESIS_RUNNER_FAILED");
      }
      if (!fs.existsSync(synthesisPath)) return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
        failedGateIds: ["synthesis_output_missing"], message: "博主归纳没有生成结构化产物。" };
      const synthesis = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(synthesisPath, "utf8")) as unknown);
      assertValidCrossPostResearch({
        selection: this.artifacts.read(request.selectionArtifactRef),
        batch: this.artifacts.read(request.reconstructionBatchArtifactRef),
        synthesis
      });
      const synthesisRef = this.artifacts.write(
        request.creatorRunId,
        "creator-analysis.json",
        synthesis,
        [request.portfolioArtifactRef, ...(request.portfolioAnnotationsArtifactRef ? [request.portfolioAnnotationsArtifactRef] : []), request.selectionArtifactRef,
          request.detailArtifactRef, request.reconstructionBatchArtifactRef]
      );
      const candidateRevisionFingerprint = fileSha256(synthesisPath);
      const evaluatorRunId = crypto.randomUUID();
      const evaluatorPrompt = `
You are a fresh independent evaluator for a creator research synthesis. You did not create the candidate and must not modify it.

Pinned candidate revision: ${candidateRevisionFingerprint}
Candidate: ${synthesisPath}
Portfolio: ${artifactPath(request.portfolioArtifactRef)}
Every-post surface annotations: ${request.portfolioAnnotationsArtifactRef ? artifactPath(request.portfolioAnnotationsArtifactRef) : "not available"}
Canonical selection: ${artifactPath(request.selectionArtifactRef)}
Public details: ${artifactPath(request.detailArtifactRef)}
Validated reconstruction batch: ${artifactPath(request.reconstructionBatchArtifactRef)}

Independently verify exactly these seven hard gates without averaging:
canonical_21_coverage, deep_9_ready, deep_evidence_binding, three_tiers_present, evidence_classification, research_creation_separation, backend_metrics_unknown.
As part of deep_evidence_binding and evidence_classification, independently review crossPostResearch: it must contain the five distinct required sections; use every built deep sample from the pinned batch somewhere; bind each deep observation only to that post's own reconstruction; cite only selected post IDs; distinguish support from real counterexamples; explicitly state the boundary when no counterexample is available; preserve uncertainty; and use natural Chinese for all reader-facing claims. Evaluate the cross-post conclusions against the existing reconstructions. Do not ask for or create fresh per-post summaries and do not modify an individual Builder artifact.
Interpret deep_9_ready as a historical identifier, not a requirement for nine unique videos: high, median-near, mean-near, and low must each retain three registered group memberships and overlapping posts are analyzed once. Normally every unique registered deep candidate must be batch-ready. The only bounded exception is when the batch explicitly contains bounded_media_retry_once, every non-ready item is blocked solely by media_verification, and each of the four groups still has at least one batch-ready video; then pass with the exact unavailable IDs and coverage caveat, without inventing their video contents.
For deep_evidence_binding, inspect that every batch-ready deep row cites its reconstruction and independent evaluation and preserves evaluationPolicy provenance. A bounded media-unavailable deep row must be surface_only, cite only public detail/selection evidence, and explicitly state that video content is unknown. Under single_pass, failedGateIds on a batch-ready row are quality warnings and must remain explicit limitations; they do not make the row not ready. Fail for missing/unreadable/corrupt ready artifacts, missing deep-row bindings, invented claims for unavailable media, or missing mixed-policy/bounded-media boundaries. Do not reapply legacy iterative hard gates to single-pass rows.
Surface-only rows may not borrow deep evidence. Public likes never prove exposure, completion rate, conversion, ads, or sales. Reject any advice about what we should copy, publish, title, cover, test, or launch.
Write every human-readable message in concise, natural Chinese. Keep gate IDs, schema values and artifact refs unchanged in English.

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
      if (fileSha256(synthesisPath) !== candidateRevisionFingerprint) {
        return { state: "not_ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: null,
          failedGateIds: ["independent_synthesis_candidate_mutated"], message: "独立评估过程修改了候选归纳，结果已拒绝。" };
      }
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
      if (request.mode === "provisional") {
        return { state: "provisional" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef,
          failedGateIds: gate.failedGateIds };
      }
      return gate.ready
        ? { state: "ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef }
        : { state: "not_ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef,
          failedGateIds: gate.failedGateIds, message: "博主归纳未通过研究边界或证据闭合硬闸。" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "博主归纳执行失败";
      const crossPostFailure = message.match(/cross_post_research_[a-z0-9_]+/)?.[0]
        ?? (message.startsWith("PREPARED_SYNTHESIS_") ? message : null);
      return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|authentication|unauthorized/i.test(message)
        ? { state: "blocked" as const, message, userActionRequired: true }
        : { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
          failedGateIds: [crossPostFailure ?? "synthesis_execution"], message };
    }
  }
}
