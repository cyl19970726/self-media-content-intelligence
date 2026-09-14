# Research Web

`@signal-room/web` owns the interactive research interface. Its public entry is `src/main.tsx`; application composition is in `app` and `routes`.

## Features

- `creator-research`: creator library, per-run progress, creator study, and source-bound three-lens post research. `CreatorStudy*` separates loading, navigation, overview, works, and audit responsibilities.
- `single-post`: URL intake, standalone run lifecycle, and its persisted analysis display.
- `evidence`: linked source-file inspection, outside primary navigation.
- `entities/research`: personal research records with explicit browser-local persistence and discussion export.
- `entities/source-facts`: original post identity and public metrics.

## Dependency contract

`app → routes → features → entities → shared`. Features cannot import another feature's internals. Shared API modules are separated into `creators`, `posts`, `evidence`, and HTTP response handling. Contracts are imported through the existing contracts package boundary. No Web import of server/application implementation is allowed.

Use the existing workspace packages for collection, analysis, persistence, and evidence projection. Do not create duplicate packages for screen components or move server logic into Web. Package ownership and dependency checks run in `npm run check:repo`.

Global CSS contains only tokens, reset and common primitives; shell styles belong to `app`, feature styles live with their feature, entity styles with the entity. Changes should edit the owning selector rather than append a second theme layer.

## Data boundaries

Builder conclusions remain unchanged. Content blocks are continuous and complete; the outline only moves the viewport. Legacy post materials are available as a source archive rather than an empty modern three-lens interface. Personal notes are explicitly separate from model findings and are not automatically promoted to knowledge or sent to a model.

Publishing, comparison, knowledge administration, and the former workspace dashboard have no Web routes or frontend implementation. Their backend services may still serve independent production callers.
