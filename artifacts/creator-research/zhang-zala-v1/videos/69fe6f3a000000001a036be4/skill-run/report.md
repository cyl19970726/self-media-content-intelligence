# 如何用AI做出超级好看的HTML Slides｜完整内容还原

> 仅重建 0–173.467 秒视频内可见/可听内容与其内部论证。公开帖子指标和评论将在博主层报告另列；平台当前可用性、模板权利、生成时长和客户效果不由本片证明。字幕来源是本地机器转写而非官方字幕，原文保留，专有名词只通过烧录字幕/UI 形成规范化建议。

## 一句话还原

- 看前：观众可能只知道 AI 能生成 HTML/PPT，但不清楚为什么同样使用 AI，成品审美差异很大，也不知道如何低门槛复用一套经过筛选的视觉体系。
- 看后：观众被引导相信：高质量 HTML Slides 的关键不是多写提示词，而是先给 AI 一套有明确审美取向的模板与说明；随后可按是否拥有 coding agent 选择 AnyGen 或 GitHub 两条路径。
- 认知变化：从‘AI 自动生成就会好看’转向‘审美参考与模板资产决定设计上限’
- 认知变化：从只看成品转向知道小白和 coding agent 用户各自的入口
- 认知变化：从把 HTML Slides 当小技巧转向把它视为对外展示和 AI-native 形象的一部分

## 核心内容

### 开场先建立审美结果差距

时间：00:00.00–00:13.52　层级：画面观察　置信度：high

0–13.52 秒连续展示多套视觉差异明显的 Slides 成品，同时提出同样使用 AI，为什么有人做得好看、有人不好看。视频先让观众感知结果差距，而非先解释按钮。

![开场先建立审美结果差距](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-01-001.jpg)

未知：这些开场样例是否全部由同一流程和同一模板库生成

### 作者把审美固化为 Skill 和三十多个模板

时间：00:13.52–00:54.76　层级：作者主张　置信度：medium

作者称她收集自己喜欢的图片和设计风格，让 Claude Code、Claude Designer 和 Kimi 借鉴后制作三十多套 HTML/PPT 模板，并将个人审美固化为 Skill；画面确实在 13.52–54.76 秒展示大量不同配色、版式和图表成品，但精确数量、生成工具链和第三方资产权利未被逐项证明。

![作者把审美固化为 Skill 和三十多个模板](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-02-005.jpg)

**论证结构**

- 论点：高质量 AI Slides 的关键是先给模型一套有审美取向的参考和模板。
- 条件：模板风格适合当前内容和受众；模型能读取并正确应用模板
- 反例：同一模板也可能造成千篇一律；中文字体、图片素材或信息密度可能破坏效果
- 行动：建立参考库；把风格固化为模板和说明；用结果筛选而非只优化提示词
- 限制：片内未做控制实验；三十多个数量和资产授权未逐项核实

未知：模板完整清单；图片、字体和设计参考授权；各模型的具体分工和版本

### 两条使用路径按技术门槛分流

时间：00:54.76–02:01.73　层级：作者主张　置信度：high

作者给出两条路径：没有 coding agent 的小白使用 AnyGen 内的 Build Slides/Frontend Slides；已有 coding agent 的用户把 GitHub 仓库交给 agent。核心产品设计是同一套审美资产面向两种技术能力提供不同入口。

![两条使用路径按技术门槛分流](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-03-001.jpg)

未知：两条路径当前是否都可用；各自费用、账户和地区限制

### 小白路径：选择模板作为参考后输入需求

时间：00:57.40–01:44.19　层级：系统推断　置信度：medium

AnyGen 路径的可恢复顺序是：进入平台 → 选择 Build Slides/Frontend Slides → 选择模板，使其进入附件/参考 → 输入自己的需求 → 生成幻灯片 → 选择喜欢的模板或继续提示调整。画面提供多个界面状态，但不构成单一任务无剪辑端到端因果。

![小白路径：选择模板作为参考后输入需求](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-03-003.jpg)

