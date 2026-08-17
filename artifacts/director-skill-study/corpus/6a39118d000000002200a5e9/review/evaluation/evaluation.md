# Independent reconstruction evaluation

Corpus: `6a39118d000000002200a5e9`  
Verdict: `NOT_READY`  
Canonical gate result: **16/22 passed; 6/22 failed**  
Schema validation: **PASS** (`probe`, `protocol`, `reconstruction`, `evaluation`, `ocr`)

The candidate is not ready for downstream use. It passes all deterministic internal-structure gates, but the independent audit finds a whole available carrier omitted: the analytics/social-proof insert visible at `DENSE-0001@0.000`. The omission is consequential because candidate `KU-25` and the article then make the opposite bounded claim that no conversion/playback performance data were observed.

Because one or more hard gates failed, substantive JUDGE scoring was not performed. `evaluation.json` contains schema-required numeric placeholders only; they are not quality scores.

## All 22 gates

| # | Gate | Result | Detail |
|---:|---|:---:|---|
| 1 | `no_global_completeness_score` | PASS | No banned global completeness percentage. |
| 2 | `schema_contract` | PASS | Required schema versions and independent flag are valid. |
| 3 | `verbatim_transcript_and_overlap` | PASS | All 46 cues, representative frames, and overlapping shots are preserved. |
| 4 | `probe_inspects_available_carriers` | PASS | Candidate's declared carriers are marked inspected. |
| 5 | `full_timeline_carrier_sweep` | PASS | Declared sweep is gap-free and explicitly disposes of non-speech audio. |
| 6 | `protocol_is_probe_derived` | PASS | Every protocol field/action traces to probe IDs. |
| 7 | `targeted_capture_execution` | PASS | Every capture action produced resolvable frames. |
| 8 | `ocr_and_ui_evidence_execution` | PASS | OCR/UI frames were processed. |
| 9 | `core_evidence_references` | PASS | Candidate-declared core references resolve syntactically. |
| 10 | `internal_unsupported_inference` | PASS | Candidate-declared inference records contain reasoning/evidence. |
| 11 | `internal_timestamp_bounds` | PASS | Candidate unit ranges and frame references stay within the source timeline. |
| 12 | `internal_process_dependencies` | PASS | Canonical validator accepts the declared procedural unit. |
| 13 | `coverage_matrix` | PASS | Candidate's self-declared matrix is internally consistent. |
| 14 | `internal_meta_gate` | PASS | Candidate declares no internal omission; this does not prove completeness. |
| 15 | `eval_critical_question_recall` | **FAIL** | `15/18 = 0.833 < 0.85`; failures: CQ-02, CQ-07, CQ-13. |
| 16 | `eval_evidence_coverage` | **FAIL** | `22/25 = 0.880 < 0.90`; missing/incorrect audit units: opening insert, personal referent conflict, full `行业先锋` label. |
| 17 | `eval_unsupported_inference` | **FAIL** | `2/26 = 0.077 > 0.05`; false negative about metrics and over-resolved person mapping. |
| 18 | `eval_timestamp_accuracy` | PASS | `27/27 = 1.000`; localization itself is accurate. |
| 19 | `eval_process_dependency_completeness` | PASS | `13/15 = 0.867 ≥ 0.85`; REL-05 and REL-15 fail. |
| 20 | `eval_unknown_discipline` | **FAIL** | `9/12 = 0.750 < 0.90`; misses UNK-01, UNK-03, UNK-11. |
| 21 | `eval_unchecked_channels` | **FAIL** | `CAR-04 opening analytics insert` remains unchecked by the reconstruction model. |
| 22 | `eval_meta_gate` | **FAIL** | Unguarded carrier `CAR-04`, meaning change `MC-01`, and relation `REL-15`. |

## Required repairs

1. Add a visual-observation knowledge unit for `DENSE-0001@0.000`: large analytics counts are shown briefly as authority/social-proof framing. Do not infer post identity, account ownership, date, provenance, or causality.
2. Rewrite every full-timeline absence claim. The correct boundary is not “no performance data are shown”; it is that the opening analytics are shown but are not tied to a demonstrated application, finished story, or causal result.
3. Reconstruct the six personal topic/person pairs across cue boundaries. Correct visible `于东来` against SRT `刘向东`, but preserve the unresolved `刘强东/曹德旺` punctuation/referent conflict. Remove the invented explanation that the sixth item deliberately maps to two people.
4. Restore the exact visible brand direction `行业先锋—字节跳动`, not the compressed `先锋—字节跳动`.
5. Add the unresolved applicability boundary: the video says non-founder IP can use the framework but does not explain how to adapt it.
6. Update probe carrier inventory, meaning changes, omission risks, protocol derivations, reconstruction coverage, opening-to-closing relation, meta-gate, and article together; rerun schema validation and all 22 canonical gates.

Detailed issue records are in `discrepancies.json`; machine-readable counts are in `evaluation.json`; canonical results are in `gate-report.json`.
