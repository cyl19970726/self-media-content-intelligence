import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRunStore } from "@signal-room/workflow";
import type { CreatorSynthesisWorkflowStartInput, PostWorkflowStartInput } from "../../../research/index.js";

const fixture = vi.hoisted(() => ({ root: `/tmp/research-inputs-${process.pid}` }));

vi.mock("../core/config.js", () => ({ projectRoot: fixture.root }));
vi.mock("../core/artifacts.js", () => ({
  artifactPath: (reference: string) => `${fixture.root}/artifacts/${reference.replace(/^\/artifacts\//u, "")}`,
}));

import { assertPinnedResearchInput, pinResearchInput, registerResearchInput } from "./research-inputs.js";

const methodFiles = [
  ".agents/skills/video-content-reconstruction/SKILL.md",
  ".agents/skills/video-content-reconstruction/references/builder-operator.md",
  ".agents/skills/video-content-reconstruction/references/evaluator-operator.md",
  ".agents/skills/video-content-reconstruction/references/single-post-depth.md",
  ".agents/skills/video-content-reconstruction/references/source-consistency.md",
  ".agents/skills/video-content-reconstruction/schemas/reconstruction.schema.json",
  ".agents/skills/video-content-reconstruction/schemas/evaluation.schema.json",
  ".agents/skills/video-content-reconstruction/schemas/capture-protocol.schema.json",
  ".agents/skills/video-content-reconstruction/scripts/validate-reconstruction.mjs",
  ".agents/skills/video-content-reconstruction/scripts/build-evaluator-overview.mjs",
  "packages/adapters/src/platform/video/codex-video-reconstruction-executor.ts",
  "packages/adapters/src/platform/video/video-codex-execution.ts",
  "packages/adapters/src/workflow/post-evaluation-repair.ts",
  "packages/adapters/src/workflow/source-consistency-checker.ts",
  "packages/research/src/video-analysis/runtime-three-lens-contracts.ts",
  "packages/adapters/src/workflow/codex-sdk-runner.ts",
  ".agents/skills/video-content-reconstruction/references/reviewer-operator.md",
  "packages/research/src/workflows/simple-review-contract.ts",
  "packages/adapters/src/workflow/simple-review-runner.ts",
  ".agents/skills/creator-synthesis/SKILL.md",
  ".agents/skills/creator-synthesis/references/method.md",
  ".agents/skills/creator-synthesis/references/reviewer-operator.md",
  "packages/adapters/src/platform/synthesis/codex-creator-synthesis-executor.ts",
  "packages/adapters/src/platform/synthesis/creator-synthesis-reuse.ts",
  "packages/research/src/creator-synthesis/contracts.ts",
  "packages/research/src/creator-synthesis/cross-post-specificity.ts",
  "packages/research/src/creator-synthesis/validate.ts",
];