**操作还原**

- 输入：用户内容需求和一个选定模板/风格参考
- 步骤 1：进入 AnyGen 的 Slides 功能
- 步骤 2：选择 Frontend Slides
- 步骤 3：选择模板作为附件/参考
- 步骤 4：输入需求
- 步骤 5：触发生成
- 步骤 6：按结果继续提示调整
- 参数/选择：模板选择；中文/内容需求；后续提示轮次；作者案例约三次 prompts 为自述
- 输出：可分享的 HTML Slides 完成态示例
- 未展示：提交点击与等待过程；是否同一任务连续发生；真实生成耗时；镜头外修改；导出/分享当前可用性

未知：功能当前名称和版本；生成费用与配额；同样输入是否能复现画面质量

### coding agent 路径依赖 GitHub 的 HTML 模板与说明

时间：01:50.93–02:31.45　层级：作者主张　置信度：medium

作者称仓库中每套模板以 HTML 文件存在，并另写 instructions、模板描述和关键词，让 agent 按需求与调性匹配模板，再沿用其设计生成 HTML。画面可见 GitHub/仓库、模板预览和说明状态；clone、安装、agent 调用、权限和实际匹配结果没有连续展示。

![coding agent 路径依赖 GitHub 的 HTML 模板与说明](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-05-001.jpg)

**操作还原**

- 输入：用户需求、调性与 GitHub 模板仓库
- 步骤 1：把仓库交给 coding agent
- 步骤 2：让 agent 读取模板描述与关键词
- 步骤 3：匹配合适模板
- 步骤 4：沿用模板设计生成 HTML
- 参数/选择：需求；调性；模板描述和关键词
- 输出：基于匹配模板设计的 HTML Slides
- 未展示：仓库安装/读取命令；agent 版本；匹配准确率；实际生成任务绑定

未知：仓库当前地址、版本和许可证；coding agent 支持范围；模板匹配质量

### 结尾把 HTML Slides 上升为对外品味与 AI-native 信号

时间：02:31.45–02:53.47　层级：作者主张　置信度：medium

作者建议在重视视觉冲击和设计效果时用 HTML 取代 PPT，并主张客户或观众会因此觉得使用者更 AI-native。画面继续展示视觉完成度高的 Slides，可支持‘结果多样且醒目’的观察，不能证明‘只有 HTML 能实现’或客户必然形成该判断。

![结尾把 HTML Slides 上升为对外品味与 AI-native 信号](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-07-001.jpg)

**论证结构**

- 论点：当视觉冲击和设计感重要时，HTML Slides 比传统 PowerPoint 更适合 AI-native 展示。
- 条件：客户/观众可顺利访问 HTML；呈现环境支持网页；模板与内容匹配；可编辑性和协作要求可被满足
- 反例：需要原生 PowerPoint 编辑或离线兼容的场景；模板化结果可能被看出 AI 痕迹；中文字体和跨地区访问可能出现问题
- 行动：在视觉结果重要时测试 HTML 方案；保留传统格式兜底；用用户反馈验证客户感知
- 限制：片内没有 PowerPoint 对照实验；没有客户感知或业务结果数据

未知：客户实际感知；兼容性和可访问性；传统 PowerPoint 是否可实现类似效果


## 支撑信息

### 案例中作者称约三轮提示完成高质量分析 Slides

时间：01:24.20–01:44.19　层级：作者主张　置信度：medium

作者展示上一个视频所用的分析 Slides，并称先写大致内容、后续调两三次（机器转写有‘两三四’误识别）便得到完成效果，原因是起始就提供了模板。该时间段可见输入/界面与成品，但提示次数、全部修改和任务连续性属于作者自述。

![案例中作者称约三轮提示完成高质量分析 Slides](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-03-020.jpg)

未知：准确提示轮数；每轮提示文本；镜头外人工编辑

### AnyGen 结果被作者描述为可链接分享

时间：01:44.19–01:50.93　层级：作者主张　置信度：medium

