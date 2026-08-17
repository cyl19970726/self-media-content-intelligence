# dev-workflow 独立事实审计

## 审计边界

本审计只查看了指定源视频、同名平台 SRT 与 `evidence-pack.json`。没有读取 video-content-reconstruction Skill、既有 report/analysis/editorial notes、skill-run 或 baseline 输出。

视频时长 111.061 秒，竖屏 1080×1920；evidence-pack 含 32 个字幕 cue、26 个镜头段和 1.5 秒间隔的 dense frame 索引。平台 SRT 对产品名有同音误写，因此产品/命令/参数均以画面文字为准。

## 一句话 ground truth

这不是“一句话从空白自动生成并发布一款手游”的连续实录，而是一支经过剪辑的教程：作者安装 Claude Code，把它通过 Moonshot 的 Anthropic 兼容端点切换到 `kimi-k2-thinking-turbo`，向它提供结构化提示词、完整策划/角色数据和项目目录；作者另用外部图像工具生成、下载并手动整理美术资产，再让 Claude Code 接入，最终在本地浏览器预览一个 `index.html` 单页文字游戏原型，并用自然语言做一次布局迭代。

“3 小时”“不写一行代码”“比大部分编剧写得好”“不懂 AI 只说大白话也能拥有独立文游”均是作者主张；源视频没有提供足够材料独立验证。

## 观众认知变化

| 阶段 | 时间 | 观众获得的新认识 |
|---|---:|---|
| 成品钩子 | 00:00-00:09 | AI 做出乙女文游；作者声称 3 小时、零手写代码。 |
| 可复制承诺 | 00:09-00:14 | 作者已有 `universal_game_prompt.md` 模板，观众可修改复用。 |
| 配置代理 | 00:14-00:42 | 主路径是 Claude Code + Moonshot API + Kimi K2 Thinking Turbo；Kimi CLI 是替代项。 |
| 规格输入 | 00:42-01:02 | 真正输入是结构化模板/完整制作文档，包含世界观、玩法、角色、数值、技术栈、系统与 UI。 |
| 美术补齐 | 01:02-01:14 | 美术需在外部生成，人工下载、命名、放目录，再由 Claude Code 接入。 |
| 初版验证 | 01:14-01:31 | 本地原型可见：时段、数值、场景、人物、对话与按钮。作者主观认可文案。 |
| 二次迭代 | 01:31-01:39 | 作者不喜欢人物大图与场景重合，要求只保留对话框缩略图，新版完成。 |
| 方法泛化 | 01:39-01:51 | 方法被泛化到职场、古风、悬疑；结尾引导观众联系索取文档。 |

## 全部信息载体

1. 作者口播：解释流程并提出效率、易用性、质量主张。
2. 烧录中文字幕：重复/压缩口播，突出行动和承诺。
3. 黄色步骤标题：`step1. 配置API`、`step2. 搭框架`、`step3. 美术资产`。
4. Moonshot 开发者平台录屏：API Key 新建、复制与安全提示。
5. 安装/配置代码块：Claude Code npm 命令、Kimi CLI 命令、端点与环境变量。
6. Kimi CLI README 与 K2 Thinking 产品页：替代路径和模型 agent 能力宣传。
7. 终端/Claude Code 会话：版本、模型、工作目录、自然语言请求、读目录/读文件和结果。
8. Markdown 模板与完整制作文档：最高信息密度的真实规格输入。
9. 外部图像生成界面与 Finder：角色/背景生成、下载、命名和归档。
10. 游戏预览：直接显示初版、新版、数值栏、场景、角色和对话。
11. 真人 A-roll、手势、近景推进：建立信任并强化“简单、快速、人人可做”。
12. 三类题材 AI 图片：把方法泛化为职场逆袭、古风穿越、悬疑解谜；不证明对应游戏已生成。
13. 结尾 CTA：联系作者索取文档/提示词。

## 意义变化与边界修正

