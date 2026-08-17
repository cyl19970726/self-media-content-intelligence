# 独立评估：66ac4e770000000027010f24

## 结论

**GATE 结果：FAIL。** 本轮不满足评估通过条件。

candidate 的主结论大体正确：它准确识别了这是一条 Qwen2 推荐/宣传视频，而不是 Qwen2 与 GPT-4 的同题实测；也抓住了 72B 许可例外、代码未执行、对照无评分、部署成本和评论区打包物边界等关键未知。

失败原因不是文案质量，而是两个契约层问题：

1. evidence coverage 只有 **17/20（85%）**，低于 90% 门槛。candidate 看到了基准表，却漏掉表中直接否定“全面碾压”的两项可见结果，并把不同规模的比较表压成错误的模型组合；它还遗漏五尺寸列表中的 57B-A14B。
2. unchecked channels 不为零。00:00–63.689 的非语音音频只做了振幅/静音检查，没有完成音乐、音效或其他语义角色的听辨；现有 inspection 文件明确声明它做不到这一点。

元闸同样失败：遗漏的不是一般细节，而是“旁白绝对化结论 ↔ 同屏反例”的核心关系。

## GATE

| 门禁 | 计数 | 阈值 | 结果 |
|---|---:|---:|---|
| Critical-question recall | 11/12 = 91.7% | ≥85% | PASS |
| Evidence coverage | 17/20 = 85.0% | ≥90% | **FAIL** |
| Unsupported inference | 1/24 = 4.2% | ≤5% | PASS |
| Timestamp accuracy | 20/20 = 100% | ≥90% | PASS |
| Process dependency completeness | 5/5 = 100% | ≥85% | PASS |
| Unknown discipline | 9/9 = 100% | ≥90% | PASS |
| Unchecked channels | 1 | 必须为 0 | **FAIL** |
| Meta-gate | 有未守载体、意义变化和关系 | 必须无遗漏 | **FAIL** |

### Critical-question recall — 11/12

已正确回答或正确保留未知的内容包括：

- GPT-4 只存在于钩子和推荐变化中，没有同题输出、版本、统一参数、价格、速度或评分基线。
- Qwen2 family、72B/128K、demo 页面、Llama/Qwen 双栏等身份边界总体清楚。
- 多模态没有被画面中的工作流证明；代码仅生成文本，没有执行或测试。
- 行业帖文与开发者蒙太奇只能说明有少量利好案例，不能证明行业共识或采用规模。
- 72B 许可例外、运行成本、打包物内容/来源/安全/系统要求均被正确保留为未知。
- 开场 GPT-4 钩子最后被个人推荐变化和评论区 CTA 接住，而不是被实测接住。

唯一关键漏答是**字面结果签名**：TARGET-0023@31.2s 中，Qwen2-72B-Instruct 的 MBPP 为 80.2、Llama3-70B-Instruct 为 82.3；GSM8K 为 91.1 对 93.0。candidate 只说“选取性、方法不完整、不能推出普遍优势”，没有说画面自己的两行已经直接反驳“全面碾压”。

### Evidence coverage — 17/20

本次依据 audit 的核心事实闭包划分 20 个知识单元。缺失 3 个：

1. **基准表内的直接反例**：MBPP、GSM8K 两项 Llama 3 胜出。
2. **比较表身份归属**：72B 指令表第三列是 Qwen1.5-72B-Chat；GLM4-9B-Chat 属于下方 Qwen2-7B-Instruct / Llama3-8B-Instruct 小模型表。candidate 的 KU-10 与 report.md 把它们压成了同一比较组。
3. **五尺寸列表与四列规格卡并存**：00:16.5 左右页面明确列出 0.5B、1.5B、7B、57B-A14B、72B；随后规格卡只有四列。candidate 只保留四列口径，没有解释 57B-A14B。

其余 17 个核心单元均被覆盖，包括：宣传片性质、缺失 GPT-4 实测、表中无 GPT-4 列、方法条件缺失、多模态未演示、社媒/工作流边界、三个 demo/对照界面、许可和成本、CTA、静音尾段与迟到规格卡。

### Unsupported inference — 1/24

