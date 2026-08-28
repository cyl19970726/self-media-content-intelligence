# ADR 0005 — Incremental npm workspace modular monolith

Status: Accepted for incremental implementation

Date: 2026-08-28

## Context

Signal Room is one deployable local product but now has multiple executable
surfaces and bounded domains. The current single npm package allows domain policy,
HTTP projections, SQLite repositories, browser executors, and UI code to import
across intended layers. Documentation alone has not protected those boundaries.

## Options considered

1. Keep one package and add more folders. This has the lowest immediate movement
   but does not provide enforceable public package entry points.
2. Split into independently deployed microservices. This adds network, deployment,
   versioning, and operational failure modes that the local-first product does not
   need.
3. Use npm workspaces for a modular monolith with multiple Apps and a small set of
   bounded packages.

## Decision

Adopt option 3 incrementally. The target Apps are Web, API, Worker, and CLI. The
initial package set is contracts, research, knowledge, creation, runtime, adapters,
and testkit. Create a package only when it owns a meaningful boundary and public
interface; do not manufacture packages solely to match the target diagram.

Apps are Composition Roots. Domain packages own policy and ports. Adapters
implement ports. Domain packages do not create or import concrete infrastructure.

Use the existing npm toolchain. Turbo, Nx, microservices, and independent package
publishing are not part of this decision.

## Consequences and tradeoffs

- Migration can preserve one deployment while making dependency direction
  mechanically checkable.
- Some transport mapping replaces convenient shared internal imports.
- Package builds and test configuration become more explicit.
- Transitional compatibility entry points may exist temporarily and must be
  labelled and removed through the tracking Issue.
- The target package list may shrink or split when real interfaces demonstrate a
  better boundary.

## Migration and validation

Move Apps first, then contracts/runtime, then knowledge, creation, research, and
adapters by vertical slice. Each slice preserves existing API, CLI, UI, tests, and
stored-data behavior. Add blocking dependency checks only after a boundary is real.

## Revisit trigger

Revisit if independent deployment becomes a demonstrated product requirement, or
if a proposed package has no independent contract, owner, or test surface.
