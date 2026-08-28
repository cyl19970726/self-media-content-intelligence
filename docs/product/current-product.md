# Signal Room Current Product

Status: **Current product truth**

Last verified: **2026-08-28**

Signal Room is a local-first content intelligence workbench. It turns observable
post and creator evidence into reviewable research, promotes only adjudicated
findings into a revisioned knowledge system, and carries selected knowledge into
content packages and guarded publication runs.

## Current user surfaces

- **Single post analysis:** creates a durable analysis run, records collection
  and media limitations, and renders an evidence-linked report.
- **Creator research:** acquires a creator inventory, computes portfolio tiers,
  selects auditable samples, reconstructs eligible videos, synthesizes a creator
  dossier, and exposes Worker state and blockers.
- **Creator comparison:** pins creator inputs and revisions before producing a
  normalized comparison; it does not silently compare mutable latest state.
- **Knowledge:** lists concepts, revisions, evidence observations, contribution
  manifests, semantic edges, gaps, content bindings, hypotheses, and practice
  validations.
- **Creation and publishing:** manages content packages and platform variants,
  requires preview/approval before submission, records durable jobs/events, and
  treats an uncertain submission as non-retryable without human review.
- **Learning Loop:** records cases, immutable artifacts, three-lens gates, blind
  evaluation traces, diagnosis, regression, and observation adjudication.

## Product invariants

1. Evidence is not knowledge until it passes the relevant gate and adjudication.
2. Knowledge used for creation is pinned to a revision or evidence reference.
3. First-party publishing results enter as practice evidence; they do not rewrite
   external research automatically.
4. Missing or stale evidence remains visible and cannot be replaced by plausible
   model output.
5. Publication requires an explicit preview and version-matched approval.
6. Durable state can be resumed without repeating a potentially external side
   effect.

## Explicit non-guarantees

- Public engagement does not prove causation, conversion, or commercial value.
- Provider search results are bounded samples, not complete platform truth.
- Legacy evidence remains usable only with its recorded provenance and limits.
- The system does not autonomously promote a reusable rule from one post, one
  creator, or one first-party publication result.

Field-level payloads and state transitions are executable truth in package
schemas and tests. Long-term intent belongs to the
[LLM Wiki vision](../vision/signal-room-llm-wiki-vision.md); repository structure
belongs to [Package Boundaries](../architecture/package-boundaries.md).
