# Implementation Plan

- [x] 1. Add creation and publication contracts
  - Define Zod schemas, states, inputs, events, and browser executor boundary.
  - _Requirements: 1, 5, 6, 7, 8, 9_

- [x] 2. Add durable SQLite repository and service
  - Persist packages, variants, runs, jobs, leases, and events.
  - Enforce revision freezing, approval guards, idempotency, and safe terminal states.
  - _Requirements: 1, 2, 5, 6, 8, 12_

- [x] 3. Add ego-browser platform executors and worker
  - Prepare Xiaohongshu and Douyin forms without submitting.
  - Implement explicit-confirmation submission, result verification, handoff, and cancellation.
  - _Requirements: 3, 4, 7, 8, 9, 10_

- [x] 4. Add APIs and server composition
  - Expose CRUD, prepare, approve, cancel, resume, and event endpoints.
  - Start and stop the publication worker with the server.
  - _Requirements: 2, 6, 9, 12_

- [x] 5. Add Creation Workspace UI
  - Add navigation, package/variant editing, publication gate, event history, and responsive styling.
  - _Requirement: 11_

- [x] 6. Verify the complete slice
  - Add service/repository/executor tests and run static and browser checks without real submission.
  - _Requirements: 1-12_

- [x] 7. Extend the platform matrix
  - Add WeChat Channels and Bilibili single-video contracts and Ego Browser executors.
  - Add the WeChat Official Account one-image draft flow with G1/G2/G3 verification and a distinct `draft_saved` terminal state.
  - Update the Creation Workspace with platform-specific copy, media rules, and approval wording.
  - _Requirements: 13-16_
