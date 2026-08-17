# 修复后差异闭包：6801c0750000000007037156

本文件只把旧 `evaluation/discrepancies.md` 当作修复目标清单，并使用当前新证据、已修复 `skill-run/` 与独立 `audit/` 重新核对；未采用旧评估判决或分数。

| 旧差异 | 状态 | 当前独立证据 | 门禁影响 |
|---|---|---|---|
| D-00 — relationship evidence 引用不满足确定性契约 | **CLOSED** | `reconstruction.json` 的 `coverageMatrix.relationships[REL-01..REL-11].evidenceRefs` 只剩 cue、shot、targeted-frame、OCR 或注册 source ref；没有 `KU-*`。当前 `deterministic-self-check.json` 记录 `coverageMatrixPass=true`。 | 不再造成 coverage-matrix 失败。 |
| D-01 — 非语音音频只确认存在、未检查内容 | **CLOSED** | `audio-evidence/audio-inspection.json` 对 0–29.067 秒完整 AAC 解码，十个连续 3 秒/尾窗覆盖无时间缺口，并映射到六个内容阶段；`KU-19` 记录持续低音量配乐/氛围、末尾重音、动作窗口未检测到步骤性 UI 声，以及机器听检限制。 | `non_speech_audio` 不再是 unchecked channel；音源类型/来源/权属仍正确保留 unknown。 |
| D-02 — 隐私/数据处理边界未明确保留 | **CLOSED** | `KU-15` 和 `article.md` 明确写出：完整 0–29.067 秒检查范围未提供隐私提示或输入内容处理/保存/训练边界，并限定为视频未建立而非现实中不存在。 | Unknown discipline 恢复为 15/15。 |
| D-03 — 前后文本同一性仅被间接约束 | **CLOSED** | `KU-20` 与 REL-11 以 `TARGET-0003`、`TARGET-0012`、`TARGET-0039`、`TARGET-0050`、`TARGET-0055` 建立“同主题、相近四段结构”的剪辑关系，同时明示没有完整逐字展示或 diff，不能确认逐字同一/完整转移。 | 关系表达精度闭合，无新增 unsupported inference。 |

## 额外一致性核对

- WPS 身份仍不构成差异：当前目标帧可见 `WPS AI`，候选只据此写“WPS 文字处理界面”，没有猜测具体版本、账号或文件类型。
- Audit 的 12 类载体与 candidate 的 11 个 carrier row 数量不同，是分组粒度差异：candidate 把 speech/SRT 合并，并把 environment/props 纳入人物与环境载体；实际语义载体均有检查和知识落点。
- 音频中的“未检测到 UI 动作声”严格限定于已解码源音轨、指定动作窗口与机器听检能力，不被写成现实或隐藏制作过程中的绝对不存在。

## 当前剩余差异

未发现会改变本轮硬 GATE 的候选—审计差异。文章相对源视频较长，属于 `compressionWithoutLoss = 4/5` 的质量权衡，不是契约缺口。
