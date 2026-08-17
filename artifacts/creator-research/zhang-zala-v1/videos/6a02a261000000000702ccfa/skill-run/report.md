# OpenAI Realtime + 飞书 CLI：实时语音采访写作与组织资料调用｜内容还原

> 仅重建 0–272.667 秒视频内的口播、插件界面、文档/会议演示及构建自述。字幕为本地机器转写，不是官方字幕；OpenAI Realtime、飞书 CLI 等规范名只在烧录字幕/UI 支持时作为阅读建议。低延迟、三小时会议、来源准确性、半小时至一小时构建、当前 GitHub 可用性和数据权限均不由剪辑后的单例完全证明。

## 一句话还原

- 看前：观众可能知道实时语音模型和飞书资料，但不知道怎样把它们连接成能采访、写作、读会议和调用组织知识的小工具。
- 看后：观众被引导形成一条构建思路：让语音 AI 逐问采访以降低空白文档启动成本，再把回答写入文档；进一步通过飞书 CLI/API/Skill 读取会议与文档，让通用模型获得组织上下文。
- 认知变化：从面对空白文档无从下手，转向用逐问采访外化观点
- 认知变化：从只做语音聊天，转向让语音层调用文档和会议资料
- 认知变化：从把工具当完成品，转向理解它是可由 CLI、API 和 Skill 组合的原型

## 核心内容

### 新 API 与空白文档痛点共同建立工具承诺

时间：00:00.00–00:28.00　层级：作者主张　置信度：medium

作者以 OpenAI Realtime API 和飞书 CLI 的组合为背景，展示右下角浏览器语音助手，并把核心问题定义为：面对空白文档时，让 AI 一次问一个问题，用户口述回答，再把表达转成文章。低延迟与组合可行性是作者主张，片内没有性能基准。

![新 API 与空白文档痛点共同建立工具承诺](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/skill-run/targeted-evidence/frames/ACT-01-001.jpg)

未知：准确 API 版本；低延迟数值与网络条件；插件权限和数据流向

### 逐问采访把口述内容组织成文档

时间：00:28.00–01:37.00　层级：系统推断　置信度：medium

演示进入采访模式后，AI 先问文章主题，用户口述想介绍飞书 CLI 能力，随后画面在对话与文档正文之间切换。可恢复的设计模式是‘一个问题—一次回答—逐步写入’，但提交、等待、改写和同一任务连续性未被完整展示。

![逐问采访把口述内容组织成文档](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/skill-run/targeted-evidence/frames/ACT-02-001.jpg)

**操作还原**

- 输入：空白或待写文档，以及用户口述主题
- 步骤 1：打开采访模式
- 步骤 2：AI 一次提出一个问题
- 步骤 3：用户口述回答
- 步骤 4：系统组织回答并写入文档
- 步骤 5：继续追问或修订
- 参数/选择：文章主题；采访问题顺序；写入目标文档
- 输出：逐步形成的文章草稿
- 未展示：触发写入的具体命令；成文改写规则；错误恢复和撤销机制；抽帧和剪辑不能单独证明全部状态属于同一连续任务

未知：原始回答与成文之间的改写规则；文档是否预置；真实延迟和失败率

### 同一语音入口被扩展为组织资料问答

时间：01:37.00–03:03.00　层级：作者主张　置信度：medium

作者继续展示让语音助手读取群总结和长会议资料，并称可以对三小时会议提问、返回回答和来源。画面可证明存在问题、回答与资料/来源界面状态，不能单凭单例确认已完整读取三小时、引用逐句准确或跨权限安全。

![同一语音入口被扩展为组织资料问答](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/skill-run/targeted-evidence/frames/ACT-03-001.jpg)

未知：真实会议长度；资料召回与答案准确率；来源链接忠实性；组织权限隔离

### CLI、API 与 Skill 被提出为可组合基础设施

