import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { artifactPath } from "../../core/artifacts.js";
import { LocalCreatorArtifactStore } from "../artifacts/local-creator-artifact-store.js";
import { sourceDigest } from "../artifacts/report-source-revision.js";
import { assertPreparedSynthesisInputs, prepareCreatorSynthesisBatch,
  creatorSynthesisInputRevision, creatorSynthesisSkillPrompt, creatorSynthesisSpecificityReviewInstructions,
  loadCreatorSynthesisSkill, resolveCreatorSynthesisReusePath,
  runSynthesisChild, synthesisSourcePathInstructions } from "./codex-creator-synthesis-executor.js";

const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
const previousRevisions = process.env.SELF_MEDIA_REPORT_REVISIONS_DIR;
const previousCodexBinary = process.env.SELF_MEDIA_CODEX_BIN;
const previousTraceArgsPath = process.env.TRACE_ARGS_PATH;
const previousTraceFailure = process.env.TRACE_FAILURE;
const previousEphemeral = process.env.SELF_MEDIA_CODEX_EPHEMERAL;
let temporaryRoot: string | null = null;

afterEach(() => {
  if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = null;
  if (previousRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
  else process.env.SELF_MEDIA_RUNTIME_DIR = previousRuntime;
  if (previousRevisions === undefined) delete process.env.SELF_MEDIA_REPORT_REVISIONS_DIR;
  else process.env.SELF_MEDIA_REPORT_REVISIONS_DIR = previousRevisions;
  if (previousCodexBinary === undefined) delete process.env.SELF_MEDIA_CODEX_BIN;
  else process.env.SELF_MEDIA_CODEX_BIN = previousCodexBinary;
  if (previousTraceArgsPath === undefined) delete process.env.TRACE_ARGS_PATH;
  else process.env.TRACE_ARGS_PATH = previousTraceArgsPath;
  if (previousTraceFailure === undefined) delete process.env.TRACE_FAILURE;
  else process.env.TRACE_FAILURE = previousTraceFailure;
  if (previousEphemeral === undefined) delete process.env.SELF_MEDIA_CODEX_EPHEMERAL;
  else process.env.SELF_MEDIA_CODEX_EPHEMERAL = previousEphemeral;
});

it("routes an SDK repair through the strongly bound research-only reuse base without an environment switch", () => {
  const priorCandidatePath = "/frozen/prior-candidate.json";
  expect(resolveCreatorSynthesisReusePath({
    executionMode: "sdk",
    priorCandidatePath,
    repairFindings: { gates: ["deep_evidence_binding"] }
  }, {})).toBe(priorCandidatePath);
  expect(resolveCreatorSynthesisReusePath({ executionMode: "sdk" }, {
    SELF_MEDIA_CREATOR_SYNTHESIS_REUSE_PATH: "/ambient/should-not-be-used.json"
  })).toBeUndefined();
});

it("instructs the independent reviewer to judge every specificity signal without mechanical failure", () => {
  const instructions = creatorSynthesisSpecificityReviewInstructions("/attempt/cross-post-specificity-diagnostics.json");
  expect(instructions).toContain("/attempt/cross-post-specificity-diagnostics.json");
  expect(instructions).toContain("Read every diagnostic");
  expect(instructions).toContain("explicitly state in the relevant gate message");
  expect(instructions).toContain("not automatic failures");
});

it("materializes a revision-bound synthesis batch and invalidates only its stale evaluation", () => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creator-synthesis-revisions-"));
  process.env.SELF_MEDIA_RUNTIME_DIR = path.join(temporaryRoot, "runtime");
  process.env.SELF_MEDIA_REPORT_REVISIONS_DIR = path.join(temporaryRoot, "revisions");
  const runId = "11111111-1111-4111-8111-111111111111";
  const artifacts = new LocalCreatorArtifactStore();
  const original = { schemaVersion: "fixture", builderLenses: { contentRestoration: { blocks: [{ body: "旧知识" }] } } };
  const originalRef = artifacts.write(runId, "original-reconstruction.json", original);
  const revised = { ...original, builderLenses: { contentRestoration: { blocks: [{ body: "修订后的五项能力" }] } } };
  const originalBytes = fs.readFileSync(artifactPath(originalRef));
  const revisionDirectory = path.join(process.env.SELF_MEDIA_REPORT_REVISIONS_DIR, sourceDigest(originalBytes));
  fs.mkdirSync(revisionDirectory, { recursive: true });
  const revisedBytes = `${JSON.stringify(revised, null, 2)}\n`;
  fs.writeFileSync(path.join(revisionDirectory, "revised-source"), revisedBytes);
  fs.writeFileSync(path.join(revisionDirectory, "revision.json"), JSON.stringify({
    schemaVersion: "report-source-revision@1", revisionId: "knowledge-restoration", reason: "核对冻结来源",
    originalSha256: sourceDigest(originalBytes), revisedSha256: sourceDigest(revisedBytes)
  }));
  const batchRef = artifacts.write(runId, "batch.json", {
    schemaVersion: "1.0.0", creatorRunId: runId, revision: 1, generatedAt: "2026-09-14T00:00:00.000Z",
    requestedPosts: 1, builtPosts: 1, verifiedPosts: 1, readyPosts: 1, pendingPosts: 0, failedPosts: 0,
    limitations: [], items: [{ postExternalId: "post-1", tier: "high", tierRank: 1, state: "ready",
      evaluationPolicy: "single_pass@37a03aae", sourceMediaArtifactRef: null, reconstructionArtifactRef: originalRef,
      articleArtifactRef: null, builderValidationArtifactRef: null, evaluationArtifactRef: "/evaluation/old.json",
      gateReportArtifactRef: "/gate/old.json", threeLensEvaluationArtifactRef: "/evaluation/three.json",
      threeLensGateReportArtifactRef: "/gate/three.json", failedGateIds: ["old-warning"],
      researchReview: { schemaVersion: "research-review-state@1", reviewStatus: "completed_no_findings",
        candidateStatus: "original_reviewed", reviewArtifactRef: "/review/old.json", revisionRecordArtifactRef: null,
        candidateReportSha256: "a".repeat(64) }, message: "旧评估", updatedAt: "2026-09-14T00:00:00.000Z" }]
  });
  const effectiveRef = prepareCreatorSynthesisBatch(artifacts, {
    creatorRunId: runId, creatorName: "fixture", portfolioArtifactRef: "/portfolio.json",
    selectionArtifactRef: "/selection.json", detailArtifactRef: "/details.json",
    reconstructionBatchArtifactRef: batchRef, mode: "provisional"
  });
  expect(effectiveRef).not.toBe(batchRef);
  expect(prepareCreatorSynthesisBatch(artifacts, {
    creatorRunId: runId, creatorName: "fixture", portfolioArtifactRef: "/portfolio.json",
    selectionArtifactRef: "/selection.json", detailArtifactRef: "/details.json",
    reconstructionBatchArtifactRef: batchRef, mode: "provisional"
  })).toBe(effectiveRef);
  const effective = artifacts.read(effectiveRef) as { readyPosts: number; items: Array<Record<string, unknown>> };
  expect(effective.readyPosts).toBe(0);
  expect(effective.items[0]).toMatchObject({ state: "built_unevaluated", evaluationArtifactRef: null,
    gateReportArtifactRef: null, failedGateIds: [], researchReview: null });
  const revisedRef = effective.items[0]?.reconstructionArtifactRef as string;
  expect(artifacts.read(revisedRef)).toEqual(revised);
  expect(artifacts.read(originalRef)).toEqual(original);
});

