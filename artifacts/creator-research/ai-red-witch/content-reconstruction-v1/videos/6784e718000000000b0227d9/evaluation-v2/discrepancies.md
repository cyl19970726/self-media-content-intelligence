# 修复闭合与新增差异 — 6784e718000000000b0227d9

本轮只把旧 `evaluation/discrepancies.md` 当作修复目标清单；未继承旧 evaluation 的结论或分数。

## 旧差异闭合状态

### D-01 — 非语音音频通道未被实际检查：内容证据已闭合

- 当前证据：`skill-run/audio-review/source-audio.m4a`、五个无缝 MP3/PCM 分段、`audio-review.json`、更新后的 `audioReviewActions`、`KU-28`、`KU-29`、`REL-12`。
- 独立核验：从原 MP4 重新 stream-copy 的 AAC 与候选音轨 SHA-256 一致；五段 PCM 时长合计并无缝覆盖 `0—48.667`。
- 判定：候选已经对真实音轨做有界内容检查，不再用静帧、字幕或容器元数据自证。曲目、权利信息、精确短促音效身份和逐帧同步仍被正确保留为未知。
- 影响：独立 `uncheckedChannels=[]`；“是否实际检查”这一内容问题不再阻断。另有机器 token 契约问题，见 D-V2-02。

### D-02 — “视频录制日期”未知未被明确保留：仍未闭合

- 审计要求：明确保留“具体平台、应用、模型与版本，以及视频录制日期”未知。
- 当前候选：已经保留端、URL、版本、账号、地区、额度、模型等未知，但在 `probe.json`、`capture-protocol.json`、`reconstruction.json` 和 `report.md` 中仍未明确写出录制日期未知。
- 严重度：非阻断；unknown discipline 为 12/13，仍高于 0.90。
- 最小修复：加入“视频录制日期及其对应的平台/应用/模型版本状态未建立”。

## 新发现

### D-V2-01 — 开场证据落在结尾知识单元的时间范围之外（硬 GATE）

- 位置：`reconstruction.json` 的 `KU-25`。
- 当前状态：`KU-25.timeRange` 为 `44.12—46.36`，证据数组却包含开场帧 `TARGET-0003`（约 `0—1.08`）。
- 为什么失败：canonical deterministic validator 要求知识单元引用的帧位于该单元声明时间范围内；当前值触发 `KU-25:frame_outside_range:TARGET-0003`，使 `internal_timestamp_bounds` FAIL。
- 内容影响：开场“设计师天塌了”与结尾“基础设计师危险了”的关系本身已被正确发现，并非语义遗漏；问题是证据定位契约不闭合。
- 最小修复：将 `KU-25` 时间范围扩展到覆盖开场与结尾，或从该结尾单元移除 `TARGET-0003`，仅在 `REL-01`/开闭关系中引用开场证据。

### D-V2-02 — 非语音音频 modality key 未匹配 canonical token（硬 GATE）

- 位置：`probe.json` 的 `CAR-07.modalityKeys`。
- 当前状态：候选写有 `audio`、`non-speech audio`、`background music`、`transient sound events`，且音频内容确实完成了源 AAC 检查。
- 为什么失败：canonical deterministic validator 只通过点号、下划线或连字符形式识别显式非语音音频 token；带空格的 `non-speech audio` 未命中，因此返回 `non_speech_audio:not_explicitly_inspected`，使 `full_timeline_carrier_sweep` FAIL。
- 内容影响：这是机器契约命名不闭合，不代表音频内容再次漏检；独立检查仍确认音轨与五段证据真实存在。
- 最小修复：在 `CAR-07.modalityKeys` 中增加或改用 `non-speech-audio`（或 canonical validator 接受的等价 token），然后重跑确定性门检。

## 已保持正确的边界

- “不到10秒”仍被限定为作者主张，剪辑后的加载片段没有被当成真实计时。
- 输入 `2024/12/3` 与结果 `2024/12/24` 的字面冲突仍被保留。
- 修改、高清、Logo、模板复制、AI 应用开发和导出仍未被升级成已完成事实。
- SRT `coz` 与烧录字幕“扣子”的载体冲突仍被保留，没有外推外部品牌关系。
- 音频曲名、来源、许可、精确音效身份和逐帧同步仍保持未知。

本文件只记录独立复评差异，不修改 candidate，也不宣布 READY。