作者称在 AnyGen 中完成后可以把链接发给别人，像网页一样查看。片内出现完成态和分享相关界面线索，但没有外部接收者成功打开的闭环；地区、权限、链接寿命、导出格式与当前功能仍未知。

![AnyGen 结果被作者描述为可链接分享](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/skill-run/targeted-evidence/frames/ACT-03-034.jpg)

未知：外部访问成功率；地区/权限限制；当前导出和分享功能


## 证据边界与上下文

### 机器转写需以画面保留冲突而非静默修正

时间：00:00.00–02:53.47　层级：系统推断　置信度：high

机器转写出现 PBT/PPT、Clocko/Claude Code、扣顶/coding agent、Billed/Build Slides、胶虎/交互等误识别。完整原始 cue 保留；规范化只作为烧录字幕和 UI 支持下的阅读层，无法确认的英文小字继续保持未知。

未知：部分模型/产品英文名的精确拼写；低分辨率 UI 小字

### 非语音音轨未提供独立操作或结果证明

时间：00:00.00–02:53.55　层级：系统推断　置信度：medium

完整 0–173.546 秒混合轨按无缝 10 秒窗运行 AudioSet 机器提议检查，Speech 在每个窗口稳定居首；其他 vehicle、rumble、eruption 等低分标签不稳定且与画面语义不可靠，不能接受为具体音乐、UI 点击或生成成功音。

未知：低电平被旁白遮蔽的声音；精确配乐/环境声/音效来源与权利

## 内容关系

- 开场先建立审美结果差距 → 作者把审美固化为 Skill 和三十多个模板：可见审美差距被作者归因到模板化审美资产
- 作者把审美固化为 Skill 和三十多个模板 → 两条使用路径按技术门槛分流：先用模板成品建立想要感，再按技术门槛提供两条获得路径
- 两条使用路径按技术门槛分流 → 小白路径：选择模板作为参考后输入需求：双路径中的小白分支在 AnyGen 内执行
- 两条使用路径按技术门槛分流 → coding agent 路径依赖 GitHub 的 HTML 模板与说明：双路径中的 coding agent 分支使用 GitHub 资产
- 作者把审美固化为 Skill 和三十多个模板 → 结尾把 HTML Slides 上升为对外品味与 AI-native 信号：模板成品的视觉结果被用于支撑对外品味和 AI-native 身份价值

## 明确不能从视频判断

- 模板、图片、字体和设计参考的完整来源与授权
- GitHub 仓库当前入口、版本、许可证与安装命令
- AnyGen 当前费用、地区、账户、导出和分享限制
- 演示任务的连续生成链、真实等待时间和镜头外修改
- agent 自动匹配模板的准确性和适用条件
- HTML 相对 PowerPoint 的普遍优势与客户/观众实际感知
- 非语音音频的具体声源、曲目、来源与权利

## 完整机器逐字稿与证据映射

> 这是本地机器转写，不是官方字幕。原始文本不静默修正；每条 cue 均对应代表帧和全部 overlapping shots。

