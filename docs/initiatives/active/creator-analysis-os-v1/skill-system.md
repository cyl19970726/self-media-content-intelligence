# Creator Analysis OS Skill System

Status: implementation contract
Last updated: 2026-08-22

## Outcome

A user supplies a previously unseen creator profile URL and, without reading an operating manual, receives one evidence-backed Dashboard that explains who the creator is, what forms the baseline, what breaks out, what fails, how the content system works, and which conclusions remain unknown.

The Dashboard is a compiled read model. It must never be the place where research conclusions are invented or hand-patched.

## Mental model

```text
Skill        = research judgment and dynamic protocol
Worker / CLI = browser, media, OCR, statistics, files and other execution
Orchestrator = ordering, state, retries, handoff and revision ownership
Artifacts    = durable facts, evidence, revisions and evaluation ledgers
Evaluator    = independent review and fail-closed gates
Dashboard    = projection of the latest valid artifacts
```

## Canonical Skill graph

There are four user-facing entry points and six internal research capabilities. `video-content-reconstruction` appears in both groups, so the system contains nine unique Skills.

### User-facing entry points

1. `video-content-reconstruction` — reconstruct one video through content restoration, directing logic, and visual/editing logic.
2. `analyze-creator-videos` — orchestrate a complete creator research run from profile URL to Creator Dossier.
3. `compare-creators` — compare two or more accepted Creator Dossiers without manufacturing comparability.
4. `content-strategy-workbench` — use selected evidence to design our own content. This belongs to the creation area, not the creator research page.

### Internal capabilities

1. `xiaohongshu-creator-acquisition` — identity, inventory, detail, cover, metric, comment and media acquisition through the authenticated ego-browser route.
2. `creator-portfolio-annotation` — open-ended evidence-bounded annotation of every visible post.
3. `creator-sample-selection` — deterministic high, median, arithmetic-mean-near and low comparison/deep selection.
4. `video-content-reconstruction` — evidence-grade reconstruction for every selected video.
5. `creator-research-synthesis` — synthesize positioning, audiences, values, trust, lifecycle, content system, evolution, demand and commercial evidence boundaries.
6. `creator-research-evaluator` — independently evaluate acquisition honesty, corpus reproducibility, selection coverage, CR/DL/VE gates, synthesis support and Dashboard parity.

## End-to-end flow

```text
profile URL
  -> identity verification
  -> resumable public corpus acquisition
  -> detail/date/metric/comment/media enrichment
  -> portfolio annotation and reproducible statistics
  -> high/median/mean-near/low selection
  -> media verification
  -> per-video CR/DL/VE reconstruction
  -> independent video and creator evaluation
  -> creator synthesis
  -> Creator Dossier projection
  -> browser smoke and blind-user regression
```

Normal operation is backend-triggered. A user should not have to ask Codex to run individual CLI commands. CLI programs remain the deterministic runtime used by queued workers; agents handle research judgment, exceptional recovery and review.

## Dashboard ownership

| Dashboard section | Producer |
| --- | --- |
| Identity, positioning, audiences, values, trust, lifecycle | `creator-research-synthesis` from profile, corpus and validated deep evidence |
| Data health and full baseline | acquisition artifacts plus deterministic statistics |
| Topics and formats | `creator-portfolio-annotation` plus deterministic aggregation |
| Performance tiers | `creator-sample-selection` plus cross-tier synthesis |
| Unified List and Gallery | projection from the same versioned selection set and cover manifest |
| Deep evidence coverage | orchestration and CR/DL/VE gate ledger |
| Publishing rhythm and evolution | detail acquisition, time-series statistics and synthesis |
| Comments and user demand | bounded public-comment acquisition and synthesis |
| Observed content system | `creator-research-synthesis` using the comparison set and validated deep set |
| Commercial paths and unknowns | public profile/post evidence plus synthesis; otherwise remain unknown |

## Boundaries

- Creator research explains the creator. It does not prescribe what we should copy or publish.
- Creation recommendations live only in `content-strategy-workbench`.
- `ego-browser` is an execution dependency, not a research product Skill.
- OCR, downloads, hashes, statistics, queues, persistence, projection and rendering are deterministic infrastructure, not Skills.
- A title or cover may support portfolio annotation, but cannot prove a video's internal mechanism.
- Missing dates, comments, media, private analytics or commercial evidence remain explicit unknowns.
- No failed or partial reconstruction may appear as validated deep evidence.

## Completion contract

A creator research run is complete only when:

- identity has at least two independent public anchors;
- observed-versus-displayed inventory coverage and every acquisition stop reason are explicit;
- corpus metrics are reproducible and missingness is field-specific;
- every selected item has a reason, tier, evidence scope and stable ID;
- the deep set covers high, median, arithmetic-mean-near and low behavior, normally three per group with overlap deduplicated;
- every validated deep video passes CR 6/6, DL 6/6 and VE 7/7 through independent evaluation;
- every creator-level conclusion points to corpus or deep evidence and preserves conflicts and unknowns;
- List and Gallery project the same record IDs and revisions;
- Dashboard sections do not turn absent evidence into generic prose;
- schema validation, deterministic gates, browser smoke and regression tests pass.

If these conditions are not met, the run remains partial and the Dashboard must show the exact missing stage.
