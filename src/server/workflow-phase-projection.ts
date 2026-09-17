import type { ArtifactRef, PhaseArtifactBinding, PhaseDefinition, PhaseExpectedArtifact, RunState } from "@signal-room/workflow";
import type { AttemptRecord, RunRecord, RunStore, StepRecord, WorkflowEvent } from "@signal-room/workflow";

type PhasedStep = StepRecord & { phaseDefinition?: PhaseDefinition; phaseId?: string; phasePath?: readonly string[]; artifactBindings?: readonly PhaseArtifactBinding[] };

export type PublicWorkflowPhase = {
  id: string;
  path: string[];
  parentPhaseId?: string;
  depth: number;
  elapsedMs: number | null;
  title: string;
  subjectId?: string;
  subjectTitle?: string;
  purpose: string;
  order?: number;
  state: RunState;
  stepCounts: Partial<Record<RunState, number>>;
  usage: { attempts: number; inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningOutputTokens: number | null; unknown: boolean };
  reason?: string;
  expectedArtifacts: PhaseExpectedArtifact[];
  artifacts: Array<PhaseArtifactBinding & { ownerRunId: string }>;
};

function isDefinition(value: unknown): value is PhaseDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.title === "string" && typeof entry.purpose === "string";
}

async function relatedRuns(store: RunStore, root: RunRecord): Promise<{ tree: Map<string, RunRecord>; creatorRuns: Map<string, RunRecord> }> {
  const creatorRunId = root.metadata?.creatorRunId;
  const candidates = await store.listRuns(typeof creatorRunId === "string" ? { metadata: { creatorRunId } } : undefined);
  const byId = new Map(candidates.map((run) => [run.id, run])); byId.set(root.id, root);
  const included = new Map<string, RunRecord>([[root.id, root]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const run of byId.values()) if (run.parentRunId && included.has(run.parentRunId) && !included.has(run.id)) {
      included.set(run.id, run); changed = true;
    }
  }
  // A focused child page is also allowed to read phase assets owned by its ancestors.
  let current = root;
  while (current.parentRunId) {
    const parent = byId.get(current.parentRunId) ?? await store.getRun(current.parentRunId);
    if (!parent || (typeof creatorRunId === "string" && parent.metadata?.creatorRunId !== creatorRunId)) break;
    included.set(parent.id, parent); current = parent;
  }
  return { tree: included, creatorRuns: byId };
}

function sameArtifact(binding: PhaseArtifactBinding, actual: ArtifactRef): boolean {
  return binding.artifact.id === actual.id && binding.artifact.sha256 === actual.sha256 && binding.artifact.revision === actual.revision;
}

function usage(data: unknown): { inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningOutputTokens: number | null } | null {
  const value = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : undefined;
  const item = value?.usage;
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const record = item as Record<string, unknown>;
  const keys = ["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens"] as const;
  if (!keys.every((key) => typeof record[key] === "number" || record[key] === null)) return null;
  return Object.fromEntries(keys.map((key) => [key, record[key]])) as ReturnType<typeof usage>;
}

function aggregateUsage(attempts: AttemptRecord[], events: WorkflowEvent[]) {
  const attemptIds = new Set(attempts.map((attempt) => attempt.id));
  const seen = new Set<string>(); const reportedAttempts = new Set<string>(); const values: NonNullable<ReturnType<typeof usage>>[] = [];
  const legacyAttempts = new Set(events.filter((event) => event.type === "agent.usage" && event.attemptId && attemptIds.has(event.attemptId)).map((event) => event.attemptId!));
  for (const event of events) if ((event.type === "agent.usage" || event.type === "agent.completed") && event.attemptId && attemptIds.has(event.attemptId)
    && (event.type === "agent.usage" || !legacyAttempts.has(event.attemptId))) {
    const data = event.data && typeof event.data === "object" && !Array.isArray(event.data) ? event.data as Record<string, unknown> : undefined;
    const executionId = event.type === "agent.usage" ? data?.childRunId : data?.threadId;
    const key = typeof executionId === "string" ? `${event.attemptId}:${executionId}` : event.attemptId;
    if (seen.has(key)) continue; seen.add(key);
    const value = usage(event.data); if (value) { reportedAttempts.add(event.attemptId); values.push(value); }
  }
  const metric = (key: keyof NonNullable<ReturnType<typeof usage>>) => {
    const known = values.map((value) => value[key]).filter((value): value is number => typeof value === "number");
    return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
  };
  return { attempts: attemptIds.size, inputTokens: metric("inputTokens"), cachedInputTokens: metric("cachedInputTokens"), outputTokens: metric("outputTokens"), reasoningOutputTokens: metric("reasoningOutputTokens"), unknown: reportedAttempts.size < attemptIds.size || !values.length || values.some((value) => Object.values(value).some((metric) => metric === null)) };
}

