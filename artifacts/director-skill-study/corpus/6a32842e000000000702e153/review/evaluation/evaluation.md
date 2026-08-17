# Independent reconstruction evaluation

## Outcome

**NOT_READY**. The deterministic report contains 22 gates: **17 pass, 5 fail**.

Failed gates:

1. `probe_inspects_available_carriers` — `CAR-02`, `CAR-03`, and `CAR-05` are available but remain `inspected:false` in the probe.
2. `full_timeline_carrier_sweep` — non-speech audio is not explicitly recorded as actually inspected.
3. `eval_unsupported_inference` — 2/30 unsupported positive claims = 6.7%, above the 5% ceiling.
4. `eval_unchecked_channels` — non-speech audio was not inspected.
5. `eval_meta_gate` — the uninspected audio carrier remains open; the closing-to-opening no-validation relation is also not explicitly guarded.

Because a hard gate failed, readability and execution-value JUDGE was not substantively executed. The numeric judge fields in `evaluation.json` are schema-required sentinels and are not scores.

## Independent GATE metrics

| Metric | Count | Ratio | Threshold | Result |
|---|---:|---:|---:|---|
| Critical-question recall | 14/16 | 87.5% | ≥85% | PASS |
| Evidence coverage | 25/27 | 92.6% | ≥90% | PASS |
| Unsupported inference | 2/30 errors | 6.7% | ≤5% | **FAIL** |
| Timestamp accuracy | 30/30 | 100% | ≥90% | PASS |
| Relation/dependency completeness | 20/22 | 90.9% | ≥85% | PASS |
| Unknown discipline | 14/15 | 93.3% | ≥90% | PASS |
| Unchecked channels | 1 | — | 0 | **FAIL** |
| Independent meta-gate | fail | — | pass | **FAIL** |

## 22-gate report

| # | Gate | Result |
|---:|---|---|
| 1 | `no_global_completeness_score` | PASS |
| 2 | `schema_contract` | PASS |
| 3 | `verbatim_transcript_and_overlap` | PASS |
| 4 | `probe_inspects_available_carriers` | **FAIL** — `CAR-02`, `CAR-03`, `CAR-05` unchecked in probe |
| 5 | `full_timeline_carrier_sweep` | **FAIL** — non-speech audio not explicitly inspected |
| 6 | `protocol_is_probe_derived` | PASS |
| 7 | `targeted_capture_execution` | PASS |
| 8 | `ocr_and_ui_evidence_execution` | PASS |
| 9 | `core_evidence_references` | PASS |
| 10 | `internal_unsupported_inference` | PASS (deterministic shape only) |
| 11 | `internal_timestamp_bounds` | PASS |
| 12 | `internal_process_dependencies` | PASS |
| 13 | `coverage_matrix` | PASS |
| 14 | `internal_meta_gate` | PASS (candidate self-report; overridden by independent gate) |
| 15 | `eval_critical_question_recall` | PASS |
| 16 | `eval_evidence_coverage` | PASS |
| 17 | `eval_unsupported_inference` | **FAIL** |
| 18 | `eval_timestamp_accuracy` | PASS |
| 19 | `eval_process_dependency_completeness` | PASS |
| 20 | `eval_unknown_discipline` | PASS |
| 21 | `eval_unchecked_channels` | **FAIL** |
| 22 | `eval_meta_gate` | **FAIL** |

## Repairs required for readiness

1. Close the probe's available visual carriers: burned captions/overlays (`CAR-02`), opening social screenshots (`CAR-03`), and whiteboard (`CAR-05`) must be marked inspected only after the completed reviews are traced back into the probe.
2. Perform a real full-timeline auditory pass for non-speech audio. Until then, keep the carrier unchecked and meta-gate false.
3. Correct visible caption `flj` to `fjj`, while leaving its expansion and identity unknown.
4. Correct visible name `于灏` to `于瀚`, while preserving raw SRT `宇浩` as the conflicting source form and external identity/spelling as unknown.
5. Add the opening Xiaohongshu profile's `人类最强编导` / approximately-30k-follower visible state as an atomic observation with explicit proof limits.
6. Add the bounded relation that the closing does not re-show or validate the opening three-day/30k result claim.

Re-run schema validation and all 22 gates after those repairs. `READY_FOR_DOWNSTREAM_USE` is not authorized in the current state.
