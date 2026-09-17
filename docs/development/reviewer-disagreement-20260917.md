# 同一 AI 宠物帖的 Reviewer 分歧审计（2026-09-17）

## 目标合同

本审计只回答：同一份报告为何被 Luna 审出不同结果，差异是否来自工具调用、证据覆盖或真实视觉读取；不重做报告、不调用生产模型、不修改代码或 skill。上游指定的固定对象是三次 `post.review`：`03ee1f1c-...`、`c3eb7780-...`、`bacc5079-...`，以及最终成功的父运行 `422901ca-...`。固定报告 SHA-256 均为 `756c1af7...5323cc`。

## 结论

这不是可由“模型质量波动”解释的证据。三次运行都是 `gpt-5.6-luna`、`medium`，注入的 `reviewer-operator.md` 内容和 digest 相同。前两次甚至具有相同 prompt/input/skills hashes；最终零 findings 运行虽然 candidate 身份和批次路径变化，但 `reconstruction.json`、`evidence-pack.json`、`targeted-evidence.json` 与前两次对应文件逐字相同（本次用 `cmp` 核验）。

决定性差异是 Reviewer 自主选择了不同的文本检索窗口，而运行合同没有强制一份可验证的 evidence-coverage receipt：

- `03ee...` 在 trace `events.jsonl` 第 20–21 行明确查询 `transcript.cues[69:88]`，同时读取 `contentRestoration.blocks[5]`、`directingLogic.stages[4]` 和相关视觉缺口，随后第 22 行给出 LOVOT／三万元／只能在地面活动的两项 findings。该路径恰好覆盖 CUE-071、073、074、075。
- `c3eb...` 在第 18–19 行用 `rg` 定向搜索 `Bubble|BOOBOO|Skyris|Skirceya|LOVOT|三萬|三万|1200`，因此发现更多专名冲突。它没有留下打开原帧的工具事件，却把若干结论写成“readable burned caption”或“cue frame visibly shows”。
- `bacc...` 做了较多结构阅读，但没有查询 CUE-071–075：第 22–23 行只看 `lastCues`，第 24–25 行看 CUE-029–046；第 14–15 行只读取 targeted-evidence manifest 中若干 frame 条目。第 28 行直接返回零 findings。其第 26–27 行的 SHA 命令还因 locale 失败，但这不是零 findings 的根因，因为宿主已有固定 SHA 并最终完成绑定。

三次 trace 都只有 `command_execution`，没有 `view_image`、图像 MCP 或等价的图片读取事件。因此，前两次 findings 里“画面清晰可读”的措辞并无“Reviewer 实际看过该帧”的 trace 支撑；零 findings 也不能证明画面已检查无误。可证实的是：前两次命中了对应文本/manifest 区间，第三次漏过该区间。

## 执行偏差与错误链

Reviewer 方法明确要求读完整三 Lens，并“对关键主张和疑点回查宿主给出的证据、原帧和时间位置”（`.agents/skills/video-content-reconstruction/references/reviewer-operator.md` 第 7–10 行）。runner 只在 prompt 中列出可读路径并注入该方法（`packages/adapters/src/workflow/simple-review-runner.ts` 第 142–169 行）；输出校验只确认 JSON pointer 与 evidence ID／文件存在（第 92–139 行），不记录或验证 Reviewer 实际读取了哪些 cues、frames、source inputs。

错误链如下：

1. 证据目录和方法被提供，但没有最小覆盖清单或读取回执。
2. Reviewer 自主挑选检索窗口；一次覆盖结尾比较段，一次用专名关键词扫到它，另一次只看末尾八条 cue 和中段 cue。
3. 同一报告与同一 evidence manifests 得到 2 findings、另一批 findings、0 findings 三种互斥结论。
4. 宿主的确定性校验仅验证“引用可解析”，无法区分真实视觉读取与只读 manifest/转写文本。
5. `03ee...` 的 findings 本身有效进入 receipt，但该 child 最终 `needs_review` 的 `checked` 是 `candidate_binding_mismatch`；数据库 `workflow_runs.document` 显示 rejected 原因是候选绑定，而不是 findings 内容。最终 `bacc...` 的空 findings 被标为 `review: passed`，父运行 `422901ca...` 因而 `succeeded`。这至少造成两次审阅返工，并剥夺 Host 对“零 findings 是否覆盖了已知争议段”的判断依据。

