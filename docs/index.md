# Signal Room Documentation

This page is the navigation spine for current product, architecture, development,
and initiative context. It deliberately does not duplicate field-level contracts
owned by schemas and code.

## Start here

- [Product vision](vision/signal-room-llm-wiki-vision.md) — the long-term outcome
  and the role of the LLM Wiki.
- [Repository package boundaries](architecture/package-boundaries.md) — current
  structural debt, target modular-monolith boundaries, dependency rules, and the
  incremental migration path.
- [Evidence storage policy](architecture/evidence-storage.md) — what belongs in
  source control, runtime storage, fixtures, examples, and external evidence.
- [Development workflow](development/workflow.md) — branch, Worktree, validation,
  PR, merge, and initiative lifecycle.
- [Repository overhaul tracking issue](https://github.com/cyl19970726/self-media-content-intelligence/issues/13)
  — the authoritative execution checklist for the migration.

## Durable decisions

Architecture Decision Records own long-lived choices and their consequences.
They do not own unstable task status.

- [ADR-0001: Canonical report envelope](adr/0001-canonical-report-envelope.md)
- [ADR-0002: Creator research control plane](adr/0002-creator-research-control-plane.md)
- [ADR-0003: Content knowledge canonical model](adr/0003-content-knowledge-canonical-model.md)
- [ADR-0004: Research, creation, and feedback boundary](adr/0004-research-creation-feedback-boundary.md)
- [ADR-0005: Incremental workspace modular monolith](adr/0005-workspace-modular-monolith.md)
- [ADR-0006: Separate source code from large evidence](adr/0006-evidence-storage-boundary.md)

The ADR directory remains at `docs/adr` during the incremental migration. Moving
it to `docs/decisions` is a Phase 4 documentation change, not a second source of
truth.

## Current implementation initiatives

The existing `specs` directory contains a mixture of completed implementation
records, current contracts, and unfinished plans. Until Phase 4 classifies and
migrates them, use each initiative README or task list to determine its status:

- [Content knowledge system V1](../specs/content-knowledge-system-v1/requirements.md)
- [Creation and publishing V1](../specs/creation-publishing-v1/requirements.md)
- [Creator Analysis OS V1](../specs/creator-analysis-os-v1/README.md)
- [Creator provider adapters](../specs/creator-provider-adapters/requirements.md)
- [Creator research architecture](../specs/creator-research-architecture/requirements.md)
- [Creator video concurrency](../specs/creator-video-concurrency/requirements.md)

Do not interpret the presence of a design or task document as proof that its
behavior is implemented. Code, tests, and current validation evidence own that
claim.

## Executable truth

- Runtime and validation behavior: `src/`
- Package commands: `package.json`
- Reusable agent procedures: `skills/`
- Small stable test evidence: currently colocated with tests and existing
  artifact fixtures; this will converge on `fixtures/` during the migration.
- Local runtime state: `.runtime/`, intentionally ignored by Git.
- Historical research evidence: `artifacts/`, grandfathered until the external
  evidence migration is complete.

## Documentation lifecycle

Durable knowledge is routed by owner:

| Surface | Owns | Refuses |
| --- | --- | --- |
| Vision | long-term outcome and product principles | implementation status |
| Product docs | current user behavior, boundaries, and acceptance | exact runtime fields |
| Architecture docs | current and explicitly labelled target system structure | task tracking |
| ADR | durable decisions, alternatives, consequences, revisit triggers | routine instructions |
| Initiative/spec | scoped requirements, plan, and acceptance evidence | permanent architecture truth |
| Schema/code | fields, invariants, executable behavior | future-state promises |
| Skill | reusable procedure and judgment | complete product architecture |
| Evidence/case | what happened in a bounded run | universal rules without promotion |

Completed initiatives must promote still-valid product and architecture claims
to their canonical homes, then move their implementation record to completed or
superseded history. Phase 4 will perform this migration without deleting material
whose ownership or consumers are still uncertain.
