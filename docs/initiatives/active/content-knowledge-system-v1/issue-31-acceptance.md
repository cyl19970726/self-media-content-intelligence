# Issue #31 — Knowledge Invalidation and Health Acceptance

Status: **Accepted locally**

Issue: <https://github.com/cyl19970726/self-media-content-intelligence/issues/31>

## Outcome

Issue #31 makes provenance failure an explicit, auditable state transition:

```text
analysis revision | evidence reference
  → invalidation decision + stable impact list
  → contribution manifest state
  → observation gate + concept revision
  → semantic-edge state
  → derived creation-binding status
  → human health queue and impact ledger
```

Historical contribution records, concept revisions, content-package snapshots,
platform variants, publication runs, and publication receipts remain available.
The system changes the current knowledge basis; it does not rewrite what was
previously created or published.

## Requirements and acceptance mapping

| Requirement | Implemented behavior | Verification |
|---|---|---|
| R5 | Knowledge Health exposes deterministic lint items and concept detail exposes a causal Impact Ledger. | HTTP tests and Ego Browser desktop/narrow checks |
| R6 | Edges fixed to affected revisions become invalidated and cannot silently follow a new revision. | Cascade and inactive-endpoint tests |
| R9 | Analysis/evidence invalidation is idempotent, append-only, replayable, and preserves historical records. | SQLite replay, idempotency, and partial-support tests |
| R10 | Hard provenance propagation is deterministic; semantic repair still requires an explicit adjudication command. | Service boundary and regression tests |

## Domain decisions

1. The command target is an immutable analysis revision or evidence reference,
   never a prose search result.
2. One invalidation record freezes target, reason, actor, operation key,
   timestamp, and sorted affected identifiers.
3. Contribution manifests are retained and marked `invalidated`; their
   contributions are not deleted.
4. Research Learning owns observation invalidation and concept revision/status
   recomputation from remaining eligible support.
5. A semantic edge is pinned to two exact concept revisions. If either endpoint
   is no longer current/active, the edge is invalidated and requires a fresh
   human adjudication.
6. Frozen knowledge bindings are not mutated. Their current read status is
   derived as `current`, `stale_available`, or `invalidated`.
7. Analysis and evidence bindings now resolve against active manifests, not
   merely the historical existence of an identifier.
8. Lint IDs are deterministic from rule, subject type, and subject ID so the
   queue is stable across reads and projection rebuilds.
9. Missing manifests are detected from canonical research observations;
   first-party Practice Validation observations are excluded because their
   validation record is their manifest.
10. LLMs may summarize the impact or propose a repair, but cannot issue a hard
    invalidation or create a replacement semantic edge autonomously.

## API and compatibility

- `POST /api/v1/knowledge/invalidations` records and propagates a hard
  invalidation.
- `GET /api/v1/knowledge/invalidations` returns the audit ledger and accepts an
  optional `conceptId` filter.
- `GET /api/v1/knowledge/lint` returns typed health items.
- `GET /api/v1/knowledge/gaps` remains as a compatibility view over the same
  deterministic lint result.
- Existing knowledge, creation, publication, and Practice Validation routes are
  unchanged.

## Verification record

- Targeted Knowledge service, repository, and HTTP suites cover analysis and
  evidence cascades, partial remaining support, idempotency, replay, affected
  bindings, missing manifests, and the semantic adjudication boundary.
- Default repository suite: 39 files passed, 9 skipped; 182 tests passed, 41
  skipped.
- Typecheck, lint, and production client/server build passed.
- Ego Browser created a real local concept, working-package binding, and hard
  evidence invalidation through public APIs. The Knowledge Health rail showed
  stable blocked items for the orphan concept and affected binding; the concept
  Impact Ledger showed 1 source, 1 observation, and 1 creation impact.
- Desktop 1440×1000 and mobile 390×844 checks had no horizontal overflow. The
  mobile impact chain became two columns and record details became one column.
- A clean dependency install confirmed both IBM Plex font families loaded and
  the browser event stream contained no failed/error/exception events.
