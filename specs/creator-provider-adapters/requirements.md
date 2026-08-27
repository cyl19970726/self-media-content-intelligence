# Creator Provider Adapters — Requirements

## Problem and scope

Creator Analysis OS currently binds every live Xiaohongshu run to `ego-browser`. The system shall support an explicit per-run choice between the user's authenticated account session and RedFox's public-data API, while preserving one downstream research pipeline, one artifact model, and field-level provenance. It shall also discover additional AI creators without automatically starting expensive deep research.

## User stories

1. As a researcher, I can choose the acquisition provider before creating a creator run.
2. As an operator, I can add or rotate the RedFox credential without exposing it to the browser, artifacts, logs, or Git.
3. As a researcher, I can discover AI creator candidates from bounded keyword searches, inspect why they ranked, and explicitly enqueue selected candidates.
4. As an auditor, I can identify which provider produced each run and inventory snapshot.
5. As an existing user, my old runs and the default account-session flow continue to work.

## Acceptance criteria

### R1 — Provider selection

- When a user creates a creator run, the system shall accept `ego-browser` or `redfox` as the provider.
- When the provider is omitted, the system shall default to `ego-browser` for backward compatibility.
- When an existing active or fresh cached run has the same profile URL but a different provider, the system shall not silently reuse it.
- While a run is executing, every acquisition and detail job shall use the provider frozen in that run's collection policy.

### R2 — RedFox adapter

- When RedFox is selected, the server shall call only documented HTTPS endpoints with the API key in the `REDFOX_API_KEY` request header.
- When RedFox returns account, inventory, or note data, the adapter shall map missing fields to `null`, never to zero.
- When pagination reaches an explicit end, the adapter shall report `explicit_end`; when the configured page budget is exhausted first, it shall report `budget_reached`.
- When RedFox authentication, rate limit, upstream availability, response-shape, or timeout errors occur, the adapter shall return a bounded provider failure without falling back silently to the authenticated account.
- When a RedFox run produces an inventory artifact, the artifact shall record provider provenance but shall not persist the API key or expiring signed URLs.

### R3 — Existing account provider

- When `ego-browser` is selected, the system shall preserve the existing isolated TaskSpace, authenticated `hhh-01` session, challenge handoff, resumability, and read-only policy.
- When a platform challenge or login boundary is encountered, the system shall stop and request user handoff rather than switching provider automatically.

### R4 — AI creator discovery

- When the user requests AI creator discovery, the system shall execute a bounded set of RedFox keyword searches and deduplicate candidates by Xiaohongshu user ID.
- The discovery result shall expose matched keywords, observed note count, aggregate public engagement, representative notes, source provider, capture time, and an explainable rank score.
- Discovery shall not create research runs automatically.
- When the user explicitly adds a candidate, the system shall create a normal RedFox creator run from the canonical Xiaohongshu profile URL.

### R5 — Security and cost boundaries

- The API key shall exist only in ignored local environment configuration or process environment and shall never be returned by an API response.
- The discovery endpoint shall enforce keyword, page, and candidate limits.
- The RedFox client shall expose request usage metadata so cost can be audited without logging credentials or full signed media URLs.

### R6 — Compatibility and verification

- Existing persisted schema versions and `ego-browser` runs shall continue to parse.
- Type checking, targeted unit tests, the full test suite, lint, and production build shall pass.
- The Creators page shall be browser-tested for provider selection, discovery loading/error states, candidate enqueueing, and the unchanged default account flow.

## Non-goals

- RedFox does not become the canonical truth for private, commercial, impression, retention, conversion, or revenue claims.
- The first version does not automatically merge two providers into one run.
- Discovery does not automatically download or deeply reconstruct every candidate's media.
- The implementation does not bypass Xiaohongshu login, captcha, safety restrictions, or other platform controls.
