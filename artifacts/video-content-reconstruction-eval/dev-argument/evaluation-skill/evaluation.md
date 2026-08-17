# Dev Argument — Skill candidate 独立 GATE + JUDGE 评审

## 结论

**HARD GATE FAIL。** 候选在核心论证、动态证据、时间定位和未知纪律上表现很强，但未通过“未检查通道为零”和 Meta-GATE：非旁白音频没有进入载体清单；结尾 `CUE-055` 的希望性收束虽然存在于逐字稿，却没有进入知识单元、结构关系或成文文章。

JUDGE 不能覆盖这一失败。`evaluation.json` 为满足既定 schema 的必填数值保留了非裁决性的观察分；这些分数不表示候选通过。

## 独立性与口径

- Ground truth：仅使用 `audit/audit.json`、`audit/audit.md`、`evidence/evidence-pack.json`。
- Candidate：仅使用 `skill-run/probe.json`、`capture-protocol.json`、`targeted-evidence/targeted-evidence.json`、`reconstruction.json`、`article.md`。
- 未读取现有人工报告、baseline 或 skill-run notes；未让候选的 `coverageMatrix` / `metaGate` 自证完整性。
- Evidence coverage 分母为审计 `ATOM-001`—`ATOM-028` 中 27 个核心知识单元，排除非核心身份单元 `ATOM-005`；视觉载体观察 `ATOM-029`—`ATOM-034` 归入通道与元覆盖审计，避免重复计数。
- Unsupported inference 分母为 19 个结构化 knowledge-unit statements + 17 个 structured relations，共 36 项。
- Timestamp accuracy 检查 `article.md` 使用的全部 23 个唯一 `TARGET-*` 引用。
- Process dependency 分母为审计 `argument_structure.edges` 的 19 条关系。
- Unknown discipline 分母为审计 `UNK-001`—`UNK-014`。

## 硬闸结果

| GATE | 结果 | 阈值 | 判定 |
|---|---:|---:|---|
| Critical-question recall | 17/18 = 94.4% | ≥85% | PASS |
| Evidence coverage | 26/27 = 96.3% | ≥90% | PASS |
| Unsupported inference | 0/36 = 0% | ≤5% | PASS |
| Timestamp accuracy | 23/23 = 100% | ≥90% | PASS |
| Process dependency completeness | 19/19 = 100% | ≥85% | PASS |
| Unknown discipline | 13/14 = 92.9% | ≥90% | PASS |
| Unchecked channels | 1 个未检查 | 必须为 0 | **FAIL** |
| Meta-GATE | 有未守载体、意义变化、关系 | 三类均须为空 | **FAIL** |

## Critical Questions 逐项召回

| CQ | 结果 | 候选表现 |
|---|---|---|
| CQ-001 核心结论 | 召回 | 成本、随机返工、现实理解边界、机构受众和普通创作者行动均被恢复。 |
| CQ-002 真实价格 | 正确 Unknown | 明确说明没有公开价格或订阅方案。 |
| CQ-003 绝对日期 | 正确 Unknown | 明确说明普通用户确切开放日期未给出。 |
| CQ-004 开放时间内部张力 | **未召回** | 两组说法都被复述，但未明确指出“很快/年底前上线”与“算力跟上前不会开放”的内部张力，也未给出“形式开放 vs 经济可及”的稳定解释。 |
| CQ-005 两条直接成本依据 | 召回 | 区分未具名 8×A100/3 小时估算与 CTO 20 秒 720p/几分钟转述，并保留后者未知。 |
| CQ-006 估算能否复算 | 正确 Unknown | 明确缺来源、完整公式和条件。 |
| CQ-007 随机性如何进入成本 | 召回 | 正确保留“失败/重试 → 有效成片成本上升”的中介关系。 |
| CQ-008 资本/估值/耗电能否证明价格 | 否定召回 | 明确说明这些只提供规模感，不构成单用户定价模型。 |
| CQ-009 降价条件 | 召回 | 部分开源 + 社区参与被恢复，CloseAI 被标成修辞反驳。 |
| CQ-010 物理正反例 | 召回 | 海盗船/水波和吹蜡烛均以动作序列恢复。 |
| CQ-011 两个样片能否证明物理理解 | 否定召回 | 明确拒绝由两个精选例子推到系统能力。 |
| CQ-012 饮料选择是否测试 | 召回 | 正确归为社会理解设问，不是模型测试。 |
| CQ-013 为什么是大型公司 | 部分答案正确 | 仅归因为资金承受力，并指出预算、阈值和 ROI 缺失。 |
| CQ-014 AGI 大脑是否推出 | 否定召回 | 识别为无定义、机制和证据的扩大主张。 |
| CQ-015 普通创作者行动 | 召回 | 工具、手机类比、故事和个人魅力均在。 |
| CQ-016 结尾立场 | 召回 | 明确呈现为工具主义而非反 AI；但希望性尾句本身未进入文章。 |
| CQ-017 证据与修辞 | 召回 | 能区分样片/截图的有限证据作用与 CloseAI、规模意象等修辞。 |
| CQ-018 与替代工具是否统一测评 | 正确 Unknown | 明确说明缺少同条件比较。 |