function businessPhaseState(step: PhasedStep | undefined): { state: "needs_review"; reason: string } | undefined {
  if (step?.state !== "succeeded" || !step.output || typeof step.output !== "object" || Array.isArray(step.output)) return undefined;
  const status = (step.output as Record<string, unknown>).stageStatus;
  if (status === "review_incomplete") return { state: "needs_review", reason: "独立审阅未完成，候选已保留。" };
  if (status === "revision_incomplete") return { state: "needs_review", reason: "审阅意见尚未完成修订，原候选已保留。" };
  return undefined;
}

/** Projects only persisted phase metadata and assets belonging to the same creator's run tree. */
export async function projectWorkflowPhases(store: RunStore, root: RunRecord): Promise<PublicWorkflowPhase[]> {
  const runs = await relatedRuns(store, root);
  const creatorRunId = root.metadata?.creatorRunId;
  const runIds = [...runs.tree.keys()];
  const steps = (await Promise.all(runIds.map((id) => store.listSteps(id)))).flat().map((step) => step as PhasedStep);
  const [attemptLists, eventLists] = await Promise.all([Promise.all(steps.map((step) => store.listAttempts(step.id))), Promise.all(runIds.map((id) => store.listEvents(id)))]);
  const attempts = attemptLists.flat(); const events = eventLists.flat();
  const groups = new Map<string, { definition: PhaseDefinition; path: string[]; ownerRunId: string; controlSteps: PhasedStep[] }>();
  for (const step of steps) {
    if (!step.phaseId || !isDefinition(step.phaseDefinition)) continue;
    const id = step.phaseId;
    const group = groups.get(id) ?? { definition: step.phaseDefinition, path: [...(step.phasePath ?? [step.phaseId])], ownerRunId: step.runId, controlSteps: [] };
    group.controlSteps.push(step); groups.set(id, group);
  }
  return Promise.all([...groups.entries()].map(async ([id, group]) => {
    const artifacts: Array<PhaseArtifactBinding & { ownerRunId: string }> = [];
    for (const step of group.controlSteps) for (const binding of step.artifactBindings ?? []) {
      const actual = await store.getArtifact(binding.artifact.id);
      if (!actual || !sameArtifact(binding, actual)) continue;
      const owner = runs.creatorRuns.get(actual.producedBy.workflowRunId);
      // An explicit binding is an allowed input only after its immutable reference matches and owner shares this creator.
      if (!owner || (typeof creatorRunId === "string" ? owner.metadata?.creatorRunId !== creatorRunId : !runs.tree.has(owner.id))) continue;
      artifacts.push({ ...binding, artifact: actual, ownerRunId: owner.id });
    }
    // A parent can be waiting before it reaches bindArtifact. Child output is already immutable and readable,
    // so surface it under the inherited phase without pretending it fulfills a more specific expected role.
    for (const run of runs.tree.values()) {
      if (run.metadata?.phaseId !== id || (typeof creatorRunId === "string" && run.metadata?.creatorRunId !== creatorRunId)) continue;
      for (const actual of await store.listArtifacts(run.id)) {
        if (!artifacts.some((asset) => asset.artifact.id === actual.id)) artifacts.push({ artifact: actual, role: "published-output", title: "子流程已发布成果", ownerRunId: run.id });
      }
    }
    const unique = new Map(artifacts.map((asset) => [`${asset.ownerRunId}:${asset.artifact.id}:${asset.role}`, asset]));
    const phaseSteps = steps.filter((step) => step.phaseId === id);
    const latest = new Map<string, PhasedStep>(); for (const step of phaseSteps) latest.set(`${step.runId}:${step.key}`, step);
    const latestSteps = [...latest.values()];
    const ownerRun = runs.creatorRuns.get(group.ownerRunId);
    const ownerCanceled = ownerRun?.state === "canceled";
    const stepCounts = latestSteps.reduce<Partial<Record<RunState, number>>>((counts, step) => {
      const state = ownerCanceled && ["queued", "running", "waiting"].includes(step.state) ? "canceled" : step.state;
      return { ...counts, [state]: (counts[state] ?? 0) + 1 };
    }, {});
    const phaseAttemptIds = new Set(phaseSteps.map((step) => step.id));
    const phaseAttempts = attempts.filter((attempt) => phaseAttemptIds.has(attempt.stepRunId));
    const agentStepIds = new Set(phaseSteps.filter((step) => step.kind === "agent").map((step) => step.id));
    const agentAttempts = phaseAttempts.filter((attempt) => agentStepIds.has(attempt.stepRunId));
    const waiting = events.filter((event) => event.type === "phase.waiting" && event.data && typeof event.data === "object" && (event.data as Record<string, unknown>).phaseId === id).at(-1);
    const waitingData = waiting?.data as Record<string, unknown> | undefined;
    const missing = group.definition.expectedArtifacts?.filter((expected) => expected.required && !artifacts.some((asset) => asset.role === expected.role));
    const phaseEvents = events.filter((event) => event.type.startsWith("phase.") && event.data && typeof event.data === "object" && (event.data as Record<string, unknown>).phaseId === id);
    const started = phaseEvents.find((event) => event.type === "phase.started");
    const ended = phaseEvents.filter((event) => ["phase.completed", "phase.failed", "phase.canceled", "phase.blocked", "phase.needs_review"].includes(event.type)).at(-1);
    const controlStep = group.controlSteps.at(-1);
    const businessState = businessPhaseState(controlStep);
    const controlState = businessState?.state ?? controlStep?.state ?? "queued";
    const canceledByOwner = ownerCanceled && ["queued", "running", "waiting"].includes(controlState);
    const phaseState = canceledByOwner ? "canceled" as const : controlState;
    const cancellation = events.filter((event) => ["cancellation.requested", "workflow.canceled"].includes(event.type)
      && (event.runId === group.ownerRunId || event.runId === root.id)).at(-1);
    const active = ["queued", "running", "waiting"].includes(phaseState);
    const startTime = started ? Date.parse(started.timestamp) : NaN;
    const endTime = active ? Date.now() : ended ? Date.parse(ended.timestamp) : cancellation ? Date.parse(cancellation.timestamp) : NaN;
    const elapsedMs = Number.isFinite(startTime) && Number.isFinite(endTime) ? Math.max(0, endTime - startTime) : null;
    const ownerMetadata = runs.creatorRuns.get(group.ownerRunId)?.metadata;
    const subjectMetadata = typeof ownerMetadata?.postId === "string" ? ownerMetadata : (() => {
      const subjectIds = [...new Set([...runs.tree.values()]
        .filter((run) => run.metadata?.phaseId === id && typeof run.metadata?.postId === "string")
        .map((run) => run.metadata?.postId as string))];
      return subjectIds.length === 1 ? { postId: subjectIds[0] } : undefined;
    })();
    const subjectId = typeof subjectMetadata?.postId === "string" ? subjectMetadata.postId : undefined;
    const subjectTitle = typeof ownerMetadata?.postTitle === "string" ? ownerMetadata.postTitle : undefined;
    return { id, path: group.path, depth: 0, elapsedMs, title: group.definition.title, ...(subjectId ? { subjectId } : {}), ...(subjectTitle ? { subjectTitle } : {}), purpose: group.definition.purpose, order: group.definition.order,
      state: phaseState, stepCounts, usage: aggregateUsage(agentAttempts, events),
      ...(businessState ? { reason: businessState.reason } : phaseState === "waiting" && typeof waitingData?.childRunId === "string" ? { reason: `等待子流程 ${waitingData.childRunId}` } : missing?.length ? { reason: `预期未产出：${missing.map((item) => item.title ?? item.role).join("、")}` } : {}), expectedArtifacts: [...(group.definition.expectedArtifacts ?? [])],
      artifacts: [...unique.values()].sort((left, right) => (left.order ?? 0) - (right.order ?? 0)) };
  })).then((phases: PublicWorkflowPhase[]) => {
    const prefix = (parent: string[], child: string[]) => parent.length < child.length && parent.every((part, index) => child[index] === part);
    for (const phase of phases) {
      const phaseGroup = groups.get(phase.id);
      const owner = phaseGroup ? runs.tree.get(phaseGroup.ownerRunId) : undefined;
      const inherited = typeof owner?.metadata?.phaseId === "string" ? owner.metadata.phaseId : undefined;
      const parent = phases.filter((candidate) => candidate.id === inherited || (groups.get(candidate.id)?.ownerRunId === groups.get(phase.id)?.ownerRunId && prefix(candidate.path, phase.path))).sort((left, right) => right.path.length - left.path.length)[0];
      if (parent) phase.parentPhaseId = parent.id;
    }
    const children = (parentId: string | undefined) => phases.filter((phase) => phase.parentPhaseId === parentId)
      .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) || left.path.join("/").localeCompare(right.path.join("/")));
    const ordered: PublicWorkflowPhase[] = [];
    const visit = (parentId: string | undefined, depth: number) => children(parentId).forEach((phase) => { phase.depth = depth; ordered.push(phase); visit(phase.id, depth + 1); });
    visit(undefined, 0);
    for (const phase of ordered) {
      const descendants = new Set<string>([phase.id]);
      for (const candidate of ordered) if (candidate.parentPhaseId && descendants.has(candidate.parentPhaseId)) descendants.add(candidate.id);
      const agentSteps = new Set(steps.filter((step) => step.kind === "agent" && step.phaseId && descendants.has(step.phaseId)).map((step) => step.id));
      phase.usage = aggregateUsage(attempts.filter((attempt) => agentSteps.has(attempt.stepRunId)), events);
    }
    return ordered;
  });
}
