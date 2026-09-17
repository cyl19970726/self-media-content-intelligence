export type WorkflowRunState = "queued" | "running" | "waiting" | "blocked" | "needs_review" | "succeeded" | "failed" | "canceled";
export type WorkflowStepKind = "task" | "agent" | "workflow" | "map" | "parallel" | "phase" | "decision" | "validation" | "publish";
export type ValidationState = "pending" | "valid" | "invalid";
export type ReviewState = "pending" | "passed" | "findings" | "not_applicable";

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  workflowRevision: string;
  inputFingerprint: string;
  state: WorkflowRunState;
  parentRunId?: string;
  parentStepRunId?: string;
  metadata?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  errorId?: string;
}

export interface WorkflowStepRecord {
  id: string;
  runId: string;
  key: string;
  kind: WorkflowStepKind;
  workflowId: string;
  workflowRevision: string;
  inputFingerprint: string;
  configFingerprint: string;
  state: WorkflowRunState;
  validation: ValidationState;
  output?: unknown;
  error?: string;
  errorId?: string;
}

export interface WorkflowAttemptRecord { id: string; runId: string; stepRunId: string; state: WorkflowRunState; error?: string; errorId?: string; }
export interface WorkflowEvent { id: string; runId: string; seq: number; type: string; timestamp: string; stepRunId?: string; attemptId?: string; data?: unknown; }
export interface WorkflowArtifact {
  id: string; type: string; schemaVersion: string; revision: string; sha256: string; uri: string;
  producedBy: { workflowRunId: string; stepRunId: string; attemptId: string };
  dependsOn: Array<{ artifactId: string; revision: string; sha256: string }>;
  validation: ValidationState; review: ReviewState;
}
export interface WorkflowPhaseExpectedArtifact { role: string; title?: string; required?: boolean; }
export interface WorkflowPhaseArtifact { artifact: WorkflowArtifact; role: string; title?: string; order?: number; primary?: boolean; ownerRunId: string; }
export interface WorkflowPhaseUsage { attempts: number; inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningOutputTokens: number | null; unknown: boolean; }
export interface WorkflowPhase { elapsedMs: number | null; id: string; path: string[]; parentPhaseId?: string; depth: number; title: string; subjectId?: string; subjectTitle?: string; purpose: string; order?: number; state: WorkflowRunState; stepCounts: Partial<Record<WorkflowRunState, number>>; usage: WorkflowPhaseUsage; reason?: string; expectedArtifacts: WorkflowPhaseExpectedArtifact[]; artifacts: WorkflowPhaseArtifact[]; }
export interface WorkflowRunDetail { run: WorkflowRunRecord; steps: WorkflowStepRecord[]; attempts: WorkflowAttemptRecord[]; artifacts: WorkflowArtifact[]; phases?: WorkflowPhase[]; }
