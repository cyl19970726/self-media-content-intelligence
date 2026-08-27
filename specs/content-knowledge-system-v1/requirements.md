# Content Knowledge System V1 — Product Requirements

Status: **Draft for Owner Confirmation**  
Depends on: `docs/vision/signal-room-llm-wiki-vision.md`

## 1. Problem

Signal Room 已经能够生成单帖、单博主、多博主研究，并已具备版本化 `ResearchConcept`、`Observation`、`Revision` 和学习循环能力。但这些能力尚未形成一条用户可见、端到端的知识主链路：

- 用户难以辨认一条判断是原始事实、单帖观察、博主模式还是跨博主规律；
- 单帖和博主分析对知识系统贡献了什么尚不可见；
- 研究概念存在于后端，但没有独立、可浏览的内容知识工作区；
- 创作内容包只能保存自由文本来源，不能固定引用知识 revision；
- 发布结果尚未以创作假设为中心回流并影响已有知识；
- 当前知识、反例、缺口和失效影响不能在一个统一表面中审计。

V1 的目标不是重新实现研究流程，而是将现有研究、知识学习、创作与复盘模块连接成一条可见、可审计的知识复利闭环。

## 2. Target users and jobs

### Primary user

内容研究者、编导、内容运营者和创作负责人。

### Jobs to be done

1. 查看一条帖子为现有知识贡献了哪些观察。
2. 查看一个博主形成了哪些局部模式，以及这些模式的样本和边界。
3. 浏览系统当前成立、候选、受限、矛盾和失效的内容知识。
4. 从概念返回支持、限定和反驳它的博主、帖子及原始证据。
5. 在创作时引用固定版本的知识，并记录本次主动测试的假设。
6. 发布后判断结果支持、限定还是反驳了创作假设。
7. 新证据出现时理解哪些知识和下游决策受到影响。

## 3. Scope

### Included in V1

- 内容知识主导航和知识首页；
- 概念列表、筛选、搜索和详情；
- 单帖、单博主、多博主页面的知识贡献投影；
- 知识成熟度、状态、范围、条件、证据和 revision 的统一呈现；
- 创作内容包对概念 revision、帖子和博主的结构化引用；
- 创作假设和预期观察信号；
- 发布/复盘观察进入学习循环的入口；
- 候选知识、反例、冲突、陈旧和研究缺口的可见队列；
- 现有 ResearchConcept 模型和 SQLite/event 真相源的兼容演进。

### Deferred

- 自动发布后的全平台私有指标采集；
- 大规模向量数据库或独立图数据库；
- 多租户和远程协同编辑；
- 任意 Markdown 双向覆盖结构化知识；
- 完全自动的概念晋升和创作决策；
- 基于非授权数据的因果推断。

## 4. Functional requirements

### R1. Unified knowledge maturity

系统必须为每一条重要判断标记且只标记一个当前成熟度：

- raw fact；
- single-post observation；
- creator pattern；
- conditional pattern；
- track-wide pattern；
- creation hypothesis；
- first-party validation result。

判断的成熟度、概念 scope 和概念 status 必须相互一致，不能只通过文案表达。

### R2. Single-post knowledge contribution

每个通过研究闸门的单帖分析必须形成知识贡献记录：

- 新产生的候选观察；
- 支持的现有概念；
- 限定的现有概念；
- 反驳的现有概念；
- 因证据不足被隔离的观察；
- 已审核但没有形成可复用知识的结果。

每条贡献必须固定分析 revision 和可解析 evidence refs。

### R3. Creator pattern synthesis

单博主分析必须把多个单帖观察综合为博主级局部模式，并显示：

- inspected corpus 和选样分母；
- 支持模式的 distinct videos；
- High / Base / Low 分布；
- 深度还原覆盖；
- 反例和混杂因素；
- 适用的主题、形式、时代和受众条件；
- 尚未达到 creator-specific 晋升门槛的候选项。

博主模式不能仅由高表现样本或主页文案产生。

### R4. Cross-creator knowledge compilation

多博主比较必须能够把可比较的博主级模式编译为：

- conditional concepts；
- track-wide concepts；
- creator-specific exceptions；
- anomalies；
- unknowns / research gaps。

