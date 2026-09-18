import type { ArtifactRef, RunRecord, RunStore } from "@signal-room/workflow";
import { researchReviewArtifactSchema } from "../../packages/research/index.js";
import { createResearchReadingService } from "./workflow-reading-service.js";
import type { ProgressView } from "@signal-room/workflow-read-model/contracts";

type ReadingState = "queued" | "running" | "waiting" | "blocked" | "needs_review" | "succeeded" | "failed" | "canceled";
type Disposition = { id: string; status: "changed" | "disputed" | "missing_evidence"; reason: string };
export type PostWorkflowReading = {
  workflow: { rootRunId: string; state: ReadingState; workflowId: string; workflowRevision: string; selectedFrom: "latest" | "explicit" } | null;
  progress?: ProgressView;
  phases: Array<{ id: string; title: string; state: ReadingState; purpose: string; reason?: string;
    usage: { attempts: number; inputTokens: number | null; outputTokens: number | null; unknown: boolean } }>;
  candidate: { ownerRunId: string; artifactId: string; artifactType: "post-candidate"; revision: string; sha256: string;
    reviewStatus: "unknown" | "pending" | "findings" | "reviewed"; revisionStatus: "none" | "revision_recorded" | "revision_unverified"; readerHref: string } | null;
  baseCandidate: { ownerRunId: string; artifactId: string; readerHref: string } | null;
  dispositions: Disposition[];
};

type RevisionPayload = { schemaVersion?: unknown; baseCandidate?: unknown; review?: unknown; candidate?: unknown; dispositions?: unknown; validation?: unknown };
type ArtifactIdentity = { id: string; revision: string; sha256: string };

function identity(value: unknown): ArtifactIdentity | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.revision === "string" && typeof item.sha256 === "string"
    ? { id: item.id, revision: item.revision, sha256: item.sha256 } : null;
}

function dispositions(value: unknown): Disposition[] | null {
  if (!Array.isArray(value)) return null;
  const rows: Disposition[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.reason !== "string"
      || !["changed", "disputed", "missing_evidence"].includes(String(row.status))) return null;
    rows.push({ id: row.id, status: row.status as Disposition["status"], reason: row.reason });
  }
  return rows;
}

function validRevision(payload: unknown): { baseCandidate: ArtifactIdentity; review: ArtifactIdentity; candidate: ArtifactIdentity; dispositions: Disposition[] } | null {
  const record = payload as RevisionPayload | null;
  if (!record || record.schemaVersion !== "research-revision@1" || (record.validation as { valid?: unknown } | null)?.valid !== true) return null;
  // A revision is meaningful only when all three links are explicit and its dispositions pass the public contract.
  const baseCandidate = identity(record.baseCandidate);
  const review = identity(record.review);
  if (!baseCandidate || !review) return null;
  const candidate = identity(record.candidate); const rows = dispositions(record.dispositions);
  return candidate && rows ? { baseCandidate, review, candidate, dispositions: rows } : null;
}

function same(left: ArtifactIdentity, right: ArtifactIdentity): boolean {
  return left.id === right.id && left.revision === right.revision && left.sha256 === right.sha256;
}

function matchesPostRoot(run: RunRecord, creatorRunId: string, postId: string): boolean {
  return run.workflowId === "post.analyze"
    && run.metadata?.creatorRunId === creatorRunId && run.metadata?.postId === postId;
}

async function rootOf(store: RunStore, id: string): Promise<RunRecord | undefined> {
  let run = await store.getRun(id); const seen = new Set<string>();
  while (run) {
    if (run.workflowId === "post.analyze") return run;
    if (seen.has(run.id)) return undefined;
    seen.add(run.id);
    run = run.parentRunId ? await store.getRun(run.parentRunId) : undefined;
  }
  return undefined;
}

async function createdAt(store: RunStore, run: RunRecord): Promise<number> {
  const declared = run.metadata?.createdAt;
  if (typeof declared === "string" && Number.isFinite(Date.parse(declared))) return Date.parse(declared);
  const events = await store.listEvents(run.id);
  const first = events.map((event) => Date.parse(event.timestamp)).filter(Number.isFinite).sort((a, b) => a - b)[0];
  return first ?? Number.NEGATIVE_INFINITY;
}

