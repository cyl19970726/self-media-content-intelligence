# Creator Video Concurrency Requirements

## Problem

Creator research currently leases one job at a time. Twelve independent video analyses therefore run serially even though each video owns a separate artifact directory. The batch manifest is also updated by read-modify-write, so simply starting more workers would risk lost results, duplicate synthesis jobs, and misleading run status.

## Scope

- Run up to three `video.reconstruct` jobs concurrently for one creator run.
- Keep acquisition, detail enrichment, portfolio analysis, creator synthesis, creator evaluation, and Dashboard projection serial.
- Preserve the current single-pass video policy: one reconstruction and one evaluator per video; quality gaps remain warnings.
- Merge video outcomes atomically into one monotonic, versioned reconstruction batch.

## Non-goals

- Do not parallelize steps inside one video.
- Do not increase the number of evaluators per video.
- Do not rerun already analyzed videos.
- Do not weaken evidence capture or remove policy provenance.
- Do not introduce a distributed queue or external database.

## User stories

1. As a user, I want three representative videos to be analyzed at the same time so a creator study completes materially faster.
2. As a researcher, I want every concurrent result preserved exactly once so speed never corrupts the 12-video evidence set.
3. As an operator, I want concurrency configurable between one and three so the machine can be throttled without changing code.
4. As a reviewer, I want the Dashboard and event stream to show how many videos are active, queued, complete, and failed.

## Acceptance criteria

### R1 — Bounded concurrency

- While a creator run has queued `video.reconstruct` jobs, the worker pool shall lease at most the configured number concurrently.
- When no concurrency value is configured, the system shall use three video workers.
- When the configured value is outside 1–3, the system shall reject or clamp it to the supported range.
- While non-video jobs are running, the system shall continue to execute those stages serially.

### R2 — Independent execution

- When two video jobs run concurrently, each job shall write candidate and evaluation artifacts only under its own `video-reconstructions/<postExternalId>/` directory.
- When a video is already `ready`, the scheduler shall not lease or recreate its reconstruction job.
- When a video job is retried after lease expiry, idempotency shall prevent duplicate terminal application.

### R3 — Atomic batch aggregation

- When any video job completes, the system shall merge its outcome against the latest batch revision, not the revision observed at job start.
- When concurrent completions race, the system shall preserve both outcomes and create monotonic batch revisions without lost updates.
- When an outcome for the same job was already applied, the aggregator shall return the existing result without creating another revision.
- Every batch revision shall retain artifact dependencies and evaluator policy provenance for all items.

### R4 — Exactly-once downstream transition

- When the final outstanding video outcome is committed, the system shall enqueue exactly one Creator synthesis job.
- When other video jobs remain queued or running, no completion path shall enqueue synthesis.
- When one or more videos end in an infrastructure failure, the run shall expose the failed items and shall not falsely report 12/12.

### R5 — Observable state

- While videos run concurrently, the API event stream shall retain per-child started, progress/stale, completed/failed, input revision, and output revision events.
- The run projection shall report aggregate active, queued, analyzed, and failed video counts instead of implying one active video represents the whole batch.
- The Dashboard shall display the aggregate concurrency state without requiring PTY, process, or file-time inspection.

### R6 — Recovery and safety

- When the service restarts, expired leases shall be reclaimable without rerunning terminal videos.
- When the worker pool is reduced to one, behavior shall remain compatible with the current serial flow.
- Tests shall prove no lost batch item, no duplicate synthesis job, no ready-item rerun, and bounded maximum concurrency under deliberately reordered completions.

## Success measure

For a 12-video creator run with similar video durations, three-worker mode should reduce the wall-clock video stage toward one third of serial execution, subject to local CPU, network, OCR, and model capacity, while producing the same 12 per-video artifact sets and one synthesis transition.
