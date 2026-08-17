# dev-tool-map V2 残余差异

## P0 — Fresh-context 评测协议被污染

- Canonical 要求：reconstruction runner 只能获得 raw video/subtitles，不得获得已有报告、预期答案、诊断或先前结论。
- Candidate 证据：`skill-run-v2/run-notes.md` 明确写明读取了 `evaluation-skill/discrepancies.md`，并用它设计 adversarial probe questions 与 closure requirements。
- 影响：V2 可以证明已知 dev-tool-map 缺陷被定向修复；不能证明 Skill 在未见视频上会自主发现 OCR 副文案、3×12、两套造型、likeness/identity、全称范围、音频 unknown 和 global relations。
- 评审处理：内容 GATE 仍按独立 audit 重新计数；另设 `protocolIntegrity.pass=false`，不把 regression closure 冒充盲测泛化能力。

## D-01 — CQ-15 的负空间仍不完整

- Ground truth：没有教程或选择建议；具体包括没有步骤、参数、比较标准、限制、价格、版本、链接或 CTA。
- Candidate：明确说“不是教程”、无 UI/参数/生成/交接，但没有完整说明无比较标准、排名/选择指导、价格/版本/链接和 CTA。
- 影响：CQ-15 计为 materially incomplete；critical-question recall 为 14/15，仍越过硬阈值。

## D-02 — 媒体基础属性没有完整进入知识层

- Ground truth：16.556 秒、1080×1920、30 fps。
- Candidate：正文与 scope 保留时长，但没有把尺寸与帧率写入 reconstruction knowledge/article。
- 影响：AE-001 不计 covered。

## D-03 — AE-025 的重要负事实只覆盖一部分

- Ground truth：无价格比较、版本、API、注册方式、提示词、耗时、失败案例、CTA。
- Candidate：覆盖无 UI、提示词、输入、参数、文件名、生成状态、导出、跨工具交接；没有完整覆盖价格比较、版本、注册、耗时、失败案例、CTA。
- 影响：AE-025 不计 covered；evidence coverage 为 23/25，仍越过硬阈值。

## D-04 — 音频技术边界不在独立 audit 中

- Candidate：由自建 audio review track、spectrogram 和 silence detection 得出约 16.255 秒后有 0.30 秒静音。
- Independent ground truth：只确认存在音频轨，并将背景音乐/音效的语义作用留作 unknown，没有审计该精确技术边界。
- 影响：本轮通过候选产物可复核这一技术输出，且 candidate 没有据此推断语义，因此不计 unsupported inference；但该精确时间不应被当作独立 auditor 已确认的事实。

## 已闭合项

- 六卡 OCR 与全部副文案，包括 Manus“全球首款”和即梦“免费AI图片创作工具”。
- carrierSweep 0–16.556 秒无缝覆盖，所有 audit carrier 均被守住。
- cueAccountability 6/6，一条 cue 一条 disposition。
- Manus 三组、每组 12 个缩略图；36 仅为可见实例。
- Runway baseline 之外两套完整造型，不过数配饰状态。
- Vidu Steve Jobs 式样与 Apple logo 保留，同时 literal identity/授权 unknown。
- 一个单例不建立“任何人”全称范围。
- 即梦图片工具卡到运动结果之间的程序 bridge unknown。
- 非语音音频的具体语义 unknown。
- 同一主持人/房间、手势节奏、并列列表、无跨工具 handoff 等 global relations。
