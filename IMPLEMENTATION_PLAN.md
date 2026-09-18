# Issue #1 — shared workflow read model

Implemented and verified: shared contracts/service, scoped snapshots and bounded incremental cursors; exact artifact relationships and call bindings; safe host API and durable explicit retry links; report-first progress and stage-led execution history; integration docs and runnable examples.

Acceptance: new post `698c4a65000000000b0092d1`, root `f232ad73-2106-480a-8372-0ff7b0fbf810`, completed source/build/review/repair. Four reader stages complete, audit-only registration retained separately. Revision is honestly marked unreviewed. All 13 prior batch records unchanged. Actual built-in browser verified live candidate, version switching and execution records. See [acceptance evidence](docs/development/workflow-read-model-acceptance-2026-09-19.md).

Validation: consumer `npm run verify` passed (665 tests, 1 skipped; shared 62 tests), shared independent verify passed. No global worker or skill installation. Shared `9c37ec4` pushed before updating consumer submodule pointer. Consumer implementation, documentation and acceptance evidence are ready for the release commit on `codex/single-post-depth`.
