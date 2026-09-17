# Issue 71: creator synthesis quality audit

## Scope and conclusion

This is a read-only audit of creator Builder run `93d8459e-9066-4afd-9a7e-a771d84d8bb6`, candidate `a127506d-d75f-4059-8604-063b05d061ad`. The candidate's generic cross-post research was not caused by compressed upstream inputs or a missing skill load. The Builder read the 12 full `builderLenses`, but the current deterministic contract permits a minimal, repetitive synthesis to pass.

The candidate should not be treated as Host-quality accepted evidence for a v3 pilot decision.

## Evidence

- Runtime receipt: `/Users/hhh0x/self-media/.runtime/runs/ae713242-656f-48bf-8f2b-42aa16201e3d/workflow-synthesis/93d8459e-9066-4afd-9a7e-a771d84d8bb6/5bdbbeb6-793a-4665-9d56-8c487132d754/synthesis-runtime.json`
  - model `gpt-5.6-terra`, reasoning effort `medium`, execution mode `sdk`
  - child run `e2677eba-7d6d-47e8-8e31-975fdf37368e`
  - loaded `creator-synthesis/SKILL.md` SHA-256 `e1f4bcf5a9c8a280a9b9fb52cf9ae130cd2943932928fd1afc695cdb65f1581e`
  - loaded `references/method.md` SHA-256 `a179a0cb0dabc48cbd1daf6a32e2a9c5b20c1238537f2265dcbd45c587f4cfad`
- SDK trace: `/Users/hhh0x/self-media/.runtime/executor-traces/creator-synthesis/ae713242-656f-48bf-8f2b-42aa16201e3d/e2677eba-7d6d-47e8-8e31-975fdf37368e/events.jsonl`
  - the Builder enumerated all 12 batch reconstruction refs and printed each complete `contentRestoration`, `directingLogic`, and `visualEditing` object
  - it then extracted a second per-post comparison table containing `viewerAfter`, question, promise, payoff, information design, composition, shot count, and cuts per minute
  - concrete terms were present in the trace: `Wyze` 12 occurrences, `订阅` 35, `咖啡` 37, `隐私` 11, and `营收` 27
  - the Builder created, ran, and deleted a temporary `build-candidate.mjs`, showing that much of the large output was assembled programmatically
- SDK result receipt: `/Users/hhh0x/self-media/.runtime/executor-traces/creator-synthesis/ae713242-656f-48bf-8f2b-42aa16201e3d/e2677eba-7d6d-47e8-8e31-975fdf37368e/result.json`
  - cumulative usage: 1,058,466 input tokens, of which 978,944 were cached; 10,707 output tokens; 1,185 reasoning output tokens
- Produced artifact: `/Users/hhh0x/self-media/.runtime/executor-traces/creator-synthesis/ae713242-656f-48bf-8f2b-42aa16201e3d/e2677eba-7d6d-47e8-8e31-975fdf37368e/outputs/creator-analysis.json`
  - 228,444 bytes total
  - `portfolioClassification`: 122,681 compact JSON bytes
  - `postAnalyses`: 14,363 compact JSON bytes
  - `crossPostResearch`: 14,282 compact JSON bytes
  - exactly five findings were produced: one in each required section
  - one support observation was reused verbatim across eight posts, two other observations were each reused across four posts
  - every cited deep reconstruction stopped at `#/builderLenses` rather than a concrete lens field
  - within `crossPostResearch`, `Wyze`, `订阅`, `渠道`, `咖啡`, `营收`, `隐私`, and `手部` each occurred zero times

## Root cause

The project method requires concrete concepts, conditions, methods, counterexamples, and an observation that states what each cited post actually contributes. It also asks for citations to prefer a specific field. The method therefore does not prescribe the minimal result that was produced.

The mechanical contract has a narrower definition of completeness. The schema requires at least one finding per section and one support item per finding. `assertValidCrossPostResearch` verifies the five section IDs, Chinese text, citation ownership, and that every built deep post appears somewhere. It does not diagnose observations copied across different posts or references that stop at the whole `builderLenses` object. A generic sentence repeated under each post therefore satisfies deep-sample coverage.

Two prompt and workload properties likely amplified this loophole: the same turn had to construct 196 classification rows, and the final instruction asked all human-readable JSON values to be concise. The more specific concision instruction applied only to compatibility `postAnalyses`, but the global wording could also compress the research section. These are contributing conditions, not evidence that the input was compressed.

## Smallest staged improvement

Add review diagnostics before changing the production gate:

1. Report an observation reused across different `postExternalId` values, including every exact JSON path.
2. Report an evidence ref ending at `#/builderLenses` or `#/builderLenses/`, including its exact ref path.
3. Let the Reviewer judge the diagnostic. Identical wording can describe a real common property, and a broad reference can still contain relevant evidence, so neither signal alone proves that the synthesis is generic.

The standalone helper in `packages/research/src/creator-synthesis/cross-post-specificity.ts` implements these diagnostics without changing the frozen schema, validator, executor, skill, or any active workflow. A later version can use observed Reviewer outcomes to decide whether either signal should become a warning gate and whether classification should be materialized separately from the research pass.

Applied read-only to the audited candidate, the helper returns 36 review signals: 30 broad `builderLenses` references and six groups of observations repeated across different posts. This count is descriptive and is not a quality score.
