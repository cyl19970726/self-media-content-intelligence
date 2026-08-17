# holdout2-director candidate discrepancies

## D-01 — audit 的收尾字幕读法被候选帧纠正（不罚 candidate）

- audit：把结尾自称记录为“我是人类最善变的”。
- candidate：记录画内字幕为“我是人类最强编导”，SRT 为“我是人类最善变的”。
- 证据：`skill-run/targeted-evidence/frames/ACT-CLOSING-REFERENT-AND-CTA-SCOPE-006.jpg` 清晰显示“我是人类最强编导”。
- 判定：candidate 在画内字幕读法上正确；具体身份、能力和账号标签仍未知。此项是 ground-truth audit discrepancy，不计 unsupported inference。

## D-02 — 漏记 CUE-034 的 SRT/画内字幕冲突

- SRT：`愉快中慢，愉繁中简，愉闹中静`。
- 画内字幕/白板语义：`于快中慢、于繁中简、于闹中静`。
- candidate：文章正确重建成“快中取慢、繁中取简、闹中取静”，但 run notes 所列三处 consequential conflicts 没有这一处，知识单元也没有把它登记为冲突。
- 影响：答案语义正确，但证据冲突被静默消解；这是 meta meaning-change 缺口。

## D-03 — 16 个自动分段与一镜环境的关系未闭合

- audit：16 个 scene-detection 分段多与弯腰、遮挡、大动作重合；视觉支持固定机位连续白板口播，不能写成 16 个不同场景，同时仍需保留极细微隐藏剪接未知。
- candidate：声明检查全部 16 个 representative shot frames，也描述固定白板课堂，但没有把“自动分段 ≠ 16 场景”写成结论或关系，也没有保留隐藏剪接未知。
- 影响：环境载体被看过，分段含义却未被守住；unknown discipline 少 1 项，并构成 meta relationship 缺口。

## D-04 — CUE-068 的再次强保证在最终重建中丢失

- cue：先说“如果这期视频你再看不懂……没有这种可能，你不可能看不懂”，再说“下课”、自称和“下期再见”。
- candidate：`probe.json` 注意到再次断言，但 `article.md` 和最终 KU 只保留课堂收尾、字幕冲突和人物指代。
- 影响：68 个 cue 均有 accountability row，但语义完整度是 67/68；K-31 只覆盖开场强保证，未完整覆盖首尾呼应。

## D-05 — structured relations 出现无效自边

- `KU-06 → KU-06 decomposes_into`
- `KU-07 → KU-07 realizes`
- `KU-13 → KU-13 condition_for`
- `KU-14 → KU-14 author_claims_causes`
- `KU-30 → KU-30 stands_in_for`

这些边没有表示两个不同节点之间的依赖。文章仍然保留了相关语义，所以 process dependency GATE 依整体产物计为 10/10；但下游若只消费结构化关系图，会失去二分需求、互动实现、硬素材条件、节奏因果和人物角色的明确端点。

## D-06 — 负证据清单被压缩

候选很好地限定了完整视觉范围，也覆盖案例来源、结果后台、平台/账号门槛、BGM参数/版权、发布界面、复现过程和 CTA；但没有逐项保留标题、封面、前三秒、脚本、发布时间、标签、账号权重、投放、复盘等缺失，也没有直说“片中未证明点赞/收藏无价值”。这不是本轮硬闸失败原因，但会让执行者低估方法覆盖面的缺口。

## D-07 — candidate metaGate 自证通过与独立元审计冲突

candidate `metaGate.pass=true` 的理由是载体、12 个意义变化和 16 个关系均已映射；独立检查显示 D-02、D-03、D-04、D-05 仍未闭合。因此独立 `metaAudit.pass=false`，并按协议阻止 JUDGE。

