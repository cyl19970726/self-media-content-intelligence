# Content Knowledge System V1 — Implementation Plan

Status: **Confirmed — Implementation Authorized**

Design source: `docs/initiatives/active/content-knowledge-system-v1/design.md`

## Completion definition

V1 is complete when a user can move through this auditable loop in the product:

```text
analysis revision
  → explicit knowledge contribution
  → browsable revisioned concept
  → pinned creation decision and hypothesis
  → frozen publication validation
  → adjudicated learning result
```

The implementation must preserve existing research-learning and publishing data, pass repository tests, API tests, typecheck, lint, build, and browser validation for the new and adjacent routes.

## Tasks

- [x] 1. Freeze shared contracts and compatibility rules
  - Add schemas for maturity, contribution manifests, contributions, semantic edges, knowledge bindings, content-package snapshots, hypotheses, practice validations, and practice observations.
  - Extend research observations with `practice_validation` subject type and explicit origin without changing the meaning of existing records.
  - Preserve parsing of existing research-learning events and content packages through defaults or compatibility adapters.
  - Add schema tests for valid, invalid, and legacy inputs.
  - _Requirements: R1, R2, R6, R7, R8, R9, R12_

- [x] 2. Establish the content-knowledge domain service
  - Introduce repository ports and a service that owns manifest idempotency, contribution decisions, semantic-edge adjudication, bindings, hypotheses, and validation state transitions.
  - Ensure support/qualification/contradiction remain observation-backed and are not duplicated as canonical edge rows.
  - Add deterministic policies for evidence eligibility, origin-partitioned counts, and stale impact.
  - Add focused service tests for each state transition and prohibited shortcut.
  - _Requirements: R1, R2, R4, R6, R7, R8, R10_

- [x] 3. Add durable SQLite storage and rebuildable projections
  - Implement additive SQLite tables/indexes and an append-only decision ledger compatible with the existing local runtime.
  - Make command writes and projection updates atomic.
  - Add concept, contribution, lineage, gap, binding, and validation read projections.
  - Add FTS5/BM25 search with deterministic typed filters and a full projection rebuild path.
  - Verify reopen, replay, idempotency, and projection parity with repository tests.
  - _Requirements: R5, R6, R9, R12_

- [x] 4. Migrate existing Research Learning behind the new repository boundary
  - Replay existing concept/revision/observation events into the new read model without rewriting historical decisions.
  - Keep current `/api/v1/research-concepts` reads working through a compatibility facade.
  - Mark resolvable historical analyses for backfill and isolate prose-only records as `legacy_unverified`.
  - Add parity fixtures proving current counts, revisions, and dependent conclusions do not change unexpectedly.
  - _Requirements: R3, R4, R9, R12_

- [x] 5. Implement knowledge query and command APIs
  - Add list, search, detail, lineage, contribution, and gap routes under `/api/v1/knowledge`.
  - Add idempotent compilation and semantic-edge adjudication commands.
  - Return pinned IDs, decision status, explicit quarantine reasons, and structured errors.
  - Add API tests for empty state, seeded state, filtering, lineage, idempotency, and invalid commands.
  - _Requirements: R2, R5, R6, R9, R10, R11_

- [x] 6. Connect analysis revisions to contribution manifests
  - Add a bounded `KnowledgeCompiler` port and a deterministic/manual adapter suitable for tests and local operation.
  - Trigger contribution compilation only after existing video, creator, or comparison publication gates pass.
  - Resolve immutable evidence refs and write an explicit `accepted_no_new_knowledge` or quarantine result when appropriate.
  - Ensure retrying an unchanged analysis revision cannot duplicate observations.
  - Add integration tests for video, creator, comparison, no-new-knowledge, and insufficient-evidence paths.
  - _Requirements: R2, R3, R4, R9, R10_
  - **Completed in Issue #38:** research-owned ready-only completion ports now publish immutable creator and comparison snapshots to reviewed server-side compilers. Creator roles retain per-post creator/video/tier/deep/evidence identity and can reach `creator_specific` only through Research Learning's deterministic gate. Versioned comparisons pin ready independent synthesis/gate artifacts, preserve portfolio-only legacy honesty, derive exact-normalized shared roles plus exceptions/gaps, and can reach `conditional` or `track_wide` only through the existing thresholds. Every run records promotion decisions, unchanged retries are idempotent, and an isolated three-creator fixture proves Knowledge → Creation → Practice without touching real runtime data or external Evidence.

- [x] 7. Build the Knowledge index and concept detail surfaces
  - Add the top-level Knowledge navigation route and client API types.
  - Implement the asymmetric editorial index with state/maturity filters, compact health counts, concept register, gaps, and search.
  - Implement concept detail with current revision, conditions, exclusions, evidence lanes, denominators, semantic neighbours, downstream bindings, and history.
  - Provide loading, empty, stale, quarantined, failed, mobile, keyboard, and evidence-drawer states.
  - Add projection/view tests and browser validation for `/knowledge` and `/knowledge/:id`.
  - _Requirements: R1, R5, R6, R9, R11_

- [x] 8. Add contribution visibility to research surfaces
  - Add a reusable contribution block to single-post, creator, and comparison reports.
  - Show created, confirmed, qualified, contradicted, quarantined, and reviewed-no-new-knowledge outcomes against the frozen analysis revision.
  - Link contribution → concept → evidence and preserve return navigation.
  - Add component/view tests and browser smoke checks on all three research surfaces.
  - _Requirements: R2, R3, R4, R11_

