# Independent reconstruction evaluation

## Verdict

**NOT_READY** — 18/22 canonical gates pass. Four hard gates fail, so substantive JUDGE scoring was not run.

The numeric judge fields in `evaluation.json` and `gate-report.json` are schema-required placeholders only; they are not evaluation scores.

## 22-gate report

| # | Gate | Result | Evidence / ratio |
|---:|---|:---:|---|
| 1 | `no_global_completeness_score` | PASS | No banned global 100% claim |
| 2 | `schema_contract` | PASS | All schema versions valid; evaluator independent |
| 3 | `verbatim_transcript_and_overlap` | PASS | 43/43 cues preserved with representative frames and overlapping shots |
| 4 | `probe_inspects_available_carriers` | PASS | All declared available carriers marked inspected |
| 5 | `full_timeline_carrier_sweep` | **FAIL** | `non_speech_audio:not_explicitly_inspected` because CAR-08 lacks a recognized non-speech-audio modality key |
| 6 | `protocol_is_probe_derived` | PASS | Every field/action traces to probe IDs |
| 7 | `targeted_capture_execution` | PASS | All 15 capture actions produced resolvable frames |
| 8 | `ocr_and_ui_evidence_execution` | PASS | All requested OCR/UI frames processed |
| 9 | `core_evidence_references` | PASS | Candidate core references resolve structurally |
| 10 | `internal_unsupported_inference` | PASS | Candidate's internal provenance/reasoning form is valid; independent correctness is gate 17 |
| 11 | `internal_timestamp_bounds` | PASS | Ranges and frame references are within source timeline |
| 12 | `internal_process_dependencies` | PASS | No procedural units declared |
| 13 | `coverage_matrix` | PASS | Candidate's self-declared matrix is internally closed |
| 14 | `internal_meta_gate` | PASS | Candidate self-reports no unchecked closure; independent meta-audit is gate 22 |
| 15 | `eval_critical_question_recall` | PASS | 14/15 = 0.933; CQ-15 missed |
| 16 | `eval_evidence_coverage` | PASS | 17/18 = 0.944; audited KU-18 meaning incomplete |
| 17 | `eval_unsupported_inference` | **FAIL** | 2/28 = 0.071 > 0.05: invented 2026 reading; 梁桑/梁馨 identity error |
| 18 | `eval_timestamp_accuracy` | PASS | 30/30 = 1.000 |
| 19 | `eval_process_dependency_completeness` | PASS | 15/16 = 0.938; RD-15 missed |
| 20 | `eval_unknown_discipline` | **FAIL** | 9/13 = 0.692 < 0.90 |
| 21 | `eval_unchecked_channels` | PASS | No independently unchecked carrier class; unresolved audio/whiteboard channels are explicitly guarded |
| 22 | `eval_meta_gate` | **FAIL** | Unguarded opening-to-closing non-closure relationship |

## Required repairs

1. Remove the false “burned subtitle says 2026” claim. Preserve SRT=2020 and leave audible year unknown.
2. Correct fixed-format creator identity to “梁馨和小马,” retaining “良心和小马” only as the SRT conflict.
3. Add an explicit core closing unit/relation: the sign-off does not demonstrate, recap, qualify, guarantee, or explicitly fulfill the opening promise.
4. Add scoped unknowns for the missing numerical 爆款 threshold and missing end-to-end filming/editing/testing or before/after proof.
5. Add `non_speech_audio` to CAR-08 `modalityKeys` so the canonical deterministic sweep recognizes the explicit audio decision.
6. Rerun schema validation, independent evaluation, and all 22 gates. Do not run JUDGE until every hard gate passes.

## Schema validation

Probe, capture protocol, reconstruction, evaluation, and OCR evidence all pass their JSON schemas. Schema validity does not override the four failed hard gates.
