import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type {
  CreatorSynthesisWorkflowStartInput, PostWorkflowStartInput,
} from "../../../research/index.js";
import { runWorkflow, workflow, type ArtifactRef, type RunStore } from "@signal-room/workflow";
import { artifactPath } from "../core/artifacts.js";
import { projectRoot } from "../core/config.js";

export type PinnedResearchInput = {
  kind: "post" | "creator";
  source: PostWorkflowStartInput | CreatorSynthesisWorkflowStartInput;
  files: Array<{ ref: string; sha256: string }>;
  methods: Array<{ path: string; sha256: string }>;
  researchScope?: { complete: boolean; posts: Array<{ postExternalId: string; candidate: ArtifactRef;
    review?: ArtifactRef; reviewStatus: string; candidateStatus: string }> };
  reuseCandidate?: { artifactRef: string; sha256: string };
  reuseEvaluation?: { artifactRef: string; sha256: string; candidateSha256: string };
};
export const fileDigest = (file: string): string => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const canonicalArtifactReference = /^\/artifacts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+/iu;

function isDiagnosticEvidencePointer(parent: Record<string, unknown> | undefined, key: string | undefined): boolean {
  return key === "artifactRef" && typeof parent?.kind === "string" && typeof parent.refId === "string";
}

/**
 * Runtime three-lens evaluators describe files beside their candidate with a
 * short `/artifacts/<workflow>/<attempt>/<post>/...` pointer.  That is not a
 * standalone artifact reference: its creator-run prefix and
 * `workflow-reconstructions/` segment live on candidateRevision instead.
 * Resolve only an exact same-candidate suffix, so unrelated artifact-looking
 * strings cannot be silently admitted to the frozen input graph.
 */
function resolveReportLocalEvidenceReference(reference: string, reconstructionArtifactRef: string | undefined): string | null {
  if (!reconstructionArtifactRef) return null;
  const candidate = reconstructionArtifactRef.match(/^\/artifacts\/([^/]+)\/workflow-reconstructions\/(.+)\/reconstruction\.json$/u);
  const local = reference.match(/^\/artifacts\/(.+)$/u);
  if (!candidate?.[1] || !candidate[2] || !local?.[1]) return null;
  const candidateRoot = candidate[2];
  if (!local[1].startsWith(`${candidateRoot}/`) || local[1].split("/").includes("..")) return null;
  return `/artifacts/${candidate[1]}/workflow-reconstructions/${local[1]}`;
}

function evaluationCandidateReference(value: Record<string, unknown>): string | undefined {
  const candidateRevision = value.candidateRevision;
  if (!candidateRevision || typeof candidateRevision !== "object" || Array.isArray(candidateRevision)) return undefined;
  const reconstructionArtifactRef = (candidateRevision as Record<string, unknown>).reconstructionArtifactRef;
  return typeof reconstructionArtifactRef === "string" ? reconstructionArtifactRef.split("#")[0] : undefined;
}

export function methodSnapshot(kind: "post" | "creator") {
  const files = kind === "post" ? [
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
  ] : [
    ".agents/skills/creator-synthesis/SKILL.md",
    ".agents/skills/creator-synthesis/references/method.md",
    "packages/adapters/src/platform/synthesis/codex-creator-synthesis-executor.ts",
    "packages/adapters/src/platform/synthesis/creator-synthesis-reuse.ts",
    "packages/research/src/creator-synthesis/contracts.ts",
    "packages/research/src/creator-synthesis/cross-post-specificity.ts",
    "packages/research/src/creator-synthesis/validate.ts",
  ];
  return [...files,
    `.agents/skills/${kind === "post" ? "video-content-reconstruction" : "creator-synthesis"}/references/reviewer-operator.md`,
    "packages/research/src/workflows/simple-review-contract.ts",
    "packages/adapters/src/workflow/simple-review-runner.ts",
    "packages/adapters/src/workflow/codex-sdk-runner.ts"]
    .map((relative) => ({ path: relative, sha256: fileDigest(path.join(projectRoot, relative)) }));
}

