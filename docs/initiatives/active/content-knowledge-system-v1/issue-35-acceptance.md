# Issue #35 — System Verification and Release Evidence

Status: **Task 13 accepted; full V1 release not ready**

> Historical release record: the Task 6 blocker described here is resolved by Issue #38. See `issue-38-acceptance.md` for the full V1 decision.

Issue: <https://github.com/cyl19970726/self-media-content-intelligence/issues/35>

## Release decision

The implemented single-post path is verified end to end and has no open P0/P1
defect:

```text
frozen analysis revision
  → accepted contribution manifest
  → revisioned Knowledge concept
  → pinned creation binding and predeclared hypothesis
  → frozen private publication fixture with isolated receipt
  → observable result
  → independent submitter and adjudicator
  → origin-labelled first-party practice observation
```

Task 13 is complete. The broader Content Knowledge System V1 remains **not ready
for full release** because Task 6 still lacks production creator and comparison
`KnowledgeCompiler` triggers. Those surfaces truthfully render zero-contribution
`legacy_unverified` manifests; this verification did not relabel them as compiled
knowledge or silently close Task 6.

## Safe release fixture

`npm run task13:fixture` builds the release candidate with real domain services in
an operating-system temporary directory. It refuses the real `.runtime`, ordinary
directories, non-empty directories, and any target whose basename does not begin
with `signal-room-task13-`. External Evidence Store input is read-only.

The fixture creates a complete report, five Knowledge concepts, an invalidated
concept and obsolete edge, a frozen content-package snapshot, a private Douyin
variant, an isolated publication receipt, declared hypotheses, and one promoted
practice validation. It does not open or submit any external publishing page.

Focused tests prove both the complete lineage and the path-safety refusals.

## Browser evidence

The seeded workspace was exercised in a real browser across:

- Knowledge index search, maturity/status filtering, empty state, lint state,
  invalidated concept, concept detail, evidence/revision/impact lineage, and a
  missing-concept error state.
- Contribution navigation between the single-post report, concept detail, creator
  dossier, and fixed-version comparison dossier.
- Creation S2 snapshot creation, `adapt` binding, rationale, and predeclared
  falsifiable hypothesis.
- Publication-history outcome capture, unavailable metric preservation, execution
  deviation, confounder, candidate relation, distinct submitter, distinct
  adjudicator, and promoted first-party observation.
- Adjacent creator index/detail, comparison index/detail, Evidence access,
  Learning Loop, report, and publishing surfaces.
- A second completely empty runtime for Knowledge, Creation, creator, and
  comparison first-use states.

Desktop semantic audits found one `h1` per major route, `zh-CN`, no duplicate IDs,
no missing image alt attributes, and no browser warning/error after the inline
favicon fix. True 390 × 844 checks covered Knowledge index/detail, report, creator,
comparison, and Creation. The audit found narrow-viewport overflow in Knowledge
evidence and creator/comparison contribution blocks; the responsive grid and long
line wrapping were repaired and all checked routes now report `scrollWidth ===
clientWidth` at 390 px.

Keyboard-visible focus is now a global contract for links, buttons, form controls,
summaries, and explicit tab stops. Palette, typography, icons, hierarchy, desktop
and narrow layouts remain consistent with the existing Signal Room language.

## Defect repaired during verification

`PracticeValidationHistory` previously shared submission/adjudication form state
between every validation card. Typing an invalidation reason in one completed
record populated the other records and could enable the wrong action. Draft state
is now keyed by validation ID. Browser regression proved that editing the first of
two records leaves the second record blank.

## Knowledge write authority

`check:knowledge-authority` is now part of `npm run verify`. It fails if:

- production code imports canonical Knowledge write authority outside the reviewed
  compiler, application command, recovery, and repository boundaries;
- browser code reaches privileged compilation, legacy-manifest, semantic-edge, or
  projection-rebuild commands; or
- model/executor code directly calls canonical compile, legacy, adjudication, or
  invalidation methods.

The check passed. Client-side creation/practice commands remain typed user actions;
no LLM/model executor owns the canonical repository.

## Automated verification

`npm run verify` passed on 2026-08-30:

- documentation, repository policy, package boundaries, Knowledge authority, and
  non-growing artifact budget;
- TypeScript typecheck and ESLint;
- 42 test files passed, 9 intentionally skipped; 189 tests passed, 41 intentionally
  skipped;
- production Web and server builds;
- compiled Web, API, Worker, and CLI entrypoint smoke checks.

Vite reported a non-blocking 529.96 kB entry chunk (151.50 kB gzip). Follow-up
performance work is tracked in
<https://github.com/cyl19970726/self-media-content-intelligence/issues/36>.

## Severity and follow-up

- P0/P1: none open.
- Repaired in this change: cross-record practice form state, missing visible-focus
  contract, narrow-viewport overflow, favicon 404.
- P2: route-level code splitting and a reviewed client bundle budget — Issue #36.
- Release blocker outside Task 13: Task 6 production creator/comparison compilers.

No screenshots, browser traces, runtime databases, or temporary evidence were
committed to the repository.