it("rejects a prepared candidate pinned to the stale source batch", () => {
  const request = { creatorRunId: "11111111-1111-4111-8111-111111111111", creatorName: null,
    portfolioArtifactRef: "/portfolio.json", portfolioAnnotationsArtifactRef: null,
    selectionArtifactRef: "/selection.json", detailArtifactRef: "/details.json",
    reconstructionBatchArtifactRef: "/effective-batch.json", mode: "provisional" as const };
  expect(() => assertPreparedSynthesisInputs({ creatorRunId: request.creatorRunId, inputs: {
    portfolioArtifactRef: request.portfolioArtifactRef, portfolioAnnotationsArtifactRef: null,
    selectionArtifactRef: request.selectionArtifactRef, detailArtifactRef: request.detailArtifactRef,
    reconstructionBatchArtifactRef: "/stale-batch.json"
  } }, request)).toThrow("PREPARED_SYNTHESIS_INPUT_MISMATCH");
});

it("keeps revised prose authoritative while mapping relative assets through the original post directory", () => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creator-synthesis-path-contract-"));
  process.env.SELF_MEDIA_RUNTIME_DIR = temporaryRoot;
  const runId = "11111111-1111-4111-8111-111111111111";
  const originalRef = `/artifacts/${runId}/video-reconstruction-batch-r14.json`;
  const effectiveRef = `/artifacts/${runId}/creator-synthesis-input-batch.json`;
  const instructions = synthesisSourcePathInstructions(originalRef, effectiveRef);
  expect(instructions).toContain(artifactPath(effectiveRef));
  expect(instructions).toContain(artifactPath(originalRef));
  expect(instructions).toContain("same postExternalId");
  expect(instructions).toContain("only as an asset-base mapping");
  expect(instructions).toContain("do not use its reconstruction prose");
});

