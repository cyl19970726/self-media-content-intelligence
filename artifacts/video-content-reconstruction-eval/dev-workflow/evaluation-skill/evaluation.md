# dev-workflow Skill candidate — independent GATE evaluation

## Verdict

**HARD GATE: FAIL. JUDGE not run.**

The candidate is strong at claim/observation separation, timestamp localization, and the layout-revision before/during/after chain. It nevertheless misses a contiguous high-information portion of the workflow: the exact Kimi CLI command, detailed specification, true pre-code project state, visible external image-generation/save sequence, and local `index.html` delivery boundary. Those omissions make the reconstruction materially less reproducible and change the causal story from “AI implements an already-prepared project” toward “prompt produces a framework.”

The candidate's own `coverageMatrix.criticalQuestions` contains 10 probe-defined questions and reports all answered. The independent audit contains 15 different questions. The self-report therefore cannot prove recall.

## Counted hard gates

| Gate | Count | Threshold | Result |
|---|---:|---:|---|
| Critical-question recall | 9/15 = 0.600 | ≥ 0.85 | FAIL |
| Evidence coverage | 23/40 = 0.575 | ≥ 0.90 | FAIL |
| Unsupported inference | 1/27 = 0.037 | ≤ 0.05 | PASS |
| Timestamp accuracy | 96/100 = 0.960 | ≥ 0.90 | PASS |
| Process dependency completeness | 49/70 = 0.700 | ≥ 0.85 | FAIL |
| Unknown discipline | 12/20 = 0.600 | ≥ 0.90 | FAIL |
| Unchecked channels | 3 | must be 0 | FAIL |
| Meta-gate | independent blind spots found | none permitted | FAIL |

Counting rules:

- Critical recall uses the audit's 15 questions, not the candidate's probe questions. Partial answers that omit the question's decision-changing fact do not count.
- Evidence coverage uses the audit's 40 `atomicEvidence` entries as independent core units.
- Unsupported inference counts 27 positive knowledge-unit statements; the all-video unknown inventory (`KU-28`) is excluded.
- Timestamp accuracy checks all 100 evidence references attached to knowledge units against cue, shot, frame, or targeted-frame time, with 0.75 s tolerance.
- Process completeness counts seven fields for each of ten audit stages: input, action, parameter, output, before, during, after. Partial or provenance-reversing fields do not count.
- Unknown discipline uses the audit's 20 unknown opportunities.

## Critical findings

1. `CQ-04` is missed although the exact Kimi CLI command is visible: `uv tool install --python 3.13 kimi-cli`. Candidate `KU-07` and the article incorrectly leave the complete install command unknown.
2. `CQ-07` and audit `AE-017`–`AE-020` are largely missed. The screen exposes a single-page HTML/CSS/JavaScript SPA target, HTML5, Vanilla CSS/JS, responsive/UI requirements, OOP/state management, localStorage, game systems, NPC fields, and value/action structures. The candidate retains only five spoken headings.
3. `CQ-08` and `AE-021`–`AE-024` are missed. Before implementation, the visible directory already contains a full story document, five character JSON files, assets, and empty gameplay/image-pipeline directories. Candidate `KU-13` instead describes the post-cut document as generated framework output. This is the sole counted unsupported positive inference and also mishandles unknown `U-04`.
4. `CQ-09` and `AE-027`–`AE-029` are only partially represented. The video shows an unbranded external image-generation interface, candidate images, a save/download transition, Finder, and named PNGs. Candidate `KU-16` incorrectly says the image-generation tool is not shown.
5. `CQ-10` is missed. The demonstrated delivery boundary is a local browser `index.html` HTML/CSS/JavaScript prototype, not a packaged, deployed, published, or mobile-tested game.

## GATE integrity

The candidate meta-gate is a self-proof gate: it checks its own 11 meaning changes and nine relationship hypotheses, then reports 11/11 and 9/9. Independent comparison exposes three unguarded carrier slices, four missed meaning reversals, and four missing causal/ownership relations. Therefore its `pass: true` and `uncheckedChannels: []` do not survive the evaluator-design anti-no-op checks.

## JUDGE disposition

JUDGE was not run because hard gates failed. `evaluation.json` keeps the schema-required numeric judge keys at the schema minimum only as non-awarded placeholders and adds an explicit `judgeDisposition`; they are not substantive readability or execution scores.

Full per-question and per-stage accounting is in `discrepancies.md`.
