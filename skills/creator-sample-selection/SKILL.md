---
name: creator-sample-selection
description: Select reproducible high, median, arithmetic-mean-near, and low creator samples for comparison and deep reconstruction. Use after corpus metrics and portfolio annotations exist; do not use for subjective cherry-picking or for claiming selected posts represent the full account.
---

# Creator Sample Selection

Build one versioned selection set that powers both List and Gallery and identifies a bounded deep set.

## Inputs

- normalized corpus with public metric coverage;
- deterministic corpus statistics and percentiles;
- portfolio annotations;
- media availability and existing reconstruction status;
- declared comparison and deep-set budgets.

## Selection model

- Keep high, median, arithmetic-mean-near, and low anchors separate.
- Default comparison set: five to seven posts per group when available.
- Default deep set: three posts per group, deduplicating overlap.
- If no post lies within 25% of the arithmetic mean, emit `mean_gap` and select the nearest lower and upper neighbors.
- Cover distinct topics, formats, eras, durations, proof modes, and hypothesized mechanisms rather than ranking alone.
- Record the denominator and threshold rule used for each group.

For every selected post record stable ID, tier, anchors, rank, selection reason, represented variation, alternatives considered, evidence scope, media readiness, confounds, and reconstruction state.

## Boundaries

- The selection set organizes inquiry; it does not prove a mechanism.
- Median represents typical observed performance; mean-near shows the head-pulled arithmetic baseline. Do not collapse them.
- A small corpus or missing metric coverage requires a smaller disclosed set, not fabricated tiers.
- The same record IDs and revision must feed List, Gallery, deep coverage, and downstream comparison.

Return `SELECTION_READY` only when selection is deterministic from the recorded inputs and every row is auditable.
