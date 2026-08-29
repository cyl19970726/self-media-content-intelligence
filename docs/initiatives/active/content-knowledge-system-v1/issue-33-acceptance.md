# Issue #33 — Verified Backfill and Operational Recovery Acceptance

Status: **Accepted locally**

Issue: <https://github.com/cyl19970726/self-media-content-intelligence/issues/33>

## Outcome

Issue #33 closes the historical migration and local recovery boundary without
turning legacy prose into canonical knowledge:

```text
self-media.sqlite report revision
  + matching runs/<id>/report.json
  + resolvable evidence refs
  → existing SinglePostKnowledgeCompiler
  → canonical manifest / observation gates

unsupported final report → legacy_unverified + zero contributions
non-final run → skip
```

The operational path is similarly explicit:

```text
offline boundary
  → SHA-256 backup manifest
  → deterministic backfill or projection replay
  → FTS + parity + close/reopen verification
  → resume writes | verified restore with displaced original retained
```

No command in this change was executed against the user's real runtime.

## Requirements and acceptance mapping

| Requirement | Implemented behavior | Verification |
|---|---|---|
| R2 | Historical reports enter typed manifests only through the existing report/compiler contract. | Backfill classification and compiler integration tests |
| R9 | Revision, artifact, evidence refs, policy, fingerprint, and operation keys remain pinned and idempotent. | Dry-run, rerun, zero-contribution legacy, and parity tests |
| R12 | Existing RunStore, Research Learning ledger, Knowledge repository, FTS projection, and compatibility database remain the only sources. | Migration, backup/restore, rebuild, and reopen tests |

## Backfill decisions

1. The planner reads `report_json` from `self-media.sqlite`; Markdown, HTML,
   Notion, and generated summaries are never migration inputs.
2. Dry-run opens the run database read-only and does not create or open the
   canonical Knowledge database. `existingStateChecked` makes this explicit.
3. CLI planning and apply verify that `runs/<id>/report.json` is a regular file,
   parses as the same report revision, and exactly matches the database value.
4. Eligible refs use the established report grammar: direct paths, source-text
   sentence indices, comments by ID, and benchmark metrics by key.
5. A fully resolvable report reuses `SinglePostKnowledgeCompiler`. Existing lens
   gates are preserved, so an old report without media may correctly remain
   quarantined.
6. A final report with missing source, artifact mismatch, or unresolved eligible
   refs becomes one idempotent `legacy_unverified` manifest with no contributions.
7. Queued, running, blocked, and failed reports are skipped rather than made to
   look reviewed.
8. Apply requires a clean offline boundary. An unchanged rerun returns the same
   manifest IDs and does not add observations or decision events.

## Recovery decisions

1. Backup includes canonical Knowledge, historical run input, and compatibility
   Research databases when present; external Evidence CAS is never copied.
2. Root, home, repository-contained, and runtime-contained backup targets are
   rejected.
3. Any matching WAL/SHM companion blocks backup, apply, rebuild, and restore;
   operators must stop the owning process cleanly rather than delete companions.
4. `manifest.json` records every included file's name, bytes, and SHA-256.
5. Restore verifies all source bytes before moving any current database.
6. Current files move to a sibling `runtime.pre-restore-<timestamp>` directory;
   a copy failure restores them automatically.
7. Projection recovery requires identical before/rebuilt/reopened counts and a
   successful FTS lookup before success.
8. Compatibility removal requires a separate owner-approved change after a full
   release window with no unexplained read divergence.

## CLI contract

- `knowledge-backfill` — read-only plan by default; `--apply` writes.
- `knowledge-backup --output <outside-path>` — offline hash-verified snapshot.
- `knowledge-rebuild --backup-root <outside-path> --apply` — backup first, then
  replay and reopen verification.
- `knowledge-restore <backup> --confirm "RESTORE KNOWLEDGE"` — verified,
  recoverable replacement.

All commands accept `--runtime-dir`, allowing drills against an isolated copy.

## Verification record

- Targeted backfill, recovery, and compatibility-migration tests cover read-only
  planning, artifact match/mismatch, verified compilation, `legacy_unverified`,
  non-final skip, unchanged rerun, unsafe backup targets, online WAL refusal,
  manifest tamper detection, recoverable displacement, rebuild, FTS, and reopen.
- Default repository suite: 41 files passed, 9 skipped; 187 tests passed, 41
  skipped.
- Documentation links, repository policy, package boundaries, artifact budget,
  typecheck, lint, production client/server build, and all entrypoint smoke checks
  passed.
- Browser validation was not required because Task 12 changes no route, rendering,
  or interactive UI surface.
