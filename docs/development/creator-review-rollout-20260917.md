# 五位博主当前构建盘点（2026-09-17）

事实源：`/Users/hhh0x/self-media/.runtime/self-media.sqlite` 的 `creator_research_runs`、`research_jobs`、`research_workflow_executions`、`workflow_runs`，以及各 run 当前 pin 指向的 selection、reconstruction batch、creator analysis 和 synthesis gate。计数以当前 pin 的 batch 为准；顶层 stage message 有滞后时不采用其旧计数。

| 博主／creatorRunId | 当前选择与深度结果 | 来源冲突 | 综合当前性 | 活跃任务／租约 | 安全剩余工作 |
| --- | --- | --- | --- | --- | --- |
| AI硬件情报局<br>`ae713242-656f-48bf-8f2b-42aa16201e3d` | 21 selected，12 deep；r44：12 built，11 verified，1 built_unevaluated，0 missing/fail。Batch：`video-reconstruction-batch-r44.9bd6ebc823e1.json` | 当前 run 无 blocker。历史 source-check 曾把 `69a8030f00000000220219dd` 判 conflict，后续同帖 source-check 判 consistent；不可把历史冲突静默当作从未发生。 | **过期**：当前 analysis `creator-analysis.7d86193e19b2.json` 仍绑定 r29，而当前 batch 是 r44；gate `ready:false`（`deep_9_ready`、`deep_evidence_binding`）。 | 无 active workflow；无 queued/running job；无 lease。 | 保留 11 个 verified；只补 `6968c3c9000000000b013f4d` 的独立复核/争议裁定，并对历史 source conflict 做一次 Host 局部确认；随后用 r44 重建综合，不整批重审。 |
| 三次方AIRX<br>`6fcda414-eb27-4259-aa5a-156f24b029ad` | 21 selected，12 deep；r12：11 built，6 verified，5 evaluated_with_findings，1 not_ready。Batch：`video-reconstruction-batch-r12.06113dc697d3.json` | 未运行新 source-consistency workflow；数据库不能证明“无冲突”。 | **输入当前**：analysis `creator-analysis.296ee2e794ea.json` 绑定当前 r12；gate `ready:false`（同上）。 | 无 active workflow/job/lease。 | 只修复 not_ready `68d8c62300000000130350b1` 的 depth-frame-range，并按现有 findings 定向处理 5 帖；已 verified 6 帖不重跑。输入发生变化后再增量重建综合。 |
| 铁卫士<br>`92203c70-31bf-4240-8c25-7a1743117462` | 21 selected，12 deep；r13：10 built，8 verified，2 evaluated_with_findings，2 not_ready。Batch：`video-reconstruction-batch-r13.04b981c70a93.json` | 未运行新 source-consistency workflow；数据库不能证明“无冲突”。 | **过期**：analysis `creator-analysis.50b5a785c01e.json` 绑定 r12，而当前 batch 是 r13；gate `ready:false`（同上）。 | 无 active workflow/job/lease。 | 保留 8 verified；定向修复 `696b9f17000000001a03418a`（evidence time range）和 `6a87e123000000002c0019b2`（旧 evaluator enum），处理 2 帖 findings；再用 r13/修订后 batch 重建综合。 |
| 机器人前瞻<br>`2224f773-c005-4326-ba14-a3bf42ff444f` | 21 selected，12 deep；r12：11 built，2 verified，8 evaluated_with_findings，1 built_unevaluated，1 not_ready。Batch：`video-reconstruction-batch-r12.1444c32d5f88.json` | **未解决 blocker**：`6a916dbf000000000302829c` 的帖文是“浙大机器狗搬行李”，下载视频却是“399 美元鸭子机器人”；重复请求仍冲突。 | analysis `creator-analysis.6ae359304186.json` 绑定当前 r12，但来源冲突使其不宜视为可继续晋升；gate `ready:false`（同上）。 | v3 根流程及 12 个 post workflow 已 canceled；仍残留 10 个无 lease 的 queued `workflow.advance` job，属于待清理/核销的陈旧控制任务，不是可继续的生产执行。 | 先由 Host 解决冲突帖的正确媒体或明确排除该帖；清理 10 个陈旧 queued advance。其余 11 个候选继续复用，只对 8 个 findings、1 个未完成复核和 1 个 not_ready 做定向处理；不整批重建。 |
| 大计算算力炼丹炉<br>`f3361eca-1f6b-4640-8270-b206eda82e6e` | 21 selected，12 deep；r12：11 built，8 verified，2 evaluated_with_findings，1 built_unevaluated，1 not_ready。Batch：`video-reconstruction-batch-r12.6268f4df106e.json` | 未运行新 source-consistency workflow；数据库不能证明“无冲突”。 | **输入当前**：analysis `creator-analysis.81a50854b495.json` 绑定当前 r12；gate `ready:false`（同上）。 | 无 active workflow/job/lease。 | 保留 8 verified；定向补 `6a65e852000000001302eb0c` 的独立复核、修复 `6a8f06e0000000001f006a61` 的旧 evaluator enum，并处理 2 帖 findings；变更后增量重建综合。 |