跨博主知识必须固定参与比较的 creator revisions、时间窗口、平台、分母和归一化口径。

### R5. Knowledge workspace

系统必须提供独立的“内容知识”工作区，至少支持：

- 按 kind、scope、status、condition、creator、topic 和 freshness 筛选；
- 按名称、定义、观察和证据内容搜索；
- 查看当前已成立、待验证、最近被修正、矛盾和失效的知识；
- 查看研究缺口和系统建议补充的证据；
- 从概念进入 revision、观察、博主、帖子和原始证据。

知识详情必须呈现定义、排除项、状态、范围、条件、支持/限定/反驳分母、替代解释、未知边界、关系和版本历史。

### R6. Semantic relationships

系统必须使用有类型、有来源、有版本的语义关系连接帖子、博主、概念、创作决策和复盘结果。

V1 至少支持：

- `supports`；
- `qualifies`；
- `contradicts`；
- `depends_on`；
- `combines_with`；
- `conflicts_with`；
- `broader_than / narrower_than`；
- `cites_revision`；
- `tests`；
- `validated_by`。

LLM 提议但未裁决的关系必须与当前关系分开存储和展示。

### R7. Creation knowledge binding

创作内容包必须能够结构化引用：

- ResearchConcept revision；
- 参考帖子及其分析 revision；
- 参考博主及其研究 revision；
- 本次创作假设；
- 采用、改造或拒绝某项知识的理由；
- 预期观察信号和不可判断指标。

知识更新不得静默改变已经冻结的创作决策；系统应显示该决策引用了旧 revision，以及新 revision 是否使其可能陈旧。

### R8. Outcome feedback

发布或复盘完成后，系统必须能够：

- 将结果绑定到冻结的内容和创作假设；
- 对比声明过的自身基线；
- 记录执行偏差和数据缺口；
- 形成支持、限定或反驳创作假设的复盘观察；
- 将可进入研究知识的观察提交到独立裁决，而不是直接晋升概念。

### R9. Provenance and revision

所有知识写入必须满足：

- 来源可解析；
- 分析 revision 固定；
- parent revision 完整；
- 写入幂等；
- 历史不可变；
- 支持和反例同时保留；
- 上游证据失效能够传播到下游知识和创作决策。

Markdown、Notion 和其他阅读投影不能成为第二真相源。

### R10. LLM authority boundary

LLM 可以自动创建候选观察、候选概念、候选关系、摘要和缺口建议。

以下操作必须经过确定性门槛和独立裁决，必要时还需人工授权：

- 扩大 scope；
- 合并或拆分核心概念；
- 将关联判断表述为因果判断；
- 让研究知识直接成为创作指令；
- 将一次自有结果推广为跨内容规律；
- 删除、隐藏或排除有效反例。

### R11. Cross-surface navigation

用户必须能够沿以下路径双向导航，并保留原上下文：

```text
概念 ↔ 观察 ↔ 帖子 ↔ 博主 ↔ 比较
概念 revision ↔ 创作决策 ↔ 发布结果 ↔ 复盘观察
```

返回时应保留筛选、层级、选中对象和滚动上下文。

### R12. Compatibility

V1 必须复用现有：

- `ResearchConcept / Observation / Revision`；
- `research-learning.sqlite` append-only events；
- 单视频三镜头 evidence contract；
- creator research revisions 和 comparison pinned revisions；
- LearningLoop gates、adjudication 和 lineage；
- Creation Workspace content package、variant 和 publication revision。

若新需求需要扩展对象，必须提供迁移和读取兼容，不能另建一套互不一致的 Wiki 记录。

## 5. Business rules

1. 单帖观察不会自动成为博主规律。
2. 博主规律不会自动成为跨博主规律。
3. 跨博主规律不会自动成为我们的创作命令。
4. 我们的一次发布结果不会自动成为研究知识。
5. 公开互动数据不证明曝光、完播、转化或因果。
6. 缺少数据保持 unknown，不能变成零或模型估计。
7. 一个对象可以贡献多条观察，但每个视频对同一概念 revision 最多贡献一个独立 vote。
8. 新证据只能创建新 revision 或新观察，不能覆盖旧历史。
9. 一个合法学习循环可以以 `completed_no_promotion` 结束。
10. 研究页面不得混入未经授权的创作建议；创作页面必须标明研究知识与本次决策的差异。

