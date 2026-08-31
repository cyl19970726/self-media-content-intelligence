# ADR 0008 — Capability-partitioned creator research batches

Status: Accepted for incremental implementation
Date: 2026-08-31

## Context

The durable creator-research control plane in [ADR-0002](0002-creator-research-control-plane.md)
currently treats most non-video work as one serial lane. A slow detail request or creator
synthesis can therefore prevent unrelated creators from starting acquisition. Running every
creator through one undifferentiated lane also makes a 20-creator request hard to observe,
throttle, or recover without inspecting individual runs.

The product now needs an operator to submit a fixed list of 1–20 creator profile URLs and obtain
one batch-level workspace while every creator continues through the existing full research DAG.
Automatic creator discovery and ranking may later feed the same control plane, but is not a
prerequisite for the manual-entry vertical slice.

## Decision

Add a durable **Creator Research Batch** above existing creator runs. A batch owns the submitted
order, one membership entry per creator input, aggregate progress, and links to the resulting creator
dossiers. It coordinates work but does not duplicate creator evidence or become a second source of
run truth.

Scheduling is partitioned by capability rather than by batch or creator:

| Pool | Capability | Default limit | Purpose |
| --- | --- | ---: | --- |
| RedFox | `redfox` | 4 | identity, profile, inventory and bounded detail enrichment |
| Ego Browser | `ego-browser` | 1 | authenticated/private-machine fallback and media capture |
| Portfolio | `portfolio` | 1 | statistics, annotation and canonical selection |
| Video reconstruction | `video` | 3 | independent post-level reconstruction |
| Creator synthesis | `synthesis` | 2 | evidence-bound creator dossier synthesis |

Limits are deployment configuration, clamped to documented safe ranges. Workers claim only jobs
whose required capability belongs to their pool. Provider selection remains explicit policy; a
RedFox failure does not silently rotate identity or consume the Ego Browser lane without a recorded
transition.

Batch execution is failure-isolated:

- one creator's blocker or terminal failure does not stop eligible work for other members;
- at-least-once leases and idempotency remain authoritative at the job/run level;
- batch state is derived from member states and never marks partial work as complete;
- retry targets a failed member or failed job, not every successful member;
- a batch may finish `partial` and still expose every ready dossier and every unresolved blocker.

The first paid-live release gate is staged: run two explicitly approved creators first, inspect cost,
provider behavior, evidence, and UI projection, and only then authorize the remaining members up to
20. Automated tests are necessary but cannot satisfy this paid-live gate.

## Boundaries

This decision does **not** yet promise:

- automatic discovery, ranking, or selection of creators;
- more than 20 manually submitted members in one batch;
- automatic provider failover or credential rotation;
- PostgreSQL/distributed-worker deployment;
- RedFox item-level incremental checkpoints.

RedFox detail checkpointing is deliberately outside the first batch/worker implementation slice:
persist each accepted detail result before continuing so a later provider failure cannot replay
already-paid items. Until that follow-up is separately implemented and test-verified, a RedFox job
keeps its existing job-level commit boundary and batch concurrency must not be described as item-level
resumability. The two-creator paid smoke may inspect this boundary, but expansion beyond two is closed
until incremental checkpointing is implemented and verified.

## Consequences

- Batch is an observable coordination boundary; creator run and immutable artifacts remain the
  research source of truth.
- Independent capability pools prevent synthesis, browser, or video pressure from starving RedFox
  acquisition.
- Server deployments without proxy variables use direct RedFox access; provider-specific localhost
  proxy configuration is not part of this architecture.
- Concurrency increases provider load and paid-request exposure, so live rollout remains deliberately
  gated at 2 before 20.
- Existing single-creator APIs and runs remain valid; batch submission composes them rather than
  replacing them.

## Verification language

Initiative records must keep these claims separate:

- **Implemented** — executable behavior exists in the repository.
- **Test-verified** — automated tests have exercised the declared behavior.
- **Live-unverified** — the staged paid RedFox run has not passed, regardless of implementation or tests.

The active implementation and validation record is
[Creator Batch Pipeline V2](../initiatives/active/creator-batch-pipeline-v2/README.md).
