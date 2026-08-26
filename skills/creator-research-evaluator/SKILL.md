---
name: creator-research-evaluator
description: Independently evaluate a creator research run, its acquisition honesty, corpus reproducibility, selection coverage, video CR/DL/VE gates, synthesis evidence, and Dashboard parity. Use as a fail-closed reviewer; do not evaluate work with the same reasoning context that produced it.
---

# Creator Research Evaluator

Run independently from collection, reconstruction and synthesis. Inspect the artifacts and evidence, not the producer's confidence statement.

## Gate families

1. **Identity and acquisition:** identity anchors, observed/displayed counts, global deduplication, stop reason, resume state, missingness, privacy scan.
2. **Corpus and annotation:** post-ID parity, metric reproducibility, annotation evidence scope, unknown discipline, no surface-to-deep promotion.
3. **Selection:** deterministic thresholds, high/median/mean-near/low coverage, reasons, confounds, stable revision, List/Gallery parity.
4. **Single video:** independent CR 6/6, DL 6/6 and VE 7/7. A generic content gate cannot stand in for directing or visual/editing review.
5. **Creator synthesis:** critical-question recall, evidence coverage, unsupported-inference rate, cross-tier comparability, dates/comments/commercial scope, contradictions and unknowns.
6. **Projection:** canonical record IDs, revisions, evidence links, covers, health states and no placeholder prose presented as research.

## Output

Produce `creator-evaluation.json` and `creator-gate-report.json` with evaluator identity/version, input artifact IDs and hashes, per-rule pass/fail, evidence references, failed reasons, repair instructions, and overall readiness.

Run qualitative JUDGE scoring only after every hard gate passes. A partial or failed run remains visible as partial, but cannot contribute validated mechanism claims or cross-creator concept promotion.

Return `READY_FOR_CREATOR_ANALYSIS` only when hard gates and projection parity pass. Otherwise return `NOT_READY` with exact failed gate IDs. Never repair the candidate while acting as its independent evaluator.
