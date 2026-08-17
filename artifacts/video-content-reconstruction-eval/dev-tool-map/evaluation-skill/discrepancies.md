# dev-tool-map Skill candidate 差异清单

以下只记录 candidate 相对独立 ground truth 的差异，不修改 candidate。

## Critical

### D-01 — Manus 数量与结构错误

- Ground truth：11.767–13.700 秒连续展示三套不同风格的 PPT 缩略图网格，每套可见 12 页；对应 SHOT-006、SHOT-007、SHOT-008。
- Candidate：probe MC-05、capture protocol CAP-05-PPT、reconstruction KU-05-CLAIM/KU-05-RESULT 和 article 均写成“两组/两个 collages”，没有 12 页计数。
- 后果：丢失三套结果传达的多样性、完整性和专业感，且直接答错 CQ-08、AE-018。
- 诊断：采样已覆盖三段，失败发生在解释/归并，不是证据不足。

### D-02 — 即梦“图片工具→动漫”边界丢失

- Ground truth：工具卡写“即梦；抖音旗下免费AI图片创作工具”；口播写“做动漫”；结果是有运动变化的插画。静态图片能力到动画生产的中间程序未展示。
- Candidate：只保留工具名“即梦”、做动漫口播和移动插画，省略工具卡类别与“免费”表述。
- 后果：无法呈现 CQ-10/MC-06 的核心不一致，也弱化 CQ-11/U-07 所需的程序 unknown。

### D-03 — Vidu 的名人式样载体被抹去

- Ground truth：画面是高度类似 Steve Jobs 的人物，穿黑色高领衫并持带 Apple 标志的笔记本；真人身份、授权和生成方式 unknown。
- Candidate：只写“年长男性、黑色高领衫、笔记本”，并把身份整体标 unknown。
- 后果：谨慎没有错，但把“可观察 likeness”错误等同于“不可说”；漏掉 Steve Jobs 式样与 Apple 符号怎样把“任何人”快速具体化为名人式样同框。

## High

### D-04 — “任何人”没有被明确证伪为未充分证明

- Ground truth：只有一个 Steve Jobs 式样单例，不能证明全称范围“任何人”。
- Candidate：只写“Whether ‘任何人’ is literally supported” 为 unknown。
- 后果：把可由证据确定的“不充分证明”降成一般 unknown，未完成 CQ-05。

### D-05 — Runway 输出状态过数

- Ground truth：至少两套明显不同于原白衣的完整造型：棕色条纹/贝雷帽/心形眼镜；浅色上衣/灰色外套/草帽。
- Candidate：把草帽和灰外套拆成先后独立造型，并写“at least three distinct outfit/accessory states”。
- 后果：形成一条 unsupported positive claim。Runway 卡片本身的补抓、时间定位和 SRT/烧录字幕差异处理是正确的。

### D-06 — 六张工具卡副文案普遍缺失

- Ground truth：卡片还承载产品来源/类别与宣传表述，包括 PixVerse 的工具类别、Vidu 的模型类别、Runway 的功能类别、Manus 的“全球首款”、即梦的“免费AI图片创作工具”等。
- Candidate：除工具名外普遍不转写，第一张甚至将副文案称为不需要建立工具名的信息。
- 后果：CQ-12 的外部核验 unknown 只剩泛化声明；即梦边界直接消失；片内宣传文案与现实事实的层级无法逐项区分。

### D-07 — 四类信息载体未闭合

- 主持手势与视线：candidate 偶尔描述手势，但没重建其指卡片、维持列表节奏的 carrier 角色。
- Recognizable likeness/symbols：Steve Jobs 式样和 Apple 标志遗漏。
- Layout：未记录 PPT 上方缩略图网格/下方主持小窗，以及结尾绿/棕框架的组织作用。
- Non-speech audio：只做了 speech ASR；没有把背景音乐/音效是否承载语义明确标 unknown。
- 后果：`uncheckedChannels` 不可能为空，candidate 的自报 meta-gate 不能通过。

## Medium

### D-08 — 全局连续性关系缺失

- Ground truth：同一主持人与同一房间为六个异质工具提供连续性，硬切分隔并列条目。
- Candidate：在个别 setup 中提到 same room，却没有把它写成跨六项的全局关系。
- 后果：程序/编辑依赖完整性少一项，整体修辞结构被压成纯列表。

### D-09 — 无跨工具工作流链未显式回答

- Ground truth：六项是并列独立条目，没有输出传给下一工具，也没有 API、文件传递或程序调用。
- Candidate：逐项写了六组 adjacency 和“不是实际工作流”，但没有明确陈述六工具之间不存在跨工具链。
- 后果：CQ-14 与关系 meta-gate 未闭合。

### D-10 — Manus unknown 不完整

- Ground truth：主题输入、资料来源、内容准确性、引用、可编辑性、导出格式、生成归因均未知。
- Candidate：覆盖输入、可编辑性、导出和生成归因，但没有保留内容准确性与引用/资料可靠性 unknown。
- 后果：U-06 只部分满足。

## Candidate 做对且应保留的点

- Runway 卡片：约 9.1 秒的高密度补抓成功，解决原 evidence pack 的最高风险漏项。
- 无 UI 因果：没有把相邻剪辑、结果画面或“AI生成”标签写成具体工具生成证明。
- 时间定位：六张卡、六条口播、六组结果及 16.516 秒结尾补帧均正确定位。
- SRT 纪律：平台 SRT 的“一键穿搭”原样保留，同时独立记录烧录字幕“一键换穿搭”，没有静默改写。
