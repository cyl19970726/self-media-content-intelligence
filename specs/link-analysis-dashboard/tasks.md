# Implementation Plan

- [x] 1. Establish the project and contracts
  - Create package/build/test configuration.
  - Define URL, run, evidence, stage, and report schemas.
  - Add ADR-0001 and runtime storage rules.
  - _Requirements: R1, R4, R6_

- [x] 2. Implement persistence and run service
  - Initialize SQLite and migrations.
  - Implement create/list/get/retry operations.
  - Persist canonical report envelopes and stage evidence.
  - _Requirements: R1, R2, R4, R5_

- [x] 3. Implement adapters and media analysis
  - Add fixture adapter for deterministic verification.
  - Add Xiaohongshu command adapter and X read-only API adapter.
  - Add FFprobe/contact-sheet/frame/transcript stages.
  - _Requirements: R2, R3, R6_

- [x] 4. Implement report engine, API, and CLI
  - Derive normalized metrics and evidence-graded findings.
  - Expose intake/list/detail/retry endpoints.
  - Implement `analyze`, `report`, `list`, `retry`, and `serve` commands.
  - _Requirements: R4, R5_

- [x] 5. Implement the dashboard
  - Build intake and run queue.
  - Build evidence-first dossier detail route.
  - Add loading, empty, partial, blocked, and error states.
  - Add responsive behavior and accessible controls.
  - _Requirements: R2, R4, R5, R6_

- [x] 6. Verify the vertical slice
  - Add deterministic fixtures and tests.
  - Run typecheck, lint, tests, and production build.
  - Exercise intake and report navigation in a browser at desktop/mobile sizes.
  - _Requirements: R1–R6_
