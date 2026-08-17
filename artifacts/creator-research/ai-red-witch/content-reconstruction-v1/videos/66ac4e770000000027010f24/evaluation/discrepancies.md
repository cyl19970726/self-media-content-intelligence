# Discrepancies：66ac4e770000000027010f24

## D-01 — 高：遗漏画面内部的两项直接反例

**candidate：** KU-11/KU-12 与 report.md 认为“全面碾压”不能成立，理由主要是表格选取性、方法条件缺失、无 GPT-4 列、无多模态实测和无真实任务套件。

**evidence/audit：** TARGET-0023@31.2s 的 Qwen2-72B-Instruct / Llama3-70B-Instruct 表中，MBPP 为 80.2 / 82.3，GSM8K 为 91.1 / 93.0。两行都由 Llama 3 胜出。

**影响：** candidate 得出了方向正确但证据层级偏弱的结论。这里不是“尚不足以证明全面胜出”，而是视频自己的表格已经直接给出反例。该遗漏计入 critical-question recall 与 evidence coverage，并触发 meta-gate 的关系遗漏。

## D-02 — 高：把不同规模的比较表压成错误模型组合

**candidate：** KU-10 与 report.md 写成“Qwen2-72B-Instruct、Llama3-70B-Instruct、GLM4-9B-Chat”的主要数值对照。

**evidence/audit：** TARGET-0023 上方 72B 表三列是 Qwen2-72B-Instruct、Llama3-70B-Instruct、Qwen1.5-72B-Chat；下方小模型表才是 Qwen2-7B-Instruct、Llama3-8B-Instruct、GLM4-9B-Chat。

**影响：** 模型身份与数值归属被跨表混接。该项计为 1 个 unsupported positive claim，并计入 evidence coverage 缺口。

## D-03 — 中：遗漏 57B-A14B 与“双口径并存”

**candidate：** KU-07/report.md 只写四个尺寸：0.5B、1.5B、7B、72B。

**evidence/audit：** DENSE-0012@16.5s 的页面说明并列五个尺寸：0.5B、1.5B、7B、57B-A14B、72B；后续规格卡则只展示四列。

**影响：** “模型家族列表”和“四列规格卡”被压成单一口径，57B-A14B 消失。该项计入 evidence coverage 与 meta-audit 的意义/口径关系遗漏。

## D-04 — 中：音频载体被声明已检查，但只完成振幅检查

**candidate：** coverageMatrix 将 CAR-07 `available=true, inspected=true`，同时称非语音角色语义未解。

**inspection：** `audio-silence-inspection.txt` 只用 -45 dB 阈值确定 63.689s 后长静音，并明确声明不能识别音乐、音效、说话人或非静音区间语义。

**影响：** 这是典型的验收范围错配：振幅检测能证明静音区间，不能证明非语音音频已经被语义检查。uncheckedChannels 必须非空，meta-gate 失败。

## D-05 — audit 修正：HumanEval 第三个反例是误读

**audit：** 把小模型表 HumanEval 写成 Qwen2-7B-Instruct 79.9、Llama3-8B-Instruct 82.2，并据此判为 Llama 3 胜项。

**source evidence：** TARGET-0023 与 DENSE-0022 显示该行实际为 79.9 / **62.2** / 71.8；82.3 出现在上方 72B 表的 MBPP 行，并非小模型 HumanEval 的 Llama 值。

**处理：** 不把这项 audit 错误算作 candidate 漏项。可确认的 Llama 3 反例保留为 MBPP 与 GSM8K 两项。

## 一致项

- candidate 与 audit 都正确判定：没有 Qwen2/GPT-4 同题实测、GPT-4 版本、统一参数、评分或成本基线。
- 都正确区分：代码生成文本不等于执行成功；双栏回答不等于已有胜负。
- 都正确捕获：72B 的 Qianwen License 例外、部署成本未知、社媒/采用规模边界、评论区打包物边界。
- 都正确保留：静音尾段、黑屏与迟到 Qwen2 规格卡。
