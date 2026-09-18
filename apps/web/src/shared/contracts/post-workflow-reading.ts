export type PostWorkflowReadingState = "queued" | "running" | "waiting" | "blocked" | "needs_review" | "succeeded" | "failed" | "canceled";

export type PostWorkflowReading = {
  progress?: { registered: number; completed: number; planned?: number; closed: boolean };
  workflow: {
    rootRunId: string;
    state: PostWorkflowReadingState;
    workflowId: string;
    workflowRevision: string;
    selectedFrom: "latest" | "explicit";
  } | null;
  phases: Array<{
    id: string;
    title: string;
    state: PostWorkflowReadingState;
    purpose: string;
    reason?: string;
    usage: { attempts: number; inputTokens: number | null; outputTokens: number | null; unknown: boolean };
    reusedCandidate?: boolean;
  }>;
  candidate: {
    ownerRunId: string;
    artifactId: string;
    artifactType: "post-candidate";
    revision: string;
    sha256: string;
    reviewStatus: "unknown" | "pending" | "findings" | "reviewed";
    revisionStatus: "none" | "revision_recorded" | "revision_unverified";
    readerHref: string;
  } | null;
  baseCandidate: {
    ownerRunId: string;
    artifactId: string;
    readerHref: string;
  } | null;
  dispositions: Array<{ id: string; status: "changed" | "disputed" | "missing_evidence"; reason: string }>;
};
