# Implementation Plan

- [x] 1. Establish durable run, job, lease, heartbeat, and child lifecycle contracts.
  - Persist attributable state transitions and revision identity.
  - Keep long-running state observable through the API.
  - _Requirements: R1_

- [x] 2. Make creator artifacts immutable and policy-aware.
  - Register content-addressed artifacts and dependency references.
  - Preserve mixed evaluator policy generations through synthesis.
  - _Requirements: R2_

- [x] 3. Replace iterative video repair with single-pass research.
  - Run one reconstruction and one evaluator per video.
  - Preserve quality gaps as warnings and retry only structural failures.
  - _Requirements: R3_

- [x] 4. Add bounded video concurrency and atomic batch aggregation.
  - Run one to three independent video jobs.
  - Prove out-of-order completion, idempotency, and exactly-once synthesis.
  - _Requirements: R4_

- [x] 5. Attribute navigation blockers before user handoff.
  - Canonicalize post URLs and recover internal redirects once.
  - Reserve `needs_user` for evidenced platform or login challenges.
  - _Requirements: R5_

- [x] 6. Project registered state through the API and Dashboard.
  - Expose aggregate video work and provenance.
  - Keep Dashboard readiness bound to current synthesis/gate revisions.
  - _Requirements: R6_

- [x] 7. Verify and package the architecture contract.
  - Run full tests, typecheck, build, lint, and skill validation.
  - Confirm the contract excludes observer scope.
  - _Requirements: R7_
