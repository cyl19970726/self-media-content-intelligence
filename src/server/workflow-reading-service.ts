import { artifactPayloadSha256, type ArtifactRef, type RunRecord, type RunStore } from "@signal-room/workflow";
import { createWorkflowReadService } from "@signal-room/workflow-read-model";
import type { ArtifactIdentity, ArtifactRelation } from "@signal-room/workflow-read-model/contracts";
import { researchReviewArtifactSchema } from "../../packages/research/index.js";
import { projectArtifactPayload, projectWorkflowHttpError } from "./workflow-public-projection.js";

const identity = (a: ArtifactRef): ArtifactIdentity => ({ id: a.id, revision: a.revision, sha256: a.sha256 });
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" ? v as Record<string, unknown> : {};
const same = (a: ArtifactIdentity, b: ArtifactIdentity) => a.id === b.id && a.revision === b.revision && a.sha256 === b.sha256;
const validIdentity = (v: unknown): v is ArtifactIdentity => {
  const r = object(v); return typeof r.id === "string" && typeof r.revision === "string" && typeof r.sha256 === "string";
};
const safeToken = (v: unknown): string | undefined => typeof v === "string" && /^[a-zA-Z0-9._:-]{1,160}$/u.test(v) ? v : undefined;
const reportSha256 = (value: unknown): string | undefined => {
  const hash = object(value).reportSha256;
  return typeof hash === "string" && /^[a-f0-9]{64}$/iu.test(hash) ? hash : undefined;
};
const hasDependency = (artifact: ArtifactRef, target: ArtifactIdentity) => artifact.dependsOn.some((dependency) =>
  same({ id: dependency.artifactId, revision: dependency.revision, sha256: dependency.sha256 }, target));
const publishedReceiptTypes = new Set(["post-source-check", "post-candidate", "post-review", "creator-synthesis", "creator-review"]);

/** Resolve the nearest business research boundary, rather than the creator's entire history. */
export async function resolveReadingRoot(store: RunStore, selectedId: string): Promise<RunRecord | undefined> {
  let run = await store.getRun(selectedId); const seen = new Set<string>();
  while (run) {
    if (seen.has(run.id)) return undefined;
    seen.add(run.id);
    if (["post.analyze", "creator.analyze", "creator.synthesize"].includes(run.workflowId) || !run.parentRunId) return run;
    const parent = await store.getRun(run.parentRunId);
    if (!parent || parent.metadata?.creatorRunId !== run.metadata?.creatorRunId) return undefined;
    run = parent;
  }
  return undefined;
}

