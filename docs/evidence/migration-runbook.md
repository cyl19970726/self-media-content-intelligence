# Evidence Migration Runbook

Status: **completed on 2026-08-28; verified target: `/Users/hhh0x/self-media-evidence`**

This runbook moves historical research Evidence into an independent,
content-addressed store. The migration copied and verified every object before the
repository originals were removed from the current tree. Git history was not
rewritten, and the independent target remains the rollback source.

## Storage layout

```text
<target>/
  sha256/ab/<64-character-hash>   immutable canonical bytes
  view/artifacts/...              hard-linked compatibility view
```

The view consumes no second full copy: every view file must share the same device
and inode as its verified CAS object. Existing synchronous research readers use
the view when `SIGNAL_ROOM_EVIDENCE_ROOT` is configured. New product reads use the
Manifest and Evidence API.

## Commands

1. Inspect the exact Git-tree migration set without hashing or writing:

   `npm run evidence:plan`

2. After the owner confirms an independent target, copy and verify without
   deleting any source file:

   `npm run evidence:copy -- --target <confirmed-target> --execute`

   This atomically writes the indexed shards under `evidence/manifest/` only
   after all objects and compatibility links are created. Every shard has its
   own SHA-256 in `index.json`. Re-running the object copy is idempotent and
   verifies any pre-existing CAS object before reuse.

3. Verify a deterministic restore sample:

   `npm run evidence:verify -- --target <confirmed-target> --sample 100`

4. Verify every Manifest entry before changing Git:

   `npm run evidence:verify -- --target <confirmed-target>`

5. Run the hermetic suite without mounting Evidence:

   `npm test`

6. Run the full historical parity suite with the verified store mounted:

   `SIGNAL_ROOM_EVIDENCE_ROOT=<confirmed-target> npm run test:evidence`

## Removal gates

The removal was allowed only after all were true:

- copy reports 22,622 migrated research Evidence files and zero deletions;
- Manifest entry count, original paths, byte totals, and hashes reconcile with
  the preflight inventory;
- full CAS and compatibility-view verification passes;
- the one curated content-concept example is moved to `examples/` and tested;
- representative creator dossiers and deep-video pages load through the external
  view with the repository `artifacts/` directory absent;
- the workbench displays known available and unavailable Evidence states;
- an independent rollback copy remains intact.

The migration script never deletes source files and never rewrites Git history.
Those actions cannot be enabled by a command-line flag.