- “不写代码”更准确地说是“不亲手编写业务代码”。仍需终端、npm/Node、API key、环境变量、目录和文件操作。
- “说大白话”并不等于需求简单。画面中的模板明确指定 HTML5、Vanilla CSS、Vanilla JavaScript ES6+、OOP、状态管理、localStorage、响应式、UI 风格和系统模块。
- “AI 搞定游戏”不能解释为从空目录开始。可见目录已有完整 story 文档、5 个角色 JSON、assets/images、image_pipeline 与空 gameplay 等结构。
- 美术并非 Claude Code 端到端生成。作者另用外部工具生成/筛选/下载图片，再手动放入目录。
- “手游/独立文游”在片中被展示的完成边界只是本地浏览器双击 `index.html` 运行的 SPA 原型；没有打包、部署、上架或实机演示。
- 初版不是免审阅交付。作者逐句看文案，发现布局问题，再以自然语言二次修改。

## 关系结构

核心因果链：

`详细规格 + 现有策划/角色数据 + 人工生成美术` → `Claude Code v2.0.31` → `Moonshot Anthropic 兼容 API` → `kimi-k2-thinking-turbo` → `读写项目文件` → `本地 index.html 原型` → `人工审阅` → `自然语言二次修改`

Kimi CLI 只作为替代工具出现，没有进入后续案例。作者同时扮演产品经理、内容策划、美术资产整理者、质量审阅者与迭代决策者；AI 代理并未替代这些判断。

## 完整流程依赖、参数与状态

### 0. 前置环境（片中未完整展示）

- 输入：macOS/zsh、网络、Node/npm、Moonshot 开发者账户。
- 可见状态：后续终端出现 Node.js v25.1.0；编辑器为 Cursor/VS Code 类界面。
- 未知：Node/npm 安装步骤、最低版本、账户充值与额度。

### 1. 安装代理

- 前状态：Claude Code 可能未安装。
- 操作：`npm install -g @anthropic-ai/claude-code`。
- 输出：`claude` 命令可用。
- 替代路径：Kimi CLI README 显示 `uv tool install --python 3.13 kimi-cli`，但案例没有继续使用它。
- 证据：CUE-007/008；SHOT-006/007；FRAME-SHOT-006/007。

### 2. 创建 Moonshot API key

- 前状态：API Key 管理页需要新 key。
- 操作：新建、命名/选项目、复制只显示一次的 key。
- 可见参数：示例名称 `claudecode`，项目 `default`。
- 输出：被遮挡的 Moonshot key。
- 后状态：具备用于 Claude Code 的认证令牌。
- 证据：CUE-011；SHOT-009/010；FRAME-SHOT-009/010。

### 3. 配置 K2 模型

- 输入：Moonshot key、zsh、环境变量模板。
- 操作：把 key 写入 `ANTHROPIC_AUTH_TOKEN`，将配置追加到 `~/.zshrc`，运行 `claude`，以 `hi/你好` 测试。
- 参数：
  - `ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic`
  - `ANTHROPIC_AUTH_TOKEN=<Moonshot API key>`
  - `ANTHROPIC_MODEL=kimi-k2-thinking-turbo`
  - `ANTHROPIC_DEFAULT_OPUS_MODEL=kimi-k2-thinking-turbo`
  - `ANTHROPIC_DEFAULT_SONNET_MODEL=kimi-k2-thinking-turbo`
  - `ANTHROPIC_DEFAULT_HAIKU_MODEL=kimi-k2-thinking-turbo`
  - `CLAUDE_CODE_SUBAGENT_MODEL=kimi-k2-thinking-turbo`
- 输出：Claude Code v2.0.31 显示 `kimi-k2-thinking-turbo` 并能响应。
- 未展示：shell reload/source 细节、API 用量和费用。
- 证据：CUE-012/013；SHOT-010/011/012；FRAME-SHOT-011/012。

### 4. 准备并提交游戏规格

