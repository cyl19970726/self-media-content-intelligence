# 全程回放（3）Demo Day：我如何与 Agent 共事｜内容还原

> 仅重建 0–2518.1 秒线上 Demo Day 回放及机器转写。四位分享者、多个屏幕共享和大量英文专名导致 ASR 误差高；报告不静默改写。工具当前版本、开源仓库、许可证、组织权限、数据安全、规模效果、外部服务费用和每个 demo 的端到端连续性均需外部验证。

## 一句话还原

- 看前：观众可能只抽象知道‘和 Agent 共事’，但不知道不同角色如何把 Agent 接入沟通、开发、研究和知识管理。
- 看后：观众看到四种可组合但彼此独立的实践：让 Agent 用 HTML/视频汇报；把需求、代码、评审和状态联成开发闭环；把研究对话沉淀成报告；把长期对话写入本地 Markdown 知识系统并用 MCP/hook 降低记录摩擦。
- 认知变化：从单个聊天机器人转向工作流中的多个 Agent
- 认知变化：从一次对话转向把产物沉淀为 HTML、视频、PR、报告或 Markdown
- 认知变化：从看 demo 转向理解每种工作流的依赖与未验证边界

## 核心内容

### 分享一：HyperFrames 让 Agent 用 HTML/视频汇报

时间：00:00.00–05:57.84　层级：作者主张　置信度：medium

第一位讲者把问题定义为组织内 Agent 太多、上下文和汇报量过大，介绍 HyperFrames 作为把 HTML 变成视频的开源框架，并展示 launch 总结、内部周报视频、dashboard 等结果；还主张 LLM 写 HTML 的视觉表达优于写 React/Remotion，并口述 Apache-2.0。片内可见样例，不足以证明普遍视觉优势、沟通效率提升或当前许可证。

![分享一：HyperFrames 让 Agent 用 HTML/视频汇报](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/skill-run/targeted-evidence/frames/ACT-01-001.jpg)

未知：仓库当前版本/许可证；生成时长和失败率；团队吸收效果；Remotion 对照条件

### 分享二：Roy 用项目管理、代码仓库和 Agent 跑开发闭环

时间：05:57.84–15:16.84　层级：系统推断　置信度：medium

Roy 展示一种传统敏捷流程的 Agent 化版本：项目管理中的需求进入执行，代码和 PR 形成后由 Codex 等做自动 review，人工确认合并，状态再回写；对话和执行经验还能以 Markdown/Skill 形式沉淀。演示中仍有人工审批，不能概括为无人开发或生产级无限规模。

![分享二：Roy 用项目管理、代码仓库和 Agent 跑开发闭环](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/skill-run/targeted-evidence/frames/ACT-02-001.jpg)

**操作还原**

- 输入：项目需求/issue 和代码仓库
- 步骤 1：创建或选择需求
- 步骤 2：让 agent 实现
- 步骤 3：生成代码/PR
- 步骤 4：自动 code review
- 步骤 5：人工检查并合并
- 步骤 6：项目状态回写
- 步骤 7：沉淀经验为 Markdown/Skill
- 参数/选择：需求描述；仓库权限；评审规则；人工审批
- 输出：合并的代码变更和同步的项目状态
- 未展示：测试覆盖；失败重试；生产权限；回滚；抽帧和剪辑不能单独证明全部状态属于同一连续任务

未知：具体工具链；测试/安全门；回滚；生产采用规模；agent 权限

### 分享三：Eric 用 Agent 研究并迭代报告

时间：15:16.84–29:28.25　层级：系统推断　置信度：medium

Eric 段展示把研究问题交给 Agent，在多轮对话中调整要求、结构和格式，产出 Markdown/网页式报告并讨论 reader/展示方式。可恢复的是‘问题—研究—报告—反馈—再生成’的工作模式；具体来源覆盖、事实准确性、主题细节和工具身份因字幕/小字限制不能全部确认。

![分享三：Eric 用 Agent 研究并迭代报告](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/skill-run/targeted-evidence/frames/ACT-03-001.jpg)

未知：研究主题和来源；事实核验；报告生成工具；外部展示权限；数据保密

### 分享四：Oliver 用 MCP、Markdown 与 hook 构建低摩擦知识系统

时间：29:28.25–40:02.25　层级：作者主张　置信度：medium

Oliver 展示自制 MCP 连接本地 Markdown 文件夹，把 Claude 对话中的工作、决策、情绪和个人背景沉淀为知识，并加入每五轮检查/更新文档的提醒或 hook，降低忘记维护的摩擦。片内没有审计记忆准确性、冲突合并、删除权、加密、敏感数据和长期漂移。

![分享四：Oliver 用 MCP、Markdown 与 hook 构建低摩擦知识系统](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/skill-run/targeted-evidence/frames/ACT-04-001.jpg)

**操作还原**

- 输入：长期 Claude 对话和本地 Markdown 知识目录
- 步骤 1：通过 MCP 读取/写入目录
- 步骤 2：从对话提取需要沉淀的信息
- 步骤 3：写入结构化 Markdown
- 步骤 4：按固定轮次提醒检查更新
- 步骤 5：人工修正或继续迭代
- 参数/选择：目录；信息类别；提醒轮次；更新规则
- 输出：可供后续对话读取的本地个人知识库
- 未展示：准确性；冲突合并；删除与隐私；安全边界；抽帧和剪辑不能单独证明全部状态属于同一连续任务

未知：写入 schema；冲突与删除；权限/加密；敏感信息；长期质量


## 支撑信息

### 问答补充 onboarding、hook/MCP 分工与边界

时间：40:02.25–41:58.10　层级：作者主张　置信度：medium

问答补充：知识库可从已有长对话或 onboarding 问题初始化；Claude Code 场景提到 hook，Claude 场景提到 MCP；观众还索要 report 链接。片内没有给出完整仓库、安装命令、schema、权限或可复现配置。

![问答补充 onboarding、hook/MCP 分工与边界](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/skill-run/targeted-evidence/frames/ACT-05-001.jpg)

**论证结构**

- 论点：与 Agent 共事的关键不是聊天次数，而是把 Agent 输出接入可审计的沟通、交付和记忆载体。
- 条件：每个流程有明确人工闸门；组织权限合法；输出可追溯和修正；敏感数据受控
- 反例：纯自动化会放大错误；不同讲者的工具链不能直接拼接；长回放不等于团队采用
- 行动：选一个高摩擦环节；定义输入输出；接入 Agent；保留人工审查；把结果沉淀为 HTML/PR/报告/Markdown
- 限制：活动 demo 合集；无统一量化评估

未知：四个 onboarding 维度；hook/MCP 完整配置；report 链接；安装步骤


## 证据边界与上下文

### 专有名词与字幕冲突保留

时间：00:00.00–41:58.10　层级：系统推断　置信度：high

1196 条机器 cue 含大量多人重叠、英文产品名和代码术语误识别，例如黑镇/HeyGen、Hyper frames、Remotion、Linear、GitHub、Codex、Claude Code、MCP、Markdown、hook 等。报告保留原文，规范化仅在烧录字幕、UI、仓库页面和上下文共同支持时使用。

未知：四位讲者完整姓名与职位；若干内部产品/Agent 名称；部分仓库、命令和代码小字

### 非语音音频不构成独立操作证明

时间：00:00.00–41:58.10　层级：系统推断　置信度：medium

完整 42 分钟混合轨按 30 秒无缝窗口执行机器语义检查；多人讲话和系统/会议声音是主要信息载体，机器候选不能独立确认配乐、提示音、点击或 demo 成功事件。

未知：精确声源、曲目、来源、授权和被旁白遮蔽的低电平事件

## 内容关系

- 分享一：HyperFrames 让 Agent 用 HTML/视频汇报 → 分享二：Roy 用项目管理、代码仓库和 Agent 跑开发闭环：从沟通产物转入软件交付产物
- 分享二：Roy 用项目管理、代码仓库和 Agent 跑开发闭环 → 分享三：Eric 用 Agent 研究并迭代报告：软件交付闭环切换为研究交付闭环
- 分享三：Eric 用 Agent 研究并迭代报告 → 分享四：Oliver 用 MCP、Markdown 与 hook 构建低摩擦知识系统：研究报告沉淀进一步扩展为长期个人上下文
- 分享四：Oliver 用 MCP、Markdown 与 hook 构建低摩擦知识系统 → 问答补充 onboarding、hook/MCP 分工与边界：个人知识系统通过问答补足初始化和触发机制

## 明确不能从视频判断

- 活动完整议程、讲者姓名拼写与所属组织
- 各仓库/工具的当前地址、版本、许可证和价格
- 所有 demo 是否实时、连续、同一任务
- 组织数据权限、隐私、安全和错误恢复
- 工作流对效率、质量和团队采用的量化结果
- 非语音音频的精确内容、来源、授权与编辑意图

## 完整机器逐字稿与证据映射

> 这是本地机器转写，不是官方字幕。原始文本不静默修正；每条 cue 均对应代表帧和全部 overlapping shots。

