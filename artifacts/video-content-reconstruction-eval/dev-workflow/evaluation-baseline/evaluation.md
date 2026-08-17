# dev-workflow baseline 独立评估

## 结论

baseline 是一篇结构清楚、可读性很强的普通总结，也主动把“3 小时”“零手写代码”和文案质量写成作者主张，并提醒读者这只是快速原型而非可正式发行产品。

硬门禁仍然失败。主要不是文风问题，而是证据闭包没有建立：15 个核心问题中答对或正确标 unknown 8 个；0 个核心单元带有 candidate 自己的有效证据引用；0 个单元可定位到时间；10 个审计流程阶段完整覆盖 7 个；52 个正面事实命题中有 3 个 unsupported inference；20 个 unknown 机会中正确克制 18 个；另有 5 类可用载体没有被独立检查。JUDGE 分数不能抵消这些 GATE 失败。

## GATE 计数

| GATE | 结果 | 阈值 | 判定 |
|---|---:|---:|---|
| Critical-question recall | 8/15 = 53.3% | ≥ 85% | FAIL |
| Evidence coverage | 0/15 = 0% | ≥ 90% | FAIL |
| Unsupported inference | 3/52 = 5.8% | ≤ 5% | FAIL |
| Timestamp accuracy | 0/15 = 0% | ≥ 90% | FAIL |
| Process dependency completeness | 7/10 = 70% | ≥ 85% | FAIL |
| Unknown discipline | 18/20 = 90% | ≥ 90% | PASS |
| Unchecked channels | 5 类 | 必须为 0 | FAIL |
| Meta-gate | fail | 无 unguarded carrier/change/relation | FAIL |

时间码分母按 15 个 audited critical-question unit 各设置一个定位机会；candidate 没有任何时间码或证据引用，因此不能用 ground truth 的时间范围代填。

## JUDGE

| 维度 | 分数 | 简评 |
|---|---:|---|
| Readability | 5/5 | 层次清楚，读者容易沿着开发流程理解。 |
| Knowledge prioritization | 4/5 | 主流程和原型边界突出；精确配置、真实起点和交付形态被压缩过度。 |
| Evidence usefulness | 1/5 | 没有 cue、shot、frame 或时间定位，无法从总结回查视频。 |
| Execution value | 3/5 | 行动清单有帮助，但缺安装命令、端点、模型变量、前置环境和明确成功状态。 |
| Compression without loss | 3/5 | 核心故事线保留较好，但关键起点、参数、布局前后差异和供应链关系丢失。 |

## 关键判断

- 最严重的事实缺口是代码实现前状态：审计显示目录已经有完整 story 文档、5 个角色 JSON、assets/images 等；baseline 却把框架、文本和基础 UI 串成 AI 收到需求后建立的结果。
- 供应链只写到 Claude Code + Kimi K2 Thinking，没有保留 Moonshot Anthropic 兼容端点、`kimi-k2-thinking-turbo`、Claude Code v2.0.31 与模型变量。
- 布局迭代只保留“自然语言修改”，漏掉真正可复用的前后差异：删除中央人物大图，只保留对话框缩略图。
- baseline-process 声明读完 SRT 并做 10 秒/5 秒画面抽查，但没有逐载体检查，也没有把任何观察附回正文；不能据此视为证据覆盖或时间码覆盖。

## Meta-audit

仍未被守住的关系包括：既有项目内容与本次生成内容的 provenance、Claude Code → Moonshot → K2 的精确调用链、作者打开本地 `index.html` 与代理“运行项目”的责任边界，以及剪辑片段是否来自同一会话/版本。由此 meta-gate 判定为 fail。

逐项差异与计数依据见 `discrepancies.md`；机器可读结果见 `evaluation.json`。
