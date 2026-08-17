# 6784e718000000000b0227d9 独立 GATE/JUDGE 评估

## 结论

**硬 GATE 未通过。** 内容层面的六项计数闸均达到阈值，但 `uncheckedChannels` 与独立 meta-gate 失败。由于硬闸未全过，本轮不执行实质 JUDGE；`evaluation.json` 中五个 `1` 仅为 canonical schema 要求的占位哨兵，不是质量分，也不能抵消硬闸失败。

本评估只读取该视频的新 `evidence/`、`skill-run/` 与 `audit/`。未读取旧 reports、analysis、library 内容结论或其他评测，也未修改 candidate。

## GATE

| GATE | 结果 | 计数 | 阈值/理由 |
|---|---|---:|---|
| Critical-question recall | PASS | 11/11 | 1.000 ≥ 0.85 |
| Evidence coverage | PASS | 11/11 | 1.000 ≥ 0.90 |
| Unsupported inference | PASS | 0/22 | 0.000 ≤ 0.05 |
| Timestamp accuracy | PASS | 11/11 | 1.000 ≥ 0.90 |
| Process dependency completeness | PASS | 6/6 | 1.000 ≥ 0.85 |
| Unknown discipline | PASS | 12/13 | 0.923 ≥ 0.90 |
| Unchecked channels | **FAIL** | 1 | 必须为 0 |
| Meta-gate | **FAIL** | — | 找到未闭合的可用载体 |

内容重建的关键判断与独立审计高度一致：它保留了“不到 10 秒”和“免费”等作者主张；正确指出剪辑后的约半秒加载画面不能证明真实耗时；识别输入日期 `2024/12/3` 与结果日期 `2024/12/24` 的冲突；并把修改、高清、Logo、模板、AI 应用开发与导出都限制在“入口/表面可见，执行结果未知”。

## 硬闸失败：非语音音频被假闭合

候选把 `CAR-07 non-speech audio` 标为 `available=true, inspected=true`，并在自评 meta-gate 中称该通道“没有被遗漏”。但它自己的 `capture-protocol.json` 显示 `ACT-11` 的模式是 `exact_times`，`targeted-evidence.json` 进一步显示该动作只生成 `TARGET-0126` 至 `TARGET-0132` 七张 JPEG 静帧。

静帧不能检查音乐、音效或其他非语音音频。`audit/` 也没有提供该通道的听审结论。因此这里不是“检查后合理保持 unknown”，而是“未用可检查该载体的方法，却自证为已检查”。按 canonical protocol，必须把该通道列入 `uncheckedChannels`，独立 meta-gate 同时失败。

## 其余差异

独立审计明确把“视频录制日期”列为未知条件；candidate 保留了相邻的平台、端、版本、账号、地区、额度与模型边界，但没有明确点名录制日期。因此 unknown discipline 记为 12/13，仍高于 0.90 硬阈值。

## JUDGE

未执行。硬 GATE 失败后，readability、knowledge prioritization、evidence usefulness、execution value 与 compression without loss 均不评分。

逐项修复要求见 `discrepancies.md`；机器可读计数、判定与证据见 `evaluation.json`。
