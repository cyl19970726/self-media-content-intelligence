# ADR 0002 — Creator research control plane and package boundaries

> Topology note (2026-08-28): the path layout in this historical decision was
> superseded by [ADR-0005](0005-workspace-modular-monolith.md) and the current
> [Package Boundaries](../architecture/package-boundaries.md). Its control-plane
> invariants remain accepted.

Status: Accepted for incremental implementation
Date: 2026-08-20

## Context

The creator intake UI previously wrote one JSON-shaped SQLite row and stopped at `worker_not_connected`. Completing a creator study still depended on an operator manually running CLI commands and copying outputs into a static Dashboard.

The product contract requires one in-product flow: submit a creator URL, observe durable progress, hand off login only when required, and open the result in the same research workspace.

## Decision

Use these package boundaries:

```text
src/shared/                 Browser/server contracts and runtime schemas
src/modules/orchestration/  Job, lease, event and executor contracts
src/modules/creator-research/
                            Creator workflow policy and state transitions
src/modules/portfolio/      Frozen corpus statistics and canonical selection
src/modules/media-resolution/
                            Verified local media and cover manifests
src/modules/video-analysis/ Validated reconstruction execution boundary
src/modules/creator-synthesis/
                            Evidence-bound creator research publication gate
src/modules/comparison/     Pinned cross-account projects and worker
src/platform/database/      SQLite repository implementation
src/platform/artifacts/     Artifact persistence and reference resolution
src/platform/browser/       ego-browser process adapter
src/server/                 HTTP transport and worker composition root
apps/web/src/features/creator-research/  Research UI and progress surface
src/core/                   Legacy compatibility facades during migration
```

The server composition root starts a background `CreatorResearchWorker`. HTTP handlers only create, resume, and query work. The worker claims an idempotent SQL job with a lease, invokes an allowlisted ego-browser executor, persists sanitized inventory evidence, and records append-only events.

Login, captcha, and user takeover become durable `needs_user` states. The worker never rotates identity, bypasses a challenge, or treats an unavailable page as an empty corpus.

## Current vertical slice

Implemented:

- URL submission and cache-aware deduplication;
- persistent creator run, job, lease, heartbeat and event ledger;
- ego-browser identity/login preflight;
- bounded convergent public-grid inventory;
- sanitized inventory artifact;
- immutable corpus, statistics and canonical selection artifacts;
- reproducible High / Base / Low 7×3 selection with median/mean anchors;
- nine deep candidates marked inside the same 21 records;
- bounded 21-record detail enrichment in the same browser TaskSpace, with an 80% identity gate;
- ephemeral signed navigation that never enters run artifacts or API responses;
- Dashboard progress, blocker, retry/resume and List/Gallery portfolio projection;
- explicit `reviewable` boundary after portfolio analysis;
- local cover evidence for all selected records when available, without persisted signed source URLs;
- verified local video fan-out for the nine deep candidates;
- process-isolated candidate reconstruction, independent evaluator, deterministic hard gates, and bounded repair loops;
- creator synthesis gated on the same 21 records and all nine validated reconstructions;
- pinned multi-creator comparison projects with a durable lease-based worker.

Still deliberately deferred are backend-only platform metrics, a public object-store deployment,
and the separate Creation Workspace. They are not inferred or embedded into research outputs.

## Consequences

- CLI remains an internal adapter, not a user workflow.
- Existing artifacts and routes remain readable during migration.
- SQLite is sufficient locally; repository contracts allow a later PostgreSQL adapter.
- Static reports are read-only exports, not the source of task state.
- A successful acquisition or portfolio calculation is never labeled a completed creator analysis.
