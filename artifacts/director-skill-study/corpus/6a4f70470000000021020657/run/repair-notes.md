# Repair notes — 6a4f70470000000021020657

依据独立审计反馈，仅修复 candidate `run/`；未修改 `review/audit/`、`review/evaluation/` 或 canonical Skill。

## 补回的内容

- 新增 `A-10` 目标取证，补抓开场社会证明指标拼贴与结尾身份句。
- 重建开场可见数字，并明确其账号归属、采集时间、指标口径及与所授能力的关联均未知。
- 保留持续水印“人类最强编导”、结尾烧录字幕“我是人类这样编导”与原 SRT“人类最强编导”的载体冲突。
- 修复 `KU-07/CUE-042` 时间越界：批评机械深拆与后段“少拆多刷”训练分别由不同知识单元承载。
- 补全省略详细脚本的未知例外：协作交接、安全、预算及复杂拍摄。
- 补全有效浏览与浅层消费的边界未知。
- 补全推荐流干预依赖：具体互动、时间、账号状态及平台行为。
- 补全训练效果评估链：基线任务、可重复练习、输出评价标准、训练后测量。
- 补全快速素材检索的索引依赖与负责任追热点的操作测试依赖。
- 为字幕冲突 `system_inference` 增加逐项比较 reasoning，消除 `inference_without_reasoning_or_evidence`。

## 验证

- schema：`probe`、`protocol`、`reconstruction`、`ocr` 全部通过。
- 54/54 cue accountability；23 knowledge units，其中 13 core。
- 72 targeted frames；889 OCR lines；0 OCR failure。
- evidence refs 全部可解析；知识单元证据时间均落在声明范围内。
- 未生成或覆盖独立 `evaluation.json` / `gate-report.json`。
