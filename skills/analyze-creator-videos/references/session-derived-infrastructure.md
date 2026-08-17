# Infrastructure extracted from the reference build session

Source session: `01a0066b-defd-7241-98dc-a0a31863b36c`. This reference records reusable failure edges, not a narrative history.

## Evidence-backed failure edges

| Observed crack | Infrastructure response |
|---|---|
| A demo fixture passed tests and was presented as a complete analysis; the user immediately judged the report shallow. | Add a provenance gate. Every run and Dashboard must declare `fixture`, `public_snapshot`, `video_evidence`, `external_verification`, and unavailable channels. Fixture success is workflow validation, never analysis completion. |
| Early reports used totals and generic copy without historical baselines, time normalization, transcript, OCR, or causal alternatives. | Add an analysis-contract gate and evidence ladder. A “why it worked” claim requires corpus comparison plus reconstruction evidence; otherwise call it a hypothesis. |
| Single-post, multi-post/topic, and creator questions were mixed in one vertical report. | Model three first-class research objects with separate questions and outputs. The creator Dashboard may link them, but must not collapse them into one undifferentiated report. |
| Frontend work began before the product loop, PRD, data model, and key page structure were stable. | Make analysis contract → data model → wireframe/information contract → implementation a hard sequence. Styling cannot close a missing decision object. |
| Mechanical three-part video splits were mistaken for real breakdowns. | Delegate selected videos to `$video-content-reconstruction`; require transcript, cue/frame/shot mapping, targeted OCR/UI evidence, content relationships, coverage matrix, and hard gates. |
| The user repeatedly restated that Xiaohongshu must use ego-browser. | Encode the browser route as policy, not preference: Xiaohongshu acquisition uses `$ego-browser` and the authenticated `hhh-01` session when available; never silently substitute Chrome/Google scraping. |
| Specifications and artifacts appeared under multiple workspace roots, creating stale parallel copies. | Maintain one `run-manifest.json`, one canonical run root, and one Dashboard URL. Store content hashes/revisions for corpus, selection, reconstructions, analysis, template, and Dashboard data. |
| Revisions to source data did not automatically invalidate old conclusions or rendered pages. | Add explicit invalidation edges and refuse readiness when a downstream revision is stale. |
| The most useful reviewer result was an operator simulation that attempted real editing and topic decisions. | Validate with two surfaces: structural gates and a user-value scenario. A visually correct page is insufficient if an operator still cannot decide what to keep, cut, copy, or test. |
| Full deep reconstruction of hundreds of videos created uncontrolled cost. | Analyze the full corpus shallowly, compare 5–7 per high/median/average/low group, and reconstruct 3 per group by default. When no natural mean-near group exists, use boundary samples instead of forcing three. Expand only by explicit request. |

## Canonical artifact graph

```text
raw public snapshot
  -> creator-corpus.json
  -> corpus-analysis.json
  -> selection.json
  -> videos/<id>/reconstruction + gate
  -> creator-analysis.json
  -> dashboard-data.json
  -> dashboard/
```

Every arrow is an invalidation edge. If an upstream content hash changes, mark every downstream stage `stale` until regenerated and revalidated.

## Run manifest minimum

Record:

- run and creator IDs;
- canonical run root and Dashboard path;
- acquisition adapter and authenticated browser profile label, without credentials;
- snapshot timestamp and corpus revision/hash;
- analysis, selection, reconstruction, and template revisions;
- stage status: `missing | running | ready | failed | stale`;
- failed gates and unknown channels;
- selected comparison/deep-set IDs;
- validation and browser-smoke timestamps.

## Three research objects

### Single post

Answer what the post says, how it works, why it may perform, what evidence supports that, and what remains unknown.

### Topic or multi-post set

Answer which approaches exist, which mechanism differences align with performance, and which controlled experiment should be run next.

### Creator

Answer positioning, audience, portfolio roles, content/visual grammar, high/median/low patterns, publishing rhythm, transferable mechanisms, and launch implications.

## Readiness semantics

- `WORKFLOW_VALIDATED`: demo or fixture proves the pipeline runs.
- `REVIEWABLE`: public corpus and artifacts exist, but some evidence gates may remain.
- `READY_FOR_CREATOR_ANALYSIS`: corpus is real and traceable, selected reconstructions pass, conclusions cite evidence, unknowns remain explicit, and the Dashboard passes operator/browser checks.

Never call the first two states “complete analysis.” A weaker state needs its own name instead of borrowing the stronger one.
