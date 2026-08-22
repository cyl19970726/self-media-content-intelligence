# Runtime Skill Pipeline

Status: confirmed and implemented in V1 projection

This contract joins the research Skill graph to the executable creator-analysis runtime. It prevents two recurring errors: treating a CLI run as the research method, and treating a rendered Dashboard as proof that the research is complete.

## Role model

| Role | Responsibility | Must not do |
|---|---|---|
| Skill | Define what must be inspected, how claims are classified, and what counts as sufficient evidence | Operate the browser or declare its own output accepted |
| CLI / Worker | Collect, download, transcribe, extract frames, run OCR, calculate statistics, and write typed artifacts | Invent missing facts or silently upgrade unknowns |
| Orchestrator | Order tasks, bind revisions, resume safe failures, request human handoff, and invalidate stale downstream work | Replace an evaluator or hide a blocked stage |
| Artifact store / database | Preserve source evidence, derived artifacts, hashes, revisions, and evaluation records | Serve mutable anonymous blobs as canonical evidence |
| Evaluator | Independently run GATE, JUDGE, and META checks against the allowed inputs | Reuse the producer's unsupported conclusion as evidence |
| Dashboard | Read the last valid projection and expose evidence health and missing work | Generate research conclusions in the browser |

## Canonical 13-stage graph

| # | Stage | Method owner | Execution owner | Primary output |
|---:|---|---|---|---|
| 1 | Research contract and revision | `analyze-creator-videos` | Orchestrator | immutable run contract |
| 2 | Identity and profile verification | `xiaohongshu-creator-acquisition` | browser worker | identity anchors |
| 3 | Full visible inventory acquisition | `xiaohongshu-creator-acquisition` | browser worker | inventory snapshot and crawl ledger |
| 4 | Post detail, date, metrics, comments | `xiaohongshu-creator-acquisition` | detail/comment worker | detail snapshots |
| 5 | Portfolio annotation | `creator-portfolio-annotation` | annotation worker | per-post content annotations |
| 6 | Corpus statistics | deterministic contract | statistics worker | reproducible distribution |
| 7 | High / median / mean-near / low selection | `creator-sample-selection` | selection worker | stable unified selection set |
| 8 | Representative media verification | `xiaohongshu-creator-acquisition` | media worker | verified media manifest |
| 9 | Three-lens video reconstruction | `video-content-reconstruction` | reconstruction worker | content, directing, visual/editing artifacts |
| 10 | Independent video evaluation | `creator-research-evaluator` | independent evaluator | CR 6/6, DL 6/6, VE 7/7 gate report |
| 11 | Cross-video creator synthesis | `creator-research-synthesis` | synthesis worker | Creator Analysis artifact |
| 12 | Independent creator evaluation | `creator-research-evaluator` | independent evaluator | Creator gate report |
| 13 | Creator Dossier projection | deterministic contract | projection worker | `/creators/:creatorId` |

Each stage publishes `state`, `gateState`, `skillId`, `workerKind`, `artifactRefs`, `missingInputs`, `nextAction`, and affected Dashboard sections. A coarse scheduler status is not allowed to promote these evidence-derived fields.

## Readiness rule

```text
creator_pipeline_ready = every upstream stage complete and passed
                         AND creator evaluation passed
                         AND dashboard projection complete
```

A partial inventory, missing dates/comments, an unevaluated video, or a missing creator gate keeps the pipeline partial. The Dashboard may still render the last valid evidence, but must label itself as a partial research projection and show the exact missing stage.

## Dashboard behavior

The existing Creator Dossier route remains the only creator research page. Its pipeline ledger explains, in non-technical language:

- what has been completed;
- which Skill owns the method;
- which Worker produced the evidence;
- whether the independent gate passed;
- which artifacts support the stage;
- what is missing and what happens next;
- which product sections are affected by that missing work.

The pipeline ledger is diagnostic metadata. The ten research sections remain the product itself.

## Fail-closed invariants

- A visible page is not equivalent to a completed research run.
- A scheduler stage marked complete is not evidence that its nested research gates passed.
- Missing comments, publication time, media, or deep evaluation remain typed missing inputs.
- A producer cannot self-approve its own video or creator synthesis.
- Dashboard code does not infer positioning, user value, mechanisms, or business paths.
- A stale upstream revision makes dependent analysis stale until it is re-evaluated.
