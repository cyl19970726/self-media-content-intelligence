# Holdout2 Director Baseline 独立评测

## 结论

Baseline 的内容召回很强：12/12 个关键问题得到回答，31/31 个核心知识原子均被正文覆盖并可由7个宏观章节时间锚点定位，7/7 个时间锚点准确，10/10 个执行依赖与条件分支得到保留。

但硬 GATE 总体不通过。失败项是：unsupported inference 为 10/74，高于 ≤0.05；unknown discipline 为 7/10，低于 ≥0.90；unchecked channels 非空，原始音频的实际听辨/声学层没有显示被检查。JUDGE 的高可读性不能覆盖这些失败。

## GATE

| 闸 | 计数 | 阈值 | 判定 |
|---|---:|---:|---|
| Critical-question recall | 12/12 | ≥ 0.85 | PASS |
| Evidence coverage | 31/31 | ≥ 0.90 | PASS |
| Unsupported inference | 10/74 | ≤ 0.05 | FAIL |
| Timestamp accuracy | 7/7 | ≥ 0.90 | PASS |
| Process dependency completeness | 10/10 | ≥ 0.85 | PASS |
| Unknown discipline | 7/10 | ≥ 0.90 | FAIL |
| Unchecked channels | 1项 | 必须为0 | FAIL |
| Meta-gate | 无额外未守项 | 必须无未守项 | PASS |

计数口径：正向主张按可独立证伪的句子/分句拆分；排除标题、问题、纯引语与格式标签，共74项。宏观证据覆盖只认 baseline 自己交付的7个“结构”时间锚点，不为其补充 audit 的 cue/frame；这些锚点能形成连续章节窗口，因此31个核心原子有可检查范围，但缺少逐原子映射。

## JUDGE（硬闸之后）

| 维度 | 分数（1–5） | 理由 |
|---|---:|---|
| Readability | 5 | 结构清楚，标题、段落和清单易读。 |
| Knowledge prioritization | 5 | 四项条件、三类机制、两步法和隐藏热点路线排序正确。 |
| Evidence usefulness | 3 | 7个宏观时间锚点可导航，但没有逐主张时间窗、cue、frame或载体映射。 |
| Execution / decision value | 4 | 拍摄前检查表可直接使用，但混入了片中没有的运营建议。 |
| Compression without loss | 4 | 核心内容无明显遗漏，但扩写较多，部分扩写改变证据边界。 |

## 关键判断

- Q-12 被正确回答：候选明确否定“每条都保证百万”，也把王虹获奖限制为视频自身说法、未外部核验。
- 证据覆盖通过不等于证据交付优秀：章节锚点可复核内容，却不足以高效审计单条主张，因此 evidence usefulness 只为3/5。
- 最大问题不是漏内容，而是把作者经验与候选自己的常识性解释混在一起。例如把成绩拼贴写成“证明自己并非只讲理论”、给愤怒/忧愁/矛盾补三项因果、把热点改写成“加速器而不是内容本身”。
- Baseline-process 显示其通读SRT并抽查视频流画面，但只确认“含音频轨”，没有显示实际听辨原声；因此音频声学层仍是未闭合载体。

## Meta Audit

元审计复查了身份、视觉文字纠错、开头拼贴、必要/充分关系、条件分支、隐藏第三路、scene-detection与真实镜头关系，以及负证据边界。所有发现均已被现有闸计入，没有新增未守载体、意义变化或关系，meta-gate 通过。
