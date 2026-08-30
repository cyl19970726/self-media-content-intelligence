# ADR 0007 — Feature-modular Web frontend

Status: Accepted and implemented

Date: 2026-08-30

## Context

The Web entry point had moved to `apps/web`, but routes, screens, HTTP calls,
view models, tests, and CSS still lived in the transitional `src/client` tree.
`App.tsx` owned application chrome, routing, and the single-post workflow while
all business screens imported one page-level API module. Package checks protected
browser-safe contracts but did not protect frontend-internal dependency direction.

This made the workspace package migration structurally incomplete and made new
features likely to deepen a page-oriented compatibility layer.

## Options considered

1. Keep `src/client` and add naming conventions. This preserves churn but leaves
   two apparent Web owners and relies on review to prevent dependency drift.
2. Adopt a feature-modular frontend inside `apps/web/src`, with explicit `app`,
   `routes`, `features`, `entities`, and `shared` layers.
3. Introduce a framework-level solution such as Next.js, micro-frontends, Redux,
   React Query, Tailwind, Nx, or a separately deployed Web application.

## Decision

Adopt option 2. `apps/web/src` is the only frontend source owner. Dependency
direction is `app/routes -> features -> entities -> shared`; a feature cannot
import another feature's internal files. The browser consumes versioned public
contracts and HTTP endpoints and cannot import server, domain-service,
persistence, or adapter implementations.

Keep React, React Router, Vite, native fetch, Zod contracts, and plain CSS.
Additional client state, server state, styling, monorepo, or deployment frameworks
require a demonstrated need rather than being introduced by the reorganization.

Enforce a 1000-physical-line hard ceiling for every frontend source file. The
ceiling is a last-resort guard; normal ownership splits should happen earlier.

## Consequences and tradeoffs

- Frontend ownership and import direction are mechanically discoverable.
- Feature workflows remain colocated while cross-feature views have an explicit
  entity owner.
- Shared contract gateways add a small indirection but remove legacy `src/shared`
  imports from browser code.
- The shared HTTP gateway and global CSS remain deliberate consolidation points;
  split them further only when concrete feature ownership becomes clearer.
- This decision does not change routes, API payloads, persisted data, deployment,
  or the backend modular-monolith boundaries.

## Migration and validation

Move bootstrap, shell, routes, every feature screen, pure view models, tests,
contract gateways, HTTP access, and styles under `apps/web/src`. Update report
preview tooling and machine consumers, then delete `src/client` without a
compatibility re-export.

Validate with architecture negative fixtures, the line-limit check, typecheck,
unit and contract tests, lint, production build, and entrypoint smoke tests.

## Revisit trigger

Revisit when measured cross-feature state coordination cannot be expressed with
URL and local React state, when a separately deployed Web surface becomes a real
product requirement, or when global CSS/HTTP ownership repeatedly causes feature
coupling that the current checks cannot prevent.
