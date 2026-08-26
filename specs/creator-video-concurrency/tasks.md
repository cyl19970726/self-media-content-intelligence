# Creator Video Concurrency Tasks

- [x] Add bounded video concurrency configuration (1–3, default 3).
- [x] Add lane-aware durable job claiming.
- [x] Replace the single active worker loop with one serial lane and bounded video slots.
- [x] Reload the latest run and batch before every terminal video merge.
- [x] Make ready-item execution idempotent and preserve exactly one synthesis transition.
- [x] Add aggregate video work state to the API run projection.
- [x] Show active, queued, analyzed, and failed video counts in both creator views.
- [x] Update single-pass pipeline language so warnings are not presented as iterative hard-gate repairs.
- [x] Add reordered-completion, bounded-concurrency, and serial-compatibility tests.
- [x] Run focused tests, full tests, typecheck/build, and lint.
- [ ] Restart the service only after the current child is terminal, then verify the live Dashboard.
