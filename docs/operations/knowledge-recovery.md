# Knowledge Database and Projection Recovery

Status: **Current operational runbook**

The canonical local database is `.runtime/content-knowledge.sqlite`. It contains
the append-only Research Learning and Knowledge decision ledgers plus disposable
read projections. External Evidence remains independent and is never copied into
this database.

## Before migration or recovery

1. Stop the Signal Room API and workers so no write transaction is active.
2. Copy `.runtime/content-knowledge.sqlite` and its `-wal` / `-shm` companions to
   a timestamped directory outside `.runtime`.
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
through `POST /api/v1/knowledge/legacy-manifests` as `legacy_unverified`. It must
not be converted into synthetic Evidence or observations.

## Projection parity and rebuild

1. Read `GET /api/v1/knowledge/projection-parity` and retain the returned counts.
2. Trigger `POST /api/v1/knowledge/projections/rebuild` while the API is otherwise
   idle. The operation deletes only disposable Knowledge projection rows and
   replays `knowledge_decision_events` in sequence.
3. Compare the returned counts, Knowledge API output and search results with the
   pre-rebuild snapshot. A mismatch is a failed recovery; do not continue writes.
4. Restart the API and repeat the parity read to prove reopen behavior.

Concept projections and FTS5 text are regenerated from the replayed Research
ledger. An environment without SQLite FTS5 fails database initialization clearly;
it does not silently claim that full-text search succeeded.

## Rollback

Stop the API, preserve the failed database for diagnosis, then restore the backed
up database and its matching WAL/SHM files as one set. Do not combine a database
with WAL files from another snapshot. Restart with the legacy Research database
still present, verify the compatibility read routes, and only then resume writes.

## Acceptance commands

- Default verification: `npm run verify`
- External Evidence parity: `SIGNAL_ROOM_EVIDENCE_ROOT=/absolute/store npm run test:evidence`

The default suite must pass with no personal Evidence path configured. The
external suite additionally proves current Manifest bytes and SHA-256 integrity.
