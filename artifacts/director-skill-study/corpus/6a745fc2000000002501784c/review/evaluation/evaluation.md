# Independent GATE/JUDGE evaluation

Status: **NOT_READY**

The candidate fails hard GATE, so JUDGE was not run. The numeric `1` values in `evaluation.json.judges` are schema-required sentinels, not completed scores.

## Hard-gate counts

| Gate | Count | Ratio | Threshold | Result |
|---|---:|---:|---:|---|
| Critical-question recall | 15/17 | 0.882 | ≥ 0.85 | PASS |
| Evidence coverage | 16/17 | 0.941 | ≥ 0.90 | PASS |
| Unsupported inference | 2/25 errors | 0.080 | ≤ 0.05 | **FAIL** |
| Timestamp accuracy | 17/17 | 1.000 | ≥ 0.90 | PASS |
| Process dependencies | N/A | — | independently N/A | PASS |
| Unknown discipline | 10/12 | 0.833 | ≥ 0.90 | **FAIL** |
| Unchecked channel families | 0 | — | zero | PASS |
| Independent meta-gate | unguarded items found | — | none | **FAIL** |

The decisive defects are not stylistic. Question 10 turns an audit-required unknown into a positive content-type list; the close substitutes the visible `人类最强编导` label for the spoken `雷自强编导` sign-off; and the blurred opening insert, its transition, and its ownership boundary disappear from the reconstruction model.

No candidate repair was performed.
