# 修复后独立复评 — 6784e718000000000b0227d9

## 结论

**硬 GATE：FAIL。** 修复后的候选已经在内容上真正闭合非语音音频通道，六个计数/比率闸、零未检查载体闸和独立 meta-gate 也都通过；但 canonical deterministic validator 的 22 项检查只通过 20 项：

1. `CAR-07` 的 modality key 写成带空格的 `non-speech audio`，未被 validator 识别为显式非语音音频 token，触发 `full_timeline_carrier_sweep` 失败；
2. `KU-25` 的时间范围是 `44.12—46.36`，却引用开场帧 `TARGET-0003`，触发 `internal_timestamp_bounds` 失败。

因此，JUDGE 分数只描述当前产物质量，不能抵消硬闸失败。本复评不修改 candidate，也不宣布任何 READY 状态。

## 评估边界

本轮只读取新 `evidence/`、当前修复后的 `skill-run/`、独立 `audit/`、旧 `evaluation/discrepancies.md` 的修复目标，以及 canonical evaluation protocol/schema 与 evaluator-design GATE 规则。未读取旧 evaluation 的结论或分数、旧 reports/library 内容结论、其他候选或其他 evaluation。

评估顺序严格为 **GATE → JUDGE**。候选自报的 `metaGate.pass=true` 没有被当作独立通过依据。

## GATE

| GATE | 计数 | 阈值 | 结果 | 独立判定 |
|---|---:|---:|---|---|
| Critical-question recall | 11/11 | ≥ 0.85 | PASS | 审计的耗时、身份、日期冲突、编辑顺序、修改、高清、Logo、模板、开发、导出、免费均被回答或正确保留为未知。 |
| Evidence coverage | 11/11 | ≥ 0.90 | PASS | 11 项审计核心核查均有可解析 cue、shot、targeted frame、OCR 或源音频证据。 |
| Unsupported inference | 0/23 | ≤ 0.05 | PASS | 23 个正向知识单元未发现无证据升级；营销主张与视频可证事实分离。 |
| Timestamp accuracy | 99/100 | ≥ 0.90 | PASS（比率） | 唯一错误是 `KU-25` 把开场 `TARGET-0003` 放进 `44.12—46.36` 的单元范围。 |
| Process dependency completeness | 7/7 | ≥ 0.85 | PASS | 入口、输入、参数、生成状态链及后续功能链均被恢复；缺失动作诚实标 unknown。 |
| Unknown discipline | 12/13 | ≥ 0.90 | PASS | 仍漏写“视频录制日期未知”；其余 12 项审计 unknown 已保留。 |
| Unchecked channels | 0 | 必须为 0 | PASS | 源 AAC 已实际检查，非语音音频不再是空转闸。 |
| Independent meta-gate | 0 个未守卫闭包 | 必须为 0 | PASS | 未发现新的未守卫载体、意义变化或关系。 |
| Canonical deterministic contract | 20/22 | 必须全过 | **FAIL** | `full_timeline_carrier_sweep` 因 `non_speech_audio:not_explicitly_inspected` 失败；`internal_timestamp_bounds` 因 `KU-25:frame_outside_range:TARGET-0003` 失败。 |

六个计数/比率门槛全部过线，但确定性契约闸要求逐项全过；所以总 GATE 仍为 FAIL。

## 音频修复的独立闭合检查

旧 D-01 在内容证据层已经闭合。重新从原 MP4 以 stream-copy 抽出的 AAC 与 `skill-run/audio-review/source-audio.m4a` 的 SHA-256 完全一致。五段 PCM 时长分别为 6.720、8.800、10.160、10.640、12.347 秒，首尾无缝覆盖 `0—48.667`。

当前候选不再用静帧、字幕或“存在 AAC 流”冒充音频语义证据；它把源音轨分段后，用两套事件分类与信号检查记录背景音乐、界面段声床变化、短促事件候选和片尾约 0.2 秒静音，并把曲目、许可、精确音效身份与逐帧同步继续保留为未知。这满足可证伪的真实载体检查要求。

## JUDGE

| 维度 | 分数 | 说明 |
|---|---:|---|
| Readability | 5/5 | 结论、操作链、证据边界和 unknown 分层清楚。 |
| Knowledge prioritization | 5/5 | 把“10 秒”不可证、日期冲突和功能未闭环置于中心。 |
| Evidence usefulness | 5/5 | 关键结论能回到明确 cue/frame/OCR/source-audio。 |
| Execution value | 4/5 | 足以指导理解和有限复现，但结构化时间范围错误会让自动门检失败。 |
| Compression without loss | 4/5 | 信息完整且无关键丢失，但篇幅和重复边界说明仍可进一步压缩。 |

## 最小闭合动作

1. 将 `CAR-07.modalityKeys` 增加或改为 validator 可识别的 token（如 `non-speech-audio`），同时保留现有真实音频证据链。
2. 修正 `KU-25` 的时间范围与开场证据不一致：要么把范围扩为覆盖开场到结尾，要么把 `TARGET-0003` 只保留在开闭关系中，不挂在结尾单元内。
3. 明确加入“视频录制日期及其对应的平台/应用/模型版本状态未知”，闭合旧 D-02。

逐项差异与修复状态见 `discrepancies.md`；机器可读计数和判定见 `evaluation.json`。
