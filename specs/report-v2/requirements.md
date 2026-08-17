# Report v2 Requirements

## Problem

The v1 report proves the pipeline runs but produces isolated metrics, generic observations, mechanical thirds-based shots, and conclusions without a comparative or causal frame. It cannot support editorial decisions.

## User stories

- As an operator, I want to know whether a post is exceptional relative to an author/topic baseline, not merely see totals.
- As a creator, I want each conclusion linked to exact copy, timestamp, frame, comment, or metric evidence.
- As a strategist, I want competing explanations and unknowns separated from supported mechanisms.
- As an editor, I want a reusable brief and measurable experiment, not generic advice.

## Acceptance criteria

1. When a report is generated, the system shall expose evidence coverage, missing sources, provenance tier, and confidence before causal conclusions.
2. When benchmark samples exist, the system shall compare the subject against author and topic distributions using medians and percentiles; when absent it shall state that no performance anomaly can be established.
3. When media is available, the system shall detect scene changes from the video signal, extract representative frames, attempt timestamped transcription, and compute auditable pacing features.
4. When text is available, the system shall segment the script by rhetorical function and report promise, audience, tension, specificity, claims, proof, and information density.
5. When comments are available, the system shall cluster questions, approval, objections, implementation intent, and follow-up demand with sample sizes and representative evidence.
6. When explaining performance, the system shall output a causal model containing supported mechanisms, counter-evidence, alternative explanations, confidence, and evidence references.
7. When recommending action, the system shall distinguish invariants, variables, account dependencies, risks, cross-platform adaptations, and testable experiments.
8. The dashboard shall present diagnosis and causal structure before dense evidence, and shall remain usable at 320, 768, 1024, and 1440 pixel widths.
9. The dashboard shall expose interaction composition, view-normalized conversion, author/topic lift, lifetime-average velocity, calculation formulas, and missing denominators without manufacturing zero values.
10. When a v1 report is opened, the system shall identify it as legacy and offer re-analysis instead of rendering v2 empty defaults as observed zeroes.

## Non-goals

- Claiming true retention, click-through rate, traffic source, paid distribution, or follow conversion without owner analytics.
- Generating arbitrary composite scores without a documented basis.
- Treating a missing metric as zero or summing partial fields without an explicit partial-data warning.
- Treating a single post as proof of causation.
