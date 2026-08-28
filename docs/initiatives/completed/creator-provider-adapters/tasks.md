# Implementation Plan

- [x] 1. Extend provider-aware data and API contracts
  - Add the adapter enum, backward-compatible defaults, provider-frozen run identity, and normalized provenance/profile fields.
  - _Requirements: R1, R5, R6_

- [x] 2. Implement the server-only RedFox client and executor
  - Add validated account, inventory, detail, pagination, timeout, error mapping, request-usage accounting, and unit tests.
  - _Requirements: R2, R5_

- [x] 3. Add provider routing to the durable worker pipeline
  - Route every acquire/detail job using the run's frozen provider while preserving the existing ego-browser handoff and downstream jobs.
  - _Requirements: R1, R2, R3_

- [x] 4. Implement bounded AI creator discovery
  - Add search aggregation, deduplication, explainable ranking, limits, API route, and tests.
  - _Requirements: R4, R5_

- [x] 5. Add Provider selection and candidate queue to the Creators page
  - Extend client API, form payload, provider rail, discovery states, and enqueue action using the existing visual system.
  - _Requirements: R1, R4, R6_

- [x] 6. Configure secrets safely and validate the real integration
  - Document empty variables, store the supplied key only in ignored local config, and run bounded live account/search calls without printing credentials or signed URLs.
  - _Requirements: R2, R5_

- [x] 7. Discover and enqueue additional AI creators
  - Run bounded default-keyword discovery, review evidence/ranking, enqueue a restrained candidate set with RedFox, and let the existing pipeline download selected media.
  - _Requirements: R4, R5_

- [x] 8. Complete verification and handoff
  - Run targeted tests, typecheck, full tests, lint, build, and browser validation; record API usage and remaining external-data limitations.
  - _Requirements: R6_
