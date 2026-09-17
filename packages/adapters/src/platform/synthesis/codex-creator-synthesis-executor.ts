import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { artifactPath } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFileInput } from "../../core/process.js";
import { attachVerifiedSkillSnapshots, codexInstalledVersions, defaultCodexSdkFactory, invokeCodexSdk, type CodexSdkFactory } from "../../workflow/codex-sdk-runner.js";
import type { CreatorArtifactStore } from "../../../../research/index.js";
import { LocalCreatorArtifactStore } from "../artifacts/local-creator-artifact-store.js";
import { resolveReportSource } from "../artifacts/report-source-revision.js";
import {
  creatorSynthesisIndependentEvaluationSchema,
  creatorSynthesisLifecycleEventSchema,
  creatorSynthesisSchema,
  creatorCorpusSchema,
  creatorPortfolioAnalysisSchema,
  videoReconstructionBatchSchema,
  type CreatorSynthesisChildRole,
  type CreatorSynthesisExecutor,
  type CreatorSynthesisLifecycleObserver,
  type CreatorSynthesisRequest
} from "../../../../research/index.js";
import { assertValidCrossPostResearch, combineCreatorSynthesisGates, validateAdaptivePortfolioClassification,
  diagnoseCrossPostSpecificity, validateCreatorSynthesis } from "../../../../research/index.js";
import { withSystemProxy } from "../network/system-proxy.js";
import { startSynthesisExecutionTrace, type SynthesisExecutionTrace } from "./synthesis-execution-trace.js";
import { assembleReuseCandidate, assertReuseBaseBindings, buildReuseMaterialIndex, creatorSynthesisResearchDraftSchema,
  creatorSynthesisChildFixedFieldsSchema, prepareReuseFixedFields, loadReuseBase, reuseClassificationContext, reuseProvenance } from "./creator-synthesis-reuse.js";

function fileSha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function definedEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function posixShellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export type LoadedCreatorSynthesisSkill = {
  files: Array<{ path: string; sha256: string; content: string }>;
};

export type CreatorSynthesisCodexExecutionOptions = {
  /** CLI is the existing execution path; SDK must be explicitly opted in. */
  executionMode?: "cli" | "sdk";
  sdkFactory?: CodexSdkFactory;
  signal?: AbortSignal;
  phase?: "build" | "evaluate" | "full";
  /** A host-prepared immutable candidate; required for the evaluate-only phase. */
  preparedCandidatePath?: string;
  outputDirectory?: string;
  repairFindings?: unknown;
  priorCandidatePath?: string;
  /** A same-input candidate whose compatibility fields are retained by program assembly. */
  reuseCandidatePath?: string;
  builderModel?: string;
  evaluatorModel?: string;
  builderReasoningEffort?: string;
  evaluatorReasoningEffort?: string;
};

export function resolveCreatorSynthesisReusePath(
  execution: CreatorSynthesisCodexExecutionOptions,
  environment: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (execution.reuseCandidatePath) return execution.reuseCandidatePath;
  if (execution.repairFindings !== undefined && execution.priorCandidatePath) return execution.priorCandidatePath;
  return execution.executionMode === "sdk" ? undefined : environment.SELF_MEDIA_CREATOR_SYNTHESIS_REUSE_PATH;
}

export function creatorSynthesisSpecificityReviewInstructions(diagnosticsPath: string): string {
  return `Cross-post specificity review signals: ${diagnosticsPath}
Read every diagnostic in this signal file. For each one, inspect the cited candidate paths and current reconstruction evidence and explicitly state in the relevant gate message whether it is a justified shared formulation/reference or whether it loses post-specific facts. The diagnostics are review signals, not automatic failures; decide from the evidence and do not fail solely because a signal exists.`;
}

/** Loads the project-local method so a Builder run is reproducible from its runtime record. */
export function loadCreatorSynthesisSkill(root = projectRoot): LoadedCreatorSynthesisSkill {
  const skillRoot = path.join(root, ".agents", "skills", "creator-synthesis");
  const relativeFiles = ["SKILL.md", path.join("references", "method.md")];
  const files = relativeFiles.map((relative) => {
    const absolute = path.join(skillRoot, relative);
    let content: string;
    try {
      content = fs.readFileSync(absolute, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`CREATOR_SYNTHESIS_SKILL_MISSING:${absolute}`);
      }
      throw error;
    }
    if (!content.trim()) throw new Error(`CREATOR_SYNTHESIS_SKILL_INVALID:${absolute}`);
    return { path: absolute, sha256: crypto.createHash("sha256").update(content).digest("hex"), content };
  });
  return { files };
}

export function creatorSynthesisSkillPrompt(skill: LoadedCreatorSynthesisSkill): string {
  return skill.files.map((file) => `Required project method, loaded from ${file.path} (sha256: ${file.sha256}):\n---\n${file.content}\n---`).join("\n\n");
}

export function creatorSynthesisInputRevision(input: string[], skill: LoadedCreatorSynthesisSkill): string {
  return crypto.createHash("sha256").update([...input,
    ...skill.files.map((file) => `${file.path}:${file.sha256}`)
  ].join("\n")).digest("hex");
}

function synthesisOutputRevisions(outputDir: string, lastMessagePath: string, outputFile: string): Record<string, string> {
  return Object.fromEntries([
    outputFile, "creator-analysis-provenance.json", "creator-synthesis-evaluation.json", path.basename(lastMessagePath)
  ].flatMap((relative) => {
    const absolute = path.join(outputDir, relative);
    return fs.existsSync(absolute) ? [[relative, fileSha256(absolute)]] : [];
  }));
}

