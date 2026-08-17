# Independent reconstruction evaluation

结论：`NOT_READY`。22 个 hard gates 通过 20 个，失败 2 个：`coverage_matrix`、`eval_unknown_discipline`。

本评估只读取本样本的 evidence pack、`review/audit/` 与 run candidate；未读取 V0、observations、其他 corpus 或旧报告。先完成 GATE。由于 hard gate 未全过，没有进行实质 JUDGE；`evaluation.json` 中五个 `1` 仅是满足 canonical schema 的占位哨兵，不是质量评分。

## 22-gate report

| # | Gate | 结果 | 证据/比率 |
|---:|---|---|---|
| 1 | `no_global_completeness_score` | PASS | 无全局“100% 完整”分数 |
| 2 | `schema_contract` | PASS | schema versions 与 independent flag 有效 |
| 3 | `verbatim_transcript_and_overlap` | PASS | 38/38 cues、代表帧、重叠 shots 保持 |
| 4 | `probe_inspects_available_carriers` | PASS | probe 声明的可用载体均 inspected |
| 5 | `full_timeline_carrier_sweep` | PASS | 0–105.215 秒无时间缺口；含非语音音频决定 |
| 6 | `protocol_is_probe_derived` | PASS | fields/actions 均追溯到 probe ids |
| 7 | `targeted_capture_execution` | PASS | 6/6 actions 生成可解析定向证据 |
| 8 | `ocr_and_ui_evidence_execution` | PASS | OCR/UI frames 全部 processed |
| 9 | `core_evidence_references` | PASS | candidate core refs 均可解析 |
| 10 | `internal_unsupported_inference` | PASS | validator 未发现无 reasoning/evidence 的 inference |
| 11 | `internal_timestamp_bounds` | PASS | unit ranges 与 frame times 均在媒体范围内 |
| 12 | `internal_process_dependencies` | PASS / N/A | candidate 未声明 procedural unit；这是 deterministic N/A，不替代独立策略依赖评估 |
| 13 | `coverage_matrix` | **FAIL** | 30 个 relationship evidence refs 与 1 个 question evidence ref 错把 `KU-xx` 放入 `evidenceRefs` |
| 14 | `internal_meta_gate` | PASS | candidate internal meta closure 无声明缺口 |
| 15 | `eval_critical_question_recall` | PASS | 15/15 = 1.000，阈值 ≥ 0.85 |
| 16 | `eval_evidence_coverage` | PASS | 24/24 = 1.000，阈值 ≥ 0.90 |
| 17 | `eval_unsupported_inference` | PASS | 0/25 = 0.000，阈值 ≤ 0.05 |
| 18 | `eval_timestamp_accuracy` | PASS | 24/24 = 1.000，阈值 ≥ 0.90 |
| 19 | `eval_process_dependency_completeness` | PASS | 19/19 = 1.000，阈值 ≥ 0.85；按策略关系评估，适用 |
| 20 | `eval_unknown_discipline` | **FAIL** | 12/14 = 0.857，阈值 ≥ 0.90 |
| 21 | `eval_unchecked_channels` | PASS | 0 个 unchecked available carriers |
| 22 | `eval_meta_gate` | PASS | 未发现整类 unguarded carrier、meaning change 或 relationship |

## Independent GATE counts

- Critical-question recall：15/15。独立审计的承诺、行业前提、生意公式、两条路径、例子链、内容形式、证据边界与开闭场问题均得到回答或正确 abstention。
- Evidence coverage：24/24。独立 core units 均有 candidate 对应项与有效证据；不受 candidate 自己的 importance 标签影响。
- Unsupported inference：0/25。计数范围为 27 个 knowledge units 中除 2 个 unknown 外的 25 个 positive units。
- Timestamp accuracy：24/24。逐个审计 core unit 检查 candidate 对应时间窗与引用。
- Process dependency completeness：19/19。本片不是操作演示，但 19 个策略组成/顺序/映射/全局关系均适用且被覆盖。
- Unknown discipline：12/14。缺失 `UNK-07`（首批买家的实际寻找与触达路径）和 `UNK-14`（失败案例、不适用人群、失败条件/反例）。
- Unchecked channels：0。
- Independent meta-gate：PASS。最终冲突清单虽漏列三项，但协议确实检查了烧录字幕通道并恢复/保留了相关语义边界，因此不是整类漏检。

## Required repairs

1. 修正 `coverageMatrix.relationships[*].evidenceRefs` 和 `criticalQuestions[*].evidenceRefs`：删除所有 `KU-xx`；知识单元关联只写入 `unitIds`，evidence refs 仅保留 canonical 可解析的 cue/shot/frame/targeted/OCR/source ids。
2. 明确登记 `UNK-07`：视频没有给出首批买家的搜索、筛选、联系和触达路径；绑定 24.665–64.860 秒及相关字幕、烧录字幕、白板、手势检查范围。
3. 明确登记 `UNK-14`：全片未展示失败案例、反例、不适用人群或失败条件；该缺席不能被扩写为方法普适。
4. 为完整追溯补列 `CC-02`、`CC-04`、`CC-08` 三项 carrier conflict。此项不改变当前两个 hard-gate failure，但能补强冲突报告。

完成 1–3 后，必须重新进行独立 evaluation 并重跑 canonical validator；不能仅手改 `gate-report.json`。