## Evidence coverage

覆盖的 26 个核心单元包括：开篇 framing、产品定义和能力让步、未经核验的算力与采访说法、随机返工乘数、资本/估值/耗电的规模性角色、价格预测、开源例外与反驳、物理正反例、社会语境扩展、机构受众、AGI 跃迁、替代工具、手机类比、故事和个人魅力。

唯一未作为知识恢复的核心单元是 `ATOM-028`：`CUE-055` 的“当下勒紧裤腰带，但希望 AI 让所有人拥有美好未来”。候选确实逐字复制了该 cue，但：

- `KU-18` 的时间范围结束于 219.89，早于 `CUE-055`；
- 没有独立 KU 表述该希望性收束；
- `article.md` 在故事/个人魅力后结束，没有恢复这句的情感功能。

“逐字稿中存在”不等于“知识已被重建”。

## Unsupported inference

0/36。候选对事实强度的控制是本次最强项之一：

- 8×A100/3 小时保持为未具名估算；
- CTO 的“几分钟”保留作者自己的“不知道具体时间”；
- 资本、估值、GDP、耗电只作规模 framing，不拼接成价格模型；
- 海盗船与吹蜡烛只证明可见序列，不证明模型内部的普遍“理解”；
- 饮料选择不被误写为测试；
- “未来 AGI 的大脑”被保留为无支撑作者断言。

## Timestamp accuracy

23/23 个 `article.md` 使用的唯一 `TARGET-*` 引用均准确落在其声称的区段，包括：

- 0s / 47s：开篇 framing 与正面能力铺垫；
- 72.5–84s：算力估算与 CTO 采访；
- 87.8–126.8s：随机返工、资本规模和耗电报道；
- 144–160.5s：CloseAI 与海盗船运动序列；
- 163.2–169.5s：吹蜡烛 before/during/after；
- 185–217s：社会设问、用户分层、AGI、替代工具和行动结尾。

## Process dependency completeness

19/19。审计的论证边均能在候选的结构关系、知识单元内部关系或文章叙事中找到对应：

- 能力让步 → 主命题；
- 算力估算 / CTO 限定 / 重试 / 规模 framing → 成本判断 → 开放与价格预测 → 用户分层；
- 部分开源 → 降价条件，CloseAI → 修辞性否定该路径；
- 海盗船正例 + 蜡烛反例 + 社会行为扩展 → “现实理解有限”；
- 机构受众判断 → 替代工具与手机类比 → 故事/个人表达行动；
- AGI 断言保持为邻接但未建立的关系。

这项通过不代表所有关系都被同等突出；希望性收束关系的问题由 Meta-GATE 单独拦截。

## Unknown discipline

13/14。候选正确保留了日期、价格、估算参数、精确耗时、失败率/重试次数、投资与 Sora 的直接关系、跨产品用电推断、开源策略和效果、样片代表性、饮料选择测试标准、用户预算/ROI、AGI 机制、替代工具统一测评等 Unknown。

遗漏的是 `UNK-014`：非旁白音频中的配乐、转场音效或插入片段原声。候选只声明 platform SRT 是否与音轨逐字一致未知，没有把其他音频层作为未知载体列出。

## Unchecked channels 与 Meta-GATE

未检查通道为 1：**非旁白音频**。

独立 Meta-GATE 还发现：

- unguarded carrier：音乐、音效、插入片段原声没有进入 probe / protocol / coverage matrix；
- unguarded meaning change：`CUE-055` 从当下经济压力转向“所有人拥有美好未来”的希望性变化没有进入知识单元或文章；
- unguarded relationship：普通创作者被排除的焦虑 → 当下仍可行动 → 普惠希望的闭环停在第二步。

候选自己的 `metaGate.pass=true` 是被审对象的自检，不能证明自己的完整性；独立对照发现上述缺口后必须判 FAIL。

## JUDGE（不具裁决效力）

硬闸未全过，因此这些分数不能用于宣布通过：

| 维度 | 观察分 | 说明 |
|---|---:|---|
| Readability | 5/5 | 文章层次清楚，先结论再拆两条论证链。 |
| Knowledge prioritization | 4/5 | 把成本乘数、正反例、行动出口放在前台；内部开放张力未突出。 |
| Evidence usefulness | 5/5 | 证据定位具体，动态证据没有被单帧替代。 |
| Execution / decision value | 4/5 | 能支持读者区分“视频主张”和“外部事实”，并给普通创作者行动。 |
| Compression without loss | 4/5 | 主干压缩稳健，但丢失希望性尾声并漏掉非旁白音频边界。 |

最终裁决仍是：**HARD GATE FAIL**。
