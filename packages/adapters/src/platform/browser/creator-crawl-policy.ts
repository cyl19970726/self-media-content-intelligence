export type CreatorCrawlStopReason = "explicit_end" | "quiescent_incomplete" | "budget_reached";

export type CreatorCrawlAction = "advance" | "bottom_observe" | "bounded_retrigger" | "stop";

export type CreatorCrawlObservation = {
  ids: string[];
  explicitEnd: boolean;
  scrollTop: number;
  documentHeight: number;
  viewportHeight: number;
  observedAtMs: number;
};

export type CreatorCrawlState = {
  globalIds: string[];
  rounds: number;
  quiescenceStartedAtMs: number | null;
  boundedRetriggerUsed: boolean;
  lastScrollTop: number;
  lastDocumentHeight: number;
};

export type CreatorCrawlDiagnostic = {
  round: number;
  globalCountBefore: number;
  globalCountAfter: number;
  newGlobalIds: string[];
  heightBefore: number;
  heightAfter: number;
  heightDelta: number;
  scrollTopBefore: number;
  scrollTopAfter: number;
  scrollDelta: number;
  atBottom: boolean;
  waitElapsedMs: number;
  waitReason: "new_global_ids" | "not_at_bottom" | "late_lazy_load_window" | "bounded_retrigger" | "explicit_end" | "quiescent_after_retrigger" | "round_budget";
  action: CreatorCrawlAction;
};

export type CreatorCrawlDecision = {
  state: CreatorCrawlState;
  action: CreatorCrawlAction;
  stopReason: CreatorCrawlStopReason | null;
  diagnostic: CreatorCrawlDiagnostic;
};

export function createCreatorCrawlState(resume?: Partial<Pick<CreatorCrawlState, "globalIds" | "lastScrollTop" | "lastDocumentHeight">>): CreatorCrawlState {
  return {
    globalIds: [...new Set(resume?.globalIds ?? [])],
    rounds: 0,
    quiescenceStartedAtMs: null,
    boundedRetriggerUsed: false,
    lastScrollTop: resume?.lastScrollTop ?? 0,
    lastDocumentHeight: resume?.lastDocumentHeight ?? 0
  };
}

/**
 * Pure crawl transition shared with the browser script. A page-height change is
 * diagnostic only: the sole growth signal is a previously unseen global post ID.
 */
export function advanceCreatorCrawl(
  previous: CreatorCrawlState,
  observation: CreatorCrawlObservation,
  options: { maxRounds: number; lateLoadWindowMs: number; postRetriggerWindowMs: number }
): CreatorCrawlDecision {
  const globalIds = [...previous.globalIds];
  const known = new Set(globalIds);
  const newGlobalIds: string[] = [];
  for (const id of observation.ids) {
    if (!id || known.has(id)) continue;
    known.add(id);
    globalIds.push(id);
    newGlobalIds.push(id);
  }

  const globalCountBefore = previous.globalIds.length;
  const globalCountAfter = globalIds.length;
  const rounds = previous.rounds + 1;
  const atBottom = observation.scrollTop + observation.viewportHeight >= observation.documentHeight - 64;
  let quiescenceStartedAtMs = previous.quiescenceStartedAtMs;
  let boundedRetriggerUsed = previous.boundedRetriggerUsed;
  let action: CreatorCrawlAction = "advance";
  let stopReason: CreatorCrawlStopReason | null = null;
  let waitReason: CreatorCrawlDiagnostic["waitReason"] = "not_at_bottom";

  if (newGlobalIds.length > 0) {
    quiescenceStartedAtMs = null;
    boundedRetriggerUsed = false;
    action = "advance";
    waitReason = "new_global_ids";
  } else if (observation.explicitEnd) {
    action = "stop";
    stopReason = "explicit_end";
    waitReason = "explicit_end";
  } else if (rounds >= options.maxRounds) {
    action = "stop";
    stopReason = "budget_reached";
    waitReason = "round_budget";
  } else if (!atBottom) {
    quiescenceStartedAtMs = null;
    boundedRetriggerUsed = false;
    action = "advance";
    waitReason = "not_at_bottom";
  } else {
    quiescenceStartedAtMs ??= observation.observedAtMs;
    const elapsed = Math.max(0, observation.observedAtMs - quiescenceStartedAtMs);
    if (!boundedRetriggerUsed) {
      if (elapsed < options.lateLoadWindowMs) {
        action = "bottom_observe";
        waitReason = "late_lazy_load_window";
      } else {
        action = "bounded_retrigger";
        boundedRetriggerUsed = true;
        quiescenceStartedAtMs = observation.observedAtMs;
        waitReason = "bounded_retrigger";
      }
    } else if (elapsed < options.postRetriggerWindowMs) {
      action = "bottom_observe";
      waitReason = "late_lazy_load_window";
    } else {
      action = "stop";
      stopReason = "quiescent_incomplete";
      waitReason = "quiescent_after_retrigger";
    }
  }

  const waitElapsedMs = quiescenceStartedAtMs === null
    ? 0
    : Math.max(0, observation.observedAtMs - quiescenceStartedAtMs);
  const state: CreatorCrawlState = {
    globalIds,
    rounds,
    quiescenceStartedAtMs,
    boundedRetriggerUsed,
    lastScrollTop: observation.scrollTop,
    lastDocumentHeight: observation.documentHeight
  };
  return {
    state,
    action,
    stopReason,
    diagnostic: {
      round: rounds,
      globalCountBefore,
      globalCountAfter,
      newGlobalIds,
      heightBefore: previous.lastDocumentHeight,
      heightAfter: observation.documentHeight,
      heightDelta: observation.documentHeight - previous.lastDocumentHeight,
      scrollTopBefore: previous.lastScrollTop,
      scrollTopAfter: observation.scrollTop,
      scrollDelta: observation.scrollTop - previous.lastScrollTop,
      atBottom,
      waitElapsedMs,
      waitReason,
      action
    }
  };
}
