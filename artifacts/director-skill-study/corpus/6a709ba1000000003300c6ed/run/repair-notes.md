# Candidate repair notes

依据独立审计与 discrepancies，只修改本 `run/` candidate；未修改 `review/audit`、`review/evaluation` 或 Skill。

- 删除对低置信 OCR `832.7万` 的事实确认。候选现在只记录“下方面板有小数字”，准确文字、指标、来源和含义均未知；不再用 OCR 行作为该事实的证据。
- 新增约 4.5–5.25 秒平台/账号标记在上方角落出现/位置变化，同时分屏比较继续的知识单元描述、意义变化覆盖和关系 `appears_while_comparison_persists`。
- meta-gate 明确覆盖叠层变化及低置信小数字边界。
- `origin: none`、零 cues、空 cue accountability 保持不变；未生成逐字稿。

验证：重建重新生成后执行 probe/protocol/reconstruction/OCR schema validation。
