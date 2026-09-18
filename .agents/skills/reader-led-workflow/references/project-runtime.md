# 本项目的执行与认知闭环

2026-09-17 核对。这里记录实现位置，使用前以当前代码为准；不复制运行中的 prompt、凭据或私有媒体。

## 新的小型 Workflow 路径

- [业务无关运行层](../../../../vendor/agent-workflow/packages/core/README.md) 提供普通 TypeScript 的 task、agent、call、mapSettled、decide、validate 和 publish。单帖/博主定义在 [research workflows](../../../../packages/research/src/workflows/index.ts)，SDK 与实际研究操作通过 [生产适配器](../../../../packages/adapters/src/workflow/production-research-runner.ts) 连接。
- 新路径显式使用 Terra medium Builder、Luna medium Reviewer；独立 Reviewer 使用独立会话。Skill 方法与来源哈希随输入冻结，完整 prompt 和 SDK 事件保留在私有 trace。SDK 提供模型执行，现有 research_jobs 仍是唯一队列。
- 父流程等待子流程时释放执行槽；进程恢复按已验证持久节点重放，不承诺任意 TypeScript 语句或外部副作用恰好一次。
- 当前 `post.analyze@v6`、`creator.synthesize@v5` 通过 [simple-review](../../../../packages/research/src/workflows/simple-review.ts) 组织独立 Reviewer：无意见跳过修订，有意见交给 Builder 最多修订一次；修订版本登记为 `revised_unverified`，不继承原稿审阅状态。审阅技术失败最多尝试两次，保留候选并标注 `review_incomplete`。旧 `post.repair-evaluation` 仅用于历史 Evaluator 合同；新流程不能重写主报告来掩盖审阅执行或校验问题。
- 2026-09-18 新帖实跑后，`post.review@v3` / `creator.review@v3` 在第二次尝试中接收首次校验失败反馈；`creator.analyze@v6` 使用新版子流程。旧 `post.analyze@v5`、`creator.synthesize@v4` 与 `review@v2` 仍注册以保留持久运行恢复语义。本次新帖真实运行使用的是修复前v5，不能把后续测试通过说成该运行已使用新重试机制。
- 修复校验代码后若复用已经保存的审阅，必须重新验证原始意见的候选绑定、实际引用和输入版本，并保留原 trace 与恢复来源；不得删除不方便处理的意见、把 Host 改写的意见称为原始 Reviewer 输出，或把恢复校验当作新一轮独立审阅。
- 中间候选可在工作流页直接阅读；是否完成执行、通过结构校验、允许带边界展示或已经验证是不同状态。登记时重新检查来源版本；provisional 不能改称 verified。
- 当前迁移及真实验收边界见 [issue 71 实施记录](../../../../docs/development/issue-71-workflow-implementation.md) 与 [Reviewer 阅读迭代](../../../../docs/development/reviewer-reader-next-20260917.md)。不要把小样本成功说成所有博主已迁移；既有运行继续使用原定义。

## 保留的 CLI 执行路径

- [单帖执行器](../../../../packages/adapters/src/platform/video/codex-video-reconstruction-executor.ts)：`codexInvocationArgs` 生成 `codex exec - --json` 调用；`runCodex` 向 stdin 传 prompt，保存 stdout 事件、stderr、最终消息和生命周期信息。`CodexVideoReconstructionExecutor.reconstruct` 组织 Builder、宿主校验及可选独立 Evaluator。
- [博主综合执行器](../../../../packages/adapters/src/platform/synthesis/codex-creator-synthesis-executor.ts)：组织固定输入上的综合 Builder 和独立复核。先通过 `prepareCreatorSynthesisBatch` 把哈希绑定的源修订固定成不可变报告、修订清单及输入批次；prepared candidate 必须精确绑定这一有效批次，不能仍引用旧批次。Builder、Evaluator、Gate 与产物依赖使用同一批次。
- [研究服务](../../../../packages/research/src/creator-research/service.ts)、[视频及综合处理器](../../../../packages/research/src/creator-research/video-synthesis-processor.ts) 与 [组成入口](../../../../src/server/composition-root.ts)：组织产品任务、执行器、状态与产物。服务能力来自这些宿主层，而非单个 `exec` 进程。
- [SQLite 任务仓库](../../../../packages/adapters/src/platform/database/sqlite-creator-research-repository.ts)：保存任务、事件、幂等键与租约；[Worker](../../../../packages/research/src/creator-research/worker.ts) 负责轮询与并发。当前 CLI 调用通常使用 `--ephemeral`，恢复主要是宿主重新领取任务并复用保留产物，不应描述为 CLI 会话的无缝续跑。综合执行器现也使用 `--json`，在 runtime 的 executor-traces 目录按子调用保存实际 prompt、事件、stderr、终态及新建/变更输出快照，避免公开 runs 静态路径暴露日志。两条实现的事件细节并不完全相同。

这说明产品已经在使用“代码组织模型执行”的方式。SDK 与 CLI 都属于服务中的执行方式；当前会话 subagent 是另一条临时协作通道，不会自动成为该产品的任务记录。采用它生产候选后，仍需走明确的验证与登记路径。

`--json` 是执行事件流，不代表研究产物已经符合业务 Schema。进程退出、结构校验、独立证据复核和实际阅读是不同层次。

