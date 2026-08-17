# Report v2 Design

## Architecture

`Platform adapter -> source/context evidence -> media feature extraction -> deterministic analysis model -> versioned report envelope -> API/CLI/Dashboard`

The canonical report remains SQLite-backed JSON. Report v2 adds additive fields and keeps a migration path for v1 rows.

## Evidence model

- **Public source**: post copy, public metrics, public comments, author profile.
- **Comparative context**: author recent posts and topic peers.
- **Owner analytics**: retention, traffic, conversion; absent until explicitly imported.
- Every diagnosis includes evidence references, confidence, and competing explanations.

## Modules

- `context.ts`: normalize comparable public posts and compute distributions.
- `media.ts`: FFmpeg scene-change timestamps, representative frames, transcript-derived pace, contact sheet.
- `report.ts`: packaging, script, audience, benchmark, causal model, replication, experiments.
- `report.ts`: also derives an auditable data observatory: raw interaction mix, per-view conversion, author/topic lift, and lifetime-average velocity.
- `schema.ts`: v2 report contract with v1-compatible defaults.
- `ReportV2.tsx`: diagnosis map, benchmark, script/media evidence, audience voice, action lab.

## UI doctrine

The main object is the decision chain, not a metric card grid: anomaly → interaction structure → comparative lift → causal hypotheses → experiment. The first viewport distinguishes confirmed observation, hypothesis, unknown, and next test. Every derived number exposes its numerator, denominator, formula, and missing-data state. Dense timestamp/comment details follow below.

Legacy v1 rows never flow through empty v2 presentation components. They render a migration state with their preserved raw source and an explicit re-analysis action.

## Testing

- Unit tests for percentiles, script segmentation, comment clustering, and missing-data behavior.
- Vertical-slice fixture with author/topic comparables and real FFmpeg scene changes.
- Desktop/mobile browser verification with no horizontal overflow and all evidence images loaded.
