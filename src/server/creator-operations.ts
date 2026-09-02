import type {
  CreatorResearchEvent,
  CreatorResearchRun,
  CreatorRunOperation,
  CreatorRunOperationAction,
  CreatorRunAuthorityState,
  CreatorRunResolutionState
} from "../../packages/contracts/index.js";

type ReconstructionBatch = { requestedPosts: number; pendingPosts: number; items: Array<{ state: string; failedGateIds: string[] }> };
export type OperationEvidence = {
  reconstructionBatch: ReconstructionBatch | null;
  synthesisGate: { ready: boolean; failedGateIds: string[] } | null;
  events: CreatorResearchEvent[];
  builderContractRevision?: string;
};

type AuthorityContext = {
  creatorKey: string;
  authorityState: CreatorRunAuthorityState;
  canonicalRunId: string;
  lastGoodRunId: string | null;
  supersededByRunId: string | null;
};

function selectAction(run: CreatorResearchRun, evidence: OperationEvidence): CreatorRunOperationAction {
  const providerAlreadyRetried = run.blockers.some((blocker) => blocker.code === "provider_unavailable")
    && evidence.events.some((event) => event.type === "run.resumed");
  if (["needs_user", "backoff", "failed"].includes(run.status)) return providerAlreadyRetried ? "none" : "resume";
  if (run.status !== "reviewable") return "none";
  const failedItems = evidence.reconstructionBatch?.items.filter((item) => ["not_ready", "blocked"].includes(item.state)) ?? [];
  const pureMediaGaps = failedItems.length > 0 && failedItems.every((item) =>
    item.state === "blocked" && item.failedGateIds.includes("media_verification"));
  const mediaRetryCompleted = evidence.events.some((event) =>
    event.type === "job.queued" && event.message === "媒体核验失败项已进入一次定向补取。");
  const failedVideoRetryCompleted = evidence.events.some((event) => event.type === "run.resumed"
    && event.message === "视频基础设施修复后，仅重新排队未通过项。"
    && (!evidence.builderContractRevision ||
      (event.payload as { builderContractRevision?: unknown }).builderContractRevision === evidence.builderContractRevision));
  if (pureMediaGaps && mediaRetryCompleted && evidence.reconstructionBatch?.pendingPosts === 0) return "continue_with_media_gaps";
  if (failedItems.length > 0 && evidence.reconstructionBatch?.pendingPosts === 0 && !failedVideoRetryCompleted) return "retry_failed_videos";
  const synthesisRevalidated = evidence.events.some((event) => event.type === "artifact.produced"
    && event.message === "博主综合 gate 已在不重跑候选或 evaluator 的情况下重验。");
  if (run.blockers.some((blocker) => blocker.code === "creator_synthesis_not_ready") && !synthesisRevalidated) return "revalidate_synthesis";
  return "none";
}

const actionLabels: Record<CreatorRunOperationAction, string | null> = {
  none: null,
  resume: "从失败阶段恢复",
  retry_failed_videos: "只重试未通过视频",
  continue_with_media_gaps: "固化媒体缺口并继续",
  revalidate_synthesis: "重验博主综合"
};

