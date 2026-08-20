# Creator Analysis OS V1 — Product and Frontend Design

## Scope of this document

This document records the product structure confirmed before technical architecture. It deliberately does not choose the ideal worker orchestration, database topology, artifact storage system, job queue, or deployment model.

## Product model

```text
Research object       Primary output                         Evidence depth
────────────────────────────────────────────────────────────────────────────
Single video          complete content understanding          cue/frame/shot
Single creator        portfolio system and account behavior   corpus + deep set
Multiple creators     normalized ecosystem comparison         project → creator → video
```

The three levels are nested, not three disconnected reporting products.

## Frontend model

```text
Research Home
  ├─ run status and freshness
  ├─ single videos
  ├─ single creators
  └─ comparison projects

Analysis Shell
  ├─ context and section navigation
  ├─ ordered main reading flow
  └─ contextual evidence drawer
```

Each level has its own primary question while sharing provenance, data health, evidence links, unknown handling, and URL-addressable state.

The current industrial-editorial visual language remains the default direction. The product work should extend that accepted system rather than create another weaker Dashboard style; any new surface still requires Owner acceptance after it is rendered.

Detailed layout and wireframes: [frontend-layout.md](frontend-layout.md).

## Page boundary

- Single-video pages restore and evidence one video's content.
- Single-creator pages synthesize the entire visible portfolio and embed access to the selected video's evidence.
- Multi-creator pages normalize across creators and classify conclusions by scope.
- Creation is a different page family and is not represented by action cards inside research.

## Current implementation discrepancies

The existing implementation predates the confirmed contract and must be treated as provisional where it:

- promises “直接告诉你下一条做什么” in the Research Home hero;
- contains launch, replication, or next-post surfaces in creator research;
- models median and arithmetic-mean-near as separate top-level tiers instead of one Base tier with internal anchors;
- lacks the multi-creator project and normalized comparison model.

These discrepancies are named requirements, not permission to hide them with placeholder UI.

## Proposed architecture

The product objects and page contract are frozen. The next-stage architecture proposal is now documented and still awaits final Owner confirmation:

- [architecture.md](architecture.md) — modular-monolith control plane, isolated workers, a relational ledger, and content-addressed evidence storage;
- [data-model.md](data-model.md) — Entity / Snapshot / Artifact / Revision / Run as distinct layers;
- [pipeline-and-gates.md](pipeline-and-gates.md) — durable DAGs, login handoff, invalidation, and research readiness;
- [api-contract.md](api-contract.md) — stable read models for single video, single creator, multiple creators, and the shared evidence drawer.

These documents do not authorize a backend rewrite until the Owner confirms the architecture.
