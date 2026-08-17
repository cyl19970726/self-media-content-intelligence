# 688ab6260000000022020d3e 修复后独立评估

评估顺序：**GATE → JUDGE**。

本轮只使用当前 `evidence/`、修复后的 `skill-run/`、独立 `audit/` 与 canonical evaluation 协议/schema。没有读取或沿用旧评估结论，候选未被修改，本报告不声明任何下游状态。

## 结论

**独立硬 GATE：PASS。独立 Meta-GATE：PASS。JUDGE：已在独立硬闸通过后完成。Canonical deterministic gate：FAIL（20 / 22）。**

独立 audit 对原视频给出的 `fail_requires_correction` 不等于候选重建失败：原视频确实错误地把可见 Act‑Two 说成 Act One，并用有限画面支撑“任何角色、靠一张嘴、几分钟、一句话改图”等过强主张。当前修复后的 reconstruction 没有继续把这些口播当成事实，而是逐项保存冲突、证据边界与 unknown，因此通过候选评估。

但 canonical deterministic validator 仍发现两个候选内部契约缺口，所以机器闭包尚未全过；本次遵守约束，只记录问题，不修改 candidate。

## GATE 结果

| 硬闸 | 计数 | 阈值 | 结果 |
|---|---:|---:|---|
| Critical-question recall | 14 / 14 | ≥ 0.85 | PASS |
| Evidence coverage | 28 / 28 | ≥ 0.90 | PASS |
| Unsupported inference | 0 / 40 | ≤ 0.05 | PASS |
| Timestamp accuracy | 50 / 52 | ≥ 0.90 | PASS |
| Process dependency completeness | 11 / 11 | ≥ 0.85 | PASS |
| Unknown discipline | 18 / 18 | ≥ 0.90 | PASS |
| Unchecked channels | 0 | 必须为 0 | PASS |

没有使用四舍五入的“整体完整度”替代逐项计数。完整分母规则和证据例见 `evaluation.json`。

## Deterministic gate

canonical validator 共 22 项，20 项通过，2 项失败：

1. `full_timeline_carrier_sweep`：`CAR-NONSPEECH-AUDIO` 的内容确实已检查，但 `modalityKeys` 使用 `audio_stream / music / sound_effect`，没有 canonical validator 能识别的 `non_speech_audio` 形式，因此机器仍判定非语音音频载体未显式闭合。
2. `internal_timestamp_bounds`：KU‑08 的声明区间是 5.18–8.66 秒，却引用了来自后续 Performance UI 的 `OCR-00107` 与 `OCR-00108`；证据内容有效，但引用时点不在该知识单元范围内。

完整机器结果见 `gate-report.json`。这两个失败不改变 Act‑Two、Gen‑4 promo、结果播放器、音频语义或 lineage unknown 的内容判断，但它们阻止 deterministic contract 全闭合。

## 关键核对

### Act One / Act‑Two 冲突

候选正确保留了三层事实：口播/SRT/后期大字称 Act One；活动工作区底部模式标签明确为 `Act‑Two`；约 14.1–16.1 秒的完成结果播放器再次显示 `Act‑Two`。因此实际展示模式按 UI 记为 Act‑Two，作者的 Act One 只保留为冲突中的原始主张。

### Gen‑4 只是一张 promo

`Gen-4: Now for Image and Video / Try it now` 与 Act‑Two 编辑区并列，具有独立卡片和 CTA；视频没有点击、切换或运行 Gen‑4。候选没有把该宣传卡升级为当前模型或模式。

### 结果播放器不是生成耗时

14.1 秒后的页面是已完成的 Act‑Two 视频结果播放器，存在 Act‑Two 标识、播放时间线、`0:19` 输出时长和结果控制。候选同时明确：这只能证明完成结果状态，不能证明此前选择/上传、Generate 点击、进度、等待、几分钟耗时或输入到结果 lineage。

### 操作和 lineage unknown

可见 UI 支持的弱流程是：一个 driving performance 槽位（voice、gestures、facial expressions，最长 30 秒，可 Record 或 Select asset）+ 一个 character image/video 槽位 + Generate 控件。视频没有展示完整执行桥。Act‑Two 水管工式播放器结果与随后粉发动漫角色也不是同一主体或同一承载界面，二者仅剪辑相邻，不能认定属于同一生成链。

### 结尾动作与“一句话改图”

结尾约六秒确实存在连续嘴型、眨眼、头部和双手动作；但没有 prompt、编辑 UI、同图 before/after 或风格切换。候选只把它记为动态结果证据，没有用它证明“一句话 P 图/改图”。

### 音频

候选检查了完整音轨，而不是只确认“有音轨”。独立复跑源视频的三个连续窗口后，每个窗口都同时检出 speech 与 music，支持贯穿全片的背景音乐床。ding/ping 等瞬态候选低且不稳定，未被升级为独立音效；音频本身也无法区分同音的 `P图/批图` 正字法。

## 独立 Meta-GATE

Meta-GATE 通过。评估覆盖了口播、原 SRT、烧录字幕、UI/OCR、讲述者画中画、角色蒙太奇、Act‑Two 结果播放器、结尾连续动作、布局/数量、可识别造型与符号、完整非语音音频以及全时轴负面证据。关键关系均有守卫：

- Act One 口播/字幕与 Act‑Two UI 的直接冲突；
- Gen‑4 promo 与活动模式的区分；
- 已完成播放器与真实生成耗时的区分；
- 剪辑邻接与 input/output lineage 的区分；
- 分屏动作对应与生成因果/精确同步的区分；
- 开头“任何角色”全称承诺与结尾单一结果的收窄；
- SRT、烧录字幕与机器复听之间的 carrier conflict；
- 技术 shot 分段与语义连续性的区分。

候选自报的 `metaGate.pass=true` 没有作为独立通过依据。

## JUDGE

| 维度 | 分数（1–5） | 说明 |
|---|---:|---|
| Readability | 4 | 结构清楚，但对 22.5 秒素材仍较密。 |
| Knowledge prioritization | 5 | 最重要的产品身份冲突、promo 边界、结果状态和 lineage 缺口均前置。 |
| Evidence usefulness | 5 | UI 原文、播放器帧条、完整音轨、字幕冲突与有界负证据均可追溯。 |
| Execution / decision value | 4 | 能支持核查与决策；源片没有提供缺失的完整执行步骤。 |
| Compression without loss | 4 | 关键 nuance 无漏失，少量重复 caveat 可再压缩。 |

当前 audit–candidate 对照未发现实质内容残余，但仍有两项 deterministic contract 残余；详细账本见 `discrepancies.md`，权威机器可读计数见 `evaluation.json`。
