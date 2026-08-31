# Builder operator contract

Builder 是必选的“证据到结构化重建”算子。它不负责下载媒体、选择 ASR 提供方、启动转写进程，也不负责独立验收自己的结论。

## 冻结输入

- `media-preparation.json`：宿主侧媒体探测、字幕来源、语言、Provider、媒体与字幕指纹。
- `evidence/evidence-pack.json`：宿主侧确定性生成的媒体元数据、逐句字幕、镜头、稠密帧与映射。
- 原视频：只用于听觉/视觉复核和执行 capture protocol，不得被修改。
- 续跑时列出的既有 `probe.json`、`capture-protocol.json`、targeted evidence 或 reconstruction 都是冻结输入。

不得直接运行 `whisper`、`whisper-cli`、`ffprobe`、`ffmpeg` 或 `build-evidence-pack.mjs`。若冻结输入缺失、损坏或指纹冲突，停止并返回输入合同失败，让宿主处理。

## 唯一工作流

1. 读完整 evidence pack，不先写总结。
2. 写 gap-free probe：认知变化、载体、意义变化、关系、遗漏风险、关键问题、指代/边界/缺席、非语音音频决策。
3. 从 probe 推导本视频 capture protocol；每个动作必须追溯到 probe 发现或遗漏风险。
4. 先复用 evidence pack 的 gap-free dense/shot/cue frames，只让 capture protocol 补尚未回答的关键问题；不得把整段 dense sweep 再包装成 targeted action。只通过 `capture-protocol-evidence.mjs` 执行定向采集。命令路径从当前冻结根目录推导，不要反复手抄长 run ID。
5. 需要 OCR/UI 时，对同一份 targeted manifest 最多运行一次 `node scripts/run-ocr.mjs` 并人工核对提案；不得直接调用 Swift 实现。wrapper 把编译缓存放在可写的临时目录，避免把宿主权限问题误判成 OCR 能力失败。完整 OCR artifact 对该 revision 是终态：成功不得重跑；逐帧失败也保留为“已检查但不可用”，不得用同输入重试。
6. 写 reconstruction：保留全部 cue、cue↔frame↔shot 映射、知识单元、关系、未知项、逐 cue 归责与分范围 coverage。
7. 回答 meta-gate：写入稳定标识 `questionId: "uncovered_information_audit"`，并回答“原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？”。展示文本可以使用任意语言，宿主不做逐字匹配。
8. 运行 Schema 校验。宿主随后独立检查必需文件、引用、媒体指纹和 Artifact 指纹并生成 `builder-validation.json`。

## 证据纪律

- 严格区分 `raw_fact`、`visual_observation`、`author_claim`、`system_inference`、`unknown`。
- ASR 与 OCR 都是提案；保留原文，冲突另记，不静默纠正。
- `targeted_frame` 证据引用使用 `TARGET-*` 帧 ID；`ocr` 证据引用只能使用 OCR 行的 `OCR-*` ID，不能把 TARGET 帧 ID 冒充 OCR 行。任何帧/OCR 引用的时间必须落在对应知识单元范围内（允许 ±0.5 秒边界误差）。
- 定向采集会生成 `targeted-evidence/contact-sheet.jpg`。先用它做全局覆盖核对，再按未决问题查看原图；每批最多 4 张、通常总计不超过 12 张。不得一次把几十张高分辨率图片灌入上下文。
- OCR 全帧失败时不存在可引用的 OCR 行 ID。此时引用对应 `targeted_frame` 并把文字内容留作 unknown；绝不发明 `OCR-*` 占位 ID。
- 不得用 `afplay`、GUI 播放器或系统扬声器假装模型已经听见音频。只使用模型可读取的音频证据、字幕中的非语音标签和 evidence pack；若只有技术上的 audio-present 而没有可语义读取的音频证据，明确把音乐/音效语义留作 unknown。
- 每个载体同时保留兼容字段 `available/inspected`，并写入 `inspectionStatus`：`absent`、`unchecked`、`checked_readable` 或 `checked_unreadable`，以及非空 `inspectionRationale`。只有技术 audio-present、但没有模型可读语义证据时，使用 `available:true`、`inspected:true`、`inspectionStatus:"checked_unreadable"`，并把音乐/音效语义列入 unknown；这表示检查闭环，不表示获得了音频语义证据。
- 一张中点截图不能证明整个区间；连续操作、隐藏点击、网络调用和剪辑顺序不得脑补。
- Targeted capture 默认每 action 60 张、全协议 180 张唯一帧。同一时刻与字节完全相同的帧跨 action 复用。预算不是覆盖率上限：若关键语义变化、小字可读性或 before/during/after 关系确需更多帧，先在 protocol 写出理由，再显式提高；否则细化范围而不是全段 0.25–0.75 秒扫图。
- 负面结论必须写清被完整检查的时间范围与载体。
- 不联网核实产品主张，不读同级视频、博主报告、旧 audit/evaluation。

## 输出与状态

只生成宿主明确列为 missing 的 Builder Artifact。不得生成 `evaluation.json`、`evaluation.md`、`gate-report.json` 或三镜头评估文件。

宿主确定性校验通过后状态为 `BUILT_UNEVALUATED`。这可以进入工作台预览与明确标注为 provisional 的上层分析，但不能晋升为 `VERIFIED` Wiki 知识。

## 停止条件

遇到以下任一情况立即停止，不自行删档或全量重跑：冻结输入缺失/损坏、媒体指纹冲突、既有 Artifact 与 missing allowlist 冲突、关键载体无法访问、Schema 在一次局部修正后仍失败。
