# Independent GATE evaluation — 67af1032000000001902d33d

## Verdict

**FAIL at hard GATE. JUDGE was not run.**

The reconstruction is strong on the video's main semantic content: it preserves the Ray2/Luma identity boundary, exact visible configuration, edited chronology, missing execution bridge, sample provenance gap, performance-claim limits, scoped decision unknowns, and the opening-to-closing CTA relation. However, one available carrier remains unchecked: non-speech audio semantics. The skill-run's only cited evidence for that carrier is a spectrogram showing continuous energy. That establishes existence, not whether the track contains music, effects, inserted-source audio, or a meaning-bearing change. Because `uncheckedChannels` must be empty and the meta-gate must find no unguarded carrier, the evaluation stops before JUDGE.

The candidate's own `coverageMatrix` and `metaGate` were not accepted as proof of completeness.

## Hard GATE counts

| Gate | Count | Threshold | Result |
|---|---:|---:|---|
| Critical-question recall | 18 / 18 | ≥ 0.85 | PASS |
| Core evidence coverage | 20 / 20 | ≥ 0.90 | PASS |
| Unsupported positive claims | 2 / 58 | ≤ 0.05 | PASS |
| Timestamp accuracy | 28 / 30 | ≥ 0.90 | PASS |
| Process dependency completeness | 10 / 10 | ≥ 0.85 | PASS |
| Unknown discipline | 23 / 23 | ≥ 0.90 | PASS |
| Unchecked channels | 1 | must be 0 | **FAIL** |
| Meta audit | 1 unguarded carrier, 0 meaning changes, 0 relationships | must be 0 total | **FAIL** |

No rounded overall-completeness score was computed.

## Counting basis

The 18 independent critical questions cover: recommendation/topic; SRT-versus-caption identity conflict; Luma visual-identity limit; input image and empty end frame; prompt; Keyframe/Videos state; 5s/1080p/Ray2/Ray1.6; aspect-ratio state; early sample groups; late sample groups; edited UI chronology; missing submit/progress/completion chain; result-to-input attribution; training/capability claims; continuity/physics claim limits; opening-to-closing relation; access/account/region/price/version boundaries; and rights/attribution/responsibility boundaries. All 18 were answered or correctly closed as unknown.

The 20 core units count those same facts at evidence-unit granularity, additionally separating the container's 1080×1920/approximately 26.7-second media facts from the UI's `1080p`/`5s` task parameters and separating the presenter from composited UI/sample referents. All have valid visual, subtitle, or independently audited support.

The 58 positive claims were atomized across the one-line conclusion, actual-order table, visible UI/configuration facts, 21 knowledge-unit statements, and stated semantic relations. Two claims use an incorrect closing boundary. This yields 2 / 58 unsupported positive claims, below the 0.05 ceiling.

Thirty timestamped references were checked across opening, early samples, tutorial UI, final montage, and closing. Two uses of `25.267s` are mislocalized: the battle insert remains visible at SHOT-009 (25.383s) and SHOT-010 (25.633s), while the audit places the full creator close-up after the transition. The resulting 28 / 30 still clears the timestamp gate.

The ten required process dependencies are: entering the stated product context, attaching input, entering prompt, selecting model, selecting duration/quality, submit opportunity, queue/progress, completion, task-level output binding, and export/download boundary. The candidate correctly distinguishes visible state from missing execution evidence for all ten.

The 23 unknown opportunities cover platform identity/version/date; current access/platform/region; account/subscription; price/credits/free trial; queue/time; training-data source/composition/license; sample model attribution; task linkage; post-processing; original output properties; quantitative quality/failure rate; input/sample rights; commercial permission; responsibility; upload/submit/progress/completion/export proof; aspect-ratio selection; prompt-tail visibility; selected-versus-default parameter state; and hidden edits/full sample length. All are appropriately bounded or abstained from.

## Independent meta audit

- Unguarded carriers: 1 — non-speech audio semantic content.
- Unguarded meaning changes: 0.
- Unguarded relationships: 0.

`DS-03` is described as an audio spectrogram and its own limitation says it cannot identify music/effects type, source, or authorization. No listening-derived artifact or finding appears in the skill-run. Marking `CAR-08` as `inspected: true` therefore remains self-certification rather than independent evidence. The independent audit also records only `hasAudio: true`/AAC without supplying the missing semantic check.

## JUDGE

Not run. The numeric `judges` values in `evaluation.json` are schema-required placeholders only; they are not quality scores and must not be used to rank or approve this candidate.

## Baseline comparison

Not performed. No baseline-run artifact was present inside the reviewer-authorized scope.
