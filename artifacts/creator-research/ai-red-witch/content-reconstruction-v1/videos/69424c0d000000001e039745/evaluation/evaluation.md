# 独立评估：69424c0d000000001e039745

## 结论

硬 GATE 未全部通过。候选在开场来源限定、医学因果边界、咖啡条件、提醒/催促冲突、演示数据归属、编辑连续性和绝对隐私主张上表现扎实；但关键问题召回只有 **5/6（0.833）**，低于 0.85，且独立 meta-gate 发现未守住的诊断式 UI 含义与关系。

因此 JUDGE 未运行。`evaluation.json` 中五个数值 `1` 只是 canonical schema 要求的哨兵值，不是质量评分，也不能抵消失败的 GATE。本评估未修改 candidate，也不作 downstream readiness 宣布。

## 隔离与方法

本评估只读取 canonical evaluation protocol/schema、`evaluator-design` 及其空转闸参考、本视频的新 `evidence/`、`skill-run/` candidate 和独立 `audit/`。未读取旧 reports、旧 analysis、library 内容结论或其他 evaluation。

按协议先 GATE、后 JUDGE；GATE 证据独立来自 audit 与关键帧，不采用 candidate 的自报 `metaGate.pass=true` 作为通过依据。

## GATE 结果

| GATE | 结果 | 计数 | 判定依据 |
|---|---:|---:|---|
| Critical-question recall | FAIL | 5/6 = 0.833 | 没有明确回答“是否付费/赞助广告”；仅有泛化的商业边界声明。 |
| Evidence coverage | PASS | 28/30 = 0.933 | 两个遗漏：`获得更精准诊断`/`AI诊室` 的诊断式框架；开场 OCR-only 的“血栓已取出、恢复中”说法。 |
| Unsupported inference | PASS | 0/28 = 0.000 | 28 个正向知识陈述均有证据或明确标为作者主张/系统推断，未见无支持升级。 |
| Timestamp accuracy | PASS | 20/20 = 1.000 | 抽查 20 个高影响时间/帧引用，均落在 audit 对应窗口。 |
| Process dependency completeness | PASS | 6/6 = 1.000 | 覆盖健康资料→咨询、疲劳→追问、咖啡输入→条件结果、身材参数→计划、睡眠输入→任务状态，以及剪辑状态≠连续实时流程。 |
| Unknown discipline | PASS | 12/13 = 0.923 | 正确保留病例、医学、隐私、真实数据、连续操作、效果等未知；但商业补偿关系未被明确列为未知。 |
| Unchecked channels | PASS | 0 | audit 中可用载体均被检查；问题发生在已检查 UI 载体内的意义遗漏。 |
| Meta-gate | FAIL | — | 候选漏掉诊断式 UI 文案，并未建立它与“AI 生成仅供参考/及时就医”之间的内部张力。 |

## Meta-audit

候选的 carrier sweep 很广，但“载体已看过”不等于“关键含义已守住”。个人/健康史 UI 已被检查，候选却只记录字段收集，未记录同屏的“获得更精准诊断”，也未记录后续页面的“AI诊室”。这使整条片中最敏感的一组内部关系消失：产品一方面使用诊断式框架，另一方面又把输出限定为 AI 参考并提示就医。

这是 self-proof 失效：candidate 自报 `metaGate.pass=true` 不能证明完备。独立 audit 的 `CLM-MED-05` 足以证伪该自报结论。

## 保留的强项

- `KU-02/KU-04` 正确抓到“资料画面非本新闻事件”，没有把生活方式并置升级为脑梗病因。
- `KU-15` 没有照抄口播的“不加量就行”，而是恢复了 UI 中每日三杯、无明显不适/睡眠干扰/潜在健康问题等条件。
- `KU-21` 保留“不会催你”与“每天提醒/快去打卡”的同段载体冲突。
- `KU-28/KU-30` 对绝对隐私和服务条件负证据使用了有界检查范围，没有泛化到视频之外。

完整逐项修复清单见 `discrepancies.md`；机器可读计数见 `evaluation.json`。
