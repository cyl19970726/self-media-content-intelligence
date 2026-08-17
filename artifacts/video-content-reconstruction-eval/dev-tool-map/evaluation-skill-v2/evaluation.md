# dev-tool-map V2 Skill candidate 独立复评

## 结论

V2 的**内容硬闸全部通过**，但 canonical 的 **fresh-context 协议前提不通过**。

这两个结论必须分开理解：就 dev-tool-map 这条视频本身，V2 已经闭合已知的视觉、文本、音频 unknown 与全局关系；但 `run-notes.md` 明确写明 runner 读取了上一版 `discrepancies.md`，并用它设计 probe 问题和 stopping rules。因此本轮能证明“针对已知缺陷的回归修复有效”，不能证明 Skill 在未见诊断的新视频上也能自行发现这些缺陷。

不作生产、发布或交付状态判定。

## 内容 GATE

| GATE | 重新计数 | 阈值 | 结果 |
|---|---:|---:|---|
| Critical-question recall | 14/15 = 93.3% | ≥85% | PASS |
| Evidence coverage | 23/25 = 92.0% | ≥90% | PASS |
| Unsupported inference | 0/31 = 0% | ≤5% | PASS |
| Timestamp accuracy | 37/37 = 100% | ≥90% | PASS |
| Process dependency completeness | 8/8 = 100% | ≥85% | PASS |
| Unknown discipline | 9/9 = 100% | ≥90% | PASS |
| Unchecked channels | 0 | 必须为 0 | PASS |
| Meta-gate | true | 必须 true | PASS |

Critical-question recall 的唯一不完整项是原审计 CQ-15：candidate 明确说“不是教程”且没有操作链，但没有完整列出“无比较标准、无排名/选择建议、无价格/版本/链接、无 CTA”。这不使比例跌破阈值。

Evidence coverage 以独立审计 AE-001–AE-025 为分母。两项未完整覆盖：

- AE-001：有时长，没有把 1080×1920 与 30 fps 重建成知识。
- AE-025：有无 UI/提示词/参数/生成/导出/交接，但没有完整保留无价格比较、版本、注册方式、耗时、失败案例与 CTA。

## 指定核查项

### OCR 与六张卡片副文案

通过。六张卡片的 headline 与 subline 均有 OCR line ID、source frame 和人工核对决定。V2 正确修正了 `视领→视频`、`Al→AI` 等 OCR 提议，并保留通义卡片本身的省略号截断，没有猜补隐藏文字。Runway 的 SRT“一键穿搭”与烧录字幕“一键换穿搭”也分源保留。

### carrierSweep

通过。10 个连续区间无缝覆盖 0–16.556 秒，且 speech、字幕、完整卡片、手势/视线、动态结果、likeness/symbol、layout/count、全局剪辑、AI 标签、非语音音频和 absent UI 均有独立 carrier。没有再用候选自己的缩减 carrier 清单制造空转 meta-gate。

### cueAccountability

通过。CUE-001 至 CUE-006 各出现一次，每条均 disposition 为 knowledge，并链接到对应 card/claim/result/limit 单元。CUE-003 连接全称范围判断，CUE-004 连接 SRT/烧录差异与 one-click unknown，CUE-006 连接图片工具到动画桥接。

### Manus 3×12

通过。SHOT-006、007、008 被保留为三组独立结果，每组 12 个可见缩略图。V2 还正确区分布局：第一组 4×3，第二、三组 3×4；“36”严格限定为可见缩略图实例，不升级为 36 个文件或三份可编辑交付物。

### Runway 两套完整造型

通过。按“完整协调造型，不按擦除、帽子或单个配饰变化计数”，baseline 之外支持两套：条纹/贝雷帽/心形眼镜，以及浅色内搭/灰外套/草帽。没有再过数成三套。

### Vidu likeness / identity / 全称范围

通过。V2 同时保留可观察的 Steve Jobs 式样、黑色高领衫、眼镜、Apple logo，以及 literal identity、授权、素材来源 unknown。它没有因谨慎抹去 likeness，也明确判定一个单例不足以建立“任何人”的全称范围。

### 非语音音频 unknown

通过。AAC 音轨与技术能量/结尾静音被记录，但音乐、音效或插入源音频的具体类别与语义作用保持 unknown。技术可见性没有被升级成语义解释。

### Global relations

通过。同一主持人/房间提供连续性，手势维持列表节奏，硬切分隔六个并列条目；没有文件、API、程序调用或 output-to-input handoff，因而不是跨工具 pipeline。

## JUDGE

JUDGE 仅在上述内容硬闸全部通过后执行。

| 维度 | 分数（1–5） | 说明 |
|---|---:|---|
| Readability | 5 | article 的六项结构和边界说明清楚，重要差异可快速扫读 |
| Knowledge prioritization | 5 | 高风险卡片、计数、身份/范围与静态—动态边界都被前置 |
| Evidence usefulness | 5 | OCR、cue、shot、targeted frame 与 derived audio 引用职责分明 |
| Execution value | 4 | 对内容理解和风险判断很有用，但源视频本身没有可执行工作流 |
| Compression without loss | 4 | 核心信息基本无损；文章稍长，且仍漏少量全片负空间 |

这些分数不抵消下面的协议问题。

## Fresh-context 协议完整性

**FAIL。** Canonical evaluation protocol 明确要求 runner 在 fresh context 中只获得原视频/字幕，不能获得已有报告、预期答案、诊断或先前结论。`skill-run-v2/run-notes.md` 则明确承认读取上一版 discrepancies，并据此设计 adversarial questions 与 closure requirements。

因此，本轮是有效的定向 regression evaluation，不是有效的盲测 generalization evaluation。要验证 Skill 本身是否学会了这些闭包，需要换一条未见视频、不给任何先前诊断，重新跑 auditor → runner → independent evaluator 拓扑。

完整计数与 examples 见 `evaluation.json`，残余差异见 `discrepancies.md`。
