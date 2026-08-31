# Video Builder Fast Path V1 — 需求

状态：**完成优先语义待确认；真实视频基准证明现有硬闸仍会阻断全部工作台结果**

## 问题

当前单视频任务把 Builder 和 Evaluator 串在同一个 Worker 槽位内。Builder 本身又会为几分钟的视频生成数百张近似帧，逐条探测转写和 OCR 能力，并同步生成非关键文章与运行笔记。结果是：

- 一个视频常占用一个槽位 20 分钟以上；
- Evaluator 再占用约 5–11 分钟；
- 90 条视频在 3 个槽位下难以快速形成可比较的博主结果；
- Builder 完成但尚未评估的事实没有独立状态，只能被误判为“未完成”或“已验证”；
- `codex exec --ephemeral` 让慢任务缺少可复盘的会话样本。

## 产品目标

建立一条“先稳定形成可用候选知识，再按需独立评估”的快速通道：Builder 是必选角色，Evaluator 是可选角色，确定性校验永远必选。工作台必须能够使用所有成功构建的候选；Evaluator 决定候选能否进入正式 Wiki，但不得让已经形成的候选从工作台消失。

## 需求与验收条件

### R1 — 角色与状态诚实

- 当 Builder 完成且确定性校验通过、但没有运行 Evaluator 时，系统必须记录 `built_unevaluated`，不得记录为 `ready` 或 `verified`。
- 当可选 Evaluator 完成并通过正式证据闸门时，系统才记录 `verified`；现有 `ready` 只可作为兼容投影，不可掩盖评估状态。
- 当 Evaluator 发现问题时，系统必须保留候选并记录 `evaluated_with_findings`（当前 API 可暂时投影为带 `qualityWarningGateIds` 的 `ready`），不得记录为 `verified`，也不得退回成没有可用结果的 `not_ready`。
- 只有 Builder 无法形成最小语义结果、Host 无法组装合法 Artifact、核心引用无法解析、媒体缺失或指纹冲突时，系统才记录 `not_ready`。
- Builder-only 结果可以进入工作台和暂定博主综合，但不得晋升到正式 Wiki 知识。
- `built_unevaluated`、`evaluated_with_findings` 和 `verified` 都必须在工作台可见；三者差异是可信度与晋升资格，不是“有没有结果”。

### R1A — Host 拥有机械事实，Builder 只拥有语义增量

- Host 必须从冻结 evidence pack 注入 transcript cue、时间、代表帧和 overlapping shots；Builder 不得通过复制这些字段来承担一致性责任。
- Host 必须根据实际媒体、定向取帧和 OCR 执行结果派生载体的机械状态；Builder 只描述载体角色、语义发现、限制和 unknown。
- Host 必须生成稳定的 Meta Gate ID、Artifact 路径、媒体/候选指纹和兼容状态字段。
- 当 Builder 返回可解析的知识单元、关系、逐 cue 归责和 unknown 时，Host 必须通过确定性组装生成最终 reconstruction；不得因为可确定修正的路径别名、布尔组合或本地化文本让整条构建失败。
- Host 组装不得补写 Builder 没有提出的语义事实，也不得把 unknown 变成正向结论。

### R2 — 快速通道默认策略

- 新视频任务默认使用 `gpt-5.6-terra`、`medium` 推理强度，模型与强度必须显式传给子进程，不能继承开发机全局默认值。
- 默认评估策略为 `skip`；操作员可以显式选择 `single_pass` 补做独立评估。
- 跳过 Evaluator 时不得生成虚假的 evaluation/gate/three-lens 产物。
- 无论是否跳过 Evaluator，都必须运行 Builder 侧确定性 Schema、引用、媒体指纹和必需产物校验。

### R3 — 媒体能力与证据预算

- Worker 启动时必须完成一次转写、媒体探测、关键帧和 OCR 能力预检；单视频 Builder 不得反复试错同一个不可用 Provider。
- Host 必须在 Builder 前生成 `media-preparation.json` 与冻结 evidence pack；Builder 不得直接启动或轮询 ASR、`ffprobe`、直接 `ffmpeg` 抽取或 evidence-pack 构建进程。
- 中文转写必须显式使用多语言模型和 `zh`；不得继承 English-only 默认模型。宿主优先使用 GPU 加速 `whisper.cpp`，仅在完整失败并结束该进程后有界回退。
- 相同媒体指纹的探测、转写和基础证据必须可复用，失败结果要有有限期，不能永久污染缓存。
- 证据采样必须覆盖完整时间线、所有语义变化、关键问题和必要 UI 状态；相同或近似帧必须去重。
- 定向采集必须生成全局联系表；Builder 先检查全局覆盖，再按未决问题放大少量原帧，避免“为省上下文漏画面”和“一次灌入几十张原图”两个极端。
- OCR 引用必须解析到真实 `OCR-*` 行 ID；全帧 OCR 失败时只能引用对应 targeted frame 并保留 unknown，不得发明 OCR 占位 ID。
- 证据预算不得用一个盲目的固定帧数上限牺牲覆盖率；超预算时必须记录原因和未检查通道。

### R4 — 非关键产物延迟生成

- 快速通道的同步关键路径只要求结构化 `reconstruction.json` 和其证据链。
- `article.md` 与详细 `run-notes.md` 默认延迟生成，只有用户查看或后续发布链路需要时才补齐。
- 延迟产物不能改变既有 reconstruction 的事实、引用或媒体指纹。

### R5 — 可观测性与恢复

- 每个模型/Prompt/Skill 版本至少保留一个可复盘的非 ephemeral Builder 会话样本；其余任务允许 ephemeral，避免无限积累。
- 每个 Evaluator 样本必须记录真实子进程 run ID、候选 revision 和冻结 Artifact 指纹；一个进程完成三个 lens 时不得伪装成三个独立进程。
- 工作台必须分别展示已构建、已验证、运行中、排队、失败数量，并展示当前模型、角色和最近进展。
- Worker 必须支持排空关闭：先停止领取新任务，等待已租约任务完成，再关闭资源。
- 重启后，已注册的 `built_unevaluated`/`verified` 项不得重跑；过期租约只恢复未完成项。

### R6 — 发布闸门

- 自动化测试必须覆盖 skip/single-pass 两种策略、状态迁移、重启恢复和重复领取保护。
- 先用 3 个有代表性的新视频做真实运行对比；只要媒体可读且 Builder 形成最小语义结果，3/3 都必须进入工作台，其中 Evaluator 发现的问题必须以 findings 展示而不是阻断结果。
- 三视频验收中至少保留一个真实 `evaluated_with_findings` 样本，证明系统没有通过放松为 `verified` 来伪造完成率。
- 扩展前记录 Builder 的 P50/P95、每分钟证据帧数、缓存命中和失败类别，不以“进程仍在输出”代替完成度。

## 非目标

- 本阶段不删除 Evaluator；它仍是正式 Wiki 晋升与高风险内容复核的独立角色。
- 本阶段不实现自动 Repairer；Evaluator findings 先记录和展示，不自动修改候选或循环重跑。
- 本阶段不把 Luna 设为完整 Builder 默认模型；只有基准证明质量门不下降后，才可用于简单视频或派生产物。
- 本阶段不改写已有 Git 历史，也不清除现有运行 Artifact。
