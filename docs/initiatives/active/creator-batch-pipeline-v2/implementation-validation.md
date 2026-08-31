# Creator Batch Pipeline V2 — Implementation and Validation

Status date: 2026-08-31

## Evidence vocabulary

- **Implemented** means executable repository behavior exists; a design document is not evidence.
- **Test-verified** means automated checks exercised the declared behavior and exact commands/results
  are recorded below.
- **Live-unverified** means the paid RedFox end-to-end release gate has not passed. Tests and historical
  single-creator runs cannot change this label.

## Current evidence matrix

| Capability | Implemented | Test-verified | Live status | Evidence / boundary |
| --- | --- | --- | --- | --- |
| Existing single-creator durable runs | Yes (pre-existing) | Yes (pre-existing suites) | Historical only | Governed by completed Creator Research Architecture records |
| Existing video pool (1–3) and atomic aggregation | Yes (pre-existing) | Yes (pre-existing suites) | Historical only | Governed by completed Creator Video Concurrency records |
| Batch persistence and ordered 1–20 members | Yes | Yes | Live-unverified | Domain and SQLite reopen/order/idempotency tests included in the 27-test targeted gate |
| Batch API and targeted member retry | Yes for the declared boundary | Yes | Live-unverified | Create/list/read use batch APIs; unresolved recovery intentionally reuses the referenced run-level operation rather than adding a second retry state machine |
| Five capability-partitioned worker pools (RedFox 4, Ego 1, Portfolio 1, Video 3, Synthesis 2) | Yes | Yes | Live-unverified | Pool-fill/clamp, routing, mutual exclusion, global video bound and 20-creator RedFox queue tests pass |
| Batch workbench | Yes | Yes | Live-unverified | Isolated-runtime desktop/mobile browser acceptance passed; fixture made no RedFox request |
| Cross-member failure isolation/restart recovery | Partial | Test-verified for local SQLite/runtime | Live-unverified | Scheduler head-of-line isolation, stale-work exclusion, mutual exclusion and SQLite reopen pass; cross-instance lease fencing remains unverified |
| Provider circuit breaker | No; follow-up | No | Live-unverified | Pool isolation exists, but provider health/circuit-breaker behavior is not claimed |
| RedFox item-level incremental checkpoint | No; follow-up after first slice | No | Required before expansion beyond 2 | Existing job-level commit boundary remains |

## Automated gate record

The targeted and full gates below ran against the shared working tree on 2026-08-31.

| Gate | Result | Evidence |
| --- | --- | --- |
| Documentation links | Pass | `npm run check:docs` — local Markdown links resolve |
| Repository/knowledge authority checks | Pass | Included in `npm run verify`; `npm run check:repo` rerun exit 0 |
| Artifact checks | Pass | Included in `npm run verify` |
| Typecheck | Pass | Included in `npm run verify`; clean `npm run typecheck` rerun exit 0 |
| Targeted batch/pool tests | Pass | `npx vitest run` over batch service, SQLite batch repository, batch API, worker, queue claim and frontend intake: 6 files / 27 tests |
| Frontend model tests | Pass | 5 files / 16 tests |
| Full test suite | Pass | `npm run verify`: 54 files / 235 tests |
| Lint | Pass | Clean `npm run lint` rerun exit 0 with no warnings |
| Build and entrypoint smoke | Pass | Included in `npm run verify` |
| Desktop/mobile browser acceptance | Pass (fixture) | Isolated runtime with `SELF_MEDIA_EMBED_WORKERS=false`; desktop/mobile DOM and overflow checks passed; console 0 warnings/errors |

## Isolated browser acceptance

The real in-app browser opened `/creators` against an isolated runtime with embedded workers disabled.
Two fixture creators completed the user-visible flow:

- nickname + URL input and local preview;
- query-parameter removal and normalized submission;
- one durable batch creation;
- two queued RedFox members visible in the workbench;
- desktop and mobile DOM assertions;
- mobile key containers measured about 413/450 px with no horizontal overflow;
- browser console reported 0 warnings and 0 errors.

No RedFox request ran and no provider fee was incurred. This proves the UI/API/control-plane path, not
paid acquisition, complete creator analysis, or the two-creator paid-live release gate.

## Paid-live release gates

### Gate A — two approved creators

State: **Live-unverified; do not start without explicit approved inputs.**

Required record:

- approved profile URLs/identities and batch ID;
- start/end time and terminal member states;
- observed pool concurrency and any backoff/rate behavior;
- RedFox paid request/cost observation available to the operator;
- evidence/artifact and dossier integrity;
- failure, retry, and restart observations;
- desktop/mobile workbench evidence;
- go/no-go decision for expansion.

### Gate B — remaining cohort up to 20

State: **Closed until Gate A and the RedFox incremental-checkpoint gate pass.**

Completion may be `ready` or honestly `partial`. Record ready, blocked, failed, and needs-user counts,
plus every unresolved limitation. Queuing twenty members is not proof that twenty complete analyses
exist.

## Known deferred boundary

RedFox detail enrichment does not yet persist an accepted checkpoint after every post. If a detail job
fails after partial paid work, retry may replay items inside that job. This initiative must not claim
item-level resume or no-duplicate-cost behavior until the follow-up checkpoint task is implemented,
test-verified, and separately live-inspected.

Cross-instance lease fencing and provider-level circuit breaking also remain outside the verified local
runtime closure. Pool isolation and transactional SQLite claims must not be presented as live proof of
those distributed failure modes.
