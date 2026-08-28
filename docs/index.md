# Signal Room Documentation

This page is the navigation spine for current product, architecture, development,
and initiative context. It deliberately does not duplicate field-level contracts
owned by schemas and code.

## Start here

- [Product vision](vision/signal-room-llm-wiki-vision.md) — the long-term outcome
  and the role of the LLM Wiki.
- [Current product](product/current-product.md) — shipped user surfaces,
  invariants, and explicit non-guarantees.
- [Repository package boundaries](architecture/package-boundaries.md) — current
  structural debt, target modular-monolith boundaries, dependency rules, and the
  incremental migration path.
- [Evidence storage policy](architecture/evidence-storage.md) — what belongs in
  source control, runtime storage, fixtures, examples, and external evidence.
- [Evidence Manifest and restore contract](evidence/evidence-contract.md) — the
  integrity, availability, and recovery rules for external Evidence.
- [Evidence migration inventory](evidence/artifact-inventory.json) — the
  machine-checked source-tree baseline and known consumers.
- [External storage options](evidence/storage-options.md) — recommended target
  and the explicit owner confirmation gate.
- [Evidence migration runbook](evidence/migration-runbook.md) — guarded copy,
  verification, compatibility-view, removal, and rollback gates.
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

`docs/adr` remains the canonical durable-decision directory. There is no parallel
`docs/decisions` tree.

## Initiatives and history

- [Initiative maturity inventory](initiative-inventory.md) is the authoritative
  classification of implementation maturity, lifecycle, and verification level.
- [Active initiatives](initiatives/active/) contain unresolved acceptance items
  and continuing research.
- [Completed initiatives](initiatives/completed/) are frozen implementation
  records, not competing product or architecture truth.

Do not interpret the presence of a design document as proof that its behavior is
implemented. Code, tests, and current validation evidence own that claim.

## Executable truth

- Runtime and validation behavior: `apps/`, `packages/`, and compatibility/read
  projections in `src/`
- Package commands: `package.json`
- Reusable agent procedures: `skills/`
- Small stable test evidence: colocated with tests or owned by `fixtures/`.
- Local runtime state: `.runtime/`, intentionally ignored by Git.
- Historical research Evidence: external CAS selected through
  `SIGNAL_ROOM_EVIDENCE_ROOT`, indexed by `evidence/manifest/`.

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

Completed initiatives promote still-valid product and architecture claims to
their canonical homes, then remain as frozen records under
`docs/initiatives/completed`. Superseded materials retain a pointer to their
replacement; deletion requires confirmed ownership and updated consumers.