async function boundPostReviewStatus(candidate: ArtifactRef, assets: ArtifactRef[], artifactPayload: (id: string) => Promise<unknown>, legacyWorkflow: boolean): Promise<"pending" | "findings" | "reviewed"> {
  const payload = await artifactPayload(candidate.id);
  const reportSha256 = payload && typeof payload === "object" && "reportSha256" in payload ? (payload as { reportSha256?: unknown }).reportSha256 : null;
  const statuses = new Set<"findings" | "reviewed">();
  for (const asset of assets) {
    if (asset.validation !== "valid" || !asset.dependsOn.some((link) => link.artifactId === candidate.id
      && link.revision === candidate.revision && link.sha256 === candidate.sha256)) continue;
    if (legacyWorkflow && asset.type === "post-evaluation" && asset.schemaVersion === "v1") {
      if (asset.review === "passed") statuses.add("reviewed");
      else if (asset.review === "findings") statuses.add("findings");
      continue;
    }
    if (asset.type !== "post-review" || asset.schemaVersion !== "research-review@1"
      || typeof reportSha256 !== "string" || !/^[a-f0-9]{64}$/iu.test(reportSha256)) continue;
    const parsed = researchReviewArtifactSchema.safeParse(await artifactPayload(asset.id));
    if (!parsed.success || parsed.data.kind !== "post") continue;
    const review = parsed.data;
    if (review.candidate.id !== candidate.id || review.candidate.revision !== candidate.revision || review.candidate.sha256 !== candidate.sha256
      || review.candidateReportSha256 !== reportSha256) continue;
    if (review.findings.length === 0 && asset.review === "passed") statuses.add("reviewed");
    else if (review.findings.length > 0 && asset.review === "findings") statuses.add("findings");
  }
  return statuses.size === 1 ? [...statuses][0]! : "pending";
}

function reviewIsActive(snapshot: { stages: Array<{ path: string[]; state: string }> }): boolean {
  return snapshot.stages.some((stage) => stage.path.at(-1) === "simple-review"
    && ["queued", "running", "waiting"].includes(stage.state));
}

