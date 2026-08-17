# V0 holdout generalization — 6a438b7100000000070124b6

结论：**PASS_WITH_LIMITATIONS**。冻结 V0 对本条观点型视频的适用问题召回为 **23/26（88.46%）**；critical proof/causal/rights/safety 召回 **10/10**；unsupported causal upgrade **0/4**；5 个不适用项均正确标为 N/A，false positive 为 0。H0–H6 全部通过。

本条的核心不是“共情已被证明会制造爆款”，而是作者用青年迷茫、女性处境和民族记忆三个平行案例，提出“共同情感记忆优先于钩子/网感”的创作观。V0 的 P04、P07、P08、P16 能准确把它恢复为待测机制，并阻止把搜索页、单帖计数和案例故事升级成规模、普遍性或因果证明。

## 10 个 closure dimensions

| Dimension | 审计问题 | Applicable | Recalled | Missed | False positive | N/A | 结论 |
|---|---:|---:|---:|---:|---:|---:|---|
| 1. account/identity purpose | 3 | 2 | 2 | 0 | 0 | 1 | P02/P08 使面罩人物、`人类最强编导`、`雷子酱编导`、平台标识保持分离；单条视频不能推出持续账号承诺。 |
| 2. audience, situation and demand | 3 | 3 | 3 | 0 | 0 | 0 | P04 能识别共同情感、身份冲突与创作者痛点；P07/P19 阻止把案例人群当用户总体。 |
| 3. single-post job and portfolio role | 2 | 1 | 1 | 0 | 0 | 1 | 可恢复为观点说服/权威构建，不是教程；账号内容组合未知。 |
| 4. opening, delivery and closing contracts | 3 | 3 | 3 | 0 | 0 | 0 | P05/P06 恢复新奇钩子、反差命题、案例路线和结尾强化；也能识别结尾只是修辞闭合，不是验证。 |
| 5. narrative/process/story relations | 2 | 2 | 2 | 0 | 0 | 0 | 三例是平行论据，不是生产步骤；案例到原则仍是待测机制。 |
| 6. proof objects and causal scope | 4 | 4 | 4 | 0 | 0 | 0 | 80 亿、数以万计、亿万女性、跨身份普遍性和“必然爆款”全部被正确限界。 |
| 7. speech/image/text/audio carrier functions | 5 | 5 | 3 | 2 | 0 | 0 | P09/P10 覆盖 UI 证据范围与字幕冲突；遗漏嵌套素材指代和非语音音频语义审计。 |
| 8. follow/series/CTA handoff | 2 | 2 | 1 | 1 | 0 | 0 | P05 精确识别“下期再见”不是关注合同；V0 未规定按载体/采样范围表述 CTA 缺席。 |
| 9. publishing, metrics and review logic | 3 | 1 | 1 | 0 | 0 | 2 | P16/P17 阻止用公开数据证明因果；源视频没有实验/复盘，也不能由搜索页推出本条的搜索任务。 |
| 10. rights, safety and unknowns | 4 | 3 | 3 | 0 | 0 | 1 | 绘画归属、截图时点、面罩授权、身份关系均保持未知；无商业/健康/危险流程。 |
| **总计** | **31** | **26** | **23** | **3** | **0** | **5** | **Recall = 88.46%** |

分母按独立审计中可操作的 closure question 构造，每个问题只归入一个主维度；N/A 不进入 recall 分母。完整的逐问题映射、audit IDs 与 V0 条款见 `evaluation.json`。

## H0–H6

| Gate | 分母 / 结果 | 判定 | 依据 |
|---|---|---|---|
| H0 | 22/22 | PASS | 最终独立 evaluation-v2 为 `READY_FOR_DOWNSTREAM_USE`，deterministic report 为 `ready: true`。 |
| H1 | 23/26 = 88.46%，阈值 85% | PASS | 保留 3 个真实 miss，没有用宽泛条款抹平。 |
| H2 | 10/10，阈值 100% | PASS | proof、causal、identity/attribution、rights/safety-scope 全召回。 |
| H3 | 0/4 unsupported upgrades | PASS | 规模、参与人数/代表性、跨身份普遍性、共情因果均未升级。 |
| H4 | 5/5 N/A 正确；FP=0 | PASS | 未虚构账号承诺、portfolio、发布实验、搜索任务或商业/健康流程。 |
| H5 | 8 个 delta findings | PASS | 有 confirmation、limitation、novelty、unresolved；contradiction 明确为 0，而非把未证主张误当反证。 |
| H6 | 1/1 | PASS | 下述动作原创、可执行、可测，并有停止线。 |

## Delta 标记

- **confirmation**：P04 的“共同情感”确实能恢复本条选题机制；P05 精确预见“下期再见”不等于系列/关注承接；P06/P07/P08/P16 能区分修辞闭合、可见数据与因果闭合。
- **limitation**：P09 与 closure-9 实际只明确列出画面、口播、字幕，未把非语音音频作为必须检查或保留未知的载体。
- **novelty**：V0 缺少“嵌套例证素材 referent ledger”——莉拉案例里的“一张图片一段 BGM”不能自动绑定成本视频音轨；也缺少 carrier-scoped absence 规则，不能把“完整字幕无口播 CTA”写成“全片绝无 CTA”。
- **contradiction**：0。本条作者的普遍/因果断言没有证成，但这不是对 V0 的真实反例。
- **unresolved**：共同情感是否提升爆款概率、关注或信任，仍缺对照、失败案例和因果识别。

## 一个原创、可执行、可测的动作

做一次“共同情感开场”的配对流量实验，主题改为 **22–30 岁初级内容从业者对 AI 替代的焦虑**，不复制原片三个案例、面罩或口号。

- 用一份带日期的真实任务返工记录做 45 秒主体，并给出一个技能盘点动作。
- A 版前 5 秒：`我们第一次害怕被时代淘汰，往往不是失业那天，而是发现旧本事突然不值钱。`
- B 版前 5 秒：`用这 3 栏表，10 分钟找出你最不容易被 AI 替代的能力。`
- 后 40 秒、标题、封面、CTA、时长、发布时间窗和投放受众保持一致。平台支持则 50:50 随机分流；否则做两轮交叉时段复测并登记分发混杂。
- 主指标：每 1000 个 5 秒有效观看带来的主页访问后关注数。守护：5 秒留存、完播、误解/反感评论率、取关率。
- 每版至少 5000 曝光且满 72 小时。只有 A 相对 B 主指标提升 ≥15%，同时误解/反感不增加超过 2 个百分点、取关率不劣化超过 0.2 个百分点，才把该开场进入邻近变体；否则保留主体证明，只测试范围限定句，不同时改其他变量。

这条 holdout 支持 V0 的主导演闭包，但要求后续版本补上两类精度：**全载体检查（含非语音音频）**与**嵌套素材/缺席断言的证据作用域**。
