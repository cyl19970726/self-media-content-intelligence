# 博主综合 Builder 执行取证（2026-09-15）

## 结论

首轮综合不是“模型没有产出”，而是一次**过程不可审计、业务结果被正确拦截的生成**：Terra 写出候选，并在最后消息中声称 21 条兼容行、196 条分类和 12 条深度重建均已验证；但候选用旧 annotations 支撑全部 7 个标签定义，业务层校验以 `portfolio_classification_registry_evidence_binding` 拒绝晋升。随后把语义分类和跨帖研究拆成两路 Terra 返工，由 Host 合并，再交 Luna 复核，才得到 `3fb043…`。

问题不能只靠继续加 prompt 解决。原执行器使用 `--ephemeral`，没有 `--json`，也没有持久化 prompt、stdout/stderr、工具事件或子进程内自查终态；`onOutput` 只刷新“仍有输出”的时间。因此这次究竟打开了哪些输入、12 份重建是否逐份读完、实际做过哪些自查，现有证据无法回答。业务层确实在子进程退出后运行分类与跨帖校验并拦住了首轮候选；缺口是无法解释子进程如何得到错误结果，以及 last-message 的“已验证”依据是什么。系统同时把“研究综合、196 行语义分类、21 行兼容组装”塞进同一次生成；研究是否让读者获得具体知识也没有绑定到候选 revision 的验收。

本报告是执行审计，不判断 Terra 的一般能力，也不从日志缺席推断“它没读”。

## 1. 目标合同

用户本轮原话是：“session-forensics 看看 builder 构建过程中出现什么问题，看看怎么优化，而不是仅仅改 prompt。”这条指令来自当前任务消息，当前界面没有可引用的 JSONL 行号；它是本次审计合同，不是首轮 Builder 的历史合同。

历史运行可以确认的合同只限于运行记录、保存候选及当时执行器留下的行为证据。当前工作区方法和执行器可用于说明**现在期望的目标形态**，不能无条件倒推首轮当时加载的全文：

- 当前 `creator-synthesis` 方法要求逐份阅读全部已构建样本的三个 `builderLenses` 与评估边界，并以“读者能否复述具体问题、概念、步骤、条件、数字、例子和限制”为内部标准（`.agents/skills/creator-synthesis/references/method.md:3-14`）。
- 它要求跨帖关系具体到概念、条件和方法，并主动找反例（同文件 `:16-22`）；五部分各自产出有逐帖支持、反例、边界和问题的 finding（`:24-34`）。
- 分类必须从本次材料自适配产生，旧 annotations 只能作背景，不能成为标签证据，也不能通过换引用伪装成自适配（`:36-46`）。
- 当前执行器 prompt 要求读取 portfolio、196 条冻结 corpus、annotations、21 条选择、public detail、批次及批次引用的每份 reconstruction/evaluation/gate；12 份深度重建是跨帖结论的主体（`packages/adapters/src/platform/synthesis/codex-creator-synthesis-executor.ts:304-317`）。
- 当前 prompt 还要求写出 196 条分类、21 条 `postAnalyses`，然后运行给定的完整校验命令（同文件 `:315-320`）。完整 validator 命令是在当前工作树中的要求；没有历史 prompt 快照，不能据此断言首轮 CLI 违反了这条后来可见的具体命令。

运行记录把本次执行绑定为 Terra medium、childRunId `1766358d-405b-4c4a-b2a2-9fb1805a4825`、inputRevision `07c293…`，并保存了两份 skill 的运行时 SHA（`/Users/hhh0x/self-media/.runtime/runs/ae713242-656f-48bf-8f2b-42aa16201e3d/creator-synthesis/synthesis-runtime.json:2-18`）。当前 `SKILL.md` 的 SHA 仍匹配；当前 `method.md` 的 SHA 已是 `0c2b60…`，不等于运行记录中的 `82778b…`。因此只能确认运行时加载过对应 digest，不能用当前 method 文本逐条判首轮执行是否违约。

## 2. 可恢复的执行物证与取证边界

### 能证明的