## 6. EARS acceptance criteria

- WHEN a completed single-post analysis is published, THE SYSTEM SHALL display its new, supporting, qualifying, contradicting, quarantined, or reviewed-no-new-knowledge contributions, each pinned to the analysis revision and evidence refs.
- WHEN a user reads a judgment, THE SYSTEM SHALL display whether it is a fact, post observation, creator pattern, conditional pattern, track-wide pattern, creation hypothesis, or first-party result.
- WHEN a creator pattern is shown, THE SYSTEM SHALL disclose inspected videos, performance tiers, deep-reconstruction coverage, supporting observations, counterexamples, conditions, and current promotion readiness.
- WHEN a concept is shown, THE SYSTEM SHALL display its definition, exclusions, current scope/status/revision, conditions, support/qualify/contradict denominators, alternative explanations, unknowns, and decision history.
- WHEN a concept cites support or contradiction, THE SYSTEM SHALL provide a route to the exact creator, post, analysis revision, and evidence reference.
- WHEN an LLM proposes a new concept or semantic edge, THE SYSTEM SHALL mark it as a candidate until the required validation and adjudication complete.
- WHEN new evidence no longer supports a concept's current scope, THE SYSTEM SHALL create a demotion, contradiction, qualification, or invalidation revision and SHALL NOT mutate or delete the historical revision.
- WHEN a creation package uses research knowledge, THE SYSTEM SHALL pin the exact concept, creator, and post revisions and SHALL record the creation hypothesis and expected observable signals.
- WHEN a cited concept receives a newer revision, THE SYSTEM SHALL preserve the frozen creation decision and SHALL display whether the newer revision may make that decision stale.
- WHEN a publication result is reviewed, THE SYSTEM SHALL bind the result to the frozen creation revision and SHALL produce a first-party observation before any research-learning promotion is attempted.
- WHEN an upstream source or analysis revision becomes invalid, THE SYSTEM SHALL mark dependent knowledge and creation conclusions stale before presenting them as current.
- WHILE a user is in a research surface, THE SYSTEM SHALL NOT convert external findings into copying advice, next-post recommendations, scripts, or publishing actions.
- WHEN no candidate meets promotion rules, THE SYSTEM SHALL preserve useful observations, counterexamples, and research gaps and SHALL allow the run to complete without promotion.
- WHEN a Markdown, Obsidian, or Notion projection is edited, THE SYSTEM SHALL treat the edit as a proposed change and SHALL NOT silently overwrite canonical structured knowledge.

## 7. V1 success criteria

V1 is successful when all of the following are demonstrably true:

1. A user can open any deep-analyzed post and see exactly how it affected the knowledge system.
2. A user can open any completed creator and distinguish individual observations from creator-level patterns.
3. A user can browse at least one complete concept page from current revision to supporting and contradicting evidence.
4. A content package can pin a concept revision and preserve that decision after the concept changes.
5. A publication review can create a first-party observation without bypassing the learning-loop gate.
6. An invalidated upstream analysis makes dependent knowledge visibly stale.
7. Existing creator reports, comparison projects, learning-loop records, and publishing runs remain readable.

## 8. Non-goals

- Guaranteeing likes, collections, views, retention, conversion, or virality.
- Replacing human creative judgment with a universal formula.
- Treating every report paragraph as durable knowledge.
- Building a standalone document-management product.
- Adopting a graph database before query and scale evidence require it.
- Allowing an agent to autonomously publish because a concept is marked active.

## 9. Open decisions for target architecture

The design phase must explicitly decide:

1. Whether semantic edges extend the existing event store or use a dedicated read model while retaining the same canonical event lineage.
2. How single-post and creator analyses emit idempotent contribution manifests.
3. How concept pages are materialized: request-time projection, persisted read model, or hybrid.
4. How creation bindings extend current `sourceRefs` without breaking existing content packages.
5. How first-party results enter the learning loop while preserving research/creation role separation.
6. Which staleness transitions are deterministic and which require adjudication.
7. What search capability V1 actually needs before introducing embeddings or a graph database.
8. How current historical analyses are backfilled without treating legacy prose as eligible evidence.
