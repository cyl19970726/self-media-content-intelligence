# Evidence Manifest and Restore Contract

Status: **active contract for Phase 5 migration**

The code repository owns the meaning, lineage, and integrity metadata for
Evidence. The external Evidence store owns the large bytes. A path alone is not
evidence: a consumer must be able to establish what the object is, where it came
from, whether it is currently accessible, and whether its bytes still match.

## Manifest entry

[`evidence-manifest.schema.json`](evidence-manifest.schema.json) is the executable
schema for one immutable Evidence object. A migration manifest is newline-delimited
JSON containing one schema-valid entry per moved file. Every entry carries:

- a stable evidence ID derived from the original repository path;
- classification (`research_evidence`, `fixture`, or `example`);
- SHA-256, byte count, and media type;
- a non-secret storage URI and explicit availability state;
- original path, capture time when known, and producing workflow.

Storage credentials and expiring signed URLs never enter the manifest. A storage
adapter resolves the stable URI using runtime configuration.

## Availability is product state

Evidence access is not a boolean and a missing object is not an empty result.

| State | Meaning | Product behavior |
| --- | --- | --- |
| `available` | object is locally readable or remotely retrievable | allow preview/download after integrity check |
| `pending_retrieval` | known object has not been materialized yet | show pending state; offer retrieval |
| `missing` | manifest exists but configured stores cannot locate object | show unavailable state; keep analysis lineage |
| `unauthorized` | object exists but the current runtime cannot access it | show access-required state |
| `integrity_failed` | retrieved bytes do not match SHA-256/size | quarantine bytes and show integrity failure |

API and UI projections must preserve these states. They may not silently replace
them with an empty file list, successful analysis, or generic 404.

## Restore algorithm

For a requested evidence ID, the adapter:

1. loads the manifest entry and resolves its stable URI;
2. checks a content-addressed local cache at `sha256/<first-two>/<hash>`;
3. checks the configured primary store, then declared mirrors;
4. streams bytes into a temporary file while computing byte count and SHA-256;
5. atomically promotes verified bytes into the cache;
6. returns `available`, or a precise unavailable state without mutating knowledge.

Restore is idempotent. A representative restore sample must pass before repository
copies are removed, and the full migrated set must pass manifest/path/hash
reconciliation.

## What remains in Git

- schemas, manifests, and migration reports;
- minimal deterministic Fixtures required by automated tests;
- deliberately selected, size-bounded Examples that teach product behavior.

Generated frames, OCR corpora, transcripts, waveforms, browser captures, full
research dossiers, and intermediate runs are Evidence and live outside Git.
