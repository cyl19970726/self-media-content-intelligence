# Knowledge Database and Projection Recovery

Status: **Current operational runbook**

The canonical local database is `.runtime/content-knowledge.sqlite`. It contains
the append-only Research Learning and Knowledge decision ledgers plus disposable
read projections. External Evidence remains independent and is never copied into
this database.

## Before migration or recovery

1. Stop the Signal Room API and workers so no write transaction is active. The
   maintenance commands deliberately refuse a runtime containing any Knowledge
   database `-wal` or `-shm` companion; do not delete those files by hand. Close
   the owning process cleanly.
2. Create a verified backup in a directory outside the repository and runtime:

   ```sh
   npm run selfmedia -- knowledge-backup \
     --runtime-dir /absolute/path/to/runtime \
     --output /absolute/path/to/backups
   ```

   The command creates a timestamped directory with `manifest.json`. Each
   included database has an exact byte count and SHA-256. It includes
   `content-knowledge.sqlite`, `self-media.sqlite`, and the compatibility
   `research-learning.sqlite` when present.
3. If `.runtime/research-learning.sqlite` exists, back it up as well. It is the
   compatibility source for the one-time additive import.
4. Record the external `SIGNAL_ROOM_EVIDENCE_ROOT` value separately; do not move
   or rewrite the Evidence CAS as part of Knowledge recovery.

## Compatibility migration

On first startup, when the canonical Research ledger is empty, Signal Room copies
the existing `research_learning_events` into `content-knowledge.sqlite` in one
transaction. Event payloads, IDs, revision numbers, included/excluded observations
and dependent conclusions are preserved. The legacy database is left untouched
through the compatibility window.

Historical prose without resolvable analysis and Evidence lineage must be recorded
as `legacy_unverified`. It must not be converted into synthetic Evidence or
observations.

### Historical single-post backfill

The planner reads canonical `report_json` rows from `self-media.sqlite`; it does
not scan Markdown, HTML, or Notion. Dry-run is the default and opens the run
database read-only without creating `content-knowledge.sqlite`:

```sh
npm run selfmedia -- knowledge-backfill \
  --runtime-dir /absolute/path/to/runtime
```

The plan classifies every inspected run as:

- `verified_compile`: final report, frozen source, and every eligible evidence
  reference resolves under the report evidence grammar; the canonical
  `runs/<id>/report.json` artifact must parse and exactly match the database
  revision;
- `legacy_unverified`: final report exists, but its source/evidence lineage is
  not fully resolvable;
- `skip`: queued, running, blocked, or failed run.

`existingStateChecked: false` means the dry-run intentionally did not open the
canonical Knowledge database; `alreadyRecorded` is then informationally zero.
After an offline backup, execute the same deterministic plan with:

```sh
npm run selfmedia -- knowledge-backfill \
  --runtime-dir /absolute/path/to/runtime \
  --apply
```

Verified items reuse `SinglePostKnowledgeCompiler`; existing evidence gates are
not relaxed. A resolvable report without media reconstruction can therefore be
`quarantined`, which is safer than silently treating it as accepted knowledge.
An unchanged rerun returns the same manifest IDs and adds no decision events or
observations.

## Projection parity and rebuild

1. Read `GET /api/v1/knowledge/projection-parity` and retain the returned counts.
2. With the API stopped, run the guarded recovery command. It creates a verified
   backup before deleting any disposable projection:

   ```sh
   npm run selfmedia -- knowledge-rebuild \
     --runtime-dir /absolute/path/to/runtime \
     --backup-root /absolute/path/to/backups \
     --apply
   ```

   The rebuild replays `knowledge_decision_events` in sequence.
3. Compare the returned counts, Knowledge API output and search results with the
   pre-rebuild snapshot. A mismatch is a failed recovery; do not continue writes.
4. The command closes and reopens the database and requires identical parity plus
   a successful FTS lookup before reporting success. Restart the API and repeat
   the parity read before resuming writes.

Concept projections and FTS5 text are regenerated from the replayed Research
ledger. An environment without SQLite FTS5 fails database initialization clearly;
it does not silently claim that full-text search succeeded.

## Rollback

Stop the API and preserve the failed database for diagnosis. Restore only from a
backup whose manifest verifies:

```sh
npm run selfmedia -- knowledge-restore \
  /absolute/path/to/backups/knowledge-<timestamp> \
  --runtime-dir /absolute/path/to/runtime \
  --confirm "RESTORE KNOWLEDGE"
```

The restore verifies every source hash before moving any target. Existing target
databases move to a sibling `runtime.pre-restore-<timestamp>` directory and remain
recoverable. If copying fails, the command puts displaced files back. Restart
with the legacy Research database still present, verify compatibility reads and
projection parity, and only then resume writes.

## Compatibility-window exit

Do not remove `research-learning.sqlite` or compatibility query routes until all
of the following are true for at least one release window:

1. the verified backfill plan has no unexpected `legacy_unverified` items;
2. backfill has been rerun idempotently with no new events;
3. backup, rebuild, close/reopen, and restore drills pass from an isolated copy;
4. old and new reads have no unexplained divergence;
5. external Evidence references still resolve without moving the CAS;
6. the owner explicitly approves compatibility removal in a separate change.

## Acceptance commands

- Default verification: `npm run verify`
- External Evidence parity: `SIGNAL_ROOM_EVIDENCE_ROOT=/absolute/store npm run test:evidence`

The default suite must pass with no personal Evidence path configured. The
external suite additionally proves current Manifest bytes and SHA-256 integrity.
