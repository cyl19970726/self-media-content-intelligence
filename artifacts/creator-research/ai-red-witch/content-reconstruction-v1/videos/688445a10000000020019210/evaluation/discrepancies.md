# Discrepancies：688445a10000000020019210

本表只比较该视频的新 evidence、skill-run candidate 与独立 audit；未使用旧报告、旧分析、library 结论或其他 evaluation。

| 优先级 | 主题 | 独立审计 / 新证据 | 候选 | 评估 |
|---|---|---|---|---|
| Critical | Kontext 合成输入数 | `TARGET-0059` 与 audit 显示 `girl.jpg`、`dog.jpg`、`sofa.jpg` 三个来源；结果是两主体加场景的三图合成。 | probe、protocol、KU-20、KU-21 与 report 均称“双图输入/双图合成”。 | 候选错误；同时导致 critical recall、evidence coverage、dependency 与 meta-gate 失败。 |
| High | 旁白与 UI 的冲突 | 旁白/字幕称“两张图的人物融合”，但 UI 显示女孩、斑点狗和沙发场景三源。 | 候选保留并采用旁白的“双图”框架，没有把 UI 设为更具体的纠偏证据。 | 候选缺少 consequential carrier conflict 处理。 |
| High | 第二项 canonical identity | audit 要求规范名为 `FLUX.1 Kontext`；画面还分别出现 `Flux Kontext AI`、`Flux Kontext Pro`、`Flux.1 Kontext [pro] Image`。 | 摘要和章节标题使用 `Flux Kontext`，未统一 canonical identity。 | 部分覆盖但未闭合身份规范化。 |
| High | 单图界面参数/状态 | audit 记录 `prompt strength 3.5`、`Public` 已选、生成按钮 `16 credits`，并保留 Private、Auto、Content Filters 等上下文。 | reconstruction/report 未保留前三项；KU-17 还写“没有显示…参数”。 | 可执行证据漏失；其中“没有参数”的表述范围过宽。 |
| High | ThinkSound 非语音音频语义 | audit 的人耳/波形/频谱检查确认约 `35.69–39.7s` 有持续音调/谐波段，与小提琴声相符，同时不归因给工具。 | `SRC-AUDIO` 只有 volumedetect，只能证明非静音，并明确不分类声音。 | 载体只做存在性检查，未完成语义检查；unchecked channel。 |
| Medium | BAGEL 墨镜提示词 | audit 初始取样只读到 `Put on sungla…`，认为全文不可恢复。 | 新定向证据 `TARGET-0023` 清楚显示 `Put on sunglasses`。 | 候选优于 audit；采用新证据，不计候选错误。 |
| Medium | BAGEL 3D 边界 | audit 只允许写二维盒装手办/包装效果图，不能证明网格、旋转、导出或一键生成。 | KU-12、KU-13 与 report 均明确限制为展示画面，并保持输出形式与操作未知。 | 一致，候选通过。 |
| Medium | ThinkSound 因果 | audit 只确认成片有编辑式前后对照，没有上传、处理、结果记录或 provenance。 | KU-24、KU-26、KU-28 与 report 均不把声音归因给 ThinkSound。 | 一致，候选通过。 |
| Medium | 开源/许可/素材权利 | audit 将三个工具的精确许可、素材授权、肖像/表演者许可、作者身份和输出权利保持未知。 | KU-29、KU-31、KU-32 与 report 保持 unknown，没有外部补全。 | 一致，候选通过。 |

## 最小修正方向（不修改 candidate）

1. 把所有“双图”表述改成女孩、斑点狗、沙发场景的三图合成，并显式记录旁白与 UI 冲突。
2. 将第二项统一为 `FLUX.1 Kontext`，同时保留不同界面载体中的具体变体。
3. 补入单图界面的 `3.5 / Public / 16 credits` 等决策相关状态。
4. 对 ThinkSound 无语音窗口做声音语义核验；仍须把“听起来像小提琴”与“由 ThinkSound 生成”严格分开。
