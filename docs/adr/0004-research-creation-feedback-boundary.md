# ADR 0004 — Research, creation, and feedback boundary

Status: Accepted

Date: 2026-08-28

## Context

Signal Room must use accumulated knowledge to make better content and learn from real publication outcomes. Combining these activities in one object would create circular reasoning: a creation generated from a rule could be treated as proof of that rule, while likes or saves could be mistaken for unavailable impressions, completion, or causal impact.

Research evidence, editorial decisions, platform execution, and observed results have different provenance and authority. Historical creation decisions must also remain explainable after knowledge changes.

## Decision

Keep four explicit boundaries:

1. Research produces evidence-bound concepts, observations, and revisions.
2. Creation records typed bindings that pin exact knowledge or analysis revisions and declares a hypothesis before evaluation.
3. Publication freezes the executed package/variant revision and verified receipt where available.
4. Practice validation records observed signals, metric source, baseline, deviations, and confounders in a staging state.

A first-party result cannot directly modify a concept. Independent learning adjudication may translate an eligible practice observation into a canonical observation labelled `first_party_practice`.

Promotion evaluators partition evidence by origin. First-party practice may support, qualify, or contradict knowledge, but it cannot count as another distinct external video or creator for cross-creator thresholds.

Old creation bindings remain pinned and readable. When knowledge changes, working decisions become `stale_available` or `invalidated`; published history is never rewritten.

## Consequences

- The system can explain what was believed when a content decision was made.
- Positive results do not automatically create self-confirming rules.
- Missing private metrics remain explicit rather than inferred from public proxies.
- Feedback takes an extra adjudication step, but the resulting learning is substantially more trustworthy.
- Practice outcomes can challenge external research without contaminating its sample denominators.

## Alternatives considered

### Direct publication-to-concept updates

Rejected because post hoc interpretation and execution variance would be written as knowledge without an independent gate.

### Store only free-text source references in content packages

Rejected as the target model because strings cannot guarantee revision identity, staleness propagation, or typed usage intent. They remain supported for compatibility.

### Count first-party posts as ordinary research samples

Rejected because it conflates experimental evidence with independently observed creator evidence and can inflate promotion thresholds.
