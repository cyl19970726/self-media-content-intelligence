# Video Builder Fast Path V1 — 实施计划

- [x] 1. 建立诚实的 Builder / Evaluator 合同
  - 增加 `built_unevaluated` 与 `verified` 状态及批计数。
  - 保持旧 `readyPosts` 为 verified 兼容投影。
  - 明确 Builder-only 不得晋升 Wiki。
  - _Requirements: R1, R2_

- [x] 2. 实现显式 Builder 运行配置
  - 默认 `gpt-5.6-terra` + `medium`，不继承全局模型。
  - 增加 `skip | single_pass` 评估策略。
  - 增加有边界的 session sample 保留开关。
  - _Requirements: R2, R5_

- [x] 3. 实现 Builder 确定性校验与快速产物合同
  - 校验 Schema、Artifact 引用、媒体 SHA 和必需通道。
  - 快速模式延迟 article/run-notes，不伪造评估产物。
  - _Requirements: R1, R2, R4_

- [ ] 4. 优化媒体预检、缓存和证据预算
  - Worker 启动时解析 Whisper/OCR/媒体探测能力。
  - 按媒体 SHA 复用探测、转写与基础证据。
  - 对完全相同/近似帧去重，同时守住时间线与语义覆盖下限。
  - _Requirements: R3_

- [ ] 5. 改造批处理、综合分析和工作台
  - 展示 built/verified/running/queued/failed 与模型、角色、进度。
  - Builder-only 进入显式 provisional 投影；正式知识仍要求 verified。
  - 纠正 pipeline 中 Evaluator 的 Skill 归属。
  - _Requirements: R1, R5_

- [x] 6. 验证排空、恢复与产品完整性
  - 测试 stopAndWait 不补领新任务、租约恢复和幂等注册。
  - 跑类型、测试、lint、build、文件行数与前端响应式验证。
  - _Requirements: R5, R6_

- [x] 7. 安全重启 Worker
  - 排空当前 3 个 Builder，不中断现有 Artifact。
  - 先以 1 槽跑 2 个视频并记录耗时/覆盖/缓存。
  - 通过 gate 后恢复 3 槽继续队列。
  - _Requirements: R6_

当前未完成边界：任务 4 的跨视频媒体 SHA 缓存和近似帧去重仍待单独实现；任务 5 已完成 built/verified 工作台投影，但 provisional 博主综合尚未接入正式 synthesis。

- [x] 8. 实现 Host 确定性组装
  - 从 evidence pack 恢复不可变 transcript、代表帧与 overlapping shots。
  - 规范化载体兼容字段、Meta Gate ID 和 OCR 执行状态，不修改语义结论。
  - 将可确定组装错误与真正的 Builder 语义失败分开。
  - _Requirements: R1A, R3_

- [x] 9. 将 Evaluator 失败改为可用 findings
  - single-pass 评估通过时返回 verified。
  - 评估未通过时返回工作台可用结果和 `qualityWarningGateIds`，不得返回 not_ready。
  - 保持正式 Wiki 只接受 verified。
  - _Requirements: R1, R2_

- [x] 10. 三视频完成性验收
  - [x] 回归测试 Host 组装、状态迁移和候选指纹边界。
  - 重新运行 3 条代表性视频，要求 3/3 形成工作台可用结果。
  - 至少保留一条 evaluated-with-findings，证明没有伪造 verified。
  - _Requirements: R6_

验收结果（2026-09-01）：3/3 均形成 `evaluated_with_findings`，Evaluator 分别耗时约 253s、225s、212s；没有候选被退回 `not_ready`，也没有结果被虚假晋升为 `verified`。保留一条非 ephemeral 教程片 trace 后，运行合同改为直接读取唯一规则文件、总览使用 high detail、仅在关键问题未闭合时打开原图；优化后复跑耗时 213.5s，与同片优化前保留 trace 的 207.6s 基本持平，因此不宣称显著提速。主要时间下限来自 23 个通用 gate 与 19 个三镜头判断，当前策略保持 Builder 全量、Evaluator 可选。Evaluator 自身失败现在保留为 `built_unevaluated + evaluationMode=failed`，Evaluator Prompt/Skill/Schema 的合同指纹变化会自动使旧评估失效。
