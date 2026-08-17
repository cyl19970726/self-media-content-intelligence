# Discrepancies — evaluation v2

No gate-failing discrepancy remains.

- The candidate's `coverageMatrix.criticalQuestions` contains 14 probe-derived `CQ-*` rows, whereas the independent audit defines 17 `Q*` questions. This is an identifier/granularity mismatch, not a semantic omission: all 17 audit questions are answered or correctly marked unknown across `KU-03` through `KU-23`.
- The independent audit has 14 core units while the candidate declares 13 units as `importance: core`. One candidate unit can cover more than one audit atom, and several decision-boundary units are represented as non-core/unknown units. Independent audit-unit scoring is therefore 14/14, not the candidate's self-declared 13/13.
- Non-speech audio remains semantically unresolved. It is not an unchecked carrier: the full-timeline sweep registers the AAC/non-speech channel as an explicit unknown and makes no positive claim from it.
- The article is actionable as a model, but it cannot supply operational definitions, causal conversion proof, keyword-selection steps, or platform-general validity because the source video does not establish them. This lowers execution value, not reconstruction completeness.

