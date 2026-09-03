# 单帖三镜头 V2 · 实施计划

- [x] 1. 固化目标与隔离环境
  - 创建 GitHub Issue #64。
  - 从 `origin/main` 创建独立 worktree 和 `codex/video-reconstruction-three-lens-v2` 分支。
  - _Requirements: R1–R8_

- [x] 2. 审计现有 Skill、Schema、Host、Worker、Reader 与页面链路
  - 标出 V1 的事实来源、兼容投影和旧状态泄漏点。
  - 建立将被修改文件与测试的最小集合。
  - _Requirements: R1, R2, R6, R7_

- [x] 3. 实现 V2 三镜头 Contracts
  - 增加三镜头 Builder Schema 与多模态 Block。
  - 保留 V1 Reader，并建立显式版本分流。
  - 增加 Schema fixture 与正反例测试。
  - _Requirements: R1, R3, R4, R5, R6_

- [x] 4. 升级 Skill 与 Builder operator
  - 把“一轮共同发现、二轮合并取证、三镜头分别生产”写入正式合同。
  - 防止三个镜头重复运行媒体工具和重复读图。
  - _Requirements: R1, R2, R3, R4, R5_

- [x] 5. 实现合并定向采集
  - 合并等价采集请求并保留消费者镜头。
  - 支持关键帧、裁切、前后对比和连续帧条。
  - _Requirements: R2, R3_

- [x] 6. 实现 Builder 三镜头确定性校验
  - 分别实现内容、编导、画面剪辑 Gate。
  - 缺失、伪填充、不可解析证据和错误状态必须失败。
  - _Requirements: R4, R5, R6_

- [x] 7. 实现 API V2 投影和旧 Artifact 兼容
  - V2 直接读取三镜头；V1 保持真实 partial/missing。
  - 修正持久化旧 `ready` 与当前三镜头 Gate 冲突。
  - _Requirements: R6, R7_

- [x] 8. 实现多模态单帖报告
  - 先完成八类内容 Block 组件和图文长文布局。
  - 重组页面信息层级，并默认折叠底层报告、图库和文字稿。
  - 对 Builder-only、findings、verified 和 legacy 缺失态进行视觉验收。
  - _Requirements: R3, R7_

- [x] 9. 运行两条开发视频
  - 赛博鸭 `67b012c40000000017038a99`。
  - AI红发魔女 `69424c0d000000001e039745`。
  - 根据真实结果局部修复合同、实现和 Prompt。
  - _Requirements: R8_

- [x] 10. 冻结合同并运行 Holdout
  - 不向 Builder 提供旧报告作为 ground truth。
  - 运行人类最强编导 `6a3ba6950000000007027cc5`。
  - Builder 稳定后，对三条各运行一次独立 Evaluator。
  - _Requirements: R6, R8_

- [x] 11. 质量、耗时与 session forensics
  - 输出阶段耗时、重复采集、图片数量、修复次数和镜头 Gate。
  - 审核 Trace，优化重复读取、重复 OCR、重复推理和过量图片。
  - _Requirements: R8_

- [x] 12. 完整验收与 PR
  - 运行文档、仓库、Artifact、类型、测试、Lint、Build 和入口冒烟检查。
  - 确认所有代码文件不超过 1000 行。
  - 更新 Issue，提交 PR 并附真实回归证据和剩余未知。
  - _Requirements: R1–R8_
