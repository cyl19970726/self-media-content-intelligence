# Shared workflow extraction — 2026-09-17

## Preservation baseline

Original task: 01a07407-3be8-7c10-8846-fbb50c43d033.
Source branch: codex/single-post-depth, commit c460d1cd2f6c5fb41585a5cf9ab701332ef979e8.
Before migration the source working tree was clean and the remote branch matched that commit.
All five HTML reports under docs/reports are tracked in that commit and remain unchanged.

## Deliverables and acceptance

1. Extract provider-independent core, configurable Codex adapter, and SQLite execution store into the public agent-workflow repository.
2. Consume the pinned repository at vendor/agent-workflow via npm workspace public package exports. Keep research workflows, queues, method skills, and UI in self-media.
3. Preserve persisted state, replay fingerprints, runtime directory defaults, selected models, and review/revision behavior.
4. Verify standalone install/build/tests and a non-research example; rerun self-media regression, build, repository checks, and entrypoint smoke tests. Verify a fresh recursive clone.
5. Push shared code first, then commit and push the consumer pointer. Document source-edit/update procedures and any limits of validation.

## Status

- Preservation: verified committed and pushed; no additional uncommitted source work.
- Baseline validation: passed (656 tests passed, 1 skipped; complete verify passed).
- Extraction and integration: in progress.
- Regression / fresh checkout / publication: pending.

## Verified implementation

- Shared public repository: https://github.com/cyl19970726/agent-workflow
- Shared revision: 5505b3fb1822887a9f3adcf03514a9cb8cd7f0af.
- Standalone: 30 tests passed; non-research example verified parallel execution and validated replay; GitHub CI passed on Node 22 and 24.
- Integrated self-media: complete `npm run verify` passed; 636 host tests passed, 1 skipped; 30 shared tests passed. The original 20 core tests moved to the shared repository rather than being removed from verification.
- Existing data: a read-only SQLite backup verified 458 runs, 5 creator scopes, 1,706 steps, 1,187 reusable steps, and 348 artifact payload hashes against the extracted store. The temporary copy was removed; production data was not changed.
- Original five HTML report files are byte-unchanged against c460d1cd.
- No live model generation was run. Research-quality conclusions and existing review status are not promoted by this migration.
- Remaining: fresh recursive checkout verification, final consumer push.
