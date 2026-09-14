# Research workspace rebuild

## Objective and acceptance

Rebuild around understanding a creator, studying an individual post, and seeing per-creator analysis progress. Remove publishing and speculative management surfaces from the frontend. Preserve source-bound Builder findings and evidence, including honest missing-field states.

Acceptance: real creator and post navigation works, progress and failures are actionable, all three Builder lenses remain accessible, research notes persist with sources and export honestly, desktop/mobile layouts are usable. No invented AI conversation or generated conclusions in projection/UI.

## Ownership and architecture

- `app`: application shell and navigation only.
- `routes`: composition and URL compatibility redirects; no business decisions.
- `features/creator-research`: creator library, study modes, progress and structured post research.
- `features/single-post`: URL intake and standalone analysis lifecycle.
- `entities/research`: source-bound personal notes; local browser persistence explicitly disclosed.
- `entities/source-facts`: source identity and metrics; separate from content reconstruction.
- `shared/api` and `shared/contracts`: validated server boundary; no backend/package imports in Web.
- Existing packages retain ingestion, jobs, canonical report schemas and evidence projection. UI-only changes do not create new cross-package dependencies. Publishing backend remains independently owned; removing its Web surface must not break other production callers.

## Stages

1. Replace creator/post/list flows with real data (complete).
2. Remove superseded pages, imports and CSS; verify dependency boundaries (complete).
3. Build/type/lint/regression checks and real-browser user journey (complete).

## Compatibility

The latest structured Builder format is the primary post interface. Older source artifacts remain intact. URL redirects are navigation compatibility, not parallel legacy report implementations. No automatic destructive migration or rerun.


## Delivered and verified

- Three primary entries: creators, posts, per-run progress. Creator study has overview, works and evidence modes. Current structured posts have content/directing/visual lenses with continuous content and nearby evidence.
- Removed obsolete creation/publishing, comparison, learning-loop, knowledge administration and workspace-overview frontend implementations, unused batch/discovery components and API functions. Removed the condensed-font dependency. Existing production backend packages remain intact.
- Replaced the 988-line global stylesheet with shared primitives; moved standalone analysis styling to its owning feature and consolidated post styles. API client split into creator/post/evidence modules and shared response validation.
- Fixed exact run URL propagation in progress, restored explicit external-service recovery, isolated view state between creator/run changes, and restricted older post formats to original-source archive rather than blank modern panels.
- Personal notebook storage is per subject/run in this browser; source positions travel with exported discussion material. No automatic model execution or server sync is implied.

Validation: 82 test files passed; 420 tests passed, one conditional skip with evidence root supplied. Typecheck, lint, build, repository/package boundaries, documentation links and compiled Web/API/Worker/CLI smoke passed. Smoke test was updated for the new document title.

Independent user Agent exercised creator search, creator/work navigation, legacy source reading, research note save/reload/delete and progress filters. Lead additionally exercised all current Builder lenses against the existing run ending 908 (five content blocks preserved, no broken images), checked creator and post desktop/mobile layouts, and corrected mobile navigation overflow. Screenshots reside in ignored `.runtime/workspace-rebuild-20260914/`.

The live production-data view remains on port 5177. Port 5179 was a separate verification view of the existing local Builder sample; it does not imply that old production reports were regenerated. New frontend does not migrate, overwrite or validate old model outputs.

Final URL review also repaired legacy creator-run redirects dropping search/hash and valid-run URLs retaining old creator slugs. Both were verified in the real browser with mode/tier/run context preserved.
