# Git History and LFS Strategy

Status: **evaluated; no history rewrite approved**

Moving the current `artifacts/` tree out of the tip of `main` makes a fresh
checkout smaller on disk after checkout, but ordinary clones can still download
historical blobs. Git LFS applied only to future commits does not remove those
blobs. Both LFS migration and `git filter-repo` require rewriting published commit
IDs to remove them from existing history.

## Decision

Phase 5 performs a forward, reviewable migration first:

1. verify external copies and manifests;
2. update consumers and product availability behavior;
3. remove migrated files in a normal PR;
4. measure clone transfer and checkout size;
5. treat history compaction as a separate change.

History rewrite is explicitly out of scope without owner approval. If later
approved, it requires a protected mirror/backup, a rehearsal repository, before
and after object-size evidence, signed migration instructions for every clone and
worktree, force-push coordination, and a tested recovery path. Until then, no
force-push, LFS migration, or filter-repo command is authorized.
