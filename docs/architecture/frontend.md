# Frontend Architecture

Status: **implemented, test-verified, and CI-gated**

## Outcome

Signal Room Web is a feature-modular React single-page application inside the
repository's npm-workspace modular monolith. The browser presents Research,
Knowledge, Creation, Evidence, and feedback workflows without becoming a second
source of domain truth.

Observable acceptance:

- the Web composition root, routes, features, entities, and shared boundaries
  all live under `apps/web/src`;
- the retired `src/client` compatibility tree does not exist;
- current URLs and API contracts remain compatible;
- Web imports only browser-safe public transport contracts;
- layer direction and the 1000-line ceiling are blocking repository checks.

## Technology stack

- React 19 and React DOM;
- TypeScript with strict project type checking;
- Vite for development and production bundling;
- React Router 7 for browser routes;
- native `fetch` behind a typed shared HTTP gateway;
- Zod-backed public contracts for runtime boundary validation;
- Lucide React icons;
- plain CSS and IBM Plex Sans Condensed / IBM Plex Mono.

No client state framework, server-state framework, CSS framework, monorepo
orchestrator, or micro-frontend runtime is part of the architecture. Local React
state and URL state remain sufficient for current behavior. A new framework
requires demonstrated cross-feature need and an ADR.

## Implemented structure

```text
apps/web/src/
  main.tsx                    browser bootstrap and global assets
  app/
    App.tsx                   application composition
    AppShell.tsx              persistent navigation and workspace frame
  routes/
    AppRoutes.tsx             URL-to-feature composition and redirects
  features/
    single-post/              URL intake, run archive, report dossier
    creator-research/         creator portfolio, dossier, video evidence
    comparison/               multi-creator comparison
    learning-loop/            validation and lineage control plane
    knowledge/                content knowledge workspace
    evidence/                 evidence availability inspection
    creation/                 content package, decision, publishing feedback
  entities/
    knowledge/                reusable knowledge contribution view
  shared/
    api/                      typed HTTP gateway and response validation
    contracts/                browser-safe public contract gateways
    styles/                   global visual system
```

The development server proxies `/api`, `/artifacts`, and `/research` to the local
API process. Production remains one deployable local product; this frontend
boundary does not introduce a separately deployed service.

## Ownership and dependency direction

```text
main -> app -> routes -> features -> entities -> shared
                                      shared -> public contract entrypoints
```

- `app` owns process-wide composition and persistent UI chrome.
- `routes` owns URL matching, redirects, and feature composition only.
- `features` own interaction state and complete user workflows.
- `entities` own reusable domain-facing views that multiple features consume.
- `shared/api` owns HTTP mechanics and response validation, not product policy.
- `shared/contracts` re-exports only browser-safe public contract entrypoints.
- `shared/styles` owns the current cross-feature visual language.

Dependencies flow downward. A feature cannot import another feature's internals;
shared and entity layers cannot import features or routes; Web cannot import
server, persistence, adapters, or domain-service implementations. The API and
contract boundary remains the only path from browser interaction to domain truth.

## File-size invariant

Every tracked frontend TypeScript, JavaScript, and style source file must be no
more than **1000 physical lines**. This is a hard ceiling, not a design target.
Split around 300–500 lines when a file gains multiple responsibilities.

Do not satisfy the limit with compressed formatting, generated source, or an
allow-list exception. Split by route, feature, model, reusable entity, API
responsibility, or style ownership.

## Executable protection

- `npm run check:frontend-architecture` rejects the retired tree, unknown source
  layers, upward dependencies, cross-feature internal imports, and Web imports
  from non-Web application code.
- `npm run check:frontend-lines` rejects frontend source files over 1000 lines.
- `npm run check:repo` runs both checks in the normal local and CI path.
- typecheck, unit tests, lint, production build, and entrypoint smoke tests prove
  compilation and compatibility at the level claimed here.

The architecture checker owns executable dependency truth. This document owns
the rationale, responsibility boundaries, and tradeoffs.
