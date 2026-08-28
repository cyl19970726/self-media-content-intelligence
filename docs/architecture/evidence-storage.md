# Evidence Storage Policy

Status: **active policy for new files; historical artifacts are grandfathered
until the external migration is verified**

Tracking: [GitHub Issue #13](https://github.com/cyl19970726/self-media-content-intelligence/issues/13)

## Why this boundary exists

Signal Room must retain evidence lineage without making its source repository the
permanent storage engine for every frame, OCR run, waveform, generated Dashboard,
and research attempt. Source code and large evidence have different review,
retention, access, and recovery requirements.

## Storage classes

| Class | Canonical location | Git policy | Typical contents |
| --- | --- | --- | --- |
| Source | code repository | tracked | code, schemas, docs, scripts, manifests |
| Runtime | `.runtime/` | ignored | SQLite, queues, downloaded media, browser state |
| Fixture | `fixtures/` target | tracked and size-bounded | minimal deterministic contract cases |
| Example | `examples/` target | tracked and curated | small user-visible demonstrations |
| Evidence | external evidence store | manifest only in code repo | frames, OCR, transcripts, full dossiers, run bundles |

The current `artifacts/` tree contains all four non-source classes. It remains
readable during migration; its location does not make every file a permanent
source-code artifact.

## New-file policy during migration

- Never add `.runtime`, build output, browser session state, or Playwright capture
  output to Git.
- Do not add generated screenshots, YAML captures, or handoff files at repository
  root.
- A newly added file larger than 5 MiB fails repository policy validation.
- A newly added file under `artifacts/` larger than 1 MiB fails validation. Small
  migration-compatible evidence may continue temporarily when its consumer and
  provenance are reviewable.
- Original video, audio, credentials, signed URLs, and provider session data remain
  prohibited regardless of size.

These checks stop additional debt. They intentionally do not reject existing
tracked artifacts before a verified destination exists.

## External evidence contract

The normative entry schema and restore behavior are defined in the
[Evidence Manifest and Restore Contract](../evidence/evidence-contract.md). The
[artifact inventory](../evidence/artifact-inventory.json) records the migration
baseline, and the [storage decision](../evidence/storage-options.md) records the
remaining owner gate.

Before Phase 5 moves data, each external evidence bundle must have a manifest that
can establish:

- stable evidence ID and bundle version;
- content hash and byte size;
- producing run, tool/policy version, and creation time;
- media type and evidence role;
- source/provenance reference without expiring credentials;
- access classification;
- current storage locator and optional mirrors;
- consumer references;
- integrity verification and recovery result.

The UI and API must distinguish `available`, `not_downloaded`, `missing`,
`unauthorized`, and `integrity_failed`. Missing evidence must never be projected as
an empty or successful analysis.

## Migration and deletion gate

Historical evidence may leave the code repository only after:

1. inventory and consumer discovery are complete;
2. every moved bundle has a manifest and verified hash;
3. a clean checkout can restore a representative sample;
4. product projections handle unavailable external evidence honestly;
5. rollback copies exist;
6. the migration PR identifies every removed path.

Git history rewriting is not part of ordinary Evidence migration. It requires a
separate owner approval, backup, collaborator migration plan, and recovery test.
The current assessment is recorded in the
[Git History and LFS Strategy](../evidence/history-strategy.md).
