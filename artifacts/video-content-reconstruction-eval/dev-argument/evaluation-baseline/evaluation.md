# Dev Argument 普通总结 Baseline 独立评估

## 评估边界

本评估只把 `audit/audit.json`、`audit/audit.md` 与 `evidence/evidence-pack.json` 作为 ground truth，只把 `baseline/baseline.md` 与 `baseline/baseline-process.md` 作为 candidate。未读取 skill-run 或任何人工评估报告，也未替 candidate 补写证据。

计数遵循 `reconstruction-evaluation-1.0`：先判硬 GATE，再给 JUDGE 分。JUDGE 只描述可读性与使用感，不能抵消硬闸失败。

## GATE 结果

| 硬闸 | 结果 | 阈值 | 判定 |
|---|---:|---:|---|
| Critical-question recall | 9/18 = 50.0% | ≥85% | FAIL |
| Evidence coverage | 0/34 = 0% | ≥90% | FAIL |
| Unsupported inference | 6/44 = 13.6% | ≤5% | FAIL |
| Timestamp accuracy | 0/1 = 0% | ≥90% | FAIL |
| Process dependency completeness | 16/19 = 84.2% | ≥85% | FAIL |
| Unknown discipline | 7/14 = 50.0% | ≥90% | FAIL |
| Unchecked channels | 8 项 | 必须为 0 | FAIL |
| Meta-gate | 有未守载体、意义变化和关系 | 必须无遗漏 | FAIL |

Evidence coverage 的分母是审计的 34 个 `atomic_units`。baseline 即使语义复述正确，只要成品没有 CUE/SHOT/FRAME/DENSE 或时间引用，就不算“有有效证据”。Timestamp accuracy 的 candidate 引用数实际为零；为避免零分母造成空真，并按本任务要求把无引用照实计入时间通道，使用一个“必需的时间定位集合”作为分母，结果为 0/1。

Process dependency completeness 以审计论证图的 19 条 edge 为分母。baseline 保留 16 条，缺失 `E5→A2`、`X1→C1`、`R1→X1`：产业背景没有被恢复为“只能间接支持成本焦虑、不能直接证明用户价格”，开源降价例外及其 CloseAI 修辞反驳整个分支也被省略。

## JUDGE 结果

| 维度 | 1–5 | 判断 |
|---|---:|---|
| Readability | 5 | 结构清楚、语言顺畅，普通读者可一次读懂。 |
| Knowledge prioritization | 4 | 核心结论、成本链、现实理解与创作者出口排序合理。 |
| Evidence usefulness | 1 | 有证据性描述，但没有任何可回查引用或时间定位。 |
| Execution value | 3 | 行动项具体，但数项属于 candidate 自行扩展，而非视频恢复。 |
| Compression without loss | 3 | 主干压缩良好，但丢失开源支线、开放张力、视觉载体和若干不确定性。 |

## 核心判断

这份 baseline 是一篇好读、主干基本准确的普通总结。它最强的部分是保留了“单次算力成本 + 随机重试成本”的中介链，也正确恢复了咖啡船正例与吹蜡烛反例，以及结尾的工具主义行动出口。

它没有达到重构评估的硬契约。关键问题不是文风，而是不可核查：全文没有证据编号和时间码；没有恢复真实售价缺失、开放时间的内部张力、开源例外、饮料例子并非实测、竞品没有统一测评等关键限定；视觉与音频载体也没有闭环覆盖。

Meta-gate 同样失败。未守的意义变化包括“很快开放”到“算力跟上前不会开放”的张力，以及从视频生成器跳到“未来 AGI 的大脑”的无支撑跃迁。后者在 baseline 中被润色为“通向更通用世界模型或 AGI 的一部分”，语气更稳妥，却弱化了原视频论证本身的突兀和证据缺口。

详细逐项账本见 `discrepancies.md`，机器可读结果见 `evaluation.json`。
