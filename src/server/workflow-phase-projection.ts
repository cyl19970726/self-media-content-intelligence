import type { ArtifactRef, PhaseArtifactBinding, PhaseExpectedArtifact, RunRecord, RunState, RunStore, StepRecord } from "@signal-room/workflow";
import type { CallView, StageView, WorkflowSnapshot } from "@signal-room/workflow-read-model/contracts";
import { createResearchReadingService, resolveReadingRoot } from "./workflow-reading-service.js";

/** Compatibility shape for the advanced audit page. Stage facts come from the shared read model. */
export type PublicWorkflowPhase = {
  id: string; path: string[]; parentPhaseId?: string; depth: number; elapsedMs: number | null;
  title: string; subjectId?: string; subjectTitle?: string; purpose: string; order?: number;
  state: RunState; stepCounts: Partial<Record<RunState, number>>;
  usage: { attempts: number; inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningOutputTokens: number | null; unknown: boolean };
  reason?: string; expectedArtifacts: PhaseExpectedArtifact[];
  artifacts: Array<PhaseArtifactBinding & { ownerRunId: string }>;
};

const terminal = new Set(["succeeded", "failed", "canceled", "blocked", "needs_review"]);
const same = (binding: PhaseArtifactBinding, actual: ArtifactRef) => binding.artifact.id === actual.id && binding.artifact.revision === actual.revision && binding.artifact.sha256 === actual.sha256;
const sum = (values: Array<number | undefined>): number | null => values.some((value) => typeof value === "number") ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : null;

function usage(calls: CallView[]) {
  const attempts = [...new Map(calls.filter((call) => call.role === "agent").flatMap((call) => call.attempts).map((attempt) => [attempt.id, attempt])).values()];
  const values = attempts.map((attempt) => attempt.usage);
  return { attempts: attempts.length, inputTokens: sum(values.map((value) => value?.inputTokens)), cachedInputTokens: sum(values.map((value) => value?.cachedInputTokens)),
    outputTokens: sum(values.map((value) => value?.outputTokens)), reasoningOutputTokens: null,
    unknown: values.length === 0 || values.some((value) => !value || value.inputTokens === undefined || value.outputTokens === undefined) };
}

function parentStage(stage: StageView, stages: StageView[], runs: WorkflowSnapshot["runs"]): StageView | undefined {
  const ancestors = new Set<string>(); let run = runs.find((item) => item.id === stage.runId);
  while (run?.parentRunId) { ancestors.add(run.parentRunId); run = runs.find((item) => item.id === run!.parentRunId); }
  return stages.filter((candidate) => candidate.id !== stage.id && (
    candidate.runId === stage.runId && candidate.path.length < stage.path.length && candidate.path.every((item, index) => item === stage.path[index])
    || ancestors.has(candidate.runId) && candidate.path.every((item, index) => item === stage.path[index])
  )).sort((left, right) => right.path.length - left.path.length)[0];
}

function elapsed(stage: StageView): number | null {
  const start = stage.startedAt ? Date.parse(stage.startedAt) : NaN;
  const end = stage.endedAt ? Date.parse(stage.endedAt) : terminal.has(stage.state) ? NaN : Date.now();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null;
}

/** Project an advanced-audit compatibility view from one explicit research root. */
export async function projectWorkflowPhases(store: RunStore, selected: RunRecord): Promise<PublicWorkflowPhase[]> {
  const root = await resolveReadingRoot(store, selected.id);
  if (!root) return [];
  const snapshot = await createResearchReadingService(store, async () => null).getSnapshot({ rootRunId: root.id });
  if (!snapshot.stages.length) return []; // Historical runs without phases remain phase-less.
  const phaseSteps = new Map<string, StepRecord>();
  for (const run of snapshot.runs) for (const step of await store.listSteps(run.id)) if (step.kind === "phase") phaseSteps.set(`${step.runId}:${step.phaseId}`, step);
  const stages = snapshot.stages;
  const parents = new Map(stages.map((stage) => [stage.id, parentStage(stage, stages, snapshot.runs)]));
  const depths = (stage: StageView): number => { let depth = 0; let parent = parents.get(stage.id); const seen = new Set([stage.id]); while (parent && !seen.has(parent.id)) { depth++; seen.add(parent.id); parent = parents.get(parent.id); } return depth; };
  const ordered = [...stages].sort((left, right) => depths(left) - depths(right) || (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) || left.id.localeCompare(right.id));
  return Promise.all(ordered.map(async (stage) => {
    const step = phaseSteps.get(`${stage.runId}:${stage.phaseKey}`);
    const bindings = step?.artifactBindings ?? [];
    const artifacts: PublicWorkflowPhase["artifacts"] = [];
    for (const binding of bindings) {
      if (!stage.artifactIds.includes(binding.artifact.id)) continue;
      const actual = await store.getArtifact(binding.artifact.id);
      if (actual && same(binding, actual)) artifacts.push({ ...binding, artifact: actual, ownerRunId: actual.producedBy.workflowRunId });
    }
    // Historical child runs sometimes published before the parent bound the result.
    // Show those outputs as unbound audit assets, scoped to the shared snapshot tree.
    for (const child of snapshot.runs) {
      if (child.parentRunId !== stage.runId) continue;
      const record = await store.getRun(child.id);
      if (record?.metadata?.phaseId !== stage.phaseKey) continue;
      for (const actual of await store.listArtifacts(child.id)) if (!artifacts.some((item) => item.artifact.id === actual.id)) {
        artifacts.push({ artifact: actual, role: "published-output", title: "子流程已发布成果", ownerRunId: child.id });
      }
    }
    const stageCalls = snapshot.calls.filter((call) => stage.callIds.includes(call.id));
    const stepCounts: PublicWorkflowPhase["stepCounts"] = {};
    for (const call of stageCalls) if (call.state !== "unknown") {
      const state = call.state as RunState; stepCounts[state] = (stepCounts[state] ?? 0) + 1;
    }
    const owner = await store.getRun(stage.runId);
    const subjectId = typeof owner?.metadata?.postId === "string" ? owner.metadata.postId : undefined;
    const subjectTitle = typeof owner?.metadata?.postTitle === "string" ? owner.metadata.postTitle : undefined;
    return { id: stage.id, path: stage.path, ...(parents.get(stage.id) ? { parentPhaseId: parents.get(stage.id)!.id } : {}), depth: depths(stage), elapsedMs: elapsed(stage),
      title: stage.title, ...(subjectId ? { subjectId } : {}), ...(subjectTitle ? { subjectTitle } : {}), purpose: stage.purpose, ...(stage.order !== undefined ? { order: stage.order } : {}),
      state: stage.state === "unknown" ? "queued" : stage.state, stepCounts, usage: usage(stageCalls),
      ...(stage.waitingForRunId ? { reason: "等待关联子流程" } : {}),
      expectedArtifacts: (step?.phaseDefinition?.expectedArtifacts ?? []).map((expected) => ({ ...expected })), artifacts };
  }));
}
