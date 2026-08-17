# Skill-run repair notes

## 修复范围

仅修改本视频 `skill-run`。没有修改 `audit/`、`evaluation/` 或旧报告/分析库，也没有生成 READY 声明。

## discrepancies 修复映射

- D-01 / D-02：新增 `audio-review-full.mp3`、`audio-listen-evidence.json` 和 `audio-stage-observations.json`。完整 0–14.9 秒音频由 29 个 1 秒、0.5 秒重叠窗口实际处理，并形成 10 个按 cue/间隙/尾声划分的阶段观察。`CAR-08`、`KU-30`、`CQ-11`、coverage 与 meta rationale 改为引用实际音频派生证据；元数据和静帧不再充当音频检查。
- D-03：协议音频动作改名为 `ACT-AUDIO-LISTEN`；Logo 动作与 Lovart 语义保持一致。更新协议后重跑 targeted capture 和 OCR，使 manifest 的 action ID、carrier、reason 与最终协议同步。`ACT-AUDIO-LISTEN` 的静帧明确只作阶段视觉锚点。
- D-04：删除所有错误的旧段数措辞，统一为六张工具卡、六类结果、六段并列映射。示例自身的“至少五种海报构图”不是段数，保留不变。

## 音频阶段结论

- 00:00–00:14.90：背景音乐跨全片存在并连接六段。
- 00:01.90–00:03.06、00:04.85–00:05.26、00:07.24–00:07.63、00:11.73–00:12.19：无字幕间隙中音乐更明显。
- 00:11.73–00:12.19：可谨慎描述为音乐性/电子纹理过渡；不命名具体 scratch 音效。
- 00:14.14–00:14.90：口播结束后保留明显的合成器/键盘型音乐尾声。
- 曲名、作者、版权、来源、具体乐器和低置信事件标签仍未知。

## 不变内容

即梦—豆包水印冲突、Lovart 副文案、PPT/UI/3D/网页计数单位、六段并列非流程关系，以及所有真实生成因果/操作/文件/采用条件未知均保持不变。

## Canonical coverage 修复

- `coverageMatrix.relationships` 的 REL-01 至 REL-13 已移除全部 `KU-*` 占位引用，改为可解析的 cue、shot、targeted frame、OCR 或已注册 source/audio 引用。
- 每条关系的证据均覆盖其 source/target 两端：六组工具卡与结果分别有卡片/口播和结果证据；并列结构、手势指向、剪辑顺序与因果未知、开头/结尾、technical shot 与语义段、即梦/豆包冲突及音频节奏连接均保留两端依据。
- `SRC-OCR-REVIEW.producedBy` 的人工复核范围由过时的 103 帧修正为当前 manifest 与 OCR 处理记录共同确认的 108 帧；当前 OCR 文件中 108/108 帧状态均为 `processed`。
