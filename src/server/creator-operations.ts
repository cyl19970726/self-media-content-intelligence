import type { CreatorResearchEvent, CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction } from "../../packages/contracts/index.js";

type ReconstructionBatch = { requestedPosts: number; pendingPosts: number; items: Array<{ state: string; failedGateIds: string[] }> };
type OperationEvidence = {
  reconstructionBatch: ReconstructionBatch | null;
  synthesisGate: { ready: boolean; failedGateIds: string[] } | null;
  events: CreatorResearchEvent[];
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
  if (pureMediaGaps && mediaRetryCompleted && evidence.reconstructionBatch?.pendingPosts === 0) return "continue_with_media_gaps";
  if (failedItems.length > 0 && evidence.reconstructionBatch?.pendingPosts === 0) return "retry_failed_videos";
  if (run.blockers.some((blocker) => blocker.code === "creator_synthesis_not_ready")) return "revalidate_synthesis";
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
    ...(evidence.reconstructionBatch?.items.filter((item) => item.state !== "ready").flatMap((item) => item.failedGateIds) ?? []),
    ...(evidence.synthesisGate && !evidence.synthesisGate.ready ? evidence.synthesisGate.failedGateIds : [])
  ])].sort();
  const action = selectAction(run, evidence);
  const latest = evidence.events.at(-1);
  return {
    runId: run.id,
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
    waitingReason: action === "none" && run.status === "failed" && run.blockers.some((blocker) => blocker.code === "provider_unavailable")
      ? "本轮恢复已确认外部数据源仍不可连接；等待 Provider 恢复后再继续，避免重复消耗请求。" : null,
    terminal: run.status === "ready",
    lastEvent: latest ? { sequence: latest.sequence, message: latest.message, createdAt: latest.createdAt } : null
  };
}
