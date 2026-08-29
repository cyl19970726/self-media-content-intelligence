# Issue #38 — Content Knowledge System V1 Production Acceptance

Status: **local implementation and release verification complete; PR/CI pending**

Issue: <https://github.com/cyl19970726/self-media-content-intelligence/issues/38>

## Release claim

Issue #38 closes the final V1 implementation gap: accepted creator and comparison research now enters the same governed Knowledge system as single-post analysis.

```text
ready creator synthesis + independent gate
  → creator-local candidates with per-post evidence identity
  → deterministic creator-specific promotion
  → pinned content-validated comparison
  → conditional / track-wide candidates + exceptions + gaps
  → deterministic promotion
  → pinned Creation binding and hypothesis
  → frozen local-only publication receipt
  → independently adjudicated first-party Practice observation
```

## Production boundaries

- Research services own narrow completion ports and never import Knowledge.
- The server composition root owns the only production adapters connecting Research to Knowledge.
- A creator completion is emitted only after the ready synthesis, independent gate, run state, and artifacts are persisted.
- A comparison completion is emitted only after the ready comparison and pinned inputs are persisted.
- Legacy and portfolio-only comparisons remain readable but cannot manufacture content mechanisms.
- The compiler proposes candidates; deterministic Research Learning thresholds are the only scope-expansion authority.
- Promotion decisions, including exact gate failure reasons, are stored in contribution manifests and rendered in research and concept views.
- Exact normalized role matching is deliberately bounded; V1 does not perform semantic guessing, causal inference, or automatic concept merging.

## Deterministic evidence contract

Creator and comparison observations can override the manifest-level creator/video/deep fields with their immutable underlying post identity. This allows one creator or comparison manifest to preserve distinct video votes without pretending the manifest itself is a video analysis.

Promotion continues to use the authoritative thresholds in Research Learning:

- creator-specific: three distinct videos, deep evidence, and two tiers or an explicit tier condition;
- conditional: two complete creator evidence sets, six videos, deep evidence per creator, and a non-empty condition;
- track-wide: three comparable creator evidence sets, nine videos, deep evidence per creator, tier diversity or explicit tier condition, and no more than 20% contradictions.

Failed promotion leaves the concept candidate and stores the exact missing threshold. A repeated immutable completion reuses its original manifest and adds no observation or revision.

## Isolated closed-loop fixture

`npm run knowledge-v1:fixture` creates a new operating-system temporary directory whose basename must begin with `content-knowledge-v1-`. It uses production KnowledgeCompiler, Knowledge, Creation, and Practice services with frozen synthetic evidence explicitly labelled as fixture-only.

The fixture proves:

- three creator manifests and one comparison manifest;
- one track-wide pattern backed by three creators and nine distinct videos;
- unchanged creator and comparison retries are idempotent;
- Creation pins the promoted concept revision;
- Practice appends an independently adjudicated first-party observation;
- no external publisher is called;
- the repository `.runtime` inventory is byte/mtime stable before and after the test;
- no external Evidence Store is opened or written.

## Browser evidence

The final isolated runtime was exercised in the in-app browser on the comparison dossier, governed concept detail, and Creation / Publication History surfaces.

- The comparison route retains all three pinned members, renders the content-validated track-wide pattern in the conclusion ledger, and exposes the accepted manifest plus explicit `promoted → track_wide` decision.
- Concept detail shows the format condition, causal exclusion, nine comparison evidence rows across three creators, the deterministic promotion revision, contribution lineage, one pinned downstream binding, and the appended `practice_validation` observation.
- Creation shows the frozen concept revision, `test` binding rationale, predeclared hypothesis, local-only receipt, planned/observed/decision case file, distinct submitter/adjudicator, and first-party observation ID.
- True 390 CSS-pixel audits on all three routes reported `scrollWidth === clientWidth`, one `h1`, `zh-CN`, no duplicate IDs, and no missing image alt attributes.
- Browser console warning/error logs were empty.

Browser verification found and repaired two fixture/projection defects before acceptance: the fixture database initially used a non-canonical filename and therefore appeared empty through the production composition root; the comparison dossier initially projected only legacy portfolio observations and omitted new content patterns/exceptions/gaps. Both now have focused regression coverage.

## Automated evidence

Focused coverage includes:

- ready-only and not-ready creator completion behavior;
- pinned synthesis/gate comparison completion after persistence;
- portfolio-only versus content-validated comparison analysis;
- creator-specific, conditional, and track-wide evidence gates;
- insufficient-evidence decisions and unchanged retry behavior;
- isolated creator → comparison → Knowledge → Creation → Practice flow;
- Knowledge write-authority enforcement.

`npm run verify` passed locally on 2026-08-30 after the final projection regression: documentation, repository policy, package boundaries, Knowledge authority, artifact budget, typecheck, ESLint, Web/server builds, and compiled Web/API/Worker/CLI smoke checks all passed. Vitest reported 46 test files and 197 tests passed; 8 evidence/environment-gated files and 41 tests were intentionally skipped.

PR and hosted CI evidence will be recorded here before Issue #38 closes.

## Non-claims

The fixture does not prove a real-world content mechanism, publish to a platform, or write to the external Evidence Store. Production comparison claims still require real versioned creator runs whose synthesis and independent evaluation gates are ready.