/** Pins existing references and their complete JSON dependency graph, without inventing content. */
export function pinResearchInput(kind: "post" | "creator", source: PinnedResearchInput["source"]): PinnedResearchInput {
  const found = new Map<string, string>();
  const visit = (value: unknown, parent?: Record<string, unknown>, key?: string, reportArtifactRef?: string): void => {
    if (typeof value === "string" && /^\/artifacts\//u.test(value)) {
      const rawRef = value.split("#")[0]!;
      // Evaluator evidence pointers use report-local paths such as
      // /artifacts/reconstruction.json. When a pointer has the known
      // workflow-local shape, anchor it to that evaluator's frozen candidate
      // so the actual evidence bytes are pinned too.
      const ref = isDiagnosticEvidencePointer(parent, key)
        ? resolveReportLocalEvidenceReference(rawRef, reportArtifactRef) ?? rawRef
        : rawRef;
      if (!canonicalArtifactReference.test(ref) && isDiagnosticEvidencePointer(parent, key)) return;
      if (found.has(ref)) return;
      const file = artifactPath(ref);
      found.set(ref, fileDigest(file));
      if (file.endsWith(".json")) visit(JSON.parse(fs.readFileSync(file, "utf8")) as unknown, undefined, undefined, reportArtifactRef);
    } else if (Array.isArray(value)) value.forEach((item) => visit(item, undefined, undefined, reportArtifactRef));
    else if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      const candidateRef = evaluationCandidateReference(object) ?? reportArtifactRef;
      Object.entries(object).forEach(([entryKey, entry]) => visit(entry, object, entryKey, candidateRef));
    }
  };
  // A post uses its own source evidence, not every other candidate in the batch.
  const { reconstructionBatchArtifactRef, ...postSources } = source;
  visit(kind === "post" ? postSources : source);
  let reuseCandidate: PinnedResearchInput["reuseCandidate"];
  let reuseEvaluation: PinnedResearchInput["reuseEvaluation"];
  if (kind === "post") {
    found.set(reconstructionBatchArtifactRef, fileDigest(artifactPath(reconstructionBatchArtifactRef)));
    const batch = JSON.parse(fs.readFileSync(artifactPath(reconstructionBatchArtifactRef), "utf8")) as { items: Array<{
      postExternalId: string; reconstructionArtifactRef?: string | null; evaluationArtifactRef?: string | null;
    }> };
    const ref = batch.items.find((item) => item.postExternalId === (source as PostWorkflowStartInput).postExternalId)?.reconstructionArtifactRef;
    if (ref) {
      visit(ref);
      reuseCandidate = { artifactRef: ref, sha256: found.get(ref)! };
    }
    if ((source as PostWorkflowStartInput).evaluationMode === "repair_existing_invalid") {
      const item = batch.items.find((entry) => entry.postExternalId === (source as PostWorkflowStartInput).postExternalId);
      const explicitEvaluationRef = (source as PostWorkflowStartInput).importedEvaluationArtifactRef;
      const evaluationRef = explicitEvaluationRef ?? item?.evaluationArtifactRef;
      if (!item?.reconstructionArtifactRef || !evaluationRef || item.reconstructionArtifactRef !== ref) {
        throw new Error("REUSE_EVALUATION_BATCH_BINDING_MISSING");
      }
      if (path.dirname(artifactPath(evaluationRef)) !== path.dirname(artifactPath(item.reconstructionArtifactRef))) {
        throw new Error("REUSE_EVALUATION_CANDIDATE_DIRECTORY_MISMATCH");
      }
      const evaluatorRunPath = path.join(path.dirname(artifactPath(evaluationRef)), "evaluator-run.json");
      if (!fs.existsSync(evaluatorRunPath)) throw new Error("REUSE_EVALUATION_PROVENANCE_MISSING");
      const evaluatorRun = JSON.parse(fs.readFileSync(evaluatorRunPath, "utf8")) as { candidateRevision?: unknown };
      const candidateSha256 = fileDigest(artifactPath(item.reconstructionArtifactRef));
      if (evaluatorRun.candidateRevision !== candidateSha256) throw new Error("REUSE_EVALUATION_CANDIDATE_MISMATCH");
      visit(evaluationRef);
      reuseEvaluation = { artifactRef: evaluationRef, sha256: found.get(evaluationRef)!, candidateSha256 };
    }
  }
  return { kind, source, files: [...found].map(([ref, sha256]) => ({ ref, sha256 })), methods: methodSnapshot(kind),
    ...(reuseCandidate ? { reuseCandidate } : {}), ...(reuseEvaluation ? { reuseEvaluation } : {}) };
}

export function assertPinnedResearchInput(input: PinnedResearchInput): void {
  for (const file of input.files) {
    if (fileDigest(artifactPath(file.ref)) !== file.sha256) throw new Error(`FROZEN_SOURCE_CHANGED: ${file.ref}`);
  }
  for (const file of input.methods) {
    if (fileDigest(path.join(projectRoot, file.path)) !== file.sha256) throw new Error(`FROZEN_METHOD_CHANGED: ${file.path}`);
  }
}

export async function registerResearchInput(store: RunStore, pinned: PinnedResearchInput): Promise<ArtifactRef> {
  const definition = workflow<PinnedResearchInput, ArtifactRef>(`${pinned.kind}.prepare`, { revision: "1" }, async (ctx, input) =>
    ctx.publish("frozen-input", `${input.kind}-evidence`, input, { schemaVersion: "research-input@1", validation: "valid", review: "not_applicable" }));
  const result = await runWorkflow({ workflow: definition, input: pinned, store,
    agentRunner: { async run() { throw new Error("Input preparation cannot invoke an agent"); } },
    metadata: { creatorRunId: pinned.source.creatorRunId, ...(pinned.kind === "post" ? { postId: (pinned.source as PostWorkflowStartInput).postExternalId } : {}) } });
  if (!result.output) throw new Error("Research input registration failed");
  return result.output;
}
