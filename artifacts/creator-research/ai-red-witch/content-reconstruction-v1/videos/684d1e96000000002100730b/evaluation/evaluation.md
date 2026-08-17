# 684d1e96000000002100730b 独立评估

## 评估边界

本评估按 canonical `evaluation.md` 与 `evaluation.schema.json`，先做 GATE、后做 JUDGE。只比较本视频的新 evidence、独立 audit 与 `skill-run` candidate；未读取旧 reports/analysis/library 内容结论或其他 evaluation。candidate 未被修改。

计数口径：critical-question recall 以 audit 的 4 个 `keyQuestions` 为分母；evidence coverage 将 audit 全时轴、关键问题、主张边界和关键问题合并去重为 18 个 core knowledge units；unsupported inference 检查 candidate 的 24 个 KU 主陈述与人类报告标题共 25 个顶层正向断言；timestamp accuracy 独立抽查 30 个 cue/shot/targeted/OCR 时间锚；unknown discipline 以 audit 的 9 个 `unknownsAndAbsences` 为分母。

## GATE

| 闸 | 结果 | 计数 | 阈值判断 |
|---|---:|---:|---|
| Critical-question recall | PASS | 4/4 = 100% | ≥85% |
| Evidence coverage | PASS | 18/18 = 100% | ≥90% |
| Unsupported inference | **FAIL** | 3/25 = 12% | ≤5% |
| Timestamp accuracy | PASS | 30/30 = 100% | ≥90% |
| Process dependency completeness | PASS | 4/4 = 100% | ≥85% |
| Unknown discipline | **FAIL** | 6/9 = 66.7% | ≥90% |
| Unchecked channels | **FAIL** | 1 available carrier unchecked | 必须为 0 |
| Meta-gate | **FAIL** | 发现 1 个未闭合载体与 2 类未完整覆盖关系 | 必须无 unguarded 项 |

### 通过项

候选准确恢复了四个独立审计关键问题：观众实际只学到基础入口与提问；最强证据是 UI 状态、答案页和一组图片前后状态；权威性、正确性、竞品优势、专业论文身份与免费范围均未独立建立；整条片由荒诞钩子逐步累积至转化 CTA。

18 个 core units 都有可解析证据。尤其 HTML/PPT 与猫咪案例中，candidate 把“界面显示正在分析/阅读”“出现来源计数或列表”“作者称来源权威”“答案外部真实”拆成不同层，这是本次重建最可靠的部分。30 个抽查时间锚均落在独立 audit 对应窗口。四条过程依赖链也完整，并对剪辑连续性和后台执行保持了未知。

### 失败项 1：unsupported inference 3/25

1. `report.md` 标题“为什么你的 AI 搜索总在瞎编？”把作者的局部归因扩大成“你的 AI 搜索总是瞎编”的普遍事实；原片没有提供这种证明。
2. `KU-16` 将结果写成“背景人群被移除”。独立 audit 能稳定确认的是主体后方一名清晰男子消失；“人群”是作者输入措辞，不是画面验证出的结果范围。
3. `KU-24` 声称技术扫描发现 4.29–4.62 秒短静音，却只引用画面帧 manifest `DS-TARGETED`；没有音频扫描产物或其他独立证据可解析。

### 失败项 2：unknown discipline 6/9

候选正确保留了免费范围、版本/账号/平台/地区、HTML/PPT 实际可用性、来源与引用真实性、猫咪个案条件、图片处理连续性等未知。但独立 audit 中三类决策边界未完整进入 candidate：

- 图片原图版权及画面人物授权；
- 隐私/数据使用、版权、延迟和性能波动；
- presenter 的专业资质及是否亲自完成全部录屏测试。

这些不能由“现实身份/产品方关系未知”或“失败案例缺席”自动代替。

### 失败项 3：unchecked channel 与 meta-gate

`ACT-11` 名义上检查非语音音频，但定向采集产物仍然只是视频帧；`KU-24` 及 `coverageMatrix` 再引用 candidate 自己的 `DS-TARGETED` 声称音轨已检查。AAC 音频流存在只证明有音频，不证明配乐/SFX 已被听检、分离或技术检测。

这符合 evaluator-design 所说的 self-proof 空转闸：被审对象用自己的“已检查”声明证明覆盖。故 `uncheckedChannels` 不能为零，candidate 自报的 `metaGate.pass=true` 也不能成立。

## JUDGE

JUDGE 只评价呈现质量，不抵消上述 GATE 失败。

| 维度 | 分数 | 评价 |
|---|---:|---|
| Readability | 4/5 | 正文层次清楚、边界提示易读；标题却制造了与正文相反的过度断言。 |
| Knowledge prioritization | 4/5 | 把三组案例和来源真实性边界放在中心，优先级合理；部分决策边界未进入最终报告。 |
| Evidence usefulness | 4/5 | cue/targeted/OCR 引用密集且多数可解析；音频项使用了不匹配的帧来源。 |
| Execution value | 4/5 | 读者能找到入口、理解展示内容并知道何处不可外推；不等同于验证工具方案或健康建议。 |
| Compression without loss | 4/5 | 85 秒内容被压缩成清晰链条，核心语义损失小；版权/授权、隐私与 presenter 资格边界有遗漏。 |

## 独立结论

该 candidate 在内容重建、时间定位、过程关系和真实性边界方面表现强，但硬闸未全过：unsupported inference、unknown discipline、unchecked channel 和 meta-gate 均失败。本评估只记录评审结果，不修改 candidate，也不作 READY 宣告。
