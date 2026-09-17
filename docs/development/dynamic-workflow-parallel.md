# 同阶段并行与 Claude Code 工作流参考

2026-09-16。参考官方 [Dynamic workflows](https://code.claude.com/docs/en/workflows) 与 [SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents)。以下为文档行为对照，不是对 Claude 内部源码的审计。

## 本项目需要的语义

列表并发用于多篇帖子；具名并行用于同一阶段的不同研究职责。例如内容知识研究、表达机制研究、表现差异研究分别读取相同冻结样本，各自产出独立资产，汇合后才进入综合。是否拆成这些角色须由研究验收决定，基础设施支持不意味着立即替换当前综合方法。

Workflow 负责结构与恢复；Agent 定义负责模型、skill、prompt 和输出合同；每次执行使用独立目录。普通控制步骤不占模型执行槽。具名分支必须保留状态、错误、资产和父子关联；未完成或失败的研究不能用空结果悄悄略过。

拟采用的业务组合示意（角色为示意，不是已经上线的综合新流程）：

```ts
const angles = await ctx.parallelSettled("research-angles", {
  knowledge: () => ctx.call("knowledge", knowledgeWorkflow, frozenPosts),
  expression: () => ctx.call("expression", expressionWorkflow, frozenPosts),
  performance: () => ctx.call("performance", performanceWorkflow, corpusAndPosts),
}, { concurrency: 2 });

if (Object.values(angles).some(result => result.status === "rejected")) {
  return ctx.needsReview({ reason: "research_branch_failed", angles });
}
return ctx.call("synthesis", synthesisWorkflow, angles);
```

先提供需要所有分支成功的 `parallel` 和收集分支结果的 `parallelSettled`。模型调用、输出验证与资产发布仍通过既有 context 方法执行；不要在回调中使用不可追溯的外部副作用。调整角色、输入构造或 skill 时提升定义版本，不能依靠函数闭包自动检测代码变化。

## 值得借鉴的机制

Claude 的工作流将编排移到脚本，以 agent/pipeline/parallel 组织执行，phase 对应进度分组。我们采用相同的简洁表达方向，但继续使用现有 SQLite/任务队列与资产事实源，不引入第二套调度器。

优先补齐：具名并行与汇合、分支独立结果、恢复后有效成功节点复用、运行级与分组级并发约束。随后把工作台按阶段展示 agent 数量、进展、用量和中间资产。阶段失败应保留原因，显式决定修复、阻塞或部分交付。

Claude 文档中的进程恢复和失败重跑范围不能作为我们已经具有的保证。我们的复用依赖稳定步骤 key、输入/方法指纹和持久化状态；代码回放中的时间、随机数或变化的外部读取应通过显式输入或记录步骤固定。

SDK subagent 的角色化配置与调用来源关联也值得借鉴。我们维持逐角色方法交付回执和逐 attempt 私有 trace；前端只读安全投影。缓存优化需测量真实输入与命中，不能直接套用另一厂商的缓存机制。

## 范围边界

本次补核心 parallel 能力及验证，不热替换正在运行的 creator.analyze@v2。当前生产综合角色仍沿用已有方法。工作台阶段分组、模型槽与控制槽分离、失败候选进入修复分支是后续独立集成项，不能凭 API 存在宣称全部完成。
