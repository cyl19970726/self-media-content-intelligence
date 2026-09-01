# Implementation Plan

- [x] 1. 扩展 creator operation 合同
  - 加入 authority、resolution、canonical 与 last-good 引用。
  - _Requirements: R1, R2, R4_

- [x] 2. 实现全局 run authority 投影
  - 按 creator 分组，选择 canonical/candidate/superseded。
  - 消除 reviewable + none 的悬空状态。
  - _Requirements: R1, R2, R3, R4, R5_

- [x] 3. 修正 Creator Dossier last-good 选择
  - canonical creator 路径优先 ready synthesis。
  - 显式 run 检查保持可用。
  - _Requirements: R2, R3_

- [x] 4. 重构任务账本
  - 每个博主一个主记录，candidate 与历史 run 分层展示。
  - _Requirements: R6_

- [x] 5. 真实运行库验收
  - 核对 19 run / 14 creator 无悬空状态。
  - 运行整仓验证与浏览器验收。
  - _Requirements: R1-R6_
