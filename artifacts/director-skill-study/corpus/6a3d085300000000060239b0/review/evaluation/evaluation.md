# Independent GATE evaluation: 6a3d085300000000060239b0

## Outcome

**NOT_READY**. Hard GATE fails critical-question recall (15/18 = 0.833), process dependency completeness (4/6 = 0.667), unknown discipline (5/13 = 0.385), and the independent meta-gate. JUDGE was not substantively run. The numeric `judges` values in `evaluation.json` are schema-required placeholders only.

## Counted gates

| Gate | Count | Ratio | Threshold | Result |
|---|---:|---:|---:|---|
| Critical-question recall | 15/18 | 0.833 | >= 0.85 | **FAIL** |
| Evidence coverage | 16/16 | 1.000 | >= 0.90 | PASS |
| Unsupported inference | 0/21 | 0.000 | <= 0.05 | PASS |
| Timestamp accuracy | 107/107 | 1.000 | >= 0.90 | PASS |
| Process dependency completeness | 4/6 | 0.667 | >= 0.85 | **FAIL** |
| Unknown discipline | 5/13 | 0.385 | >= 0.90 | **FAIL** |
| Unchecked channels | 0 | — | must be 0 | PASS |
| Meta-gate | 5 unguarded relationship classes | — | none | **FAIL** |

CQ misses are CQ-03 (the strongest competition/profit comparisons), CQ-04 (new-hit recovery dependency), and CQ-18 (partial numbering and lack of visible closure for all thirteen questions). Dependency misses are DEP-03 and DEP-06. Eight of thirteen material unknown opportunities are not explicitly preserved.

The independent meta-audit rejects the candidate's self-reported meta pass: the protocol's relationship model largely records adjacent chronology and does not guard several cross-segment operational and causal relations.

Final status: `NOT_READY`.
