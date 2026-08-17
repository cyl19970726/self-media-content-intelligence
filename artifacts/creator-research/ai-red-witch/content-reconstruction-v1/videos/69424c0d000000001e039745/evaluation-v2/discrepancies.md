# 69424c0d000000001e039745 修复后差异与闭包审计

本文件只把旧 `evaluation/discrepancies.md` 当作修复目标清单，并使用当前新 evidence、当前修复后的 `skill-run` 与独立 `audit` 全新核对；没有继承旧判决或分数，也没有修改 candidate。

## 旧差异闭包

| 旧项 | 状态 | 当前证据与判定 |
|---|---|---|
| D-01 — 诊断式 UI 框架及其与免责声明的张力 | **CLOSED** | `KU-36` 逐字保留“补充健康史 获得更精准诊断”和“AI诊室•问诊中”；`REL-16` 连接 `KU-36 → KU-25`，并以 `OCR-00223`、`OCR-00720`、`OCR-00740`、`OCR-00819` 直接支撑诊断式命名与仅供参考/及时就医边界。文章也单列该张力。 |
| D-02 — 付费/赞助/控制关系未知 | **CLOSED** | `KU-37` 明确写“是否为付费广告：未知”，并逐项保留报酬、赞助、联盟/引流利益、品牌批准/预审、编辑/创意控制未知；`REL-17` 将品牌集中呈现与商业关系未证相连。 |
| D-03 — 开场 OCR-only 恢复状态 | **CLOSED** | `KU-35` 记录“大学生脑血栓已取出／能活动，正在恢复中”，引用 `TARGET-0009`、`OCR-00047/00048` 与 `SRC-CROP-OPENING`，并明确其为未经允许证据认证的新闻式屏幕主张。文章同步保留。 |

## 新阻断项

### V2-01：非语音音轨仅确认技术存在，却被宣告为已检查

- 级别：**blocking / unchecked channel / meta-gate**
- 位置：`probe.json` 的 `CAR-12`；`capture-protocol.json` 的 `ACT-12-NON-SPEECH-AUDIO-DECISION`；`reconstruction.json` 的 `KU-33`、`coverageMatrix.channels` 与 `metaGate`。
- 现状：action 只按五个时间点输出静态帧；唯一结构化依据是媒体有 AAC 44.1kHz stereo 音轨。没有聆听记录、语义音频模型输出、音频片段证据、转折窗口或对背景音乐/音效/静音的实际观察。
- 为什么失败：codec/stream 元数据只证明音轨存在，不能检查音轨承载的内容。把所有语义角色写成 unknown 后再自报 `inspected=true`，是 fake-position + self-proof 空转闸。
- 修复要求：实际检查非语音音轨；覆盖全时轴和可能的语义转折，记录音乐、音效、静音或无法辨识的有界观察；附可审计的音频窗口/模型结果/人工聆听记录及限制。随后再由独立 evaluator 判定是否仍有未检查载体。
- 验收：不能只引用 evidence-pack 媒体元数据或静态帧；必须存在针对声音内容本身的证据，且 `CAR-12 inspected=true` 能被独立证伪或复核。

### V2-02：coverageMatrix 的关系证据引用违反确定性契约

- 级别：**blocking / deterministic coverage contract**
- 位置：`reconstruction.json` 的 `coverageMatrix.relationships[].evidenceRefs`。
- 现状：`REL-01`、`REL-02`、`REL-11`、`REL-13`、`REL-16`、`REL-17` 把共 10 个 `KU-*` 值放进 `evidenceRefs`。
- 为什么失败：canonical `validate-reconstruction.mjs` 在该字段只解析 cue、shot、frame/targeted frame、OCR 和 source 引用；知识单元 ID 不是 evidence ref。底层 `relations[]` 虽有直接证据，但 coverageMatrix 仍会报 `relationship_evidence:*:KU-*`。
- 修复要求：`coverageMatrix.relationships[].evidenceRefs` 只保留可直接解析的 evidence ID；若需表达对应知识单元，使用 schema 允许的映射字段或依赖底层 `relations[]` 的 `from/to`，不要把 KU ID 冒充 evidence。
- 验收：canonical deterministic validation 的 `coverage_matrix` 通过，且不删减实际关系或直接证据。

### V2-03：三个知识单元含跨时段直接证据引用

- 级别：**blocking / deterministic timestamp contract**
- 位置：`KU-25`、`KU-28`、`KU-36`。
- 现状：`KU-25`（49.667–96.5 秒）和 `KU-36`（40.0–56.667 秒）引用约 0 秒的 `OCR-00006`；`KU-28`（101.19–103.76 秒）引用约 38.733 秒的 `TARGET-0036`。
- 为什么失败：这些远端证据对跨段关系有意义，但被放进单元的直接 evidence 数组后超出该单元声明的时间范围。canonical deterministic validation 报 `internal_timestamp_bounds` 失败。
- 修复要求：拆分跨段关系、合理扩展单元范围，或把远端证据保留在关系项而非局部单元的直接证据中；必须继续保留“免责声明限制诊断措辞”和“敏感字段使隐私承诺具有决策意义”的关系。
- 验收：`internal_timestamp_bounds` 通过，且上述跨段意义关系仍有直接可解析证据。

## 非阻断残余

### V2-04：一个 audit unknown opportunity 未单独表述

Audit 明列“开场旁白是否准确转述医生或记者”为未知。Candidate 已保留报道来源、真实性、病例证据和因果边界，但没有把这一项单独写出。故 unknown discipline 为 12/13（0.923），仍通过 0.90 阈值。若再修复，可在 `KU-01/KU-04` 的 unknowns 中明确加入该项。

## 总结

旧 D-01、D-02、D-03 已全部闭合；当前仍有一个未真正检查的可用载体，以及 coverage 与 timestamp 两类确定性契约错误。硬 GATE 因 V2-01 失败，JUDGE 不执行；本文件不作下游 READY 声明。
