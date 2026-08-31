# Video Builder Fast Path V1 — 实现与运行验证

验证日期：2026-08-31（Asia/Shanghai）

## 已实现

- Builder 子进程显式使用 `gpt-5.6-terra` + `medium`，不再继承全局 Sol 配置。
- 默认 `evaluationPolicy=skip`，Builder 完成后直接写入 `built_unevaluated`；没有生成或伪造 Evaluator Artifact。
- Host 运行 JSON Schema、必需 Artifact、媒体 SHA 与 Artifact 指纹校验，生成 `builder-validation.json`。
- Builder 完整性闸额外检查 OCR 行/target frame 类型、证据时间范围、逐 cue 归责、全部可用通道与 meta-gate；Evaluator 产物存在但 hard gate 不通过时不再误标 `verified`。
- 定向采集自动生成 contact sheet；Builder 先看全局，再放大少量原图。
- 快速路径不再要求 `article.md` 与 verbose `run-notes.md`。
- 批次记录 `builtPosts` 与 `verifiedPosts`；旧 `readyPosts` 只兼容 verified。
- 工作台把 Builder-only 标记为“Builder 已完成·待评估”，允许进入单视频证据页，但保持 partial。
- Worker 优雅排空后清理旧 `activePostExternalIds`，持久租约继续恢复。
- Resume Prompt 接收确切 `missingArtifacts`、已存在 Artifact 和可复用字幕路径；已完成阶段冻结，不得重做。

## 真实运行证据

### Gate 1 — 断点任务（旧 Prompt 基线）

- run：`a25ff181-dcd7-4879-8a11-8473e8d1a326`
- post：`6908aacf0000000003036221`
- 开始：15:22:14
- Builder 注册完成：15:37:16
- 用时：约 15 分 02 秒
- 结果：`built_unevaluated`，`builder-validation.json.passed=true`
- 诊断：虽然已有字幕、evidence、probe、protocol，旧 Prompt 仍重复运行转写、evidence pack 和 targeted capture。`session-forensics` 明确观察到两个重复 Python Whisper 和一次 whisper.cpp。

### Gate 2 — 新视频完整 Builder

- run：`ab7b7f62-1096-4f36-9800-e6305285171c`
- post：`6a2fe44e000000000702da74`
- 开始：15:37:16
- Builder 注册完成：15:45:48
- 用时：约 8 分 32 秒
- 结果：`built_unevaluated`，Schema 校验覆盖 probe/protocol/reconstruction/OCR，媒体 SHA 已登记。

对比此前两条已审计 Builder 的约 19.6–23 分钟，完整 Builder 降到约 8.5 分钟；同时省去约 5–11 分钟 Evaluator。这个样本量仍小，不能当作稳定 P50/P95。

### Gate 3 — 新版长口播 Builder + 独立 Evaluator

- run：`22222222-2222-4222-8222-222222222222`
- post：`6908aacf0000000003036221`
- 视频：162.4 秒，83 个字幕 cue
- Host media preparation：首跑 16.79 秒；同输入缓存命中 0.39 秒
- Builder：6 分 35 秒；端到端约 6 分 52 秒，83/83 cue 归责，5/5 核心覆盖
- 旧同视频基线：约 14 分 47 秒；端到端缩短约 53%
- Evaluator：3 分 23 秒，一个真实进程完成通用 GATE 与 19 项三镜头检查

Evaluator 语义判断认为候选可接受，但随后的 deterministic validator 找到 14 个把 `TARGET-*` 错当 OCR 行的引用，以及 1 个帧超出知识单元时间范围。该证据推动两项修复：Builder validator 现在在 Evaluator 前拒绝这类候选；正式状态机也不再把 `gate.ready=false` 包装成带 warning 的 `verified`。

### Gate 4 — 短视觉 montage 反例

- 视频：26.7 秒、8 个镜头、无语言内容但有音乐
- Builder 严格只运行一次 OCR、没有转写重启，也没有重读完整 Skill。
- v2 候选发明了不存在的 `OCR-TERMINAL` 引用，被完整性闸拒绝为 `not_ready`。
- v3 把定向证据缩到 12 张并生成一张联系表；OCR 产出 12 个 processed frame、0 个可引用文本行，Builder 没有发明 OCR ID，最终通过完整性闸为 `built_unevaluated`。
- v3 Builder 用时 7 分 07 秒；相比旧同视频 8 分 32 秒约快 17%，但比无效的 v2 更慢，说明本项目不以牺牲证据质量换取速度。
- 当前代码对 v3 的媒体/Artifact 缓存命中、完整 Schema 与完整性复核只需 0.74 秒。

该反例不是“失败样本要隐藏”，而是发布闸有效的证明。v3 trace 仍发现旧 OCR 直调导致一次权限失败后升级重试、以及两次无效 `afplay`；现已由 Skill 内唯一 `run-ocr.mjs` wrapper 和“无模型可读音频则保留 unknown”合同消除。

## 自动化验证

- `typecheck`：通过。
- `lint`：通过。
- repository/package/frontend architecture/1000 行限制：通过，270 个源文件均不超过 1000 行。
- Vitest：56 个文件通过、8 个按环境条件跳过；252 tests passed，41 skipped。
- `video-content-reconstruction` Skill 自测：通过，22 个有效 gate，故意无效 fixture 被正确捕获。
- 生产构建：通过。

## 尚未宣称完成

- 尚未实现跨任务媒体 SHA 派生缓存；当前增量复用以同一输出目录 Artifact 为边界。
- 尚未加入感知哈希近似帧去重；当前已有精确时间、字节哈希去重、contact sheet 与预算拒绝，但 evidence-budget 指标仍需进入长期 P50/P95 仪表盘。
- Builder-only 结果尚未驱动 provisional creator synthesis；正式 synthesis/Wiki 继续只接受独立评估结果。
- Terra 的 2 条样本不足以决定 Luna 是否适合完整 Builder。Luna 仍只作为未来离线对照。
