# Creator Batch Pipeline V2 — Implementation Plan

Checkboxes represent accepted implementation evidence, not intended design. Keep unchecked work in
this active initiative.

- [x] 1. Introduce batch and member contracts plus durable repository operations
  - Validate and normalize an ordered 1–20 URL cohort atomically.
  - Persist batches/member links and derive aggregate state without duplicating creator evidence.
  - Add restart/idempotency and migration coverage.
  - _Requirements: R1, R2, R5_

- [x] 2. Add batch application and HTTP control plane
  - Create/list/read batch commands and projections.
  - Compose existing single-creator run creation and cache/reuse policy.
  - Add targeted unresolved-member retry without replaying ready members.
  - _Requirements: R1, R2, R4_

- [x] 3. Partition scheduling into five capability pools
  - Route one shared RedFox acquisition/detail pool plus Ego Browser, portfolio, video, and synthesis
    jobs explicitly.
  - Add safe default/clamped concurrency configuration and transactional capability claim filters.
  - Preserve existing video atomic aggregation and browser TaskSpace limit.
  - _Requirements: R3, R4, R6_

- [x] 4. Build the batch workbench
  - Add fixed 1–20 manual input, validation feedback, and asynchronous batch creation.
  - Show aggregate/member state, pool activity, blockers, retry actions, and dossier links.
  - Verify desktop, 390 px, empty, loading, restart, and error projections.
  - _Requirements: R1, R2, R7_

- [x] 5. Prove failure isolation and end-to-end automated behavior
  - Test delayed/reordered pools, one failed creator beside one ready creator, lease recovery, duplicate
    submission, targeted retry, and truthful partial state.
  - Run documentation, repository, authority, type, test, lint, build, and smoke gates.
  - Record exact evidence in `implementation-validation.md` before checking this item.
  - Acceptance here covers the current local SQLite/runtime profile; cross-instance lease fencing and
    provider circuit breaking remain explicit follow-up boundaries.
  - _Requirements: R2, R3, R4, R5, R8_

- [ ] 6. Run paid-live two-creator release gate
  - Use only two explicitly approved creators.
  - Inspect RedFox request count/cost, pool bounds, evidence/artifact integrity, failure presentation,
    restart behavior, and workbench projection.
  - Keep the twenty-creator gate closed if either creator is unresolved for an unexplained reason.
  - _Requirements: R6, R7, R8_

- [ ] 7. Follow-up gate: implement RedFox item-level incremental checkpoints
  - Persist accepted per-post results before the next paid detail request.
  - Resume only missing identities and prove replay/cost behavior under failure and restart.
  - This is outside the first batch/worker implementation slice but mandatory before expansion beyond two.
  - _Requirements: R4, R6_

- [ ] 8. Authorize and run the remaining cohort up to 20
  - Start only after tasks 6 and 7 are recorded as passed.
  - Accept honest `partial` completion; do not hide failed/blocked members or relabel inventory as a dossier.
  - Record batch ID, approved cohort, terminal counts, cost observations, and unresolved limitations.
  - _Requirements: R2, R5, R8_