## 判断边界

- 五个 synthesis gate 当前都不是 ready，失败项均含 `deep_9_ready` 和 `deep_evidence_binding`；“有可读综合稿”不等于“可晋升 Wiki”。
- AI硬件情报局和铁卫士的 synthesis 明确绑定旧 batch，属于可证实的 outdated。其余三份 analysis 与当前 batch pin 一致；机器人前瞻另受来源身份冲突阻断。
- 除机器人前瞻的 10 个陈旧 queued control jobs 外，没有运行中的任务或有效租约。不要启动全量 re-review 来迁移版本；应复用已 verified/built 成果，只处理 not_ready、built_unevaluated、已有 findings 和明确 source conflict，最后在输入真正变化的博主上重建综合。
- 当前 pinned refs：selection 分别为 `43acf6a631f1`、`a268bf69fd5a`、`79d7b913b13d`、`ca8e6a47fe33`、`ca74718030fc`；synthesis gate 分别为 `91882e7a882b`、`0db01b2221d5`、`b2e2c0b15957`、`9f5005ccf116`、`85e7f33232eb`。

## 剩余四位逐帖 rollout 清单

下面的“候选存在”按当前 pin 的 `reconstructionArtifactRef` 是否有实际文件核对。`evaluated_with_findings` 保留原 gate ID，不把质量意见改写成执行故障；`single_pass_evaluation_contract` 和 `runner_execution` 也不冒充报告质量问题。

