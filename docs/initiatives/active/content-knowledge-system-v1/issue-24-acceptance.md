# Issue #24 — LLM Wiki Minimum Closed-Loop Acceptance

Status: **Completed — Issue #24 closed by PR #25**

Date: **2026-08-28**

This record covers only the Issue #24 single-post vertical slice. It does not
claim completion of creator/comparison compilers, Creation bindings or Practice
Validation.

PR #25 merged as `ac9e7ca7`; its required PR check and the post-merge `main` CI
run both passed before this record was closed.

## Shipped behavior

- A completed single-post report emits one immutable contribution Manifest keyed
  by analysis revision and compiler policy.
- Deterministic candidates can create a video-specific candidate Concept or add
  confirm/qualify/contradict observations; no compiler path expands Concept scope.
- Equivalent claims in a later revision produce `accepted_no_new_knowledge`.
- Pending, missing, unauthorized or integrity-failed Evidence produces structured
  quarantine reasons and cannot count toward promotion.
- Research Learning events, Knowledge decisions and projections share one SQLite
  transaction boundary. Failed manifest persistence reloads the in-memory research
  model from the rolled-back ledger.
- Legacy Research Learning events migrate additively without changing IDs or
  payloads. Prose-only history is explicitly `legacy_unverified`.
- Concept/contribution/lineage/binding/validation projections and FTS5/BM25 text
  can be rebuilt through the service or local API.
- The report contribution block and Concept page expose Manifest status, policy,
  source analysis, target Concept, decision reason, revision history and Evidence
  links. Evidence deep links resolve and verify Manifest bytes.

## Automated acceptance

Default `npm run verify` passed with no `SIGNAL_ROOM_EVIDENCE_ROOT`:

- documentation and repository policy;
- artifact budget and inventory;
- typecheck and lint;
- 39 test files passed, nine external-data files skipped by contract;
- 170 tests passed, 41 skipped;
- web/API/Worker/CLI builds and entrypoint smoke.

External parity passed with
`SIGNAL_ROOM_EVIDENCE_ROOT=/Users/hhh0x/self-media-evidence npm run test:evidence`:

- 48/48 test files passed;
- 210 tests passed, one intentionally skipped compatibility case;
- the real `real-breakdown/6a6b25970000000025006eaf/analysis.json`
  object verified at 19,377 bytes with SHA-256
  `353d18c378cf439717318f7b3b66c1132abb93ce61eaa362e235a6343461c5ea`;
- the same real analysis input compiled twice without duplicate Manifest,
  Observation or Concept revision, reopened successfully and retained projection
  parity after rebuild.

## Browser acceptance

Using an isolated runtime and the mounted external Evidence store:

1. `fixture://xiaohongshu/three-layer-demo` completed and displayed one accepted
   Manifest with four evidence-backed contributions.
2. Contribution → Concept navigation preserved the source run and displayed the
   exact analysis revision, observation gate, decision history and report artifact.
3. FTS search for `数字限定` returned the expected Concept.
4. A live projection rebuild preserved counts
   `1 manifest / 4 contributions / 1 decision event`; the refreshed UI still
   returned all four Concepts with no browser warnings or errors.
5. The Concept detail was checked at desktop and mobile breakpoints without
   document overflow.
6. The Evidence deep link resolved the real analysis object and displayed
   `available / verified`, bytes and SHA-256.

Database backup, migration, rebuild and rollback instructions are in
[`docs/operations/knowledge-recovery.md`](../../../operations/knowledge-recovery.md).