唯一计入的正向错误，是 KU-10/report.md 将 Qwen2-72B-Instruct、Llama3-70B-Instruct 和 GLM4-9B-Chat 写成同一组主要数值对照。画面显示 GLM4 位于另一张小模型表。

candidate 对 GPT-4 缺席、代码未执行、无评分、许可条款未解释和打包内容未知的陈述，都限定了完整时间范围或相关 UI/CTA 载体，不属于无界负证据。

### Timestamp accuracy — 20/20

抽查的 20 个高影响引用全部正确落位。包括 TARGET-0001@0.2s 的开场钩子、TARGET-0016@24.3s 的规格卡、TARGET-0023@31.2s 的 72B 表、TARGET-0026@34.5s 的许可限定、TARGET-0050/0055 的 Fibonacci 状态、TARGET-0056/0062 的双栏对照，以及 63.689s 后静音和 77.467s 后迟到规格卡。

### Process dependency completeness — 5/5

该视频最终要求观众做“用什么模型、是否下载/部署”的决策，因此依赖链适用。candidate 给出的五步链完整：

1. 锁定尺寸、base/instruct、checkpoint 与量化；
2. 核对对应许可证；
3. 估算硬件、推理和持续成本；
4. 用真实任务做同提示词、同评分规则的对照；
5. 从官方来源获取，并核对评论区打包物的内容、哈希、来源与安全。

### Unknown discipline — 9/9

GPT-4 版本/套餐/价格、各 UI checkpoint 与参数、基准方法、代码执行、双栏评分、帖文来源与采用规模、72B 许可法律效果、部署 TCO、打包物内容与交付条件，均被正确保留为未知或后续验证项。

### Unchecked channels — FAIL

candidate 把音频载体标为 inspected，但实际独立产物只有 SRT 与 `silencedetect` 结果。`audio-silence-inspection.txt` 明确说明：它不能识别音乐、音效、说话人或非静音区间的其他语义角色。因此 00:00–63.689 的非语音音频仍是可用但未完成语义检查的载体。

## JUDGE

JUDGE 在硬门禁之后记录，不能抵消 GATE 失败。

| 维度 | 分数 | 说明 |
|---|---:|---|
| Readability | 4/5 | report.md 结构清楚，主线容易跟随。 |
| Knowledge prioritization | 4/5 | GPT-4 缺席、许可与成本边界被突出；但漏掉最强的表内反证。 |
| Evidence usefulness | 4/5 | 多数结论能回到时间窗、帧和 UI 状态；表格身份与结果读取仍有硬伤。 |
| Execution / decision value | 4/5 | 五步核验建议可以直接执行，且对打包物保持谨慎。 |
| Compression without loss | 3/5 | 文本与 30 个 KU 有一定重复，同时仍丢失三项核心表格事实。 |

## META AUDIT

**Meta-gate：FAIL。**

- 未守载体：00:00–63.689 的非语音音频语义。
- 未守意义变化：基准表出现两个 Llama 3 胜项，使“全面碾压”从“证据不足”升级为“被自身画面反例否定”。
- 未守关系：旁白绝对化结论与同屏 MBPP/GSM8K 反例之间的直接矛盾。
- 未守身份关系：72B 表与 7B 小模型表的对手归属被混写。
- 未守口径关系：五尺寸 family listing 与四列 specification card 的差异。

candidate 自己将 `metaGate.pass` 设为 false，是正确的非自证做法；独立元审计仍需据上述遗漏判失败。

## 独立审计自身的修正

audit 把小模型表的 HumanEval 记为 Qwen2-7B-Instruct 79.9、Llama3-8B-Instruct 82.2，并据此列为第三个 Llama 3 胜项。TARGET-0023 与 DENSE-0022 实际显示 Llama3 值为 **62.2**，不是 82.2；这一项不是 Llama 3 胜项。该审计误读未计入 candidate 的失败，真正可见的反例只有上方 72B 表中的 MBPP 与 GSM8K 两项。

## 评估范围

本评估只读取：该视频本轮 `evidence/`、`skill-run/` candidate 与 `audit/`，以及 canonical evaluation protocol/schema 和 evaluator-design 规范。未读取旧 reports、analysis、video-library 内容结论或其他 evaluation。