官方对 [非交互执行](https://learn.chatgpt.com/docs/non-interactive-mode) 的说明支持由脚本调用 `codex exec`。具体参数以本地版本和现有包装器为准；无需为使用本 skill 另写通用执行框架。

## 阅读迭代记录

最新六篇知识修订与阅读检查见 [本轮记录](../../../../docs/development/creator-cognition-iteration-2026-09-14.md)，全部样本审计见 [知识审计](../../../../docs/development/creator-knowledge-audit-2026-09-14.md)。这些是当前状态的记录，不是永远固定的执行顺序。

后续迭代见 [从单帖知识到博主学习路径](../../../../docs/development/creator-reader-next-2026-09-14.md)：显卡总表已从原尺寸画面恢复并独立复核，总计七篇源修订。`POST /api/creator-runs/:id/resynthesize` 可重新综合，保留旧版可读结果并去重执行中的请求。主 Agent 仍须阅读实际新结果，不能仅凭输入刷新宣称认知改善。

已有 [源修订读取](../../../../src/server/report-source-revision.ts) 与 [综合源变化提示](../../../../src/server/creator-source-changes.ts) 负责展示修订及适用性提示。提示比较页面当前单帖与该综合实际绑定的输入；只有内容一致才清除。新批次、来源哈希和执行记录仍需实际核对。

## 新博主的分类适配

2026-09-15 用户明确：现有分类不足时，由 Builder 在执行中自行发现和扩展，一篇可属于多个类别。新的博主综合调用产出 `portfolioClassification`，包含开放类别、冻结清单逐帖归属及标题/深度内容来源层级；类别不是代码维护的固定词表。投影层只校验来源、按帖子去重统计与显示，多标签占比不要求合计100%。旧规则标注仍是表层背景，不能限定 Builder 的分类，也不能冒充新分类。

新博主试跑与尚未解决的边界见 [试跑记录](../../../../docs/development/creator-pilot-2026-09-15.md)。采集页数预算、模型调用、独立评估状态和 Host 阅读结果需要分别核对，不能只凭报告已生成就扩展批量任务。

## 综合 Builder 方法来源

新综合通过项目内 [creator-synthesis](../../creator-synthesis/SKILL.md) 及其分析方法提供研究规范；执行服务向 Codex SDK／CLI 注入确切文件内容并记录摘要。输入版本、输出 Schema 与独立评估继续由服务管理。Host 的 reader-led-workflow 负责实际使用与方向判断，不能代替综合 Builder 或独立 Reviewer。

## 同输入复用的综合试跑

2026-09-15 增加显式的 `SELF_MEDIA_CREATOR_SYNTHESIS_REUSE_PATH` 模式。先核对博主、全部冻结输入以及原分类/跨帖引用；程序提供完整三 Lens 材料索引和精简分类上下文。Builder 只写研究草稿，程序复用同版分类及兼容记录并组装完整候选，继续原有结构/证据校验和独立复核。草稿不能覆盖固定字段；输入不匹配直接拒绝，不自动降级为全量付费构建。

每次采用独立输出目录，保留复用来源哈希、新草稿哈希、skill 哈希和真实 CLI trace。复用部分不算本次新生成；本模式也不等于已经独立实现分类服务。首次实际调用及读者结果见 [同题试跑记录](../../../../docs/development/creator-synthesis-execution-next-2026-09-15.md)。默认的新博主完整构建路径仍保留。

本轮具体使用疑问可经 `SELF_MEDIA_CREATOR_SYNTHESIS_RESEARCH_BRIEF_PATH` 提供给服务；调用记录任务文件摘要并纳入输入版本，避免把临时问题永久塞进通用方法。复用兼容记录的正文保持来源，评估引用由冻结批次逐帖补齐并记录该投影来源。默认展示综合内的支持/反例观察，原始artifact引用继续折叠。


## 调用前的模式与模型核对

- 新博主或冻结输入变化：走完整综合路径，Builder 同时产出自适配分类、逐帖记录及跨帖研究。不要为新博主设置旧候选的复用路径。
- 同一冻结输入上重新研究：显式设置 `SELF_MEDIA_CREATOR_SYNTHESIS_REUSE_PATH`；复用的是校验过的固定部分，跨帖研究重新生成。它不是默认模式，也不跳过独立复核。
- 单次局部修订：可交给有明确字段范围的 subagent；通过 `SELF_MEDIA_CREATOR_SYNTHESIS_CANDIDATE_PATH` 导入完整候选时必须匹配有效批次，并继续校验和复核。记录为 `prepared_candidate`、`generatedWithLoadedSkill: false`，不能把服务读取了 skill 当作候选生成证明。不要同时设置复用和导入路径；当前执行器优先复用分支。
- 本项目已约定 Terra medium Builder、Luna medium Evaluator。旧 CLI 路径的综合调用需核对 `SELF_MEDIA_CREATOR_SYNTHESIS_MODEL`、`SELF_MEDIA_CREATOR_SYNTHESIS_REASONING_EFFORT`、`SELF_MEDIA_CREATOR_SYNTHESIS_EVALUATOR_MODEL`、`SELF_MEDIA_CREATOR_SYNTHESIS_EVALUATOR_REASONING_EFFORT` 的实际值；该旧路径模型默认值仍是 Astra，不能把约定误当作默认配置；新 Workflow 的 SDK 路径已显式固定 Terra/Luna，不读取这些环境变量来静默更换模型。单帖有自己的模型和评估策略配置，需另行核对。

方法在业务 skill 中维护；阶段、冻结输入、验证、重试与 provenance 在执行服务中维护。一次读者疑问放进带摘要的 research brief，不永久追加成所有博主必答的问题。执行失败先看私有 trace、实际输出和校验结果，判断是材料、执行、合同还是研究方法的问题，再修改对应层，避免只堆 prompt。
