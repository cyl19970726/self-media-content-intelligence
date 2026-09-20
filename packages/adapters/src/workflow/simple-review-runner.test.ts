import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentRunner, ArtifactRef } from "@signal-room/workflow";
import { reviewOutputSchema, runSimpleReview, simpleReviewReceipt } from "./simple-review-runner.js";
import { artifactRef } from "../core/artifacts.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const sha = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-review-"));
  roots.push(root);
  const reportPath = path.join(root, "report.json");
  const sourcePath = path.join(root, "source.json");
  const operatorPath = path.join(root, "reviewer-operator.md");
  const report = { builderLenses: { contentRestoration: { blocks: [{ evidenceRefs: ["FRAME-01"], text: "claim" }] } } };
  fs.writeFileSync(reportPath, JSON.stringify(report));
  fs.writeFileSync(sourcePath, JSON.stringify({ frame: "FRAME-01" }));
  fs.writeFileSync(operatorPath, "Review only the immutable candidate.");
  const candidateRef = { id: "candidate-id", revision: "candidate-r1", sha256: "a".repeat(64) } as ArtifactRef;
  const request = { runId: "run", stepRunId: "step", attemptId: "attempt", input: {}, signal: new AbortController().signal,
    emit: async () => {}, definition: { id: "post-reviewer", revision: "2", model: "gpt-5.6-luna", reasoningEffort: "medium",
      promptRevision: "2", skillsRevision: "2", permissionsRevision: "2", config: { simpleReview: true } } };
  return { root, report, reportPath, sourcePath, operatorPath, candidateRef, request,
    candidate: { kind: "post" as const, report, reportArtifactRef: "/artifacts/x/report.json", reportSha256: sha(reportPath) } };
}

