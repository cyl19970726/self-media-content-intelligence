# Canonical gate report v3

Status: **READY_FOR_DOWNSTREAM_USE**

Result: **22/22 hard gates passed**. Failed gates: none.

| # | Gate | Result | Detail |
|---:|---|---|---|
| 1 | `no_global_completeness_score` | PASS | No banned global completeness percentage |
| 2 | `schema_contract` | PASS | Schema versions and independent flag valid |
| 3 | `verbatim_transcript_and_overlap` | PASS | 38/38 cues, representative frames, and overlaps preserved |
| 4 | `probe_inspects_available_carriers` | PASS | All available probe carriers inspected |
| 5 | `full_timeline_carrier_sweep` | PASS | Full source timeline and non-speech audio decision covered |
| 6 | `protocol_is_probe_derived` | PASS | Every field and action traces to probe findings |
| 7 | `targeted_capture_execution` | PASS | 6/6 capture actions produced resolvable evidence |
| 8 | `ocr_and_ui_evidence_execution` | PASS | 111/111 requested frames processed |
| 9 | `core_evidence_references` | PASS | All core references resolve |
| 10 | `internal_unsupported_inference` | PASS | Provenance and reasoning contract satisfied |
| 11 | `internal_timestamp_bounds` | PASS | Unit ranges and frame localization valid |
| 12 | `internal_process_dependencies` | PASS | N/A internally: no procedural units declared |
| 13 | `coverage_matrix` | PASS | Channels, changes, relations, questions, cues, and core evidence accounted for |
| 14 | `internal_meta_gate` | PASS | No unchecked internal closure |
| 15 | `eval_critical_question_recall` | PASS | 15/15 = 1.000 |
| 16 | `eval_evidence_coverage` | PASS | 24/24 = 1.000 |
| 17 | `eval_unsupported_inference` | PASS | 0/25 = 0.000 error ratio |
| 18 | `eval_timestamp_accuracy` | PASS | 131/131 = 1.000 |
| 19 | `eval_process_dependency_completeness` | PASS | 19/19 = 1.000 |
| 20 | `eval_unknown_discipline` | PASS | 14/14 = 1.000 |
| 21 | `eval_unchecked_channels` | PASS | 0 unchecked channels |
| 22 | `eval_meta_gate` | PASS | No unguarded carrier, meaning change, or relation |

The deterministic source of truth is `gate-report.json`; this file is its human-readable rendering.
