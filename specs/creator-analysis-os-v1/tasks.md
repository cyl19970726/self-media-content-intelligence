# Creator Analysis OS V1 — Product Confirmation Plan

## Phase A — product contract

- [x] A1. Confirm single-video analysis contents and exclusions.
  - _Requirements: §3_
- [x] A2. Confirm single-creator analysis contents and exclusions.
  - _Requirements: §4_
- [x] A3. Confirm multi-creator analysis contents and exclusions.
  - _Requirements: §5_
- [x] A4. Separate Research from the future Creation Workspace.
  - _Requirements: §2, §3.3, §4.7, §5.4_
- [x] A5. Owner confirms the consolidated written product contract.
  - _Requirements: all_

## Phase B — frontend contract

- [x] B1. Define global information architecture and surface boundaries.
- [x] B2. Define textual layouts for single video, single creator, and multiple creators.
- [x] B3. Define List/Gallery identity, evidence drill-down, and responsive behavior.
- [x] B4. Define shared components and element-to-data honesty mapping.
- [x] B5. Owner confirms the textual frontend layout contract.

## Phase C — architecture discussion

- [x] C1. Design canonical domain entities and artifact lineage.
- [x] C2. Design collection worker, queue, cache, and resume semantics.
- [x] C3. Design reconstruction/evaluation orchestration and invalidation.
- [x] C4. Design API read models and frontend projections.
- [x] C5. Design local/private/public security and deployment boundaries.
- [x] C6. Owner confirms the ideal architecture.

## Phase D — visual direction and implementation

- [x] D1. Retain the accepted industrial-editorial visual direction instead of creating a parallel Dashboard.
- [x] D2. Owner confirms the existing Dashboard as the visual baseline.
- [x] D3. Freeze the intake/progress extension in the current visual specification.
- [x] D4. Implement against the confirmed architecture and visual specification.
  - [x] D4.1 Create `modules/`, `platform/`, and compatibility facade boundaries.
  - [x] D4.2 Add persistent creator research jobs and events with leases and retries.
  - [x] D4.3 Add the ego-browser acquisition executor and human-handoff states.
  - [x] D4.4 Connect API creation/resume/progress to the background worker.
  - [x] D4.5 Connect the existing Creator Dashboard intake and progress surface.
  - [x] D4.6 Add immutable inventory/corpus/portfolio artifacts, reproducible High/Base/Low selection, and the same-Dashboard List/Gallery projection.
  - [x] D4.7 Add bounded selected-post detail enrichment with identity coverage gate and ephemeral signed navigation.
  - [x] D4.7b Add locally stored cover evidence without persisting signed source URLs.
  - [x] D4.8 Fan out the 9 marked records through media verification and `video-content-reconstruction` hard gates.
    - Real integration smoke: one signed-source video was resolved to verified local media, reconstructed, independently evaluated, repaired twice, and passed 22/22 deterministic gates. The durable batch contract fans out the canonical nine; a creator run remains non-ready until all nine pass.
  - [x] D4.9 Publish creator synthesis only from validated detail/reconstruction evidence.
    - The synthesis validator requires the exact canonical 21, all nine deep gates, direct reconstruction evidence, research/creation separation, and explicit backend-metric unknowns.
  - [x] D4.10 Pin creator revisions into the multi-creator comparison worker.
  - [x] D4.11 Converge the three research levels onto versioned V1 read projections.
  - [x] D4.12 Make `/creators/:creatorId` the only creator dossier and preserve last-good content during refresh.
  - [x] D4.13 Make List and Gallery projections use the same canonical 21 IDs with deep markers inside the set.
  - [x] D4.14 Replace the mixed legacy benchmark with `/comparisons/:comparisonId` normalized research dossiers.
  - [x] D4.15 Add a unified video evidence page with article, knowledge relations, sparse/dense frames, cue/frame/shot mapping, conflicts, unknowns and gates.
  - [x] D4.16 Remove duplicate Creator Console / Run Console implementations and their parallel HTTP read APIs.
- [x] D5. Run mechanical, browser, responsive, and evidence-boundary validation.
  - 2026-08-20: typecheck/lint/test/build passed; ego-browser verified 1440px and 390px layouts with no horizontal overflow; one real signed-media smoke proved local media verification and no signed URL persistence.
- [ ] D6. Owner performs final visual acceptance on rendered screenshots.

## Phase E — contract convergence verification

- [x] E1. Typecheck and lint the unified projections and routes.
- [x] E2. Run repository tests and production build.
- [x] E3. Validate V1 read schemas and legacy-adapter parity.
- [x] E4. Verify desktop and mobile routes in the built-in browser.
- [ ] E5. Commit and push the converged implementation to the public repository.