- [x] 9. Add content-package snapshots, knowledge bindings, and hypotheses
  - Extend publishing storage additively with immutable package snapshots while preserving `sourceRefs[]`.
  - Add binding and hypothesis command/query APIs with revision existence and status checks.
  - Extend Creation Workspace to search knowledge, choose adopt/adapt/reject/test, record rationale, and declare expected/unavailable signals and baseline.
  - Freeze selected bindings and hypotheses with the package snapshot used by a platform variant/publication.
  - Add tests for revision pinning, stale impact, invalid targets, and legacy packages.
  - _Requirements: R7, R9, R11, R12_
  - **Completed in Issue #27:** real working/frozen package snapshots replace client-generated timestamp IDs; variants and publication runs preserve snapshot lineage; nested commands enforce ownership, lifecycle, immutable target resolution and same-snapshot hypotheses; legacy packages remain readable and acquire a snapshot only when they next enter creation.

- [x] 10. Implement practice validation and independent adjudication
  - Create validation records only from resolvable publication runs and frozen variant/package revisions.
  - Capture observable signals, source, collection time, deviations, confounders, and unavailable metrics without inventing denominators.
  - Add submit/adjudicate APIs and enforce the validation state machine.
  - Translate only eligible adjudicated candidates into origin-labelled canonical observations; keep origin counts partitioned.
  - Add publication-history UI for hypothesis versus outcome and learning decision.
  - Add service, API, and integration tests for promoted, inconclusive, blocked, and invalidated outcomes.
  - _Requirements: R1, R8, R9, R10, R11_
  - **Completed in Issue #29:** validation creation now requires a published or verified-draft run with matching frozen package/variant lineage; the validation freezes hypothesis, baseline, receipt, observable and unavailable metrics; submitter/adjudicator identity separation and explicit terminal decisions enforce the state machine; promoted results enter Research Learning only as partitioned `first_party_practice` observations; Publication History renders the planned/observed/decision case file without inventing unavailable denominators.

- [x] 11. Implement staleness, invalidation, lint, and gaps
  - Propagate hard provenance invalidation through observations, projections, semantic edges, and working bindings.
  - Preserve historical packages and publication receipts while marking their knowledge basis accurately.
  - Surface unresolved contradictions, orphan concepts, missing conditions/exclusions, obsolete edges, affected bindings, and missing manifests.
  - Add regression tests for each cascade and ensure semantic changes still require adjudication.
  - _Requirements: R5, R6, R9, R10_
  - **Completed in Issue #31:** explicit analysis/evidence invalidation records a stable impact result, invalidates manifests and Research Learning observations, persists obsolete semantic-edge state, and derives affected creation-binding status without rewriting frozen history. Deterministic lint now surfaces contradictions, unsupported concepts, missing conditions/exclusions, obsolete edges, affected bindings, and missing manifests. Knowledge Health and the concept Impact Ledger expose the causal chain and required human action.

- [x] 12. Backfill verified history and document operational recovery
  - Provide an idempotent backfill path for analyses with resolvable revision and evidence lineage.
  - Record `legacy_unverified` for unsupported prose-only reports instead of synthesizing facts.
  - Document projection rebuild, database backup, migration rollback, and compatibility-window procedures.
  - Test backfill reruns and rollback against an isolated runtime database.
  - _Requirements: R2, R9, R12_
  - **Completed in Issue #33:** the read-only-by-default backfill planner scans canonical run reports, verifies the matching report artifact and evidence-ref grammar, reuses the existing single-post compiler for resolvable history, records unsupported final reports as zero-contribution `legacy_unverified`, and skips non-final runs. Offline CLI tools now create SHA-256 manifests, guard WAL/SHM boundaries, preserve displaced databases during restore, and prove projection rebuild, FTS, close/reopen, and rollback against isolated runtime copies.

- [x] 13. Complete system verification and release evidence
  - Run targeted tests after every vertical slice, then the full test suite, typecheck, lint, client build, and server build.
  - Run browser flows for Knowledge index/detail, contribution navigation, Creation binding, and Practice Validation, plus adjacent research and publishing routes.
  - Audit palette, typography, icons, responsive behavior, accessibility semantics, and absence of forbidden direct LLM writes.
  - Update this checklist with actual completion status and record any externally blocked verification explicitly.
  - _Requirements: R1–R12_
  - **Completed in Issue #35 and closed for full V1 in Issue #38:** Issue #35 proved the single-post Knowledge → Creation → Practice lineage and established the permanent authority/browser release gate. Issue #38 adds production creator/comparison compilation, explicit deterministic promotion decisions, and the isolated three-creator closed-loop fixture; the final verification record is `issue-38-acceptance.md`.

## Planned vertical slices

1. **Knowledge read slice**: Tasks 1–5 and 7 produce a usable, compatible Knowledge workspace over existing concepts.
2. **Research contribution slice**: Tasks 6 and 8 make each analysis contribution visible and idempotent.
3. **Creation decision slice**: Task 9 pins what was believed and what is being tested.
4. **Practice learning slice**: Tasks 10–12 close the feedback loop safely.
5. **Release slice**: Task 13 proves the complete path and adjacent-route compatibility.

## Execution authorization

The owner confirmed this plan and authorized implementation on 2026-08-28. Execution proceeds through all slices without further phase-level confirmation unless a newly discovered decision would materially change the accepted design.
