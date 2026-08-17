# ADR-0001: The report envelope and SQLite own analysis truth

## Context

The same analysis must be consumed by a CLI, local API, Web dashboard, agents,
and optional Notion sync. Letting each surface regenerate prose or metrics would
create contradictory reports and make retries impossible to audit.

## Decision

Use a versioned JSON report envelope as the public contract and SQLite as its
local persistence owner. Raw provider payloads and media artifacts are evidence
referenced by the envelope. Dashboard and Notion remain read/sync surfaces.

## Options considered

- Notion as the primary database: rejected because it is not a reliable job or
  artifact store and would couple runtime state to a presentation surface.
- Dashboard-specific API responses: rejected because the CLI and agents would
  receive a different truth.
- Markdown-only reports: rejected because comparison, retries, and metrics need
  typed fields.

## Consequences

- Every schema change requires an explicit report schema version.
- UI code may format but may not recompute editorial conclusions.
- Notion synchronization can fail without losing the analysis run.
- Local data remains private by default and can later migrate to hosted storage.

## Revisit trigger

Revisit when multi-user hosting, remote workers, or concurrent writers require
a server-owned database rather than local SQLite.