/** Report-first projection: only durable post phases and exact, valid candidate lineage are exposed. */
export async function projectPostWorkflowReading(store: RunStore, artifactPayload: (id: string) => Promise<unknown>,
  creatorRunId: string, postId: string, requestedWorkflowRunId?: string): Promise<PostWorkflowReading | undefined> {
  let root: RunRecord | undefined; let selectedFrom: "latest" | "explicit";
  if (requestedWorkflowRunId) {
    root = await rootOf(store, requestedWorkflowRunId); selectedFrom = "explicit";
    if (!root || !matchesPostRoot(root, creatorRunId, postId)) return undefined;
  } else {
    selectedFrom = "latest";
    const roots = (await store.listRuns({ metadata: { creatorRunId } })).filter((run) => matchesPostRoot(run, creatorRunId, postId));
    if (roots.length === 0) return { workflow: null, phases: [], candidate: null, baseCandidate: null, dispositions: [] };
    const dated = await Promise.all(roots.map(async (run, index) => ({ run, index, createdAt: await createdAt(store, run) })));
    dated.sort((left, right) => right.createdAt - left.createdAt || left.index - right.index);
    root = dated[0]!.run;
  }
  const snapshot = await createResearchReadingService(store, artifactPayload).getSnapshot({ rootRunId: root.id });
  const assets = (await Promise.all(snapshot.artifacts.map(async (view) => {
    const artifact = await store.getArtifact(view.identity.id);
    return artifact && same({ id: artifact.id, revision: artifact.revision, sha256: artifact.sha256 }, view.identity)
      ? { artifact, external: view.scope === "external" } : undefined;
  }))).filter((entry): entry is { artifact: ArtifactRef; external: boolean } => !!entry);
  const treeAssets = assets.filter(entry => !entry.external).map(entry => entry.artifact);
  const candidates = treeAssets.filter((asset) => asset.type === "post-candidate" && asset.schemaVersion === "v1" && asset.validation === "valid");
  const revisions = treeAssets.filter((asset) => asset.type === "research-revision" && asset.validation === "valid");
  const explicitSelections = snapshot.relations.filter(r => r.kind === "selected" && r.validity === "valid");
  const selectedIds = new Set(explicitSelections.map(r => r.to.id));
  // A lone historical candidate is unambiguous, but dependencies never choose a winner.
  const selected = selectedIds.size === 1 ? candidates.find(a => selectedIds.has(a.id)) : selectedIds.size === 0 && candidates.length === 1 ? candidates[0] : undefined; let revisionStatus: "none" | "revision_recorded" | "revision_unverified" = "none";
  let selectedDispositions: Disposition[] = [];
  let baseCandidate: ArtifactRef | undefined;
  if (selected) {
    for (const record of revisions) {
      const raw = await artifactPayload(record.id);
      const parsed = validRevision(raw);
      const selectedIdentity = { id: selected.id, revision: selected.revision, sha256: selected.sha256 };
      if (!parsed || !same(parsed.candidate, selectedIdentity)) continue;
      const linked = snapshot.relations.some((relation) => relation.kind === "revises" && relation.validity === "valid"
        && same(relation.from, parsed.candidate) && same(relation.to, parsed.baseCandidate));
      if (!linked) continue;
      // A structurally valid revision proves only that a new candidate was recorded. Its
      // review field is not an independent review of that candidate.
      revisionStatus = "revision_unverified";
      selectedDispositions = parsed.dispositions;
      const base = assets.find(entry => same({ id: entry.artifact.id, revision: entry.artifact.revision, sha256: entry.artifact.sha256 }, parsed.baseCandidate))?.artifact;
      if (base) baseCandidate = base;
    }
  }
  const selectedIdentity = selected ? { id: selected.id, revision: selected.revision, sha256: selected.sha256 } : undefined;
  const effectiveReview = selectedIdentity && snapshot.artifacts.find(a => same(a.identity, selectedIdentity))?.effectiveReview;
  const reviewRelations = selectedIdentity ? snapshot.relations.filter((relation) => relation.kind === "reviews" && same(relation.to, selectedIdentity)) : [];
  const selectedReviewStatus = selected
    ? ["v1", "v2", "v3", "v4"].includes(root.workflowRevision)
      ? await boundPostReviewStatus(selected, treeAssets, artifactPayload, true)
      : effectiveReview === "passed" ? "reviewed" : effectiveReview === "findings" ? "findings"
        : reviewRelations.length > 0 ? "unknown" : reviewIsActive(snapshot) ? "pending" : "unknown"
    : null;
  if (revisionStatus === "revision_unverified" && (selectedReviewStatus === "reviewed" || selectedReviewStatus === "findings")) revisionStatus = "revision_recorded";
  return {
    workflow: { rootRunId: root.id, state: root.state as ReadingState, workflowId: root.workflowId, workflowRevision: root.workflowRevision, selectedFrom },
    progress: snapshot.progress,
    phases: snapshot.stages.filter(phase => phase.audience !== "audit").map(phase => {
      const calls = snapshot.calls.filter(c => c.role === "agent" && phase.callIds.includes(c.id));
      const attempts = calls.flatMap(c => c.attempts);
      const metric = (key: "inputTokens" | "outputTokens") => {
        const values = attempts.flatMap(a => typeof a.usage?.[key] === "number" ? [a.usage[key]!] : []);
        return values.length ? values.reduce((sum, n) => sum + n, 0) : null;
      };
      return { id: phase.id, title: phase.title, state: (phase.state === "unknown" ? "queued" : phase.state) as ReadingState, purpose: phase.purpose,
        usage: { attempts: attempts.length, inputTokens: metric("inputTokens"), outputTokens: metric("outputTokens"), unknown: !attempts.length || attempts.some(a => !a.usage || a.usage.inputTokens === undefined || a.usage.outputTokens === undefined) },
        ...(calls.some(c => c.reused) ? { reusedCandidate: true } : {}) };
    }),
    candidate: selected ? { ownerRunId: selected.producedBy.workflowRunId, artifactId: selected.id, artifactType: "post-candidate",
      revision: selected.revision, sha256: selected.sha256, reviewStatus: selectedReviewStatus!, revisionStatus,
      readerHref: `/api/workflow-runs/${encodeURIComponent(selected.producedBy.workflowRunId)}/artifacts/${encodeURIComponent(selected.id)}/reader` } : null,
    baseCandidate: baseCandidate ? { ownerRunId: baseCandidate.producedBy.workflowRunId, artifactId: baseCandidate.id,
      readerHref: `/api/workflow-runs/${encodeURIComponent(baseCandidate.producedBy.workflowRunId)}/artifacts/${encodeURIComponent(baseCandidate.id)}/reader` } : null,
    dispositions: selectedDispositions
  };
}
