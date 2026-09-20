import { describe, expect, it } from "vitest";
import type { ArtifactRef, RunRecord, RunStore, StepRecord } from "@signal-room/workflow";
import { projectCreatorWorkflowProgress } from "./workflow-creator-progress.js";

function run(id: string, workflowId: string, state: RunRecord["state"], postId?: string, parentRunId?: string): RunRecord {
  return { id, workflowId, workflowRevision: "v1", inputFingerprint: id, state,
    ...(postId ? { metadata: { creatorRunId: "creator", postId } } : { metadata: { creatorRunId: "creator" } }),
    ...(parentRunId ? { parentRunId } : {}) };
}

function step(id: string, runId: string, key: string, state: StepRecord["state"]): StepRecord {
  return { id, runId, key, state, kind: "agent", workflowId: "post.analyze", workflowRevision: "v1",
    inputFingerprint: id, configFingerprint: id, validation: "pending" };
}

function registrationStep(runId: string, state: StepRecord["state"] = "succeeded"): StepRecord {
  return { ...step(`registration-${runId}`, runId, "register-candidate", state), kind: "task",
    validation: state === "succeeded" ? "valid" : "invalid",
    ...(state === "succeeded" ? { output: { state: "registered", synthesisArtifactRef: "/artifacts/creator/synthesis.json",
      synthesisGateArtifactRef: null, publication: "provisional" } } : {}) };
}

function artifact(id: string, runId: string, type: string): ArtifactRef {
  return { id, type, schemaVersion: "v1", revision: "1", sha256: id, uri: `memory://${id}`,
    producedBy: { workflowRunId: runId, stepRunId: "step", attemptId: "attempt" }, dependsOn: [],
    validation: "valid", review: type === "post-evaluation" ? "passed" : "pending" };
}

function store(runs: RunRecord[], steps: StepRecord[] = [], artifacts: ArtifactRef[] = []): RunStore {
  return {
    listRuns: async () => runs, listSteps: async (id) => steps.filter((item) => item.runId === id),
    listArtifacts: async (id) => artifacts.filter((item) => item.producedBy.workflowRunId === id),
  } as RunStore;
}

const registeredRecoveryOutput = { ok: true, synthesis: {}, review: {}, revisionRecord: {} };
const revisedReview = { reviewStatus: "completed_with_findings" as const, candidateStatus: "revised_unverified" as const };

