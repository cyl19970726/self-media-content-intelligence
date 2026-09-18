import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { runWorkflow, workflow, workflowFingerprint, type AgentRunner } from "@signal-room/workflow";
import { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";
import { artifactRef, writeArtifact } from "../core/artifacts.js";
import { creatorReviewRoute, ProductionResearchRunner } from "./production-research-runner.js";
import { materializeBoundReview } from "./post-repair-review-input.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const digest = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

describe("ProductionResearchRunner evaluation repair dispatch", () => {
  it("uses the injected evaluator-only repair runner and emits the public lifecycle summary", async () => {
    const runtime = fs.mkdtempSync(path.join(os.tmpdir(), "production-evaluation-repair-"));
    roots.push(runtime);
    const oldRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
    const runId = "11111111-1111-4111-8111-111111111111";
    const candidateRef = artifactRef(runId, "candidate/reconstruction.json");
    const sourceRef = artifactRef(runId, "source.mp4");
    const invalidRef = artifactRef(runId, "candidate/evaluation.json");
    fs.mkdirSync(path.join(runtime, "runs", runId, "candidate"), { recursive: true });
    writeArtifact(runId, "candidate/reconstruction.json", { candidate: true });
    fs.writeFileSync(path.join(runtime, "runs", runId, "source.mp4"), "source");
    writeArtifact(runId, "candidate/evaluation.json", { invalid: "relation" });
    const prior = { kind: "post" as const, evidence: { id: "e", revision: "1", sha256: "e", type: "post-evidence", schemaVersion: "v1", uri: "x", producedBy: { workflowRunId: "w", stepRunId: "s", attemptId: "a" }, dependsOn: [], validation: "valid" as const },
      report: {}, reportArtifactRef: candidateRef, reportSha256: digest(path.join(runtime, "runs", runId, "candidate/reconstruction.json")), relativeRoot: "candidate",
      outcome: { state: "built_unevaluated", reconstructionArtifactRef: candidateRef, articleArtifactRef: null,
        builderValidationArtifactRef: artifactRef(runId, "candidate/builder-validation.json"), evaluationMode: "failed" as const } };
    const repairCalls: unknown[] = [];
    const artifacts = { read: (ref: string) => ({ ref }) };
    const runner = new ProductionResearchRunner({} as never, artifacts as never, async (input) => {
      repairCalls.push(input);
      const attempt = path.join(runtime, "runs", runId, "workflow-reconstructions", "workflow", "attempt", "post", "evaluation-repairs", "repair");
      fs.mkdirSync(attempt, { recursive: true });
      for (const name of ["evaluation.json", "gate-report.json", "runtime-three-lens-evaluation.json", "runtime-three-lens-gate-report.json", "prior-invalid-evaluation.json", "repair-diagnostic.json"]) fs.writeFileSync(path.join(attempt, name), "{}");
      return { state: "valid", route: "deliver", attemptDirectory: attempt, privateTraceDirectory: path.join(runtime, "worker-traces", "22222222-2222-4222-8222-222222222222"),
        evaluationPath: path.join(attempt, "evaluation.json"), gatePath: path.join(attempt, "gate-report.json"), runtimeThreeLensEvaluationPath: path.join(attempt, "runtime-three-lens-evaluation.json"), runtimeThreeLensGatePath: path.join(attempt, "runtime-three-lens-gate-report.json"),
        runtimeThreeLensGate: { ready: true }, priorEvaluationPath: path.join(attempt, "prior-invalid-evaluation.json"), candidateSha256: prior.reportSha256, priorEvaluationSha256: "old", diagnosticPaths: [path.join(attempt, "prior-invalid-evaluation.json"), path.join(attempt, "repair-diagnostic.json")], childRunId: "22222222-2222-4222-8222-222222222222", gate: { ready: true } };
    });
    const events: string[] = [];
    const request = { runId: "workflow", attemptId: "attempt", input: { candidate: prior as unknown, prior: { receipt: { artifact: { evaluationArtifactRef: invalidRef } } }, failure: { details: "relation" } },
      signal: new AbortController().signal, emit: async (event: string) => { events.push(event); } };
    const pinned = { source: { creatorRunId: runId, postExternalId: "post", sourceMediaArtifactRef: sourceRef } };
    const result = await (runner as unknown as { repairPostEvaluation: (request: unknown, pinned: unknown, prior: unknown) => Promise<{ route: string; candidateRevisionSha256: string }> })
      .repairPostEvaluation(request, pinned, prior);
    expect(repairCalls).toHaveLength(1);
    expect(result.route).toBe("deliver");
    expect(result.candidateRevisionSha256).toBe(prior.reportSha256);
    expect(events).toEqual(["agent.lifecycle", "agent.lifecycle", "agent.usage"]);
    if (oldRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR; else process.env.SELF_MEDIA_RUNTIME_DIR = oldRuntime;
  });
});

describe("core evidence count Builder recovery", () => {
  it("copies frozen candidate inputs, invokes the SDK Builder repair mode, and leaves the source unchanged", async () => {
    const runtime = fs.mkdtempSync(path.join(os.tmpdir(), "production-core-evidence-recovery-"));
    roots.push(runtime);
    const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
    const creatorRunId = "33333333-3333-4333-8333-333333333333";
    const runDirectory = path.join(runtime, "runs", creatorRunId);
    const sourcePath = path.join(runDirectory, "source.mp4");
    const candidateDirectory = path.join(runDirectory, "legacy-candidate");
    const sourceRef = artifactRef(creatorRunId, "source.mp4");
    const reconstructionRef = artifactRef(creatorRunId, "legacy-candidate/reconstruction.json");
    fs.mkdirSync(path.join(candidateDirectory, "evidence"), { recursive: true });
    fs.mkdirSync(path.join(candidateDirectory, "targeted-evidence"), { recursive: true });
    fs.writeFileSync(sourcePath, "immutable-source");
    fs.writeFileSync(path.join(candidateDirectory, "post-source-input.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "evidence/evidence-pack.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "probe.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "capture-protocol.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "targeted-evidence/targeted-evidence.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "reconstruction.json"), "{\"candidate\":true}");
    fs.writeFileSync(path.join(candidateDirectory, "evaluation.json"), "{\"predecessor\":true}");
    fs.writeFileSync(path.join(candidateDirectory, "gate-report.json"), "{\"ready\":false}");
    fs.writeFileSync(path.join(candidateDirectory, ".frozen-evidence"), "preserve this hidden candidate input");
    fs.mkdirSync(path.join(candidateDirectory, ".agents", "skills", "video-content-reconstruction"), { recursive: true });
    fs.writeFileSync(path.join(candidateDirectory, ".agents", "skills", "video-content-reconstruction", "SKILL.md"), "old staged method");
    fs.mkdirSync(path.join(candidateDirectory, "runtime-three-lens"));
    fs.writeFileSync(path.join(candidateDirectory, "runtime-three-lens/content-restoration.json"), "{\"old\":true}");
    fs.writeFileSync(path.join(candidateDirectory, "media-preparation.json"), JSON.stringify({ sourceMedia: { fingerprint: digest(sourcePath) },
      evidencePack: { path: path.join(candidateDirectory, "evidence/evidence-pack.json"), fingerprint: digest(path.join(candidateDirectory, "evidence/evidence-pack.json")) },
      transcript: { path: null, fingerprint: null } }));
    const sourceBefore = digest(sourcePath);
    const options: unknown[] = [];
    const events: Array<{ type: string; data: unknown }> = [];
    const factory = (option: unknown) => {
      options.push(option);
      return { reconstruct: async () => {
        const recoveryDirectory = path.join(runDirectory, "workflow-reconstructions", "builder-workflow", "builder-attempt", "post-1");
        expect(fs.existsSync(path.join(recoveryDirectory, "evaluation.json"))).toBe(false);
        expect(fs.existsSync(path.join(recoveryDirectory, "gate-report.json"))).toBe(false);
        expect(fs.existsSync(path.join(recoveryDirectory, "runtime-three-lens"))).toBe(false);
        expect(fs.existsSync(path.join(recoveryDirectory, ".agents"))).toBe(false);
        expect(fs.readFileSync(path.join(recoveryDirectory, ".frozen-evidence"), "utf8")).toBe("preserve this hidden candidate input");
        const predecessor = path.join(recoveryDirectory, "predecessor-evaluation", "immediate-predecessor");
        expect(JSON.parse(fs.readFileSync(path.join(predecessor, "evaluation.json"), "utf8"))).toEqual({ predecessor: true });
        expect(JSON.parse(fs.readFileSync(path.join(predecessor, "gate-report.json"), "utf8"))).toEqual({ ready: false });
        expect(fs.existsSync(path.join(predecessor, "runtime-three-lens/content-restoration.json"))).toBe(true);
        expect(JSON.parse(fs.readFileSync(path.join(predecessor, "provenance.json"), "utf8"))).toMatchObject({
          schemaVersion: "predecessor-evaluation-provenance@1", sourceCandidateArtifactRef: reconstructionRef,
          archivedEntries: expect.arrayContaining(["evaluation.json", "gate-report.json", "runtime-three-lens"]),
        });
        return { state: "built_unevaluated", reconstructionArtifactRef: reconstructionRef,
        articleArtifactRef: null, builderValidationArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
        threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null };
      } };
    };
    const runner = new ProductionResearchRunner({} as never, { read: () => ({}) } as never, undefined,
      factory as never);
    const request = { runId: "builder-workflow", stepRunId: "builder-step", attemptId: "builder-attempt", input: {},
      signal: new AbortController().signal, emit: async (type: string, data: unknown) => { events.push({ type, data }); } };
    const pinned = { source: { creatorRunId, postExternalId: "post-1", sourceUrl: "https://example.test/post-1",
      sourceMediaArtifactRef: sourceRef, detailArtifactRef: "detail", mediaManifestArtifactRef: "manifest", selectionArtifactRef: "selection",
      reconstructionBatchArtifactRef: "batch" }, files: [], methods: [], kind: "post" as const,
      reuseCandidate: { artifactRef: reconstructionRef, sha256: digest(path.join(candidateDirectory, "reconstruction.json")) } };
    await (runner as unknown as { post: (request: unknown, pinned: unknown, evidence: unknown, prior: unknown, reviewer: boolean, repair: boolean, recovery: boolean) => Promise<unknown> })
      .post(request, pinned, { id: "evidence" }, undefined, false, false, true);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ executionMode: "sdk", preservePreparedCandidate: false,
      repairFindings: expect.objectContaining({ gateId: "builder_integrity_core_evidence_count" }) });
    expect(events).toContainEqual(expect.objectContaining({ type: "candidate.copied",
      data: expect.objectContaining({ reason: "core_evidence_count_repair" }) }));
    expect(fs.existsSync(path.join(candidateDirectory, "evaluation.json"))).toBe(true);
    expect(fs.existsSync(path.join(candidateDirectory, "gate-report.json"))).toBe(true);
    expect(fs.readFileSync(path.join(candidateDirectory, ".agents", "skills", "video-content-reconstruction", "SKILL.md"), "utf8")).toBe("old staged method");
    expect(digest(sourcePath)).toBe(sourceBefore);
    if (previousRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR; else process.env.SELF_MEDIA_RUNTIME_DIR = previousRuntime;
  });
});

describe("substantive post repair review binding", () => {
  it("archives stale evaluation and materializes the exact parent review", async () => {
    const runtime = fs.mkdtempSync(path.join(os.tmpdir(), "production-bound-review-"));
    roots.push(runtime);
    const oldRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
    const creatorRunId = "44444444-4444-4444-8444-444444444444";
    const runDirectory = path.join(runtime, "runs", creatorRunId);
    const candidateDirectory = path.join(runDirectory, "candidate");
    const sourcePath = path.join(runDirectory, "source.mp4");
    fs.mkdirSync(path.join(candidateDirectory, "evidence"), { recursive: true });
    fs.mkdirSync(path.join(candidateDirectory, "targeted-evidence"), { recursive: true });
    fs.writeFileSync(sourcePath, "source");
    for (const name of ["post-source-input.json", "probe.json", "capture-protocol.json"]) fs.writeFileSync(path.join(candidateDirectory, name), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "evidence/evidence-pack.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "targeted-evidence/targeted-evidence.json"), "{}");
    fs.writeFileSync(path.join(candidateDirectory, "reconstruction.json"), "{\"candidate\":true}");
    fs.writeFileSync(path.join(candidateDirectory, "evaluation.json"), "{\"stale\":true}");
    fs.writeFileSync(path.join(candidateDirectory, "gate-report.json"), "{\"stale\":true}");
    fs.writeFileSync(path.join(candidateDirectory, "media-preparation.json"), JSON.stringify({ sourceMedia: { fingerprint: digest(sourcePath) },
      evidencePack: { path: path.join(candidateDirectory, "evidence/evidence-pack.json"), fingerprint: digest(path.join(candidateDirectory, "evidence/evidence-pack.json")) },
      transcript: { path: null, fingerprint: null } }));
    const candidateRef = { id: "candidate-id", revision: "candidate-revision", sha256: "candidate-payload-sha" } as never;
    const reconstructionRef = artifactRef(creatorRunId, "candidate/reconstruction.json");
    const evaluationRef = { id: "evaluation-id", revision: "evaluation-revision", sha256: "evaluation-payload-sha" } as never;
    const currentDirectory = path.join(runDirectory, "current-review");
    fs.mkdirSync(currentDirectory, { recursive: true });
    const currentEvaluation = { schemaVersion: "reconstruction-evaluation-1.0", examples: [{ finding: "fresh finding" }] };
    fs.writeFileSync(path.join(currentDirectory, "evaluation.json"), JSON.stringify(currentEvaluation));
    fs.writeFileSync(path.join(currentDirectory, "gate-report.json"), "{\"ready\":false}");
    fs.mkdirSync(path.join(currentDirectory, "evaluator-evidence/frames"), { recursive: true });
    fs.writeFileSync(path.join(currentDirectory, "evaluator-evidence/manifest.json"), "{\"frames\":[\"frames/source-06.jpg\"]}");
    fs.writeFileSync(path.join(currentDirectory, "evaluator-evidence/frames/source-06.jpg"), "frame-bytes");
    const outcome = { evaluationArtifactRef: artifactRef(creatorRunId, "current-review/evaluation.json"),
      gateReportArtifactRef: artifactRef(creatorRunId, "current-review/gate-report.json") };
    const reviewPayload = { kind: "post", candidate: candidateRef, outcome, evaluation: currentEvaluation };
    const parentSteps = [{ id: "review-step", key: "review:0", state: "succeeded", output: {
      evaluation: evaluationRef, receipt: { artifact: reviewPayload,
        candidateRevisionSha256: digest(path.join(candidateDirectory, "reconstruction.json")) },
    } }, { id: "repair-step", key: "repair-post:0", state: "running" }];
    const store = {
      getRun: async () => ({ parentRunId: "parent-run", parentStepRunId: "repair-step" }),
      listSteps: async () => parentSteps,
      getArtifact: async (id: string) => id === "evaluation-id" ? evaluationRef : undefined,
      getArtifactPayload: async () => reviewPayload,
    };
    let received: unknown;
    const factory = (options: unknown) => ({ reconstruct: async () => {
      received = options;
      const root = path.join(runDirectory, "workflow-reconstructions", "repair-child", "repair-attempt", "post-1");
      expect(fs.existsSync(path.join(root, "evaluation.json"))).toBe(false);
      expect(JSON.parse(fs.readFileSync(path.join(root, "predecessor-evaluation/immediate-predecessor/evaluation.json"), "utf8"))).toEqual({ stale: true });
      expect(JSON.parse(fs.readFileSync(path.join(root, "review-input/evaluation.json"), "utf8"))).toEqual(currentEvaluation);
      expect(fs.readFileSync(path.join(root, "review-input/evaluator-evidence/frames/source-06.jpg"), "utf8")).toBe("frame-bytes");
      return { state: "built_unevaluated", reconstructionArtifactRef: reconstructionRef, articleArtifactRef: null,
        builderValidationArtifactRef: null, evaluationArtifactRef: null, gateReportArtifactRef: null,
        threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null };
    } });
    const runner = new ProductionResearchRunner(store as never, { read: () => ({}) } as never, undefined, factory as never);
    const prior = { kind: "post", reportArtifactRef: reconstructionRef,
      reportSha256: digest(path.join(candidateDirectory, "reconstruction.json")), evidence: { id: "evidence" } };
    const request = { runId: "repair-child", stepRunId: "repair", attemptId: "repair-attempt",
      input: { candidate: candidateRef, findings: ["CR-06"] }, signal: new AbortController().signal, emit: async () => {} };
    const pinned = { source: { creatorRunId, postExternalId: "post-1", sourceUrl: "https://example.test/post-1",
      sourceMediaArtifactRef: artifactRef(creatorRunId, "source.mp4"), detailArtifactRef: "detail",
      mediaManifestArtifactRef: "manifest", selectionArtifactRef: "selection" } };
    await (runner as unknown as { post: (...args: unknown[]) => Promise<unknown> }).post(
      request, pinned, { id: "evidence" }, prior, false, true, false);
    expect(received).toMatchObject({ repairFindings: { reportedGateIds: ["CR-06"], currentReview: {
      evaluation: currentEvaluation, assets: { evaluation: expect.stringContaining("review-input/evaluation.json") } } } });
    expect(fs.existsSync(path.join(candidateDirectory, "evaluation.json"))).toBe(true);
    if (oldRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR; else process.env.SELF_MEDIA_RUNTIME_DIR = oldRuntime;
  });

  it("rejects tampered physical evaluation bytes", () => {
    const runtime = fs.mkdtempSync(path.join(os.tmpdir(), "production-review-tamper-"));
    roots.push(runtime);
    const oldRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
    const creatorRunId = "55555555-5555-4555-8555-555555555555";
    const review = path.join(runtime, "runs", creatorRunId, "review");
    fs.mkdirSync(review, { recursive: true });
    fs.writeFileSync(path.join(review, "evaluation.json"), "{\"tampered\":true}");
    const call = () => materializeBoundReview(
      path.join(runtime, "destination"), { evaluation: { id: "e", revision: "r", sha256: "s" } as never,
        payload: { evaluation: { expected: true } }, outcome: { evaluationArtifactRef: artifactRef(creatorRunId, "review/evaluation.json") },
        parentRunId: "parent", reviewStepId: "review" });
    expect(call).toThrow("POST_REPAIR_EVALUATION_BYTES_MISMATCH");
    if (oldRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR; else process.env.SELF_MEDIA_RUNTIME_DIR = oldRuntime;
  });

  it.each([
    ["wrong candidate", [{ id: "review", key: "review:0", state: "succeeded", output: {
      receipt: { candidateRevisionSha256: "report-sha", artifact: { candidate: { id: "other", revision: "r", sha256: "s" } } } } },
      { id: "repair", key: "repair-post:0", state: "running" }], "POST_REPAIR_BOUND_REVIEW_MISSING"],
    ["wrong report hash", [{ id: "review", key: "review:0", state: "succeeded", output: {
      receipt: { candidateRevisionSha256: "other", artifact: { candidate: { id: "candidate", revision: "r", sha256: "s" } } } } },
      { id: "repair", key: "repair-post:0", state: "running" }], "POST_REPAIR_BOUND_REVIEW_MISSING"],
    ["ambiguous exact reviews", [...[0, 1].map((index) => ({ id: `review-${index}`, key: "review:0", state: "succeeded",
      output: { receipt: { candidateRevisionSha256: "report-sha", artifact: { candidate: { id: "candidate", revision: "r", sha256: "s" } } } } })),
      { id: "repair", key: "repair-post:0", state: "running" }], "POST_REPAIR_BOUND_REVIEW_AMBIGUOUS"],
  ])("fails closed for %s", async (_label, steps, expected) => {
    const store = { getRun: async () => ({ parentRunId: "parent", parentStepRunId: "repair" }), listSteps: async () => steps };
    const runner = new ProductionResearchRunner(store as never, {} as never);
    const call = (runner as unknown as { boundReviewInput: (...args: unknown[]) => Promise<unknown> }).boundReviewInput(
      { runId: "child" }, { id: "candidate", revision: "r", sha256: "s" }, { reportSha256: "report-sha" });
    await expect(call).rejects.toThrow(expected);
  });

  it.each([
    ["V2", "repair-post:0", "review:0", "repair-evaluation:0", undefined],
    ["V3", "candidate-repair-1:repair-post:0", "independent-review-1:review:0", "evaluation-contract-repair-1:repair-evaluation:0", ["candidate-repair-1"]],
    ["V4 nested creator phase", "post-research:candidate-repair-1:repair-post:0", "post-research:independent-review-1:review:0", "post-research:evaluation-contract-repair-1:repair-evaluation:0", ["post-research", "candidate-repair-1"]],
  ])("prefers the exact repaired evaluation in a %s parent", async (_revision, repairKey, reviewKey, evaluationRepairKey, phasePath) => {
    const candidate = { id: "candidate", revision: "r", sha256: "s" };
    const staleEvaluation = { id: "stale-evaluation", revision: "old-r", sha256: "old-s" };
    const repairedEvaluation = { id: "repaired-evaluation", revision: "new-r", sha256: "new-s" };
    const artifact = { kind: "post", candidate, outcome: { state: "evaluated_with_findings" },
      evaluation: { schemaVersion: "reconstruction-evaluation-1.0", examples: [{ finding: "repaired detail" }] } };
    const output = (evaluation: unknown) => ({ evaluation, receipt: { artifact, candidateRevisionSha256: "report-sha" } });
    const steps = [
      { id: "review", key: reviewKey, state: "succeeded", output: output(staleEvaluation) },
      { id: "evaluation-repair", key: evaluationRepairKey, state: "succeeded", output: output(repairedEvaluation) },
      { id: "repair", key: repairKey, state: "running", phasePath },
    ];
    const store = {
      getRun: async () => ({ parentRunId: "parent", parentStepRunId: "repair" }),
      listSteps: async () => steps,
      getArtifact: async (id: string) => id === "repaired-evaluation" ? repairedEvaluation : undefined,
      getArtifactPayload: async () => artifact,
    };
    const runner = new ProductionResearchRunner(store as never, {} as never);
    const result = await (runner as unknown as { boundReviewInput: (...args: unknown[]) => Promise<{ evaluation: { id: string }; reviewStepId: string }> })
      .boundReviewInput({ runId: "child" }, candidate, { reportSha256: "report-sha" });
    expect(result.evaluation.id).toBe("repaired-evaluation");
    expect(result.reviewStepId).toBe("evaluation-repair");
  });

  it("rejects a nested repair whose persisted phase path disagrees with its key", async () => {
    const candidate = { id: "candidate", revision: "r", sha256: "s" };
    const steps = [{ id: "repair", key: "post-research:candidate-repair-1:repair-post:0", state: "running",
      phasePath: ["another-post", "candidate-repair-1"] }];
    const store = { getRun: async () => ({ parentRunId: "parent", parentStepRunId: "repair" }), listSteps: async () => steps };
    const runner = new ProductionResearchRunner(store as never, {} as never);
    const call = (runner as unknown as { boundReviewInput: (...args: unknown[]) => Promise<unknown> }).boundReviewInput(
      { runId: "child" }, candidate, { reportSha256: "report-sha" });
    await expect(call).rejects.toThrow("POST_REPAIR_PARENT_STEP_INVALID");
  });

  it("rejects a repair phase whose round does not match its child repair step", async () => {
    const store = { getRun: async () => ({ parentRunId: "parent", parentStepRunId: "repair" }), listSteps: async () => [
      { id: "repair", key: "candidate-repair-2:repair-post:0", state: "running", phasePath: ["candidate-repair-2"] },
    ] };
    const runner = new ProductionResearchRunner(store as never, {} as never);
    const call = (runner as unknown as { boundReviewInput: (...args: unknown[]) => Promise<unknown> }).boundReviewInput(
      { runId: "child" }, { id: "candidate", revision: "r", sha256: "s" }, { reportSha256: "report-sha" });
    await expect(call).rejects.toThrow("POST_REPAIR_PARENT_STEP_INVALID");
  });
});

describe("core evidence recovery runtime binding", () => {
  it("recognizes the new Builder step created by a real failed-agent retry exactly once", async () => {
    const database = new DatabaseSync(":memory:");
    const store = new SQLiteWorkflowRunStore(database);
    const definition = workflow("post.build", { revision: "v1" }, (ctx) => ctx.agent("builder", {
      id: "post-builder", revision: "v1", model: "gpt-5.6-terra", reasoningEffort: "medium",
      promptRevision: "1", skillsRevision: "1", permissionsRevision: "1",
    }, {}));
    const run = await store.createRun({ workflowId: definition.id, workflowRevision: definition.revision,
      inputFingerprint: workflowFingerprint({}), state: "queued" });
    let shouldFail = true;
    const recognized: boolean[] = [];
    const production = new ProductionResearchRunner(store, {} as never);
    const agent: AgentRunner = { run: async (request) => {
      if (shouldFail) throw new Error(`POST_CANDIDATE_INCOMPLETE:${JSON.stringify({ failedGateIds: ["builder_integrity_core_evidence_count"] })}`);
      recognized.push(await (production as unknown as { isCoreEvidenceCountRecovery: (request: unknown) => Promise<boolean> })
        .isCoreEvidenceCountRecovery(request));
      return { output: {} as never };
    } };
    await expect(runWorkflow({ workflow: definition, input: {}, store, agentRunner: agent, resumeRunId: run.id })).rejects.toThrow("POST_CANDIDATE_INCOMPLETE");
    const original = (await store.listSteps(run.id)).find((step) => step.key === "builder")!;
    await store.appendEvent({ runId: run.id, type: "workflow.core_evidence_recovery_queued", data: {
      stepKey: "builder", originalBuilderStepId: original.id, gateId: "builder_integrity_core_evidence_count" } });
    shouldFail = false;
    await runWorkflow({ workflow: definition, input: {}, store, agentRunner: agent, resumeRunId: run.id });
    expect(recognized).toEqual([true]);
    expect((await store.listSteps(run.id)).filter((step) => step.key === "builder")).toHaveLength(2);
    database.close();
  });
});

describe("creator review routing", () => {
  it("delivers an executor-declared provisional dossier without calling it verified", () => {
    expect(creatorReviewRoute({ state: "provisional" }, { ready: false, failedGateIds: ["deep_9_ready"] })).toBe("deliver");
    expect(creatorReviewRoute({ state: "not_ready" }, { ready: false, failedGateIds: ["deep_9_ready"] })).toBe("source_gap");
  });
});
