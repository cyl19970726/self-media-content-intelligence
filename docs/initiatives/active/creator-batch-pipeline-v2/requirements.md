# Creator Batch Pipeline V2 — Requirements

Status: **Accepted scope; implementation and paid-live verification tracked separately**

## Problem

The current single-creator workflow is durable, but its broad serial lane makes multi-creator work
slow and opaque. Operators cannot submit one fixed 1–20 creator set, see aggregate progress, or
recover one failed creator without mentally reconstructing the state of many independent runs.

## Scope

- fixed manual entry of 1–20 creator profile URLs;
- one durable batch and ordered member list;
- reuse of the existing full creator analysis for every accepted member;
- five bounded, capability-specific worker pools;
- batch and member progress in the workbench;
- failure isolation, bounded retry, restart recovery, and honest partial completion;
- automated validation followed by paid-live 2-before-20 release gates.

## Non-goals

- automatic discovery/ranking/selection;
- arbitrary batch size or multi-tenant scheduling fairness;
- automatic provider or account rotation;
- RedFox item-level incremental checkpointing in the first implementation slice; it is a mandatory
  follow-up before paid expansion beyond two;
- claiming that a lightweight inventory alone is a complete creator analysis.

## User stories

1. As an operator, I want to submit specific creators so editorial judgment can directly define the
   research cohort.
2. As an operator, I want one batch view so I can see which creators are queued, active, ready,
   blocked, or failed without opening every dossier.
3. As an operator, I want unrelated creators to keep progressing when one provider call or browser
   task fails.
4. As an operator, I want to retry only unresolved work so successful analysis and paid provider
   results are not blindly repeated.
5. As a release owner, I want a two-creator paid-live gate before twenty-creator execution so cost,
   rate behavior, evidence integrity, and UI truthfulness are inspected before scale-up.

## Acceptance requirements

### R1 — Fixed manual cohort

- When an operator submits between 1 and 20 supported creator profile URLs, the system shall create
  one durable batch with the same normalized input order and one member per accepted input.
- When the request contains zero or more than 20 inputs, the system shall reject it without creating
  a partial batch.
- When an input is invalid or a normalized creator identity is duplicated in the same request, the
  system shall return a field/member-level explanation before paid work starts.
- When a previously known creator is submitted, the system shall apply explicit cache/reuse policy
  and expose the selected run instead of silently duplicating work.

### R2 — Batch control plane

- When a batch is created, the system shall persist its identity, label, ordered member inputs,
  creation time, and member/run links independently from browser or API request lifetime.
- While work is active, the batch projection shall expose aggregate counts and each member's current
  stage, provider, blocker/failure code, next action, and dossier link when available.
- When all members reach terminal states, the system shall derive `ready`, `partial`, or `failed`
  from member truth and shall never report ready while any required member is unresolved.
- After service restart, the system shall reconstruct batch state from durable batch membership and
  referenced run/job records without relying on process memory.

### R3 — Capability-partitioned scheduling

- While jobs are eligible, each worker pool shall lease only its declared capability and shall not
  use a shared serial slot that allows one capability to starve another.
- The system shall provide five bounded pools: one shared RedFox acquisition/detail pool, Ego Browser,
  portfolio, video reconstruction, and creator synthesis. RedFox acquisition and detail shall share
  the same provider budget.
- When configured values are absent or out of range, the system shall use or clamp to documented safe
  limits rather than create unbounded concurrency.
- While an Ego Browser job needs one authenticated TaskSpace, the system shall preserve a concurrency
  limit of one for that browser boundary.

### R4 — Failure isolation and recovery

- When one member fails, backs off, or needs user action, the scheduler shall continue eligible jobs
  for other members.
- When an operator retries an unresolved member, the system shall not recreate ready creator runs or
  rerun ready video items.
- When a lease expires, the existing at-least-once/idempotency rules shall reclaim the affected job
  without treating unregistered partial output as authoritative.
- When a batch contains both ready and unresolved members, the workbench shall expose it as partial
  rather than hiding ready results or falsely declaring full completion.

### R5 — Full-analysis integrity

- When a member is accepted for this batch type, the system shall drive it through the existing
  inventory, portfolio/selection, detail/media, video, and creator-synthesis gates required by the
  canonical single-creator contract.
- When only lightweight acquisition is complete, the system shall label the member as comparable
  inventory/research-in-progress and shall not publish it as a completed dossier.
- When a creator dossier becomes ready, its evidence and artifact references shall remain owned by
  the creator run; the batch shall store references and projections, not a second mutable copy.

### R6 — Provider and cost safety

- When RedFox is used on a server with no standard proxy variables, the client shall connect directly
  and shall not depend on a committed localhost or provider-specific proxy setting.
- When a provider returns authentication, rate, network, or availability failure, the system shall
  preserve a safe, provider-specific failure class instead of presenting an unrelated browser redirect.
- Until item-level RedFox checkpointing is implemented, the product and documentation shall not claim
  that partially completed detail items can resume without replay.

### R7 — Workbench usability

- When an operator opens the creator batch workbench, the system shall show batch progress, all ordered
  members, active capability, actionable blockers, retry actions, and ready dossier links.
- At desktop and 390 px widths, the primary submission, aggregate status, and member actions shall be
  usable without horizontal page overflow.
- When there is no batch data or a request fails, the workbench shall show an honest empty/error state
  rather than an apparently empty successful product.

### R8 — Verification and rollout

- Before paid-live execution, repository documentation, type, test, lint, and build gates shall pass.
- When automated tests complete, the validation record shall distinguish implemented behavior from
  test-verified behavior and shall still mark paid-live state as unverified.
- Before authorizing a batch larger than two, two explicitly approved creators shall complete the paid
  live inspection for provider cost, concurrency, evidence, recovery, and UI projection.
- Before authorizing a batch larger than two, RedFox item-level incremental checkpointing shall also
  be implemented and test-verified so already-accepted paid detail results are not replayed blindly.
- Only after the two-creator gate and checkpoint gate pass shall the operator authorize the remaining
  cohort up to 20.
