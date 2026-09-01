# Creator Run Authority — Wave 1

Issue: [#43](https://github.com/cyl19970726/self-media-content-intelligence/issues/43)

目标：把“历史执行记录”与“当前可用博主档案”分开。每个博主只拥有一个 canonical run；新刷新失败时继续服务 last-good 证据，同时把候选刷新、外部等待、暂定关闭和历史替代状态明确展示。

- [需求](requirements.md)
- [设计](design.md)
- [实施任务](tasks.md)

## Wave 1 验收记录

- 19 个 run 被归并为 14 个 canonical creator，5 个较新但未完成的 run 作为刷新候选保留。
- canonical creator 路径优先读取最近 ready Artifact；显式 run 路径仍可检查候选证据。
- 木子不写代码、李继刚与巨构 AI 在一次有界恢复后关闭为 provisional，不继续无界重试。
- 巨构 AI 本轮 12 条样本中 10 条 Builder 结果通过结构化接收，2 条因 Builder 完整性 gate 保持 `not_ready`。
- 3 个 Provider 故障任务进入 `waiting_external`，不再重复消耗请求。
- 浏览器验收确认 14 个权威版本、5 个刷新候选、无前端运行错误；整仓 `npm run verify` 通过。