function ref(run: string, file: string) { return `/artifacts/${run}/${file}`; }
function write(reference: string, value: unknown) {
  const target = path.join(fixture.root, "artifacts", reference.replace(/^\/artifacts\//u, ""));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value), "utf8");
}
function postInput() {
  return { creatorRunId: "creator-1", postExternalId: "post-1", sourceUrl: "https://example.test/post-1",
    sourceMediaArtifactRef: ref("media", "media.json"), detailArtifactRef: ref("detail", "detail.json"),
    mediaManifestArtifactRef: ref("manifest", "media-manifest.json"), selectionArtifactRef: ref("selection", "selection.json"),
    reconstructionBatchArtifactRef: ref("batch", "reconstruction-batch.json") };
}
function creatorInput(): CreatorSynthesisWorkflowStartInput {
  return { creatorRunId: "creator-1", portfolioArtifactRef: ref("creator-1", "portfolio.json"),
    portfolioAnnotationsArtifactRef: ref("creator-1", "annotations.json"),
    selectionArtifactRef: ref("creator-1", "selection.json"), detailArtifactRef: ref("creator-1", "detail.json"),
    reconstructionBatchArtifactRef: ref("creator-1", "batch.json") };
}

beforeEach(() => {
  fs.rmSync(fixture.root, { recursive: true, force: true }); fs.mkdirSync(fixture.root, { recursive: true });
  methodFiles.forEach((file) => { const target = path.join(fixture.root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `method:${file}`, "utf8"); });
  write(ref("media", "media.json"), { media: true });
  write(ref("detail", "detail.json"), { detail: true, source: ref("deep-source", "source.json") });
  write(ref("deep-source", "source.json"), { immutable: "source-graph" });
  write(ref("manifest", "media-manifest.json"), { manifest: true });
  write(ref("selection", "selection.json"), { selected: ["post-1"] });
  write(ref("candidate-own", "reconstruction.json"), { candidate: "post-1", evidence: ref("candidate-evidence", "evidence.json") });
  write(ref("candidate-evidence", "evidence.json"), { cue: "own-only" });
  write(ref("candidate-other", "reconstruction.json"), { candidate: "post-2" });
  write(ref("batch", "reconstruction-batch.json"), { items: [
    { postExternalId: "post-1", reconstructionArtifactRef: ref("candidate-own", "reconstruction.json") },
    { postExternalId: "post-2", reconstructionArtifactRef: ref("candidate-other", "reconstruction.json") },
  ] });
  write(ref("creator-1", "portfolio.json"), { posts: [] });
  write(ref("creator-1", "annotations.json"), { annotations: [] });
  write(ref("creator-1", "selection.json"), { selected: [] });
  write(ref("creator-1", "detail.json"), { creator: "creator-1" });
});
afterAll(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

describe("research input pinning", () => {
  it("pins only the requested post candidate and its source JSON graph", () => {
    const pinned = pinResearchInput("post", postInput());
    expect(pinned.reuseCandidate?.artifactRef).toBe(ref("candidate-own", "reconstruction.json"));
    expect(pinned.files.map((file) => file.ref)).toEqual(expect.arrayContaining([
      ref("batch", "reconstruction-batch.json"), ref("candidate-own", "reconstruction.json"),
      ref("candidate-evidence", "evidence.json"), ref("deep-source", "source.json"),
    ]));
    expect(pinned.files.map((file) => file.ref)).not.toContain(ref("candidate-other", "reconstruction.json"));
  });

  it("pins an explicitly requested imported invalid evaluation only when it is bound to this candidate revision", () => {
    const candidate = ref("candidate-own", "reconstruction.json");
    const evaluation = ref("candidate-own", "evaluation.json");
    const candidatePath = path.join(fixture.root, "artifacts", candidate.replace(/^\/artifacts\//u, ""));
    const candidateSha256 = crypto.createHash("sha256").update(fs.readFileSync(candidatePath)).digest("hex");
    write(evaluation, { invalid: "relation" });
    write(ref("candidate-own", "evaluator-run.json"), { candidateRevision: candidateSha256 });
    write(ref("batch", "reconstruction-batch.json"), { items: [
      { postExternalId: "post-1", reconstructionArtifactRef: candidate, evaluationArtifactRef: null },
      { postExternalId: "post-2", reconstructionArtifactRef: ref("candidate-other", "reconstruction.json"), evaluationArtifactRef: null },
    ] });
    const pinned = pinResearchInput("post", { ...postInput(), evaluationMode: "repair_existing_invalid", importedEvaluationArtifactRef: evaluation });
    expect(pinned.reuseEvaluation).toMatchObject({ artifactRef: evaluation, candidateSha256 });
    expect(pinned.files.map((file) => file.ref)).toContain(evaluation);
  });

  it("resolves a workflow-local evaluator evidence pointer to the frozen candidate evidence", () => {
    const evaluation = ref("creator-1", "runtime-three-lens-evaluation.json");
    const creatorRunId = "11111111-1111-4111-8111-111111111111";
    const reconstruction = ref(creatorRunId, "workflow-reconstructions/workflow-1/attempt-1/post-1/reconstruction.json");
    const targeted = ref(creatorRunId, "workflow-reconstructions/workflow-1/attempt-1/post-1/targeted-evidence/targeted-evidence.json");
    write(reconstruction, { candidate: "post-1" });
    write(targeted, { frames: ["frozen-frame"] });
    write(evaluation, { candidateRevision: { reconstructionArtifactRef: reconstruction }, sections: [{ evidenceRefs: [
      { kind: "claim", refId: "CB-END", artifactRef: "/artifacts/workflow-1/attempt-1/post-1/reconstruction.json" },
      { kind: "frame", refId: "TARGET-0019", artifactRef: "/artifacts/workflow-1/attempt-1/post-1/targeted-evidence/targeted-evidence.json" },
    ] }] });
    write(ref("creator-1", "batch.json"), { items: [{ postExternalId: "post-1", threeLensEvaluationArtifactRef: evaluation }] });

    const pinned = pinResearchInput("creator", creatorInput());

    expect(pinned.files.map((file) => file.ref)).toContain(evaluation);
    expect(pinned.files.map((file) => file.ref)).toEqual(expect.arrayContaining([reconstruction, targeted]));
    fs.rmSync(path.join(fixture.root, "artifacts", targeted.replace(/^\/artifacts\//u, "")));
    expect(() => pinResearchInput("creator", creatorInput())).toThrow(/targeted-evidence\.json/u);
  });

  it("still rejects malformed declared artifact dependencies", () => {
    write(ref("creator-1", "batch.json"), { items: [
      { postExternalId: "post-1", reconstructionArtifactRef: "/artifacts/reconstruction.json" },
    ] });

    expect(() => pinResearchInput("creator", creatorInput())).toThrow(/reconstruction\.json/u);
  });

  it("still rejects a missing canonical dependency", () => {
    const missing = ref("11111111-1111-4111-8111-111111111111", "missing.json");
    write(ref("creator-1", "batch.json"), { items: [
      { postExternalId: "post-1", reconstructionArtifactRef: missing },
    ] });

    expect(() => pinResearchInput("creator", creatorInput())).toThrow(/missing\.json/u);
  });

  it("rejects changes to a pinned candidate, source graph, or method snapshot", () => {
    const candidatePinned = pinResearchInput("post", postInput());
    write(ref("candidate-own", "reconstruction.json"), { candidate: "modified" });
    expect(() => assertPinnedResearchInput(candidatePinned)).toThrow(`FROZEN_SOURCE_CHANGED: ${ref("candidate-own", "reconstruction.json")}`);

    const sourcePinned = pinResearchInput("post", postInput());
    write(ref("deep-source", "source.json"), { immutable: "modified" });
    expect(() => assertPinnedResearchInput(sourcePinned)).toThrow(`FROZEN_SOURCE_CHANGED: ${ref("deep-source", "source.json")}`);

    const methodPinned = pinResearchInput("post", postInput());
    const evaluatorContract = ".agents/skills/video-content-reconstruction/schemas/evaluation.schema.json";
    fs.appendFileSync(path.join(fixture.root, evaluatorContract), "\nchanged", "utf8");
    expect(() => assertPinnedResearchInput(methodPinned)).toThrow(`FROZEN_METHOD_CHANGED: ${evaluatorContract}`);
  });

  it("registers an immutable, provenance-bearing frozen-input artifact", async () => {
    const pinned = pinResearchInput("post", postInput());
    const store = new MemoryRunStore();
    const artifact = await registerResearchInput(store, pinned);
    (pinned.source as PostWorkflowStartInput).postExternalId = "mutated-after-registration";
    const saved = store.artifacts.find((item) => item.id === artifact.id)!;
    expect(saved).toMatchObject({ type: "post-evidence", schemaVersion: "research-input@1", validation: "valid", review: "not_applicable",
      producedBy: { workflowRunId: expect.any(String), stepRunId: expect.any(String), attemptId: expect.any(String) } });
    expect(saved.payload).toMatchObject({ kind: "post", source: { creatorRunId: "creator-1", postExternalId: "post-1" }, reuseCandidate: { artifactRef: ref("candidate-own", "reconstruction.json") } });
  });
});