- 前状态：代理已连通；真实项目起点因跳剪不连续。
- 输入：`universal_game_prompt.md` 与完整案例制作文档。
- 模板参数：
  - 单页 HTML/CSS/JavaScript SPA。
  - 游戏标题、核心背景、核心冲突、玩家目标、核心数值、3-5 位 NPC。
  - HTML5；Vanilla CSS（不用 Tailwind）；玻璃拟态、微交互、渐变；移动/桌面响应式。
  - Vanilla JavaScript ES6+、OOP、状态管理分离。
  - GameEngine：时间、场景、线性/随机事件、localStorage 存档。
  - 主角数值变化/视觉反馈/失败条件；角色好感、立绘路径、性格标签、约会/送礼/对话、详情页。
- 案例参数：
  - 25 岁被互联网公司裁员的普通女工；乙女向 + 模拟人生 + 都市现实 + 职场重生。
  - 5 个攻略对象：算法组 Leader、PM、增长运营、UI 设计师、副总监。
  - 数值：energy、mood、pressure、money、career、social。
  - 日程：早上、下午、晚上、深夜；行为：找工作、学习、约会、兼职、睡觉、副业。
- 操作：在项目目录启动 Claude Code，让其查看目录/文档，确认“直接开发吧，注意这是一个手游”。
- 可见前/中状态：目录已有 `/story` 完整文档、`/characters` 的 5 个 JSON、空 `/gameplay`、`/assets/images` 和空 `/image_pipeline`。
- 输出：代理理解项目、总结目录、提出实现方向并进入代码阶段。
- 未知：这些文件是否在本次会话生成；完整生成日志和版本历史没有展示。
- 证据：CUE-014-018；SHOT-013/014；FRAME-SHOT-014；DENSE-0035/0038/0041。

### 5. 外部生成美术

- 前状态：文字/框架已有，角色与场景图片不足。
- 输入：角色职业、年龄、气质、发型、服装等描述；外部图像生成工具。
- 操作：生成候选图、人工选择/下载、命名并放入项目目录。
- 可见文件：`protagonist_neutral.png`、`lin_yushen_neutral.png`、`he_jing_neutral.png`、`cai_yang_neutral.png`、`luo_jin_neutral.png`、`zhou_yuan_neutral.png`，以及 `bg_street_rain.png`、`bg_meeting_room.png`、`bg_cafe.png`、`bg_office_day.png`、`bg_home.png`、`bg_park_evening.png`、`bg_convenience_store.png`、`bg_bookstore.png` 等。
- 输出：可由项目引用的角色/背景 PNG。
- 未知：图像平台/模型、完整提示词、轮次、费用、版权、修图。
- 证据：CUE-019/020；SHOT-015/016/017；FRAME-SHOT-015/017。

### 6. 接入资产并运行初版

- 前状态：项目已有规格/内容/图片，代码版本不连续可见。
- 操作：告诉 Claude Code 文件夹里已有美术资产，让它自行查找并接入；双击 `index.html` 在浏览器预览。
- 输出：第 1 天/时段、精力/心情/存款/压力、场景图、人物、对话框、缩略头像等。
- 后状态：本地 Web 原型可运行。
- 未知：代理具体写了哪些文件、耗时、错误与重试。
- 证据：CUE-021/022；SHOT-018/019；FRAME-SHOT-018/019。

### 7. 人工审阅与二次修改

- 前状态：初版同时显示中央人物大图、场景背景和左下缩略图。
- 人工审阅：作者称自己逐句看文案，认为自然、有情绪；随后发现布局不喜欢。
- 修改指令：`开始对话的时候，我不喜欢那个人物和场景重合的布局，对话的时候只保留对话框下的缩略图。`
- 代理动作：读取 171 行 `index.html` 并修改。
- 输出：新版删去中央大角色图，保留场景、对话框和左下缩略头像。
- 证据：CUE-023-028；SHOT-019-022；FRAME-SHOT-020/021/022。

### 8. 最终边界

已展示：