1. `startedAt` 是 `2026-09-15T03:18:06.064Z`。候选后来被复制保存，文件 mtime 不能可靠推算首轮耗时，本报告不作耗时判断。
2. 首轮最后消息声称 Schema、21 行、196 行、12 份深度覆盖均已验证（`synthesis-last-message.txt:3-9`）。这是一项待质证的子进程自述，不是命令输出。
3. 保存的首轮候选是 `.runtime/creator-pilot-20260915/classification-repair/original-creator-analysis.json`，SHA-256 为 `7ea12d…`。按紧凑 JSON 序列化测得 125,718 字节，其中 `portfolioClassification` 85,277（67.8%）、`postAnalyses` 15,868（12.6%）、`crossPostResearch` 11,442（9.1%）。该比例只说明交付结构，不是 token 账单，也不能证明因果。
4. 首轮五个 section 均只有 1 个 finding。单独看数量不能判质量，只能描述当时输出形态。
5. 首轮标签表 7/7 个 `evidenceRefs` 指向旧 annotations（原候选 `:643-714`），196 行的媒介归属各有一个 `mediaType` 引用（首行见 `:719-735`）。业务层校验以 `portfolio_classification_registry_evidence_binding` 拒绝候选；用当前固定输入重跑项目 `validate-candidate.ts` 也得到同一错误。当前工具依次执行 Schema、分类引用绑定和跨帖绑定（`.agents/skills/creator-synthesis/scripts/validate-candidate.ts:21-46`）。

### 不能证明的

- childRunId 是执行器本地 `crypto.randomUUID()`，不是 Codex session ID。`session_locate.py` 对 childRunId 和 pilot runId 均为 0 命中，不能单独证明没有日志。
- 按 2026-09-15 时间窗定位后，对当日候选会话用执行 prompt 特征词做 `drill.py` 有界检索，没有找到这次 Builder；时间最接近的 11:19 会话经 metrics/drill 确认是另一项网页检索。到此停止扩大检索。
- 执行时的代码用 `--ephemeral` 且未加 `--json`；`runFileInput` 的输出没有写入文件，回调只更新时间。现存 runtime 只存模型、input revision 和 skill digests，last-message 只存最终自述。因此本次有界取证没有找回逐文件读取轨迹、读取深度、候选生成步骤或子进程自查返回码；不能依据现有材料补写这些动作。
- 项目内校准按五个语料根运行但 `kept=0`，没有有效基线；本报告不作分位或“异常高/低”判断。

## 3. 执行偏差与错误链

### 最大裂缝：完成宣称没有绑定验证物证

last-message 说“已验证”，但业务层随后拒绝候选，保存的精确候选重跑也失败。这里有两个不同状态：`completed` 只表示 CLI 子进程正常退出；外层 `validateClassification` / `assertValidCrossPostResearch` 决定业务候选能否晋升。后者正确拦住了首轮候选，系统没有把无效候选发布。裂缝在于子进程的完成自述没有绑定可机读的自查物证，导致无法解释其为何声称已验证，也无法把失败定位回具体生成步骤。

### 错误链 A：把旧分类包装成自适配分类

1. 保存候选的 pinned inputs 包含旧 annotations；运行时 skill digest 表明另有项目方法被加载，但历史 prompt 与当时 method 正文未保存，无法精确复原两者在指令中的措辞和优先级。
2. 首轮结果沿用 7 个旧标签定义，并用旧 annotations 的 `#/rows` 为标签注册表作证；196 行中的文字也明确写“沿用表层标注”。
3. 完整 validator 拒绝 `portfolio_classification_registry_evidence_binding`；候选未发布（`docs/development/creator-pilot-2026-09-15.md:89-93`）。
4. 后续 Terra 返工不得不逐条读 196 个标题，生成 23 个标签与 196 行分类，并为 12 个深读样本增加同帖 `deep_builder` 归属（`.runtime/creator-pilot-20260915/semantic-classification-notes.md:1-9`）。
5. 后续修订草稿还出现并被纠正了 OpenClaw 龙虾误归宠物、CometQ 误归户外、模糊金额误推商业信号（pilot 文档 `:95-97`）。这些错误属于返工阶段，不能归因到首轮候选；它们说明逐条语义分类本身需要独立复核。

返工成本：至少一次首轮生成 + 一路 Terra 语义分类重做 + Host 合并/抽查 + 后续 Luna 复核。被剥夺的决策是首轮结束时 Host 无法判断它究竟逐条语义分类过，还是复用了 annotations；只能从成品确认其标签证据和定义沿用了旧分类，不能还原其内部阅读过程。

### 错误链 B：结构通过倾向掩盖研究密度不足

