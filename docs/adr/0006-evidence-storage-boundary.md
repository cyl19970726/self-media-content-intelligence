# ADR 0006 — Separate source code from large research evidence

Status: Accepted direction; external store selection remains unresolved

Date: 2026-08-28

## Context

The repository currently tracks hundreds of megabytes and tens of thousands of
research artifacts. These files are valuable evidence, but source code, runtime
state, deterministic fixtures, curated examples, and full evidence bundles have
different lifecycle, review, access, and recovery needs.

Continuing to store all evidence in normal Git makes every clone and Worktree pay
the cost and obscures code changes. Removing it before manifests, consumers, and
recovery are verified would risk irreversible evidence loss.

## Options considered

1. Keep all evidence in normal Git. Simple references, but unbounded repository
   growth and poor review ergonomics.
2. Move all binary files to Git LFS immediately. Reduces Git object growth but
   still couples every checkout and retention policy to the code repository.
3. Separate large evidence into a dedicated repository or object store, retaining
   versioned manifests and small deterministic fixtures in the code repository.

## Decision

Adopt option 3 as the target. Existing `artifacts/` files are grandfathered until
the Phase 5 inventory, manifest, consumer, integrity, restoration, and rollback
gates pass. New large artifacts are blocked immediately so debt stops growing.

The code repository will retain source, schemas, documentation, manifests, small
fixtures, and curated examples. Runtime state stays ignored. Evidence consumers
must represent unavailable or failed evidence explicitly.

The choice between a dedicated Evidence repository and object storage is deferred
until inventory, access, cost, and restore requirements are known.

## Consequences and tradeoffs

- Fresh code checkouts can eventually become small and fast.
- Evidence retrieval becomes explicit and may require network or local cache.
- Manifest and integrity tooling becomes a product responsibility.
- Historical artifacts remain temporarily, so repository size does not improve in
  Phase 1.
- Git history rewriting is not authorized by this decision.

## Migration and validation

Inventory files and consumers, define the manifest contract, select a store, copy
and hash-verify bundles, test representative restore, update read paths, then
remove only verified duplicates from the current tree. Keep rollback copies.

## Revisit trigger

Revisit the storage technology after inventory or when access, privacy, cost, or
offline operation requirements invalidate the selected destination.
