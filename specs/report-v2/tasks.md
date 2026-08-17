# Implementation Plan

- [x] 1. Define v2 evidence, context, diagnosis, and experiment schemas
  - Preserve parsing of existing v1 rows with explicit defaults.
  - _Requirements: 1, 2, 6, 7_

- [x] 2. Add public context collection and benchmark math
  - Add fixture, X timeline/search, and Xiaohongshu profile/search context paths.
  - _Requirements: 1, 2_

- [x] 3. Replace thirds-based media analysis
  - Detect FFmpeg scene changes, extract frames, retain transcript timestamps, calculate pacing features.
  - _Requirements: 3_

- [x] 4. Build deep deterministic report engine
  - Implement packaging, script, audience, causal, replication, and experiment analyses.
  - _Requirements: 4, 5, 6, 7_

- [x] 5. Rebuild report detail Dashboard
  - Make diagnosis/causal chain primary and evidence drilldowns secondary.
  - _Requirements: 8_

- [x] 6. Verify Report v2 end to end
  - Run tests, lint, build, and CLI vertical slice; generate a self-contained responsive QA page from the real component and report payload.
  - Browser automation is environment-limited when local TCP listeners are forbidden; the QA artifact remains available for manual desktop/mobile inspection.

- [x] 7. Protect legacy report integrity
  - Gate v1 rows behind an explicit re-analysis state instead of presenting v2 defaults as measured zeroes.
  - Upgrade the schema version only after a successful v2 analysis.

- [x] 8. Add the auditable data observatory
  - Derive platform-specific interaction mix, view conversion, author/topic lift, follower reach, and lifetime-average velocity.
  - Expose formula, numerator, denominator, availability, and caveat for every derived indicator.

- [x] 9. Correct causal semantics and evidence labels
  - Downgrade packaging effects without CTR evidence and scope audience conclusions to sampled comments.
  - Translate internal evidence paths into human-readable evidence chips.

- [x] 10. Re-verify desktop and mobile UI
  - Keep the decision brief above evidence details, remove page-level mobile overflow, and confirm a clean browser console.
  - _Requirements: 1-8_
