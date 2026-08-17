# 69424c0d000000001e039745：fresh GATE → JUDGE evaluation v3

## 判定

**独立硬 GATE 全部通过；随后完成 JUDGE。**

本次只读取当前 `evidence/`、当前 `skill-run/`、当前独立 `audit/` 与 canonical evaluation protocol/schema；没有读取或继承任何旧 evaluation 的结论、分数或差异判定。Candidate 未被修改，本报告也不作工作流 READY 声明。

## GATE 结果

| 硬闸 | 计数 | 阈值 | 结果 |
|---|---:|---:|---|
| Critical-question recall | 6/6 = 1.000 | ≥ 0.85 | PASS |
| Evidence coverage | 30/30 = 1.000 | ≥ 0.90 | PASS |
| Unsupported inference | 0/31 = 0.000 | ≤ 0.05 | PASS |
| Timestamp accuracy | 37/37 = 1.000 | ≥ 0.90 | PASS |
| Process dependency completeness | 13/13 = 1.000 | ≥ 0.85 | PASS |
| Unknown discipline | 12/13 = 0.923 | ≥ 0.90 | PASS |
| Unchecked channels | 0 | 必须为 0 | PASS |
| Independent Meta-GATE | 无未受守卫闭包 | 必须通过 | PASS |

## 三项重点核验

### 1. 非旁白音频：22 段 + 9 转折通过

当前 candidate 注册了 `SRC-AUDIO-NON-SPEECH`，保存从原视频完整解码的 16kHz mono PCM、SHA-256、22 个连续时间线窗口和 9 个转折窗口。独立 evaluator 重新从允许的源 MP4 解码同规格 WAV，所得 SHA-256 与 candidate WAV 及 ledger 中的值完全一致：`10d123f104b44124663fc9e890a4a740cc6fe00d587a11e98e39768568ea0a82`。

22 个窗口从 0 覆盖到 105.629 秒，首尾相接且 gap count 为 0；9 个附加窗口分别以 7.49、14.55、31.958、38.62、44.58、58.79、73.74、89.5、96.51 秒为中心。每窗保留 Music/Speech 分数、RMS 和达阈值瞬态标签，且明确声明模型不能确认声源、字面标签、版权或编辑意图。

因此它已从“只有 codec 存在性”升级为对声音内容本身的可审计、全时轴语义检查。`KU-33` 只把广泛音乐型成分和数个瞬态转折音候选写成有界模型观察，并没有让非语音音频独立证明医学、隐私、商业或 CTA 主张。`CAR-12` 不再是未检查载体。

### 2. Relationship 一手证据通过

`coverageMatrix.relationships` 共 17 行，`evidenceRefs` 中没有任何 `KU-*`；每行至少有两个可直接解析的 cue、shot、targeted-frame、OCR 或 registered-source ref。关键跨段关系保留两端一手证据，例如：

- 开场恐惧与就医/参考限定：`CUE-001`、`OCR-00006`、`CUE-026`；
- 诊断式框架与仅供参考/及时就医：`OCR-00223`、`OCR-00720`、`OCR-00740`、`OCR-00819`；
- 品牌体验框架与商业关系未知：`TARGET-0033`、`OCR-00006`、`SRC-TARGET-MANIFEST`。

底层 `relations[]` 继续表达知识单元端点，coverage 层则只提供一手证据，没有再用知识单元 ID 冒充 evidence ref。

### 3. 三处时间越界通过

- `KU-25` 的 49.667–96.5 秒范围只引用该范围内的口播和 UI 参考/就医证据；
- `KU-28` 的 101.19–103.76 秒范围只引用结尾隐私口播、大字与 OCR；
- `KU-36` 的 40.0–56.667 秒范围只引用诊断式 UI 与相邻参考/就医提示。

跨时段语义没有被删除，而是由 `KU-03 → KU-25`、`KU-10 → KU-28`、`KU-36 → KU-25` 等关系及其两端直接证据承担。Canonical `internal_timestamp_bounds` 因而通过。

## JUDGE

| 维度 | 分数 |
|---|---:|
| Readability | 5/5 |
| Knowledge prioritization | 5/5 |
| Evidence usefulness | 5/5 |
| Execution / decision value | 5/5 |
| Compression without loss | 4/5 |

文章按说服链展开，医学因果、诊断措辞、隐私、商业关系和载体冲突优先级准确，精确 UI/OCR 与音频 ledger 便于复核。主要质量残余是篇幅偏长，部分医学/隐私边界在段落末尾和最终清单重复。

## Canonical validation

Schema validation 通过，`probe`、`protocol`、`reconstruction`、`evaluation` 与 `ocr` 均无 schema failure。使用本 v3 独立评价运行 canonical deterministic gate：**22/22 checks passed，`failedGateIds=[]`**。

## 非阻断残余

Audit 的 13 个 unknown opportunities 中，candidate 没有单列“开场旁白是否准确转述医生或记者”为未知，但已经保留报道来源、真实性、病例材料和因果边界，因此 unknown discipline 为 12/13，仍高于硬阈值。其余机器可读计数、证据例与 Meta-GATE 见 `evaluation.json`。