1. 首轮把约 67.8% 的序列化输出用于分类；跨帖部分约 9.1%，五节各 1 finding。
2. 返工把“语义分类”和“跨帖关系”拆给两路 Terra，Host 合并；最终 knowledge 从 1 条扩为 3 条，其余节仍各 1 条，最终候选 SHA `3fb043…`。
3. Luna 对最终 revision 的 7 个 gate 全部通过，但 gate 主要验证 21/12/196 覆盖、同帖引用、三层存在、研究/创作分离和后台指标边界（`creator-synthesis-evaluation.json:1`）。它没有独立要求读者复述“具体学到了什么”，也没有对具体知识完整性逐项比对来源。
4. 后续 Host 实际页面阅读仍发现：正文先给抽象关系，具体产品、步骤和取舍多藏在依据或单帖，主要知识联系没有短标题，扫读成本高（pilot 文档 `:105-110`）。

这不能证明首轮没深读；它证明现有验收对象偏向结构与引用闭合，无法挡住“形式合格、读者获得的具体知识仍薄”的结果。返工成本是第二路 Terra 跨帖修订、Host 页面阅读，以及下一轮仍需围绕具体例子和差异模式继续改进。

## 4. 升层点

这里本该“停下来”的不是让 Builder 向人询问内容判断，而是让执行系统拒绝完成并留下可恢复状态：

1. **业务 validator 非零时**：现有外层已经正确拒绝晋升；还应把子进程 attempt 与业务阶段分开记录，保存候选 revision、校验命令、stdout/stderr 和失败码。`completed` 可以保留为进程终态，但必须同时有明确的 `candidate_rejected` 业务终态。
2. **任务装配前**：196 行语义分类、21 行兼容投影和跨帖研究是三种不同工作。分类/兼容行有明确机械合同，应该先生成并确定性校验；研究 Builder 只接收冻结的分类结果与 12 份深读材料，避免让大量重复 JSON 与研究推理竞争同一次交付。
3. **独立评估前**：Reader 验收必须绑定候选 SHA，提出可判定的问题，例如能否复述某个具体方法、两帖之间的条件差异、模式反例在哪里，并把失败定位到 finding 与 evidenceRef。不能用提高 finding 最小数量、字数或继续加规则代替理解验收。
4. **skill/input 版本保存时**：digest 只能证明“某内容曾存在”，不能恢复内容。每个 attempt 应保存精确 prompt 快照、加载文件快照或内容寻址副本，并记录所有输入文件的 revision/sha；否则下一次方法改动后无法重放审计。

建议的流程形态是：`冻结输入清单与哈希 → 确定性读取清单/分类任务 → 分类闸 → 研究 Builder → validator 终态 → 独立 Reviewer → 绑定 revision 的 Reader 问题式验收`。每一步产出可寻址文件，后一步只能消费明确通过的 revision。这样优化的是任务边界、执行记录和验收表面，而不是继续扩写一个已经很长的 prompt。

## 5. 最终状态与自查

最终 `3fb043f6a0be803c06011708c2e8c8c0d44abbd4d1399517f344e5446f981996` 经 Luna 对同一 revision 的 7/7 gate 复核，注册为 reviewable（pilot 文档 `:99-103`）。这证明修订候选通过当时的结构、来源与边界闸；不证明首轮执行过程可审计，也不证明所有单帖主张已被外部验证。

按 session-forensics 五问复核：

- 新洪水源：未发现会话洪水；真正缺口是 ephemeral 子进程没有事件落盘。
- 新签名：出现“last-message 声称验证通过，但精确候选重跑 validator 失败”的完成宣称裂缝，应由终态绑定机制阻断。
- 阈值反例：没有有效本地基线，也没有使用绝对次数判好坏。
- 是否复发到可晋升 skill：本次只观察到一次，不能据此晋升新 skill；适合先固化为执行 trace 与完成 gate。
- 上一轮建议造成什么：现有流程把越来越多方法约束放进 prompt，却没有等量增强可恢复执行证据与 Reader 验收；结果是规则存在但无法证明被执行。优化必须同时给“减少单次 Builder 职责”设下限：研究 Builder 至少仍需看到全部 12 份深读三 Lens、评估边界、冻结分类摘要及可解析原证据，不能把拆分变成摘要化输入。

本次只读审计没有修改 Builder、prompt、候选或评估；唯一新增文件是本报告。
