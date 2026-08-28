# Repository Package Boundaries

Status: **Implemented and protected by CI**

Tracking: [GitHub Issue #13](https://github.com/cyl19970726/self-media-content-intelligence/issues/13)

## Purpose

Signal Room now contains research, knowledge, creation, publishing, browser
automation, background work, a Web UI, an API, and a CLI. This document defines
where those responsibilities are moving and which dependency directions future
work must preserve.

The four executable Apps and all seven target packages now exist. Research
services depend on explicit repository, artifact, media, reconstruction, and
synthesis ports. Concrete filesystem, SQLite, browser, provider, model, and
process implementations live in `packages/adapters`; reusable in-memory ports
live in `packages/testkit`.

## Current structural debt

The repository now uses npm workspaces for four executable Apps:

- `apps/web` owns the React entry point;
- `apps/api` owns the HTTP process and compatibility embedded-Worker mode;
- `apps/worker` owns the standalone background Worker process;
- `apps/cli` owns the command-line entry point;
- `src/server/composition-root.ts` is the transitional single assembly point;
- `src/server/routes` owns domain-specific HTTP registration;
- `packages/contracts`, `packages/knowledge`, `packages/creation`,
  `packages/runtime`, `packages/research`, `packages/adapters`, and
  `packages/testkit` are real workspaces with public entry points;
- `src/server` owns HTTP/read projections and the transitional composition root;
- `src/core` retains the legacy single-post analysis slice and compatibility
  facades, but no longer owns research or platform implementations.

Durable resources and platform implementations are selected by the Composition
Root, and Service constructors require their dependencies. Knowledge consumes an
explicit research port instead of a server class; creation consumes an explicit
media-access port; creator research delegates artifact filesystem behavior to its
artifact port. Package boundary checks reject reverse dependencies, legacy paths,
and cross-package internal imports.

## Target structure

```text
apps/
  web/         React workspace; consumes versioned API contracts
  api/         HTTP routes and the application composition root
  worker/      acquisition, analysis, comparison, and publishing workers
  cli/         local command-line entry point

packages/
  contracts/   browser-safe API DTOs, events, errors, and versioned schemas
  research/    post, creator, video, comparison, and research-learning policy
  knowledge/   concepts, evidence relationships, revisions, and invalidation
  creation/    content packages, hypotheses, variants, publishing feedback
  runtime/     job, lease, event-ledger, and orchestration primitives
  adapters/    SQLite, filesystem, Ego Browser, RedFox, media, and model adapters
  testkit/     in-memory ports, deterministic fixtures, and contract-test helpers
```

The repository uses npm workspaces. Turbo, Nx, independent deployment, and
microservices are outside the current migration scope.

## Dependency rules

```text
apps/api, apps/worker, apps/cli ──> domain packages + runtime + adapters
apps/web                        ──> contracts
adapters                        ──> ports exported by domain packages/runtime
domain packages                ──> contracts and explicit domain public APIs
```

The following dependencies are forbidden after a package is migrated:

- a domain package importing from an app;
- a domain package importing a concrete database, filesystem, browser, provider,
  model, or process implementation;
- Web code importing server-only or adapter code;
- one package importing another package's internal source path;
- adapters redefining domain rules instead of translating an external boundary;
- default service constructors silently opening durable resources.

## Package boundary cards

### contracts

- **Owns:** versioned transport schemas, browser-safe DTOs, API errors, events.
- **Refuses:** persistence, business decisions, process access, React views.
- **Invariant:** both producer and consumer validate the same public version.

### research

- **Owns:** evidence eligibility, portfolio selection, reconstruction gates,
  creator synthesis, comparison policy, and research-learning semantics.
- **Refuses:** HTTP, SQLite, browser control, platform publication, creation advice.
- **Interfaces:** repositories, artifact readers/writers, provider executors,
  reconstruction/synthesis executors, public research queries.

### knowledge

- **Owns:** concepts, observations, revisions, semantic edges, contribution
  manifests, staleness, and knowledge gaps.
- **Refuses:** collecting platform evidence, serving HTTP, selecting concrete
  storage, or publishing content.
- **Interfaces:** knowledge repository and explicit research-evidence reader.

### creation

- **Owns:** content packages, pinned knowledge bindings, hypotheses, platform
  variants, approval state, publication state, and practice validation inputs.
- **Refuses:** rewriting research evidence or promoting knowledge by itself.
- **Interfaces:** creation repository, publisher port, knowledge snapshot reader.

### runtime

- **Owns:** generic jobs, leases, heartbeats, attempts, events, cancellation, and
  recovery mechanics.
- **Refuses:** creator/video/publication business stages.

### adapters

- **Owns:** translation, authentication boundaries, retries allowed by a port,
  external error mapping, and provider-specific evidence metadata.
- **Refuses:** changing domain eligibility, promotion, or approval rules.

## Composition and resource lifecycle

Only App composition roots select concrete adapters. Tests may compose domain
services with in-memory ports. Durable resources must be created explicitly and
closed by the process that owns them. A convenience constructor may assemble an
in-memory test graph but must not silently open SQLite or start workers.

## Migration sequence

1. Establish governance and CI without moving runtime code.
2. Move executable entry points into Apps and centralize composition.
3. Extract contracts, knowledge, and creation; protect their public boundaries
   with `scripts/check-package-boundaries.mjs`. **Implemented.**
4. Extract runtime lifecycle, research services/policies, adapters, and testkit.
   **Implemented.**
5. Protect every real boundary with automated dependency rules. **Implemented.**

Every step must preserve current API, CLI, UI, and stored-data behavior or ship an
explicit compatibility migration. The target tree is complete only when the
tracking issue acceptance checks pass.
