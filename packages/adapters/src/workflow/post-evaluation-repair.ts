import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runtimeDir } from "../core/config.js";
import {
  candidateArtifactFingerprints,
  evaluatorContractSnapshots,
  evaluatorPrompt,
  evaluateRuntimeThreeLens,
  validateEvaluationArtifacts
} from "../platform/video/codex-video-reconstruction-executor.js";
import {
  attachVerifiedSkillSnapshots,
  codexInstalledVersions,
  defaultCodexSdkFactory,
  invokeCodexSdk,
  type CodexSdkFactory
} from "./codex-sdk-runner.js";

type GateReport = { ready?: boolean; failedGateIds?: string[] };

export type PostEvaluationRepairRequest = {
  candidateSha256: string;
  candidateDirectory: string;
  sourceVideoPath: string;
  invalidEvaluationPath: string;
  validationDetails: unknown;
  source: string;
  outputDirectory: string;
  childRunId?: string;
  candidateArtifactRef?: string;
  evaluationArtifactRef?: (attemptDirectory: string) => string;
  signal: AbortSignal;
  sdkFactory?: CodexSdkFactory;
  timeoutMs?: number;
  validate?: (candidateDirectory: string, evaluationDirectory: string) => Promise<GateReport>;
  buildRuntimeThreeLens?: (candidateDirectory: string, evaluationDirectory: string, evaluatorRunId: string) => Promise<{
    ready?: boolean; failedGateIds?: string[]; uncheckedGateIds?: string[];
  }>;
};

export type PostEvaluationRepairResult = {
  state: "valid" | "needs_review";
  route: "deliver" | "repair_post";
  attemptDirectory: string;
  privateTraceDirectory: string;
  evaluationPath: string;
  gatePath: string;
  runtimeThreeLensEvaluationPath: string;
  runtimeThreeLensGatePath: string;
  runtimeThreeLensGate: { ready?: boolean; failedGateIds?: string[]; uncheckedGateIds?: string[] };
  priorEvaluationPath: string | null;
  candidateSha256: string;
  priorEvaluationSha256: string | null;
  diagnosticPaths: string[];
  childRunId: string;
  gate: GateReport;
};

