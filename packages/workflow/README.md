# Composable workflows

This package contains the business-independent execution contract. It does not import research, adapters, applications, or Codex. Workflows are ordinary TypeScript functions; branch and loop decisions should be recorded with `ctx.decide`.

```ts
const analyze = workflow("post.analyze", { revision: "1" }, async (ctx, input) => {
  let candidate = await ctx.agent("build", builder, input);
  const valid = await ctx.validate("check-candidate", candidate, validateCandidate);
  if (!valid.valid) return ctx.needsReview({ candidate, findings: valid.details });

  for (let round = 0; round < 2; round++) {
    const review = await ctx.agent(`review:${round}`, reviewer, { candidate });
    const decision = ctx.decide(`route:${round}`, review.route);
    if (decision === "deliver") return ctx.publish("report", "post-candidate", candidate);
    if (decision === "missing_evidence") return ctx.blocked({ candidate, review });
    if (round === 1) break;
    candidate = await ctx.agent(`repair:${round}`, repairBuilder, { candidate, findings: review.findings });
    const repaired = await ctx.validate(`check-repair:${round}`, candidate, validateCandidate);
    if (!repaired.valid) return ctx.needsReview({ candidate, findings: repaired.details });
  }
  return ctx.needsReview({ candidate });
});
```

Different agent or child-workflow branches can fan out under stable names and join with typed results:

```ts
const results = await ctx.parallelSettled("evidence-round", {
  transcript: () => ctx.agent("transcript", transcriptAgent, input),
  visuals: () => ctx.call("visuals", visualWorkflow, input),
  metadata: () => ctx.task("metadata", loadMetadata, input),
}, { concurrency: 2 });
```

`parallel` returns the same named object and throws after the started work settles if a branch fails. `parallelSettled` keeps failures isolated as `PromiseSettledResult` values. Branch names are sorted for deterministic dispatch and become stable control-step keys (`evidence-round:visuals`). Durable suspension retains that branch's concurrency slot for the current advance: an unstarted branch waits for a later resume instead of exceeding the declared fan-out limit.

Long workflows can expose durable, reader-facing phases without putting presentation concerns into agents:

```ts
const candidate = await ctx.phase("build", {
  title: "Build candidate",
  purpose: "Create one evidence-backed candidate",
  expectedArtifacts: [{ role: "candidate", required: true }],
}, async (phase) => {
  const result = await phase.call("builder", buildWorkflow, input);
  await phase.bindArtifact(result.candidate, { role: "candidate", primary: true });
  return result;
});
```

Phase keys form a stable nested path and scope every inner step. `phaseId` stays stable across attempts and durable resume. `bindArtifact` stores an exact reference and display role on the phase control step; it does not copy the asset or change its producer. Child runs receive the phase ID and path in run metadata. Use distinct explicit phase keys in loops. A phase that returns `blocked` or `needs_review` records that state on its control step, so execution completion is not confused with accepted research quality.

The actual research implementation is in `packages/research/src/workflows`; it includes candidate versions, repairs, independently bound evaluation assets and deterministic validation. Production dispatch uses `packages/adapters/src/workflow/production-research-runner.ts` to retain the existing full research operators and project skills.

## Execution and recovery

- `RunStore` owns run, step, attempt, artifact and event persistence. SQLite implementation is in adapters; `MemoryRunStore` is for tests and transient use.
- `AgentRunner` owns model invocation. Model and reasoning effort are explicit agent configuration; there is no automatic more-expensive fallback.
- `task`, `agent`, `call`, `mapSettled`, `parallel`, `parallelSettled`, `phase`, `validate`, `publish` and `decide` use explicit stable keys. Reusing a key for a different semantic operation is a workflow authoring error. Inner phase keys are scoped by the complete phase path.
- A resume re-executes the workflow function from the beginning. Successful **validated** nodes with the same workflow revision, node key, input and configuration fingerprints are reused. This is node replay, not arbitrary JavaScript continuation or exactly-once side effects.
- Increment the workflow revision when task or validator code changes; their implementation closures cannot be hashed or persisted safely. Agent configuration fingerprints include declared model/prompt/skill/permission revisions. Production inputs also pin real source/method file digests.
- Parallel branch callbacks are closures too. Their control-step fingerprint contains the group and branch names, not captured JavaScript values. Keep branch names stable and increment the workflow revision whenever a branch's captured inputs or implementation semantics change. Put external side effects behind keyed `task`, `agent`, or `call` nodes.
- Agents start with pending validation. `ctx.validate` binds to the producing object identity; use its explicit producer key option to disambiguate outputs when necessary. Never equate schema validity with research quality.
- `ctx.call` is inline by default. With a `ChildWorkflowDispatcher`, children are queued separately and the parent enters `waiting`; its current job returns and releases the scheduler lease. Definitions must be registered by ID and revision, with frozen serializable inputs. No function closure is serialized.
- A durable `mapSettled` finishes its current dispatch work before suspending. The dispatcher/scheduler is responsible for actual worker concurrency. The research adapter routes post workflows through the existing video pool with a limit of two.
- Durable `parallel` and `parallelSettled` stop a worker when its child suspends. At most `concurrency` named branches are active; undispatched branches start on later resumes as prior children complete. Successful branch control steps and their validated inner nodes are replayed independently.
- Execution states `waiting`, `blocked` and `needs_review` mean different things: awaiting scheduled children, unavailable research evidence, and available output needing review. `succeeded` does not imply an accepted research claim.
- Runtime cancellation is an `AbortSignal`. Durable cancellation, descendant propagation and cross-process polling are adapter responsibilities. Existing research jobs remain the only scheduling queue.

## Trace and assets

Events are sequenced per workflow run by the store. Each step links attempts and immutable artifact references; artifacts record schema, revision, SHA-256, producer and dependencies. Model usage is unknown when unavailable, never zero by default.

Codex prompts, tool output, skill snapshots and raw JSONL remain in private runtime trace directories outside `/artifacts`. HTTP serves bounded operational summaries and registered research assets, not a general local-file endpoint. Unknown asset schemas have a safe JSON fallback in the workbench.
