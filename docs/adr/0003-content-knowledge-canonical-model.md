# ADR 0003 — Content knowledge canonical model

Status: Accepted

Date: 2026-08-28

## Context

Signal Room already stores immutable evidence, frozen research artifacts, versioned research concepts, observations, revisions, and an append-only Research Learning ledger. The LLM Wiki vision adds a user-visible, continuously maintained knowledge layer, but a Markdown-first implementation would create a second source of truth beside those contracts.

The system must preserve evidence lineage, support and contradiction, revision pinning, deterministic promotion gates, invalidation impact, and creation feedback. It must also remain practical in the current local-first SQLite architecture.

## Decision

Use structured, revisioned domain records as canonical content knowledge:

- `ResearchConcept`, `ResearchObservation`, and `ResearchConceptRevision` remain core primitives;
- an idempotent contribution manifest records how every eligible analysis revision affected knowledge, including an explicit no-new-knowledge result;
- concept-to-concept semantic edges are typed relational records pinned to revisions;
- support, qualification, and contradiction relationships are derived from observations rather than duplicated as edges;
- creation bindings pin exact canonical revisions;
- Markdown pages, generated prose, indexes, and visual graphs are read projections or exports only.

Persist knowledge decisions through the existing append-only ledger pattern and update relational read state atomically. Build rebuildable SQLite projections and FTS5/BM25 search. Do not introduce a vector database or graph database in V1.

This decision applies to the Content Knowledge context only; it does not require full event sourcing across the application.

## Consequences

- Evidence lineage and historical revisions remain auditable.
- A UI page or LLM-generated synthesis cannot silently overwrite canonical knowledge.
- Projections can be rebuilt and changed without migrating the truth model.
- Relational traversal is sufficient for V1 but complex open-ended graph queries may require a later projection technology.
- Search quality initially favors explicit vocabulary and filters over semantic similarity.
- Schema and migration work is greater than a Markdown-only prototype, but there is one authoritative model instead of two.

## Alternatives considered

### Markdown files as truth

Rejected because free-form edits cannot reliably enforce typed scope, evidence gates, pinned revisions, or transactional invalidation.

### Graph database as truth

Deferred because V1 relationships are bounded and SQLite can represent them without adding another operational system.

### Vector store as truth

Rejected because similarity does not establish support, contradiction, maturity, provenance, or revision authority.
