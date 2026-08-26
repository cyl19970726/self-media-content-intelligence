# Creator Research Architecture Requirements

## Problem

Creator research must survive browser interruptions, process restarts, policy changes, and concurrent video work without relying on foreground agent polling or direct filesystem projection. Research evidence must remain reproducible while the user sees one coherent run and Dashboard.

## Scope

- Durable creator-run and job control plane backed by SQLite leases and events.
- Immutable, content-addressed research artifacts with explicit input and policy provenance.
- Full-corpus acquisition followed by representative sample selection.
- Single-pass video reconstruction and independent evaluation.
- One to three concurrent video jobs with atomic batch aggregation.
- Creator synthesis and Dashboard projection from registered artifacts.
- Evidence-backed blocker attribution before `needs_user`.
- Runtime creator-analysis skills and contracts used by bounded workers.

## Non-goals

- No observer or session-forensics subsystem.
- No distributed queue, microservice split, or external database.
- No repeated quality-repair loop for ordinary research warnings.
- No automatic bypass of login or platform safety challenges.
- No inclusion of real creator media, runtime databases, or generated research artifacts in this architecture change.

## Acceptance criteria

### R1 — Durable control plane

- When a stage starts, progresses, becomes stale, completes, or fails, the system shall persist an attributable event with run, job, worker, and revision identity.
- When a lease expires, the system shall reclaim non-terminal work without rerunning terminal video items.
- While a long worker is healthy, the control plane shall expose state through API projections without requiring PTY, process, or file-time inspection.

### R2 — Artifact provenance

- When a worker produces research output, the artifact store shall register an immutable content-addressed revision and its dependencies.
- When evaluation policy changes, each video outcome shall retain the policy revision that produced it.
- When synthesis consumes mixed policy generations, it shall document coverage and shall not compare pass rates, warning counts, repair counts, or completeness scores across generations.

### R3 — Single-pass video research

- When a representative video is ready, the system shall run one reconstruction and one independent evaluator.
- When the evaluator finds ordinary quality gaps, the system shall preserve them as warnings and shall still register the research outcome.
- Only unreadable media, missing required output, corrupt output, or infrastructure failure shall be retryable failures.

### R4 — Bounded concurrency and aggregation

- While video jobs are queued, the worker shall lease at most three video jobs concurrently and shall keep non-video stages serial.
- When concurrent videos finish out of order, the batch aggregator shall preserve every terminal outcome without lost updates.
- When the final video outcome is committed, the system shall enqueue creator synthesis exactly once.

### R5 — Blocker ownership

- Before emitting `needs_user`, the acquisition path shall distinguish a real login or safety challenge from malformed URLs, redirects, page-shape changes, and other internally recoverable navigation failures.
- When canonical recovery succeeds, the system shall resume the same run without reacquiring the frozen inventory.
- When a real user action is required, the blocker shall identify the run, affected item, challenge type, and one required action.

### R6 — API and Dashboard projection

- The Dashboard shall read registered API projections rather than scan heterogeneous artifact folders.
- While videos run concurrently, the run projection shall expose configured concurrency, active post IDs, queued count, analyzed count, and failed count.
- A visible Dashboard shall not imply a completed research run unless synthesis and its independent gate are bound to the current artifact revisions.

### R7 — Verification and packaging

- Tests shall cover lease recovery, child lifecycle events, single-pass warnings, policy boundaries, blocker attribution, concurrent out-of-order completion, idempotent aggregation, and exactly-once synthesis.
- The architecture PR shall contain source, tests, skills, and specifications only; it shall exclude real research media and runtime artifacts.