时间：03:03.00–03:48.00　层级：作者主张　置信度：medium

作者把前述演示抽象为一种组合方式：用飞书 CLI/API 暴露组织文档和会议资料，再交给通用模型或封装成 Skill；还提出可用于 slides 等更多应用。这是构建方向，不等于片内逐项完成并验证了所有能力。

![CLI、API 与 Skill 被提出为可组合基础设施](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/skill-run/targeted-evidence/frames/ACT-04-001.jpg)

**论证结构**

- 论点：将组织资料接口与实时语音模型组合，可以降低知识工作启动成本并扩展为多种 AI 工具。
- 条件：用户有合法资料访问权限；接口和模型稳定；回答保留来源并允许人工核验
- 反例：高敏感资料不适合送入外部模型；资料过长或格式复杂会影响召回；实时体验可能受网络和调用成本限制
- 行动：先选一个高频卡点；用逐问交互降低启动门槛；接入可审计资料源；保留来源与人工复核
- 限制：片内是原型单例；没有性能、准确率或隐私审计

未知：各接口的权限与速率限制；Skill 输入输出契约；哪些扩展已经实现

### 收尾用低门槛构建自述和社区 CTA 降低行动阻力

时间：04:07.00–04:32.67　层级：作者主张　置信度：medium

作者称插件用 Codex 和自然语言构建，最初提示很短，随后多次迭代，单次大约半小时到一小时；并以社区入口收尾。它承担的是降低行动门槛的 CTA，但时长口径、准备工作、失败成本和普通用户复现率均未验证。

![收尾用低门槛构建自述和社区 CTA 降低行动阻力](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/skill-run/targeted-evidence/frames/ACT-06-001.jpg)

未知：准确提示词；迭代次数；构建起止口径；普通用户复现率


## 支撑信息

### 获得工具的入口与当前可用性仍需核验

时间：03:48.00–04:07.00　层级：画面观察　置信度：medium

视频末段给出搜索或仓库/CLI 的入口线索，但没有连续展示下载、安装、授权、配置和成功运行。页面出现只能证明拍摄时画面中存在相关入口，不能证明当前仍可用、免费、可商用或适配所有账户。

![获得工具的入口与当前可用性仍需核验](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/skill-run/targeted-evidence/frames/ACT-05-001.jpg)

未知：当前地址和版本；许可证；安装依赖；费用和账号地区


## 证据边界与上下文

### 专有名词与字幕冲突保留

时间：00:00.00–04:32.67　层级：系统推断　置信度：high

机器转写把 OpenAI Realtime、飞书 CLI、浏览器插件、voice write、frontend slides 等多处专有名词识别成 Realtime2、FacebookCY、流冷器等变体。报告保留原始 cue；规范名仅由烧录字幕、界面文字和上下文共同支持时用于阅读层，仍不等于确认产品当前版本。

未知：Realtime 的具体 API 版本；插件和仓库的正式名称；部分英文命令与按钮小字

### 非语音音频不构成独立操作证明

时间：00:00.00–04:32.67　层级：系统推断　置信度：medium

完整混合轨按无缝窗口执行机器语义检查，稳定信息主要仍是旁白/对话；低分环境声或其他候选不足以证明实时响应、按钮点击、写入成功或资料调用成功。

未知：精确声源、曲目、来源、授权和被旁白遮蔽的低电平事件

## 内容关系

- 新 API 与空白文档痛点共同建立工具承诺 → 逐问采访把口述内容组织成文档：开场承诺通过逐问采访演示获得第一个可见结果
- 逐问采访把口述内容组织成文档 → 同一语音入口被扩展为组织资料问答：个人写作能力被扩展为组织知识检索与问答
- 同一语音入口被扩展为组织资料问答 → CLI、API 与 Skill 被提出为可组合基础设施：资料问答单例被概括为可复用的工具组合模式
- CLI、API 与 Skill 被提出为可组合基础设施 → 获得工具的入口与当前可用性仍需核验：抽象组合方法落到可搜索的入口线索
- 获得工具的入口与当前可用性仍需核验 → 收尾用低门槛构建自述和社区 CTA 降低行动阻力：入口线索进一步被包装为低门槛亲手构建的行动邀请

