# Holdout3 Director — Skill Candidate 独立盲测评审

## 结论

所有硬 GATE 均通过，因此已进入 JUDGE。没有发现未受检的载体、意义变化或关系；没有用 JUDGE 分数覆盖 GATE。

本评审只比较指定 candidate 与独立 audit/evidence。未查看 baseline、Skill 正文、开发集、旧 holdout 或其他既有 evaluation。

## 硬 GATE

| GATE | 独立计数 | 阈值 | 结果 |
|---|---:|---:|---|
| Critical-question recall | 8/8 | ≥ 0.85 | PASS |
| Evidence coverage | 17/17 | ≥ 0.90 | PASS |
| Unsupported inference | 0/45 | ≤ 0.05 | PASS |
| Timestamp accuracy | 29/29 | ≥ 0.90 | PASS |
| Process dependency completeness | 5/5（适用） | ≥ 0.85 | PASS |
| Unknown discipline | 8/8 | ≥ 0.90 | PASS |
| Unchecked channels | 0 | 必须为 0 | PASS |
| Meta-gate | 无 unguarded carrier / meaning change / relationship | 必须全无 | PASS |

计数口径：关键问题与核心知识以独立 audit 的 8 个问题、17 个原子核心单元为分母；unsupported inference 对 candidate 中 25 个不同的正向知识命题和 20 条不同的关系命题做去重核查，未知/负证据单元不进入正向命题分母，article 的重复表述不重复计数；时间核查覆盖 29 个 knowledge-unit 时间范围。

### 关键核查结果

- 开头的“不要用 AI 做自媒体/起号/爆款”没有被当成最终的零 AI 结论。candidate 正确恢复了结尾的收窄：补知识、聊天、头脑风暴可以，一键生成完整脚本后直接照拍不可以。
- 推广者动机、“真正博主没有任何一个用 AI”、AI 只能做 60 分、百万粉/5 万赞/连续 3000 赞后降权、起号靠突然开窍等强断言和数字，全部保留为作者主张、价值判断或假设案例，没有升级成外部事实。
- 两处后果性载体冲突均保留：开头 SRT、视觉插片与机器听写不能合并为统一首句；结尾 SRT/机器听写的“人类智商编导”与烧录字幕的“人类最强编导”不能合并为统一称号。
- 人物参照没有倒置。candidate 只建立“可见蒙面人物是本片讲述者”的视频内关系，同时把其真实身份、开头数字归属和面具造型授权来源留作未知。
- 11 个技术 shot 没有被误当成 11 个语义场景。candidate 正确指出多次视觉跳切仍服务同一论证，而 SHOT-008 单段内包含好选题、流量不确定、共情、60 分/权重、起号跃迁等多个语义单元。
- 负证据有边界：具体产品/版本、平台、价格、获取路径、账号条件、地区、支持/责任主体、产品操作流程和实证材料的缺失，都限定在已检查的 0–156.367 秒视频内部与所列载体，没有外推成普遍不存在。
- 非语音音频没有被臆测。candidate 记录 AAC 音轨已检查，但现有方法不能可靠分离音乐/音效或确认其独立语义功能，因此既不声称存在，也不声称不存在。
- 20 条结构化关系的起点和终点全部不同，没有 self-edge。

## Meta-gate

独立复查未发现漏守项。已覆盖口播/SRT、烧录字幕、开头拼贴、白板与手势、人物/环境参照、技术 shot 与 dense 证据、OCR 冲突、音轨检查、负证据范围，以及开头到结尾的全局语义关系。

身份反转、产品操作的 literal failure/result signature、UI 进度/状态在原视频中不适用：本片没有产品或 UI 演示，也没有第二人物可造成身份倒置。candidate 把这些视频内缺失作为有界负证据处理，不构成 unchecked channel。编辑顺序也没有被当成因果证明；五条实际适用的论证依赖均被完整保留。

## JUDGE（硬闸之后）

| 维度 | 分数（1–5） | 理由 |
|---|---:|---|
| Readability | 5 | 文章先给出最关键的开头—结尾范围修正，并持续区分作者主张与视频事实。 |
| Knowledge prioritization | 5 | 主论点、利益动机、选题/共情、60 分/权重、起号模型和最终边界层次清楚。 |
| Evidence usefulness | 5 | 时间窗可定位，结构化结果还保留视觉、字幕、OCR、shot、负证据和载体冲突。 |
| Execution or decision value | 4 | 能形成“人类主导、AI 辅助”的决策边界，也提醒不要把平台假设当规则；但原视频本身没有可执行的选题判定法、平台证据或 AI 补知识核验流程，candidate 没有越界补造。 |
| Compression without loss | 5 | article 可读且紧凑，reconstruction 则完整保留核心知识、关系、冲突与未知。 |

## 非阻断性观察

candidate 将 audit 中相邻的“好选题是近因”和“直击人心后开始写”压入 KU-07，将多项决策边界的缺失压入 KU-25；这是有证据的聚合，没有造成核心知识丢失。结构化产物比面向读者的 article 更冗长，但前者承担可追溯性，后者承担阅读压缩，两者分工合理。