export async function runSynthesisChild(input: {
  creatorRunId: string;
  prompt: string;
  outputDir: string;
  label: string;
  role: CreatorSynthesisChildRole;
  inputRevision: string;
  runtimeMetadata?: Record<string, unknown>;
  /** These files are embedded in the effective prompt and logged privately. */
  requiredSkillFiles?: readonly string[];
  outputFile?: string;
  observer?: CreatorSynthesisLifecycleObserver;
  execution?: CreatorSynthesisCodexExecutionOptions;
}): Promise<void> {
  const skill = attachVerifiedSkillSnapshots(input.prompt, input.requiredSkillFiles ?? [], { outputDirectory: input.outputDir });
  input = { ...input, prompt: skill.prompt, runtimeMetadata: { ...input.runtimeMetadata, skillLoad: skill.receipt } };
  const lastMessagePath = path.join(input.outputDir, `${input.label}-last-message.txt`);
  const outputFile = input.outputFile ?? (input.role === "creator_synthesis" ? "creator-analysis.json" : "creator-synthesis-evaluation.json");
  const childRunId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  let lastProgressAt = startedAt;
  let lastProgressEmittedAt = 0;
  let staleEmitted = false;
  let trace: SynthesisExecutionTrace | undefined;
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
        outputArtifactRevisions: synthesisOutputRevisions(input.outputDir, lastMessagePath, outputFile),
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
    const builder = input.role === "creator_synthesis";
    const model = input.execution?.executionMode === "sdk"
      ? builder ? input.execution.builderModel ?? "gpt-5.6-terra" : input.execution.evaluatorModel ?? "gpt-5.6-luna"
      : builder ? environment.SELF_MEDIA_CREATOR_SYNTHESIS_MODEL ?? "gpt-5.6-terra"
        : environment.SELF_MEDIA_CREATOR_SYNTHESIS_EVALUATOR_MODEL ?? "gpt-5.6-luna";
    const reasoningEffort = input.execution?.executionMode === "sdk"
      ? builder ? input.execution.builderReasoningEffort ?? "medium" : input.execution.evaluatorReasoningEffort ?? "medium"
      : builder ? environment.SELF_MEDIA_CREATOR_SYNTHESIS_REASONING_EFFORT ?? "medium"
        : environment.SELF_MEDIA_CREATOR_SYNTHESIS_EVALUATOR_REASONING_EFFORT ?? "medium";
    const args = [
      "exec", "-", "--skip-git-repo-check", "--json", "--color", "never", "--approve-for-me",
      "-m", model, "-c", `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
      "-C", input.outputDir, "-o", lastMessagePath
    ];
    if (environment.SELF_MEDIA_CODEX_EPHEMERAL !== "false") args.splice(2, 0, "--ephemeral");
    const runtimeVersions = codexInstalledVersions();
    trace = startSynthesisExecutionTrace({
      creatorRunId: input.creatorRunId,
      childRunId,
      role: input.role,
      label: input.label,
      command: process.env.SELF_MEDIA_CODEX_BIN ?? "codex",
      args,
      inputRevision: input.inputRevision,
      startedAt,
      model,
      reasoningEffort,
      executionMode: input.execution?.executionMode ?? "cli",
      ...runtimeVersions,
      sessionMode: environment.SELF_MEDIA_CODEX_EPHEMERAL === "false" ? "retained" : "ephemeral",
      prompt: input.prompt,
      extra: input.runtimeMetadata
    }, [
      { name: outputFile, sourcePath: path.join(input.outputDir, outputFile) },
      { name: path.basename(lastMessagePath), sourcePath: lastMessagePath }
    ]);
    // This is an operator-local pointer only. The trace directory is never
    // registered in the artifact store or exposed from artifact endpoints.
    fs.writeFileSync(path.join(input.outputDir, `${input.label}-runtime.json`), JSON.stringify({
      role: input.role, childRunId, model, reasoningEffort, inputRevision: input.inputRevision, startedAt,
      tracePath: trace.traceDir, executionMode: input.execution?.executionMode ?? "cli", ...runtimeVersions,
      ...input.runtimeMetadata
    }, null, 2));
    if (input.execution?.executionMode === "sdk") {
      const result = await invokeCodexSdk(input.execution.sdkFactory ?? defaultCodexSdkFactory, {
        prompt: input.prompt, outputDir: input.outputDir, role: input.role, model, reasoningEffort,
        lastMessage: lastMessagePath, signal: input.execution.signal ?? new AbortController().signal, timeoutMs,
        codexOptions: { codexPathOverride: process.env.SELF_MEDIA_CODEX_BIN, env: definedEnvironment(environment) },
        observer: (event) => {
          trace?.append("stdout", `${JSON.stringify(event)}\n`);
          const at = Date.now();
          lastProgressAt = new Date(at).toISOString();
          staleEmitted = false;
          if (at - lastProgressEmittedAt < 20_000) return;
          lastProgressEmittedAt = at;
          observe("progress");
        }
      });
      fs.writeFileSync(path.join(trace.traceDir, "result.json"), JSON.stringify({ threadId: result.threadId, usage: result.usage }, null, 2), { mode: 0o600 });
    } else await runFileInput(process.env.SELF_MEDIA_CODEX_BIN ?? "codex", args, input.prompt, {
      cwd: input.outputDir,
      timeout: timeoutMs,
      env: environment,
      captureOutput: false,
      onOutput: (stream, chunk) => {
        trace?.append(stream, chunk);
        const at = Date.now();
        lastProgressAt = new Date(at).toISOString();
        staleEmitted = false;
        if (at - lastProgressEmittedAt < 20_000) return;
        lastProgressEmittedAt = at;
        observe("progress");
      }
    });
    lastProgressAt = new Date().toISOString();
    trace.snapshotOutputs();
    trace.complete(lastProgressAt);
    observe("completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    lastProgressAt = new Date().toISOString();
    trace?.snapshotOutputs();
    trace?.fail(lastProgressAt, error);
    observe("failed", /process_timeout/.test(message) ? "process_timeout" : "runner_failed");
    throw error;
  } finally { clearInterval(staleTimer); }
}

export function prepareCreatorSynthesisBatch(artifacts: CreatorArtifactStore, request: CreatorSynthesisRequest): string {
    const originalBatch = videoReconstructionBatchSchema.parse(artifacts.read(request.reconstructionBatchArtifactRef));
    const revisionDependencies: string[] = [];
    const revisedPostIds: string[] = [];
    const effectiveItems = originalBatch.items.map((item) => {
      if (!item.reconstructionArtifactRef) return item;
      const resolved = resolveReportSource(artifactPath(item.reconstructionArtifactRef));
      if (!resolved.revision || !resolved.revisedSha256 || !resolved.manifestPath) return item;
      const revisedValue = JSON.parse(resolved.text) as unknown;
      const revisionManifestRef = artifacts.write(request.creatorRunId,
        `creator-synthesis-source-revision-${item.postExternalId}.json`,
        JSON.parse(fs.readFileSync(resolved.manifestPath, "utf8")) as unknown,
        [item.reconstructionArtifactRef]);
      const revisedRef = artifacts.write(request.creatorRunId,
        `creator-synthesis-source-${item.postExternalId}.json`, revisedValue,
        [item.reconstructionArtifactRef, revisionManifestRef]);
      revisionDependencies.push(revisionManifestRef, revisedRef);
      revisedPostIds.push(item.postExternalId);
      return {
        ...item,
        state: "built_unevaluated" as const,
        reconstructionArtifactRef: revisedRef,
        evaluationArtifactRef: null,
        gateReportArtifactRef: null,
        threeLensEvaluationArtifactRef: null,
        threeLensGateReportArtifactRef: null,
        failedGateIds: [],
        researchReview: null,
        message: `综合输入采用已核对源修订；既有独立评估未绑定该 revision。${resolved.revision}`
      };
    });
    const effectiveBatch = videoReconstructionBatchSchema.parse({
      ...originalBatch,
      generatedAt: originalBatch.generatedAt,
      builtPosts: effectiveItems.filter((item) => ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(item.state)).length,
      verifiedPosts: effectiveItems.filter((item) => ["verified", "ready"].includes(item.state)).length,
      readyPosts: effectiveItems.filter((item) => ["verified", "ready"].includes(item.state)).length,
      limitations: [...originalBatch.limitations,
        ...(revisedPostIds.length ? [`综合输入绑定 ${revisedPostIds.length} 份报告源修订；其既有单帖评估不沿用。`] : [])],
      items: effectiveItems
    });
    const effectiveBatchRef = revisedPostIds.length
      ? artifacts.write(request.creatorRunId, "creator-synthesis-input-batch.json", effectiveBatch,
        [request.reconstructionBatchArtifactRef, ...revisionDependencies])
      : request.reconstructionBatchArtifactRef;
  return effectiveBatchRef;
}

export function assertPreparedSynthesisInputs(
  prepared: { creatorRunId: string; inputs: Record<string, unknown> },
  request: CreatorSynthesisRequest
): void {
  const pinnedInputs = {
    portfolioArtifactRef: request.portfolioArtifactRef,
    portfolioAnnotationsArtifactRef: request.portfolioAnnotationsArtifactRef ?? null,
    selectionArtifactRef: request.selectionArtifactRef,
    detailArtifactRef: request.detailArtifactRef,
    reconstructionBatchArtifactRef: request.reconstructionBatchArtifactRef
  };
  const preparedInputs: Record<string, unknown> = { ...prepared.inputs,
    portfolioAnnotationsArtifactRef: prepared.inputs.portfolioAnnotationsArtifactRef ?? null };
  if (prepared.creatorRunId !== request.creatorRunId
    || (Object.keys(pinnedInputs) as (keyof typeof pinnedInputs)[])
      .some((key) => preparedInputs[key] !== pinnedInputs[key])) {
    throw new Error("PREPARED_SYNTHESIS_INPUT_MISMATCH");
  }
}

export function synthesisSourcePathInstructions(originalBatchRef: string, effectiveBatchRef: string): string {
  if (originalBatchRef === effectiveBatchRef) return "The pinned reconstruction batch is also the asset-path base.";
  return `Revised reconstruction JSON in ${artifactPath(effectiveBatchRef)} is the authoritative report-facts source. `
    + `For relative media, frame, derivedSources, or evidence paths inside a revised reconstruction, resolve them against the directory of `
    + `the same postExternalId's reconstructionArtifactRef in ${artifactPath(originalBatchRef)}. `
    + "The original batch is provided only as an asset-base mapping; do not use its reconstruction prose or Builder conclusions as facts.";
}

export class CodexCreatorSynthesisExecutor implements CreatorSynthesisExecutor {
  constructor(
    private readonly artifacts: CreatorArtifactStore = new LocalCreatorArtifactStore(),
    private readonly execution: CreatorSynthesisCodexExecutionOptions = {}
  ) {}

  async synthesize(request: CreatorSynthesisRequest, observeLifecycle?: CreatorSynthesisLifecycleObserver) {
    const effectiveBatchRef = prepareCreatorSynthesisBatch(this.artifacts, request);
    const effectiveRequest = { ...request, reconstructionBatchArtifactRef: effectiveBatchRef };
    if (this.execution.phase === "evaluate" && !this.execution.preparedCandidatePath) {
      return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
        failedGateIds: ["evaluation_candidate_required"], message: "独立评估必须绑定一个已冻结的候选文件。" };
    }
    const reuseCandidatePath = resolveCreatorSynthesisReusePath(this.execution);
    let reuseBase: ReturnType<typeof loadReuseBase> | null = null;
    if (reuseCandidatePath) {
      try { reuseBase = loadReuseBase(reuseCandidatePath, effectiveRequest); }
      catch (error) {
        const message = error instanceof Error ? error.message : "CREATOR_SYNTHESIS_REUSE_INVALID";
        return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
          failedGateIds: [message.split(":")[0] ?? "CREATOR_SYNTHESIS_REUSE_INVALID"], message };
      }
    }
    const outputDir = this.execution.outputDirectory ?? (reuseBase
      ? path.join(runArtifactDir(request.creatorRunId), "creator-synthesis", `reuse-${crypto.randomUUID()}`)
      : path.join(runArtifactDir(request.creatorRunId), "creator-synthesis"));
    fs.mkdirSync(outputDir, { recursive: true });
    const synthesisPath = path.join(outputDir, "creator-analysis.json");
    const researchDraftPath = path.join(outputDir, "research-draft.json");
    const evaluationPath = path.join(outputDir, "creator-synthesis-evaluation.json");
    const preparedCandidatePath = this.execution.preparedCandidatePath
      ?? (this.execution.executionMode === "sdk" ? undefined : process.env.SELF_MEDIA_CREATOR_SYNTHESIS_CANDIDATE_PATH);
    let loadedSkill: LoadedCreatorSynthesisSkill;
    try {
      loadedSkill = loadCreatorSynthesisSkill();
    } catch (error) {
      const message = error instanceof Error ? error.message : "CREATOR_SYNTHESIS_SKILL_INVALID";
      const skillFailureId = message.startsWith("CREATOR_SYNTHESIS_SKILL_")
        ? message.split(":")[0] ?? "CREATOR_SYNTHESIS_SKILL_INVALID"
        : "creator_synthesis_skill";
      return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
        failedGateIds: [skillFailureId],
        message };
    }
    const sourcePathInstructions = synthesisSourcePathInstructions(
      request.reconstructionBatchArtifactRef, effectiveRequest.reconstructionBatchArtifactRef);
    const researchBriefPath = process.env.SELF_MEDIA_CREATOR_SYNTHESIS_RESEARCH_BRIEF_PATH;
    let researchBrief: { path: string; sha256: string; content: string } | null = null;
    if (researchBriefPath) {
      try {
        const absolutePath = path.resolve(researchBriefPath);
        const content = fs.readFileSync(absolutePath, "utf8");
        if (!content.trim()) throw new Error("empty");
        researchBrief = { path: absolutePath, sha256: crypto.createHash("sha256").update(content).digest("hex"), content };
      } catch {
        return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
          failedGateIds: ["creator_synthesis_research_brief_invalid"], message: "本次博主综合研究任务说明不存在、不可读或为空。" };
      }
    }
    const portfolio = creatorPortfolioAnalysisSchema.parse(this.artifacts.read(request.portfolioArtifactRef));
    const corpusArtifactRef = portfolio.corpusArtifactRef;
    const corpusPath = artifactPath(corpusArtifactRef);
    const corpus = creatorCorpusSchema.parse(this.artifacts.read(corpusArtifactRef));
    const reconstructionBatch = videoReconstructionBatchSchema.parse(
      this.artifacts.read(effectiveRequest.reconstructionBatchArtifactRef));
    if (reuseBase) {
      try { assertReuseBaseBindings({ base: reuseBase, request: effectiveRequest, readArtifact: (reference) => this.artifacts.read(reference) }); }
      catch (error) {
        const message = error instanceof Error ? error.message : "CREATOR_SYNTHESIS_REUSE_BINDING_INVALID";
        return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
          failedGateIds: [message.split(":")[0] ?? "CREATOR_SYNTHESIS_REUSE_BINDING_INVALID"], message };
      }
    }
    const validationRunner = [process.execPath, "--import", path.join(projectRoot, "node_modules", "tsx", "dist", "loader.mjs")];
    const candidateValidationCommand = [
      ...validationRunner,
      path.join(projectRoot, ".agents", "skills", "creator-synthesis", "scripts", "validate-candidate.ts"),
      "--candidate", synthesisPath,
      "--corpus", corpusPath,
      "--selection", artifactPath(request.selectionArtifactRef),
      "--batch", artifactPath(effectiveRequest.reconstructionBatchArtifactRef),
      "--corpus-ref", corpusArtifactRef
    ].map(posixShellQuote).join(" ");
    const validateClassification = (candidate: ReturnType<typeof creatorSynthesisSchema.parse>) => {
      if (!candidate.portfolioClassification) throw new Error("portfolio_classification_missing");
      validateAdaptivePortfolioClassification({ classification: candidate.portfolioClassification, corpus,
        corpusArtifactRef, reconstructionBatch });
    };
    let prompt = `
Build a research-only single-creator synthesis for ${request.creatorName ?? "the creator"}. Follow the required project method loaded below. Do not rerun or replace any individual-post Builder, and do not use an old static dashboard or report as a source.

${creatorSynthesisSkillPrompt(loadedSkill)}

Report maturity: ${request.mode === "formal" ? "WIKI_READY candidate (formal)" : "DOSSIER_READY candidate (provisional)"}.

Pinned inputs (read all):
- portfolio: ${artifactPath(request.portfolioArtifactRef)}
- frozen observed corpus: ${corpusPath}
- every-post surface annotations: ${request.portfolioAnnotationsArtifactRef ? artifactPath(request.portfolioAnnotationsArtifactRef) : "not available (must remain an explicit report limitation)"}
- canonical frozen selection: ${artifactPath(request.selectionArtifactRef)}
- public detail evidence: ${artifactPath(request.detailArtifactRef)}
- media-aware reconstruction batch: ${artifactPath(effectiveRequest.reconstructionBatchArtifactRef)}
- each analyzed video or image-post reconstruction/article/evaluation/gate referenced by that batch; failedGateIds on ready rows are quality warnings and must remain explicit limitations

Asset path contract: ${sourcePathInstructions}

Write only ${synthesisPath}. It must validate against ${path.join(projectRoot, "packages/research/src/creator-synthesis/contracts.ts")}. postAnalyses must contain exactly the same post IDs as the pinned frozen selection. portfolioClassification must contain exactly one row for each of the ${corpus.records.length} records in the pinned frozen corpus. Set inputs.portfolioAnnotationsArtifactRef to the pinned annotation ref or null. Preserve postAnalyses for contract compatibility by reusing the already-produced per-post analyses and evidence; keep each row concise and do not perform or narrate fresh per-post summaries. Use the wider portfolio and every-post annotations only as background context and distribution evidence. The primary basis for cross-post conclusions is every selected deep reconstruction present in the pinned batch, including its existing Builder lenses and evaluation boundaries.

Classification citation contract: labelRegistry.evidenceRefs may cite only the frozen corpus or a pinned reconstruction (with an optional JSON pointer), never the annotation artifact. A surface_title membership must cite only its own corpus title or visibleText. The sole exception is a membership whose registered label has axis format: it may cite only that same row's corpus mediaType, and then establishes only video/image media type, never directing, editing style, or content. A deep_builder membership must cite only that same post's reconstruction.

After writing the candidate, run this required read-only validation command before you finish. It checks the actual Schema, cross-post evidence bindings, and adaptive classification bindings; fix any reported error in ${synthesisPath} and run it again:
${candidateValidationCommand}

Runtime product boundary overrides any launch-plan instruction in the loaded method: do not write what we should copy, what we should post next, titles/covers/CTA for us, launch plans, or experiments. This artifact explains the creator only. Keep visible observation, author claim, inference, and unknown distinct. Public likes do not prove exposure, retention, conversion, ads, or sales; preserve those as unknown. Do not read old static reports or prior creator analyses.

Keep compatibility fields such as postAnalyses rows concise and natural. In research fields, preserve the concrete facts, conditions, contrasts, counterexamples, and uncertainty needed for a content researcher to understand the conclusion. Keep schema keys, IDs, enum values and artifact refs unchanged in English.
${researchBrief ? `\nAdditional research task for this run only (sha256: ${researchBrief.sha256}):\n${researchBrief.content}` : ""}
`;
    const reuseMaterialIndex = reuseBase ? buildReuseMaterialIndex({ request: effectiveRequest,
      readArtifact: (reference) => this.artifacts.read(reference) }) : null;
    const reuseMaterialIndexPath = path.join(outputDir, "reuse-material-index.json");
    const reuseMaterialDirectory = path.join(outputDir, "reuse-materials");
    const reuseClassificationContextPath = path.join(outputDir, "reuse-classification-context.json");
    const reuseValidationContextPath = path.join(outputDir, "reuse-draft-validation-context.json");
    if (reuseMaterialIndex) {
      fs.mkdirSync(reuseMaterialDirectory, { recursive: true });
      const materialIndex = reuseMaterialIndex as { schemaVersion: string; reconstructionBatchArtifactRef: string;
        deepMaterials: Array<Record<string, unknown>> };
      const materials = materialIndex.deepMaterials;
      const index = { schemaVersion: materialIndex.schemaVersion,
        reconstructionBatchArtifactRef: materialIndex.reconstructionBatchArtifactRef,
        deepMaterials: materials.map((material) => {
          const postExternalId = String(material.postExternalId);
          const materialPath = path.join(reuseMaterialDirectory, `${postExternalId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
          fs.writeFileSync(materialPath, JSON.stringify(material, null, 2));
          return { postExternalId, tier: material.tier, state: material.state,
            reconstructionArtifactRef: material.reconstructionArtifactRef, materialPath, materialSha256: fileSha256(materialPath) };
        }) };
      fs.writeFileSync(reuseMaterialIndexPath, JSON.stringify(index, null, 2));
      fs.writeFileSync(reuseClassificationContextPath, JSON.stringify(reuseClassificationContext(reuseBase!.candidate), null, 2));
      const fixed = prepareReuseFixedFields(reuseBase!.candidate, reconstructionBatch);
      const childFixed = { schemaVersion: fixed.schemaVersion, creatorRunId: fixed.creatorRunId, inputs: fixed.inputs,
        portfolioClassification: fixed.portfolioClassification, postAnalyses: fixed.postAnalyses };
      const childVisibleFixed = creatorSynthesisChildFixedFieldsSchema.parse(childFixed);
      fs.writeFileSync(reuseValidationContextPath, JSON.stringify({ request: effectiveRequest,
        fixed: childVisibleFixed }, null, 2));
      prompt = `
Build a research-only draft for ${request.creatorName ?? "the creator"}. This is a same-frozen-input reuse trial. Read the source material index at ${reuseMaterialIndexPath}, then read every per-post JSON file listed in it. Each material file contains that post's complete builderLenses, evaluation boundary, original artifact reference, local path, and sha256. Do not treat the index as a substitute for reading those files. ${this.execution.repairFindings === undefined ? "Do not read a previous synthesis report." : "The bounded repair instructions below identify the only prior synthesis you may read, solely as the repair base."}

${creatorSynthesisSkillPrompt(loadedSkill)}

Also read the pinned portfolio ${artifactPath(request.portfolioArtifactRef)}, corpus ${corpusPath}, selection ${artifactPath(request.selectionArtifactRef)}, public details ${artifactPath(request.detailArtifactRef)}, and batch ${artifactPath(effectiveRequest.reconstructionBatchArtifactRef)}. Resolve media under: ${sourcePathInstructions}

The caller supplies a compact classification compatibility index at ${reuseClassificationContextPath}. It lists the label registry, membership counts, and deep-sample memberships only. Do not rewrite or output classification.

Write only ${researchDraftPath}. Output solely the existing research fields identity, contentSystem, performance, crossPostResearch, and boundaries, conforming to the project creator synthesis schema at ${path.join(projectRoot, "packages", "research", "src", "creator-synthesis", "contracts.ts")}. Do not output schemaVersion, creatorRunId, generatedAt, inputs, portfolioClassification, or postAnalyses: the program assembles those fixed fields from the validated reuse base. Do not use old synthesis prose as evidence. Each conclusion must cite current per-post evidence. Use natural Chinese while retaining concrete facts, conditions, contrasts, counterexamples, and uncertainty; concision must not erase them. Do not make content plans, titles, covers, CTA, or experiments for us.

Before finishing, validate the actual draft with:
${validationRunner.map(posixShellQuote).join(" ")} ${posixShellQuote(path.join(projectRoot, ".agents", "skills", "creator-synthesis", "scripts", "validate-research-draft.ts"))} --draft ${posixShellQuote(researchDraftPath)} --context ${posixShellQuote(reuseValidationContextPath)}
${researchBrief ? `\nAdditional research task for this run only (sha256: ${researchBrief.sha256}):\n${researchBrief.content}` : ""}
`;
    }
    if (this.execution.repairFindings !== undefined) {
      if (!this.execution.priorCandidatePath) throw new Error("SYNTHESIS_REPAIR_CANDIDATE_REQUIRED");
      prompt += `\n\nBounded repair task: read the prior candidate at ${path.resolve(this.execution.priorCandidatePath)} as the repair base and repair only these findings: ${JSON.stringify(this.execution.repairFindings)}. You may use its research fields only to preserve unaffected conclusions; verify every repaired conclusion against the current per-post materials. The program, not you, retains portfolioClassification and postAnalyses from the strongly bound reuse base. Do not output or regenerate those fixed fields. Do not create a fresh synthesis, rerun individual-post research, or perform independent evaluation. When the findings contain a research-review@1 review, also write ${path.join(outputDir, "revision-response.json")} as a JSON array with exactly one Builder-owned disposition for every finding: {"id":"finding id","status":"changed|disputed|missing_evidence","reason":"specific evidence-based reason"}. For this bounded repair, revision-response.json is the sole additional permitted output and this permission overrides the earlier Write-only instruction. Do not claim changed unless you actually changed the candidate.`;
    }
    try {
      try {
        const inputRevision = creatorSynthesisInputRevision([
            request.portfolioArtifactRef,
            request.portfolioAnnotationsArtifactRef ?? "annotations:missing",
            request.selectionArtifactRef,
            request.detailArtifactRef,
            effectiveRequest.reconstructionBatchArtifactRef,
            ...(researchBrief ? [`researchBriefSha256:${researchBrief.sha256}`] : []),
            ...(reuseBase ? ["mode:same_input_reuse", `reuseBaseSha256:${reuseBase.sourceSha256}`,
              `materialIndexSha256:${fileSha256(reuseMaterialIndexPath)}`] : ["mode:full"])
          ], loadedSkill);
        if (reuseBase) {
          await runSynthesisChild({
            creatorRunId: request.creatorRunId, prompt, outputDir, label: "synthesis", role: "creator_synthesis", inputRevision,
            outputFile: "research-draft.json",
            runtimeMetadata: { loadedSkill: loadedSkill.files.map(({ path: skillPath, sha256 }) => ({ path: skillPath, sha256 })),
              generatedWithLoadedSkill: true, reuseBaseSha256: reuseBase.sourceSha256,
              ...(researchBrief ? { researchBrief: { path: researchBrief.path, sha256: researchBrief.sha256 } } : {}) },
            requiredSkillFiles: loadedSkill.files.map((file) => file.path),
            observer: observeLifecycle, execution: this.execution
          });
          if (!fs.existsSync(researchDraftPath)) {
            return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
              failedGateIds: ["research_draft_output_missing"], message: "博主综合研究草稿没有生成结构化产物。" };
          }
          const draft = creatorSynthesisResearchDraftSchema.parse(JSON.parse(fs.readFileSync(researchDraftPath, "utf8")) as unknown);
          const synthesis = assembleReuseCandidate({ request: effectiveRequest, base: reuseBase, draft,
            ...(this.execution.repairFindings === undefined ? { reconstructionBatch } : {}) });
          fs.writeFileSync(synthesisPath, JSON.stringify(synthesis, null, 2));
          fs.writeFileSync(path.join(outputDir, "creator-analysis-provenance.json"), JSON.stringify(reuseProvenance({
            base: reuseBase, materialIndexPath: reuseMaterialIndexPath, materialIndexSha256: fileSha256(reuseMaterialIndexPath),
            draftPath: researchDraftPath, draftSha256: fileSha256(researchDraftPath),
            loadedSkill: loadedSkill.files.map(({ path: skillPath, sha256 }) => ({ path: skillPath, sha256 }))
          }), null, 2));
        } else if (preparedCandidatePath) {
          const prepared = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(preparedCandidatePath, "utf8")) as unknown);
          assertPreparedSynthesisInputs(prepared, effectiveRequest);
          validateClassification(prepared);
          assertValidCrossPostResearch({
            selection: this.artifacts.read(request.selectionArtifactRef),
            batch: this.artifacts.read(effectiveRequest.reconstructionBatchArtifactRef),
            synthesis: prepared
          });
          fs.copyFileSync(preparedCandidatePath, synthesisPath);
          fs.writeFileSync(path.join(outputDir, "creator-analysis-provenance.json"), JSON.stringify({
            source: "prepared_candidate",
            sourcePath: path.resolve(preparedCandidatePath),
            sourceSha256: fileSha256(preparedCandidatePath),
            inputRevision,
            loadedSkill: loadedSkill.files.map(({ path: skillPath, sha256 }) => ({ path: skillPath, sha256 })),
            generatedWithLoadedSkill: false,
            importedAt: new Date().toISOString()
          }, null, 2));
        } else {
          await runSynthesisChild({
            creatorRunId: request.creatorRunId,
            prompt,
            outputDir,
            label: "synthesis",
            role: "creator_synthesis",
            inputRevision,
            runtimeMetadata: {
              loadedSkill: loadedSkill.files.map(({ path: skillPath, sha256 }) => ({ path: skillPath, sha256 })),
              generatedWithLoadedSkill: true,
              ...(researchBrief ? { researchBrief: { path: researchBrief.path, sha256: researchBrief.sha256 } } : {})
            },
            observer: observeLifecycle, execution: this.execution
          });
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/^(PREPARED_SYNTHESIS_|cross_post_research_|portfolio_classification_)/.test(message)) throw error;
        if (/ENOENT|not found|authentication|unauthorized/i.test(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
        throw new Error("CODEX_SYNTHESIS_RUNNER_FAILED");
      }
      if (!fs.existsSync(synthesisPath)) return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
        failedGateIds: ["synthesis_output_missing"], message: "博主归纳没有生成结构化产物。" };
      const synthesis = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(synthesisPath, "utf8")) as unknown);
      validateClassification(synthesis);
      assertValidCrossPostResearch({
        selection: this.artifacts.read(request.selectionArtifactRef),
        batch: this.artifacts.read(effectiveRequest.reconstructionBatchArtifactRef),
        synthesis
      });
      const synthesisRef = this.artifacts.write(
        request.creatorRunId,
        "creator-analysis.json",
        synthesis,
        [request.portfolioArtifactRef, ...(request.portfolioAnnotationsArtifactRef ? [request.portfolioAnnotationsArtifactRef] : []), request.selectionArtifactRef,
          request.detailArtifactRef, effectiveRequest.reconstructionBatchArtifactRef]
      );
      if (this.execution.phase === "build") {
        return { state: "not_ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: null,
          failedGateIds: ["evaluation_not_requested"], message: "候选已完成，等待独立评估" };
      }
      const candidateRevisionFingerprint = fileSha256(synthesisPath);
      const evaluatorRunId = crypto.randomUUID();
      const specificityDiagnostics = diagnoseCrossPostSpecificity(synthesis.crossPostResearch!);
      const specificityDiagnosticsPath = path.join(outputDir, "cross-post-specificity-diagnostics.json");
      fs.writeFileSync(specificityDiagnosticsPath, JSON.stringify({
        schemaVersion: "cross-post-specificity-diagnostics@1",
        candidateRevisionFingerprint,
        diagnostics: specificityDiagnostics
      }, null, 2));
      const evaluatorPrompt = `
You are a fresh independent evaluator for a creator research synthesis. You did not create the candidate and must not modify it.

Pinned candidate revision: ${candidateRevisionFingerprint}
Candidate: ${synthesisPath}
Portfolio: ${artifactPath(request.portfolioArtifactRef)}
Every-post surface annotations: ${request.portfolioAnnotationsArtifactRef ? artifactPath(request.portfolioAnnotationsArtifactRef) : "not available"}
Frozen observed corpus: ${corpusPath}
Canonical selection: ${artifactPath(request.selectionArtifactRef)}
Public details: ${artifactPath(request.detailArtifactRef)}
Validated reconstruction batch: ${artifactPath(effectiveRequest.reconstructionBatchArtifactRef)}
Asset path contract: ${sourcePathInstructions}
Candidate artifact reference for citations: ${synthesisRef}
${creatorSynthesisSpecificityReviewInstructions(specificityDiagnosticsPath)}
Use the exact registered candidate reference above in evidenceRefs (optionally followed by a valid JSON pointer). Do not invent an unversioned creator-analysis.json alias. For other inputs, use their exact pinned artifact references.

Independently verify exactly these seven hard gates without averaging:
canonical_21_coverage, deep_9_ready, deep_evidence_binding, three_tiers_present, evidence_classification, research_creation_separation, backend_metrics_unknown.
As part of deep_evidence_binding and evidence_classification, independently review crossPostResearch: it must contain the five distinct required sections; use every built deep sample from the pinned batch somewhere; bind each deep observation only to that post's own reconstruction; cite only selected post IDs; distinguish support from real counterexamples; explicitly state the boundary when no counterexample is available; preserve uncertainty; and use natural Chinese for all reader-facing claims. Evaluate the cross-post conclusions against the existing reconstructions. Do not ask for or create fresh per-post summaries and do not modify an individual Builder artifact.
Interpret deep_9_ready as a historical identifier, not a requirement for nine unique videos: high, median-near, mean-near, and low must each retain three registered group memberships and overlapping posts are analyzed once. Normally every unique registered deep candidate must be batch-ready. The only bounded exception is when the batch explicitly contains bounded_media_retry_once, every non-ready item is blocked solely by media_verification, and each of the four groups still has at least one batch-ready video; then pass with the exact unavailable IDs and coverage caveat, without inventing their video contents.
For deep_evidence_binding, inspect that every batch-ready deep row cites its reconstruction and independent evaluation and preserves evaluationPolicy provenance. A bounded media-unavailable deep row must be surface_only, cite only public detail/selection evidence, and explicitly state that video content is unknown. Under single_pass, failedGateIds on a batch-ready row are quality warnings and must remain explicit limitations; they do not make the row not ready. Fail for missing/unreadable/corrupt ready artifacts, missing deep-row bindings, invented claims for unavailable media, or missing mixed-policy/bounded-media boundaries. Do not reapply legacy iterative hard gates to single-pass rows.
Surface-only rows may not borrow deep evidence. Public likes never prove exposure, completion rate, conversion, ads, or sales. Reject any advice about what we should copy, publish, title, cover, test, or launch.
Under evidence_classification, inspect portfolioClassification independently: it must cover every ID in the frozen corpus exactly once; use an open coherent registry rather than a hidden fixed taxonomy; allow multiple memberships and honest zero-membership unknowns; keep topic, format and commercial_signal distinct. labelRegistry evidenceRefs may cite only the frozen corpus or pinned reconstructions, never annotations. Bind surface_title only to that post's own corpus title/visibleText, except an axis=format membership may cite that own row's mediaType solely as video/image media evidence, never editing style or content. Bind deep_builder only to that post's own reconstruction. Reject identity-only inference, synonym duplication, cross-post evidence borrowing, and any commercial claim stronger than its cited visible wording.
Write every human-readable message in concise, natural Chinese. Keep gate IDs, schema values and artifact refs unchanged in English.

Write only ${evaluationPath} as:
{"schemaVersion":"creator-synthesis-independent-evaluation@1","creatorRunId":"${request.creatorRunId}","candidateRevisionFingerprint":"${candidateRevisionFingerprint}","evaluatorRunId":"${evaluatorRunId}","independentOfCandidate":true,"evaluatedAt":"ISO timestamp","gates":[{"id":"one required id","pass":true,"message":"specific finding","evidenceRefs":["resolvable artifact ref"]}]}
Include every required gate exactly once. Do not create or modify the final gate artifact.
`;
      try {
        await runSynthesisChild({
          creatorRunId: request.creatorRunId,
          prompt: evaluatorPrompt,
          outputDir,
          label: "synthesis-evaluator",
          role: "creator_synthesis_evaluator",
          inputRevision: candidateRevisionFingerprint,
          requiredSkillFiles: [path.join(projectRoot, ".agents", "skills", "creator-synthesis", "SKILL.md"),
            path.join(projectRoot, ".agents", "skills", "creator-synthesis", "references", "method.md"),
            path.join(projectRoot, "packages", "research", "src", "creator-synthesis", "contracts.ts")],
          runtimeMetadata: {
            loadedSkill: loadedSkill.files.map(({ path: skillPath, sha256 }) => ({ path: skillPath, sha256 })),
            specificityDiagnostics: { path: specificityDiagnosticsPath, count: specificityDiagnostics.length }
          },
          observer: observeLifecycle, execution: this.execution
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
        selection: this.artifacts.read(request.selectionArtifactRef), batch: this.artifacts.read(effectiveRequest.reconstructionBatchArtifactRef),
        synthesis, checkedAt: new Date().toISOString() });
      const evaluationRef = this.artifacts.write(
        request.creatorRunId,
        "creator-synthesis-evaluation.json",
        independentEvaluation,
        [synthesisRef, request.selectionArtifactRef, effectiveRequest.reconstructionBatchArtifactRef]
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
        ?? message.match(/portfolio_classification_[a-z0-9_]+/)?.[0]
        ?? (message.startsWith("PREPARED_SYNTHESIS_") ? message : null);
      return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|authentication|unauthorized/i.test(message)
        ? { state: "blocked" as const, message, userActionRequired: true }
        : { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
          failedGateIds: [crossPostFailure ?? "synthesis_execution"], message };
    }
  }
}
