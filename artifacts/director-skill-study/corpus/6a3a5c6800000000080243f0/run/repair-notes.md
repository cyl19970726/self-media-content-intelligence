# Gate discrepancy repair notes

修复范围仅限本 `run/`；未修改 audit、evaluation、gate-report 或 canonical Skill。

- 开场卡片：将 OCR-00010、OCR-00012、OCR-00014 对应的“5万/5条/date”统一降为 disputed/unknown；不再把它们写成独立视觉事实。保留可确认的账号式卡片存在与 CUE-001 的“一百万播放量”作者主张边界。
- 用户优先前提：新增 `KU-03A`，覆盖 7.52–15.44 秒的“自媒体本质是他媒体→做用户想看的东西→第一步锚定用户/需求”。
- 开头→结尾关系：`REL-09` 从 `payoff_for` 改为 `does_not_verify`；`KU-16` 明确结尾只完成本期，未复核开场指标。
- 推理透明度：为 `KU-12` 的 SRT/烧录字幕冲突选择和 `KU-16` 的结尾边界补充 `reasoning`。
- cue accountability、meaning change、critical question 与文章同步更新。
- 重建后 schema 验证通过；所有知识单元和关系证据引用均可解析，无 self-edge。