describe("simple review runner", () => {
  it("uses an SDK-strict JSON schema at every nested node", () => {
    const inspect = (node: unknown, location = "#"): void => {
      if (!node || typeof node !== "object") return;
      const schema = node as Record<string, unknown>;
      if ("const" in schema || "enum" in schema) expect(schema.type, location).toBe("string");
      if (schema.type === "object") {
        const properties = schema.properties as Record<string, unknown>;
        expect(schema.additionalProperties, location).toBe(false);
        expect(new Set(schema.required as string[]), location).toEqual(new Set(Object.keys(properties)));
        for (const [key, child] of Object.entries(properties)) inspect(child, `${location}/properties/${key}`);
      }
      if (schema.type === "array") inspect(schema.items, `${location}/items`);
    };
    inspect(reviewOutputSchema);
  });

  it("uses the RFC 6901 location pattern while allowing a semicolon in a member name", async () => {
    const location = reviewOutputSchema.properties.findings.items.properties.location;
    expect(location.pattern).toBe("^(?:/(?:[^~/]|~[01])*)+$");
    expect(new RegExp(location.pattern).test("/builderLenses/contentRestoration/title;source")).toBe(true);
    // A semicolon is ordinary member-name data; semantic lookup rejects a combined non-existent path.
    expect(new RegExp(location.pattern).test("/bad~2escape")).toBe(false);

    const value = fixture();
    (value.report.builderLenses.contentRestoration as Record<string, unknown>)["title;source"] = "claim";
    fs.writeFileSync(value.reportPath, JSON.stringify(value.report));
    value.candidate.reportSha256 = sha(value.reportPath);
    const runner = { run: async () => ({ output: {
      schemaVersion: "research-review@1", kind: "post",
      candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
      candidateReportSha256: value.candidate.reportSha256, summary: "one issue", findings: [{ id: "F-1",
        location: "/builderLenses/contentRestoration/title;source", issue: "claim lacks support",
        evidenceRefs: ["#/builderLenses/contentRestoration/blocks/0/evidenceRefs/0"],
        suggestedChange: "bind the claim", priority: "major", kind: "missing_evidence" }]
    } }) } as unknown as AgentRunner;
    await expect(runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
      reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath], runner }))
      .resolves.toMatchObject({ findings: [{ location: "/builderLenses/contentRestoration/title;source" }] });
  });

  it("includes deterministic rejection feedback in the retry prompt", async () => {
    const value = fixture();
    let prompt = "";
    const runner = { run: async (request: typeof value.request) => {
      prompt = (request.definition.config as Record<string, unknown>).prompt as string;
      return { output: { schemaVersion: "research-review@1", kind: "post",
        candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
        candidateReportSha256: value.candidate.reportSha256, summary: "ok", findings: [] } };
    } } as unknown as AgentRunner;
    await runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
      reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath],
      retryFeedback: "SIMPLE_REVIEW_LOCATION_MISSING:FINDING-001", runner });
    expect(prompt).toContain("SIMPLE_REVIEW_LOCATION_MISSING:FINDING-001");
    expect(prompt).toContain("exactly one RFC 6901 JSON Pointer");
    expect(prompt).toContain("do not return empty findings merely to avoid the prior validation error");
  });

  it("activates only the reviewer operator while staging its complete package in a private cwd", async () => {
    const value = fixture();
    const skillRoot = path.join(value.root, "review-skill");
    const references = path.join(skillRoot, "references");
    fs.mkdirSync(references, { recursive: true });
    fs.writeFileSync(path.join(skillRoot, "SKILL.md"), "Main workflow entrypoint that the reviewer must not activate.");
    fs.writeFileSync(path.join(skillRoot, "schemas.json"), JSON.stringify({ title: "complete-resource" }));
    value.operatorPath = path.join(references, "reviewer-operator.md");
    fs.writeFileSync(value.operatorPath, "Reviewer operator selected-marker.");
    const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    process.env.SELF_MEDIA_RUNTIME_DIR = path.join(value.root, "runtime");
    let config: Record<string, unknown> = {};
    const runner = { run: async (request: typeof value.request) => {
      config = request.definition.config as Record<string, unknown>;
      return { output: { schemaVersion: "research-review@1", kind: "post",
        candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
        candidateReportSha256: value.candidate.reportSha256, summary: "ok", findings: [] } };
    } } as unknown as AgentRunner;
    try {
      await runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
        reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath], runner });
      const prompt = String(config.prompt);
      expect(prompt).toContain("Reviewer operator selected-marker");
      expect(prompt).toContain("Activate only the verified Reviewer operator snapshot");
      expect(prompt).not.toContain("Read each SKILL.md");
      expect(config.skills).toEqual([]);
      expect(config.threadOptions).toEqual({ sandboxMode: "read-only", approvalPolicy: "never" });
      const outputDirectory = String(config.outputDirectory);
      expect(outputDirectory).toBe(path.join(process.env.SELF_MEDIA_RUNTIME_DIR!, "workflow-reviews", "run", "step", "attempt"));
      const stagedFiles = fs.readdirSync(outputDirectory, { recursive: true }).map(String);
      expect(stagedFiles.some((file) => file.endsWith("schemas.json"))).toBe(true);
      const receipt = JSON.parse(fs.readFileSync(path.join(outputDirectory, "reviewer-skill-load.json"), "utf8"));
      expect(receipt.files).toEqual([expect.objectContaining({ path: value.operatorPath })]);
      expect(receipt.packages[0].files.some((file: { path: string }) => file.path === "schemas.json")).toBe(true);
      expect(outputDirectory).not.toBe(path.dirname(value.reportPath));
    } finally {
      if (previousRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
      else process.env.SELF_MEDIA_RUNTIME_DIR = previousRuntime;
    }
  });

  it("returns a candidate-bound review and routes findings to one repair", async () => {
    const value = fixture();
    const runner = { run: async (request: typeof value.request) => ({ output: {
      schemaVersion: "research-review@1", kind: "post",
      candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
      candidateReportSha256: value.candidate.reportSha256, summary: "one issue", findings: [{ id: "F-1",
        location: "/builderLenses/contentRestoration/blocks/0", issue: "claim lacks support",
        evidenceRefs: ["#/builderLenses/contentRestoration/blocks/0/evidenceRefs/0"],
        suggestedChange: "bind the claim", priority: "major", kind: "missing_evidence" }]
    }, metadata: request.definition.config }) } as unknown as AgentRunner;
    const review = await runSimpleReview({ request: value.request, candidateRef: value.candidateRef,
      candidate: value.candidate, reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath,
      sourcePaths: [value.sourcePath], runner });
    expect(simpleReviewReceipt(review, value.candidateRef)).toMatchObject({ route: "repair_post",
      candidateRevisionSha256: value.candidate.reportSha256, artifact: { schemaVersion: "research-review@1" } });
    expect(sha(value.reportPath)).toBe(value.candidate.reportSha256);
  });

  it("rejects invented locations and evidence references", async () => {
    const value = fixture();
    const runner = { run: async () => ({ output: { schemaVersion: "research-review@1", kind: "post",
      candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
      candidateReportSha256: value.candidate.reportSha256, summary: "bad", findings: [{ id: "F-1", location: "/missing",
        issue: "bad", evidenceRefs: ["MADE-UP"], suggestedChange: "fix", priority: "major", kind: "content" }] } }) } as unknown as AgentRunner;
    await expect(runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
      reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath], runner }))
      .rejects.toThrow("SIMPLE_REVIEW_LOCATION_MISSING:F-1");
  });

  it("rejects candidate mutation even when the reviewer returns valid JSON", async () => {
    const value = fixture();
    const runner = { run: async () => {
      fs.writeFileSync(value.reportPath, "{}");
      return { output: { schemaVersion: "research-review@1", kind: "post",
        candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
        candidateReportSha256: value.candidate.reportSha256, summary: "ok", findings: [] } };
    } } as unknown as AgentRunner;
    await expect(runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
      reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath], runner }))
      .rejects.toThrow("SIMPLE_REVIEW_MUTATED_SOURCE");
  });

  it("rejects an unrelated existing absolute file", async () => {
    const value = fixture();
    const unrelated = path.join(value.root, "unrelated.txt");
    fs.writeFileSync(unrelated, "real but not allowlisted");
    const runner = { run: async () => ({ output: { schemaVersion: "research-review@1", kind: "post",
      candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
      candidateReportSha256: value.candidate.reportSha256, summary: "bad", findings: [{ id: "F-1",
        location: "/builderLenses/contentRestoration/blocks/0", issue: "bad", evidenceRefs: [unrelated],
        suggestedChange: "fix", priority: "major", kind: "content" }] } }) } as unknown as AgentRunner;
    await expect(runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
      reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath], runner }))
      .rejects.toThrow("SIMPLE_REVIEW_EVIDENCE_MISSING:F-1");
  });

  it("rejects a missing JSON pointer on an allowlisted artifact", async () => {
    const value = fixture();
    const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    const runtime = path.join(value.root, "runtime");
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
    const runId = "11111111-1111-4111-8111-111111111111";
    const source = path.join(runtime, "runs", runId, "evidence.json");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, JSON.stringify({ frames: [{ id: "FRAME-01" }] }));
    const ref = artifactRef(runId, "evidence.json");
    value.report.builderLenses.contentRestoration.blocks[0]!.evidenceRefs = [ref];
    fs.writeFileSync(value.reportPath, JSON.stringify(value.report));
    value.candidate.reportSha256 = sha(value.reportPath);
    const runner = { run: async () => ({ output: { schemaVersion: "research-review@1", kind: "post",
      candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
      candidateReportSha256: value.candidate.reportSha256, summary: "bad", findings: [{ id: "F-1",
        location: "/builderLenses/contentRestoration/blocks/0", issue: "bad", evidenceRefs: [`${ref}#/frames/9`],
        suggestedChange: "fix", priority: "major", kind: "missing_evidence" }] } }) } as unknown as AgentRunner;
    try {
      await expect(runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
        reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [source], runner }))
        .rejects.toThrow("SIMPLE_REVIEW_EVIDENCE_MISSING:F-1");
    } finally {
      if (previousRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
      else process.env.SELF_MEDIA_RUNTIME_DIR = previousRuntime;
    }
  });

  it("accepts a valid new pointer within an artifact already cited by the candidate", async () => {
    const value = fixture();
    const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
    const runtime = path.join(value.root, "runtime");
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
    const runId = "22222222-2222-4222-8222-222222222222";
    const source = path.join(runtime, "runs", runId, "creator-corpus.json");
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, JSON.stringify({ records: [{ mediaType: "video" }], mediaTypes: { video: 1 } }));
    const ref = artifactRef(runId, "creator-corpus.json");
    value.report.builderLenses.contentRestoration.blocks[0]!.evidenceRefs = [`${ref}#/records/0/mediaType`];
    fs.writeFileSync(value.reportPath, JSON.stringify(value.report));
    value.candidate.reportSha256 = sha(value.reportPath);
    const runner = { run: async () => ({ output: { schemaVersion: "research-review@1", kind: "post",
      candidate: { id: value.candidateRef.id, revision: value.candidateRef.revision, sha256: value.candidateRef.sha256 },
      candidateReportSha256: value.candidate.reportSha256, summary: "aggregate needs a direct citation", findings: [{ id: "F-1",
        location: "/builderLenses/contentRestoration/blocks/0", issue: "use the aggregate field",
        evidenceRefs: [`${ref}#/mediaTypes`], suggestedChange: "cite the aggregate", priority: "minor",
        kind: "missing_evidence" }] } }) } as unknown as AgentRunner;
    try {
      await expect(runSimpleReview({ request: value.request, candidateRef: value.candidateRef, candidate: value.candidate,
        reportPath: value.reportPath, reviewerOperatorPath: value.operatorPath, sourcePaths: [value.sourcePath], runner }))
        .resolves.toMatchObject({ findings: [{ evidenceRefs: [`${ref}#/mediaTypes`] }] });
    } finally {
      if (previousRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
      else process.env.SELF_MEDIA_RUNTIME_DIR = previousRuntime;
    }
  });
});
