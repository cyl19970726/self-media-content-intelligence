# Independent reconstruction evaluation

## Outcome

**NOT_READY** — 19 of 22 hard gates pass. Failed gates:

- `internal_timestamp_bounds`
- `eval_unknown_discipline`
- `eval_meta_gate`

Schema validation passes for probe, protocol, reconstruction, evaluation, and OCR. Because hard gates fail, no substantive JUDGE scoring was performed. The `judges` values in `evaluation.json` are schema-required sentinels and must not be interpreted as quality scores.

## Independent GATE metrics

| Metric | Count | Ratio | Threshold | Result |
|---|---:|---:|---:|---|
| Critical-question recall | 17/18 | 0.944 | >= 0.85 | PASS |
| Evidence coverage | 16/16 | 1.000 | >= 0.90 | PASS |
| Unsupported inference | 0/22 | 0.000 error ratio | <= 0.05 | PASS |
| Timestamp accuracy | 88/89 | 0.989 | >= 0.90 | PASS |
| Process dependency completeness | N/A | N/A | independently N/A | PASS |
| Unknown discipline | 12/16 | 0.750 | >= 0.90 | **FAIL** |
| Unchecked channels | 0 | — | 0 | PASS |
| Independent meta-gate | 1 unguarded relation | — | 0 | **FAIL** |

Critical-question recall loses CQ-10 because the candidate reports the Lila image-plus-BGM causal claim but does not explicitly bind that phrase to the Lila example artifact and separate it from this video's soundtrack. Unknown discipline misses UNK-01, UNK-08, UNK-09, and UNK-10. The independent meta-gate fails on the same unguarded CUE-028 referent relationship.

## All 22 canonical gates

| # | Gate | Result | Detail |
|---:|---|---|---|
| 1 | `no_global_completeness_score` | PASS | No banned global completeness percentage. |
| 2 | `schema_contract` | PASS | Required schema versions and independent flag are valid. |
| 3 | `verbatim_transcript_and_overlap` | PASS | All 42 cues, representative frames, and overlapping shots are preserved. |
| 4 | `probe_inspects_available_carriers` | PASS | Every declared available carrier is marked inspected. |
| 5 | `full_timeline_carrier_sweep` | PASS | Full timeline and non-speech-audio decision are covered. |
| 6 | `protocol_is_probe_derived` | PASS | Fields/actions trace to probe findings. |
| 7 | `targeted_capture_execution` | PASS | Every action produced resolvable evidence. |
| 8 | `ocr_and_ui_evidence_execution` | PASS | All requested OCR/UI frames were processed. |
| 9 | `core_evidence_references` | PASS | Core evidence references resolve. |
| 10 | `internal_unsupported_inference` | PASS | No internal inference-contract violation. |
| 11 | `internal_timestamp_bounds` | **FAIL** | KU-22 cites `OCR-00101` at 22.98s outside its 47.525–51.04s range. |
| 12 | `internal_process_dependencies` | PASS | Not applicable; no procedure is declared. |
| 13 | `coverage_matrix` | PASS | Candidate-declared closure is internally consistent. |
| 14 | `internal_meta_gate` | PASS | Candidate's own meta-gate reports closure. |
| 15 | `eval_critical_question_recall` | PASS | 17/18 = 0.944. |
| 16 | `eval_evidence_coverage` | PASS | 16/16 = 1.000. |
| 17 | `eval_unsupported_inference` | PASS | 0/22 = 0.000 error ratio. |
| 18 | `eval_timestamp_accuracy` | PASS | 88/89 = 0.989. |
| 19 | `eval_process_dependency_completeness` | PASS | Independently not applicable. |
| 20 | `eval_unknown_discipline` | **FAIL** | 12/16 = 0.750. |
| 21 | `eval_unchecked_channels` | PASS | No available carrier left wholly unchecked; non-speech audio is explicitly unresolved. |
| 22 | `eval_meta_gate` | **FAIL** | CUE-028's Lila image/BGM referent relation is absent. |

## Repair order

1. Fix KU-22's out-of-range OCR reference.
2. Add explicit unknown boundaries for the 8-billion claim and Lila-trend scope.
3. Add the exact-image/BGM unknown and the CUE-028 → Lila-example referent relation, separated from source non-speech audio.
4. Separate visible drawing-account labeling from unknown creator/work/source attribution.
5. Regenerate the reconstruction/coverage matrix and rerun schema plus all 22 gates with a fresh independent evaluation.

Readiness token: **NOT_READY**
