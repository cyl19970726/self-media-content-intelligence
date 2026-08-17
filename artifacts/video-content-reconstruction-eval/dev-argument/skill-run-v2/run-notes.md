# V2 Skill run notes

## 读取范围

本次仅读取：

- 原视频 `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/low-vs-high/media/66011c23000000000d00ed40.mp4`
- 同 stem SRT
- `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-argument/evidence-v2/evidence-pack.json`
- 更新后的 canonical Skill、其 5 个直接 references、3 个 schema 与执行/校验脚本
- 获准且必读的 `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-argument/evaluation-skill/discrepancies.md`

未读取 V1 的 probe/protocol/reconstruction/article/run-notes，未读取其他 report、analysis、editorial notes 或 agent 输出。唯一写入范围为 `skill-run-v2/`。

## V2 契约执行

1. 完整重读新版 Skill、probe/evidence-policy/capture-protocol/reconstruction/evaluation references 与三个 schema。
2. 原样检查 evidence-v2 的 55 cues、19 shots、166 frameIndex 条目和 92 个 dense probe 帧索引。
3. 把 0.000–225.418 秒划为 10 个首尾相接、无空隙的 carrierSweep 区域；每区记录认知问题、观察信号、已检查替代模态、剩余未知与证据提示。
4. 重新生成 2 秒间隔的全片联系表并复查 opening、transitions、closing。
5. 单独检查音频：确认 AAC/44.1kHz/立体声/225.417868 秒；生成全时波形与频谱；以 -40dB、0.5 秒执行静音检测。非旁白声音具体角色因工具不足保留 unknown。
6. 协议执行 `capture-protocol-evidence.mjs`：16 actions、140 frames；所有 action 使用更新后 `times` 权威规则或显式密度，无单 action 超过 120 帧。
7. 因协议含 `ocr_review`，执行 `ocr-frames.swift`：140 processed frames、812 OCR lines、0 failed。
8. 人工检查全部 16 个 action 联系表，并重点核对：

   - 开篇“很快就会向公众开放”与后文“算力没跟上前不会向公众开放”；
   - 8×A100/一分钟/三小时以上与 20 秒 720p/几分钟；
   - GDP、2 万亿估值、50 万千瓦与 Sora 更高；
   - CloseAI/RED TEAMING 卡；
   - 海盗船 motion sequence 与吹蜡烛 before/during/after；
   - Runway/Pika/SVD/PixVerse，其中 OCR-00707 与源帧 TARGET-0121 一致；
   - CUE-055 的三段硬字幕，OCR-00756 与 OCR-00761 可直接接受；OCR-00751 对“勒紧裤腰带”误读，因此该行未作为精确 OCR 文本引用，改用源帧 TARGET-0129 + CUE-055。
9. 重建 25 个知识单元，其中 19 core；显式加入开放张力、非旁白音频未知、至少五种能力示例的保守计数、PixVerse 视觉文本、CUE-055 core unit 和全局“排除→行动→希望”关系。
10. `coverageMatrix.cueAccountability` 恰有 55 行：55/55 cue 覆盖、无重复、无遗漏；每个 context/knowledge cue 均链接 unit。
11. 按收紧后的 canonical reconstruction 契约完成结构归一化，不改变内容判断：登记 3 个音频派生产物并用 source ID 引用；为音频载体加入 `audio.non_speech` modality key；把全部 argument/procedural 改为 canonical 字段；把 11 个 carrier、13 个 meaning change、14 个 relationship hypothesis 与 12 个 critical question 逐项闭合到 probe ID。CQ-10 与 CQ-11 仍为 `unknown`，其余问题的原有限定、张力和反例保留在知识单元中。

## Schema 与一致性校验

按更新后的 canonical 脚本执行：

`validate-schemas.py --probe ... --protocol ... --reconstruction ... --ocr ...`

结果：

```json
{"pass": true, "validated": ["probe", "protocol", "reconstruction", "ocr"], "failures": []}
```

其他确定性自检：

- transcript 六字段与 evidence-v2 55/55 逐项、逐字符一致；
- cueAccountability 55/55、无 duplicate、无 missing；
- targeted actions 16、frames 140；OCR frames 140、lines 812、failed 0；
- knowledge units 25、core 19；`coreEvidence` 为 19/19；
- relations 21；所有 cue/shot/frame/targeted_frame/ocr/source 引用均可解析，坏引用 0；
- `derivedSources` 登记 3 项：音频 inspection JSON、全时波形与全时频谱；所有 `refType: source` 均改为已登记 ID；
- carrier sweep 连续覆盖 0–225.418 秒；11 个登记载体中 9 个 available，全部 inspected，2 个 unavailable 有排除理由；
- coverage 行与 probe ID 一一对应：carrier 11/11、meaning changes 13/13、relationships 14/14、critical questions 12/12。

## 仍需独立验收

- `metaGate.pass=true` 表示 runner 的内部协议自检未发现 unchecked channel、meaning change 或 relationship；它不替代 `evaluation.metaAudit` 的独立审计，也不构成 READY。
- 本任务没有要求独立 `evaluation.json` 或 `gate-report.json`，因此未运行依赖独立 evaluation 的最终 deterministic gate。
- 非旁白音频通道虽已检查，但具体配乐/音效/插入原声身份和作用仍未知。
- OCR 存在低置信度误读；仅引用经源帧人工核对的行，并在首句“勒紧裤腰带”处放弃错误 OCR 文本。
- 报道/估算/数字/人物/logo 未做视频外核验。
- 开放时间张力被明确恢复，但视频本身没有消解上线、公众开放与经济可及的范围差异。
- CUE-055 仅是作者愿景，不是结果保证。

## 交付文件

- `probe.json`
- `capture-protocol.json`
- `targeted-evidence/targeted-evidence.json`、frames 与 contact-sheets
- `targeted-evidence/ocr-evidence.json`
- `reconstruction.json`
- `article.md`
- `run-notes.md`
- 支撑检查：`audio-inspection/`、`probe-frames/`

本记录不进行 READY 自评。
