# Link Analysis Dashboard — Requirements

## Problem

Creators need one repeatable way to turn a public Xiaohongshu or X/Twitter URL
into a traceable content-analysis dossier. Today collection, public metrics,
transcription, frame extraction, interpretation, and retrospective reporting
live in separate tools or broken historical skills.

## Scope

- Accept Xiaohongshu and X/Twitter URLs through a local CLI and Web form.
- Persist analysis runs and stage-level evidence locally.
- Use existing platform skills as adapters instead of copying their logic.
- Analyze text, metrics, comments/replies, and video evidence when available.
- Render a report detail page and expose the same report as JSON.
- Make missing credentials, inaccessible media, and inference limits visible.

## Non-goals for the first release

- Publishing, liking, commenting, following, or other write actions.
- Claiming causal proof of virality from one post.
- Multi-user authentication or hosted deployment.
- Scraping around platform risk controls.
- Making Notion the runtime source of truth.

## User stories

1. As a creator, I can paste a supported link and see an analysis run start.
2. As an analyst, I can see exactly which facts came from the platform and
   which conclusions were inferred.
3. As an editor, I can inspect transcript sections, timecodes, representative
   frames, hook structure, and reusable patterns.
4. As an operator, I can retry a failed stage without losing earlier evidence.
5. As an agent, I can read the complete report as stable JSON from the CLI/API.

## Acceptance criteria

### R1 — Intake and routing

- When a user submits a supported Xiaohongshu or X URL, the system shall create
  a run with a stable ID and detected platform.
- When a URL is unsupported or malformed, the system shall reject it before a
  run is persisted and show a specific validation error.

### R2 — Evidence collection

- When a configured platform adapter succeeds, the system shall store the raw
  adapter payload, normalized author/content fields, public metrics, and a
  retrieval timestamp.
- When an adapter cannot run because login, credentials, or media are missing,
  the system shall preserve the run and record the blocked stage and reason.

### R3 — Video breakdown

- When a local video file is available, the system shall inspect duration and
  streams, extract a contact sheet and representative frames, and attempt a
  timestamped transcript through the configured local transcription command.
- When transcription is unavailable, the system shall still retain visual
  evidence and mark transcript-dependent findings as unavailable.

### R4 — Analysis report

- When evidence collection completes or partially completes, the system shall
  generate a versioned report envelope containing facts, observations,
  inferences, confidence, limitations, and recommended actions.
- The system shall not label a mechanism as a proven cause of virality unless
  comparative evidence supports that claim.

### R5 — Dashboard and CLI

- When a run exists, the dashboard shall expose its source, progress, metrics,
  evidence, script breakdown, findings, limitations, and actions.
- When `selfmedia analyze <url> --open` completes intake, the CLI shall print
  the run ID and open the corresponding local report URL when requested.
- When `selfmedia report <id> --json` is called, the CLI shall print the same
  canonical report envelope consumed by the dashboard.

### R6 — Verification and safety

- The system shall never write credentials or login cookies into the database,
  report envelope, logs, or tracked files.
- Tests shall cover URL routing, metric derivation, report generation, and API
  error handling.
- The production build and browser smoke flow shall complete without new
  console errors.