export function buildCreatorRunOperation(run: CreatorResearchRun, evidence: OperationEvidence): CreatorRunOperation {
  const currentStage = run.stages.find((stage) => stage.id === run.currentStage);
  const failedGateIds = run.status === "ready" ? [] : [...new Set([
    ...run.blockers.map((blocker) => blocker.code),
    ...(evidence.reconstructionBatch?.items.filter((item) => !["verified", "ready"].includes(item.state)).flatMap((item) => item.failedGateIds) ?? []),
    ...(evidence.synthesisGate && !evidence.synthesisGate.ready ? evidence.synthesisGate.failedGateIds : [])
  ])].sort();
  const action = selectAction(run, evidence);
  const waitingReason = action === "none" && run.status === "failed" && run.blockers.some((blocker) => blocker.code === "provider_unavailable")
    ? "本轮恢复已确认外部数据源仍不可连接；等待 Provider 恢复后再继续，避免重复消耗请求。" : null;
  const resolutionState: CreatorRunResolutionState = run.status === "ready" ? "ready"
    : action !== "none" ? "actionable"
      : waitingReason ? "waiting_external"
        : run.status === "reviewable" ? "provisional"
          : ["failed", "stale"].includes(run.status) ? "failed_terminal" : "active";
  const latest = evidence.events.at(-1);
  const authority: AuthorityContext = {
    creatorKey: run.creatorId ?? run.profileUrl,
    authorityState: "canonical",
    canonicalRunId: run.id,
    lastGoodRunId: run.status === "ready" ? run.id : null,
    supersededByRunId: null
  };
  return {
    runId: run.id,
    ...authority,
    resolutionState,
    status: run.status,
    currentStageLabel: currentStage?.label ?? "等待预检",
    coverage: {
      discovered: run.coverage.discoveredPosts,
      discoveredTarget: run.publicProfile.displayedPostCount === null ? null
        : Math.max(run.coverage.discoveredPosts, run.publicProfile.displayedPostCount),
      enriched: run.coverage.enrichedPosts,
      enrichedTarget: 21,
      compared: run.coverage.comparisonPosts,
      comparedTarget: 21,
      reconstructed: run.coverage.reconstructedPosts,
      reconstructedTarget: Math.max(1, evidence.reconstructionBatch?.requestedPosts ?? run.collectionPolicy.budgets.maxMediaDownloads)
    },
    blockerCodes: run.blockers.map((blocker) => blocker.code),
    failedGateIds,
    action,
    actionLabel: actionLabels[action],
    waitingReason,
    terminal: ["ready", "provisional", "failed_terminal"].includes(resolutionState),
    lastEvent: latest ? { sequence: latest.sequence, message: latest.message, createdAt: latest.createdAt } : null
  };
}

function creatorKey(run: CreatorResearchRun): string {
  if (run.creatorId) return run.creatorId;
  try { return new URL(run.profileUrl).pathname.replace(/\/+$/, "").toLowerCase(); }
  catch { return run.profileUrl.toLowerCase(); }
}

function newestFirst(left: CreatorResearchRun, right: CreatorResearchRun): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || right.id.localeCompare(left.id);
}

export function buildCreatorRunOperations(
  runs: CreatorResearchRun[],
  evidenceFor: (run: CreatorResearchRun) => OperationEvidence
): CreatorRunOperation[] {
  const groups = new Map<string, CreatorResearchRun[]>();
  for (const run of runs) {
    const key = creatorKey(run);
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  const operations: CreatorRunOperation[] = [];
  for (const [key, creatorRuns] of groups) {
    const ordered = [...creatorRuns].sort(newestFirst);
    const lastGood = ordered.find((run) => run.status === "ready") ?? null;
    const canonical = lastGood ?? ordered[0];
    if (!canonical) continue;
    const canonicalUpdatedAt = Date.parse(canonical.updatedAt);
    for (const run of ordered) {
      const base = buildCreatorRunOperation(run, evidenceFor(run));
      const authorityState: CreatorRunAuthorityState = run.id === canonical.id ? "canonical"
        : lastGood && Date.parse(run.updatedAt) > canonicalUpdatedAt ? "candidate" : "superseded";
      operations.push({
        ...base,
        creatorKey: key,
        authorityState,
        canonicalRunId: canonical.id,
        lastGoodRunId: lastGood?.id ?? null,
        supersededByRunId: authorityState === "superseded" ? canonical.id : null,
        terminal: authorityState === "superseded" ? true : base.terminal
      });
    }
  }
  return operations.sort((left, right) => {
    const leftRun = runs.find((run) => run.id === left.runId);
    const rightRun = runs.find((run) => run.id === right.runId);
    return leftRun && rightRun ? newestFirst(leftRun, rightRun) : 0;
  });
}
