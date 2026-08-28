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

The analytical operating model that every projection must preserve is defined in [research-methodology.md](research-methodology.md). In particular, single-video pages must expose content restoration, directing logic, and visual/editing logic separately; creator pages must synthesize full-corpus context with High/Base/Low variance.

## Page boundary

- Single-video pages restore and evidence one video's content.
- Single-creator pages synthesize the entire visible portfolio and embed access to the selected video's evidence.
- Multi-creator pages normalize across creators and classify conclusions by scope.
- Creation is a different page family and is not represented by action cards inside research.

## Implementation convergence

The active research UI now follows the confirmed boundaries:

- single creator is projected only at `/creators/:creatorId`;
- median-near and mean-near are anchors inside Base rather than separate tiers;
- the same 21 records power List and Gallery and carry the nine deep markers;
- single-video evidence remains inside creator context;
- multi-creator research is a pinned comparison project with normalized baselines and classified conclusions;
- research pages contain no copying, next-post, script, CTA, or experiment recommendations.

Historical static artifacts remain readable only through server-side compatibility adapters. They do not define routes, schemas, or a second Dashboard.

Compatibility adapters are migration layers, not lossy summaries. They must preserve every populated source field needed by the current product contract and pass depth-parity fixtures against the historical artifacts. A schema-valid projection containing placeholders where source evidence exists is a failed migration.

## Confirmed architecture

The product objects, page contract, and implementation architecture are confirmed together:

- [architecture.md](architecture.md) — modular-monolith control plane, isolated workers, a relational ledger, and content-addressed evidence storage;
- [data-model.md](data-model.md) — Entity / Snapshot / Artifact / Revision / Run as distinct layers;
- [pipeline-and-gates.md](pipeline-and-gates.md) — durable DAGs, login handoff, invalidation, and research readiness;
- [api-contract.md](api-contract.md) — stable read models for single video, single creator, multiple creators, and the shared evidence drawer.

Implementation must remain consistent with these documents. A conflicting implementation does not redefine the product or architecture contract.
