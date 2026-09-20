import { describe, expect, it } from "vitest";
import { MemoryRunStore, runWorkflow, workflow, type AgentRunner, type ArtifactRef } from "@signal-room/workflow";
import { createResearchAgentDefinitions } from "./agents.js";
import { createCreatorSynthesisWorkflowSuiteV4, createPostWorkflowSuiteV5, createPostWorkflowSuiteV9, type SimpleSourceCheckOutput } from "./simple-review.js";
import type { PostWorkflowInput } from "./contracts.js";

async function seed(store: MemoryRunStore, type: string) {
  return store.publishArtifact({ type, schemaVersion: "v1", revision: "r1", sha256: `${type}-sha`, uri: `memory://${type}`,
    payload: {}, producedBy: { workflowRunId: "seed", stepRunId: "seed", attemptId: "seed" }, dependsOn: [], validation: "valid", review: "not_applicable" });
}

const config = { prompt: "test", promptRevision: "test", skillSnapshotsRevision: "test", permissionsRevision: "test", config: { simpleReview: true } };
const agents = createResearchAgentDefinitions({ postSourceChecker: config, postBuilder: config, postReviewer: config, postRepair: config,
  postEvaluationRepair: config, creatorBuilder: config, creatorReviewer: config, creatorRepair: config });

function sourceCheck(verdict: "consistent" | "conflict" | "uncertain" = "consistent") {
  return workflow<PostWorkflowInput, SimpleSourceCheckOutput>("post.source-check", { revision: "v3" }, async (ctx) => {
    const artifact = await ctx.publish("source", "post-source-check", { verdict }, { validation: "valid" });
    return { ok: true as const, artifact, receipt: { artifact: { verdict } } };
  });
}

function review(candidate: { id: string; revision: string; sha256: string }, findings: unknown[] = []) {
  return { artifact: { schemaVersion: "research-review@1", kind: "post", candidate, candidateReportSha256: candidate.sha256,
    summary: "reviewed", findings } };
}

