# Holdout-fix canonical Skill run notes

## 运行边界

- 唯一写入目录：`/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/holdout-fix/skill-run/`
- 输入仅使用：指定 MP4、指定 SRT、`holdout-fix/evidence-v2/evidence-pack.json`
- 未读取任何 `dev-*`、holdout audit、baseline、既有 report/analysis/editorial notes 或其他 `skill-run`
- 未修改 canonical Skill、原媒体、SRT、evidence-v2 或其他目录

## Skill 与契约

完整读取并执行：

- `/Users/hhh0x/.codex/skills/video-content-reconstruction/SKILL.md`
- `references/probe.md`
- `references/evidence-policy.md`
- `references/capture-protocol.md`
- `references/reconstruction.md`
- `schemas/probe.schema.json`
- `schemas/capture-protocol.schema.json`
- `schemas/reconstruction.schema.json`

冻结版 Skill 的 Required output 仍列出独立 `evaluation.json`、`gate-report.json` 和 `READY_FOR_DOWNSTREAM_USE`。本次任务的更新契约明确要求“不自评 READY，不生成独立 evaluation”。因此本 runner 只完成 probe、动态 protocol、targeted capture、Vision OCR、人工 OCR/UI review、structured reconstruction、schema validation、文章与运行记录；没有生成 evaluation、gate-report，也没有输出 READY/NOT_READY 状态。

## 实际执行

1. 逐字读取 7 条 SRT cue，并核对 evidence pack 的 29.096 秒时轴、5 个 shot、cue↔frame↔shot 映射。
2. 从原视频派生 2 fps 探针帧与 1 fps 全片 contact sheet，建立 9 段无缝 carrier sweep。
3. 确认媒体有 44.1 kHz 立体声 AAC 音轨；对全混合频谱和 L-R 侧声道做独立检查。侧声道 RMS 约 -40.12 dB，中声道/全混合 RMS 约 -11.94 dB；未分离出与关键视觉事件对齐的明确非旁白事件，但保留被旁白遮蔽与居中声音未知。
4. 动态协议包含 14 个 capture action，派生 85 张定向帧，覆盖失败 Word、提示词、HTML 响应、运行预览、选择、Word 粘贴状态、最终结果、首尾情绪框架和音频事件对齐。
5. macOS Vision OCR 对 85 帧处理成功，产出 678 行，0 失败。人工逐帧复核后，接受 12 个完整或限定范围的 OCR 行；误识别的“諭出/排板/仿末/份来/学符/HTMAL”等均未静默更正，改用源帧视觉观察并在 `ocr-review.json` 记录接受/拒绝范围。
6. 关键新发现：画面并非展示“另建纯文本文档”。它显示 Word 空白文档；HTML 代码块带“运行 HTML”，随后出现渲染预览，预览文字被选中，再切到 Word 粘贴状态。发送点击、运行点击、复制命令、粘贴命令和具体选项均未连续显示。
7. 最终只保守计为一个 Word 结果组；不将作者“立马解决/全对了”的措辞升级为通用成功率或因果事实。

## 结构校验

执行 canonical `validate-schemas.py`，结果：

```json
{"pass": true, "validated": ["probe", "protocol", "reconstruction", "ocr"], "failures": []}
```

文章 `article.md` 仅在以上结构校验通过后，从 `reconstruction.json` 生成。

## 产物清单

- `probe.json`
- `capture-protocol.json`
- `targeted-evidence/targeted-evidence.json` + 85 张原始定向帧
- `targeted-evidence/ocr-evidence.json`
- `targeted-evidence/ocr-review.json`
- `reconstruction.json`
- `schema-validation.json`
- `article.md`
- `probe-observation/`（探针帧、contact sheet、音频频谱与侧声道诊断）

未生成：`evaluation.json`、`gate-report.json`、独立 evaluation 或 READY 声明。
