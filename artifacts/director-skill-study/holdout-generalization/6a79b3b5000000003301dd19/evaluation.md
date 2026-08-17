# V0 holdout generalization：6a79b3b5000000003301dd19

结论：**PASS**。该条 reconstruction 已通过 H0（evaluation-v3：22/22 READY）；V0 对 33 个适用审计问题召回 32 个，recall 为 **96.97%**，13/13 个关键证明、因果、权利与安全问题全部召回，unsupported causal upgrade 为 0。唯一真实遗漏不是证据安全问题，而是 V0 未把“产品/offer 架构 → 内容形式”列成独立闭包节点。

## 十个 closure dimensions

| Dimension | Applicable denominator | Recalled | Missed | False positive | N.A. | 判断 |
|---|---:|---:|---:|---:|---:|---|
| 1. account/identity purpose | 3 | 3 | 0 | 0 | 0 | P01/P02/P08/P20 能区分账号承诺、可见品牌、面罩造型、真实身份与课程推广。 |
| 2. audience, situation and demand | 4 | 4 | 0 | 0 | 0 | P04/P07 恢复具体矛盾、两种找产品路径，并要求需求证据与反例。 |
| 3. single-post job and portfolio role | 3 | 2 | 1 | 0 | 0 | 能恢复教学主任务与商业承载；缺少 offer 类型、交付形态到内容形式的专门节点。 |
| 4. opening, delivery and closing contracts | 4 | 4 | 0 | 0 | 0 | P05/P06/P08 恢复数据拼贴+承诺、正文交付、结尾核心知识，以及未闭合的指标因果。 |
| 5. narrative/process/story relations | 4 | 4 | 0 | 0 | 0 | 恢复生意公式、先买家后产品、画像→需求→产品、两条并列路径和产品先于内容选择。 |
| 6. proof objects and causal scope | 4 | 4 | 0 | 0 | 0 | 截图、趋势、画像、需求与结果全部 scope-limited；没有把例子升级为事实。 |
| 7. speech/image/text/audio carrier functions | 4 | 4 | 0 | 0 | 0 | P09/P10 覆盖 SRT 冲突、白板、覆盖层、手势、技术 cut 与非语音音轨未知。 |
| 8. follow/series/CTA handoff | 3 | 3 | 0 | 0 | 0 | “下期再见”不是具体关注合同；结尾无口头 CTA，但全片有课程视觉推广。 |
| 9. publishing, metrics and review logic | 0 | 0 | 0 | 0 | 3 | 源视频没有发布实验、指标口径或复盘；不能因 V0 有模板而硬套。开头数字只在 proof scope 中审计。 |
| 10. rights, safety and unknowns | 4 | 4 | 0 | 0 | 0 | 造型/截图授权、产品合规、课程条件与所有负证据均正确保持有界 unknown。 |
| **总计** | **33** | **32** | **1** | **0** | **3** | **Recall 96.97%** |

唯一 missed 是 D03-Q03：V0 的 P03/P20 可以说“单条任务”和“商业承载”，却不足以具体恢复本条的 `目标买家 → 产品/交付物 → 服务型或资料型 → 内容形式` 决策，也没有混合产品边界。不能把这个遗漏硬塞进宽泛的“内容组合”。

False positive 为 0。尤其没有把开头指标归因于讲者或方法，没有把“下期再见”算作具体关注合同，没有把 11 个技术 shot 当作 11 个语义场景，也没有把作者产品例子当成真实成交。

## Delta 标注

- **confirmation / confirmed**：P04/P07 具体恢复“买家→画像→需求→产品”，同时要求需求验证和反例。
- **confirmation / confirmed**：P06/P08 精确命中“开场高数据制造可信度暗示，但结尾未完成归属与方法因果闭合”。
- **confirmation / confirmed**：P09/P10 能把口播、烧录字幕、白板、覆盖层、造型、手势和剪辑分成功能不同的载体，并保留冲突。
- **limitation / limited**：P03/P20 对商业内容的描述太宽，不能替代 offer 架构闭包。
- **contradiction / contradicted**：未观察到足以推翻 V0 条款的真实反例。
- **novelty / novel**：应候选加入 `offer architecture closure`：目标买家→待验证需求→产品类型/交付物→内容形式→转化动作，并显式处理混合产品。
- **unresolved**：“平台已解决渠道与广告”、广告行业走弱、陪玩画像和需求、产品可卖性、真实身份、指标归属、课程条件，均不能由本 holdout 强行决定。

## H0–H6

| Gate | Result | Evidence |
|---|---|---|
| H0 | PASS | evaluation-v3 为 READY_FOR_DOWNSTREAM_USE，22/22 hard gates passed。 |
| H1 | PASS | 32/33 = 96.97%，高于 85%。 |
| H2 | PASS | 关键 proof/causal/rights/safety/scoped-unknown 问题 13/13。 |
| H3 | PASS | unsupported causal upgrade = 0。 |
| H4 | PASS | 发布、指标与复盘的 3 个源视频缺席项均正确标 N.A.，没有硬套。 |
| H5 | PASS | 有 confirmation、limitation、novelty、unresolved；明确记录未见 contradiction。 |
| H6 | PASS | 下述动作完成原创迁移，并有样本、指标、窗口、成功线与失败动作。 |

## 原创、可执行、可测动作

做一条“AI 设计工具商用限制速查”真实小额预售内容，不复刻原视频的热点简报。

1. 先访谈 8 名接单视觉设计师，问最近 30 天遇到的授权或导出问题；少于 3 人出现同类问题，停止选题。
2. 制作一页样品，用同一话术邀请受访者支付 9 元预订完整版；口头兴趣不算购买证据。
3. 至少获得 3 笔真实预订后，制作 45 秒视频：前 5 秒给具体问题，正文展示样品、来源字段和一次实际查验，结尾让观众评论关键词领取样页。交易/用户截图必须授权并匿名。
4. 唯一主变量为“是否展示真实样品与预订 proof”；对照版把产品明确写成待验证假设，其余标题、时长、发布时间段与 CTA 保持一致。

主指标是每 1000 次 3 秒有效观看带来的合格样页申请数；次指标是样页申请→9 元预订转化率。观察窗为每版 7 天且至少 1000 次 3 秒有效观看，不足样本标 unresolved。成功线：申请率 ≥1.0%、至少 3 笔预订、退款率 ≤10%。申请不足先改受众问题/承诺；申请达线但预订不足则改 offer/样品；来源或授权投诉非零立即暂停并修复证据链。
