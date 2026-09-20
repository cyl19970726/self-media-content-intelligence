# 共享 Workflow 源码维护

共享仓库：[agent-workflow](https://github.com/cyl19970726/agent-workflow)。本仓库通过 `vendor/agent-workflow` submodule 固定一个提交；npm workspace 暴露四个公共包。

| 包 | 源码 | 边界 |
| --- | --- | --- |
| `@signal-room/workflow` | [core](../../vendor/agent-workflow/packages/core/README.md) | 编排、恢复、并行、phase、执行与资产合同 |
| `@signal-room/workflow-codex` | [codex](../../vendor/agent-workflow/packages/codex/index.ts) | SDK 执行、skill 快照、私有 trace |
| `@signal-room/workflow-sqlite` | [sqlite](../../vendor/agent-workflow/packages/sqlite/index.ts) | 执行记录、事件与资产持久化 |
| `@signal-room/workflow-read-model` | [read-model](../../vendor/agent-workflow/packages/read-model/index.ts) | 面向读者的阶段、资产和增量状态 |

单帖和博主 workflow、队列、业务 skill、来源校验、审阅策略和工作台均留在 self-media。Codex 本地适配文件仅注入 self-media 的运行目录和环境配置，SQLite 适配文件仅导出共享实现。浏览器只可引用 `@signal-room/workflow/contracts`。禁止跨目录引用共享包内部源码。

## 首次使用及切换分支

```sh
git clone --recurse-submodules https://github.com/cyl19970726/self-media-content-intelligence.git
# 已有工作树，或切换到另一个引用不同共享版本的分支之后：
git submodule update --init --recursive
npm ci
npm run verify
```

`npm ci` 的 prepare 会编译 core、codex、sqlite、read-model 共享源码。dev、typecheck 和 test 入口也会先编译，确保修改源码后不会静默执行旧 dist。开发进程已启动后若修改共享源码，请重新运行 `npm run build:workflow` 并重启相关服务。

真实研究运行期间不要修改它绑定的工作树。运行代码、业务 skill 和 submodule 提交应先验证并提交，再在独立固定 checkout 中启动 worker；开发继续使用另一工作树。输入中的方法摘要会检查 live 文件，旧进程已加载模块、旧 workflow revision 仍可解析，都不能代替这一隔离。方法改变后应开新 run，不能绕过 `FROZEN_METHOD_CHANGED`。

## 直接修改共享源码

```sh
cd vendor/agent-workflow
git switch -c codex/my-workflow-change
# 修改源码；独立运行共享仓库时先 npm ci
npm ci
npm run verify
npm run example
git add <changed-files>
git commit -m "Explain the workflow change"
git push -u origin HEAD
cd ../..
npm run verify
git add vendor/agent-workflow
git commit -m "Use verified workflow revision"
git push
```

先推共享仓库，再推宿主指针，避免其他人拉到不存在的提交。若共享修改需要在 main 上复用，先完成对应合并，再选择已验证的提交。submodule 常处于 detached HEAD，开始开发前应建立命名分支。

其他项目按需 fetch 并 checkout 明确的提交后，再运行自己的回归、提交自己的指针；不要自动追随 main。新项目需要把 `vendor/agent-workflow/packages/*` 加入 npm workspaces，声明公共包依赖，并在安装与启动前安排共享包构建。

## 兼容性和验证范围

迁移基线为 `c460d1cd2f6c5fb41585a5cf9ab701332ef979e8`，五份既有 HTML 报告保留原样。现有数据库表、记录文档、workflow revision、步骤指纹、模型配置与运行目录保持兼容。核心查询改为 `listRuns({ metadata: { creatorRunId } })`，已有业务元数据不迁移、不改写。

共享测试包含旧版本 SQLite 记录的重放夹具：重用已验证 agent 输出，不再次调用 agent；核验事件、attempt 与资产来源。宿主保留 Codex/SQLite 接入回归，覆盖单帖与博主组合、审阅失败保留候选、一次修订、阶段资产和公开投影。`npm run test:workflow` 在本仓库运行共享包测试。

这些检查验证代码与持久化兼容，不代表新一轮真实模型生成或研究质量验收；迁移不主动重跑付费研究，也不改动生产数据库和历史 trace。历史 workflow 定义仍须保留以支持旧任务恢复。


## 接入文档与示例

报告页、增量读取、重试血缘、历史兼容与宿主验收见[Workflow Read Model 集成指南](workflow-read-model-integration.md)。该指南只描述已接入的读取合同；真实模型验收应另行记录。

直接参考共享仓库的[快速开始](../../vendor/agent-workflow/docs/getting-started.md)、[流程编写](../../vendor/agent-workflow/docs/writing-workflows.md)和[宿主集成](../../vendor/agent-workflow/docs/integration.md)。可运行示例位于 [examples](../../vendor/agent-workflow/examples)。

本项目不安装 workflow 编排 skill。原生 skill 入口使用 `config.skills`；明确选择 Builder/Reviewer operator 的运行使用 `attachVerifiedSkillSnapshots`，只激活选定方法文件，同时交付完整冻结包供引用、脚本、素材和 Schema 按需读取。两种入口不能混用；详见共享包的 [Codex 与 skills](../../vendor/agent-workflow/docs/codex-and-skills.md)。

## 重新研究已有报告

已有候选时默认允许复用；`evaluationMode: "fresh"` 只表达重新评估，不代表重建正文。需要重新分析时显式传入 `candidateMode`：

```ts
await services.creatorResearch.startPostWorkflow(creatorRunId, postId, {
  candidateMode: "rebuild"
});
await services.creatorResearch.startCreatorAnalysisWorkflow(creatorRunId, {
  candidateMode: "rebuild",
  scope: "available_deep"
});
```

对应 HTTP 入口是 `POST /api/creator-runs/:id/workflows/post`（正文另含 `postExternalId`）和 `POST /api/creator-runs/:id/workflows/creator-analyze`。两者接受同名选项，枚举错误返回 400。博主默认 `scope: "selected"` 为规范深读选样；`available_deep` 还包括批次里的补充深读媒体，防止综合混入补充帖的旧报告。已有报告缺少源媒体时拒绝全量重建，不能静默跳过。

这些入口要求素材、作品库和选样已准备好，启动后由持久 worker 推进。代码通过不等于研究有效，真实 trace、来源与候选绑定、独立复核和工作台实际阅读的验收方法见[实跑与验收记录](workflow-evaluation-2026-09-20.md)。
