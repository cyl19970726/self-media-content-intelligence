import type { ArtifactRef, RunRecord, RunState, RunStore, StepRecord } from "@signal-room/workflow";
import type { ResearchReviewState } from "../../packages/contracts/index.js";

export type CreatorWorkflowPostState = "queued" | "source_checking" | "building" | "built_unreviewed" | "reviewing" | "repairing" | "reviewed" | "revised_unverified" | "needs_review" | "failed" | "canceled";
export type CreatorWorkflowPostProgress = { postId: string; workflowRunId: string; state: CreatorWorkflowPostState;
  currentNode: string | null; built: boolean; reviewed: boolean };
export type CreatorWorkflowProgress = {
  creatorRunId: string;
  posts: CreatorWorkflowPostProgress[];
  counts: { total: number; queued: number; running: number; built: number; reviewed: number; revised: number; needsReview: number; failed: number; canceled: number };
  activeSlots: number;
  synthesis: { state: RunState; workflowRunId: string; currentNode: string | null;
    terminalStatus?: "original_reviewed" | "revised_unverified" | "review_incomplete" } | null;
};

const active = new Set<RunState>(["running", "waiting"]);
const terminalBad = new Set<RunState>(["failed", "blocked", "needs_review"]);
export type CreatorRegisteredReview = Pick<ResearchReviewState, "reviewStatus" | "candidateStatus">;
type PostReviewStatus = CreatorRegisteredReview;
export type CreatorRegisteredPostReviews = (postId: string) => PostReviewStatus | null | undefined;

function descendants(root: RunRecord, runs: RunRecord[]): RunRecord[] {
  const found: RunRecord[] = [];
  const visit = (id: string) => runs.filter((run) => run.parentRunId === id).forEach((child) => { found.push(child); visit(child.id); });
  visit(root.id);
  return found;
}