| Cue | 时间 | 原始机器转写 | 代表帧 | Overlapping shots |
|---|---:|---|---|---|
| CUE-001 | 00:00.00–00:03.20 | 现在越来越多的朋友开始用HTML做PBT了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-001.jpg) | SHOT-001, SHOT-002, SHOT-003, SHOT-004 |
| CUE-002 | 00:03.20–00:06.92 | 然后很多朋友问我怎么做出特别好看的HTMLPBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-002.jpg) | SHOT-004, SHOT-005, SHOT-006 |
| CUE-003 | 00:06.92–00:10.04 | 就是同样是用AI去设计HTML | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-003.jpg) | SHOT-006, SHOT-007, SHOT-008, SHOT-009 |
| CUE-004 | 00:10.04–00:11.72 | 为什么有的人做就很好看 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-004.jpg) | SHOT-009, SHOT-010, SHOT-011 |
| CUE-005 | 00:11.72–00:13.52 | 有的人做就非常不好看 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-005.jpg) | SHOT-011, SHOT-012 |
| CUE-006 | 00:13.52–00:18.12 | 我最近花了一些时间把我的审美变成了一个Skill | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-006.jpg) | SHOT-012, SHOT-013, SHOT-014, SHOT-015, SHOT-016 |
| CUE-007 | 00:18.12–00:21.76 | 然后我做了三十几个HTMLPBT的Template就是模板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-007.jpg) | SHOT-016, SHOT-017, SHOT-018, SHOT-019 |
| CUE-008 | 00:21.76–00:26.76 | 大家现在看到的这些都是来自我的模板库的实际的模板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-008.jpg) | SHOT-019, SHOT-020, SHOT-021 |
| CUE-009 | 00:26.76–00:30.68 | 我是收集了很多我个人特别喜欢的图片和设计风格 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-009.jpg) | SHOT-021, SHOT-022, SHOT-023, SHOT-024 |
| CUE-010 | 00:30.68–00:37.24 | 然后让Clocko,Cloud,Design和Keyme借鉴这些风格去设计了三十几套 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-010.jpg) | SHOT-024, SHOT-025 |
| CUE-011 | 00:37.24–00:39.64 | 我认为非常漂亮的PBT模板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-011.jpg) | SHOT-025, SHOT-026 |
| CUE-012 | 00:39.64–00:43.28 | 因为我个人对于PBT的审美要求是非常高的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-012.jpg) | SHOT-026, SHOT-027 |
| CUE-013 | 00:43.28–00:45.24 | 因为我觉得它就是一个人的脸面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-013.jpg) | SHOT-027 |
| CUE-014 | 00:45.24–00:47.92 | 因为它都是用于对外的一些朋友身体身 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-014.jpg) | SHOT-027, SHOT-028, SHOT-029, SHOT-030 |
| CUE-015 | 00:47.92–00:50.92 | 所以它直接反映了我们自己的品味 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-015.jpg) | SHOT-030 |
| CUE-016 | 00:50.92–00:54.76 | 这个三十多套模板我也已经开远到我的Github了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-016.jpg) | SHOT-030, SHOT-031, SHOT-032, SHOT-033, SHOT-034 |
| CUE-017 | 00:54.76–00:57.40 | 那么大家有两种方式可以去使用它们 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-017.jpg) | SHOT-034, SHOT-035, SHOT-036 |
| CUE-018 | 00:57.40–00:59.32 | 首先如果你是一个小白 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-018.jpg) | SHOT-036, SHOT-037 |
| CUE-019 | 00:59.32–01:00.92 | 你还没有自己的扣顶Agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-019.jpg) | SHOT-037 |
| CUE-020 | 01:00.92–01:03.48 | 你可以进入AnyGen这个平台 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-020.jpg) | SHOT-037 |
| CUE-021 | 01:03.48–01:05.64 | 然后在这选Billed Slides | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-021.jpg) | SHOT-037 |
| CUE-022 | 01:05.64–01:07.12 | 然后Front End | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-022.jpg) | SHOT-037 |
| CUE-023 | 01:07.12–01:08.32 | 就是Front End Slides | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-023.jpg) | SHOT-037 |
| CUE-024 | 01:08.32–01:10.76 | 然后这三十多个模板就都在这了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-024.jpg) | SHOT-037 |
| CUE-025 | 01:10.76–01:11.88 | 你只要点击 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-025.jpg) | SHOT-037 |
| CUE-026 | 01:11.88–01:13.20 | 比如说点这个模板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-026.jpg) | SHOT-037 |
| CUE-027 | 01:13.20–01:15.64 | 它就会进入附件作为一个参考 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-027.jpg) | SHOT-037 |
| CUE-028 | 01:15.64–01:18.08 | 然后你直接在这输入你的徐熊就可以 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-028.jpg) | SHOT-037 |
| CUE-029 | 01:18.08–01:19.48 | 如果你是中文的见面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-029.jpg) | SHOT-037 |
| CUE-030 | 01:19.48–01:20.88 | 就点生成幻灯片 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-030.jpg) | SHOT-037 |
| CUE-031 | 01:20.88–01:22.12 | 然后点这个胶虎 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-031.jpg) | SHOT-037 |
| CUE-032 | 01:22.12–01:24.20 | 然后在下面选择你喜欢的模板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-032.jpg) | SHOT-037 |
| CUE-033 | 01:24.20–01:26.96 | 比如说这是我最近做的一个分析 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-033.jpg) | SHOT-037 |
| CUE-034 | 01:26.96–01:34.89 | 想就是我上一个视频它的PBT是长成这样的那它做成这样我可能只花了大概三个promp | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-034.jpg) | SHOT-037, SHOT-038, SHOT-039 |
| CUE-035 | 01:35.39–01:44.19 | 你看前面我就是写了一下大致内容然后后面可能调了两三四就就调成这样了就是因为我一开始给了它这个模板所以它设计出来就非常的漂亮 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-035.jpg) | SHOT-039 |
| CUE-036 | 01:44.45–01:50.61 | 那么在这做完的也都是可以直接分享的给别人发这个链接他们就可以查看了就像网页一样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-036.jpg) | SHOT-039 |
| CUE-037 | 01:50.93–01:56.81 | 然后如果你已经有自己的coating agent也可以直接把我的这个github发给他们因为我所有的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-037.jpg) | SHOT-039 |
| CUE-038 | 01:57.21–02:01.73 | 模板都作为HTML文件传到了这个github的repo里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-038.jpg) | SHOT-039 |
| CUE-039 | 02:02.49–02:06.93 | 在这可以预览所有的样式然后我的github的入口在我的签名里 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-039.jpg) | SHOT-039, SHOT-040 |
| CUE-040 | 02:07.33–02:14.89 | 这个叫beautiful HTML templates你要是想开始使用的话只要把这个github发给你的 agent就可以了它会知道怎么做 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-040.jpg) | SHOT-040 |
| CUE-041 | 02:15.13–02:20.69 | 我这里除了模板之外还给 agent寫了instruction就是他们可以去读取这些模板的描述 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-041.jpg) | SHOT-040 |
| CUE-042 | 02:20.69–02:27.45 | 我和关键词这样它可以根据你的需求去帮助你基于你的需求和调性匹配一个合适你的模板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-042.jpg) | SHOT-040, SHOT-041 |
| CUE-043 | 02:27.69–02:30.89 | 然后再应用这个模板的设计去给你做HTML | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-043.jpg) | SHOT-042 |
| CUE-044 | 02:31.45–02:35.33 | 我个人还是非常建议大家尝试一下用HTML取代pbt的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-044.jpg) | SHOT-043, SHOT-044, SHOT-045 |
| CUE-045 | 02:35.53–02:42.81 | 因为我觉得如果你想做出一些视觉上非常有冲击力或者是这个设计效果对你很重要的pbt | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-045.jpg) | SHOT-046, SHOT-047, SHOT-048 |
| CUE-046 | 02:43.05–02:45.45 | 我觉得只有HTML能实现类似的效果 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-046.jpg) | SHOT-048, SHOT-049, SHOT-050, SHOT-051 |
| CUE-047 | 02:45.65–02:53.21 | 并且它也是一种非常AI native的展示方式你做完之后你的客户或者你的观众就会觉得你非常的AI native | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69fe6f3a000000001a036be4/evidence/frames/cues/cue-047.jpg) | SHOT-051, SHOT-052, SHOT-053, SHOT-054 |

## 完整性自检

- 核心知识证据：6/6
- 未检查通道：无
- Meta-gate：内部通过；完整机器口播、烧录字幕、Slides 成品、AnyGen UI、GitHub UI、真人画中画和完整混合音轨均已检查；五个意义变化和四条探针关系均映射到知识单元。剩余问题属于已声明的外部可用性、权利、因果和客户效果未知，而非未检查通道。该内部 meta-gate 不替代独立 reviewer。
- 注意：内部自检不等于独立 reviewer 验证。