/** Business payloads are interpreted here. The reusable service only handles exact relations. */
export function createResearchReadingService(store: RunStore, payload: (id: string) => Promise<unknown>) {
  return createWorkflowReadService({ store, adapters: {
    title: (kind, _id, step) => kind === "phase" ? step.phaseDefinition?.title : step.kind === "agent" ? "模型调用" : "子流程",
    purpose: (step) => step.phaseDefinition?.purpose,
    error: (_id, error) => {
      if (error.startsWith("SIMPLE_REVIEW_LOCATION_MISSING")) return "审阅意见的位置未通过格式校验，本次结果未采用。";
      return projectWorkflowHttpError(new Error(error)).message;
    },
    readerUrl: (a) => `/api/workflow-runs/${encodeURIComponent(a.producedBy.workflowRunId)}/artifacts/${encodeURIComponent(a.id)}/reader`,
    callFacts: (step, events) => {
      const output = object(step.output);
      // Source-consistency receipts carry their recorded method provenance inside
      // `output.artifact`; other receipt shapes do not claim this field.
      const provenance = object(object(output.artifact).provenance);
      const event = [...events].reverse().find(e => ["agent.usage", "agent.started", "agent.delegate"].includes(e.type));
      const config = object(event?.data);
      return { model: safeToken(config.model ?? provenance.model), reasoningEffort: safeToken(config.reasoningEffort ?? provenance.reasoningEffort), methodRevision: safeToken(provenance.methodRevision), methodDigest: safeToken(provenance.methodSha256) };
    },
    callArtifacts: async (step, artifacts) => {
      if (step.kind !== "agent") return {};
      const receipt = object(step.output);
      if (!("artifact" in receipt)) return {};
      const payloadHash = await artifactPayloadSha256(receipt.artifact);
      const output = artifacts.filter((artifact) => artifact.producedBy.workflowRunId === step.runId
        && publishedReceiptTypes.has(artifact.type) && artifact.sha256 === payloadHash);
      if (output.length !== 1) return {};
      const artifact = output[0]!;
      return { outputs: [identity(artifact)], inputs: artifact.dependsOn.map((dependency) =>
        ({ id: dependency.artifactId, revision: dependency.revision, sha256: dependency.sha256 })) };
    },
    phaseAudience: (step) => step.phasePath?.at(-1) === "revision-artifacts" ? "audit" : "reader",
    phaseFacts: async (step) => {
      const status = object(step.output).stageStatus;
      if (status === "review_incomplete" || status === "revision_incomplete") return { state: "needs_review" };
      if (step.phasePath?.at(-1) !== "simple-review") return {};
      const reference = object(step.output).review;
      if (!validIdentity(reference)) return {};
      const artifact = await store.getArtifact(reference.id);
      if (!artifact || !same(identity(artifact), reference) || artifact.validation !== "valid"
        || !["post-review", "creator-review"].includes(artifact.type)) return {};
      const review = researchReviewArtifactSchema.safeParse(await payload(artifact.id));
      if (!review.success || ((review.data.findings.length === 0 && artifact.review !== "passed")
        || (review.data.findings.length > 0 && artifact.review !== "findings"))) return {};
      const candidate = await store.getArtifact(review.data.candidate.id);
      if (!candidate || !same(identity(candidate), review.data.candidate) || !hasDependency(artifact, review.data.candidate)
        || reportSha256(await payload(candidate.id)) !== review.data.candidateReportSha256) return {};
      return { review: review.data.findings.length ? "findings" : "passed" };
    },
    plan: (root) => ({ closed: ["succeeded", "failed", "canceled", "blocked", "needs_review"].includes(root.state) }),
    isDeliverable: (artifact) => artifact.type === "post-candidate" || artifact.type === "creator-synthesis",
    externalArtifact: async (reference, root) => {
      const creatorRunId = root.metadata?.creatorRunId;
      if (typeof creatorRunId !== "string") return undefined;
      const artifact = await store.getArtifact(reference.id);
      if (!artifact || !same(identity(artifact), reference)) return undefined;
      const owner = await store.getRun(artifact.producedBy.workflowRunId);
      return owner?.metadata?.creatorRunId === creatorRunId ? artifact : undefined;
    },
    relations: async (artifact) => {
      const relations: (Omit<ArtifactRelation, "validity"> & { validity?: "mismatch" | "missing" })[] = [];
      if (artifact.validation !== "valid") return relations;
      if (["post-review", "creator-review"].includes(artifact.type)) {
        const parsed = researchReviewArtifactSchema.safeParse(await payload(artifact.id));
        if (parsed.success) {
          const review = parsed.data; const candidate = await store.getArtifact(review.candidate.id);
          const bindingValid = candidate && same(identity(candidate), review.candidate)
            && artifact.dependsOn.some(d => same({ id: d.artifactId, revision: d.revision, sha256: d.sha256 }, review.candidate))
            && object(await payload(candidate.id)).reportSha256 === review.candidateReportSha256
            && ((review.findings.length === 0 && artifact.review === "passed") || (review.findings.length > 0 && artifact.review === "findings"));
          relations.push({ kind: "reviews", from: identity(artifact), to: review.candidate,
            ...(!bindingValid ? { validity: candidate ? "mismatch" as const : "missing" as const } : {}) });
        }
      }
      if (artifact.type === "research-revision") {
        const projected = object(projectArtifactPayload(artifact, await payload(artifact.id)));
        if (validIdentity(projected.candidate) && validIdentity(projected.baseCandidate) && validIdentity(projected.review)) {
          const references = [projected.candidate, projected.baseCandidate, projected.review];
          const values = await Promise.all(references.map(reference => store.getArtifact(reference.id)));
          const [, baseCandidate, reviewArtifact] = values;
          const root = await resolveReadingRoot(store, artifact.producedBy.workflowRunId);
          const creatorRunId = root?.metadata?.creatorRunId;
          const owners = await Promise.all(values.map(value => value ? store.getRun(value.producedBy.workflowRunId) : undefined));
          const review = reviewArtifact && researchReviewArtifactSchema.safeParse(await payload(reviewArtifact.id));
          const reviewBindingValid = review?.success && reviewArtifact && baseCandidate
            && reviewArtifact.validation === "valid" && ["post-review", "creator-review"].includes(reviewArtifact.type)
            && hasDependency(reviewArtifact, projected.baseCandidate)
            && same(review.data.candidate, projected.baseCandidate)
            && review.data.candidateReportSha256 === reportSha256(await payload(baseCandidate.id))
            && ((review.data.findings.length === 0 && reviewArtifact.review === "passed")
              || (review.data.findings.length > 0 && reviewArtifact.review === "findings"));
          if (creatorRunId && values.every((value, index) => value && same(identity(value), references[index]!))
            && owners.every(owner => owner?.metadata?.creatorRunId === creatorRunId)
            && references.every(reference => hasDependency(artifact, reference)) && reviewBindingValid) {
            relations.push({ kind: "revises", from: projected.candidate, to: projected.baseCandidate });
          }
        }
      }
      // A completed business workflow explicitly returns its chosen candidate. Do not
      // infer a winner from arbitrary dependency edges, publication times or hashes.
      if (["post-candidate", "creator-synthesis"].includes(artifact.type)) {
        const root = await resolveReadingRoot(store, artifact.producedBy.workflowRunId);
        const output = object(root?.output); const chosen = output.candidate ?? output.synthesis;
        if (validIdentity(chosen) && same(identity(artifact), chosen)) relations.push({ kind: "selected", from: identity(artifact), to: identity(artifact) });
      }
      return relations;
    }
  } });
}
