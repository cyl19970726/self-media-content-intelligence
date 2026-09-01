# Requirements

## 问题

运行库当前包含 19 个 run、14 个唯一博主。5 个博主同时拥有旧版 ready run 与更新但未完成的 run。简单按更新时间展示会让失败刷新遮住 last-good 证据，并产生 `reviewable + action=none + terminal=false` 的悬空状态。

## 需求

### R1 — 每个博主只有一个权威 run

当系统列出研究任务时，系统应按 creator identity 分组，并标识唯一 canonical run。存在 ready run 时，最近的 ready run 应成为 canonical；否则最近 run 成为 canonical。

### R2 — 刷新候选不得覆盖 last-good

当较新的非 ready run 与 canonical ready run 并存时，系统应把新 run 标记为 candidate，并继续使用 canonical ready run 服务博主档案。

### R3 — 历史 run 明确终止

当 run 既不是 canonical 也不是更新候选时，系统应将其投影为 superseded terminal record，并标识替代它的 run。

### R4 — 所有非完成状态都有解释

当 run 不可继续自动执行时，系统应把它归入 active、actionable、waiting_external、provisional 或 failed_terminal，不得留下 `action=none` 且无等待原因的非终态。

### R5 — 不盲目重试

当 Provider 已恢复过一次仍不可用时，系统不得继续提供无界重试；当视频已有 Builder 产物但缺少正式评估时，系统应关闭为 provisional，而不是伪装 ready。

### R6 — 工作台以博主为中心

当用户查看任务账本时，系统应优先展示每个博主的 canonical 状态、last-good 和候选刷新；历史 run 应可追溯但不与主状态竞争。

## 非目标

- 本阶段不新增博主。
- 不自动重跑 12 条视频。
- 不删除或重写历史 run、Artifact 或 Git 历史。
- 不把 provisional 结论写入正式 Wiki。