it("fails explicitly when the mandatory project method is absent", () => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creator-synthesis-skill-missing-"));
  expect(() => loadCreatorSynthesisSkill(temporaryRoot!)).toThrow("CREATOR_SYNTHESIS_SKILL_MISSING");
});

it("records method digests in the revision and injects the exact loaded files into the Builder prompt", () => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creator-synthesis-skill-load-"));
  const skillRoot = path.join(temporaryRoot, ".agents", "skills", "creator-synthesis");
  fs.mkdirSync(path.join(skillRoot, "references"), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, "SKILL.md"), "# Creator synthesis\nUse evidence.");
  fs.writeFileSync(path.join(skillRoot, "references", "method.md"), "Method version one.");
  const first = loadCreatorSynthesisSkill(temporaryRoot!);
  const firstRevision = creatorSynthesisInputRevision(["pinned-input"], first);
  const prompt = creatorSynthesisSkillPrompt(first);
  expect(prompt).toContain(path.join(skillRoot, "SKILL.md"));
  expect(prompt).toContain(path.join(skillRoot, "references", "method.md"));
  expect(prompt).toContain("Use evidence.");
  expect(prompt).toContain("Method version one.");
  expect(prompt).toContain(first.files[0]!.sha256);

  fs.writeFileSync(path.join(skillRoot, "references", "method.md"), "Method version two.");
  const second = loadCreatorSynthesisSkill(temporaryRoot!);
  expect(second.files[1]!.sha256).not.toBe(first.files[1]!.sha256);
  expect(creatorSynthesisInputRevision(["pinned-input"], second)).not.toBe(firstRevision);
});

