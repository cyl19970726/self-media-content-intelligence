# 6784e718000000000b0227d9 差异清单

## D-01 — 非语音音频通道未被实际检查（硬 GATE）

- 严重性：阻断。
- 审计依据：`evidence-pack.json` 确认媒体存在 AAC 音轨；canonical evaluation 要求可用载体不能留作 unchecked。
- candidate 声明：`probe.json` 的 `CAR-07` 和 `reconstruction.json.coverageMatrix` 把非语音音频标为 available/inspected；`metaGate.pass=true` 并称该通道已经登记为有界 unknown。
- 反证：`capture-protocol.json` 的 `ACT-11` 使用 `exact_times`；`targeted-evidence.json` 显示其产物只有 `TARGET-0126..TARGET-0132` 七张 JPEG 静帧。没有波形、音频分段、听审账本、音频分类或其他音频派生证据。独立 `audit/` 也没有给出非语音音频结论。
- 为什么失败：记录“有音轨”只检查了容器元数据；用视频帧不能检查声音语义。把这一动作算作 `inspected=true` 是空转闸/自证闸。
- 最小闭合动作：对 0—48.667 秒音轨做一次真实可听检查，至少记录音乐、音效、静音/无明显非语音事件及其时间窗；如工具能力不足，则诚实保留 `CAR-07 inspected=false` 并列入 `uncheckedChannels`，不能让 meta-gate 通过。

## D-02 — “视频录制日期”未知未被明确保留（非阻断）

- 严重性：轻微；unknown discipline 为 12/13，仍通过阈值。
- 审计依据：`audit.json.unknownConditions` 明确要求保留平台/应用/模型/版本以及视频录制日期未知。
- candidate 现状：已列出端、URL、版本、账号、地区、免费额度、模型等未知，但 `declaredUnknowns`、`knowledgeUnits` 与最终 `report.md` 均未明确写出视频录制日期未知。
- 最小闭合动作：在复现条件 unknown 中加入“视频录制日期及当时的平台/应用/模型版本未建立”，避免读者把演示状态误解为当前可用状态。

## 已正确闭合、无需改动的关键项

- “不到 10 秒”仅为作者主张，剪辑后的加载段不能作为真实计时。
- 输入 `2024/12/3` 与结果 `2024/12/24` 的日期冲突已被发现并保留。
- 修改、高清、Logo、模板复制、AI 应用开发与导出均未被升级成已完成事实。
- SRT 的 `coz` 与烧录字幕“扣子”冲突被保留，且没有外推外部品牌关系。

本清单只给出评估差异，不修改 candidate，也不宣布任何 READY 状态。
