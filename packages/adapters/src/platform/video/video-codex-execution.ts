import path from "node:path";
import type { CodexSdkFactory } from "../../workflow/codex-sdk-runner.js";
import type { VideoReconstructionChildRole } from "../../../../research/index.js";
import type { HostAssemblyReport } from "./video-reconstruction-host-assembler.js";

export type VideoCodexExecutionOptions = {
  /** CLI remains the legacy default. SDK is an explicitly selected migration path. */
  executionMode?: "cli" | "sdk";
  sdkFactory?: CodexSdkFactory;
  signal?: AbortSignal;
  evaluationPolicy?: "skip" | "single_pass";
  forceEvaluation?: boolean;
  outputRelativeRoot?: string;
  /** A directed Builder-only repair; never passed to the independent evaluator. */
  repairFindings?: unknown;
  reviewerOnly?: boolean;
  expectedCandidateSha256?: string;
  builderModel?: string;
  evaluatorModel?: string;
  builderReasoningEffort?: string;
  evaluatorReasoningEffort?: string;
  /** Imported candidates are checked in place; frozen evidence and report files are not regenerated. */
  preservePreparedCandidate?: boolean;
};

export function safeOutputRelativeRoot(value: string): string {
  if (!value || path.isAbsolute(value) || value.split(/[\\/]+/).some((part) => part === "..")) {
    throw new Error("WORKFLOW_OUTPUT_ROOT_INVALID");
  }
  return value;
}

function builderRole(role: VideoReconstructionChildRole): boolean {
  return role === "candidate" || role === "generic_repair" || role === "runtime_repair";
}

export function sdkModel(role: VideoReconstructionChildRole, options: VideoCodexExecutionOptions): string {
  return builderRole(role) ? options.builderModel ?? "gpt-5.6-terra" : options.evaluatorModel ?? "gpt-5.6-luna";
}

export function sdkReasoningEffort(role: VideoReconstructionChildRole, options: VideoCodexExecutionOptions): string {
  return builderRole(role) ? options.builderReasoningEffort ?? "medium" : options.evaluatorReasoningEffort ?? "medium";
}

export function preservedHostAssembly(): HostAssemblyReport {
  return { transcriptCuesRestored: 0, cueAccountabilityRowsRestored: 0, cueAccountabilityRowsRepaired: 0,
    cueAccountabilityRowsHostOwned: 0, invalidAbsoluteSourceRefsRemoved: 0, carriersNormalized: 0,
    carrierRationalesSynchronized: 0, probeWarnings: [] };
}
