# 688445a10000000020019210 修复闭包与当前差异

本文件只把旧 `evaluation/discrepancies.md` 当作修复目标清单，并用当前 evidence、修复后的 `skill-run/` 与独立 `audit/` 重新核对；没有继承旧评估的判决或分数，也没有修改候选。

## 旧修复目标闭包

| 旧目标 | 当前证据与候选状态 | 结论 |
|---|---|---|
| ComfyUI 输入数与旁白冲突 | `TARGET-0059` 显示 `girl.jpg`、`dog.jpg`、`sofa.jpg`；KU-20、KU-21、KU-34 与 report 均写三源合成，并保留 CUE-007 “两张图”的冲突。 | CLOSED |
| 第二项 canonical identity | scope、KU-14、report 标题和正文统一为 `FLUX.1 Kontext`，同时逐项保存 context/kontext、AI/Pro 与节点变体。 | CLOSED |
| 单图参数与状态 | KU-16、KU-17 与 report 保存 `3.5`、`Public`、`Auto`、`Content Filters`、`16 credits`、空 History，并明确没有点击/扣费/进度/结果写入桥。 | CLOSED |
| ThinkSound 非语音音频语义 | `SRC-AUDIO` 对 before、transition、after-violin、later-examples 做有界语义检查；KU-26、KU-27 与 report 保留“小提琴/弓弦主导”变化，同时拒绝工具来源归因。 | CLOSED |

## 其他既有核对项

| 项目 | 当前状态 | 结论 |
|---|---|---|
| BAGEL 墨镜提示词 | 新定向帧 `TARGET-0023` 可读 `Put on sunglasses`，候选采用该新证据。 | 无差异 |
| BAGEL 3D 边界 | KU-12、KU-13 与 report 只写二维盒装手办效果图，并将网格、旋转、文件与导出保持未知。 | 无差异 |
| ThinkSound 生成因果 | KU-24、KU-26、KU-28 与 report 明确没有上传、运行、结果记录或 provenance；成片音频不归因给工具。 | 无差异 |
| 开源、许可、素材与肖像权利 | KU-29、KU-31、KU-32 与 report 只记录作者/页面自述，精确许可、访问、来源和授权保持未知。 | 无差异 |

## 当前残余

### V2-01 — source duration 与 evidence coverage endpoint 混写

- 严重度：Low。
- 独立依据：audit/ffprobe 为 `47.577778s`，SRT 结束于 `47.577s`；evidence pack 记录 `47.567s`。
- 当前候选：scope、多个 timeRange 与 report 把 `47.567s` 表述成视频本身的精确时长或“完整 0–47.567 秒时间线”。
- 判定：这是约 `0.011s` 的精度差异，不造成内容、载体或关系遗漏；在结构化 49 个正向命题中计 1 个错误，unsupported inference 为 `1/49`，仍通过 ≤ 0.05 的硬闸。
- 建议修正：将表述改为“evidence pack 覆盖至 47.567 秒；源文件约 47.578 秒”，或统一采用源文件探测时长并明确抽帧覆盖终点。

除 V2-01 外，当前修复后的候选没有发现新的实质性 audit–candidate 差异，也没有剩余未检查载体、意义变化或关系。