function sha256(file: string): string { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function exists(file: string): boolean { return fs.existsSync(file) && fs.statSync(file).isFile(); }
function writePrivate(file: string, value: string): void { fs.writeFileSync(file, value, { mode: 0o600 }); fs.chmodSync(file, 0o600); }
function appendPrivate(file: string, value: string): void { fs.appendFileSync(file, value, { mode: 0o600 }); fs.chmodSync(file, 0o600); }

function repairPrompt(input: PostEvaluationRepairRequest, attemptDirectory: string, priorCopy: string | null,
  fingerprints: Record<string, string>): string {
  return `${evaluatorPrompt(input.sourceVideoPath, input.candidateDirectory, input.candidateSha256, fingerprints, attemptDirectory)}

This is a narrowly scoped evaluator-contract repair in a fresh independent thread. The prior invalid evaluator output below is an approved diagnostic input, despite the ordinary evaluator prohibition on prior evaluations:
Prior invalid evaluation copy: ${priorCopy ?? "none"}
Reported contract error details: ${JSON.stringify(input.validationDetails)}
Error source: ${input.source}

Repair only evaluator artifacts. The candidate, evidence, media-preparation, transcript, reconstruction, article, and all candidate files are read-only. Do not invoke a Builder, alter candidate facts or conclusions, suppress a finding, or turn a failed gate into a pass. When an invalid evaluator relation or evidence reference caused the contract error, re-express that evaluator finding using only a legal reference supported by the immutable candidate; otherwise keep it as an explicit finding or unknown.
`;
}

/**
 * Produces a new evaluator-only artifact directory. It never overwrites the
 * prior evaluation or the Builder candidate, and a non-ready gate remains a
 * repair result rather than a promoted delivery.
 */
export async function repairPostEvaluation(input: PostEvaluationRepairRequest): Promise<PostEvaluationRepairResult> {
  if (!/^[a-f0-9]{64}$/.test(input.candidateSha256)) throw new Error("POST_EVALUATION_REPAIR_CANDIDATE_SHA_REQUIRED");
  const reconstruction = path.join(input.candidateDirectory, "reconstruction.json");
  if (!exists(reconstruction) || sha256(reconstruction) !== input.candidateSha256) throw new Error("POST_EVALUATION_REPAIR_CANDIDATE_MISMATCH");
  if (!exists(input.invalidEvaluationPath)) throw new Error("POST_EVALUATION_REPAIR_PRIOR_MISSING");
  const attemptId = crypto.randomUUID();
  const childRunId = input.childRunId ?? crypto.randomUUID();
  const attemptDirectory = path.join(input.outputDirectory, "evaluation-repairs", attemptId);
  const privateTraceDirectory = path.join(runtimeDir(), "worker-traces", childRunId);
  fs.mkdirSync(attemptDirectory, { recursive: true, mode: 0o700 });
  fs.mkdirSync(privateTraceDirectory, { recursive: true, mode: 0o700 });
  const priorCopy = path.join(attemptDirectory, "prior-invalid-evaluation.json");
  fs.copyFileSync(input.invalidEvaluationPath, priorCopy);
  const priorEvaluationSha256 = sha256(priorCopy);
  if (priorEvaluationSha256 !== sha256(input.invalidEvaluationPath)) throw new Error("POST_EVALUATION_REPAIR_PRIOR_COPY_MISMATCH");
  const fingerprints = candidateArtifactFingerprints(input.candidateDirectory);
  const skill = attachVerifiedSkillSnapshots(repairPrompt(input, attemptDirectory, priorCopy, fingerprints),
    evaluatorContractSnapshots().map((snapshot) => snapshot.path), { outputDirectory: attemptDirectory });
  const prompt = skill.prompt;
  writePrivate(path.join(privateTraceDirectory, "prompt.txt"), prompt);
  writePrivate(path.join(privateTraceDirectory, "runtime.json"), `${JSON.stringify({
    schemaVersion: "post-evaluation-repair-runtime@1", attemptId, childRunId, model: "gpt-5.6-luna", reasoningEffort: "medium",
    candidateSha256: input.candidateSha256, source: input.source, loadedMethodFiles: evaluatorContractSnapshots(),
    skillLoad: skill.receipt, ...codexInstalledVersions(), startedAt: new Date().toISOString()
  }, null, 2)}\n`);
  const eventsPath = path.join(privateTraceDirectory, "events.jsonl");
  let invocationFailure: unknown;
  let evaluatorRunId = "unknown";
  try {
    const result = await invokeCodexSdk(input.sdkFactory ?? defaultCodexSdkFactory, { prompt, outputDir: attemptDirectory, role: "post-evaluation-repair",
      model: "gpt-5.6-luna", reasoningEffort: "medium", signal: input.signal, timeoutMs: input.timeoutMs,
      observer: (event) => appendPrivate(eventsPath, `${JSON.stringify(event)}\n`),
      codexOptions: undefined, threadOptions: { sandboxMode: "workspace-write", approvalPolicy: "never" }
    });
    evaluatorRunId = result.threadId ?? "unknown";
    writePrivate(path.join(privateTraceDirectory, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    invocationFailure = error;
    writePrivate(path.join(privateTraceDirectory, "failure.json"), `${JSON.stringify({
      message: error instanceof Error ? error.message : "unknown"
    }, null, 2)}\n`);
  }
  const candidateUnchanged = JSON.stringify(fingerprints) === JSON.stringify(candidateArtifactFingerprints(input.candidateDirectory));
  const priorUnchanged = priorEvaluationSha256 === sha256(priorCopy) && priorEvaluationSha256 === sha256(input.invalidEvaluationPath);
  writePrivate(path.join(privateTraceDirectory, "immutable-inputs.json"), `${JSON.stringify({
    candidateUnchanged, priorUnchanged, candidateFingerprints: fingerprints, priorEvaluationSha256
  }, null, 2)}\n`);
  if (!candidateUnchanged) {
    throw new Error("POST_EVALUATION_REPAIR_MUTATED_CANDIDATE");
  }
  if (!priorUnchanged) throw new Error("POST_EVALUATION_REPAIR_MUTATED_PRIOR");
  if (invocationFailure) throw invocationFailure;
  const evaluationPath = path.join(attemptDirectory, "evaluation.json");
  if (!exists(evaluationPath)) throw new Error("POST_EVALUATION_REPAIR_OUTPUT_MISSING");
  const gate = await (input.validate ?? validateEvaluationArtifacts)(input.candidateDirectory, attemptDirectory);
  const gatePath = path.join(attemptDirectory, "gate-report.json");
  if (!exists(gatePath)) throw new Error("POST_EVALUATION_REPAIR_GATE_MISSING");
  const evaluationArtifactRef = input.evaluationArtifactRef?.(attemptDirectory) ?? evaluationPath;
  const runtimeThreeLensGate = input.buildRuntimeThreeLens
    ? await input.buildRuntimeThreeLens(input.candidateDirectory, attemptDirectory, evaluatorRunId)
    : await evaluateRuntimeThreeLens(input.candidateDirectory, attemptDirectory,
      "post-evaluation-repair", input.candidateArtifactRef ?? reconstruction, evaluationArtifactRef, evaluatorRunId);
  const runtimeThreeLensEvaluationPath = path.join(attemptDirectory, "runtime-three-lens-evaluation.json");
  const runtimeThreeLensGatePath = path.join(attemptDirectory, "runtime-three-lens-gate-report.json");
  const diagnostic = path.join(attemptDirectory, "repair-diagnostic.json");
  fs.writeFileSync(diagnostic, `${JSON.stringify({
    schemaVersion: "post-evaluation-repair-diagnostic@1", candidateSha256: input.candidateSha256,
    priorEvaluationSha256, validationDetails: input.validationDetails, source: input.source,
    gateReady: gate.ready === true, failedGateIds: gate.failedGateIds ?? []
  }, null, 2)}\n`, { mode: 0o600 });
  return { state: "valid", route: gate.ready === true ? "deliver" : "repair_post", attemptDirectory,
    privateTraceDirectory, evaluationPath, gatePath, priorEvaluationPath: priorCopy, candidateSha256: input.candidateSha256,
    priorEvaluationSha256, diagnosticPaths: [priorCopy, diagnostic], gate, childRunId, runtimeThreeLensEvaluationPath,
    runtimeThreeLensGatePath, runtimeThreeLensGate };
}
