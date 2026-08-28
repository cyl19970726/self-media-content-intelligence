# Creator Analysis OS V1

The completed runtime architecture initiative is archived in
[`creator-research-architecture/design.md`](../../completed/creator-research-architecture/design.md).
Current repository topology is owned by
[`docs/architecture/package-boundaries.md`](../../../architecture/package-boundaries.md).
Observer/session-forensics concerns are intentionally outside that contract.

Status: **product, frontend, and architecture confirmed**
Last updated: 2026-08-21

This specification records the confirmed research product, frontend contract, and technical architecture.

## Documents

- [requirements.md](requirements.md) — product scope, three analysis levels, non-goals, acceptance criteria.
- [product-contract.md](product-contract.md) — confirmed decisions, journeys, surface boundaries, and honest-data rules.
- [research-methodology.md](research-methodology.md) — governing analytical philosophy and High/Base/Low reasoning.
- [three-lens-video-contract.md](three-lens-video-contract.md) — field, evidence, independent coverage/gate, and page-order contract for every deep video.
- [creator-depth-parity.md](creator-depth-parity.md) — source-to-canonical-to-UI non-loss contract for the three reference creators.
- [research-learning-model.md](research-learning-model.md) — versioned concept, observation, revision, promotion, contradiction, and invalidation model.
- [learning-loop-contract.md](learning-loop-contract.md) — runtime state machine, role boundaries, artifact allowlists, independent evaluation, regression, and terminal no-promotion semantics for that model.
- [skill-system.md](skill-system.md) — canonical user-facing and internal Skill graph, ownership boundaries, orchestration flow, and completion contract.
- [runtime-skill-pipeline.md](runtime-skill-pipeline.md) — the executable 13-stage Skill → Worker → Artifact → Evaluator → Dashboard contract and fail-closed readiness rule.
- [frontend-layout.md](frontend-layout.md) — information architecture, text wireframes, responsive behavior, and UI states.
- [design.md](design.md) — current frontend product design and the transition into architecture.
- [architecture.md](architecture.md) — bounded contexts, storage, runtime and deployment profiles.
- [data-model.md](data-model.md) — canonical entities, snapshots, artifacts, revisions and runs.
- [pipeline-and-gates.md](pipeline-and-gates.md) — durable workflows, browser handoff, invalidation and quality gates.
- [api-contract.md](api-contract.md) — commands, queries, page projections, events and errors.
- [tasks.md](tasks.md) — confirmation and implementation sequence.

## Governing separation

```text
Research area: understand and verify what exists.
Creation area: later choose references and produce our own posts.
```

The research area must not contain copying advice, next-post recommendations, rewritten titles, scripts, or publishing experiments.