describe("simple reviewer workflows", () => {
  it("maps V9 only to the changed post executor children", () => {
    const check = sourceCheck();
    const suite = createPostWorkflowSuiteV9({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents,
      { sourceCheck: check });
    expect({ analyze: suite.analyze.revision, build: suite.build.revision, sourceCheck: suite.sourceCheck?.revision,
      review: suite.review.revision, repair: suite.repair.revision }).toEqual({
      analyze: "v9", build: "v3", sourceCheck: "v3", review: "v4", repair: "v4",
    });
  });

  it("delivers a no-findings candidate without repair", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); const calls: string[] = [];
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") return { output: review((request.input as { candidate: ArtifactRef }).candidate) };
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck() });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "p", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect(result.output).toMatchObject({ ok: true, candidateStatus: "original_reviewed" });
    expect(calls).toEqual(["post-builder", "post-reviewer"]);
  });

  it("accepts the reviewer report hash when it differs from the candidate artifact hash", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); const calls: string[] = [];
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") {
        const candidate = (request.input as { candidate: ArtifactRef }).candidate;
        return { output: { candidateRevisionSha256: "report-bytes-sha", artifact: { schemaVersion: "research-review@1", kind: "post",
          candidate: { id: candidate.id, revision: candidate.revision, sha256: candidate.sha256 }, candidateReportSha256: "report-bytes-sha", summary: "clean", findings: [] } } };
      }
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck() });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "hash", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect(calls).toEqual(["post-builder", "post-reviewer"]);
  });

  it("rejects a reviewer report hash that disagrees with its receipt", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); let reviews = 0;
    const runner: AgentRunner = { async run(request) {
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") {
        reviews += 1; const candidate = (request.input as { candidate: ArtifactRef }).candidate;
        return { output: { candidateRevisionSha256: "actual-report-sha", artifact: { schemaVersion: "research-review@1", kind: "post",
          candidate: { id: candidate.id, revision: candidate.revision, sha256: candidate.sha256 }, candidateReportSha256: "different-report-sha", summary: "bad", findings: [] } } };
      }
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck() });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "hash-bad", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("needs_review");
    expect(reviews).toBe(2);
  });

  it("repairs findings once and does not re-review the revised candidate", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); const calls: string[] = [];
    const finding = { id: "f1", location: "/summary", issue: "needs citation", evidenceRefs: ["frame-1"], suggestedChange: "cite it", priority: "major", kind: "missing_evidence" };
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") return { output: review((request.input as { candidate: ArtifactRef }).candidate, [finding]) };
      if (request.definition.id === "post-repair") return { output: { artifact: { report: "revised", revisionResponse: [{ id: "f1", status: "changed", reason: "citation added" }] } } };
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck() });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "p", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("succeeded");
    expect(result.output).toMatchObject({ ok: true, candidateStatus: "revised_unverified" });
    expect(calls.filter((id) => id === "post-reviewer")).toHaveLength(1);
    expect(calls.filter((id) => id === "post-repair")).toHaveLength(1);
  });

  it("retries only a technical reviewer failure and retains the candidate", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); let reviewerCalls = 0; const registrations: unknown[] = [];
    const runner: AgentRunner = { async run(request) {
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") { reviewerCalls += 1; throw new Error("temporary provider failure"); }
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, {
      sourceCheck: sourceCheck(), registerCandidate: async (value) => { registrations.push(value); },
    });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "p", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("needs_review");
    expect(reviewerCalls).toBe(2);
    expect(registrations).toMatchObject([{ reviewStatus: "failed", candidateStatus: "review_incomplete" }]);
  });

  it("does not treat a bad receipt binding as an empty pass", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); const calls: string[] = []; const registrations: unknown[] = [];
    const runner: AgentRunner = { async run(request) {
      calls.push(request.definition.id);
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") return { output: review({ id: "wrong", revision: "r1", sha256: "wrong" }) };
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck(), registerCandidate: async (value) => { registrations.push(value); } });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "p", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("needs_review");
    expect(calls).toEqual(["post-builder", "post-reviewer", "post-reviewer"]);
    expect(registrations).toMatchObject([{ reviewStatus: "failed", candidateStatus: "review_incomplete" }]);
  });

  it.each(["throws", "invalid_disposition"] as const)("retains the original candidate when repair %s", async (mode) => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence"); const registrations: unknown[] = [];
    const finding = { id: "f1", location: "/summary", issue: "cite", evidenceRefs: ["frame"], suggestedChange: "cite", priority: "major", kind: "content" };
    const runner: AgentRunner = { async run(request) {
      if (request.definition.id === "post-builder") return { output: { artifact: { report: true } } };
      if (request.definition.id === "post-reviewer") return { output: review((request.input as { candidate: { id: string; revision: string; sha256: string } }).candidate, [finding]) };
      if (request.definition.id === "post-repair") {
        if (mode === "throws") throw new Error("repair unavailable");
        return { output: { artifact: { revisionResponse: [{ id: "other", status: "changed", reason: "wrong" }] } } };
      }
      throw new Error("unexpected agent");
    } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck(), registerCandidate: async (value) => { registrations.push(value); } });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "p", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("needs_review");
    expect(result.output).toMatchObject({ ok: false, details: { kind: "revision_incomplete", candidateStatus: "original_reviewed" } });
    expect(registrations).toMatchObject([{ reviewStatus: "completed_with_findings", candidateStatus: "original_reviewed" }]);
  });

  it("handles creator no-findings, repair, and reviewer failure without a second review", async () => {
    const run = async (mode: "pass" | "repair" | "fail") => {
      const store = new MemoryRunStore(); const frozenInputs = await seed(store, "frozen"); let reviews = 0; const registrations: unknown[] = [];
      const finding = { id: "f1", location: "/claim", issue: "cite", evidenceRefs: ["post"], suggestedChange: "cite", priority: "minor", kind: "content" };
      const runner: AgentRunner = { async run(request) {
        if (request.definition.id === "creator-synthesis-builder") return { output: { artifact: { synthesis: true } } };
        if (request.definition.id === "creator-synthesis-reviewer") { reviews += 1; if (mode === "fail") throw new Error("review fail"); return { output: { artifact: { schemaVersion: "research-review@1", kind: "creator", candidate: (request.input as { candidate: unknown }).candidate, candidateReportSha256: "report", summary: "ok", findings: mode === "repair" ? [finding] : [] } } }; }
        if (request.definition.id === "creator-synthesis-repair") return { output: { artifact: { revisionResponse: [{ id: "f1", status: "changed", reason: "fixed" }] } } };
        throw new Error("unexpected agent");
      } } as AgentRunner;
      const suite = createCreatorSynthesisWorkflowSuiteV4({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { registerCandidate: async (value) => { registrations.push(value); } });
      const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), frozenInputs }, store, agentRunner: runner });
      return { result, reviews, registrations };
    };
    const passed = await run("pass"); expect(passed.result.run.state).toBe("succeeded"); expect(passed.reviews).toBe(1);
    const repaired = await run("repair"); expect(repaired.result.output).toMatchObject({ ok: true, candidateStatus: "revised_unverified" }); expect(repaired.reviews).toBe(1);
    const failed = await run("fail"); expect(failed.result.run.state).toBe("needs_review"); expect(failed.reviews).toBe(2); expect(failed.registrations).toMatchObject([{ candidateStatus: "review_incomplete" }]);
  });

  it("blocks a source conflict before building", async () => {
    const store = new MemoryRunStore(); const evidence = await seed(store, "evidence");
    const runner: AgentRunner = { async run() { throw new Error("builder must not run"); } } as AgentRunner;
    const suite = createPostWorkflowSuiteV5({ candidate: () => ({ valid: true }), evaluation: () => ({ valid: true }) }, agents, { sourceCheck: sourceCheck("conflict") });
    const result = await runWorkflow({ workflow: suite.analyze, input: { creatorRunId: crypto.randomUUID(), postExternalId: "p", evidenceKind: "video", evidence }, store, agentRunner: runner });
    expect(result.run.state).toBe("blocked");
    expect(result.output).toMatchObject({ ok: false, details: { kind: "source_identity_conflict" } });
  });
});
