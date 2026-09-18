import type { ArtifactRef, RunRecord, RunStore } from "@signal-room/workflow";
import { projectWorkflowPhases } from "./workflow-phase-projection.js";

type ReadingState = "queued" | "running" | "waiting" | "blocked" | "needs_review" | "succeeded" | "failed" | "canceled";
type Disposition = { id: string; status: "changed" | "disputed" | "missing_evidence"; reason: string };
export type PostWorkflowReading = {
  workflow: { rootRunId: string; state: ReadingState; workflowId: string; workflowRevision: string; selectedFrom: "latest" | "explicit" } | null;
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

function validRevision(payload: unknown): { baseCandidate: ArtifactIdentity; candidate: ArtifactIdentity; dispositions: Disposition[] } | null {
  const record = payload as RevisionPayload | null;
  if (!record || record.schemaVersion !== "research-revision@1" || (record.validation as { valid?: unknown } | null)?.valid !== true) return null;
  // A revision is meaningful only when all three links are explicit and its dispositions pass the public contract.
  const baseCandidate = identity(record.baseCandidate);
  if (!baseCandidate || !identity(record.review)) return null;
  const candidate = identity(record.candidate); const rows = dispositions(record.dispositions);
  return candidate && rows ? { baseCandidate, candidate, dispositions: rows } : null;
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

async function runTree(store: RunStore, root: RunRecord): Promise<RunRecord[]> {
  const all = await store.listRuns({ metadata: { creatorRunId: String(root.metadata?.creatorRunId ?? "") } });
  const byParent = new Map<string, RunRecord[]>();
  for (const run of all) if (run.parentRunId) byParent.set(run.parentRunId, [...(byParent.get(run.parentRunId) ?? []), run]);
  const result: RunRecord[] = []; const pending = [root]; const seen = new Set<string>();
  while (pending.length) {
    const run = pending.shift()!;
    if (seen.has(run.id)) continue;
    seen.add(run.id); result.push(run); pending.push(...(byParent.get(run.id) ?? []));
  }
  return result;
}

function reviewStatus(artifact: ArtifactRef): "unknown" | "pending" | "findings" | "reviewed" {
  if (artifact.review === "pending") return "pending";
  if (artifact.review === "findings") return "findings";
  if (artifact.review === "passed") return "reviewed";
  return "unknown";
}

function currentCandidate(candidates: ArtifactRef[]): ArtifactRef | undefined {
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const superseded = new Set<string>();
  for (const candidate of candidates) {
    for (const dependency of candidate.dependsOn) {
      const prior = candidatesById.get(dependency.artifactId);
      if (prior && prior.revision === dependency.revision && prior.sha256 === dependency.sha256) superseded.add(prior.id);
    }
  }
  const leaves = candidates.filter((candidate) => !superseded.has(candidate.id));
  // Concurrent candidate leaves have no durable ordering that makes one the current report.
  return leaves.length === 1 ? leaves[0] : undefined;
}

function isUserPostPhase(phase: { id: string; path: string[]; subjectId?: string }, postId: string): boolean {
  // Revision records are artifacts, not a fifth user-visible research action.
  return phase.subjectId === postId && ![phase.id, ...phase.path].some((part) => /^(revision|revision-record|register-version)/i.test(part));
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
  const [phases, tree] = await Promise.all([projectWorkflowPhases(store, root), runTree(store, root)]);
  const eventsByRun = new Map(await Promise.all(tree.map(async (run) => [run.id, await store.listEvents(run.id)] as const)));
  const reusedPhaseIds = new Set<string>();
  for (const run of tree) {
    const events = eventsByRun.get(run.id) ?? [];
    const copied = events.filter((event) => event.type === "candidate.copied"
      && (event.data as { reason?: unknown } | null)?.reason === "reuse_existing_candidate");
    if (!copied.length) continue;
    const steps = await store.listSteps(run.id);
    for (const event of copied) {
      const step = steps.find((entry) => entry.id === event.stepRunId);
      const phaseId = (step as { phaseId?: string } | undefined)?.phaseId;
      const invoked = events.some((entry) => entry.stepRunId === event.stepRunId
        && (entry.type === "agent.started" || entry.type === "agent.usage"
          || entry.type === "agent.lifecycle" && (entry.data as { status?: unknown } | null)?.status === "started"));
      if (phaseId && !invoked) reusedPhaseIds.add(phaseId);
    }
  }
  const assets = (await Promise.all(tree.map((run) => store.listArtifacts(run.id)))).flat();
  const candidates = assets.filter((asset) => asset.type === "post-candidate" && asset.schemaVersion === "v1" && asset.validation === "valid");
  const revisions = assets.filter((asset) => asset.type === "research-revision" && asset.validation === "valid");
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selected = currentCandidate(candidates); let revisionStatus: "none" | "revision_recorded" | "revision_unverified" = "none";
  let selectedDispositions: Disposition[] = [];
  let baseCandidate: ArtifactRef | undefined;
  if (selected) {
    for (const record of revisions) {
      const raw = await artifactPayload(record.id);
      const parsed = validRevision(raw);
      const referenced = identity((raw as RevisionPayload | null)?.candidate);
      if (!referenced || referenced.id !== selected.id || referenced.revision !== selected.revision || referenced.sha256 !== selected.sha256) continue;
      // A structurally valid revision proves only that a new candidate was recorded. Its
      // review field is not an independent review of that candidate.
      if (parsed) {
        revisionStatus = "revision_unverified";
        selectedDispositions = parsed.dispositions;
        const base = byId.get(parsed.baseCandidate.id);
        if (base && base.revision === parsed.baseCandidate.revision && base.sha256 === parsed.baseCandidate.sha256) baseCandidate = base;
      } else if (revisionStatus === "none") {
        revisionStatus = "revision_unverified";
      }
    }
  }
  return {
    workflow: { rootRunId: root.id, state: root.state as ReadingState, workflowId: root.workflowId, workflowRevision: root.workflowRevision, selectedFrom },
    phases: phases.filter((phase) => isUserPostPhase(phase, postId)).map((phase) => ({ id: phase.id, title: phase.title, state: phase.state as ReadingState, purpose: phase.purpose,
      ...(phase.reason ? { reason: phase.reason } : {}), usage: { attempts: phase.usage.attempts, inputTokens: phase.usage.inputTokens,
        outputTokens: phase.usage.outputTokens, unknown: phase.usage.unknown }, ...(reusedPhaseIds.has(phase.id) ? { reusedCandidate: true } : {}) })),
    candidate: selected ? { ownerRunId: selected.producedBy.workflowRunId, artifactId: selected.id, artifactType: "post-candidate",
      revision: selected.revision, sha256: selected.sha256, reviewStatus: reviewStatus(selected), revisionStatus,
      readerHref: `/api/workflow-runs/${encodeURIComponent(selected.producedBy.workflowRunId)}/artifacts/${encodeURIComponent(selected.id)}/reader` } : null,
    baseCandidate: baseCandidate ? { ownerRunId: baseCandidate.producedBy.workflowRunId, artifactId: baseCandidate.id,
      readerHref: `/api/workflow-runs/${encodeURIComponent(baseCandidate.producedBy.workflowRunId)}/artifacts/${encodeURIComponent(baseCandidate.id)}/reader` } : null,
    dispositions: selectedDispositions
  };
}
