# 共享 Workflow 源码维护

共享仓库：[agent-workflow](https://github.com/cyl19970726/agent-workflow)。本仓库通过 `vendor/agent-workflow` submodule 固定一个提交；npm workspace 暴露三个公共包。

| 包 | 源码 | 边界 |
| --- | --- | --- |
| `@signal-room/workflow` | [core](../../vendor/agent-workflow/packages/core/README.md) | 编排、恢复、并行、phase、执行与资产合同 |
| `@signal-room/workflow-codex` | [codex](../../vendor/agent-workflow/packages/codex/index.ts) | SDK 执行、skill 快照、私有 trace |
| `@signal-room/workflow-sqlite` | [sqlite](../../vendor/agent-workflow/packages/sqlite/index.ts) | 执行记录、事件与资产持久化 |

单帖和博主 workflow、队列、业务 skill、来源校验、审阅策略和工作台均留在 self-media。Codex 本地适配文件仅注入 self-media 的运行目录和环境配置，SQLite 适配文件仅导出共享实现。浏览器只可引用 `@signal-room/workflow/contracts`。禁止跨目录引用共享包内部源码。

## 首次使用及切换分支

```sh
git clone --recurse-submodules https://github.com/cyl19970726/self-media-content-intelligence.git
# 已有工作树，或切换到另一个引用不同共享版本的分支之后：
git submodule update --init --recursive
npm ci
npm run verify
```

`npm ci` 的 prepare 会按 core、codex、sqlite 顺序编译共享源码。dev、typecheck 和 test 入口也会先编译，确保修改源码后不会静默执行旧 dist。开发进程已启动后若修改共享源码，请重新运行 `npm run build:workflow` 并重启相关服务。

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

## 文档与编排 Skill

共享仓库提供[使用文档](../../vendor/agent-workflow/README.md)和 [agent-workflow skill](../../.agents/skills/agent-workflow/SKILL.md)。本项目在 `.agents/skills/agent-workflow` 建立相对符号链接，指向当前 submodule 的同名 skill，随指针升级；未安装到全局目录。

可直接让开发 Agent 使用 `$agent-workflow` 编写或维护流程；会话未发现该名称时，显式读取上述 SKILL.md。运行时业务 Agent 的方法仍由 `config.skills` 声明，不会自动注入编排 skill。详见[调用与安装说明](../../vendor/agent-workflow/docs/using-the-skill.md)。
