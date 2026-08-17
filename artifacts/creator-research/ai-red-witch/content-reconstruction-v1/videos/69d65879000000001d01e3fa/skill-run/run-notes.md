# Skill-run repair notes

## 2026-08-16 relationship coverage repair

- Scope: only `reconstruction.json` coverage-matrix relationship evidence references.
- Independent `evaluation/evaluation.json` and `evaluation/gate-report.json` were read as diagnostics and left unchanged.
- Removed `KU-*` values from `coverageMatrix.relationships[*].evidenceRefs`; knowledge-unit IDs are semantic nodes, not resolvable evidence.
- REL-01 now uses `CUE-001` for KU-01 and `CUE-002` for KU-05.
- REL-02 uses `TARGET-0020` for KU-06 and `CUE-004` for KU-07.
- REL-03 uses `TARGET-0028` for KU-09 and `CUE-005` for KU-11.
- REL-04 uses `CUE-005` for KU-11 and `CUE-006` for KU-12.
- REL-05 uses `CUE-001` for KU-01 and `CUE-007` / `TARGET-0051` for the closing KU-14/KU-15 evidence.
- REL-06 uses `TARGET-0014` / `TARGET-0016` for KU-08 and adds `CUE-004` for KU-07.
- REL-07 uses shared `TARGET-0041` / `CUE-006` evidence for KU-13 and KU-12.
- REL-08 uses `SHOT-001` / `SHOT-008` for KU-17 and shared `TARGET-0052` / `TARGET-0061` evidence for KU-17/KU-16.
- No content claims, knowledge units, relations, report prose, audit, independent evaluation, or existing gate report were changed.
- Schema validation passed for probe, protocol, reconstruction, existing independent evaluation, and OCR.
- A deterministic recheck wrote only to `/tmp/69d65879000000001d01e3fa-gate-recheck.json`; its `coverage_matrix` check passed with no examples. The existing `evaluation/gate-report.json` was not overwritten.
- A separate endpoint audit confirmed REL-01..08 each contains at least one resolvable evidence reference shared with its actual source KU and at least one shared with its actual target KU, with zero `KU-*` values remaining in `evidenceRefs`.
- This note records the repair and validation outcome only; it does not declare readiness.
