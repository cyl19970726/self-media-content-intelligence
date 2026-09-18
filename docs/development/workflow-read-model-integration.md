# Workflow Read Model：宿主集成与验收指南

本指南说明 self-media 如何消费共享的 `@signal-room/workflow-read-model`，以及如何验证报告页和完整执行页读取的是同一棵运行树。本指南描述的是当前集成合同；它不表示新的模型研究已经执行或通过内容验收。

共享源码、submodule 更新和跨仓库发布顺序见[共享 Workflow 源码维护](shared-workflow.md)。单帖从零流程的既有实跑事实与限制见[新帖从零工作流验证](fresh-post-workflow-validation.md)。

本次实现的真实新帖、浏览器操作与测试结果见 [2026-09-19 验收记录](workflow-read-model-acceptance-2026-09-19.md)。

## 边界

读模型只读取一个显式 root run 及其真实父子关系。`creatorRunId`、项目、作者或批次相同，均不能自动成为同一次研究的成员。输入来源、历史候选和旧报告可显示为外部依赖，却不进入本次执行树。

共享读模型提供运行、阶段、调用、attempt、绑定资产、精确关系和增量游标。宿主负责鉴权、HTTP 路由、业务标题、报告正文读取及业务资产关系适配。浏览器不得直接读取 RunStore、原始 event data、trace、prompt、绝对路径或任意 artifact URI。

`execution`、`validation`、`review` 与 `delivery` 是独立事实。运行成功不自动代表候选已审阅、修订已复核或可作为当前交付。没有明确的有效关系时，投影必须返回 `unknown`、`pending` 或 `ambiguous`，不能根据时间、依赖边或相同 creator 猜测历史。

## HTTP 读取接口

所有接口均在宿主完成权限检查后调用；前端只使用返回的安全 DTO。

| 用途 | 接口 | 关键语义 |
| --- | --- | --- |
| 当前研究树快照 | `GET /api/workflow-runs/:id/reading` | `:id` 可为 root 或子 run；服务端解析最近业务 root，仅返回该树。可附 `creatorRunId` 收紧范围。 |
| 增量刷新 | `GET /api/workflow-runs/:id/reading/changes?cursor=…` | cursor 是 opaque；失效时重新获取 snapshot，不能把单个 run 的 event seq 当作整树游标。 |
| 阶段内按页审计 | `GET /api/workflow-runs/:id/reading/stages/:phaseId?cursor=…&limit=1..100` | 默认 25；展示调用、attempt、资产和分页游标，不以完整原始事件替代阶段。 |
| 单帖报告优先投影 | `GET /api/creator-runs/:creatorRunId/posts/:postId/workflow-reading?workflowRunId=…` | 显式 run 会向上解析最近 `post.analyze` root，并验证 creator/post 身份；未传时只按 `createdAt` 选择最新同帖 root。 |
| 受限候选阅读器 | `GET /api/workflow-runs/:runId/artifacts/:artifactId/reader` | 只读取 owner run 的经允许报告格式。`readerHref` 由服务端投影提供，前端不得拼接任意路径。 |

单帖投影返回阶段摘要、可读候选、可选修订前候选和修订 disposition。`candidate` 与 `baseCandidate` 都是精确的 owner run/artifact identity；修订前版本缺少有效 revision record 时为 `null`，不回退猜测批次报告。`reviewStatus` 只来自候选 `id + revision + sha256 + report hash` 精确绑定的有效 review；修订候选默认 `revision_unverified`，直到有针对该候选的独立 review。

## 重试与版本兼容

新版简单审阅根流程为 `post.analyze@v7`、`creator.synthesize@v6` 和 `creator.analyze@v7`。其第二次审阅 child 在输入中带有候选身份派生的显式 retry link。持久 dispatcher 在第二次 child 的 parent call step 写入：

```text
read-model.retry
{ retryOf: <first parent call step id>, reason: <safe failure code> }
```

这不是按 step 名称、时间邻近或“同一个帖子”推断的关系。读模型据此显示两次实际调用、失败原因和采用结果；第一次未通过合同校验的输出不会变成有效 review 或已解决的内容意见。

旧 `post.analyze@v5/v6`、`creator.synthesize@v4/v5`、旧 `review@v2` 和 `review@v3` 均继续注册。旧 root 重放仍产生原有 child 输入，不会被补写 retry link 或改写历史状态。读模型在旧历史缺少显式关系时显示未知，而不是伪造一条重试边。

retry link 仅存在于服务端的冻结 child input 和内部执行记录。公开事件投影不透传该对象；公开 read model 只消费经 adapter 映射的安全失败摘要。event 保障在每次 `ensureChild` 后幂等执行：即使 child 已持久而先前在写 event 前进程中断，恢复调用会补写同一 `(parent call step, retryOf, reason)` 事件；已存在的相同事件不重复写入。link target 必须唯一，并同时匹配持久记录和冻结输入；缺失或歧义会中止该 child 创建。

`phaseAudience` 将内部登记步骤标为 `audit`；共享进度只统计 `reader` 阶段。audit 阶段仍在快照与详情中保留，宿主放入高级审计。未配置时默认 `reader`，不按名称猜测。

## 页面消费顺序

1. 进入报告页先请求单帖投影。`workflow: null` 是“未创建本帖工作流”的正常空态，不是报告读取错误。
2. 工作流运行时，先渲染阶段、等待对象和已发布候选。父流程 `waiting` 可能只是等待 child，页面不得翻译为闲置。
3. `candidate.readerHref` 出现后再调用受限 reader，使用既有 Builder 三 Lens 阅读器逐字段显示正文和就近证据；读模型不重写报告正文。
4. 修订存在时用 `baseCandidate.readerHref` 读取修订前报告。没有该精确定位器时显示“历史版本未知”，不从普通批次 API 取可能已经被新版替换的报告。
5. 完整执行页以 snapshot 为根，阶段为主要层级，调用/attempt/资产为按需展开的审计层。使用 `changes` 合并更新；cursor 失效或 scope 变化时重新请求 snapshot。

## 本地受控验收

不需要真实模型即可验证合同和恢复行为：

```sh
npx vitest run \
  packages/adapters/src/workflow/research-workflow-executor.test.ts \
  packages/adapters/src/workflow/simple-review-durable.test.ts \
  packages/adapters/src/workflow/simple-review-composition.test.ts \
  src/server/routes/workflow-runs.test.ts
npx tsc --noEmit
```

至少核对：

- 从 child ID 打开的 snapshot 不混入同 creator 的其他 run；显式跨 post root 返回 404。
- 新版 retry 有两次独立 call，第二条 `retryOf` 指向第一条真实 parent call step；恢复后不丢 link，重复恢复不复制 event。
- 旧 root 仍由相同 revision 解析，旧 child input 不出现 `retryLink`。
- 无有效 review 时状态不是 `reviewed`；修订稿不继承原稿通过状态；多候选无 selected relation 时是 `ambiguous` 或不可读。
- 浏览器 DTO 不含 prompt、raw metadata、trace、私有本地路径或未允许的 artifact payload。

真实模型验收另行记录候选来源、冻结版本、实际调用、浏览器阅读和未解决的质量限制。准备新媒体、创建 workflow 与模型执行均不由本指南或上述测试触发。