function rootFor(run: RunRecord, runs: RunRecord[]): RunRecord {
  let current = run;
  while (current.parentRunId) {
    const parent = runs.find((candidate) => candidate.id === current.parentRunId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function postIdFor(run: RunRecord, runs: RunRecord[]): string | undefined {
  let current: RunRecord | undefined = run;
  while (current) {
    if (typeof current.metadata?.postId === "string") return current.metadata.postId;
    current = current.parentRunId ? runs.find((candidate) => candidate.id === current!.parentRunId) : undefined;
  }
  return undefined;
}

function nodeLabel(run: RunRecord | undefined, steps: StepRecord[]): string | null {
  if (run?.workflowId === "post.source-check") return "post.source-check";
  if (run && run.workflowId !== "post.analyze" && run.workflowId !== "creator.analyze" && run.workflowId !== "creator.synthesize") return run.workflowId;
  return [...steps].reverse().find((step) => active.has(step.state))?.key ?? null;
}

function isRegisteredSynthesis(run: RunRecord): boolean {
  if (!run.workflowId.startsWith("creator.") || run.state !== "succeeded") return false;
  const output = run.output && typeof run.output === "object" && !Array.isArray(run.output)
    ? run.output as Record<string, unknown> : {};
  // Registration receipts store the completed synthesis and revision record. Review state itself
  // is deliberately kept on CreatorResearchRun, where it remains authoritative after recovery.
  return output.ok === true && "synthesis" in output && "review" in output && "revisionRecord" in output;
}

function isRegisteredPostRevision(run: RunRecord, postId: string): boolean {
  return run.metadata?.postId === postId && !run.parentRunId && run.state === "succeeded"
    && (run.workflowId === "post.targeted-revision" || run.workflowId === "post.structural-revision");
}

function postReviewStatus(run: RunRecord): PostReviewStatus | undefined {
  const output = run.output && typeof run.output === "object" && !Array.isArray(run.output)
    ? run.output as Record<string, unknown> : {};
  const details = output.details && typeof output.details === "object" && !Array.isArray(output.details)
    ? output.details as Record<string, unknown> : {};
  const reviewStatus = output.reviewStatus ?? details.reviewStatus;
  const candidateStatus = output.candidateStatus ?? details.candidateStatus;
  return (reviewStatus === "completed_no_findings" || reviewStatus === "completed_with_findings" || reviewStatus === "failed")
    && (candidateStatus === "original_reviewed" || candidateStatus === "revised_unverified" || candidateStatus === "review_incomplete")
    ? { reviewStatus, candidateStatus } : undefined;
}

function postState(root: RunRecord, family: RunRecord[], steps: StepRecord[], artifacts: ArtifactRef[], review: PostReviewStatus | undefined,
  hasCandidate = artifacts.some((artifact) => artifact.type === "post-candidate" && artifact.validation === "valid")): CreatorWorkflowPostProgress["state"] {
  const hasEvaluation = artifacts.some((artifact) => artifact.type === "post-evaluation" && artifact.validation === "valid");
  if (root.state === "canceled") return "canceled";
  const current = [...family, root].find((run) => active.has(run.state));
  const currentId = current?.workflowId ?? "";
  if (currentId === "post.source-check" || steps.some((step) => active.has(step.state) && step.key.startsWith("source-check"))) return "source_checking";
  if (currentId.includes("repair") || currentId.includes("revision")) return "repairing";
  if (currentId === "post.review" || steps.some((step) => active.has(step.state) && step.key.startsWith("review"))) return "reviewing";
  if (currentId === "post.build" || steps.some((step) => active.has(step.state) && step.key === "builder")) return "building";
  // A v5 reviewer failure retains a usable Builder candidate. It needs review handling,
  // rather than being reported as a generic build failure.
  if (review?.candidateStatus === "review_incomplete" && review.reviewStatus === "failed" && hasCandidate) return "needs_review";
  if (terminalBad.has(root.state)) return root.state === "failed" ? "failed" : "needs_review";
  if (review?.candidateStatus === "revised_unverified") return "revised_unverified";
  if (review?.candidateStatus === "original_reviewed" &&
    (review.reviewStatus === "completed_no_findings" || review.reviewStatus === "completed_with_findings")) return "reviewed";
  if (hasEvaluation) return "reviewed";
  const latestChild = family[0];
  if (latestChild && terminalBad.has(latestChild.state)) {
    return latestChild.state === "failed" ? "failed" : "needs_review";
  }
  if (hasCandidate) return "built_unreviewed";
  return "queued";
}

export async function projectCreatorWorkflowProgress(
  store: RunStore,
  creatorRunId: string,
  registeredReview?: CreatorRegisteredReview | null,
  registeredPostReviews?: CreatorRegisteredPostReviews
): Promise<CreatorWorkflowProgress> {
  const runs = await store.listRuns({ metadata: creatorRunId === undefined ? undefined : { creatorRunId } });
  const roots = runs.filter((run) => run.workflowId === "post.analyze" && typeof run.metadata?.postId === "string");
  const byPost = new Map<string, RunRecord>();
  for (const run of roots) if (!byPost.has(String(run.metadata!.postId))) byPost.set(String(run.metadata!.postId), run);
  const latest = [...byPost.values()];
  const posts = await Promise.all(latest.map(async (originalRoot): Promise<CreatorWorkflowPostProgress> => {
    const postId = String(originalRoot.metadata!.postId);
    const authoritativeReview = registeredPostReviews?.(postId);
    const registeredIndex = authoritativeReview ? runs.findIndex((run) => isRegisteredPostRevision(run, postId)) : -1;
    const activeIndex = runs.findIndex((run) => postIdFor(run, runs) === postId && active.has(run.state));
    // listRuns is newest-first: active work only wins if it began after the registered version.
    const activeIsNewer = activeIndex >= 0 && (registeredIndex < 0 || activeIndex < registeredIndex);
    const root = activeIsNewer ? rootFor(runs[activeIndex]!, runs)
      : registeredIndex >= 0 ? runs[registeredIndex]! : originalRoot;
    const family = descendants(root, runs);
    const related = [root, ...family];
    const [stepLists, artifactLists] = await Promise.all([
      Promise.all(related.map((run) => store.listSteps(run.id))),
      Promise.all(related.map((run) => store.listArtifacts(run.id))),
    ]);
    const steps = stepLists.flat();
    const artifacts = artifactLists.flat();
    const current = [...family, root].find((run) => active.has(run.state));
    // The registered research record is the durable authority for the current
    // candidate. A v5 run output remains the best available state only until
    // that record is present; active work deliberately takes precedence over
    // either terminal state.
    const review = activeIsNewer ? undefined : authoritativeReview ?? postReviewStatus(root);
    const independentlyReviewed = review?.candidateStatus === "original_reviewed" &&
      (review.reviewStatus === "completed_no_findings" || review.reviewStatus === "completed_with_findings");
    const built = Boolean(authoritativeReview) || artifacts.some((artifact) => artifact.type === "post-candidate" && artifact.validation === "valid");
    return { postId: String(root.metadata!.postId), workflowRunId: root.id,
      state: postState(root, family, steps, artifacts, review, built), currentNode: nodeLabel(current, steps),
      built,
      // A v5 review with findings describes a repaired but not independently
      // re-reviewed candidate. Do not let a historical Evaluator artifact turn
      // that explicit state into a reviewed count.
      reviewed: independentlyReviewed || (!review
        && artifacts.some((artifact) => artifact.type === "post-evaluation" && artifact.validation === "valid")) };
  }));
  // creator.analyze may still be dispatching posts; only its actual synthesis child belongs here.
  const registeredIndex = registeredReview ? runs.findIndex(isRegisteredSynthesis) : -1;
  const activeIndex = runs.findIndex((run) => run.workflowId === "creator.synthesize" && active.has(run.state));
  // listRuns is newest-first. A stale waiting run must not mask a later registered revision.
  const registeredSynthesis = registeredIndex >= 0 ? runs[registeredIndex] : undefined;
  const activeSynthesis = activeIndex >= 0 && (registeredIndex < 0 || activeIndex < registeredIndex) ? runs[activeIndex] : undefined;
  const synthesisRoot = activeSynthesis ?? registeredSynthesis ?? runs.find((run) => run.workflowId === "creator.synthesize");
  let synthesis: CreatorWorkflowProgress["synthesis"] = null;
  if (synthesisRoot) {
    const family = descendants(synthesisRoot, runs);
    const current = family.find((run) => active.has(run.state));
    const steps = (await Promise.all([synthesisRoot, ...family].map((run) => store.listSteps(run.id)))).flat();
    synthesis = { state: synthesisRoot.state, workflowRunId: synthesisRoot.id, currentNode: nodeLabel(current, steps),
      ...(registeredSynthesis && !activeSynthesis ? { terminalStatus: registeredReview!.candidateStatus } : {}) };
  }
  const counts = { total: posts.length, queued: 0, running: 0, built: 0, reviewed: 0, revised: 0, needsReview: 0, failed: 0, canceled: 0 };
  for (const post of posts) {
    if (post.state === "queued") counts.queued += 1;
    if (["source_checking", "building", "reviewing", "repairing"].includes(post.state)) counts.running += 1;
    if (post.built) counts.built += 1;
    if (post.reviewed) counts.reviewed += 1;
    if (post.state === "revised_unverified") counts.revised += 1;
    if (post.state === "needs_review") counts.needsReview += 1;
    if (post.state === "failed") counts.failed += 1;
    if (post.state === "canceled") counts.canceled += 1;
  }
  const currentPostRuns = latest.flatMap((root) => descendants(root, runs));
  const activeSlots = currentPostRuns.filter((run) => run.workflowId !== "post.analyze" && run.state === "running"
    && ["post.source-check", "post.build", "post.review", "post.repair", "post.repair-evaluation"].includes(run.workflowId)).length;
  return { creatorRunId, posts, counts, activeSlots, synthesis };
}
