# Independent GATE/JUDGE evaluation

Status: **NOT_READY**

The candidate fails hard GATE, so JUDGE was not run. The numeric `1` values in `evaluation.json.judges` are schema-required sentinels, not completed scores.

## Hard-gate counts

| Gate | Count | Ratio | Threshold | Result |
|---|---:|---:|---:|---|
| Critical-question recall | 8/8 | 1.000 | ≥ 0.85 | PASS |
| Evidence coverage | 4/4 | 1.000 | ≥ 0.90 | PASS |
| Unsupported inference | 1/5 errors | 0.200 | ≤ 0.05 | **FAIL** |
| Timestamp accuracy | 4/4 | 1.000 | ≥ 0.90 | PASS |
| Process dependencies | N/A | — | independently N/A | PASS |
| Unknown discipline | 8/8 | 1.000 | ≥ 0.90 | PASS |
| Unchecked channel families | 0 | — | zero | PASS |
| Independent meta-gate | one unguarded meaning change | — | none | **FAIL** |

The zero subtitle-cue count is explicitly not a failure. The visual comparison is covered, audio semantics/source remain appropriately unknown, and identity/ownership boundaries are preserved. The failures come from asserting exact low-confidence numeral text (`832.7万`) and omitting the late relocation/appearance of platform/account overlays as a meaning change.

No candidate repair was performed.
