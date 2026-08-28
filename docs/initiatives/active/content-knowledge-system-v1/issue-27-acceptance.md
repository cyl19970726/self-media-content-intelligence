# Issue #27 — Creation Decision Slice Acceptance

Status: **Accepted locally**

Issue: <https://github.com/cyl19970726/self-media-content-intelligence/issues/27>

## Outcome

Issue #27 replaces the client-generated pseudo snapshot with a durable creation
decision boundary:

```text
concept / analysis / evidence revision
  → adopt | adapt | reject | test + rationale
  → creation hypothesis + observable signals + baseline
  → frozen content-package snapshot
  → platform variant
  → publication run
```

The key invariant is that a knowledge update may change the status of a working
or historical binding, but it cannot rewrite which revision a variant used.

## Requirements and acceptance mapping

| Requirement | Implemented behavior | Verification |
|---|---|---|
| R7 | A real working snapshot receives typed bindings and same-snapshot hypotheses. Creating a platform variant freezes it. | Creation service and HTTP integration tests |
| R9 | Bindings resolve concept, analysis, or evidence identifiers; variants and runs preserve the frozen snapshot ID. | Knowledge service and API tests |
| R11 | Creation Workspace exposes snapshot sequence/status, pinned revision status, adopt/adapt/reject/test, rationale, signals and baseline. | Browser flow |
| R12 | `sourceRefs[]` remains intact; legacy objects parse with nullable snapshot lineage and acquire a real snapshot only on new creation. | Legacy service test and repository reopen test |

## Domain decisions

1. `ContentPackageSnapshot` belongs to Creation, not Knowledge.
2. The package payload is copied when the working snapshot is created.
3. Bindings and hypotheses are separate canonical rows keyed to that snapshot.
4. Freezing changes only lifecycle state; the captured package payload is never rewritten.
5. A frozen snapshot rejects new bindings and hypotheses. A new decision requires the next package-local sequence.
6. A platform variant preserves one snapshot for its full revision history.
7. A publication run copies that snapshot ID from its frozen platform variant.
8. Legacy history remains explicitly unknown instead of receiving invented provenance.

## Compatibility notes

- `ContentPackage.sourceRefs[]` is unchanged.
- `PlatformVariant.contentPackageSnapshotId` and
  `PublicationRun.contentPackageSnapshotId` are nullable only for legacy reads.
- Existing package and publication endpoints remain available.
- Existing non-nested knowledge decision commands remain compatibility aliases,
  but now validate the supplied working snapshot.

## Verification record

- Targeted creation, knowledge and API suites: 3 files, 23 tests passed.
- Default repository suite: 39 files passed, 9 skipped; 177 tests passed, 41 skipped.
- External Evidence suite: 48 files passed; 217 tests passed, 1 skipped.
- Typecheck, lint, documentation links, repository policy, package boundaries,
  artifact budget, production client/server build and all four entrypoint smoke
  checks passed.
- Browser flow on `/creation`: created a package, observed `S1 / WORKING`, bound
  an exact concept revision with `adapt` and rationale, declared expected
  signals plus baseline, created a Xiaohongshu variant, observed `S1 / FROZEN`
  with decision writes disabled, and created the adjacent draft publication run.
- Production build was reopened against the same isolated runtime. The frozen
  decision and publication ledger rendered with no page errors or console errors.
- Desktop 1440px and narrow 320px full-page captures showed no horizontal
  overflow in the new snapshot header, decision columns, or publication gate.
- UI audit: existing IBM Plex typography and brand palette retained, Lucide icons
  used consistently, no new purple-family colors, generic font fallbacks, or
  emoji icons introduced.