## 升层点

本该停下来的位置不是让 Reviewer 再自由重跑一次，而是在宿主接受 `findings: []` 之前：若运行没有证明完整读取三 Lens、覆盖所有 evidence-bearing cue ranges，并对涉及可见文字的争议留下原帧读取记录，就应把结果标成“审阅未完成”。当前方法第 18 行已经规定“读不到材料是审阅未完成，不是无意见”，但系统没有把“未实际读取”变成可执行判据。

## 有界修复建议

1. 在 simple-review 输入中生成一个小型、确定性的 review checklist：三 Lens 节点、所有 `contentRestoration.blocks`、每个 stage、每个 unknown，以及每个被引用 cue/frame 的分组范围。要求 Reviewer 返回 coverage receipt；宿主验证覆盖集合后才允许 `findings: []`。下限由报告实际声明的 Lens/blocks/stages/evidenceRefs 决定，不能用固定抽样数替代。
2. 对 finding 或 unknown 冲突中声称“画面可读”的项目，要求 receipt 记录 frame ID、解析后的本地路径和一次真实图像读取事件。只有 manifest/ASR 文本时，措辞必须降为“manifest/transcript 表明”，不能宣称视觉确认。
3. 把已知争议词用于诊断性定向复核可以保留，但不要把关键词列表写成该帖专用 prompt。更稳妥的是由宿主从报告的 unknowns、专名变体和 evidenceRefs 自动派生待核对项，再强制逐项 closure。
4. 将 `candidate_binding_mismatch` 与内容审阅结果分层存储和展示。前者只能使本次绑定失败，不能让 findings 看起来像被内容层否决；重试时应显式携带“先前 findings 未被裁定”的审计状态，但不把旧结论喂给独立 Reviewer。

## 物证索引

- 有 LOVOT findings 的 trace：`/Users/hhh0x/self-media/.runtime/workflow-traces/codex-sdk/03ee1f1c-194b-47d2-ab0c-0b54cc312f85/94a84b97-dcd7-443c-bc0d-65695d977d69/545e387f-38ba-49b2-bc04-ce5c8f66d71c/events.jsonl`，第 20–22 行。
- 专名 findings 的 trace：`/Users/hhh0x/self-media/.runtime/workflow-traces/codex-sdk/c3eb7780-1026-4bbb-9f90-01c29d70455d/250e4e8d-78ac-4d69-8ac7-56bd6e2ed609/14fe43a1-a426-4796-9047-01b157bc6e6c/events.jsonl`，第 14–20 行。
- 零 findings 的 trace：`/Users/hhh0x/self-media/.runtime/workflow-traces/codex-sdk/bacc5079-404e-45cb-b1a5-69f9bf8c446b/6308a419-8043-4860-8624-2a782c5d18e6/679ba341-9b42-4189-9853-45bcfeb3f884/events.jsonl`，第 14–28 行。
- 三次模型与方法快照：各 trace 目录的 `runtime.json`、`hashes.json`、`skills.json`、`prompt.txt`。
- 运行状态与拒绝原因：`/Users/hhh0x/self-media/.runtime/self-media.sqlite` 的 `workflow_runs.document`、`workflow_events.document`；`03ee...` 为 `candidate_binding_mismatch`，`bacc...` 为 `workflow.completed`，父运行 `422901ca...` 为 `succeeded`。

## 自检五问

未发现新的高成本洪水源；现有 trace 读取可用小型事件摘要完成。未用绝对调用数判断质量。这里的新签名是“方法要求视觉回查，但 trace 只有文本命令，宿主仍接受视觉措辞或零 findings”；本次只观察到这一组分歧，尚不足以晋升为新 skill。建议的下限已绑定报告声明的全部结构与证据引用。上一轮的重跑建议造成了同稿不同结论，因此本报告把后续动作升到宿主可验证的覆盖与读取回执。