| 博主 | postExternalId | 当前状态 | 候选存在 | 实际问题／gate | 安全动作 |
| --- | --- | --- | --- | --- | --- |
| 三次方AIRX | `699045b2000000001a02cd97` | evaluated_with_findings | 是 | `eval_unsupported_inference`, `CR-02`, `DL-04` | v5 复用候选，按 findings 做一次定向 Builder 修订与独立复核 |
| 三次方AIRX | `68d8c62300000000130350b1` | not_ready | 是 | **Builder 结构闸失败**：`builder_integrity_depth_frame_range` | **强制 Builder 修复**帧区间；不能只重跑 Reviewer |
| 三次方AIRX | `6a3345790000000022016799` | evaluated_with_findings | 是 | `eval_critical_question_recall`, `eval_timestamp_accuracy`, `CR-01`, `DL-01`, `VE-01` | v5 复用候选，定向修订 |
| 三次方AIRX | `698d9f90000000001b01f984` | evaluated_with_findings | 是 | `eval_unsupported_inference`, `CR-02`, `DL-03`, `VE-04` | v5 复用候选，定向修订 |
| 三次方AIRX | `69955157000000001a0328ec` | evaluated_with_findings | 是 | `full_timeline_carrier_sweep` | v5 复用候选，补全时间线载体检查后定向修订 |
| 三次方AIRX | `6968821b000000000e03d304` | evaluated_with_findings | 是 | `eval_evidence_coverage`, `eval_unsupported_inference`, `CR-02`, `VE-06` | v5 复用候选，定向修订 |
| 铁卫士 | `691a71bb0000000005039103` | evaluated_with_findings | 是 | `full_timeline_carrier_sweep`, `eval_evidence_coverage`, `eval_timestamp_accuracy`, `eval_unknown_discipline`, `eval_meta_gate`, `CR-02`, `CR-04`, `CR-06`, `DL-06`, `VE-06` | v5 复用候选；findings 较多，但仍是定向修订而非从零构建 |
| 铁卫士 | `696b9f17000000001a03418a` | not_ready | 是 | **Builder 结构闸失败**：`builder_integrity_evidence_time_range` | **强制 Builder 修复**证据时间范围；不能只重跑 Reviewer |
| 铁卫士 | `6a87e123000000002c0019b2` | not_ready | 是 | **旧 Evaluator 契约错误**：`single_pass_evaluation_contract`；`evidenceRefs.kind=relationship` 非法枚举 | v5 复用已存在候选，重新独立复核；无证据要求从零 Builder |
| 铁卫士 | `6a7a0de10000000028000489` | evaluated_with_findings | 是 | `probe_inspects_available_carriers` | v5 复用候选，定向修订 |
| 机器人前瞻 | `6a203c5e0000000022028aea` | evaluated_with_findings | 是 | `full_timeline_carrier_sweep`, `eval_evidence_coverage`, `eval_unsupported_inference`, `eval_timestamp_accuracy`, `eval_unknown_discipline`, `eval_meta_gate`, `CR-05`, `DL-05`, `VE-04` | v5 复用候选，定向修订 |
| 机器人前瞻 | `6a2167aa00000000350301ed` | evaluated_with_findings | 是 | `protocol_is_probe_derived`, `eval_critical_question_recall`, `eval_evidence_coverage`, `eval_unknown_discipline`, `CR-06` | v5 复用候选，定向修订 |
| 机器人前瞻 | `6989bb34000000001a025a59` | evaluated_with_findings | 是 | `eval_timestamp_accuracy`, `eval_meta_gate`, `CR-03`, `DL-04`, `VE-06` | v5 复用候选，定向修订 |
| 机器人前瞻 | `6a8c505c000000002802e5a0` | evaluated_with_findings | 是 | `full_timeline_carrier_sweep`, `eval_unknown_discipline`, `eval_unchecked_channels`, `eval_meta_gate`, `VE-07` | v5 复用候选，定向修订 |
| 机器人前瞻 | `6aa2bb13000000002603b580` | evaluated_with_findings | 是 | `targeted_capture_execution` | v5 复用候选，补定向采集执行证据后修订 |
| 机器人前瞻 | `698eb2d8000000002801d52e` | built_unevaluated | 是；Builder validation passed | **Evaluator 未形成可接受结论**：`runner_execution` | v5 复用候选，重新独立复核；不强制重建 Builder |
| 机器人前瞻 | `69afb50b000000002202eb0e` | not_ready | 是 | **旧 Evaluator 契约错误**：`single_pass_evaluation_contract`；`evidenceRefs.kind=cue` 非法枚举 | v5 复用候选，重新独立复核；不强制重建 Builder |
| 机器人前瞻 | `6a8d9bba0000000006011239` | evaluated_with_findings | 是 | `full_timeline_carrier_sweep` | v5 复用候选，定向修订 |
| 机器人前瞻 | `6a916dbf000000000302829c` | evaluated_with_findings，但 source blocked | 是 | `eval_critical_question_recall`, `eval_unknown_discipline`, `eval_meta_gate`, `CR-05`；另有独立来源身份冲突：帖文“浙大机器狗搬行李”，视频为 399 美元 Microduck | **暂不跑 v5**；先换成正确冻结媒体或明确排除此帖，不能用 Builder 修订掩盖错源 |
| 机器人前瞻 | `6aa3a10c000000002b010414` | evaluated_with_findings | 是 | `full_timeline_carrier_sweep` | v5 复用候选，定向修订 |
| 大计算算力炼丹炉 | `6a59af640000000001033452` | evaluated_with_findings | 是 | `CR-04`, `VE-06` | v5 复用候选，定向修订 |
| 大计算算力炼丹炉 | `6a65e852000000001302eb0c` | built_unevaluated | 是；Builder validation passed | **Evaluator 未形成可接受结论**：`runner_execution` | v5 复用候选，重新独立复核；不强制重建 Builder |
| 大计算算力炼丹炉 | `6a8f06e0000000001f006a61` | not_ready | 是 | **旧 Evaluator 契约错误**：`single_pass_evaluation_contract`；多处 `evidenceRefs.kind=cue` 非法枚举 | v5 复用候选，重新独立复核；不强制重建 Builder |
| 大计算算力炼丹炉 | `6a6de15b0000000025014e08` | evaluated_with_findings | 是 | `eval_critical_question_recall`, `eval_evidence_coverage`, `CR-01` | v5 复用候选，定向修订 |

### 执行分组

- **必须强制 Builder 修复（2 帖）**：`68d8c62300000000130350b1`、`696b9f17000000001a03418a`。两者是候选本身未过确定性完整性闸。
- **可直接用现有候选进入 v5（21 帖）**：3 个旧 Evaluator enum 契约错误、2 个 `runner_execution` 未完成复核、16 个带实质 findings 的候选。v5 应保留旧错误/意见作为审计历史，并只对 Reviewer 明确指出的问题允许一次 Builder 修订。
- **先解决来源身份（1 帖）**：`6a916dbf000000000302829c`。即使 reconstruction 文件存在，也不能在错源未解决时继续晋升。
