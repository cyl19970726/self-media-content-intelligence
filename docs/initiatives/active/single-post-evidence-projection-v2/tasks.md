# Single Post Evidence Projection V2 — 实施计划

- [x] 1. 建立 canonical 帖子读模型
  - 扩展 VideoResearch 合同，加入三轴质量状态、来源 lineage 和 quality findings。
  - 保持 legacy/next-wave adapter 的兼容默认值。
  - _Requirements: R1, R2_

- [x] 2. 投影真实三镜头 Artifact
  - 读取 runtime three-lens evaluation/gate。
  - 映射 19 项规则、Evaluator metadata 与 evidence refs。
  - 删除 `visualReady=false` 等页面侧推断。
  - _Requirements: R2, R3_

- [x] 3. 完善证据导航与结构化页面
  - 增加 Truth Strip、findings ledger 和 Wiki 资格。
  - article 改为可选阅读视图。
  - 扩展 cue/frame/knowledge/OCR/shot 引用索引。
  - _Requirements: R1, R3, R4, R7_

- [x] 4. 统一 creator synthesis coverage
  - 提取唯一 policy，删除三份重复实现。
  - 同时计算 provisional/formal eligibility 与各质量计数。
  - 修复 bounded gap 对 verified 状态的兼容。
  - _Requirements: R5, R6_

- [x] 5. 接入 Creator Dossier
  - 单博主作品明确展示 build/evaluation/promotion。
  - 暂定资格可见但不写正式 Wiki。
  - 正式 synthesis 继续只由 formal eligibility 触发。
  - _Requirements: R5, R6_

- [x] 6. 真实样本与发布验收
  - 覆盖三条当前真实视频及 legacy adapters。
  - 验证桌面/窄屏、证据跳转和状态文案。
  - 运行完整仓库验证。
  - _Requirements: R7_
