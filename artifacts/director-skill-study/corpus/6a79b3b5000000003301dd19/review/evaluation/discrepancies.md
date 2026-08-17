# Discrepancies

状态：`NOT_READY`。

1. `D-01 / eval_unknown_discipline`：缺少“如何实际找到并触达首批买家”这一独立未知机会。应在 24.665–64.860 秒范围内，对字幕、烧录字幕、白板与人物指示做有界缺席陈述。
2. `D-02 / eval_unknown_discipline`：缺少“失败案例、不适用人群、失败条件或反例”这一全片未知/缺席边界，因而不能把方法扩成普适规则。
3. `D-03 / coverage_matrix`：`coverageMatrix.relationships[*].evidenceRefs` 与部分 `criticalQuestions[*].evidenceRefs` 混入 `KU-xx`。canonical validator 不把 unit id 当 evidence ref；应仅在 `unitIds` 保存知识单元关联。
4. `D-04 / reporting`：最终字幕冲突表漏列 `CC-02`、`CC-04`、`CC-08`。规范语义大体已恢复，因此不另判 meta-gate 失败，但应补齐冲突审计轨迹。

修复顺序：先修 `D-03`，再补 `D-01`/`D-02` 并重新独立评估 unknown discipline，最后补齐 `D-04` 的报告可追溯性。