it("keeps each Codex child attempt private, streamed, and reviewable after success or failure", async () => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "creator-synthesis-traces-"));
  const runtime = path.join(temporaryRoot, "runtime");
  const outputDir = path.join(runtime, "runs", "creator-run", "creator-synthesis");
  const fakeCodex = path.join(temporaryRoot, "fake-codex.mjs");
  const argsPath = path.join(temporaryRoot, "args.json");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(fakeCodex, `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
fs.writeFileSync(process.env.TRACE_ARGS_PATH, JSON.stringify(process.argv.slice(2)));
const outputDir = process.argv[process.argv.indexOf("-C") + 1];
const lastMessage = process.argv[process.argv.indexOf("-o") + 1];
const candidatePath = path.join(outputDir, "creator-analysis.json");
const candidateText = fs.existsSync(candidatePath) ? "candidate-2" : "candidate-1";
fs.writeFileSync(candidatePath, candidateText);
fs.writeFileSync(lastMessage, "last-message-" + candidateText);
process.stdout.write('{"type":"item.completed"}\\n');
process.stderr.write('fake stderr\\n');
process.exit(process.env.TRACE_FAILURE === "true" ? 7 : 0);
`);
  fs.chmodSync(fakeCodex, 0o755);
  process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
  process.env.SELF_MEDIA_CODEX_BIN = fakeCodex;
  process.env.TRACE_ARGS_PATH = argsPath;
  delete process.env.SELF_MEDIA_CODEX_EPHEMERAL;
  const base = {
    creatorRunId: "creator-run", prompt: "actual synthesis prompt", outputDir, label: "synthesis",
    role: "creator_synthesis" as const, inputRevision: "revision-1"
  };

  await runSynthesisChild(base);
  const firstRuntime = JSON.parse(fs.readFileSync(path.join(outputDir, "synthesis-runtime.json"), "utf8")) as { tracePath: string };
  expect(firstRuntime.tracePath).toContain(path.join(runtime, "executor-traces", "creator-synthesis", "creator-run"));
  expect(firstRuntime.tracePath).not.toContain(path.join(runtime, "runs"));
  expect(fs.readFileSync(path.join(firstRuntime.tracePath, "prompt.txt"), "utf8")).toBe(base.prompt);
  expect(fs.readFileSync(path.join(firstRuntime.tracePath, "events.jsonl"), "utf8")).toContain("item.completed");
  expect(fs.readFileSync(path.join(firstRuntime.tracePath, "stderr.log"), "utf8")).toContain("fake stderr");
  expect(fs.readFileSync(path.join(firstRuntime.tracePath, "outputs", "creator-analysis.json"), "utf8")).toBe("candidate-1");
  expect(fs.readFileSync(path.join(firstRuntime.tracePath, "outputs", "synthesis-last-message.txt"), "utf8")).toBe("last-message-candidate-1");
  expect(JSON.parse(fs.readFileSync(path.join(firstRuntime.tracePath, "output-snapshot.json"), "utf8"))).toMatchObject({
    outputs: [{ name: "creator-analysis.json", state: "created" }, { name: "synthesis-last-message.txt", state: "created" }]
  });
  expect(JSON.parse(fs.readFileSync(path.join(firstRuntime.tracePath, "terminal.json"), "utf8"))).toMatchObject({ state: "completed" });
  expect(JSON.parse(fs.readFileSync(argsPath, "utf8"))).toContain("--json");
  expect(JSON.parse(fs.readFileSync(argsPath, "utf8"))).toContain("--ephemeral");
  expect(JSON.parse(fs.readFileSync(path.join(firstRuntime.tracePath, "runtime.json"), "utf8"))).toMatchObject({
    sessionMode: "ephemeral", command: fakeCodex, executionMode: "cli",
    sdkVersion: "0.154.0", codexRuntimeVersion: expect.any(String)
  });

  process.env.TRACE_FAILURE = "true";
  await expect(runSynthesisChild({ ...base, inputRevision: "revision-2" })).rejects.toThrow("process_exit_7");
  const secondRuntime = JSON.parse(fs.readFileSync(path.join(outputDir, "synthesis-runtime.json"), "utf8")) as { tracePath: string };
  expect(secondRuntime.tracePath).not.toBe(firstRuntime.tracePath);
  expect(fs.existsSync(path.join(firstRuntime.tracePath, "terminal.json"))).toBe(true);
  expect(JSON.parse(fs.readFileSync(path.join(secondRuntime.tracePath, "terminal.json"), "utf8"))).toMatchObject({
    state: "failed", error: { message: "process_exit_7" }
  });
  expect(fs.readFileSync(path.join(secondRuntime.tracePath, "outputs", "creator-analysis.json"), "utf8")).toBe("candidate-2");
  expect(fs.readFileSync(path.join(firstRuntime.tracePath, "outputs", "creator-analysis.json"), "utf8")).toBe("candidate-1");
  expect(JSON.parse(fs.readFileSync(path.join(secondRuntime.tracePath, "output-snapshot.json"), "utf8"))).toMatchObject({
    outputs: [{ name: "creator-analysis.json", state: "changed" }, { name: "synthesis-last-message.txt", state: "changed" }]
  });
});
