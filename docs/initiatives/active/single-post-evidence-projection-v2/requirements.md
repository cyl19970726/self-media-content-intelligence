# Single Post Evidence Projection V2 — 需求

状态：Confirmed

## 1. 问题

单视频 Builder / Evaluator 已形成稳定 Artifact，但当前实时帖子页面仍自行拼接底层 JSON、硬编码画面评估未完成、依赖延迟生成的 article，并且无法把全部评估发现与证据引用投影到页面。单博主综合又只接受全部 verified 的旧完成条件，导致可用 Builder 结果无法形成明确的 provisional 研究，同时存在三份重复的 coverage 判定。

## 2. 目标

建立一个 canonical `PostEvidenceRevision` 读模型，成为单帖子页面与单博主综合的唯一帖子知识入口；完整区分构建完成度、评估状态与知识晋升资格，并让每条重要结论可下钻到证据。

## 3. 用户故事与验收条件

### R1 — 唯一帖子知识版本

- 当帖子存在 Builder Artifact 时，系统必须从 reconstruction、builder validation、通用 gate、三镜头 evaluation/gate 和表现上下文生成一个 schema 校验后的 `PostEvidenceRevision`。
- 当 article 不存在时，系统必须仍能完整呈现结构化内容，不得把文章缺失解释成知识缺失。
- 当任一来源 Artifact 版本或候选指纹变化时，投影必须随请求重建或失效，不得复用不匹配的评估。

### R2 — 三轴质量状态

- 系统必须分别呈现 `buildState`、`evaluationState` 和 `promotionState`。
- `built_unevaluated` 与 `evaluated_with_findings` 必须可浏览，但不得显示为 verified 或 Wiki eligible。
- 只有候选 revision、Evaluator 与确定性 gate 一致通过时，系统才可标记 `promotionState=wiki_eligible`。

### R3 — 三镜头与 findings

- 当三镜头 Artifact 存在时，页面必须展示 CR-01..06、DL-01..06、VE-01..07 的真实状态、finding、Evaluator 元数据和证据引用。
- 页面不得硬编码任何 lens 为失败或通过。
- 当 Evaluator 有 findings 时，页面必须将其作为质量发现展示，且不得隐藏 Builder 内容。

### R4 — 证据导航

- 当结论引用 cue、frame、OCR、shot、knowledge unit 或其他 Artifact 节点时，页面必须显示可解析引用；可在当前页面定位的引用必须可点击。
- 当引用无法内页定位时，页面必须保留引用身份与来源类型，不得伪造链接。
- 页面必须显式展示 unknown、conflict、unchecked carrier 和评估失败项。

### R5 — 单博主 provisional 连接

- 当选样中的 Builder 结果覆盖规定层级但尚未全部 verified 时，系统必须允许生成 provisional creator synthesis 输入资格，但不得发布为正式 creator knowledge。
- 正式 creator synthesis 与 Wiki 晋升仍必须只使用符合正式质量门的深度证据。
- 每个博主级结论必须能够声明 evidence scope、支持帖子、反例/限制和是否只由 provisional 视频支撑。

### R6 — 统一 coverage 策略

- 系统必须只有一个权威 creator synthesis coverage policy，Service、Job Processor 和 Video Processor 不得维护重复实现。
- coverage policy 必须识别 `verified` 与兼容 `ready`，并单独计算 built、evaluated、verified 和 blocked。
- 媒体不可得的 bounded gap 不得把已经 verified 的帖子误判为 unavailable。

### R7 — 产品与回归完整性

- 新版实时帖子投影必须使用三条真实视频 fixture 覆盖 built、findings 和 verified/兼容状态。
- 前端必须在桌面与窄屏清晰展示状态、三镜头、证据和未知。
- 仓库类型、测试、lint、构建、入口烟测与 1000 行文件约束必须通过。

## 4. 非目标

- 本阶段不自动修复 Evaluator findings。
- 本阶段不把 provisional 结论写入正式 Wiki。
- 本阶段不重做整个 Creator Dossier 视觉系统。
- 本阶段不删除旧 `/runs/:id`，只明确新视频知识入口并停止继续扩展旧报告。
