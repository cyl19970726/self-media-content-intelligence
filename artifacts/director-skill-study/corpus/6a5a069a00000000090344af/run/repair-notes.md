# Repair notes

本轮仅修改 `run/` candidate；未修改 `review/audit`、`review/evaluation` 或 canonical Skill。

## 已修复

- 在协议末尾新增 `ACT-09`，精确捕获 169.73–175.05 秒；目标证据由 73 帧增至 79 帧，OCR 79 帧全部成功。
- 连续目标帧与高置信 OCR 明确恢复：“第八 起号是一夜之间 / 不是日积月累”（`TARGET-0075`、`OCR-00212`、`TARGET-0079`、`OCR-00224`），并与 SRT“喜好是一夜之间”并存。
- 将第八条拆成前提 `KU-10`（作者的一夜起号主张）与结论 `KU-19`（低数据不要坚持、应换方向），新增 `author_premise_supports_conclusion` 关系；不把该主张升级为平台事实。
- 修正清单结构 `KU-15`：第一至第九加“最后”形成十个意义段落闭环，不再错误声称第八编号缺失。
- 为 `KU-11` 的 `system_inference` 增加显式 `reasoning`，说明投入强度与方向选择是不同约束；第六条反讽保持不变。
- 移除 `KU-10` 越界的第九条 OCR 引用；所有第八条 frame/OCR 均落在单元 169.73–175.05 秒范围内。
- 更新 probe/protocol、cue accountability、meaning-change/critical-question coverage、unknowns、article 与 meta-gate；`uncheckedChannels` 为空。

## 验证

- canonical `validate-schemas.py`：probe、protocol、reconstruction、OCR 全通过。
- 使用原独立 evaluation 运行 deterministic validator 时，candidate 的内部机器门全部通过；仅原 evaluation 中尚未复审的 `eval_unchecked_channels` 与 `eval_meta_gate` 保持失败，未篡改该独立结果。

## 保留未知

- “一夜起号”的定义、数据阈值、观察窗口、成功率和适用范围。
- 手写本全文、平台机制/参数、营收阈值依据、兼职路径、招聘标准、人物身份/授权和非语音音频作用。