describe("projectCreatorWorkflowProgress", () => {
  it("scopes progress to the latest creator analysis root instead of mixing registered history", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("current-analysis", "creator.analyze", "waiting"),
      run("current-post-1", "post.analyze", "waiting", "post-1", "current-analysis"),
      run("current-source", "post.source-check", "running", undefined, "current-post-1"),
      run("current-post-2", "post.analyze", "queued", "post-2", "current-analysis"),
      { ...run("old-synthesis", "creator.synthesize", "succeeded"), output: registeredRecoveryOutput },
      { ...run("old-post", "post.analyze", "succeeded", "post-1"), output: {
        ok: true, reviewStatus: "completed_with_findings", candidateStatus: "revised_unverified" } },
    ], [], [artifact("old-candidate", "old-post", "post-candidate")]), "creator", revisedReview, () => revisedReview);

    expect(value).toMatchObject({ workflowRootRunId: "current-analysis", workflowRootState: "waiting",
      reanalysisInProgress: true, displayedReportIsPreviousVersion: true,
      counts: { total: 2, built: 0, revised: 0, running: 1, queued: 1 }, synthesis: null });
    expect(value.posts.map((post) => post.workflowRunId)).toEqual(["current-post-1", "current-post-2"]);
  });

  it("keeps the previous-version marker after the latest creator analysis fails without registering synthesis", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("failed-analysis", "creator.analyze", "failed"),
      run("failed-post", "post.analyze", "failed", "post-1", "failed-analysis"),
      { ...run("old-synthesis", "creator.synthesize", "succeeded"), output: registeredRecoveryOutput },
    ]), "creator", revisedReview);

    expect(value).toMatchObject({ workflowRootRunId: "failed-analysis", workflowRootState: "failed",
      reanalysisInProgress: false, displayedReportIsPreviousVersion: true, synthesis: null });
  });

  it("keeps legacy post progress when an independent post root is newer than an old creator analysis", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("new-independent-post", "post.analyze", "waiting", "post-new"),
      run("new-source", "post.source-check", "running", undefined, "new-independent-post"),
      run("old-analysis", "creator.analyze", "succeeded"),
      run("old-analysis-post", "post.analyze", "succeeded", "post-old", "old-analysis"),
    ]), "creator");

    expect(value).toMatchObject({ workflowRootRunId: null, reanalysisInProgress: false,
      displayedReportIsPreviousVersion: false, counts: { running: 1 } });
    expect(value.posts.map((post) => post.workflowRunId)).toContain("new-independent-post");
  });

  it.each([
    ["completed_no_findings", "original_reviewed", "succeeded"],
    ["completed_with_findings", "revised_unverified", "succeeded"],
    ["failed", "review_incomplete", "needs_review"],
  ] as const)("recognizes v6 registration for %s / %s", async (reviewStatus, candidateStatus, state) => {
    const synthesis = { ...run("current-synthesis", "creator.synthesize", state, undefined, "current-analysis"),
      output: state === "needs_review"
        ? { ok: false, details: { kind: "review_incomplete", reviewStatus, candidateStatus } }
        : { ok: true, synthesis: {}, evaluation: {}, reviewStatus, candidateStatus } };
    const value = await projectCreatorWorkflowProgress(store([
      run("current-analysis", "creator.analyze", state), synthesis,
    ], [registrationStep("current-synthesis")]), "creator", revisedReview);

    expect(value).toMatchObject({ displayedReportIsPreviousVersion: false,
      synthesis: { workflowRunId: "current-synthesis", terminalStatus: candidateStatus } });
  });

  it("does not treat a v6 candidate output as registered when the registration task failed", async () => {
    const synthesis = { ...run("current-synthesis", "creator.synthesize", "failed", undefined, "current-analysis"),
      output: { ok: true, synthesis: {}, evaluation: {}, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" } };
    const value = await projectCreatorWorkflowProgress(store([
      run("current-analysis", "creator.analyze", "failed"), synthesis,
    ], [registrationStep("current-synthesis", "failed")]), "creator", revisedReview);

    expect(value).toMatchObject({ displayedReportIsPreviousVersion: true,
      synthesis: { terminalStatus: "original_reviewed" } });
  });

  it("does not count a waiting parent as an occupied worker slot", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("parent", "post.analyze", "waiting", "post-1"), run("build", "post.build", "queued", undefined, "parent"),
    ]), "creator");
    expect(value).toMatchObject({ activeSlots: 0, counts: { total: 1, queued: 1 } });
  });

  it("shows an active source check as source checking and counts its model slot", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("parent", "post.analyze", "waiting", "post-1"), run("source-check", "post.source-check", "running", undefined, "parent"),
    ]), "creator");
    expect(value.posts[0]).toMatchObject({ state: "source_checking", currentNode: "post.source-check" });
    expect(value.counts).toMatchObject({ running: 1 });
    expect(value.activeSlots).toBe(1);
  });

  it("shows a generated candidate as built but unreviewed", async () => {
    const value = await projectCreatorWorkflowProgress(store([run("parent", "post.analyze", "waiting", "post-1")], [],
      [artifact("candidate", "parent", "post-candidate")]), "creator");
    expect(value.posts[0]?.state).toBe("built_unreviewed");
    expect(value.counts).toMatchObject({ built: 1, reviewed: 0 });
  });

  it("counts a v5 Reviewer result for the original candidate as independently reviewed", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      { ...run("parent", "post.analyze", "succeeded", "post-1"), output: { ok: true, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" } },
    ], [], [artifact("candidate", "parent", "post-candidate")]), "creator");
    expect(value.posts[0]).toMatchObject({ state: "reviewed", built: true, reviewed: true });
    expect(value.counts).toMatchObject({ reviewed: 1, revised: 0, needsReview: 0 });
  });

  it("keeps a v5 repaired candidate separate from independently reviewed counts", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      { ...run("parent", "post.analyze", "succeeded", "post-1"), output: { ok: true, reviewStatus: "completed_with_findings", candidateStatus: "revised_unverified" } },
    ], [], [artifact("candidate", "parent", "post-candidate"), artifact("legacy-evaluation", "parent", "post-evaluation")]), "creator");
    expect(value.posts[0]).toMatchObject({ state: "revised_unverified", built: true, reviewed: false });
    expect(value.counts).toMatchObject({ reviewed: 0, revised: 1, needsReview: 0 });
  });

  it("uses the registered Reviewer state over a stale terminal run output", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      { ...run("parent", "post.analyze", "succeeded", "post-1"), output: { ok: true, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" } },
    ], [], [artifact("candidate", "parent", "post-candidate")]), "creator", undefined, () => revisedReview);
    expect(value.posts[0]).toMatchObject({ state: "revised_unverified", built: true, reviewed: false });
    expect(value.counts).toMatchObject({ reviewed: 0, revised: 1 });
  });

  it("uses the current registered post revision instead of an older reviewed analyze root", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("revision", "post.targeted-revision", "succeeded", "post-1"),
      { ...run("old", "post.analyze", "succeeded", "post-1"), output: { ok: true, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" } },
    ]), "creator", undefined, () => revisedReview);
    expect(value.posts[0]).toMatchObject({ workflowRunId: "revision", state: "revised_unverified", built: true, reviewed: false });
    expect(value.counts).toMatchObject({ reviewed: 0, revised: 1 });
  });

  it("keeps a newer active post revision visible over the registered version", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("active", "post.structural-revision", "running", "post-1"),
      run("revision", "post.targeted-revision", "succeeded", "post-1"),
      { ...run("old", "post.analyze", "succeeded", "post-1"), output: { ok: true, reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" } },
    ]), "creator", undefined, () => revisedReview);
    expect(value.posts[0]).toMatchObject({ workflowRunId: "active", state: "repairing", reviewed: false });
    expect(value.counts).toMatchObject({ reviewed: 0, revised: 0, running: 1 });
  });

  it("routes a v5 Reviewer technical failure with a candidate to review handling", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      { ...run("parent", "post.analyze", "needs_review", "post-1"), output: { ok: false, details: { reviewStatus: "failed", candidateStatus: "review_incomplete" } } },
    ], [], [artifact("candidate", "parent", "post-candidate")]), "creator");
    expect(value.posts[0]).toMatchObject({ state: "needs_review", built: true, reviewed: false });
    expect(value.counts).toMatchObject({ reviewed: 0, revised: 0, needsReview: 1, failed: 0 });
  });

  it("preserves legacy evaluation as independently reviewed", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("canceled", "post.analyze", "canceled", "post-canceled"),
      run("reviewed", "post.analyze", "succeeded", "post-reviewed")
    ], [], [artifact("candidate", "reviewed", "post-candidate"), artifact("evaluation", "reviewed", "post-evaluation")]), "creator");
    expect(value.posts[0]?.state).toBe("canceled");
    expect(value.counts).toMatchObject({ total: 2, canceled: 1, failed: 0, built: 1, reviewed: 1 });
  });

  it("surfaces a failed reviewer instead of treating the candidate as reviewed", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("parent", "post.analyze", "waiting", "post-1"), run("review", "post.review", "failed", undefined, "parent"),
    ], [], [artifact("candidate", "parent", "post-candidate")]), "creator");
    expect(value.posts[0]?.state).toBe("failed");
    expect(value.counts).toMatchObject({ built: 1, reviewed: 0, failed: 1 });
  });

  it("keeps only the newest run for a post", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("new", "post.analyze", "waiting", "post-1"), run("new-review", "post.review", "running", undefined, "new"),
      run("old", "post.analyze", "failed", "post-1"),
    ], [step("review-step", "new-review", "reviewer", "running")]), "creator");
    expect(value.posts).toEqual([{ postId: "post-1", workflowRunId: "new", state: "reviewing", currentNode: "post.review", built: false, reviewed: false }]);
    expect(value.counts).toMatchObject({ total: 1, running: 1, failed: 0 });
  });

  it("does not let a historical review failure override a successful evaluation repair", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("parent", "post.analyze", "succeeded", "post-1"),
      run("repair", "post.repair-evaluation", "succeeded", undefined, "parent"),
      run("old-review", "post.review", "failed", undefined, "parent"),
    ], [], [artifact("candidate", "parent", "post-candidate"), artifact("evaluation", "repair", "post-evaluation")]), "creator");
    expect(value.posts[0]).toMatchObject({ state: "reviewed", built: true, reviewed: true });
    expect(value.counts).toMatchObject({ reviewed: 1, failed: 0, needsReview: 0 });
  });

  it("does not label creator analysis post dispatch as creator synthesis", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("analysis", "creator.analyze", "waiting"), run("post", "post.analyze", "waiting", "post-1", "analysis"),
      run("build", "post.build", "running", undefined, "post"),
    ]), "creator");
    expect(value.synthesis).toBeNull();
  });

  it("uses the creator record review state for a registered recovery receipt", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("old", "creator.synthesize", "needs_review"),
      { ...run("registered", "creator.repair", "succeeded"), output: registeredRecoveryOutput }
    ]), "creator", revisedReview);
    expect(value.synthesis).toEqual({ state: "succeeded", workflowRunId: "registered", currentNode: null,
      terminalStatus: "revised_unverified" });
  });

  it("keeps a newer active synthesis visible over an older registered revision", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      run("active", "creator.synthesize", "running"),
      { ...run("registered", "creator.repair", "succeeded"), output: registeredRecoveryOutput }
    ]), "creator", revisedReview);
    expect(value.synthesis).toEqual({ state: "running", workflowRunId: "active", currentNode: null });
  });

  it("does not let an older waiting synthesis mask a newer registered revision", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      { ...run("registered", "creator.repair", "succeeded"), output: registeredRecoveryOutput },
      run("stale", "creator.synthesize", "waiting")
    ]), "creator", revisedReview);
    expect(value.synthesis).toEqual({ state: "succeeded", workflowRunId: "registered", currentNode: null,
      terminalStatus: "revised_unverified" });
  });

  it("does not infer a terminal review state from a receipt without the creator record", async () => {
    const value = await projectCreatorWorkflowProgress(store([
      { ...run("registered", "creator.repair", "succeeded"), output: registeredRecoveryOutput },
      run("old", "creator.synthesize", "needs_review")
    ]), "creator");
    expect(value.synthesis).toEqual({ state: "needs_review", workflowRunId: "old", currentNode: null });
  });
});