## 明确不能从视频判断

- OpenAI Realtime API 与飞书 CLI 的准确版本、账户、费用和地区条件
- 插件当前下载地址、源代码、许可证和数据权限
- 演示中的真实延迟、任务连续性和镜头外编辑
- 会议来源链接、回答准确性和权限隔离是否经独立验证
- 半小时至一小时构建时长的起止口径和可复现性
- 非语音音频的精确内容、来源、授权与编辑意图

## 完整机器逐字稿与证据映射

> 这是本地机器转写，不是官方字幕。原始文本不静默修正；每条 cue 均对应代表帧和全部 overlapping shots。

| Cue | 时间 | 原始机器转写 | 代表帧 | Overlapping shots |
|---|---:|---|---|---|
| CUE-001 | 00:00.00–00:03.00 | 最近OpenAI推出了RealTime2的API | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-001.jpg) | SHOT-001 |
| CUE-002 | 00:03.00–00:05.00 | 如果大家對VipCoding感興趣 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-002.jpg) | SHOT-001 |
| CUE-003 | 00:05.00–00:08.00 | 我強烈推薦大家試一下自己做一個實施語音的應用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-003.jpg) | SHOT-001 |
| CUE-004 | 00:08.00–00:11.00 | 這個RealTime2能實現在調用工具和推理的情況下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-004.jpg) | SHOT-001 |
| CUE-005 | 00:11.00–00:13.00 | 還是非常低的延遲 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-005.jpg) | SHOT-001 |
| CUE-006 | 00:13.00–00:16.00 | 然後我就把RealTime2的API和FacebookCY結合起來 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-006.jpg) | SHOT-001 |
| CUE-007 | 00:16.00–00:17.00 | 做了一個小工具 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-007.jpg) | SHOT-001 |
| CUE-008 | 00:17.00–00:20.00 | 它是一個流冷器插件就是我右下角這個小人 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-008.jpg) | SHOT-001 |
| CUE-009 | 00:20.00–00:23.00 | 就有時候我們面對一個空白瘟腦就不知道怎麼開始 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-009.jpg) | SHOT-001 |
| CUE-010 | 00:23.00–00:25.00 | 這個時候就可以讓AI來採訪你 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-010.jpg) | SHOT-001 |
| CUE-011 | 00:25.00–00:27.00 | 它一次性問你個問題你回答就好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-011.jpg) | SHOT-001 |
| CUE-012 | 00:27.00–00:28.00 | 就是口盆式的寫文章 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-012.jpg) | SHOT-001 |
| CUE-013 | 00:28.00–00:29.00 | 進入採訪模式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-013.jpg) | SHOT-001 |
| CUE-014 | 00:29.00–00:30.00 | 好的 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-014.jpg) | SHOT-001 |
| CUE-015 | 00:30.00–00:32.00 | 我先幫你打開採訪模式 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-015.jpg) | SHOT-001 |
| CUE-016 | 00:32.00–00:34.00 | 然後再問你一個開場問題 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-016.jpg) | SHOT-001 |
| CUE-017 | 00:34.00–00:37.00 | 你這一天文章最想先寫清楚的主題是什麼 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-017.jpg) | SHOT-001 |
| CUE-018 | 00:37.00–00:41.00 | 我想寫個文章介紹一下FacebookCY的各種能力 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-018.jpg) | SHOT-001 |
| CUE-019 | 00:41.00–00:46.00 | 它其實就是能讓Agent操控你Facebook所有功能的雙手 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-019.jpg) | SHOT-001 |
| CUE-020 | 00:46.00–00:49.00 | 比如幫你寫文章總結群裡的記錄 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-020.jpg) | SHOT-001 |
| CUE-021 | 00:49.00–00:51.00 | 查看你的妙計等等 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-021.jpg) | SHOT-001 |
| CUE-022 | 00:51.00–00:52.00 | 好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-022.jpg) | SHOT-001 |
| CUE-023 | 00:52.00–00:56.00 | 我先把你這段整理成一段清晰的開場描述 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-023.jpg) | SHOT-001 |
| CUE-024 | 00:56.00–00:59.00 | 很好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-024.jpg) | SHOT-001 |
| CUE-025 | 00:59.00–01:02.00 | 這一段已經整理成文章的開場了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-025.jpg) | SHOT-001 |
| CUE-026 | 01:02.00–01:05.00 | 接下來你最想先展開哪一塊能力 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-026.jpg) | SHOT-001 |
| CUE-027 | 01:05.00–01:10.00 | 是文章寫作群療總結還是妙計的獨取和調用 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-027.jpg) | SHOT-001 |
| CUE-028 | 01:10.00–01:12.00 | 比如群療總結這塊 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-028.jpg) | SHOT-001 |
| CUE-029 | 01:12.00–01:16.00 | 如果你有一些很大的群裡面有幾千條消息 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-029.jpg) | SHOT-001 |
| CUE-030 | 01:16.00–01:18.00 | Agent可以直接幫你去總結 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-030.jpg) | SHOT-001 |
| CUE-031 | 01:18.00–01:20.00 | 並且最近的新的能力裡 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-031.jpg) | SHOT-001 |
| CUE-032 | 01:20.00–01:23.00 | 它還可以引用原聊天消息的鏈接 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-032.jpg) | SHOT-001 |
| CUE-033 | 01:23.00–01:26.00 | 好 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-033.jpg) | SHOT-001 |
| CUE-034 | 01:26.00–01:29.00 | 我來把這一點寫成一段簡潔的功能說明 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-034.jpg) | SHOT-001 |
| CUE-035 | 01:31.00–01:33.00 | 這一段已經加上了 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-035.jpg) | SHOT-001 |
| CUE-036 | 01:33.00–01:37.00 | 你接下來想講文章寫作的能力還是妙計的使用場景 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-036.jpg) | SHOT-001 |
| CUE-037 | 01:37.00–01:39.00 | 比如說我這一個非常長的Facebook妙計 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-037.jpg) | SHOT-001 |
| CUE-038 | 01:39.00–01:41.00 | 將你三個小時我可以點這個效忍 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-038.jpg) | SHOT-001, SHOT-002 |
| CUE-039 | 01:41.00–01:44.00 | 然後跟它用實質語音來聊這個妙計 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-039.jpg) | SHOT-002 |
| CUE-040 | 01:44.00–01:47.00 | 這個活動我錯過了都講了什麼呀 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-040.jpg) | SHOT-002 |
| CUE-041 | 01:49.00–01:51.00 | 我來幫你把這場描述 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-041.jpg) | SHOT-002 |
| CUE-042 | 01:51.00–01:55.00 | 我來幫你把這場活動的重點內容快速輸一下 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-042.jpg) | SHOT-002 |
| CUE-043 | 01:59.00–02:02.00 | 這場活動主要是多位嘉賓 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-043.jpg) | SHOT-002 |
| CUE-044 | 02:02.00–02:06.00 | 分享AI agent在各種工作和生活場景裡的實踐經驗 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-044.jpg) | SHOT-002 |
| CUE-045 | 02:06.00–02:09.00 | 重點都圍繞怎麼和Agent寫作 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-045.jpg) | SHOT-002 |
| CUE-046 | 02:09.00–02:12.00 | 怎麼提到效率以及怎麼管理上 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-046.jpg) | SHOT-002 |
| CUE-047 | 02:12.00–02:14.00 | 介紹一下Daniel講了什麼 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-047.jpg) | SHOT-002 |
| CUE-048 | 02:16.37–02:20.37 | 好的,我来帮你输理一下 Daniel这一段的重点内容。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-048.jpg) | SHOT-002 |
| CUE-049 | 02:46.37–02:58.37 | 所以通过这种方式你就可以用实时云的方式快速了解一个会议的内容。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-049.jpg) | SHOT-002 |
| CUE-050 | 02:58.37–03:03.37 | 这是因为有了飞书 CLI之后,Agent可以直接去读取妙计去进行减所问答。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-050.jpg) | SHOT-002 |
| CUE-051 | 03:03.37–03:10.37 | OK,先演示到这,所以这个产品它其实就是一个流暖器插件,然后它会出现在所有的飞书妙计和文档的页面, | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-051.jpg) | SHOT-002 |
| CUE-052 | 03:10.37–03:21.37 | 然后你就可以实现比如说跟妙计去聊天跟文档去聊天,比如一个长文档并会看直接让AI去给你对话了解这个文档,或者是像我刚才演示的口评是写文档。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-052.jpg) | SHOT-002 |
| CUE-053 | 03:21.37–03:28.37 | 我有一个非常推荐的技巧就是你可以把飞书 CLI和一个外部的API或者Skill结合起来使用。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-053.jpg) | SHOT-002 |
| CUE-054 | 03:28.37–03:35.37 | 比如说飞书 CLI+GPT Realtime2就能实现我刚刚才的这种基于文档和妙计实时对话的效果。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-054.jpg) | SHOT-002 |
| CUE-055 | 03:35.37–03:48.37 | 再比如说我之前不是做了很多HTML的Skill,比如说Front and Slides,那你就可以做一个飞书文档转Front and Slides,或者飞书妙计转Front and Slides这样就可以把会计要变成非常精美的HTML等等。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-055.jpg) | SHOT-002 |
| CUE-056 | 03:48.37–04:00.37 | 如果大家想开始使用直接谷歌搜索Lux CLI,然后进入这个GitHub 页面,记得点一个心,然后直接把这个GitHub发给你的Agent就可以了,并且现在几乎每天都在上线吸的能力。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-056.jpg) | SHOT-002 |
| CUE-057 | 04:00.37–04:07.37 | 因为飞书几乎所有的功能都是Agent可以操作的,所以它有非常非常多的玩法,期待看到大家更有创意的一些作品。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-057.jpg) | SHOT-002 |
| CUE-058 | 04:07.37–04:15.37 | 然后如果大家在基于飞书做一些太发欢迎进入这个铁子关联的飞书builder社区,在里面交流自己的作品。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-058.jpg) | SHOT-002 |
| CUE-059 | 04:15.37–04:24.37 | 那么刚才我的这个实时云的插件,就是我跟CODEX完全通过搭白话了出来的,不需要任何的代码经验,你就可以做出一个实时云的这样的小产品。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-059.jpg) | SHOT-002 |
| CUE-060 | 04:24.37–04:32.37 | 并且有大家看到我最早的ProM也就这么长,当然后面是铁带了很多轮,但是做这样一个插件可能快的话只需要半小时到一小时。 | [查看帧](/Users/hhh0x/self-media/artifacts/creator-research/zhang-zala-v1/videos/6a02a261000000000702ccfa/evidence/frames/cues/cue-060.jpg) | SHOT-002 |

## 完整性自检

- 核心知识证据：5/5
- 未检查通道：无
- Meta-gate：内部通过；完整机器口播、烧录字幕/OCR、视频特有画面载体、人物/布局和完整非语音混合轨均已检查；每个意义变化与相邻关系都映射到知识单元。剩余是已声明的外部可用性、权利、因果与效果未知。该内部自检不替代独立 reviewer。
- 注意：内部自检不等于独立 reviewer 验证。
