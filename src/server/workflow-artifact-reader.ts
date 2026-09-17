import fs from "node:fs";
import { createHash } from "node:crypto";
import { artifactPath } from "../../packages/adapters/index.js";
import { creatorSynthesisSchema, videoReconstructionBatchSchema, type CreatorResearchService, type CreatorSynthesisWorkflowStartInput } from "../../packages/research/index.js";
import type { RunStore } from "../../packages/workflow/index.js";
import { loadWorkflowVideoResearch } from "./video-research.js";
import { loadWorkflowCreatorReader } from "./workflow-creator-reader.js";

type Candidate = {
  evidence: { id: string; sha256: string };
  reportArtifactRef: string;
  reportSha256: string;
  outcome: Record<string, unknown>;
};

async function pinnedPostCandidateHrefs(store: RunStore, payload: (id: string) => Promise<unknown>,
  creatorRunId: string, reconstructionBatchArtifactRef: string): Promise<Map<string, string>> {
  const batch = videoReconstructionBatchSchema.parse(JSON.parse(fs.readFileSync(artifactPath(reconstructionBatchArtifactRef), "utf8")));
  const pinnedByReport = new Map(batch.items.flatMap((item) => item.reconstructionArtifactRef
    ? [[item.reconstructionArtifactRef, item.postExternalId] as const] : []));
  const hrefs = new Map<string, string>();
  if (!pinnedByReport.size) return hrefs;
  const runs = await store.listRuns({ creatorRunId });
  for (const run of runs) {
    for (const artifact of await store.listArtifacts(run.id)) {
      if (artifact.type !== "post-candidate" || artifact.schemaVersion !== "v1") continue;
      const candidate = await payload(artifact.id) as Partial<Candidate>;
      if (typeof candidate.reportArtifactRef !== "string" || typeof candidate.reportSha256 !== "string") continue;
      const postExternalId = pinnedByReport.get(candidate.reportArtifactRef);
      if (!postExternalId || hrefs.has(postExternalId)) continue;
      try {
        const reportSha256 = createHash("sha256").update(fs.readFileSync(artifactPath(candidate.reportArtifactRef))).digest("hex");
        if (reportSha256 === candidate.reportSha256) hrefs.set(postExternalId, `/workflow-runs/${encodeURIComponent(run.id)}#artifact-${artifact.id}`);
      } catch { /* A missing historical file is not a safe reader link. */ }
    }
  }
  return hrefs;
}

/** Registered versions only: callers cannot supply arbitrary artifact paths. */
export async function loadWorkflowArtifactReader(store: RunStore, payload: (id: string) => Promise<unknown>,
  creators: CreatorResearchService, runId: string, artifactId: string) {
  const [run, asset] = await Promise.all([store.getRun(runId), store.getArtifact(artifactId)]);
  if (!run || !asset || asset.producedBy.workflowRunId !== runId || asset.schemaVersion !== "v1"
    || !["post-candidate", "creator-synthesis"].includes(asset.type)) return null;
  const creatorRunId = run.metadata?.creatorRunId;
  if (typeof creatorRunId !== "string") return null;
  const candidate = await payload(artifactId) as Candidate;
  const evidence = await store.getArtifact(candidate.evidence.id);
  if (!evidence || evidence.sha256 !== candidate.evidence.sha256) throw new Error("CANDIDATE_EVIDENCE_REVISION_MISMATCH");
  const frozen = await payload(evidence.id) as {
    source: CreatorSynthesisWorkflowStartInput & { postExternalId?: string };
    files: Array<{ ref: string; sha256: string }>;
  };
  if (frozen.source.creatorRunId !== creatorRunId) throw new Error("CANDIDATE_SOURCE_RUN_MISMATCH");
  if (asset.type === "post-candidate") {
    if (typeof frozen.source.postExternalId !== "string") return null;
    const data = loadWorkflowVideoResearch(creators, creatorRunId, frozen.source.postExternalId, candidate);
    return data ? { kind: "post" as const, data } : null;
  }
  // The synthesis executor registers content-addressed reports at the run root;
  // its private attempt directory is not the public report location.
  const namespace = `/artifacts/${creatorRunId}/`;
  if (!candidate.reportArtifactRef.startsWith(namespace)) return null;
  const relativeReport = candidate.reportArtifactRef.slice(namespace.length);
  if (!/^creator-analysis\.[a-f0-9]+\.json$/u.test(relativeReport)
    && !relativeReport.startsWith("workflow-synthesis/")) return null;
  const reportBytes = fs.readFileSync(artifactPath(candidate.reportArtifactRef));
  if (createHash("sha256").update(reportBytes).digest("hex") !== candidate.reportSha256) throw new Error("CANDIDATE_REVISION_CHANGED");
  const source = frozen.source;
  for (const ref of [source.portfolioArtifactRef, source.portfolioAnnotationsArtifactRef, source.selectionArtifactRef,
    source.detailArtifactRef, source.reconstructionBatchArtifactRef]) {
    const expected = frozen.files.find((file) => file.ref === ref);
    if (!expected || createHash("sha256").update(fs.readFileSync(artifactPath(ref))).digest("hex") !== expected.sha256) {
      throw new Error(`FROZEN_SOURCE_CHANGED: ${ref}`);
    }
  }
  const evidenceHrefByPost = await pinnedPostCandidateHrefs(store, payload, creatorRunId, source.reconstructionBatchArtifactRef);
  return { kind: "creator" as const, data: loadWorkflowCreatorReader({
    report: creatorSynthesisSchema.parse(JSON.parse(reportBytes.toString("utf8"))), source,
    creatorName: creators.get(creatorRunId)?.creatorName ?? null,
    evidenceHrefByPost,
  }) };
}