| Cue | 时间 | 原始机器转写 | 代表帧 | Overlapping shots |
|---|---:|---|---|---|
| CUE-001 | 00:00.00–00:03.84 | 我是兵我是黑镇的VP | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-001.jpg) | SHOT-001 |
| CUE-002 | 00:03.84–00:11.32 | 然后呢 我们黑镇其实有一个问题我们一直在试的解决因为在黑镇我们有非常非常多的Agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-002.jpg) | SHOT-001 |
| CUE-003 | 00:11.32–00:25.04 | 我们有些有些Slack group里面可能你看这34个人的话可能有566个6个Agent在这个Slack group里面大家都会用这些不同的Agent去相互之间写作吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-003.jpg) | SHOT-001, SHOT-002 |
| CUE-004 | 00:25.04–00:33.36 | 然后呢 有一个很大的问题就是呢Agent还有时候给你干的事情太多了 因为Contax实在太多了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-004.jpg) | SHOT-002, SHOT-003, SHOT-004 |
| CUE-005 | 00:33.36–00:46.64 | 所以我们开发了一个开源的框架叫做Hyper frames 这个开源框架核心的IDN就是把 HTML变成视频 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-005.jpg) | SHOT-004, SHOT-005 |
| CUE-006 | 00:46.64–00:53.04 | 它开始的方法非常简单 你就是NPX把这个Hyper frames的这个Skill加进去就行了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-006.jpg) | SHOT-005, SHOT-006 |
| CUE-007 | 00:53.04–01:05.04 | 核心的点就是很多时候 我们一直想要解决的问题 在黑镇作为一下公司我们要想要解决的问题就是怎么样可以用视频的方式来增加沟通的效率 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-007.jpg) | SHOT-006 |
| CUE-008 | 01:05.04–01:19.04 | 因为尤其在我们需要沟通的内容的量越来越多的时候 你怎么样让一个视频可以把一个稳党很长的稳党变成一个一分钟的短视频让大家能够去吸收这个信息 对吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-008.jpg) | SHOT-006 |
| CUE-009 | 01:19.04–01:25.84 | 比如我们最近 launched了Hyper frames 我们Hyper frames的 launch是非常成功的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-009.jpg) | SHOT-006 |
| CUE-010 | 01:25.84–01:37.04 | 那我就让我的Agent去做了一个关于这个Hyper frames的 launch总结 包括去拉了很多不同的Twitter 然后呢 包括总结一下我们Hyper frames的数据 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-010.jpg) | SHOT-006 |
| CUE-011 | 01:37.04–01:41.04 | 然后呢 把他们做成一个视频 然后呢 发给我们的团队 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-011.jpg) | SHOT-006 |
| CUE-012 | 01:41.04–01:48.04 | 那团队就不用去点开那些 link 然后呢 也可以有一个比较style laboratory 这样的一个 moment | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-012.jpg) | SHOT-006 |
| CUE-013 | 01:48.04–01:58.04 | 然后呢 我们黑箭很多时候呢 我们甚至做了一个hagenverse 就是一个我们自己internals的产品 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-013.jpg) | SHOT-006, SHOT-007, SHOT-008, SHOT-009 |
| CUE-014 | 01:58.04–02:02.04 | 但其实我们有可能会把它去开源出去 或者去放出去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-014.jpg) | SHOT-009 |
| CUE-015 | 02:02.04–02:17.84 | 但是呢 就是 我们会 我们的Agent会越来越多的用html 还是用video的方式去把他们的工作成果返回会报给我们human 对吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-015.jpg) | SHOT-009, SHOT-010, SHOT-011 |
| CUE-016 | 02:17.84–02:27.84 | 但是你又没有一个很好的地方去把这些东西host的出来 你很多时候你就是在自己的local你有这样一个html 但是你互相 share很麻烦 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-016.jpg) | SHOT-011 |
| CUE-017 | 02:27.84–02:38.84 | 所以呢 我们就会去把所有的这些东西全部都upload 比如说之前我们黑箭intergrade了hecedance 我们 我就让Agent去铺了一下那两三天的data | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-017.jpg) | SHOT-011, SHOT-012, SHOT-013, SHOT-014, SHOT-015, SHOT-016, SHOT-017, SHOT-018, SHOT-019, SHOT-020, SHOT-021 |
| CUE-018 | 02:38.84–02:44.84 | 然后呢 把这个data做成了一个 dashboard 然后呢 就发给我的团队 让他们大概有一个概念说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-018.jpg) | SHOT-021 |
| CUE-019 | 02:44.84–02:56.84 | 然后你可以看到说 还有一些negative的东西啊 总而言之呢 就是当然我跟data也聊了很多了 就是我一直认为html是这个是Agent的第一母语 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-019.jpg) | SHOT-021 |
| CUE-020 | 02:56.84–03:03.84 | 所以我们很多时候让我们的Agent用html的方式来跟我们人类进行交流 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-020.jpg) | SHOT-021, SHOT-022, SHOT-023, SHOT-024, SHOT-025 |
| CUE-021 | 03:03.84–03:09.84 | 然后呢hyper frames 也是为了这样的一个目标 而去做的一个开源产品 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-021.jpg) | SHOT-025 |
| CUE-022 | 03:09.84–03:17.84 | 然后如果大家感兴趣记得给我们的这个hyper frames 的report 给我们加点一个小信心 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-022.jpg) | SHOT-025, SHOT-026 |
| CUE-023 | 03:17.84–03:18.84 | 好 谢谢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-023.jpg) | SHOT-026 |
| CUE-024 | 03:18.84–03:22.84 | 能放一个你们内部沟通用的视频吗 我就很有意思 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-024.jpg) | SHOT-026 |
| CUE-025 | 03:22.84–03:24.84 | 对 可以 可以 可以 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-025.jpg) | SHOT-026, SHOT-027 |
| CUE-026 | 03:24.84–03:29.84 | 我们现在很有趣的 我们刚才在哪儿来着 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-026.jpg) | SHOT-027 |
| CUE-027 | 03:29.84–03:35.84 | 对 你要有声音 但是他们点桌上声音 下面我们想声音 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-027.jpg) | SHOT-027, SHOT-028, SHOT-029, SHOT-030, SHOT-031 |
| CUE-028 | 03:35.84–03:44.84 | OK 对 我们刚才有人说到团队的抖音 我们听的是美byweekly会做一个repaub | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-028.jpg) | SHOT-031 |
| CUE-029 | 03:44.84–03:51.84 | 然后这个repaub就是一个feet of videos 就是大家就听一下 大家每天都干了啥 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-029.jpg) | SHOT-031 |
| CUE-030 | 03:51.84–03:53.84 | 比如说这是我们其中一位engineer | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-030.jpg) | SHOT-031 |
| CUE-031 | 03:53.84–03:56.84 | Hey team quick recap of my week biggest chunk with API billing | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-031.jpg) | SHOT-031 |
| CUE-032 | 03:56.84–04:01.84 | I shipped a resolution-based billing across all scene types for k-avatar pricing | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-032.jpg) | SHOT-031 |
| CUE-033 | 04:01.84–04:06.84 | 然后有一些小同学  team here's our weekly update | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-033.jpg) | SHOT-031 |
| CUE-034 | 04:06.84–04:11.84 | We've made significant strides in system performance and observability across the board | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-034.jpg) | SHOT-031 |
| CUE-035 | 04:11.84–04:15.84 | most notably we optimized P95 latency for key endpoints | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-035.jpg) | SHOT-031 |
| CUE-036 | 04:15.84–04:19.84 | session chat fetches dropped from five seconds to under 0.5 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-036.jpg) | SHOT-031 |
| CUE-037 | 04:19.84–04:22.84 | and chat requests improved from three seconds to just | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-037.jpg) | SHOT-031 |
| CUE-038 | 04:22.84–04:26.84 | 对 这些很多都是用我们的hyper frames来做的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-038.jpg) | SHOT-031 |
| CUE-039 | 04:26.84–04:29.84 | 刚才有人问到hyper frames can remotion的区别 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-039.jpg) | SHOT-031 |
| CUE-040 | 04:29.84–04:32.84 | 核心区别就是我们用 HTML remotion 用react | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-040.jpg) | SHOT-031 |
| CUE-041 | 04:32.84–04:36.84 | 然后我们在我们的测试当中 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-041.jpg) | SHOT-031 |
| CUE-042 | 04:36.84–04:43.84 | 其实Llm 写react的能力是远不如Llm 写HTML能力的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-042.jpg) | SHOT-031 |
| CUE-043 | 04:43.84–04:47.84 | 尤其是在 visual expression 上面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-043.jpg) | SHOT-031 |
| CUE-044 | 04:47.84–04:52.84 | 你比如说你用react 你很难写出这样很漂亮的一个output | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-044.jpg) | SHOT-031 |
| CUE-045 | 04:52.84–04:57.84 | 所以这是我们为什么去做件事情的一个原因之一 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-045.jpg) | SHOT-031, SHOT-032, SHOT-033 |
| CUE-046 | 04:57.84–04:59.84 | 当然其实有很多原因 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-046.jpg) | SHOT-033 |
| CUE-047 | 04:59.84–05:08.84 | 然后我前两天刚发了一篇 remotion vs hyper frame的告字 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-047.jpg) | SHOT-033, SHOT-034, SHOT-035 |
| CUE-048 | 05:08.84–05:11.84 | 大家可以感兴趣的话可以读一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-048.jpg) | SHOT-035 |
| CUE-049 | 05:11.84–05:15.84 | 对 我们是 apache2.0对 remotion 是一个license | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-049.jpg) | SHOT-035 |
| CUE-050 | 05:15.84–05:18.84 | 对 我觉得一个挺大区别就是比 remotion好看 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-050.jpg) | SHOT-035, SHOT-036 |
| CUE-051 | 05:18.84–05:22.84 | 因为我竟然用 remotion 我调了很久的还是特别臭 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-051.jpg) | SHOT-036 |
| CUE-052 | 05:22.84–05:27.84 | 但我感觉用hyper frames 第一版基本就是挺好看的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-052.jpg) | SHOT-036 |
| CUE-053 | 05:27.84–05:31.84 | 就是像我今天活动开头放那个视频 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-053.jpg) | SHOT-036, SHOT-037, SHOT-038 |
| CUE-054 | 05:31.84–05:33.84 | 就是one shop就做成这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-054.jpg) | SHOT-038 |
| CUE-055 | 05:33.84–05:37.84 | 对 我在上线之前特意帮Zara做了几个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-055.jpg) | SHOT-038 |
| CUE-056 | 05:37.84–05:42.84 | 我其实觉得这个nate同学她做的这几个 tutorial 做得特别好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-056.jpg) | SHOT-038 |
| CUE-057 | 05:42.84–05:46.84 | 所以anyway大家都可以在我的推特上找到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-057.jpg) | SHOT-038, SHOT-039, SHOT-040 |
| CUE-058 | 05:46.84–05:49.84 | 大家感兴趣的话也给我跌两个follow | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-058.jpg) | SHOT-040 |
| CUE-059 | 05:49.84–05:50.84 | 谢谢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-059.jpg) | SHOT-040 |
| CUE-060 | 05:50.84–05:52.84 | 好 谢谢边 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-060.jpg) | SHOT-040 |
| CUE-061 | 05:52.84–05:57.84 | 然后大家可以去给她不想找到hyper frames | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-061.jpg) | SHOT-040, SHOT-041 |
| CUE-062 | 05:57.84–05:59.84 | 然后下一位是Roy | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-062.jpg) | SHOT-041 |
| CUE-063 | 05:59.84–06:02.84 | 然后我是来分享一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-063.jpg) | SHOT-041, SHOT-042 |
| CUE-064 | 06:02.84–06:04.84 | 我这边就是UA政策 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-064.jpg) | SHOT-042 |
| CUE-065 | 06:04.84–06:10.84 | 然后来去做一个传统的敏捷列带的这么一个开发的过程 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-065.jpg) | SHOT-042 |
| CUE-066 | 06:10.84–06:15.84 | 然后我先有几个背景介绍一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-066.jpg) | SHOT-042 |
| CUE-067 | 06:15.84–06:21.84 | 就是一是Linear的话其实就是和JR或者是国内的TPD | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-067.jpg) | SHOT-042 |
| CUE-068 | 06:21.84–06:24.84 | A1的这种类似的一个项目管理的这么一个软件 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-068.jpg) | SHOT-042 |
| CUE-069 | 06:24.84–06:31.84 | 然后除此之外可能就是像给Hubcult的不用再去详细介绍了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-069.jpg) | SHOT-042, SHOT-043, SHOT-044 |
| CUE-070 | 06:31.84–06:36.84 | 然后我的整个的工作流程会是这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-070.jpg) | SHOT-044 |
| CUE-071 | 06:36.84–06:39.84 | 这个是我在Linear上面的一个Diamond的项目 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-071.jpg) | SHOT-044 |
| CUE-072 | 06:39.84–06:42.84 | 然后这里面可以看到我是这样的几个需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-072.jpg) | SHOT-044 |
| CUE-073 | 06:42.84–06:43.84 | 这样很多需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-073.jpg) | SHOT-044 |
| CUE-074 | 06:43.84–06:48.84 | 然后这个需求的建立首先是一个项目的入口 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-074.jpg) | SHOT-044 |
| CUE-075 | 06:48.84–06:51.84 | 然后这个键需求其实就是通过Hubcult | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-075.jpg) | SHOT-044 |
| CUE-076 | 06:51.84–06:52.84 | 我就和Hubcult聊 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-076.jpg) | SHOT-044 |
| CUE-077 | 06:52.84–06:56.84 | 就和Hubcult的去聊清楚我接下来要做什么内容 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-077.jpg) | SHOT-044, SHOT-045 |
| CUE-078 | 06:56.84–07:00.84 | 然后这里面包含了一些我之前的项目的记忆 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-078.jpg) | SHOT-045 |
| CUE-079 | 07:00.84–07:02.84 | 包括我个人那些偏好的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-079.jpg) | SHOT-045 |
| CUE-080 | 07:02.84–07:04.84 | 然后比如说我去跟他讲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-080.jpg) | SHOT-045 |
| CUE-081 | 07:04.84–07:06.84 | 说当前的某个页面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-081.jpg) | SHOT-045 |
| CUE-082 | 07:06.84–07:10.84 | 比如说我们这个Diamond的项目是一个做这样的一个土度的IPP | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-082.jpg) | SHOT-045, SHOT-046 |
| CUE-083 | 07:10.84–07:14.84 | 然后比如说我说希望这个页面有一个深色的模式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-083.jpg) | SHOT-046, SHOT-047, SHOT-048 |
| CUE-084 | 07:14.84–07:17.84 | 那这样的话它就会书里好这个需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-084.jpg) | SHOT-048 |
| CUE-085 | 07:17.84–07:20.84 | 结合一些这个项目本身的上下文 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-085.jpg) | SHOT-048 |
| CUE-086 | 07:20.84–07:22.84 | 会直接在Linear里面把这个需求给我建好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-086.jpg) | SHOT-048 |
| CUE-087 | 07:22.84–07:26.84 | 那这里面根据我预设的Problem的和规则 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-087.jpg) | SHOT-048 |
| CUE-088 | 07:26.84–07:29.84 | 它会详细清楚的描述这个背景的范围 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-088.jpg) | SHOT-048, SHOT-049, SHOT-050 |
| CUE-089 | 07:29.84–07:30.84 | 然后掩手标准 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-089.jpg) | SHOT-050 |
| CUE-090 | 07:30.84–07:32.84 | 然后包括会按照我的要求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-090.jpg) | SHOT-050 |
| CUE-091 | 07:32.84–07:35.84 | 去给它去给每一个医术打成标签 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-091.jpg) | SHOT-050 |
| CUE-092 | 07:35.84–07:37.84 | 比如说我现在强制的标签就是这三个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-092.jpg) | SHOT-050 |
| CUE-093 | 07:37.84–07:40.84 | 那它是什么类别的需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-093.jpg) | SHOT-050 |
| CUE-094 | 07:40.84–07:44.84 | 然后它是从业务分类上是什么样的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-094.jpg) | SHOT-050 |
| CUE-095 | 07:44.84–07:47.84 | 然后以及说从A任何的角度它是什么样的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-095.jpg) | SHOT-050 |
| CUE-096 | 07:47.84–07:49.84 | 它是说已经可以直接拍反给一任它了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-096.jpg) | SHOT-050 |
| CUE-097 | 07:49.84–07:51.84 | 还是说这里面有一些细节是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-097.jpg) | SHOT-050 |
| CUE-098 | 07:51.84–07:55.84 | 我们需要人去再和它进一步协调 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-098.jpg) | SHOT-050 |
| CUE-099 | 07:55.84–07:59.84 | 然后这里面需求建好了对Linear的这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-099.jpg) | SHOT-050 |
| CUE-100 | 07:59.84–08:02.84 | 对这个左上角这里能看到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-100.jpg) | SHOT-050 |
| CUE-101 | 08:02.84–08:05.84 | 然后在这里面能看到的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-101.jpg) | SHOT-050 |
| CUE-102 | 08:05.84–08:07.84 | 就是说比如用举几个例子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-102.jpg) | SHOT-050 |
| CUE-103 | 08:07.84–08:09.84 | 比如说这个需求已经建好了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-103.jpg) | SHOT-050 |
| CUE-104 | 08:09.84–08:11.84 | 我只要在这直接去指派给 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-104.jpg) | SHOT-050 |
| CUE-105 | 08:11.84–08:12.84 | 我可以并行的指派 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-105.jpg) | SHOT-050 |
| CUE-106 | 08:12.84–08:15.84 | 目前设计的最大的并行量是五个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-106.jpg) | SHOT-050 |
| CUE-107 | 08:15.84–08:16.84 | 一阵的可以同时去跑 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-107.jpg) | SHOT-050 |
| CUE-108 | 08:16.84–08:21.84 | 然后在这里面我们可以看到每一个需求具体的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-108.jpg) | SHOT-050 |
| CUE-109 | 08:21.84–08:24.84 | 这里面就是我们的调度的系统已经开始 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-109.jpg) | SHOT-050 |
| CUE-110 | 08:24.84–08:27.84 | 能拿到这个需求的描述了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-110.jpg) | SHOT-050 |
| CUE-111 | 08:27.84–08:30.84 | 其实这里面还包含了一些过去的记忆 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-111.jpg) | SHOT-050 |
| CUE-112 | 08:30.84–08:32.84 | 文档啊这种漸进失的披露啊 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-112.jpg) | SHOT-050 |
| CUE-113 | 08:32.84–08:35.84 | 所以那等等这些记录细节今天就不展开讲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-113.jpg) | SHOT-050 |
| CUE-114 | 08:35.84–08:37.84 | 然后在这里面有一个dashball | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-114.jpg) | SHOT-050 |
| CUE-115 | 08:37.84–08:41.84 | 可以看到这是我们目前正在有一阵的去跑的需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-115.jpg) | SHOT-050 |
| CUE-116 | 08:41.84–08:43.84 | 对然后在这个调系统里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-116.jpg) | SHOT-050 |
| CUE-117 | 08:43.84–08:44.84 | 其实对于A阵的定义 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-117.jpg) | SHOT-050 |
| CUE-118 | 08:44.84–08:49.84 | 它不再是一个类似于人的这样一个角色 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-118.jpg) | SHOT-050 |
| CUE-119 | 08:49.84–08:51.84 | 它其实像是一个进程 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-119.jpg) | SHOT-050 |
| CUE-120 | 08:51.84–08:53.84 | 然后里面它需要的记忆 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-120.jpg) | SHOT-050 |
| CUE-121 | 08:53.84–08:54.84 | 需要的传说文 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-121.jpg) | SHOT-050 |
| CUE-122 | 08:54.84–08:56.84 | 我们实在每次执行的时候给的注入 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-122.jpg) | SHOT-050 |
| CUE-123 | 08:56.84–08:58.84 | 以及它在执行的过程中 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-123.jpg) | SHOT-050 |
| CUE-124 | 08:58.84–09:02.84 | 它会去实际的去获取这些过去的记忆 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-124.jpg) | SHOT-050 |
| CUE-125 | 09:02.84–09:04.84 | 这个会跑一会我们可以看一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-125.jpg) | SHOT-050 |
| CUE-126 | 09:04.84–09:05.84 | 这个时候刚才跑了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-126.jpg) | SHOT-050 |
| CUE-127 | 09:05.84–09:07.84 | 它跑完之后它会这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-127.jpg) | SHOT-050 |
| CUE-128 | 09:07.84–09:09.84 | 它会这里面按照我的要求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-128.jpg) | SHOT-050 |
| CUE-129 | 09:09.84–09:11.84 | 去产出一个完整的执行报告 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-129.jpg) | SHOT-050 |
| CUE-130 | 09:11.84–09:13.84 | 这个报告里面的内容啊 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-130.jpg) | SHOT-050 |
| CUE-131 | 09:13.84–09:14.84 | 然后改动的结果 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-131.jpg) | SHOT-050 |
| CUE-132 | 09:14.84–09:18.84 | 对然后包括这里面它会过直接提成片 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-132.jpg) | SHOT-050 |
| CUE-133 | 09:18.84–09:20.84 | 这个片在这里 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-133.jpg) | SHOT-050 |
| CUE-134 | 09:20.84–09:22.84 | 它会直接提到Github上 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-134.jpg) | SHOT-050, SHOT-051, SHOT-052 |
| CUE-135 | 09:22.84–09:25.84 | 然后这个里面根据我们预设的一些格式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-135.jpg) | SHOT-052 |
| CUE-136 | 09:25.84–09:28.84 | 比如说它这里面是单一针的去跑了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-136.jpg) | SHOT-052 |
| CUE-137 | 09:28.84–09:30.84 | 它有的时候还会去开3倍针 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-137.jpg) | SHOT-052 |
| CUE-138 | 09:30.84–09:31.84 | 去执行一些任务 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-138.jpg) | SHOT-052 |
| CUE-139 | 09:31.84–09:34.84 | 用了什么样的模型消耗了多少偷肯 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-139.jpg) | SHOT-052 |
| CUE-140 | 09:34.84–09:37.84 | 然后这个里面是最开始给它提的一些需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-140.jpg) | SHOT-052 |
| CUE-141 | 09:37.84–09:39.84 | 然后包括说我们验证的标准 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-141.jpg) | SHOT-052 |
| CUE-142 | 09:39.84–09:41.84 | 包括它最终怎么样去过test | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-142.jpg) | SHOT-052 |
| CUE-143 | 09:41.84–09:44.84 | 这个和一个标准的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-143.jpg) | SHOT-052 |
| CUE-144 | 09:44.84–09:47.84 | 敏捷迭代的团队去开发的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-144.jpg) | SHOT-052 |
| CUE-145 | 09:47.84–09:49.84 | 开发需求的过程基本上是一样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-145.jpg) | SHOT-052 |
| CUE-146 | 09:49.84–09:52.84 | 这里面还引入了CodeX去做自动的CoreView | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-146.jpg) | SHOT-052 |
| CUE-147 | 09:52.84–09:57.84 | 然后向这个是在Review过程中 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-147.jpg) | SHOT-052 |
| CUE-148 | 09:57.84–09:59.84 | 然后像刚才看到这个PR是还没有合吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-148.jpg) | SHOT-052 |
| CUE-149 | 09:59.84–10:01.84 | 然后如果说我这面给它合并了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-149.jpg) | SHOT-052 |
| CUE-150 | 10:01.84–10:03.84 | 我看过一下确认没什么问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-150.jpg) | SHOT-052 |
| CUE-151 | 10:03.84–10:04.84 | 我在这面合并 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-151.jpg) | SHOT-052 |
| CUE-152 | 10:04.84–10:07.84 | 它会直接合到给它的面层库里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-152.jpg) | SHOT-052 |
| CUE-153 | 10:07.84–10:10.84 | 然后这个需求刚才还是引入Review的状态 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-153.jpg) | SHOT-052 |
| CUE-154 | 10:10.84–10:12.84 | 它这面会自动马上变成蛋 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-154.jpg) | SHOT-052 |
| CUE-155 | 10:13.84–10:17.84 | 对然后这里面可以看到的就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-155.jpg) | SHOT-052 |
| CUE-156 | 10:17.84–10:20.84 | 这个例子是一个呆模用的临时的例子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-156.jpg) | SHOT-052 |
| CUE-157 | 10:20.84–10:22.84 | 然后我的实际的开发 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-157.jpg) | SHOT-052 |
| CUE-158 | 10:22.84–10:23.84 | 包括这个产品自己的开发 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-158.jpg) | SHOT-052 |
| CUE-159 | 10:23.84–10:25.84 | 也都是用这一套东西跑出来的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-159.jpg) | SHOT-052 |
| CUE-160 | 10:25.84–10:28.84 | 那实际的它可以处理的需求量 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-160.jpg) | SHOT-052 |
| CUE-161 | 10:28.84–10:29.84 | 包括Miles送 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-161.jpg) | SHOT-052 |
| CUE-162 | 10:29.84–10:32.84 | 是这个都是没有量是非常大 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-162.jpg) | SHOT-052 |
| CUE-163 | 10:32.84–10:33.84 | 然后包括这种 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-163.jpg) | SHOT-052 |
| CUE-164 | 10:33.84–10:35.84 | 这个以完成它会不会去标识 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-164.jpg) | SHOT-052 |
| CUE-165 | 10:35.84–10:37.84 | 像这种未完成的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-165.jpg) | SHOT-052 |
| CUE-166 | 10:37.84–10:38.84 | 它会去标识这种火牢キン的国安系 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-166.jpg) | SHOT-052 |
| CUE-167 | 10:38.84–10:40.84 | 这是临时本身的一个功能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-167.jpg) | SHOT-052 |
| CUE-168 | 10:40.84–10:43.84 | 然后只要我们在描述需求的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-168.jpg) | SHOT-052 |
| CUE-169 | 10:43.84–10:45.84 | 描述清楚基本上就没问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-169.jpg) | SHOT-052 |
| CUE-170 | 10:45.84–10:46.84 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-170.jpg) | SHOT-052 |
| CUE-171 | 10:46.84–10:49.84 | 然后在有一个额外的小展示 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-171.jpg) | SHOT-052 |
| CUE-172 | 10:49.84–10:52.84 | 这里面还会去做一些这种数据的报告 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-172.jpg) | SHOT-052 |
| CUE-173 | 10:52.84–10:54.84 | 像这里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-173.jpg) | SHOT-052 |
| CUE-174 | 10:54.84–10:57.84 | 这里的时间线应该是一个干特图 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-174.jpg) | SHOT-052 |
| CUE-175 | 10:57.84–10:59.84 | 比如说在每一个任务 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-175.jpg) | SHOT-052 |
| CUE-176 | 10:59.84–11:01.84 | 或者每一个项目上消耗了多少时间 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-176.jpg) | SHOT-052 |
| CUE-177 | 11:01.84–11:05.84 | 然后这个周报大概是什么样的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-177.jpg) | SHOT-052 |
| CUE-178 | 11:05.84–11:07.84 | 比如说这些A证它消耗了多少时间 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-178.jpg) | SHOT-052 |
| CUE-179 | 11:07.84–11:11.84 | 然后以及说消耗的那个头肯的量 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-179.jpg) | SHOT-052 |
| CUE-180 | 11:11.84–11:12.84 | 30的数量 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-180.jpg) | SHOT-052 |
| CUE-181 | 11:12.84–11:13.84 | 可密的数量 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-181.jpg) | SHOT-052 |
| CUE-182 | 11:13.84–11:14.84 | 以及说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-182.jpg) | SHOT-052 |
| CUE-183 | 11:14.84–11:16.84 | 这是看现在正在跑的几个任务 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-183.jpg) | SHOT-052 |
| CUE-184 | 11:16.84–11:18.84 | 然后这是一些核心的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-184.jpg) | SHOT-052 |
| CUE-185 | 11:18.84–11:20.84 | 或者库面的服务进程 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-185.jpg) | SHOT-052 |
| CUE-186 | 11:20.84–11:22.84 | 然后每一次执行的报告 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-186.jpg) | SHOT-052 |
| CUE-187 | 11:22.84–11:24.84 | 这里面可以跳转到它的详细报告 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-187.jpg) | SHOT-052 |
| CUE-188 | 11:24.84–11:27.84 | 然后这里面报寒时间 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-188.jpg) | SHOT-052 |
| CUE-189 | 11:27.84–11:28.84 | 就是一些具体的信息 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-189.jpg) | SHOT-052 |
| CUE-190 | 11:28.84–11:31.84 | 然后整个系统的安全、自减等等 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-190.jpg) | SHOT-052 |
| CUE-191 | 11:31.84–11:32.84 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-191.jpg) | SHOT-052 |
| CUE-192 | 11:32.84–11:34.84 | 大概就是这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-192.jpg) | SHOT-052 |
| CUE-193 | 11:34.84–11:37.84 | 这里面其实可能除此之外 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-193.jpg) | SHOT-052 |
| CUE-194 | 11:37.84–11:40.84 | 不如外还报寒一些比较核心那么快 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-194.jpg) | SHOT-052 |
| CUE-195 | 11:40.84–11:42.84 | 像这种记忆是怎么做的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-195.jpg) | SHOT-052 |
| CUE-196 | 11:42.84–11:44.84 | 然后包括说这些展示系统是怎么做的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-196.jpg) | SHOT-052 |
| CUE-197 | 11:44.84–11:46.84 | 这个后面有需要的访吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-197.jpg) | SHOT-052, SHOT-053 |
| CUE-198 | 11:46.84–11:47.84 | 可以下来的详细了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-198.jpg) | SHOT-053 |
| CUE-199 | 11:47.84–11:49.84 | 像这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-199.jpg) | SHOT-053 |
| CUE-200 | 11:49.84–11:51.84 | 差不多就这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-200.jpg) | SHOT-053 |
| CUE-201 | 11:51.84–11:53.84 | 所以你这些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-201.jpg) | SHOT-053 |
| CUE-202 | 11:53.84–11:55.84 | 就是理念上面都是AZN | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-202.jpg) | SHOT-053 |
| CUE-203 | 11:55.84–11:57.84 | 就没有人了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-203.jpg) | SHOT-053, SHOT-054 |
| CUE-204 | 11:57.84–11:59.84 | 理念上面其实记录的还是需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-204.jpg) | SHOT-054 |
| CUE-205 | 11:59.84–12:01.84 | 就是这个需求 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-205.jpg) | SHOT-054 |
| CUE-206 | 12:01.84–12:05.84 | 比如说我看一个这个吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-206.jpg) | SHOT-054 |
| CUE-207 | 12:05.84–12:08.84 | 有的需求其实是需要人去做的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-207.jpg) | SHOT-054 |
| CUE-208 | 12:08.84–12:10.84 | 那无论是人来协作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-208.jpg) | SHOT-054 |
| CUE-209 | 12:10.84–12:12.84 | 还是说这里面加入AZN来协作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-209.jpg) | SHOT-054 |
| CUE-210 | 12:12.84–12:14.84 | 我们通过标权来区分 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-210.jpg) | SHOT-054 |
| CUE-211 | 12:14.84–12:17.84 | 然后如果是来做我这面假設团队流其他成员 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-211.jpg) | SHOT-054 |
| CUE-212 | 12:17.84–12:20.84 | 我就正常地去债案给其他人 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-212.jpg) | SHOT-054 |
| CUE-213 | 12:20.84–12:23.84 | 如果说我已经达到了一个可派发的状态 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-213.jpg) | SHOT-054 |
| CUE-214 | 12:23.84–12:25.84 | 有这个需求里面需要的决策 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-214.jpg) | SHOT-054 |
| CUE-215 | 12:25.84–12:27.84 | 和输入已经全了的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-215.jpg) | SHOT-054 |
| CUE-216 | 12:27.84–12:28.84 | 我直接在这只派给AZN | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-216.jpg) | SHOT-054 |
| CUE-217 | 12:28.84–12:30.84 | AZN自己去执行就好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-217.jpg) | SHOT-054 |
| CUE-218 | 12:30.84–12:33.84 | 我只需要去看一下最后的这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-218.jpg) | SHOT-054 |
| CUE-219 | 12:33.84–12:35.84 | Summer来验证和没有执行成功 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-219.jpg) | SHOT-054 |
| CUE-220 | 12:37.84–12:40.84 | 然后这些TK也是AI创建的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-220.jpg) | SHOT-054 |
| CUE-221 | 12:40.84–12:44.84 | 对 这里面这个TK的其实是和可派扣的了的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-221.jpg) | SHOT-054 |
| CUE-222 | 12:44.84–12:46.84 | 这里面有创建需求的这种sql | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-222.jpg) | SHOT-054 |
| CUE-223 | 12:46.84–12:48.84 | 或者说一些约束吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-223.jpg) | SHOT-054 |
| CUE-224 | 12:48.84–12:51.84 | 那这里面它会无论是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-224.jpg) | SHOT-054 |
| CUE-225 | 12:51.84–12:54.84 | 用到这个superpowers 还是gstack这种 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-225.jpg) | SHOT-054 |
| CUE-226 | 12:54.84–12:56.84 | 然后会离清里面很多的问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-226.jpg) | SHOT-054 |
| CUE-227 | 12:56.84–13:00.84 | 然后它也会加入之前那些上下文 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-227.jpg) | SHOT-054 |
| CUE-228 | 13:00.84–13:05.84 | 然后这里边稍微看一眼这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-228.jpg) | SHOT-054 |
| CUE-229 | 13:05.84–13:07.84 | 就是整个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-229.jpg) | SHOT-054 |
| CUE-230 | 13:08.84–13:11.84 | 整个的这一套其实最强的依赖 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-230.jpg) | SHOT-054 |
| CUE-231 | 13:11.84–13:13.84 | 是这一套的记忆层 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-231.jpg) | SHOT-054 |
| CUE-232 | 13:13.84–13:15.84 | 这整套记忆层是稍微表复杂的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-232.jpg) | SHOT-054 |
| CUE-233 | 13:15.84–13:17.84 | 然后里面有白像的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-233.jpg) | SHOT-054 |
| CUE-234 | 13:17.84–13:21.84 | 然后整个白整个住手的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-234.jpg) | SHOT-054 |
| CUE-235 | 13:21.84–13:23.84 | 然后一些research的结果 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-235.jpg) | SHOT-054 |
| CUE-236 | 13:23.84–13:24.84 | 包括它的日记 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-236.jpg) | SHOT-054 |
| CUE-237 | 13:24.84–13:27.84 | 每次像这种AZN的执行的日记 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-237.jpg) | SHOT-054 |
| CUE-238 | 13:27.84–13:28.84 | 它会去做一些出项 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-238.jpg) | SHOT-054 |
| CUE-239 | 13:28.84–13:31.84 | 然后去做一些关键词的所引 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-239.jpg) | SHOT-054 |
| CUE-240 | 13:31.84–13:33.84 | 所以说后面的AZN在执行的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-240.jpg) | SHOT-054 |
| CUE-241 | 13:33.84–13:36.84 | 会通过这种方式拿到一些这种结果 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-241.jpg) | SHOT-054 |
| CUE-242 | 13:36.84–13:38.84 | 包括我们记忆的沉淀 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-242.jpg) | SHOT-054 |
| CUE-243 | 13:38.84–13:41.84 | 然后去做这种 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-243.jpg) | SHOT-054 |
| CUE-244 | 13:41.84–13:43.84 | 就是从日报沉淀成Factor | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-244.jpg) | SHOT-054 |
| CUE-245 | 13:43.84–13:45.84 | 然后包括说生成Promise等等 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-245.jpg) | SHOT-054 |
| CUE-246 | 13:45.84–13:47.84 | 这个在每天的启动的过程中 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-246.jpg) | SHOT-054 |
| CUE-247 | 13:47.84–13:49.84 | 然后包括使用的过程中 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-247.jpg) | SHOT-054 |
| CUE-248 | 13:49.84–13:50.84 | 都会这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-248.jpg) | SHOT-054 |
| CUE-249 | 13:50.84–13:51.84 | 这里面我们可以看到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-249.jpg) | SHOT-054 |
| CUE-250 | 13:51.84–13:54.84 | 刚刚才派发的一个任务完成了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-250.jpg) | SHOT-054 |
| CUE-251 | 13:54.84–13:56.84 | 它完成的效果就是这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-251.jpg) | SHOT-054 |
| CUE-252 | 13:56.84–13:59.84 | 然后我们在这个地方 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-252.jpg) | SHOT-054 |
| CUE-253 | 13:59.84–14:00.84 | 把它劈而合掉之后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-253.jpg) | SHOT-054 |
| CUE-254 | 14:00.84–14:03.84 | 然后再去本地重新启动一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-254.jpg) | SHOT-054 |
| CUE-255 | 14:03.84–14:04.84 | 就没什么问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-255.jpg) | SHOT-054, SHOT-055, SHOT-056 |
| CUE-256 | 14:04.84–14:06.84 | 我这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-256.jpg) | SHOT-056, SHOT-057 |
| CUE-257 | 14:06.84–14:08.84 | 大家问这个是开源的吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-257.jpg) | SHOT-057 |
| CUE-258 | 14:08.84–14:10.84 | 这个目前还没开源 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-258.jpg) | SHOT-057 |
| CUE-259 | 14:10.84–14:13.84 | 后面开源的计划可能会先把 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-259.jpg) | SHOT-057 |
| CUE-260 | 14:13.84–14:15.84 | 记忆这一块可能先开源出来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-260.jpg) | SHOT-057 |
| CUE-261 | 14:15.84–14:18.84 | 然后因为这个整体涉及到的组件比较多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-261.jpg) | SHOT-057 |
| CUE-262 | 14:18.84–14:20.84 | 到底该怎么开源 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-262.jpg) | SHOT-057 |
| CUE-263 | 14:20.84–14:22.84 | 我这面还在够想 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-263.jpg) | SHOT-057 |
| CUE-264 | 14:22.84–14:26.84 | 然后我继续看一下这个问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-264.jpg) | SHOT-057 |
| CUE-265 | 14:26.84–14:30.84 | 可派发状态是人来制定规则 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-265.jpg) | SHOT-057 |
| CUE-266 | 14:30.84–14:32.84 | 然后有可能要扣的来判断 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-266.jpg) | SHOT-057 |
| CUE-267 | 14:32.84–14:35.84 | 就是比如说目前的一些规则 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-267.jpg) | SHOT-057 |
| CUE-268 | 14:35.84–14:37.84 | 就是说需要的杀害稳是不是足够了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-268.jpg) | SHOT-057 |
| CUE-269 | 14:37.84–14:39.84 | 有没有带离情的问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-269.jpg) | SHOT-057 |
| CUE-270 | 14:39.84–14:43.84 | 以及说是不是需要输入一些额外的决策 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-270.jpg) | SHOT-057 |
| CUE-271 | 14:45.84–14:47.84 | 然后AppC店的部分 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-271.jpg) | SHOT-057 |
| CUE-272 | 14:47.84–14:50.84 | 那就是像刚才提到的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-272.jpg) | SHOT-057 |
| CUE-273 | 14:50.84–14:54.84 | 我们一次和可澳的对话的过程 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-273.jpg) | SHOT-057 |
| CUE-274 | 14:54.84–14:56.84 | 然后包括AZN的执行的过程 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-274.jpg) | SHOT-057 |
| CUE-275 | 14:56.84–14:58.84 | 包括在可澳扣里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-275.jpg) | SHOT-057 |
| CUE-276 | 14:58.84–15:00.84 | 去手工的做一些任务开放 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-276.jpg) | SHOT-057 |
| CUE-277 | 15:00.84–15:03.84 | 那它都会通过这种SKU的方式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-277.jpg) | SHOT-057 |
| CUE-278 | 15:03.84–15:05.84 | 把它沉淀成markdown | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-278.jpg) | SHOT-057 |
| CUE-279 | 15:06.84–15:09.84 | AppC店只是markdown的一个展现形式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-279.jpg) | SHOT-057 |
| CUE-280 | 15:11.84–15:13.84 | 我们时间差不多了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-280.jpg) | SHOT-057 |
| CUE-281 | 15:13.84–15:14.84 | 先到这边 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-281.jpg) | SHOT-057 |
| CUE-282 | 15:14.84–15:16.84 | 好 感谢Roy | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-282.jpg) | SHOT-057 |
| CUE-283 | 15:16.84–15:18.84 | 对 下一位Eric | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-283.jpg) | SHOT-057, SHOT-058 |
| CUE-284 | 15:18.84–15:19.84 | 好的 我发现我的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-284.jpg) | SHOT-058 |
| CUE-285 | 15:19.84–15:21.84 | 上午和在软转转转转转转 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-285.jpg) | SHOT-058 |
| CUE-286 | 15:21.84–15:23.84 | 但是主持人是在机率开关上的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-286.jpg) | SHOT-058 |
| CUE-287 | 15:23.84–15:24.84 | 然后我先介绍一下自己 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-287.jpg) | SHOT-058 |
| CUE-288 | 15:24.84–15:26.84 | 我本来是在那个不信集团 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-288.jpg) | SHOT-058 |
| CUE-289 | 15:26.84–15:29.84 | 主要是负责消费捷业预议投资的感 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-289.jpg) | SHOT-058 |
| CUE-290 | 15:29.84–15:32.84 | 那是我不知道我们现场还有没有 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-290.jpg) | SHOT-058 |
| CUE-291 | 15:32.84–15:36.84 | 比如说做资讯 做投行 做律师 做实际同学 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-291.jpg) | SHOT-058 |
| CUE-292 | 15:36.84–15:38.84 | 我觉得今天这个工作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-292.jpg) | SHOT-058 |
| CUE-293 | 15:38.84–15:40.84 | 可能会更适合你们 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-293.jpg) | SHOT-058 |
| CUE-294 | 15:40.84–15:43.84 | 那因为我本来是一个头等的身份 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-294.jpg) | SHOT-058 |
| CUE-295 | 15:43.84–15:45.84 | 那可能是因为所以如果我固定的有几个特点 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-295.jpg) | SHOT-058 |
| CUE-296 | 15:45.84–15:47.84 | 如果固定的工作有很少 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-296.jpg) | SHOT-058 |
| CUE-297 | 15:47.84–15:49.84 | 因为老板可能会拍发各种各样的过程 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-297.jpg) | SHOT-058 |
| CUE-298 | 15:49.84–15:51.84 | 也会进行各种各样的谈判 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-298.jpg) | SHOT-058 |
| CUE-299 | 15:51.84–15:54.84 | 那在于就是我的路上 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-299.jpg) | SHOT-058 |
| CUE-300 | 15:54.84–15:57.84 | 经常是带过车 高铁 然后出差物 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-300.jpg) | SHOT-058 |
| CUE-301 | 15:57.84–16:00.84 | 那所以我对移动的要求是非常强烂 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-301.jpg) | SHOT-058 |
| CUE-302 | 16:00.84–16:04.84 | 然后我用了这么长时间的一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-302.jpg) | SHOT-058 |
| CUE-303 | 16:04.84–16:06.84 | 大家一之后我把我下来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-303.jpg) | SHOT-058 |
| CUE-304 | 16:06.84–16:08.84 | 其实是动的模型其实是最好的选择 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-304.jpg) | SHOT-058 |
| CUE-305 | 16:08.84–16:10.84 | 然后再一个是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-305.jpg) | SHOT-058 |
| CUE-306 | 16:10.84–16:12.84 | 我对移动转的那个要求比较高 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-306.jpg) | SHOT-058 |
| CUE-307 | 16:12.84–16:14.84 | 所以说当是 OpenCloud 出来的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-307.jpg) | SHOT-058 |
| CUE-308 | 16:14.84–16:17.84 | 我是低线时间用的 连回来叫Cloudport | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-308.jpg) | SHOT-058 |
| CUE-309 | 16:17.84–16:19.84 | 但是我在使用过程中就发现它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-309.jpg) | SHOT-058 |
| CUE-310 | 16:19.84–16:22.84 | 它唯一好处处是在使用的很重 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-310.jpg) | SHOT-058 |
| CUE-311 | 16:22.84–16:24.84 | 它比Cloudco的和那个CloudX | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-311.jpg) | SHOT-058 |
| CUE-312 | 16:24.84–16:25.84 | 它特别不忍定 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-312.jpg) | SHOT-058 |
| CUE-313 | 16:25.84–16:28.84 | 在四月份的时候它在后头比克 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-313.jpg) | SHOT-058 |
| CUE-314 | 16:28.84–16:31.84 | 它在支持 OpenCloud的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-314.jpg) | SHOT-058 |
| CUE-315 | 16:31.84–16:35.84 | 那个时候我就觉得一般自己去搞一个这样的东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-315.jpg) | SHOT-058 |
| CUE-316 | 16:35.84–16:37.84 | 就是把Cloudco的原生 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-316.jpg) | SHOT-058 |
| CUE-317 | 16:37.84–16:40.84 | Cloudco的CloudX原生的我求结在拍一个案子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-317.jpg) | SHOT-058 |
| CUE-318 | 16:40.84–16:43.84 | 这样子好处就是我可以天上用他们自己的哈尼斯 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-318.jpg) | SHOT-058 |
| CUE-319 | 16:43.84–16:46.84 | 其实我不来发现其实 OpenCloud | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-319.jpg) | SHOT-058 |
| CUE-320 | 16:46.84–16:48.84 | 不好用原因其实哈尼斯 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-320.jpg) | SHOT-058 |
| CUE-321 | 16:48.84–16:52.84 | 它的哈尼斯能让Cloudco的和那个CloudX要弱 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-321.jpg) | SHOT-058 |
| CUE-322 | 16:52.84–16:57.84 | 所以其实我是就是这样子进行一个下机 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-322.jpg) | SHOT-058 |
| CUE-323 | 16:57.84–17:00.84 | 然后我给大家进行一个展示板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-323.jpg) | SHOT-058 |
| CUE-324 | 17:00.84–17:03.84 | 就是我为了几个时间进行展示 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-324.jpg) | SHOT-058 |
| CUE-325 | 17:03.84–17:05.84 | 那我其实是跟当晚那边一样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-325.jpg) | SHOT-058 |
| CUE-326 | 17:05.84–17:07.84 | 其实是每个30你都是一个号的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-326.jpg) | SHOT-058 |
| CUE-327 | 17:07.84–17:09.84 | 这个就是CloudX的后头 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-327.jpg) | SHOT-058 |
| CUE-328 | 17:09.84–17:11.84 | 这个是Cloudco的一个30 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-328.jpg) | SHOT-058 |
| CUE-329 | 17:11.84–17:16.84 | 那我给大家举几个最长的一个成为用的例子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-329.jpg) | SHOT-058 |
| CUE-330 | 17:16.84–17:21.84 | 比如说在有次我可能在飞机上飞机之前 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-330.jpg) | SHOT-058 |
| CUE-331 | 17:21.84–17:23.84 | 老板打电话来就说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-331.jpg) | SHOT-058 |
| CUE-332 | 17:23.84–17:26.84 | Irken去调研一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-332.jpg) | SHOT-058 |
| CUE-333 | 17:26.84–17:28.84 | 包括我们今年AI投资情况 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-333.jpg) | SHOT-058 |
| CUE-334 | 17:28.84–17:30.84 | 包括整个居身扯的情况 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-334.jpg) | SHOT-058 |
| CUE-335 | 17:30.84–17:32.84 | 我们下飞机过什么时候投资一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-335.jpg) | SHOT-058 |
| CUE-336 | 17:32.84–17:35.84 | 那我这个时候我其实是不要尴尬的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-336.jpg) | SHOT-058 |
| CUE-337 | 17:35.84–17:38.84 | 那我可能去现场打开电脑去做 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-337.jpg) | SHOT-058 |
| CUE-338 | 17:38.84–17:40.84 | 但是这样子我一个Touching | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-338.jpg) | SHOT-058 |
| CUE-339 | 17:40.84–17:42.84 | 把我Touchgram一个介面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-339.jpg) | SHOT-058 |
| CUE-340 | 17:42.84–17:44.84 | 就当作我在用手机 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-340.jpg) | SHOT-058 |
| CUE-341 | 17:44.84–17:45.84 | 因为它即合适的一样的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-341.jpg) | SHOT-058 |
| CUE-342 | 17:45.84–17:48.84 | 然后这个时候我就会用语音 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-342.jpg) | SHOT-058 |
| CUE-343 | 17:48.84–17:53.84 | 就是对进行一个进行一个交流 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-343.jpg) | SHOT-058 |
| CUE-344 | 17:53.84–17:56.84 | 然后语音去的话我会想进行一个分享 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-344.jpg) | SHOT-058 |
| CUE-345 | 17:56.84–17:58.84 | 不想就是我发现目前是没有动物 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-345.jpg) | SHOT-058 |
| CUE-346 | 17:58.84–18:02.84 | 没有一个工业或小工赦或者是提到的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-346.jpg) | SHOT-058 |
| CUE-347 | 18:02.84–18:05.84 | 因为可能在外地它们质物飞书 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-347.jpg) | SHOT-058 |
| CUE-348 | 18:05.84–18:07.84 | 会支持云会比较好的一点 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-348.jpg) | SHOT-058 |
| CUE-349 | 18:07.84–18:11.84 | 但是它管我们本身它其实是不止质物 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-349.jpg) | SHOT-058 |
| CUE-350 | 18:11.84–18:13.84 | 那很多人会用Visper等一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-350.jpg) | SHOT-058 |
| CUE-351 | 18:13.84–18:15.84 | 比如说X它会发入一些API | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-351.jpg) | SHOT-058 |
| CUE-352 | 18:15.84–18:19.84 | 但是这样子的API的天生对中门支持是很差的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-352.jpg) | SHOT-058 |
| CUE-353 | 18:19.84–18:21.84 | 那我这边我会选择去本地 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-353.jpg) | SHOT-058 |
| CUE-354 | 18:21.84–18:23.84 | 我会下载一个赵千三 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-354.jpg) | SHOT-058 |
| CUE-355 | 18:23.84–18:25.84 | ASR0.6B的一个地模型 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-355.jpg) | SHOT-058 |
| CUE-356 | 18:25.84–18:29.84 | 它对各种语音方言包括你中门说的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-356.jpg) | SHOT-058 |
| CUE-357 | 18:29.84–18:30.84 | 不太标准 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-357.jpg) | SHOT-058 |
| CUE-358 | 18:30.84–18:31.84 | 理解可能是特别好的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-358.jpg) | SHOT-058 |
| CUE-359 | 18:31.84–18:33.84 | 那即使此之外之后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-359.jpg) | SHOT-058 |
| CUE-360 | 18:33.84–18:36.84 | 我以刚刚在审认了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-360.jpg) | SHOT-058 |
| CUE-361 | 18:36.84–18:40.84 | 我就会跟这个跟我的考套图会说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-361.jpg) | SHOT-058 |
| CUE-362 | 18:40.84–18:42.84 | 请你帮我拍出4个审论 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-362.jpg) | SHOT-058 |
| CUE-363 | 18:42.84–18:45.84 | 去帮我进行站子的调言 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-363.jpg) | SHOT-058 |
| CUE-364 | 18:45.84–18:47.84 | 然后我这个其实我跟Zara | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-364.jpg) | SHOT-058 |
| CUE-365 | 18:47.84–18:48.84 | 其实不一样的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-365.jpg) | SHOT-058 |
| CUE-366 | 18:48.84–18:51.84 | 我是比较喜欢安递这个门站的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-366.jpg) | SHOT-058 |
| CUE-367 | 18:51.84–18:53.84 | 因为安递的门站第一时 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-367.jpg) | SHOT-058 |
| CUE-368 | 18:53.84–18:55.84 | 它破得生长特别快 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-368.jpg) | SHOT-058 |
| CUE-369 | 18:55.84–18:57.84 | 第二就是我们其实我在手机上的毒月毒 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-369.jpg) | SHOT-058 |
| CUE-370 | 18:57.84–18:59.84 | 也很方便的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-370.jpg) | SHOT-058 |
| CUE-371 | 18:59.84–19:01.84 | 而且我觉得现在观众时代到了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-371.jpg) | SHOT-058 |
| CUE-372 | 19:01.84–19:04.84 | 大家可以人家去外面一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-372.jpg) | SHOT-058 |
| CUE-373 | 19:04.84–19:06.84 | 比如说以Zara为主的一样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-373.jpg) | SHOT-058 |
| CUE-374 | 19:06.84–19:09.84 | 其实有两次我还是挺无缩的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-374.jpg) | SHOT-058 |
| CUE-375 | 19:09.84–19:12.84 | 对那第一轮的结果可能是不满意的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-375.jpg) | SHOT-058 |
| CUE-376 | 19:12.84–19:13.84 | 那我会进行一个阮宫 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-376.jpg) | SHOT-058 |
| CUE-377 | 19:13.84–19:15.84 | 因然是对赢进行的阮宫 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-377.jpg) | SHOT-058 |
| CUE-378 | 19:15.84–19:18.84 | 阮宫完之后它会进行一个第二轮的修理 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-378.jpg) | SHOT-058 |
| CUE-379 | 19:18.84–19:19.84 | 那我第二轮修理 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-379.jpg) | SHOT-058 |
| CUE-380 | 19:19.84–19:20.84 | 我看到这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-380.jpg) | SHOT-058 |
| CUE-381 | 19:20.84–19:23.84 | 它我会让它在拍出4个死围阵 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-381.jpg) | SHOT-058 |
| CUE-382 | 19:23.84–19:25.84 | 推进进行的修理 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-382.jpg) | SHOT-058 |
| CUE-383 | 19:25.84–19:27.84 | 我就这里其实大家要相信 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-383.jpg) | SHOT-058 |
| CUE-384 | 19:27.84–19:29.84 | 一个死围阵的这样一个力量 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-384.jpg) | SHOT-058 |
| CUE-385 | 19:29.84–19:30.84 | 因为它现在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-385.jpg) | SHOT-058 |
| CUE-386 | 19:30.84–19:32.84 | 包括库莱克斯的和那个淘导库 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-386.jpg) | SHOT-058 |
| CUE-387 | 19:32.84–19:34.84 | 他们自身的死围阵特的功能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-387.jpg) | SHOT-058 |
| CUE-388 | 19:34.84–19:35.84 | 就非常强烂 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-388.jpg) | SHOT-058 |
| CUE-389 | 19:35.84–19:37.84 | 它这边就帮我进行一个六晚 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-389.jpg) | SHOT-058 |
| CUE-390 | 19:37.84–19:40.84 | 六晚多次但是六晚多次的这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-390.jpg) | SHOT-058 |
| CUE-391 | 19:40.84–19:41.84 | 研究了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-391.jpg) | SHOT-058 |
| CUE-392 | 19:41.84–19:42.84 | 那后面的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-392.jpg) | SHOT-058 |
| CUE-393 | 19:42.84–19:44.84 | 我今天只是按利亚 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-393.jpg) | SHOT-058 |
| CUE-394 | 19:44.84–19:46.84 | 我说不进行一个加深的这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-394.jpg) | SHOT-058 |
| CUE-395 | 19:46.84–19:47.84 | 它回攻了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-395.jpg) | SHOT-058 |
| CUE-396 | 19:47.84–19:48.84 | 那我觉得OK了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-396.jpg) | SHOT-058 |
| CUE-397 | 19:48.84–19:49.84 | 我会对它赢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-397.jpg) | SHOT-058 |
| CUE-398 | 19:49.84–19:50.84 | 我再跟它说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-398.jpg) | SHOT-058 |
| CUE-399 | 19:50.84–19:52.84 | 我把我的要求说出来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-399.jpg) | SHOT-058 |
| CUE-400 | 19:52.84–19:53.84 | 是释成一个报告 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-400.jpg) | SHOT-058 |
| CUE-401 | 19:53.84–19:54.84 | 然后这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-401.jpg) | SHOT-058 |
| CUE-402 | 19:54.84–19:55.84 | 就会生存一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-402.jpg) | SHOT-058 |
| CUE-403 | 19:55.84–19:56.84 | 一个握的版的这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-403.jpg) | SHOT-058 |
| CUE-404 | 19:56.84–19:57.84 | 一个报告 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-404.jpg) | SHOT-058 |
| CUE-405 | 19:57.84–19:58.84 | 单革手没有 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-405.jpg) | SHOT-058 |
| CUE-406 | 19:58.84–20:00.84 | 我们这边没有我们要进行调整 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-406.jpg) | SHOT-058 |
| CUE-407 | 20:00.84–20:02.84 | 因为如果是真实的一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-407.jpg) | SHOT-058 |
| CUE-408 | 20:02.84–20:03.84 | 一个我这边的一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-408.jpg) | SHOT-058 |
| CUE-409 | 20:03.84–20:05.84 | 自己在用这个三圣之后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-409.jpg) | SHOT-058 |
| CUE-410 | 20:05.84–20:07.84 | 我会在它的调整的两地里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-410.jpg) | SHOT-058 |
| CUE-411 | 20:07.84–20:09.84 | 我会对它的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-411.jpg) | SHOT-058 |
| CUE-412 | 20:09.84–20:10.84 | 我会对它的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-412.jpg) | SHOT-058 |
| CUE-413 | 20:10.84–20:12.84 | 这是格式进行一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-413.jpg) | SHOT-058 |
| CUE-414 | 20:12.84–20:12.84 | 标主 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-414.jpg) | SHOT-058 |
| CUE-415 | 20:12.84–20:14.84 | 我觉得它如果在我的部分里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-415.jpg) | SHOT-058 |
| CUE-416 | 20:14.84–20:15.84 | 它生存了格式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-416.jpg) | SHOT-058 |
| CUE-417 | 20:15.84–20:17.84 | 是不用进行微小的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-417.jpg) | SHOT-058 |
| CUE-418 | 20:17.84–20:18.84 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-418.jpg) | SHOT-058 |
| CUE-419 | 20:18.84–20:20.84 | 然后我要马上在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-419.jpg) | SHOT-058 |
| CUE-420 | 20:20.84–20:21.84 | 因为我可能会再问一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-420.jpg) | SHOT-058 |
| CUE-421 | 20:21.84–20:22.84 | 大家发现那些时间 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-421.jpg) | SHOT-058 |
| CUE-422 | 20:22.84–20:24.84 | 你需要非常东西告诉我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-422.jpg) | SHOT-058 |
| CUE-423 | 20:24.84–20:26.84 | 就是说我发现很多颜中园 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-423.jpg) | SHOT-058 |
| CUE-424 | 20:26.84–20:28.84 | 重庆原它在跟上周的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-424.jpg) | SHOT-058 |
| CUE-425 | 20:28.84–20:30.84 | 它是会有一些练成解剃的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-425.jpg) | SHOT-058 |
| CUE-426 | 20:30.84–20:32.84 | 也就是比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-426.jpg) | SHOT-058 |
| CUE-427 | 20:32.84–20:33.84 | 我们在做sql的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-427.jpg) | SHOT-058 |
| CUE-428 | 20:33.84–20:35.84 | 它们特别喜欢和那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-428.jpg) | SHOT-058 |
| CUE-429 | 20:35.84–20:37.84 | 一定要有sli 零零零零零零零零零 mcp 法国 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-429.jpg) | SHOT-058 |
| CUE-430 | 20:37.84–20:39.84 | 它们才会想过这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-430.jpg) | SHOT-058 |
| CUE-431 | 20:39.84–20:41.84 | 但是我想说的是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-431.jpg) | SHOT-058 |
| CUE-432 | 20:41.84–20:43.84 | 现在也要相信打模型 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-432.jpg) | SHOT-058 |
| CUE-433 | 20:43.84–20:46.84 | 包括后来GP5.5 以及 opaz cn7 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-433.jpg) | SHOT-058 |
| CUE-434 | 20:46.84–20:48.84 | 它们本身实别视频 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-434.jpg) | SHOT-058 |
| CUE-435 | 20:48.84–20:49.84 | 就是屏幕能力是非常强的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-435.jpg) | SHOT-058 |
| CUE-436 | 20:49.84–20:51.84 | 就是我这个基于死了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-436.jpg) | SHOT-058 |
| CUE-437 | 20:51.84–20:52.84 | 我就做了一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-437.jpg) | SHOT-058 |
| CUE-438 | 20:52.84–20:53.84 | 一个这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-438.jpg) | SHOT-058 |
| CUE-439 | 20:53.84–20:55.84 | 一个 timid ppt的一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-439.jpg) | SHOT-058 |
| CUE-440 | 20:55.84–20:56.84 | 一个一个 skill | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-440.jpg) | SHOT-058 |
| CUE-441 | 20:56.84–20:57.84 | 那本质上它其实是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-441.jpg) | SHOT-058 |
| CUE-442 | 20:57.84–21:00.84 | 其实是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-442.jpg) | SHOT-058 |
| CUE-443 | 21:00.84–21:02.45 | 其实就是在游览器里的把我们党存在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-443.jpg) | SHOT-058 |
| CUE-444 | 21:02.45–21:05.05 | 存到Kimi的PBT的那个AZ裡面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-444.jpg) | SHOT-058 |
| CUE-445 | 21:05.05–21:08.45 | 然后进行一个反回 说它过进行反回 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-445.jpg) | SHOT-058 |
| CUE-446 | 21:08.45–21:10.85 | 然后它的几样是非常高效的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-446.jpg) | SHOT-058 |
| CUE-447 | 21:10.85–21:13.05 | 这是对于我工作的准备是非常有用的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-447.jpg) | SHOT-058, SHOT-059, SHOT-060 |
| CUE-448 | 21:13.05–21:15.85 | 我跟它要求的是一个卖给你CFN的PBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-448.jpg) | SHOT-060, SHOT-061 |
| CUE-449 | 21:15.85–21:19.05 | 大家可以看到这样子也高效PBT来说的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-449.jpg) | SHOT-061, SHOT-062, SHOT-063, SHOT-064 |
| CUE-450 | 21:19.05–21:22.45 | 其实要求你反攻的是非常非常傻的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-450.jpg) | SHOT-064, SHOT-065 |
| CUE-451 | 21:22.45–21:28.25 | 而且我整个全套的工作流其实都是在你用嘴说这种完成的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-451.jpg) | SHOT-065, SHOT-066 |
| CUE-452 | 21:28.25–21:31.25 | 其实并没有去进行一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-452.jpg) | SHOT-066 |
| CUE-453 | 21:31.25–21:34.25 | 比如说就是不用很费劲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-453.jpg) | SHOT-066 |
| CUE-454 | 21:34.25–21:35.25 | 我飞机上我说一堆 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-454.jpg) | SHOT-066 |
| CUE-455 | 21:35.25–21:38.25 | 然后我下飞机的所东西都可以给老板的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-455.jpg) | SHOT-066 |
| CUE-456 | 21:38.25–21:41.25 | 是一个非常觉得大家时间的一个情况 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-456.jpg) | SHOT-066 |
| CUE-457 | 21:41.25–21:45.25 | 然后在可能时间一段时间我再補充两个手 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-457.jpg) | SHOT-066 |
| CUE-458 | 21:45.25–21:58.25 | 我觉得我们最成练也有些人可能会后来X和考核扣的全领导 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-458.jpg) | SHOT-066 |
| CUE-459 | 21:58.25–22:06.25 | 所以我建议我们都要 每一事情每个不同方法模型它说是不同的特畅的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-459.jpg) | SHOT-066, SHOT-067 |
| CUE-460 | 22:06.25–22:12.25 | 我今天给例子其实我公职建模来说对我们的投资来说是一个重要的工作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-460.jpg) | SHOT-067 |
| CUE-461 | 22:12.25–22:17.25 | 不说是一个很差的特畅的男伴不三天它出的不是模型是一个很差的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-461.jpg) | SHOT-067 |
| CUE-462 | 22:17.25–22:22.25 | 但是我放的考核X它是很密切我们推出来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-462.jpg) | SHOT-067 |
| CUE-463 | 22:22.25–22:25.25 | 这是我之前已经生成出来的模型 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-463.jpg) | SHOT-067, SHOT-068 |
| CUE-464 | 22:25.25–22:28.25 | 可以看到它各方面也就在要其实都做了很错的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-464.jpg) | SHOT-068 |
| CUE-465 | 22:28.25–22:35.25 | 也就是说明操核X它天生就会对天生就会对一个各方面是支持的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-465.jpg) | SHOT-068, SHOT-069 |
| CUE-466 | 22:35.25–22:37.25 | 所以这要大家吃出来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-466.jpg) | SHOT-069 |
| CUE-467 | 22:37.25–22:42.25 | 但是当你们在考核扣的一个模型上卡住的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-467.jpg) | SHOT-069 |
| CUE-468 | 22:42.25–22:47.25 | 然后你要立刻赶快先放另外一个后面X上去不要让你工作耽误 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-468.jpg) | SHOT-069 |
| CUE-469 | 22:47.25–22:50.25 | 然后最后一个再说了一个赶快再非常大的新加坡 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-469.jpg) | SHOT-069 |
| CUE-470 | 22:50.25–22:53.25 | 然后我本身是一个小公司国主的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-470.jpg) | SHOT-069, SHOT-070 |
| CUE-471 | 22:53.25–22:56.25 | 大家可以看到估计可能有人也看到过我的司机 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-471.jpg) | SHOT-070 |
| CUE-472 | 22:56.25–23:00.25 | 我说这个笔记的初衷其实就是因为我今天也在不要留学 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-472.jpg) | SHOT-070 |
| CUE-473 | 23:00.25–23:04.25 | 我觉得老外的那个老外的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-473.jpg) | SHOT-070 |
| CUE-474 | 23:04.25–23:07.25 | 就是他们在说长篮章的时候对话是要多的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-474.jpg) | SHOT-070 |
| CUE-475 | 23:07.25–23:09.25 | 其实不属于我进行的队传 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-475.jpg) | SHOT-070 |
| CUE-476 | 23:09.25–23:13.25 | 那其实我也是利用了一个这样子一个时刻一个功能板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-476.jpg) | SHOT-070 |
| CUE-477 | 23:13.25–23:16.25 | 然后我就会让它去经济属于突然 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-477.jpg) | SHOT-070 |
| CUE-478 | 23:16.25–23:18.25 | 所以是在我边学习的过程中 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-478.jpg) | SHOT-070 |
| CUE-479 | 23:18.25–23:21.25 | 我也可以进行一个分享 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-479.jpg) | SHOT-070 |
| CUE-480 | 23:21.25–23:22.25 | 就分享比来讲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-480.jpg) | SHOT-070 |
| CUE-481 | 23:22.25–23:25.25 | 对我的分享大概就是这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-481.jpg) | SHOT-070 |
| CUE-482 | 23:25.25–23:28.25 | 然后大家可以看一个什么问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-482.jpg) | SHOT-070 |
| CUE-483 | 23:28.25–23:29.25 | 挺好的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-483.jpg) | SHOT-070 |
| CUE-484 | 23:29.25–23:34.25 | 就是因为我CLOCK是跑在我电脑上的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-484.jpg) | SHOT-070 |
| CUE-485 | 23:34.25–23:37.25 | 所以我一般如果电脑和上了我就他就死了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-485.jpg) | SHOT-070 |
| CUE-486 | 23:37.25–23:39.25 | 就是你怎么确保他是一直在的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-486.jpg) | SHOT-070 |
| CUE-487 | 23:39.25–23:43.25 | 这个就是当然是那个当时那个我们从来没有从来没有 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-487.jpg) | SHOT-070 |
| CUE-488 | 23:43.25–23:45.25 | 从来没有从来没有是GP那边 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-488.jpg) | SHOT-070 |
| CUE-489 | 23:45.25–23:46.25 | 那边影响到什么时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-489.jpg) | SHOT-070 |
| CUE-490 | 23:46.25–23:47.25 | 那边影响到什么时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-490.jpg) | SHOT-070 |
| CUE-491 | 23:47.25–23:49.25 | 所以我所说的东西都是他是代跑的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-491.jpg) | SHOT-070 |
| CUE-492 | 23:49.25–23:52.25 | 那给明明他非常美的一家是要直观机 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-492.jpg) | SHOT-070 |
| CUE-493 | 23:52.25–23:55.25 | 我觉得而且中国网络有好处 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-493.jpg) | SHOT-070 |
| CUE-494 | 23:55.25–23:56.25 | 他是天生内网 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-494.jpg) | SHOT-070 |
| CUE-495 | 23:56.25–23:59.25 | 这个刚刚有同学分享的他在微片子上去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-495.jpg) | SHOT-070 |
| CUE-496 | 23:59.25–24:01.25 | 跑一个考试口试试不见一样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-496.jpg) | SHOT-070 |
| CUE-497 | 24:01.25–24:03.25 | 这个是风险还是表达的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-497.jpg) | SHOT-070 |
| CUE-498 | 24:03.25–24:05.25 | 那中国他天生内网就可以 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-498.jpg) | SHOT-070 |
| CUE-499 | 24:05.25–24:07.25 | 这就可以评议一些网络机 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-499.jpg) | SHOT-070 |
| CUE-500 | 24:07.25–24:10.25 | 然后我所有的门件我都是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-500.jpg) | SHOT-070 |
| CUE-501 | 24:10.25–24:13.25 | 那种不光转在我的手机还包括电脑 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-501.jpg) | SHOT-070 |
| CUE-502 | 24:13.25–24:14.25 | 因为发行率做重步的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-502.jpg) | SHOT-070 |
| CUE-503 | 24:14.25–24:17.25 | 所以说我觉得这个桌式都很满好的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-503.jpg) | SHOT-070 |
| CUE-504 | 24:17.25–24:18.25 | 有同事的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-504.jpg) | SHOT-070 |
| CUE-505 | 24:18.25–24:20.25 | 所以你的考试 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-505.jpg) | SHOT-070 |
| CUE-506 | 24:20.25–24:23.25 | 考试考试都是跑在MacMe你上的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-506.jpg) | SHOT-070 |
| CUE-507 | 24:23.25–24:24.25 | 对全都是的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-507.jpg) | SHOT-070 |
| CUE-508 | 24:24.25–24:28.25 | 比如说你AZN给你做了个PBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-508.jpg) | SHOT-070 |
| CUE-509 | 24:28.25–24:30.25 | 你在手机上能看吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-509.jpg) | SHOT-070 |
| CUE-510 | 24:30.25–24:32.25 | 那个PBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-510.jpg) | SHOT-070 |
| CUE-511 | 24:32.25–24:35.25 | 因为你在我的老师上看 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-511.jpg) | SHOT-070 |
| CUE-512 | 24:35.25–24:37.25 | 和我手机上看是一模一样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-512.jpg) | SHOT-070 |
| CUE-513 | 24:37.25–24:38.25 | 它都是太一模样的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-513.jpg) | SHOT-070 |
| CUE-514 | 24:38.25–24:39.25 | 我选择太一模一样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-514.jpg) | SHOT-070 |
| CUE-515 | 24:39.25–24:41.25 | 原因就是因为它超过的建议比较简单 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-515.jpg) | SHOT-070 |
| CUE-516 | 24:41.25–24:43.25 | 因为我们公司 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-516.jpg) | SHOT-070 |
| CUE-517 | 24:43.25–24:45.25 | 它不是用背后送给明明 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-517.jpg) | SHOT-070 |
| CUE-518 | 24:45.25–24:47.25 | 但明明我觉得它接种东西比较不够 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-518.jpg) | SHOT-070 |
| CUE-519 | 24:47.25–24:49.25 | 但飞速有点太慢了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-519.jpg) | SHOT-070 |
| CUE-520 | 24:49.25–24:51.25 | 所以我需要一个腿简单 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-520.jpg) | SHOT-070 |
| CUE-521 | 24:51.25–24:52.25 | 然后因为我最初结果了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-521.jpg) | SHOT-070 |
| CUE-522 | 24:52.25–24:53.25 | 然后我需要一个这样子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-522.jpg) | SHOT-070 |
| CUE-523 | 24:53.25–24:55.25 | 一个东西去让我来操作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-523.jpg) | SHOT-070 |
| CUE-524 | 24:56.25–24:59.25 | 我觉得这个是和爱情双白 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-524.jpg) | SHOT-070 |
| CUE-525 | 24:59.25–25:01.25 | 我说你刚才看markdown的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-525.jpg) | SHOT-070 |
| CUE-526 | 25:01.25–25:03.25 | reader是你自己做的吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-526.jpg) | SHOT-070 |
| CUE-527 | 25:03.25–25:05.25 | 对 这个其实很简单 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-527.jpg) | SHOT-070 |
| CUE-528 | 25:05.25–25:07.25 | 这个拿着这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-528.jpg) | SHOT-070 |
| CUE-529 | 25:07.25–25:08.25 | 你就随便去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-529.jpg) | SHOT-070 |
| CUE-530 | 25:08.25–25:10.25 | 去外面就可以了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-530.jpg) | SHOT-070 |
| CUE-531 | 25:10.25–25:15.25 | 现在外部东西都是非常方便的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-531.jpg) | SHOT-070 |
| CUE-532 | 25:15.25–25:17.25 | 然后因为它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-532.jpg) | SHOT-070 |
| CUE-533 | 25:17.25–25:19.25 | 比如说我刚刚这个是过来X的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-533.jpg) | SHOT-070 |
| CUE-534 | 25:19.25–25:20.25 | 然后我刚刚比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-534.jpg) | SHOT-070 |
| CUE-535 | 25:20.25–25:22.25 | 假设说用PBT生成的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-535.jpg) | SHOT-070 |
| CUE-536 | 25:22.25–25:25.25 | 可能不太--怎么做不太--不太性感的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-536.jpg) | SHOT-070 |
| CUE-537 | 25:25.25–25:28.25 | 这个之前就是拿了互凭而然的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-537.jpg) | SHOT-070 |
| CUE-538 | 25:28.25–25:31.25 | 就是你是掉到互合而然的风里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-538.jpg) | SHOT-070 |
| CUE-539 | 25:31.25–25:33.25 | 去生成了一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-539.jpg) | SHOT-070 |
| CUE-540 | 25:33.25–25:35.25 | 生成了另外一个PBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-540.jpg) | SHOT-070 |
| CUE-541 | 25:35.25–25:36.25 | 这是不够的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-541.jpg) | SHOT-070 |
| CUE-542 | 25:36.25–25:37.25 | 它互凭而然的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-542.jpg) | SHOT-070 |
| CUE-543 | 25:37.25–25:39.25 | 所有一切都是可以通过 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-543.jpg) | SHOT-070 |
| CUE-544 | 25:39.25–25:40.25 | 通过一嘴 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-544.jpg) | SHOT-070 |
| CUE-545 | 25:40.25–25:41.25 | 而去说起完成 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-545.jpg) | SHOT-070 |
| CUE-546 | 25:41.25–25:43.25 | 我的这个其实 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-546.jpg) | SHOT-070 |
| CUE-547 | 25:43.25–25:44.25 | 其实我自从开八我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-547.jpg) | SHOT-070 |
| CUE-548 | 25:44.25–25:45.25 | 就自己这个东西之后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-548.jpg) | SHOT-070 |
| CUE-549 | 25:45.25–25:47.25 | 我连扣的X的和那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-549.jpg) | SHOT-070 |
| CUE-550 | 25:47.25–25:49.25 | Club扣的我都很少打开了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-550.jpg) | SHOT-070 |
| CUE-551 | 25:49.25–25:51.25 | 因为我大部分工作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-551.jpg) | SHOT-070 |
| CUE-552 | 25:51.25–25:54.25 | 我都都直接弄着它说就可以 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-552.jpg) | SHOT-070 |
| CUE-553 | 25:54.25–25:55.25 | 我觉得非常便便 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-553.jpg) | SHOT-070 |
| CUE-554 | 25:55.25–25:57.25 | 因为一旦你习惯用嘴巴 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-554.jpg) | SHOT-070 |
| CUE-555 | 25:57.25–25:58.25 | 说起工作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-555.jpg) | SHOT-070 |
| CUE-556 | 25:58.25–26:00.25 | 你再也不会想 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-556.jpg) | SHOT-070 |
| CUE-557 | 26:00.25–26:02.25 | 来讲它一瞧瞧瞧瞧瞧瞧瞧瞧了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-557.jpg) | SHOT-070 |
| CUE-558 | 26:02.25–26:04.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-558.jpg) | SHOT-070 |
| CUE-559 | 26:04.25–26:06.25 | 你刚才说用Kimi做PBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-559.jpg) | SHOT-070 |
| CUE-560 | 26:06.25–26:08.25 | 那个是一个Skill吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-560.jpg) | SHOT-070 |
| CUE-561 | 26:08.25–26:09.25 | 这个Skill | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-561.jpg) | SHOT-070 |
| CUE-562 | 26:09.25–26:11.25 | 因为你可以看我刚刚那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-562.jpg) | SHOT-070 |
| CUE-563 | 26:11.25–26:13.25 | 给你展示的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-563.jpg) | SHOT-070 |
| CUE-564 | 26:13.25–26:15.25 | 等等等等 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-564.jpg) | SHOT-070 |
| CUE-565 | 26:15.25–26:16.25 | 对不起 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-565.jpg) | SHOT-070 |
| CUE-566 | 26:16.25–26:18.25 | 这是我生成了这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-566.jpg) | SHOT-070 |
| CUE-567 | 26:18.25–26:20.25 | 我生成了这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-567.jpg) | SHOT-070 |
| CUE-568 | 26:20.25–26:21.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-568.jpg) | SHOT-070 |
| CUE-569 | 26:21.25–26:23.25 | 然后我就直接跟我的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-569.jpg) | SHOT-070 |
| CUE-570 | 26:23.25–26:25.25 | 说生成KimiPBT | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-570.jpg) | SHOT-070 |
| CUE-571 | 26:25.25–26:26.25 | 然后迈吉丰格 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-571.jpg) | SHOT-070 |
| CUE-572 | 26:26.25–26:28.25 | 名业形象足够 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-572.jpg) | SHOT-070 |
| CUE-573 | 26:28.25–26:29.25 | 那这个时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-573.jpg) | SHOT-070 |
| CUE-574 | 26:29.25–26:30.25 | 我的Club | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-574.jpg) | SHOT-070 |
| CUE-575 | 26:30.25–26:32.25 | 它会主动去登Kimi | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-575.jpg) | SHOT-070 |
| CUE-576 | 26:32.25–26:34.25 | Kimi的那个网站 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-576.jpg) | SHOT-070 |
| CUE-577 | 26:34.25–26:36.25 | 然后它会基于我说的这个话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-577.jpg) | SHOT-070 |
| CUE-578 | 26:36.25–26:38.25 | 它会再进行一番加工 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-578.jpg) | SHOT-070 |
| CUE-579 | 26:38.25–26:41.25 | 因为它会对我进行二十加工的节目 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-579.jpg) | SHOT-070 |
| CUE-580 | 26:41.25–26:43.25 | 然后让然后输出一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-580.jpg) | SHOT-070 |
| CUE-581 | 26:43.25–26:45.25 | 老实说它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-581.jpg) | SHOT-070 |
| CUE-582 | 26:45.25–26:46.25 | 因为Kimi | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-582.jpg) | SHOT-070, SHOT-071, SHOT-072 |
| CUE-583 | 26:46.25–26:47.25 | 它是刚刚更新二点六 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-583.jpg) | SHOT-072 |
| CUE-584 | 26:47.25–26:50.25 | 它这个PBT出来结果也让我大十一斤 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-584.jpg) | SHOT-072, SHOT-073, SHOT-074, SHOT-075 |
| CUE-585 | 26:50.25–26:53.25 | 我觉得是非常可特地的情况 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-585.jpg) | SHOT-075 |
| CUE-586 | 26:53.25–26:54.25 | 它是去网站 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-586.jpg) | SHOT-075 |
| CUE-587 | 26:54.25–26:57.25 | 它不是掉CLA或者 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-587.jpg) | SHOT-075, SHOT-076 |
| CUE-588 | 26:57.25–26:58.25 | 不是不是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-588.jpg) | SHOT-076 |
| CUE-589 | 26:58.25–26:59.25 | 我觉得就是大家一屋 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-589.jpg) | SHOT-076 |
| CUE-590 | 26:59.25–27:01.25 | 我觉得现在大家都是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-590.jpg) | SHOT-076 |
| CUE-591 | 27:01.25–27:03.25 | 如果觉得它不掉CLA的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-591.jpg) | SHOT-076 |
| CUE-592 | 27:03.25–27:04.25 | 我就不想做 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-592.jpg) | SHOT-076 |
| CUE-593 | 27:04.25–27:05.25 | 但不是这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-593.jpg) | SHOT-076 |
| CUE-594 | 27:05.25–27:06.25 | 因为现在可以看到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-594.jpg) | SHOT-076 |
| CUE-595 | 27:06.25–27:08.25 | 从Alpha 4.7开始 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-595.jpg) | SHOT-076 |
| CUE-596 | 27:08.25–27:10.25 | 或者是后来X5.4开始 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-596.jpg) | SHOT-076 |
| CUE-597 | 27:10.25–27:12.25 | 它们特别喜欢用一旁就得用了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-597.jpg) | SHOT-076 |
| CUE-598 | 27:12.25–27:15.25 | 它对那个特别支持那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-598.jpg) | SHOT-076 |
| CUE-599 | 27:15.25–27:17.25 | 我觉得可能未来之后可能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-599.jpg) | SHOT-076 |
| CUE-600 | 27:17.25–27:18.25 | 外部规矩也好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-600.jpg) | SHOT-076 |
| CUE-601 | 27:18.25–27:20.25 | 大家也好可能备用一体 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-601.jpg) | SHOT-076 |
| CUE-602 | 27:20.25–27:22.25 | 因为它时间方式真的是特别的便宜 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-602.jpg) | SHOT-076 |
| CUE-603 | 27:22.25–27:23.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-603.jpg) | SHOT-076 |
| CUE-604 | 27:23.25–27:25.25 | 所以大家可以多城市板 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-604.jpg) | SHOT-076 |
| CUE-605 | 27:25.25–27:27.25 | 然后多把你的操作化成肌肉 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-605.jpg) | SHOT-076 |
| CUE-606 | 27:27.25–27:28.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-606.jpg) | SHOT-076 |
| CUE-607 | 27:28.25–27:29.25 | 很方便 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-607.jpg) | SHOT-076 |
| CUE-608 | 27:29.25–27:31.25 | 以后我觉得用嘴巴来进行工作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-608.jpg) | SHOT-076 |
| CUE-609 | 27:31.25–27:32.25 | 就完成了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-609.jpg) | SHOT-076 |
| CUE-610 | 27:32.25–27:34.25 | 这个是用Cloc自带的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-610.jpg) | SHOT-076 |
| CUE-611 | 27:34.25–27:35.25 | computer use | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-611.jpg) | SHOT-076 |
| CUE-612 | 27:35.25–27:36.25 | 什么还是用了什么 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-612.jpg) | SHOT-076 |
| CUE-613 | 27:36.25–27:38.25 | browser use的一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-613.jpg) | SHOT-076 |
| CUE-614 | 27:38.25–27:39.25 | 那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-614.jpg) | SHOT-076 |
| CUE-615 | 27:39.25–27:42.25 | 我是装的那个H&D browser | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-615.jpg) | SHOT-076 |
| CUE-616 | 27:42.25–27:45.25 | 它是对装一个H&D browser | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-616.jpg) | SHOT-076 |
| CUE-617 | 27:45.25–27:46.25 | 但是本质它也是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-617.jpg) | SHOT-076 |
| CUE-618 | 27:46.25–27:48.25 | 通过CLA我们的CTP | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-618.jpg) | SHOT-076 |
| CUE-619 | 27:48.25–27:50.25 | 它进行的不叫特别的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-619.jpg) | SHOT-076 |
| CUE-620 | 27:50.25–27:52.25 | 它其实是属于Cloc的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-620.jpg) | SHOT-076 |
| CUE-621 | 27:52.25–27:54.25 | 或者Cloc X它们自己的Hannis | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-621.jpg) | SHOT-076 |
| CUE-622 | 27:54.25–27:56.25 | 所以说我是比较喜欢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-622.jpg) | SHOT-076 |
| CUE-623 | 27:56.25–27:58.25 | 我觉得它其实要比过分CLA | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-623.jpg) | SHOT-076 |
| CUE-624 | 27:58.25–28:01.25 | 这种原地造人士要好很多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-624.jpg) | SHOT-076 |
| CUE-625 | 28:01.25–28:02.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-625.jpg) | SHOT-076 |
| CUE-626 | 28:02.25–28:04.25 | 其实现在这种方式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-626.jpg) | SHOT-076 |
| CUE-627 | 28:04.25–28:05.25 | 我觉得我们俩想法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-627.jpg) | SHOT-076 |
| CUE-628 | 28:05.25–28:06.25 | 可能是越来越一致的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-628.jpg) | SHOT-076 |
| CUE-629 | 28:06.25–28:07.25 | 对对对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-629.jpg) | SHOT-076 |
| CUE-630 | 28:07.25–28:09.25 | 我也是觉得它隆虾它也不靠谱了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-630.jpg) | SHOT-076 |
| CUE-631 | 28:09.25–28:10.25 | 因为我们投资工作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-631.jpg) | SHOT-076 |
| CUE-632 | 28:10.25–28:13.25 | 就是需要非常好的稳定性 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-632.jpg) | SHOT-076 |
| CUE-633 | 28:13.25–28:15.25 | 我之前顶了这种隆虾 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-633.jpg) | SHOT-076 |
| CUE-634 | 28:15.25–28:17.25 | 我去聊聊那个中期 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-634.jpg) | SHOT-076 |
| CUE-635 | 28:17.25–28:19.25 | 我不敢让它去帮我输土来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-635.jpg) | SHOT-076 |
| CUE-636 | 28:19.25–28:22.25 | 那我现在就这种活我会按下去输土 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-636.jpg) | SHOT-076 |
| CUE-637 | 28:22.25–28:24.25 | 有时候我都会跟老板说这种原来身材的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-637.jpg) | SHOT-076 |
| CUE-638 | 28:24.25–28:26.25 | 他们学习也很难以对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-638.jpg) | SHOT-076 |
| CUE-639 | 28:26.25–28:29.25 | 那你电脑上也会用Telibor | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-639.jpg) | SHOT-076 |
| CUE-640 | 28:29.25–28:30.25 | 跟他聊吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-640.jpg) | SHOT-076 |
| CUE-641 | 28:30.25–28:34.25 | 我电脑上很少的说实话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-641.jpg) | SHOT-076 |
| CUE-642 | 28:34.25–28:36.25 | 我基本都是在手上进行差不多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-642.jpg) | SHOT-076 |
| CUE-643 | 28:36.25–28:38.25 | 我电脑上的他这个帮我聊 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-643.jpg) | SHOT-076 |
| CUE-644 | 28:38.25–28:42.25 | 我基本上这个现在只是为了方便跟大家展示 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-644.jpg) | SHOT-076 |
| CUE-645 | 28:42.25–28:45.25 | 而且这个刚我看很多关注摸语的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-645.jpg) | SHOT-076 |
| CUE-646 | 28:45.25–28:48.25 | 那我这个就算是非常方便摸语了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-646.jpg) | SHOT-076 |
| CUE-647 | 28:48.25–28:50.25 | 然后一边老板按下去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-647.jpg) | SHOT-076 |
| CUE-648 | 28:50.25–28:52.25 | 我就直接不做干了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-648.jpg) | SHOT-076 |
| CUE-649 | 28:52.25–28:54.25 | 你变三步变干活 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-649.jpg) | SHOT-076 |
| CUE-650 | 28:54.25–28:55.25 | 对对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-650.jpg) | SHOT-076 |
| CUE-651 | 28:55.25–28:57.25 | 这个才是摸语神器 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-651.jpg) | SHOT-076 |
| CUE-652 | 28:57.25–28:59.25 | 然后我刚刚帮大家关注几个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-652.jpg) | SHOT-076 |
| CUE-653 | 28:59.25–29:02.25 | 我今天会让几个赛审 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-653.jpg) | SHOT-076 |
| CUE-654 | 29:02.25–29:06.25 | 有个叫BotBass形式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-654.jpg) | SHOT-076 |
| CUE-655 | 29:06.25–29:08.25 | 就是每个赛审它是一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-655.jpg) | SHOT-076 |
| CUE-656 | 29:08.25–29:11.25 | 就是怎么说做一个那个工作有办法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-656.jpg) | SHOT-076 |
| CUE-657 | 29:11.25–29:15.25 | 这个大家可以去Github这个页面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-657.jpg) | SHOT-076 |
| CUE-658 | 29:15.25–29:16.25 | 去自己慢慢研究吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-658.jpg) | SHOT-076 |
| CUE-659 | 29:16.25–29:18.25 | 但是我不想会把这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-659.jpg) | SHOT-076 |
| CUE-660 | 29:18.25–29:20.25 | 大家自己用的就好不用帮我宣传 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-660.jpg) | SHOT-076 |
| CUE-661 | 29:20.25–29:23.25 | 这个好多东西自己用的就好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-661.jpg) | SHOT-076 |
| CUE-662 | 29:23.25–29:24.25 | 对了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-662.jpg) | SHOT-076 |
| CUE-663 | 29:24.25–29:25.25 | 好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-663.jpg) | SHOT-076 |
| CUE-664 | 29:25.25–29:26.25 | 那先到这吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-664.jpg) | SHOT-076 |
| CUE-665 | 29:26.25–29:27.25 | 感谢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-665.jpg) | SHOT-076 |
| CUE-666 | 29:27.25–29:28.25 | 好 感谢感谢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-666.jpg) | SHOT-076 |
| CUE-667 | 29:28.25–29:31.25 | 好 那个现在最后一位Oliver | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-667.jpg) | SHOT-076, SHOT-077, SHOT-078 |
| CUE-668 | 29:31.25–29:32.25 | Hello 大家好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-668.jpg) | SHOT-078 |
| CUE-669 | 29:32.25–29:33.25 | 我是Oliver | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-669.jpg) | SHOT-078 |
| CUE-670 | 29:33.25–29:35.25 | 然后我是在湾区的一家 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-670.jpg) | SHOT-078 |
| CUE-671 | 29:35.25–29:38.25 | HRTech company | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-671.jpg) | SHOT-078 |
| CUE-672 | 29:38.25–29:41.25 | 做Data AI Engineer | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-672.jpg) | SHOT-078 |
| CUE-673 | 29:41.25–29:45.25 | 然后我本质工作是做Data Agent相关的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-673.jpg) | SHOT-078 |
| CUE-674 | 29:45.25–29:48.25 | 就给我我们公司内部做BIA Agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-674.jpg) | SHOT-078 |
| CUE-675 | 29:48.25–29:49.25 | 或者Data Agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-675.jpg) | SHOT-078 |
| CUE-676 | 29:49.25–29:51.25 | 然后做一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-676.jpg) | SHOT-078 |
| CUE-677 | 29:51.25–29:55.25 | Tax2SQL的一些事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-677.jpg) | SHOT-078 |
| CUE-678 | 29:55.25–29:57.25 | 但是我今天想分享的是两个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-678.jpg) | SHOT-078 |
| CUE-679 | 29:57.25–29:59.25 | 我自己的Uscase | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-679.jpg) | SHOT-078 |
| CUE-680 | 29:59.25–30:01.25 | 然后第一个这个是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-680.jpg) | SHOT-078 |
| CUE-681 | 30:01.25–30:03.25 | 我自己做的一个MCP | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-681.jpg) | SHOT-078 |
| CUE-682 | 30:03.25–30:06.25 | 然后这个东西其实就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-682.jpg) | SHOT-078 |
| CUE-683 | 30:06.25–30:09.25 | 连接本地的Markdown folder | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-683.jpg) | SHOT-078 |
| CUE-684 | 30:09.25–30:11.25 | 作为一个知识管理 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-684.jpg) | SHOT-078 |
| CUE-685 | 30:11.25–30:14.25 | 但是我自己对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-685.jpg) | SHOT-078 |
| CUE-686 | 30:14.25–30:16.25 | 知识管理的理解是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-686.jpg) | SHOT-078 |
| CUE-687 | 30:16.25–30:17.25 | 第一个就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-687.jpg) | SHOT-078 |
| CUE-688 | 30:17.25–30:20.25 | 我不想要有太多的摩擦力 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-688.jpg) | SHOT-078 |
| CUE-689 | 30:20.25–30:22.25 | 就是我本身大家也可以看到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-689.jpg) | SHOT-078 |
| CUE-690 | 30:22.25–30:25.25 | 我在Cloud里面会聊很多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-690.jpg) | SHOT-078 |
| CUE-691 | 30:25.25–30:27.25 | 不光是关于我工作相关 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-691.jpg) | SHOT-078 |
| CUE-692 | 30:27.25–30:29.25 | 或者说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-692.jpg) | SHOT-078 |
| CUE-693 | 30:29.25–30:32.25 | 知识相关可能会了解自己的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-693.jpg) | SHOT-078 |
| CUE-694 | 30:32.25–30:33.25 | 个人兴趣 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-694.jpg) | SHOT-078 |
| CUE-695 | 30:33.25–30:35.25 | 然后个人成长以及 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-695.jpg) | SHOT-078 |
| CUE-696 | 30:35.25–30:38.25 | 甚至我会问一些运动方面的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-696.jpg) | SHOT-078 |
| CUE-697 | 30:38.25–30:40.25 | 然后我在用的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-697.jpg) | SHOT-078 |
| CUE-698 | 30:40.25–30:42.25 | 我发现说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-698.jpg) | SHOT-078 |
| CUE-699 | 30:42.25–30:44.25 | 我需要切出去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-699.jpg) | SHOT-078 |
| CUE-700 | 30:44.25–30:47.25 | 用很多笔记软件去记录我的思考 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-700.jpg) | SHOT-078 |
| CUE-701 | 30:47.25–30:48.25 | 然后我就想说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-701.jpg) | SHOT-078 |
| CUE-702 | 30:48.25–30:50.25 | 怎么样把这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-702.jpg) | SHOT-078 |
| CUE-703 | 30:50.25–30:52.25 | 流程去尽可能的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-703.jpg) | SHOT-078 |
| CUE-704 | 30:52.25–30:53.25 | 把摩擦力检化 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-704.jpg) | SHOT-078 |
| CUE-705 | 30:53.25–30:54.25 | 然后另一方面是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-705.jpg) | SHOT-078 |
| CUE-706 | 30:54.25–30:56.25 | 我觉得说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-706.jpg) | SHOT-078 |
| CUE-707 | 30:56.25–30:58.25 | AI时代 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-707.jpg) | SHOT-078 |
| CUE-708 | 30:58.25–31:00.25 | 包括我们之前 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-708.jpg) | SHOT-078 |
| CUE-709 | 31:00.25–31:02.25 | 信息受入的方式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-709.jpg) | SHOT-078 |
| CUE-710 | 31:02.25–31:04.25 | 很多东西都不是自己的思考 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-710.jpg) | SHOT-078 |
| CUE-711 | 31:04.25–31:06.25 | 你可以看很多文章信息 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-711.jpg) | SHOT-078 |
| CUE-712 | 31:06.25–31:06.25 | 包括你会问 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-712.jpg) | SHOT-078 |
| CUE-713 | 31:06.25–31:08.25 | AI很多事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-713.jpg) | SHOT-078 |
| CUE-714 | 31:08.25–31:10.25 | 但是这些东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-714.jpg) | SHOT-078 |
| CUE-715 | 31:10.25–31:12.25 | 一个是你在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-715.jpg) | SHOT-078 |
| CUE-716 | 31:12.25–31:14.25 | Cloud里面去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-716.jpg) | SHOT-078 |
| CUE-717 | 31:14.25–31:15.25 | 说的很多对话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-717.jpg) | SHOT-078 |
| CUE-718 | 31:15.25–31:17.25 | 我是发现说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-718.jpg) | SHOT-078 |
| CUE-719 | 31:17.25–31:18.25 | 你很简单 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-719.jpg) | SHOT-078 |
| CUE-720 | 31:18.25–31:19.25 | 你很简单 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-720.jpg) | SHOT-078 |
| CUE-721 | 31:19.25–31:21.25 | 就可以搜索到你想要的内容 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-721.jpg) | SHOT-078 |
| CUE-722 | 31:21.25–31:23.25 | 就是我甚至开一个新的conversation | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-722.jpg) | SHOT-078 |
| CUE-723 | 31:23.25–31:25.25 | 去问Cloud说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-723.jpg) | SHOT-078 |
| CUE-724 | 31:25.25–31:27.25 | 我哪一天的一天跟你聊了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-724.jpg) | SHOT-078 |
| CUE-725 | 31:27.25–31:28.25 | 一个什么事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-725.jpg) | SHOT-078 |
| CUE-726 | 31:28.25–31:29.25 | 你能不能帮我找一下这个conversation | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-726.jpg) | SHOT-078 |
| CUE-727 | 31:29.25–31:30.25 | 它找的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-727.jpg) | SHOT-078 |
| CUE-728 | 31:30.25–31:32.25 | 甚至比它自己的搜索方法还要好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-728.jpg) | SHOT-078 |
| CUE-729 | 31:32.25–31:34.25 | 然后这个时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-729.jpg) | SHOT-078 |
| CUE-730 | 31:34.25–31:36.25 | 需要沉淀下来的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-730.jpg) | SHOT-078 |
| CUE-731 | 31:36.25–31:37.25 | 只用你自己的想法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-731.jpg) | SHOT-078 |
| CUE-732 | 31:37.25–31:38.25 | 就我拿这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-732.jpg) | SHOT-078 |
| CUE-733 | 31:38.25–31:40.25 | conversation举例子 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-733.jpg) | SHOT-078 |
| CUE-734 | 31:40.25–31:41.25 | 就比如说我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-734.jpg) | SHOT-078 |
| CUE-735 | 31:41.25–31:42.25 | 这个是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-735.jpg) | SHOT-078 |
| CUE-736 | 31:42.25–31:43.25 | 我在我们公司内部的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-736.jpg) | SHOT-078 |
| CUE-737 | 31:43.25–31:44.25 | Agen Harnet | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-737.jpg) | SHOT-078 |
| CUE-738 | 31:44.25–31:46.25 | 所以我看这篇文章 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-738.jpg) | SHOT-078 |
| CUE-739 | 31:46.25–31:48.25 | 然后这篇文章讲了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-739.jpg) | SHOT-078 |
| CUE-740 | 31:48.25–31:49.25 | 然后我看完以后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-740.jpg) | SHOT-078 |
| CUE-741 | 31:49.25–31:51.25 | 我问他一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-741.jpg) | SHOT-078 |
| CUE-742 | 31:51.25–31:53.25 | 关于这篇文章的分析理解 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-742.jpg) | SHOT-078 |
| CUE-743 | 31:53.25–31:55.25 | 然后我就用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-743.jpg) | SHOT-078 |
| CUE-744 | 31:55.25–31:57.25 | 语音转文字 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-744.jpg) | SHOT-078 |
| CUE-745 | 31:57.25–31:59.25 | 去跟他说了一些事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-745.jpg) | SHOT-078 |
| CUE-746 | 31:59.25–32:01.25 | 我自己的一些思考 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-746.jpg) | SHOT-078 |
| CUE-747 | 32:01.25–32:02.25 | 我跟他提到了之前 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-747.jpg) | SHOT-078 |
| CUE-748 | 32:02.25–32:03.25 | OPEN AI的一篇关于 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-748.jpg) | SHOT-078 |
| CUE-749 | 32:03.25–32:05.25 | Agen Harnet的文章 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-749.jpg) | SHOT-078 |
| CUE-750 | 32:05.25–32:07.25 | 然后他就给了我很多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-750.jpg) | SHOT-078 |
| CUE-751 | 32:07.25–32:08.25 | 音赛嘛 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-751.jpg) | SHOT-078 |
| CUE-752 | 32:08.25–32:09.25 | 然后这个时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-752.jpg) | SHOT-078 |
| CUE-753 | 32:09.25–32:10.25 | 我就 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-753.jpg) | SHOT-078 |
| CUE-754 | 32:10.25–32:12.25 | 我就跟他说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-754.jpg) | SHOT-078 |
| CUE-755 | 32:12.25–32:14.25 | Capture我这个Idiot | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-755.jpg) | SHOT-078 |
| CUE-756 | 32:14.25–32:15.25 | 然后他就 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-756.jpg) | SHOT-078 |
| CUE-757 | 32:15.25–32:17.25 | 用了我的这个MCP | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-757.jpg) | SHOT-078 |
| CUE-758 | 32:17.25–32:18.25 | 他先是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-758.jpg) | SHOT-078 |
| CUE-759 | 32:18.25–32:19.25 | 给了我一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-759.jpg) | SHOT-078 |
| CUE-760 | 32:19.25–32:21.25 | 音赛和标题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-760.jpg) | SHOT-078 |
| CUE-761 | 32:21.25–32:22.25 | 然后Cloud | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-761.jpg) | SHOT-078 |
| CUE-762 | 32:22.25–32:23.25 | 问我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-762.jpg) | SHOT-078 |
| CUE-763 | 32:23.25–32:24.25 | 这个内容 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-763.jpg) | SHOT-078 |
| CUE-764 | 32:24.25–32:25.25 | 是不是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-764.jpg) | SHOT-078 |
| CUE-765 | 32:25.25–32:26.25 | 他理解的对不对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-765.jpg) | SHOT-078 |
| CUE-766 | 32:26.25–32:27.25 | 我跟他说对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-766.jpg) | SHOT-078 |
| CUE-767 | 32:27.25–32:28.25 | 然后他就会 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-767.jpg) | SHOT-078 |
| CUE-768 | 32:28.25–32:29.25 | 帮我保存到本地 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-768.jpg) | SHOT-078 |
| CUE-769 | 32:29.25–32:31.25 | 其实就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-769.jpg) | SHOT-078 |
| CUE-770 | 32:31.25–32:32.25 | 一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-770.jpg) | SHOT-078 |
| CUE-771 | 32:32.25–32:34.25 | Mugdown file的一个文件系统 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-771.jpg) | SHOT-078 |
| CUE-772 | 32:34.25–32:36.25 | 然后这个时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-772.jpg) | SHOT-078 |
| CUE-773 | 32:36.25–32:37.25 | 你会发现 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-773.jpg) | SHOT-078 |
| CUE-774 | 32:37.25–32:39.25 | 说他说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-774.jpg) | SHOT-078 |
| CUE-775 | 32:39.25–32:40.25 | 这个Idiot | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-775.jpg) | SHOT-078 |
| CUE-776 | 32:40.25–32:41.25 | 跟我以前的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-776.jpg) | SHOT-078 |
| CUE-777 | 32:41.25–32:42.25 | 几个Idiot | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-777.jpg) | SHOT-078 |
| CUE-778 | 32:42.25–32:43.25 | 有很大的相关性 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-778.jpg) | SHOT-078 |
| CUE-779 | 32:43.25–32:44.25 | 他问我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-779.jpg) | SHOT-078 |
| CUE-780 | 32:44.25–32:45.25 | 要不要 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-780.jpg) | SHOT-078 |
| CUE-781 | 32:45.25–32:46.25 | 朋友成一篇文章 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-781.jpg) | SHOT-078 |
| CUE-782 | 32:46.25–32:47.25 | 或者说要不要分析一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-782.jpg) | SHOT-078 |
| CUE-783 | 32:47.25–32:48.25 | 我就跟他说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-783.jpg) | SHOT-078 |
| CUE-784 | 32:48.25–32:50.25 | 那你帮我分析一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-784.jpg) | SHOT-078 |
| CUE-785 | 32:50.25–32:51.25 | 我这个Idiot | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-785.jpg) | SHOT-078 |
| CUE-786 | 32:51.25–32:53.25 | 跟之前的三条什么关系 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-786.jpg) | SHOT-078 |
| CUE-787 | 32:53.25–32:54.25 | 然后他就会 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-787.jpg) | SHOT-078 |
| CUE-788 | 32:54.25–32:55.25 | 发现说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-788.jpg) | SHOT-078 |
| CUE-789 | 32:55.25–32:56.25 | 我可能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-789.jpg) | SHOT-078 |
| CUE-790 | 32:56.25–32:58.25 | 之前三月19号 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-790.jpg) | SHOT-078 |
| CUE-791 | 32:58.25–32:59.25 | 或者三月18号的想法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-791.jpg) | SHOT-078 |
| CUE-792 | 32:59.25–33:01.25 | 跟今天的有什么关系 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-792.jpg) | SHOT-078 |
| CUE-793 | 33:01.25–33:02.25 | 他会告诉我很多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-793.jpg) | SHOT-078 |
| CUE-794 | 33:02.25–33:03.25 | 比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-794.jpg) | SHOT-078 |
| CUE-795 | 33:03.25–33:05.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-795.jpg) | SHOT-078 |
| CUE-796 | 33:05.25–33:06.25 | 这些内容 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-796.jpg) | SHOT-078 |
| CUE-797 | 33:06.25–33:07.25 | 拉出时间走来看 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-797.jpg) | SHOT-078 |
| CUE-798 | 33:07.25–33:08.25 | 然后给我讲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-798.jpg) | SHOT-078 |
| CUE-799 | 33:08.25–33:09.25 | 讲说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-799.jpg) | SHOT-078 |
| CUE-800 | 33:09.25–33:10.25 | 你的这些Idiot | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-800.jpg) | SHOT-078 |
| CUE-801 | 33:10.25–33:11.25 | 之间的关联是什么 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-801.jpg) | SHOT-078 |
| CUE-802 | 33:11.25–33:13.25 | 然后这个时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-802.jpg) | SHOT-078 |
| CUE-803 | 33:13.25–33:14.25 | 我就可以说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-803.jpg) | SHOT-078 |
| CUE-804 | 33:14.25–33:15.25 | 帮我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-804.jpg) | SHOT-078 |
| CUE-805 | 33:15.25–33:16.25 | 蓬牧城一个笔记 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-805.jpg) | SHOT-078 |
| CUE-806 | 33:16.25–33:17.25 | 然后他就 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-806.jpg) | SHOT-078 |
| CUE-807 | 33:17.25–33:18.25 | 可以帮我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-807.jpg) | SHOT-078 |
| CUE-808 | 33:18.25–33:19.25 | 蓬牧城 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-808.jpg) | SHOT-078 |
| CUE-809 | 33:19.25–33:20.25 | 一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-809.jpg) | SHOT-078 |
| CUE-810 | 33:20.25–33:21.25 | 比较系统的话的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-810.jpg) | SHOT-078 |
| CUE-811 | 33:21.25–33:22.25 | 一个比较长的一个文章 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-811.jpg) | SHOT-078 |
| CUE-812 | 33:22.25–33:23.25 | 而且这些文章 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-812.jpg) | SHOT-078 |
| CUE-813 | 33:23.25–33:26.25 | 都是居于我自己的思考上面的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-813.jpg) | SHOT-078 |
| CUE-814 | 33:26.25–33:27.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-814.jpg) | SHOT-078 |
| CUE-815 | 33:27.25–33:28.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-815.jpg) | SHOT-078 |
| CUE-816 | 33:28.25–33:30.25 | 还有一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-816.jpg) | SHOT-078 |
| CUE-817 | 33:30.25–33:31.25 | 我还写了一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-817.jpg) | SHOT-078 |
| CUE-818 | 33:31.25–33:32.25 | 别的功能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-818.jpg) | SHOT-078 |
| CUE-819 | 33:32.25–33:33.25 | 比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-819.jpg) | SHOT-078 |
| CUE-820 | 33:33.25–33:34.25 | 用Cloud | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-820.jpg) | SHOT-078 |
| CUE-821 | 33:34.25–33:36.25 | Vigilization的方法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-821.jpg) | SHOT-078 |
| CUE-822 | 33:36.25–33:37.25 | 去看一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-822.jpg) | SHOT-078 |
| CUE-823 | 33:37.25–33:38.25 | 比如说你过去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-823.jpg) | SHOT-078 |
| CUE-824 | 33:38.25–33:40.25 | 三个月的思考 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-824.jpg) | SHOT-078 |
| CUE-825 | 33:40.25–33:41.25 | 就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-825.jpg) | SHOT-078 |
| CUE-826 | 33:41.25–33:43.25 | 关注点的转变之类的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-826.jpg) | SHOT-078 |
| CUE-827 | 33:43.25–33:44.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-827.jpg) | SHOT-078 |
| CUE-828 | 33:44.25–33:46.25 | 先分享的这些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-828.jpg) | SHOT-078 |
| CUE-829 | 33:46.25–33:47.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-829.jpg) | SHOT-078 |
| CUE-830 | 33:47.25–33:48.25 | 另外一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-830.jpg) | SHOT-078 |
| CUE-831 | 33:48.25–33:49.25 | 我想分享的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-831.jpg) | SHOT-078 |
| CUE-832 | 33:49.25–33:50.25 | 就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-832.jpg) | SHOT-078 |
| CUE-833 | 33:50.25–33:51.25 | 我自己 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-833.jpg) | SHOT-078, SHOT-079 |
| CUE-834 | 33:51.25–33:53.25 | 也是我自己在用的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-834.jpg) | SHOT-079 |
| CUE-835 | 33:53.25–33:54.25 | 一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-835.jpg) | SHOT-079 |
| CUE-836 | 33:54.25–33:55.25 | caremental | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-836.jpg) | SHOT-079 |
| CUE-837 | 33:55.25–33:56.25 | 就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-837.jpg) | SHOT-079 |
| CUE-838 | 33:56.25–33:58.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-838.jpg) | SHOT-079 |
| CUE-839 | 33:58.25–34:00.25 | 职场的一个mental | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-839.jpg) | SHOT-079 |
| CUE-840 | 34:00.25–34:01.25 | 但本质上 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-840.jpg) | SHOT-079 |
| CUE-841 | 34:01.25–34:02.25 | 其实就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-841.jpg) | SHOT-079 |
| CUE-842 | 34:02.25–34:04.25 | 一个非常 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-842.jpg) | SHOT-079 |
| CUE-843 | 34:04.25–34:06.25 | 非常小的一个memory系统 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-843.jpg) | SHOT-079 |
| CUE-844 | 34:06.25–34:08.25 | 加上 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-844.jpg) | SHOT-079 |
| CUE-845 | 34:08.25–34:10.25 | 自动去保存 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-845.jpg) | SHOT-079 |
| CUE-846 | 34:10.25–34:11.25 | 相关信息 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-846.jpg) | SHOT-079 |
| CUE-847 | 34:11.25–34:12.25 | 以及 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-847.jpg) | SHOT-079 |
| CUE-848 | 34:12.25–34:14.25 | 在cloud里面的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-848.jpg) | SHOT-079 |
| CUE-849 | 34:14.25–34:15.25 | cloudcode里面的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-849.jpg) | SHOT-079 |
| CUE-850 | 34:15.25–34:16.25 | 一个supagent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-850.jpg) | SHOT-079 |
| CUE-851 | 34:19.25–34:20.25 | 其实 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-851.jpg) | SHOT-079 |
| CUE-852 | 34:20.25–34:21.25 | memory系统的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-852.jpg) | SHOT-079 |
| CUE-853 | 34:21.25–34:23.25 | 其实我把它分成 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-853.jpg) | SHOT-079 |
| CUE-854 | 34:23.25–34:26.25 | behavior, event,和reaction | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-854.jpg) | SHOT-079 |
| CUE-855 | 34:26.25–34:28.25 | 就是我做了什么 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-855.jpg) | SHOT-079 |
| CUE-856 | 34:28.25–34:29.25 | 然后发生了什么事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-856.jpg) | SHOT-079 |
| CUE-857 | 34:29.25–34:30.25 | 以及我的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-857.jpg) | SHOT-079 |
| CUE-858 | 34:30.25–34:31.25 | 反应是什么 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-858.jpg) | SHOT-079 |
| CUE-859 | 34:31.25–34:32.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-859.jpg) | SHOT-079 |
| CUE-860 | 34:32.25–34:33.25 | 这些里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-860.jpg) | SHOT-079 |
| CUE-861 | 34:33.25–34:34.25 | 都有保存我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-861.jpg) | SHOT-079 |
| CUE-862 | 34:34.25–34:36.25 | 实际的 markdown文件 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-862.jpg) | SHOT-079 |
| CUE-863 | 34:36.25–34:37.25 | 就比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-863.jpg) | SHOT-079 |
| CUE-864 | 34:37.25–34:38.25 | 发生了些什么事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-864.jpg) | SHOT-079 |
| CUE-865 | 34:38.25–34:39.25 | 比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-865.jpg) | SHOT-079 |
| CUE-866 | 34:39.25–34:41.25 | 我有些万万 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-866.jpg) | SHOT-079 |
| CUE-867 | 34:41.25–34:43.25 | 跟我们公司 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-867.jpg) | SHOT-079 |
| CUE-868 | 34:43.25–34:46.25 | CTO的一些事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-868.jpg) | SHOT-079 |
| CUE-869 | 34:46.25–34:47.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-869.jpg) | SHOT-079 |
| CUE-870 | 34:47.25–34:49.25 | 我做了一些什么决策 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-870.jpg) | SHOT-079 |
| CUE-871 | 34:49.25–34:50.25 | 以及我有哪些反应 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-871.jpg) | SHOT-079 |
| CUE-872 | 34:50.25–34:51.25 | 比如说我是开心 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-872.jpg) | SHOT-079 |
| CUE-873 | 34:51.25–34:52.25 | 我是不开心 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-873.jpg) | SHOT-079 |
| CUE-874 | 34:52.25–34:53.25 | 或者说我觉得 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-874.jpg) | SHOT-079 |
| CUE-875 | 34:53.25–34:55.25 | 没有得到应有的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-875.jpg) | SHOT-079 |
| CUE-876 | 34:55.25–34:57.25 | 结果和奖励吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-876.jpg) | SHOT-079 |
| CUE-877 | 34:57.25–34:58.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-877.jpg) | SHOT-079 |
| CUE-878 | 34:58.25–34:59.25 | 这是整个系统 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-878.jpg) | SHOT-079 |
| CUE-879 | 34:59.25–35:00.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-879.jpg) | SHOT-079 |
| CUE-880 | 35:00.25–35:03.25 | 但是我还加了一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-880.jpg) | SHOT-079 |
| CUE-881 | 35:03.25–35:04.25 | 互可 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-881.jpg) | SHOT-079 |
| CUE-882 | 35:04.25–35:05.25 | 就是我会发现 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-882.jpg) | SHOT-079 |
| CUE-883 | 35:05.25–35:06.25 | 说如果 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-883.jpg) | SHOT-079 |
| CUE-884 | 35:06.25–35:07.25 | 把 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-884.jpg) | SHOT-079 |
| CUE-885 | 35:07.25–35:08.25 | 提醒 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-885.jpg) | SHOT-079 |
| CUE-886 | 35:08.25–35:09.25 | cloudcode | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-886.jpg) | SHOT-079 |
| CUE-887 | 35:09.25–35:10.25 | 去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-887.jpg) | SHOT-079 |
| CUE-888 | 35:10.25–35:11.25 | 更新我的这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-888.jpg) | SHOT-079 |
| CUE-889 | 35:11.25–35:12.25 | 文档的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-889.jpg) | SHOT-079 |
| CUE-890 | 35:12.25–35:13.25 | 它有可能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-890.jpg) | SHOT-079 |
| CUE-891 | 35:13.25–35:14.25 | 有的时候我会忘记 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-891.jpg) | SHOT-079 |
| CUE-892 | 35:14.25–35:15.25 | 所以我就 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-892.jpg) | SHOT-079 |
| CUE-893 | 35:15.25–35:16.25 | 稍微介进了一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-893.jpg) | SHOT-079 |
| CUE-894 | 35:16.25–35:19.25 | Hermes Asian | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-894.jpg) | SHOT-079 |
| CUE-895 | 35:19.25–35:20.25 | 它那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-895.jpg) | SHOT-079 |
| CUE-896 | 35:20.25–35:21.25 | self-scaled | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-896.jpg) | SHOT-079 |
| CUE-897 | 35:21.25–35:22.25 | 自我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-897.jpg) | SHOT-079 |
| CUE-898 | 35:22.25–35:23.25 | 叠待的一个方法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-898.jpg) | SHOT-079 |
| CUE-899 | 35:23.25–35:25.25 | 就是我加了一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-899.jpg) | SHOT-079 |
| CUE-900 | 35:25.25–35:26.25 | 每五轮对话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-900.jpg) | SHOT-079 |
| CUE-901 | 35:26.25–35:27.25 | 去提醒 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-901.jpg) | SHOT-079 |
| CUE-902 | 35:27.25–35:28.25 | cloudcode | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-902.jpg) | SHOT-079 |
| CUE-903 | 35:28.25–35:30.25 | 检查一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-903.jpg) | SHOT-079 |
| CUE-904 | 35:30.25–35:31.25 | 当前对话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-904.jpg) | SHOT-079 |
| CUE-905 | 35:31.25–35:32.25 | 有没有 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-905.jpg) | SHOT-079 |
| CUE-906 | 35:32.25–35:34.25 | 值得去记录的一些信息 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-906.jpg) | SHOT-079 |
| CUE-907 | 35:34.25–35:35.25 | 就是做成一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-907.jpg) | SHOT-079 |
| CUE-908 | 35:35.25–35:36.25 | cloudcode的一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-908.jpg) | SHOT-079 |
| CUE-909 | 35:36.25–35:38.25 | 互可吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-909.jpg) | SHOT-079 |
| CUE-910 | 35:38.25–35:40.25 | 然后在这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-910.jpg) | SHOT-079 |
| CUE-911 | 35:40.25–35:42.25 | 然后我还加了一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-911.jpg) | SHOT-079 |
| CUE-912 | 35:42.25–35:43.25 | sabezion | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-912.jpg) | SHOT-079 |
| CUE-913 | 35:43.25–35:44.25 | 因为sabezion的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-913.jpg) | SHOT-079 |
| CUE-914 | 35:44.25–35:45.25 | 我给sabezion | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-914.jpg) | SHOT-079 |
| CUE-915 | 35:45.25–35:47.25 | 一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-915.jpg) | SHOT-079 |
| CUE-916 | 35:47.25–35:49.25 | 以及我会提醒它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-916.jpg) | SHOT-079 |
| CUE-917 | 35:49.25–35:50.25 | 去拆查 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-917.jpg) | SHOT-079 |
| CUE-918 | 35:50.25–35:51.25 | 我过往所有的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-918.jpg) | SHOT-079 |
| CUE-919 | 35:51.25–35:52.25 | behavior | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-919.jpg) | SHOT-079 |
| CUE-920 | 35:52.25–35:53.25 | Events | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-920.jpg) | SHOT-079 |
| CUE-921 | 35:53.25–35:54.25 | 和reaction | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-921.jpg) | SHOT-079 |
| CUE-922 | 35:54.25–35:55.25 | 相关的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-922.jpg) | SHOT-079 |
| CUE-923 | 35:55.25–35:56.25 | 文件 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-923.jpg) | SHOT-079 |
| CUE-924 | 35:56.25–35:57.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-924.jpg) | SHOT-079 |
| CUE-925 | 35:57.25–35:59.25 | 再去回到我的问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-925.jpg) | SHOT-079 |
| CUE-926 | 35:59.25–36:00.25 | 然后这里的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-926.jpg) | SHOT-079 |
| CUE-927 | 36:00.25–36:02.25 | 就是我去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-927.jpg) | SHOT-079, SHOT-080 |
| CUE-928 | 36:02.25–36:03.25 | 我用我自己的系统 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-928.jpg) | SHOT-080 |
| CUE-929 | 36:03.25–36:05.25 | 然后在我自己的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-929.jpg) | SHOT-080 |
| CUE-930 | 36:05.25–36:06.25 | production的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-930.jpg) | SHOT-080 |
| CUE-931 | 36:06.25–36:07.25 | knowledgebase | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-931.jpg) | SHOT-080 |
| CUE-932 | 36:07.25–36:08.25 | 里面跑的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-932.jpg) | SHOT-080 |
| CUE-933 | 36:08.25–36:09.25 | 然后你会发现 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-933.jpg) | SHOT-080 |
| CUE-934 | 36:09.25–36:11.25 | 说到第五轮的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-934.jpg) | SHOT-080 |
| CUE-935 | 36:11.25–36:13.25 | 它会 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-935.jpg) | SHOT-080 |
| CUE-936 | 36:13.25–36:15.25 | 检测一下memory | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-936.jpg) | SHOT-080 |
| CUE-937 | 36:15.25–36:16.25 | 它会说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-937.jpg) | SHOT-080 |
| CUE-938 | 36:16.25–36:17.25 | 如果我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-938.jpg) | SHOT-080 |
| CUE-939 | 36:17.25–36:18.25 | 跟它说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-939.jpg) | SHOT-080 |
| CUE-940 | 36:18.25–36:18.25 | 确认要 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-940.jpg) | SHOT-080 |
| CUE-941 | 36:18.25–36:19.25 | 铁的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-941.jpg) | SHOT-080 |
| CUE-942 | 36:19.25–36:20.25 | 它会把这件事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-942.jpg) | SHOT-080 |
| CUE-943 | 36:20.25–36:21.25 | 记下来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-943.jpg) | SHOT-080 |
| CUE-944 | 36:21.25–36:22.25 | 然后这个是我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-944.jpg) | SHOT-080 |
| CUE-945 | 36:22.25–36:24.25 | 稍微虚购的一个事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-945.jpg) | SHOT-080 |
| CUE-946 | 36:24.25–36:26.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-946.jpg) | SHOT-080 |
| CUE-947 | 36:26.25–36:28.25 | 另外一个是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-947.jpg) | SHOT-080 |
| CUE-948 | 36:28.25–36:31.25 | mental agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-948.jpg) | SHOT-080 |
| CUE-949 | 36:31.25–36:32.25 | 就是因为它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-949.jpg) | SHOT-080 |
| CUE-950 | 36:32.25–36:33.25 | 跑的时间 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-950.jpg) | SHOT-080 |
| CUE-951 | 36:33.25–36:34.25 | 相对来说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-951.jpg) | SHOT-080 |
| CUE-952 | 36:34.25–36:35.25 | 9一点 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-952.jpg) | SHOT-080 |
| CUE-953 | 36:35.25–36:36.25 | 然后稍微比较慢 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-953.jpg) | SHOT-080 |
| CUE-954 | 36:36.25–36:37.25 | 所以一般来说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-954.jpg) | SHOT-080 |
| CUE-955 | 36:37.25–36:38.25 | 我有的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-955.jpg) | SHOT-080 |
| CUE-956 | 36:38.25–36:38.25 | 一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-956.jpg) | SHOT-080 |
| CUE-957 | 36:38.25–36:39.25 | reaction | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-957.jpg) | SHOT-080 |
| CUE-958 | 36:39.25–36:40.25 | 关的问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-958.jpg) | SHOT-080 |
| CUE-959 | 36:40.25–36:41.25 | 或者一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-959.jpg) | SHOT-080 |
| CUE-960 | 36:41.25–36:42.25 | 办公室 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-960.jpg) | SHOT-080 |
| CUE-961 | 36:42.25–36:43.25 | 政治一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-961.jpg) | SHOT-080 |
| CUE-962 | 36:43.25–36:44.25 | 一些事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-962.jpg) | SHOT-080 |
| CUE-963 | 36:44.25–36:45.25 | 我就会用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-963.jpg) | SHOT-080 |
| CUE-964 | 36:45.25–36:47.25 | 不会开mental agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-964.jpg) | SHOT-080 |
| CUE-965 | 36:47.25–36:48.25 | 但是有一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-965.jpg) | SHOT-080 |
| CUE-966 | 36:48.25–36:49.25 | 比如说我在这里 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-966.jpg) | SHOT-080 |
| CUE-967 | 36:49.25–36:50.25 | 跟它说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-967.jpg) | SHOT-080 |
| CUE-968 | 36:50.25–36:51.25 | 假如说我要 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-968.jpg) | SHOT-080 |
| CUE-969 | 36:51.25–36:52.25 | 跳槽 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-969.jpg) | SHOT-080 |
| CUE-970 | 36:52.25–36:53.25 | 或者说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-970.jpg) | SHOT-080 |
| CUE-971 | 36:53.25–36:55.25 | 一些重大的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-971.jpg) | SHOT-080 |
| CUE-972 | 36:55.25–36:57.25 | 我会把这个mental agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-972.jpg) | SHOT-080 |
| CUE-973 | 36:57.25–36:58.25 | 靠出来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-973.jpg) | SHOT-080 |
| CUE-974 | 36:58.25–36:59.25 | 靠出来以后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-974.jpg) | SHOT-080 |
| CUE-975 | 36:59.25–37:00.25 | 首先 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-975.jpg) | SHOT-080 |
| CUE-976 | 37:00.25–37:02.25 | 我觉得它的好出事 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-976.jpg) | SHOT-080 |
| CUE-977 | 37:02.25–37:04.25 | 它不会被我在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-977.jpg) | SHOT-080 |
| CUE-978 | 37:04.25–37:06.25 | clocote session | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-978.jpg) | SHOT-080 |
| CUE-979 | 37:06.25–37:08.25 | 聊天的上下文 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-979.jpg) | SHOT-080 |
| CUE-980 | 37:08.25–37:09.25 | 无然 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-980.jpg) | SHOT-080 |
| CUE-981 | 37:09.25–37:10.25 | 有的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-981.jpg) | SHOT-080 |
| CUE-982 | 37:10.25–37:12.25 | 你会发现你跟cloc聊太多 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-982.jpg) | SHOT-080 |
| CUE-983 | 37:12.25–37:14.25 | 它有可能你的心情很 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-983.jpg) | SHOT-080 |
| CUE-984 | 37:14.25–37:16.25 | 荡或者很举上的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-984.jpg) | SHOT-080 |
| CUE-985 | 37:16.25–37:17.25 | 它会心向于 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-985.jpg) | SHOT-080 |
| CUE-986 | 37:17.25–37:18.25 | 更安慰你 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-986.jpg) | SHOT-080 |
| CUE-987 | 37:18.25–37:19.25 | 或者说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-987.jpg) | SHOT-080 |
| CUE-988 | 37:19.25–37:20.25 | 它会觉得你做的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-988.jpg) | SHOT-080 |
| CUE-989 | 37:20.25–37:21.25 | 是对的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-989.jpg) | SHOT-080 |
| CUE-990 | 37:21.25–37:22.25 | 但是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-990.jpg) | SHOT-080 |
| CUE-991 | 37:22.25–37:23.25 | 如果你靠一个 sub agent | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-991.jpg) | SHOT-080 |
| CUE-992 | 37:23.25–37:25.25 | 你把单独隔离出来的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-992.jpg) | SHOT-080 |
| CUE-993 | 37:25.25–37:26.25 | memory和context | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-993.jpg) | SHOT-080 |
| CUE-994 | 37:26.25–37:27.25 | 给它的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-994.jpg) | SHOT-080 |
| CUE-995 | 37:27.25–37:28.25 | 它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-995.jpg) | SHOT-080 |
| CUE-996 | 37:28.25–37:29.25 | 更心向于 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-996.jpg) | SHOT-080 |
| CUE-997 | 37:29.25–37:30.25 | 做它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-997.jpg) | SHOT-080 |
| CUE-998 | 37:30.25–37:31.25 | 给你 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-998.jpg) | SHOT-080 |
| CUE-999 | 37:31.25–37:33.25 | 它觉得对的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-999.jpg) | SHOT-080 |
| CUE-1000 | 37:33.25–37:35.25 | 建议 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1000.jpg) | SHOT-080 |
| CUE-1001 | 37:35.25–37:36.25 | 然后像这个的话 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1001.jpg) | SHOT-080 |
| CUE-1002 | 37:36.25–37:37.25 | 它就会 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1002.jpg) | SHOT-080 |
| CUE-1003 | 37:37.25–37:38.25 | 基本上跟我说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1003.jpg) | SHOT-080 |
| CUE-1004 | 37:38.25–37:39.25 | 它觉得 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1004.jpg) | SHOT-080 |
| CUE-1005 | 37:39.25–37:40.25 | 我不应该去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1005.jpg) | SHOT-080 |
| CUE-1006 | 37:40.25–37:41.25 | 然后之类的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1006.jpg) | SHOT-080 |
| CUE-1007 | 37:41.25–37:42.25 | 之类的一些事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1007.jpg) | SHOT-080 |
| CUE-1008 | 37:45.25–37:46.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1008.jpg) | SHOT-080 |
| CUE-1009 | 37:46.25–37:47.25 | 这就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1009.jpg) | SHOT-080 |
| CUE-1010 | 37:47.25–37:48.25 | 我大概分享来 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1010.jpg) | SHOT-080 |
| CUE-1011 | 37:49.25–37:50.25 | 很有意思 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1011.jpg) | SHOT-080 |
| CUE-1012 | 37:50.25–37:51.25 | 你刚才说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1012.jpg) | SHOT-080 |
| CUE-1013 | 37:51.25–37:52.25 | 那个可视化的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1013.jpg) | SHOT-080 |
| CUE-1014 | 37:52.25–37:54.25 | 能开一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1014.jpg) | SHOT-080 |
| CUE-1015 | 37:54.25–37:55.25 | 就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1015.jpg) | SHOT-080 |
| CUE-1016 | 37:55.25–37:57.25 | cloc里面那个可视化 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1016.jpg) | SHOT-080 |
| CUE-1017 | 37:57.25–37:58.25 | 可视化 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1017.jpg) | SHOT-080 |
| CUE-1018 | 37:58.25–38:00.25 | 打开这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1018.jpg) | SHOT-080 |
| CUE-1019 | 38:00.25–38:01.25 | 找一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1019.jpg) | SHOT-080 |
| CUE-1020 | 38:01.25–38:03.25 | 我可以开一下我的这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1020.jpg) | SHOT-080, SHOT-081 |
| CUE-1021 | 38:07.25–38:09.25 | 然后你这个report也是开远了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1021.jpg) | SHOT-082 |
| CUE-1022 | 38:09.25–38:10.25 | 是吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1022.jpg) | SHOT-082 |
| CUE-1023 | 38:10.25–38:11.25 | 对对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1023.jpg) | SHOT-082 |
| CUE-1024 | 38:11.25–38:12.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1024.jpg) | SHOT-082 |
| CUE-1025 | 38:12.25–38:13.25 | 可视化 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1025.jpg) | SHOT-082 |
| CUE-1026 | 38:13.25–38:14.25 | 我可能 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1026.jpg) | SHOT-082 |
| CUE-1027 | 38:14.25–38:16.25 | 来找得到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1027.jpg) | SHOT-082, SHOT-083 |
| CUE-1028 | 38:18.25–38:20.25 | 但是我可以稍微讲一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1028.jpg) | SHOT-083 |
| CUE-1029 | 38:20.25–38:21.25 | 就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1029.jpg) | SHOT-083 |
| CUE-1030 | 38:21.25–38:22.25 | 基本上是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1030.jpg) | SHOT-083 |
| CUE-1031 | 38:22.25–38:23.25 | 用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1031.jpg) | SHOT-083 |
| CUE-1032 | 38:23.25–38:24.25 | cloc | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1032.jpg) | SHOT-083 |
| CUE-1033 | 38:24.25–38:25.25 | cloc | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1033.jpg) | SHOT-083 |
| CUE-1034 | 38:25.25–38:26.25 | 它的那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1034.jpg) | SHOT-083 |
| CUE-1035 | 38:26.25–38:27.25 | visualization | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1035.jpg) | SHOT-083 |
| CUE-1036 | 38:27.25–38:28.25 | 的方法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1036.jpg) | SHOT-083 |
| CUE-1037 | 38:28.25–38:29.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1037.jpg) | SHOT-083 |
| CUE-1038 | 38:29.25–38:30.25 | 去用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1038.jpg) | SHOT-083 |
| CUE-1039 | 38:30.25–38:31.25 | prom的形式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1039.jpg) | SHOT-083 |
| CUE-1040 | 38:31.25–38:32.25 | 给它相对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1040.jpg) | SHOT-083 |
| CUE-1041 | 38:32.25–38:33.25 | 规定一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1041.jpg) | SHOT-083 |
| CUE-1042 | 38:33.25–38:35.25 | 你大概要展示一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1042.jpg) | SHOT-083 |
| CUE-1043 | 38:35.25–38:36.25 | 什么样的内容 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1043.jpg) | SHOT-083 |
| CUE-1044 | 38:36.25–38:38.25 | 然后你就可以看到 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1044.jpg) | SHOT-083 |
| CUE-1045 | 38:38.25–38:39.25 | 像 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1045.jpg) | SHOT-083 |
| CUE-1046 | 38:39.25–38:40.25 | 比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1046.jpg) | SHOT-083 |
| CUE-1047 | 38:40.25–38:41.25 | obsidian的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1047.jpg) | SHOT-083, SHOT-084 |
| CUE-1048 | 38:41.25–38:42.25 | knowledge graph | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1048.jpg) | SHOT-084 |
| CUE-1049 | 38:42.25–38:43.25 | 里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1049.jpg) | SHOT-084, SHOT-085 |
| CUE-1050 | 38:43.25–38:44.25 | 的一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1050.jpg) | SHOT-085 |
| CUE-1051 | 38:44.25–38:45.25 | 类似的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1051.jpg) | SHOT-085 |
| CUE-1052 | 38:45.25–38:46.25 | 但是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1052.jpg) | SHOT-085 |
| CUE-1053 | 38:46.25–38:47.25 | 比如说你如果 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1053.jpg) | SHOT-085 |
| CUE-1054 | 38:47.25–38:48.25 | 跟它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1054.jpg) | SHOT-085 |
| CUE-1055 | 38:48.25–38:49.25 | 去确定 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1055.jpg) | SHOT-085 |
| CUE-1056 | 38:49.25–38:50.25 | 比如说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1056.jpg) | SHOT-085 |
| CUE-1057 | 38:50.25–38:51.25 | 我就想知道 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1057.jpg) | SHOT-085 |
| CUE-1058 | 38:51.25–38:52.25 | 我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1058.jpg) | SHOT-085 |
| CUE-1059 | 38:52.25–38:53.25 | 知识点A和 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1059.jpg) | SHOT-085 |
| CUE-1060 | 38:53.25–38:54.25 | 知识点B的关系 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1060.jpg) | SHOT-085 |
| CUE-1061 | 38:54.25–38:55.25 | 它会 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1061.jpg) | SHOT-085 |
| CUE-1062 | 38:55.25–38:56.25 | 给你把A和B | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1062.jpg) | SHOT-085 |
| CUE-1063 | 38:56.25–38:57.25 | 高量出来这样 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1063.jpg) | SHOT-085 |
| CUE-1064 | 38:58.25–38:59.25 | 嗯 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1064.jpg) | SHOT-086 |
| CUE-1065 | 38:59.25–39:00.25 | 就它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1065.jpg) | SHOT-086 |
| CUE-1066 | 39:00.25–39:02.25 | Chart里之代的那个 visualization | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1066.jpg) | SHOT-086 |
| CUE-1067 | 39:02.25–39:03.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1067.jpg) | SHOT-086 |
| CUE-1068 | 39:03.25–39:04.25 | 然后我是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1068.jpg) | SHOT-086 |
| CUE-1069 | 39:04.25–39:05.25 | 把 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1069.jpg) | SHOT-086 |
| CUE-1070 | 39:05.25–39:06.25 | 藤 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1070.jpg) | SHOT-086 |
| CUE-1071 | 39:06.25–39:07.25 | infunding | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1071.jpg) | SHOT-086 |
| CUE-1072 | 39:07.25–39:08.25 | 到mcp里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1072.jpg) | SHOT-086 |
| CUE-1073 | 39:08.25–39:09.25 | 所以它在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1073.jpg) | SHOT-086 |
| CUE-1074 | 39:09.25–39:10.25 | 听到我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1074.jpg) | SHOT-086 |
| CUE-1075 | 39:10.25–39:11.25 | 说帮我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1075.jpg) | SHOT-086 |
| CUE-1076 | 39:11.25–39:12.25 | 可是话或者说 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1076.jpg) | SHOT-086 |
| CUE-1077 | 39:12.25–39:13.25 | 帮我看一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1077.jpg) | SHOT-086 |
| CUE-1078 | 39:13.25–39:15.25 | 过去三个月的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1078.jpg) | SHOT-086 |
| CUE-1079 | 39:15.25–39:17.25 | Focus的转变的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1079.jpg) | SHOT-086 |
| CUE-1080 | 39:17.25–39:18.25 | 它就会自己去 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1080.jpg) | SHOT-086 |
| CUE-1081 | 39:18.25–39:20.25 | 画相关的图 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1081.jpg) | SHOT-086 |
| CUE-1082 | 39:20.25–39:21.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1082.jpg) | SHOT-086 |
| CUE-1083 | 39:21.25–39:22.25 | 挺好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1083.jpg) | SHOT-086 |
| CUE-1084 | 39:22.25–39:23.25 | 我也有这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1084.jpg) | SHOT-086 |
| CUE-1085 | 39:23.25–39:24.25 | 通点就是跟cloc | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1085.jpg) | SHOT-086 |
| CUE-1086 | 39:24.25–39:25.25 | 的聊了很多的东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1086.jpg) | SHOT-086 |
| CUE-1087 | 39:25.25–39:26.25 | 都没有流存 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1087.jpg) | SHOT-086 |
| CUE-1088 | 39:26.25–39:27.25 | 因为这些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1088.jpg) | SHOT-086 |
| CUE-1089 | 39:27.25–39:28.25 | 聊天记录 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1089.jpg) | SHOT-086 |
| CUE-1090 | 39:28.25–39:29.25 | 都是属于模型公司的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1090.jpg) | SHOT-086 |
| CUE-1091 | 39:29.25–39:31.25 | 不属于自己 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1091.jpg) | SHOT-086 |
| CUE-1092 | 39:31.25–39:32.25 | 但有的时候 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1092.jpg) | SHOT-086 |
| CUE-1093 | 39:32.25–39:35.25 | 我又觉得 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1093.jpg) | SHOT-086 |
| CUE-1094 | 39:35.25–39:37.25 | 用API太贵了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1094.jpg) | SHOT-086 |
| CUE-1095 | 39:37.25–39:38.25 | 嗯 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1095.jpg) | SHOT-086 |
| CUE-1096 | 39:39.25–39:41.25 | 所以 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1096.jpg) | SHOT-086 |
| CUE-1097 | 39:41.25–39:42.25 | 你在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1097.jpg) | SHOT-086 |
| CUE-1098 | 39:42.25–39:43.25 | 就是cloc | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1098.jpg) | SHOT-086 |
| CUE-1099 | 39:43.25–39:44.25 | 的里是用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1099.jpg) | SHOT-086 |
| CUE-1100 | 39:44.25–39:45.25 | hook 实现 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1100.jpg) | SHOT-086 |
| CUE-1101 | 39:45.25–39:46.25 | 然后在cloc的里 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1101.jpg) | SHOT-086 |
| CUE-1102 | 39:46.25–39:47.25 | 是用mcp实现 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1102.jpg) | SHOT-086 |
| CUE-1103 | 39:47.25–39:48.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1103.jpg) | SHOT-086 |
| CUE-1104 | 39:48.25–39:51.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1104.jpg) | SHOT-086 |
| CUE-1105 | 39:51.25–39:52.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1105.jpg) | SHOT-086 |
| CUE-1106 | 39:52.25–39:53.25 | 能把你那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1106.jpg) | SHOT-086 |
| CUE-1107 | 39:53.25–39:54.25 | report 链接 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1107.jpg) | SHOT-086 |
| CUE-1108 | 39:54.25–39:55.25 | 发到这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1108.jpg) | SHOT-086 |
| CUE-1109 | 39:55.25–39:56.25 | 聊天里吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1109.jpg) | SHOT-086 |
| CUE-1110 | 39:56.25–39:57.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1110.jpg) | SHOT-086 |
| CUE-1111 | 39:57.25–39:59.25 | 看到大家 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1111.jpg) | SHOT-086 |
| CUE-1112 | 39:59.25–40:01.25 | 还有什么问题吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1112.jpg) | SHOT-086, SHOT-087 |
| CUE-1113 | 40:01.25–40:02.25 | 嗯 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1113.jpg) | SHOT-087 |
| CUE-1114 | 40:02.25–40:04.25 | 最后一位嘉宾了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1114.jpg) | SHOT-087 |
| CUE-1115 | 40:04.25–40:06.25 | 你刚才的那些markdown | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1115.jpg) | SHOT-087 |
| CUE-1116 | 40:06.25–40:07.25 | 它是怎么 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1116.jpg) | SHOT-087 |
| CUE-1117 | 40:07.25–40:07.25 | 比如说你 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1117.jpg) | SHOT-087 |
| CUE-1118 | 40:07.25–40:08.25 | 跟人聊的东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1118.jpg) | SHOT-087 |
| CUE-1119 | 40:08.25–40:09.25 | 是你败处 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1119.jpg) | SHOT-087 |
| CUE-1120 | 40:09.25–40:10.25 | 竹子搞要给它吗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1120.jpg) | SHOT-087 |
| CUE-1121 | 40:10.25–40:11.25 | 然后它放在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1121.jpg) | SHOT-087 |
| CUE-1122 | 40:11.25–40:13.25 | markdown里 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1122.jpg) | SHOT-087 |
| CUE-1123 | 40:13.25–40:14.25 | 冷起动事 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1123.jpg) | SHOT-087, SHOT-088 |
| CUE-1124 | 40:14.25–40:15.25 | 我本来在cloc里面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1124.jpg) | SHOT-088 |
| CUE-1125 | 40:15.25–40:16.25 | 就有一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1125.jpg) | SHOT-088 |
| CUE-1126 | 40:16.25–40:18.25 | 非常长的conversation | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1126.jpg) | SHOT-088 |
| CUE-1127 | 40:18.25–40:20.25 | 是关于这个方面的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1127.jpg) | SHOT-088 |
| CUE-1128 | 40:20.25–40:21.25 | 但是我又给我 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1128.jpg) | SHOT-088 |
| CUE-1129 | 40:21.25–40:22.25 | 朋友做了一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1129.jpg) | SHOT-088 |
| CUE-1130 | 40:22.25–40:23.25 | onboarding的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1130.jpg) | SHOT-088 |
| CUE-1131 | 40:23.25–40:25.25 | 小的feature | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1131.jpg) | SHOT-088 |
| CUE-1132 | 40:25.25–40:26.25 | 就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1132.jpg) | SHOT-088 |
| CUE-1133 | 40:26.25–40:28.25 | 大概会先问 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1133.jpg) | SHOT-088 |
| CUE-1134 | 40:28.25–40:29.25 | 四个大的方面 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1134.jpg) | SHOT-088 |
| CUE-1135 | 40:29.25–40:30.25 | 关于职业方面的问题 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1135.jpg) | SHOT-088 |
| CUE-1136 | 40:30.25–40:31.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1136.jpg) | SHOT-088 |
| CUE-1137 | 40:31.25–40:33.25 | 从这四个问题中间 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1137.jpg) | SHOT-088 |
| CUE-1138 | 40:33.25–40:35.25 | 会让cloc的自己 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1138.jpg) | SHOT-088 |
| CUE-1139 | 40:35.25–40:35.25 | 去发散 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1139.jpg) | SHOT-088 |
| CUE-1140 | 40:35.25–40:37.25 | 问一些细节的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1140.jpg) | SHOT-088 |
| CUE-1141 | 40:37.25–40:38.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1141.jpg) | SHOT-088 |
| CUE-1142 | 40:38.25–40:39.25 | 就会先帮他们 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1142.jpg) | SHOT-088 |
| CUE-1143 | 40:39.25–40:40.25 | 生成一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1143.jpg) | SHOT-088 |
| CUE-1144 | 40:40.25–40:42.25 | 职业相关的数据库 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1144.jpg) | SHOT-088 |
| CUE-1145 | 40:42.25–40:45.25 | 然后刚才说你 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1145.jpg) | SHOT-088, SHOT-089 |
| CUE-1146 | 40:45.25–40:47.25 | 情绪反映这些东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1146.jpg) | SHOT-089 |
| CUE-1147 | 40:47.25–40:49.25 | 它是怎么记录的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1147.jpg) | SHOT-089 |
| CUE-1148 | 40:49.25–40:51.25 | 那我有一个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1148.jpg) | SHOT-089, SHOT-090 |
| CUE-1149 | 40:51.25–40:52.25 | 本身上就是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1149.jpg) | SHOT-090 |
| CUE-1150 | 40:52.25–40:54.25 | 给cloc的一个promp | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1150.jpg) | SHOT-090 |
| CUE-1151 | 40:54.25–40:56.25 | 然后让它 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1151.jpg) | SHOT-090 |
| CUE-1152 | 40:56.25–40:58.25 | 什么样的数据 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1152.jpg) | SHOT-090 |
| CUE-1153 | 40:58.25–41:00.25 | 给它分类成reaction | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1153.jpg) | SHOT-090 |
| CUE-1154 | 41:00.25–41:01.25 | 然后什么样的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1154.jpg) | SHOT-090 |
| CUE-1155 | 41:01.25–41:03.25 | 数据分类成 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1155.jpg) | SHOT-090 |
| CUE-1156 | 41:03.25–41:05.25 | 实际发生的事情 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1156.jpg) | SHOT-090 |
| CUE-1157 | 41:05.25–41:06.25 | 就是靠你 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1157.jpg) | SHOT-090 |
| CUE-1158 | 41:06.25–41:07.25 | 跟它的聊的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1158.jpg) | SHOT-090 |
| CUE-1159 | 41:07.25–41:08.25 | 是吧 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1159.jpg) | SHOT-090, SHOT-091 |
| CUE-1160 | 41:08.25–41:10.25 | 它通过你聊的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1160.jpg) | SHOT-091 |
| CUE-1161 | 41:10.25–41:12.25 | transcript判断 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1161.jpg) | SHOT-091 |
| CUE-1162 | 41:12.25–41:13.25 | 对了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1162.jpg) | SHOT-091 |
| CUE-1163 | 41:13.25–41:15.25 | ok | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1163.jpg) | SHOT-091 |
| CUE-1164 | 41:15.25–41:17.25 | 好登 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1164.jpg) | SHOT-091 |
| CUE-1165 | 41:17.25–41:18.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1165.jpg) | SHOT-091 |
| CUE-1166 | 41:18.25–41:19.25 | 辛苦板那个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1166.jpg) | SHOT-091 |
| CUE-1167 | 41:19.25–41:20.25 | report可以发到这个 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1167.jpg) | SHOT-091 |
| CUE-1168 | 41:20.25–41:21.25 | 聊天里 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1168.jpg) | SHOT-091 |
| CUE-1169 | 41:21.25–41:22.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1169.jpg) | SHOT-091 |
| CUE-1170 | 41:22.25–41:24.25 | 下面有一个聊天窗口 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1170.jpg) | SHOT-091 |
| CUE-1171 | 41:24.25–41:25.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1171.jpg) | SHOT-091 |
| CUE-1172 | 41:25.25–41:26.25 | 好呀 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1172.jpg) | SHOT-091 |
| CUE-1173 | 41:26.25–41:29.25 | 那我们今天 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1173.jpg) | SHOT-091 |
| CUE-1174 | 41:29.25–41:31.25 | 就先到这感谢大家 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1174.jpg) | SHOT-091 |
| CUE-1175 | 41:31.25–41:32.25 | 参与今天 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1175.jpg) | SHOT-091 |
| CUE-1176 | 41:32.25–41:33.25 | 有点超时 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1176.jpg) | SHOT-091 |
| CUE-1177 | 41:33.25–41:34.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1177.jpg) | SHOT-091 |
| CUE-1178 | 41:34.25–41:36.25 | 但是我觉得大家都分享的特别精彩 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1178.jpg) | SHOT-091 |
| CUE-1179 | 41:36.25–41:37.25 | 然后 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1179.jpg) | SHOT-091 |
| CUE-1180 | 41:37.25–41:39.25 | 我也学到了很多东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1180.jpg) | SHOT-091 |
| CUE-1181 | 41:39.25–41:40.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1181.jpg) | SHOT-091 |
| CUE-1182 | 41:40.25–41:41.25 | 还是挺开眼界的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1182.jpg) | SHOT-091 |
| CUE-1183 | 41:41.25–41:42.25 | 很多用法 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1183.jpg) | SHOT-091 |
| CUE-1184 | 41:42.25–41:43.25 | 对 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1184.jpg) | SHOT-091 |
| CUE-1185 | 41:43.25–41:44.25 | 我还是比较喜欢demo | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1185.jpg) | SHOT-091 |
| CUE-1186 | 41:44.25–41:46.25 | 我觉得对这 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1186.jpg) | SHOT-091 |
| CUE-1187 | 41:46.25–41:47.25 | 介面讲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1187.jpg) | SHOT-091 |
| CUE-1188 | 41:47.25–41:48.25 | 更有感觉 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1188.jpg) | SHOT-091 |
| CUE-1189 | 41:48.25–41:49.25 | 而不是 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1189.jpg) | SHOT-091 |
| CUE-1190 | 41:49.25–41:50.25 | 因为我参加很多活动 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1190.jpg) | SHOT-091 |
| CUE-1191 | 41:50.25–41:51.25 | 大家就是空讲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1191.jpg) | SHOT-091 |
| CUE-1192 | 41:51.25–41:52.25 | 就是panel | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1192.jpg) | SHOT-091 |
| CUE-1193 | 41:52.25–41:53.25 | 然后discussion | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1193.jpg) | SHOT-091 |
| CUE-1194 | 41:53.25–41:54.25 | 然后聊一些 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1194.jpg) | SHOT-091 |
| CUE-1195 | 41:54.25–41:55.25 | 很虚的东西 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1195.jpg) | SHOT-091 |
| CUE-1196 | 41:55.25–41:58.17 | 还是比较喜欢看见面,我觉得会很实在 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/69f1a54500000000360023e7/evidence/frames/cues/cue-1196.jpg) | SHOT-091 |

## 完整性自检

- 核心知识证据：4/4
- 未检查通道：无
- Meta-gate：内部通过；完整机器口播、烧录字幕/OCR、视频特有画面载体、人物/布局和完整非语音混合轨均已检查；每个意义变化与相邻关系都映射到知识单元。剩余是已声明的外部可用性、权利、因果与效果未知。该内部自检不替代独立 reviewer。
- 注意：内部自检不等于独立 reviewer 验证。
