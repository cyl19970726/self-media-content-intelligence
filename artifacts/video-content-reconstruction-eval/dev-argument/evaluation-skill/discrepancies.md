# Dev Argument — Skill candidate discrepancies

本文件只列 candidate 相对独立 audit 的差异，不提供修复稿，也不宣布 READY。

| 严重度 | 类别 | Audit ground truth | Candidate | 评审影响 |
|---|---|---|---|---|
| Hard gate | 未检查通道 | 审计把“非旁白音频中的配乐、音效或插入片段原声”列为 `UNK-014`，当前内容 Unknown。 | probe、capture protocol、coverage matrix 和 article 均未登记该载体，也未明确 abstain。 | `uncheckedChannels` 必须为零，因此 FAIL；同时构成 unguarded carrier。 |
| Meta gate | 意义变化遗漏 | `CUE-055` 把“勒紧裤腰带”的当下压力转成“AI 让所有人拥有美好未来”的普惠希望，是情感闭环的一部分。 | cue 被逐字复制，但 `KU-18` 截止于 219.89，article 在故事/个人魅力处结束。 | `ATOM-028` 未作为知识恢复；构成 unguarded meaning change。 |
| Meta gate | 关系闭环不完整 | 结尾关系是“普通人被高门槛排除 → 使用现有工具恢复行动感 → 普惠未来希望”。 | 结构关系只恢复到“工具/手机 → 故事与个人魅力”。 | 构成 unguarded relationship；metaAudit FAIL。 |
| Recall | 内部张力未解释 | `CQ-004` 要求识别“很快开放/年底前上线”与“算力跟上前不会开放”的不完全一致，并区分上线、公众开放和经济可及。 | 两组说法均出现，但没有被明确放在同一关系中解释。 | Critical-question recall 记 17/18；该项仍高于阈值。 |
| Coverage self-report | 自证偏差 | 完整性必须由独立 audit 判定。 | `coverageMatrix.meaningChanges` 声称 11/11，`metaGate.pass=true`，但希望性收束未进入知识层，非旁白音频也未进入协议。 | 属于 self-proof/no-op gate 风险；候选自报不能覆盖独立缺口。 |
| Minor | 结尾工具名处理不一致 | 硬字幕可将 SRT 的 `Big swords` 校正为 PixVerse。 | `article.md` 使用 PixVerse，但 `KU-18` 仍写“视频中 SRT 写作 Big swords”并把名称留作疑似项。 | 不造成事实夸大；只是结构化知识与可读文章之间归一化策略不完全一致。 |

## 保留良好的部分

- 没有把标题“一条视频上万元”写成真实官方售价。
- 没有把 8×A100/3 小时写成 OpenAI 官方参数。
- 保留 CTO 生成时间的明确未知。
- 正确保留随机重试是成本乘数。
- 用动作序列验证海盗船与吹蜡烛，而非单帧自证动态。
- 没有把饮料选择写成 Sora 测试。
- 将 AGI 大脑保留为无支撑扩大断言。
- 恢复了替代工具、手机类比、故事和个人魅力的行动出口。