- Claude Code 经 Moonshot K2 可响应自然语言、读取项目和修改文件。
- 本地 `index.html` 能显示具有数值、时段、角色、背景和对话的文字游戏原型。
- 一次具体布局反馈有可见前后状态。

未展示：

- 从空目录开始的连续 3 小时全过程。
- 模板列出的全部系统已实现并测试。
- 手机实机、响应式验证、打包、部署、发布或上架。
- 完整剧情分支、存档/读档、Bad Ending、随机事件、错误处理、性能与稳定性。
- API/图像生成真实成本、资产版权和密钥安全流程。

## Critical questions 与答案

| ID | 问题 | Ground truth |
|---|---|---|
| CQ-01 | 核心承诺？ | 3 小时、零手写代码、模板可复用；均为作者主张。证据 CUE-001-005。 |
| CQ-02 | 工具/模型/供应商？ | Claude Code v2.0.31 + Moonshot API + kimi-k2-thinking-turbo；Kimi CLI 只是替代。 |
| CQ-03 | Claude Code 安装命令？ | `npm install -g @anthropic-ai/claude-code`。 |
| CQ-04 | Kimi CLI 替代安装？ | `uv tool install --python 3.13 kimi-cli`；案例未使用。 |
| CQ-05 | 配置参数？ | Moonshot Anthropic 端点、API key，所有可见模型变量设为 `kimi-k2-thinking-turbo`。 |
| CQ-06 | 成功判据？ | Claude Code 显示 K2 模型并能用中英文响应；仅为连通性演示。 |
| CQ-07 | 规格包含什么？ | 主题/角色/数值/剧情/技术栈/系统/UI；不是一句空泛需求。 |
| CQ-08 | 代码前项目状态？ | 已有完整 story、5 个角色 JSON、assets/images 等；gameplay/image_pipeline 标为空。 |
| CQ-09 | 美术如何进入？ | 外部生成 → 人工下载/命名/放目录 → Claude Code 查找接入。 |
| CQ-10 | 交付物？ | 本地浏览器运行的 HTML/CSS/JS SPA 原型，不是已发布手游。 |
| CQ-11 | 布局改了什么？ | 删除与场景重合的中央人物大图，只保留对话框缩略图。 |
| CQ-12 | 文案质量客观验证？ | Unknown；只有作者主观评价与少量对话截图。 |
| CQ-13 | 3 小时包含哪些环节？ | Unknown；没有计时边界或连续录像。 |
| CQ-14 | 模板全部系统/发布质量是否完成？ | Unknown；只演示少量界面和一次改版。 |
| CQ-15 | CTA？ | 联系作者索取文档；价格、授权、版本未知。 |

每个问题的 cue/shot/frame 精确引用见 `audit.json` 的 `criticalQuestions`。

## 最可能被遗漏的十项

1. 真正起始状态不是空白：已有完整文档、角色 JSON、目录和图片。
2. 最终只是本地浏览器 SPA 原型，不是打包/上架产品。
3. “3 小时”没有连续证据。
4. “零代码”仍有明显终端/API/环境变量/文件操作门槛。
5. 提示词包含具体架构与系统设计，信息密度很高。
6. 美术是另一条独立工具链，需要人工生成、筛选和整理。
7. Moonshot API 有计费与密钥安全依赖，但成本未说明。
8. 生成过程大量跳剪，不能证明单一连续会话的端到端因果。
9. 文案质量只有作者主观评价，没有外部盲测。
10. 模板要求不等于功能已验证；存档、Bad Ending、随机事件、响应式等未测试。

## 原子证据索引

`audit.json` 的 `atomicEvidence` 共 40 条，逐条区分 `visual_fact`、`demonstrated_action` 与 `spoken_claim`，每条都有时间范围及 cue/shot/frame refs。`unknowns` 共 20 条，覆盖计时边界、真实起始状态、文件来源、API 成本、图像模型/版权、移动端/发布、完整功能、版本连续性与文档交付条件。
