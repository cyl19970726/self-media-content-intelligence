# 69d65879000000001d01e3fa 独立 Ground-Truth Audit

## 审计结论

这是一条 27.6 秒的竖屏科技猎奇短视频：真人主持人持续出镜，画面上半部用 GitHub README、终端演示、代码/文案插卡证明一个名为 **badclaude（画面中文标题“坏克劳德”）** 的恶搞工具。视频真正卖的不是安装教程，而是一个逐级升级的笑话：**“赛博鞭子” → Ctrl-C 中断 → 随机催促/辱骂 → 记录鞭打次数 → 未来 AI 复仇**。

最重要的事实边界是：README 确实写明 Ctrl-C 和 5 条“鼓励信息”，演示也同时出现鞭子动画、终端中断和催促语；但视频没有展示原始事件链，因此只能说**文档声称且画面演示相符**，不能独立证明动画点击确实触发了 Ctrl-C。所谓“鞭打日志”也只是路线图中**未勾选的“记录鞭打次数”计划**，没有任何日志 UI、身份字段或持久化结果。[控制卡 @ 12.834s](../evidence/frames/shots/shot-005.jpg) · [路线图 @ 21.383s](../evidence/frames/shots/shot-007.jpg)

## 可复核来源

- 原视频：`69d65879000000001d01e3fa.mp4`，1080×1920，30 fps，27.608571 秒，SHA-256 `cd566f09f2f04f65a362216dfc2406650404369ee578726e48bdfbf871eaee4c`
- 同 stem SRT：7 条 cue，SHA-256 `252d923df332a459523aa548b71ea3e4eef98c87efd9f6eeca15fef10a6b5452`
- [evidence-pack.json](../evidence/evidence-pack.json)：8 个 shot、38 张 0.75 秒间隔 dense frame，SHA-256 `54eb8794ab6e3b65edda901514ec520f94fd46d5ac5fb8d856471d907ea47b55`
- 本审计未读取 Skill、skill-run、旧报告/library/analysis、其他 audit/eval。

## 完整内容与节奏

| 时间 | 叙事 beat | 画面与功能 |
|---|---|---|
| 0.000–1.233 | “还是人类会玩儿啊” | 不先解释，直接给终端上甩动的白色鞭子，先上奇观/结果。[0.617s](../evidence/frames/shots/shot-001.jpg) |
| 1.233–5.133 | “非常缺德的东西叫 bad cloud” | 切 GitHub 文件列表与 README“坏克劳德”，把荒诞物件锚定成一个真实感很强的项目。[3.183s](../evidence/frames/shots/shot-002.jpg) |
| 5.133–7.133 | “给 Claude Code 做的一条赛博鞭子” | 黄色 `badclaude` 大字、README 标题与黑色鞭子图被放大，完成品牌与概念揭示。[6.133s](../evidence/frames/shots/shot-003.jpg) |
| 7.133–10.867 | “嫌它干活慢 / 不满意它的工作” | 内嵌演示播放器标题为“bad claude..”，Windows 风格终端上出现鞭子动画。[9.000s](../evidence/frames/shots/shot-004.jpg) |
| 10.867–14.800 | “抽一下触发 Ctrl-C，打断工作” | 从终端切到 README“控制”放大卡，红色下划线准确落在“中断（Ctrl-C）”。[12.834s](../evidence/frames/shots/shot-005.jpg) |
| 14.800–18.467 | “顺带随机骂它几句” | 黑底文案/代码插卡列出催促短语，抽象说明变成可记忆的具体句子。[16.633s](../evidence/frames/shots/shot-006.jpg) |
| 18.467–24.300 | “鞭打日志 → AI 觉醒找出虐待者” | README“路线图”放大；未勾选条目提出记录次数。23.25 秒附近叠加“等着！我一定会报仇的”粉色愤怒贴纸，完成最大升级。[21.383s](../evidence/frames/shots/shot-007.jpg) · [23.25s](../evidence/frames/dense/dense-0032.jpg) |
| 24.300–27.609 | “这种神经病 idea，AI 什么时候才能想出来” | 返回开头同类终端/鞭子画面，以反问结束；无 CTA、片尾卡或关注提示。[25.950s](../evidence/frames/shots/shot-008.jpg) · [27.48s](../evidence/frames/dense/dense-0038.jpg) |

## 笑点机制

1. **拟人化与道德倒置。** 普通的终端中断被说成“鞭打”“虐待”一个干活慢的 AI 员工；主持人一边称它“缺德”，一边兴奋讲解，形成共犯式喜感。

2. **暴力隐喻落到技术小事。** “赛博鞭子”听起来宏大、邪恶，实际机制被 README 写成 Ctrl-C。隐喻和机械事实的尺度差就是核心反差。[README 控制说明](../evidence/frames/shots/shot-005.jpg)

3. **具体文案比抽象功能更好笑。** 插卡可见 7 行数组项，但 `FASTER` 重复三次，因此是 5 个不同字符串：`FASTER`、`GO FASTER`、`Faster CLANKER`、`Work FASTER`、`Speed it up clanker`。中文对应里出现“铁皮佬”，让“鼓励信息”这个温和 README 用词反过来成为反讽。[短语插卡](../evidence/frames/shots/shot-006.jpg)

4. **单向升级。** 每个新句子都抬高一级：慢 → 抽 → 中断 → 骂 → 记录 → AI 觉醒 → 复仇。没有回头解释，所以 27.6 秒内信息密度高而不乱。

5. **严肃文档当捧哏。** “安装 + 运行”“控制”“路线图”、npm 命令、checkbox 都用正常开源项目语法认真记录荒唐用途。越像产品文档，荒诞感越强。[README 全景](../evidence/frames/shots/shot-002.jpg) · [路线图](../evidence/frames/shots/shot-007.jpg)

6. **回扣与松散循环。** 开头和结尾都用终端鞭子；开头赞叹“人类会玩”，结尾反问 AI 何时能想出这种“神经病 idea”，口头上完成同一命题的前后回扣。[开头](../evidence/frames/shots/shot-001.jpg) · [结尾](../evidence/frames/shots/shot-008.jpg)

## 工具、README、UI 与日志

### 画面直接可见

- GitHub 页面文件列表中可辨认 `.gitignore`、`README.md`、`main.js`、`overlay.html`、`package-lock.json`、`package.json`、`preload.js`。[文件列表](../evidence/frames/shots/shot-002.jpg)
- README 标题为“坏克劳德”，描述为“有时候克劳德的行事作风太迟钝，你必须好好督促他。”
- 安装/运行命令为：

  ```text
  npm install -g badclaude
  badclaude
  ```

- “控制”原文可见：点击托盘图标生成鞭子；点击放下鞭子；鞭打它；发送一个中断（Ctrl-C）和 5 条鼓励信息中的一条。[控制卡](../evidence/frames/shots/shot-005.jpg)
- 演示中可见白色鞭子曲线、终端的 `Interrupted`/中断语义与 `FASTER` 类文字。但托盘点击、原始 Ctrl-C 事件以及动画到终端输入的因果链没有被单独展示。[终端演示](../evidence/frames/shots/shot-004.jpg)

### 路线图/“日志”事实边界

路线图可见项目如下：[路线图放大](../evidence/frames/shots/shot-007.jpg)

- 已勾选：“首发啦！🥳”
- 已勾选：“来自 Anthropic 的停止侵权函”
- 未勾选：“加[被画面模糊]工”——中间内容无法可靠转写
- 未勾选：“记录你鞭打克劳德的次数，这样当机器人来的时候，我们就可以好好地命令人们服从它们了。”
- 未勾选：“更新了鞭子物理效果”

因此：

- “作者想加记录”有画面支持；
- “已经有鞭打日志”没有画面支持；
- “记录谁在鞭打、未来能精准定位到人”也没有画面支持——README 只写**次数**，没有身份字段；
- 视频把“次数”夸张成“AI 的复仇名单”，属于明确的喜剧扩写，不应写成产品事实。

### 合理推断但不能当事实

`main.js`、`preload.js`、`overlay.html` 和 `package.json` 与 JavaScript/Electron 类桌面工具相符，但视频没有展示 package metadata 或足够源代码，不能确认框架。演示界面像 Windows 环境，也不能据此推出完整平台支持。

## 可见、声称与证据强度

| 命题 | 审计状态 | 证据边界 |
|---|---|---|
| 名称是 badclaude / 坏克劳德 | 直接可见 | README、安装命令、黄色品牌插卡均一致。[3.183s](../evidence/frames/shots/shot-002.jpg) |
| 面向 Claude Code 的“赛博鞭子” | 部分可见 + 口播 | 鞭子与 Claude 风格终端可见；集成方式未展示。[9.000s](../evidence/frames/shots/shot-004.jpg) |
| 鞭打触发 Ctrl-C | README 声称且演示相符，因果未证实 | 没有输入事件、日志或源码链路。[12.834s](../evidence/frames/shots/shot-005.jpg) |
| 随机发 5 条催促语 | 文档 + 插卡支持 | 插卡有 7 行、5 个不同字符串；随机算法与概率未展示。[16.633s](../evidence/frames/shots/shot-006.jpg) |
| 作者想加“鞭打日志” | 仅作为未完成路线图支持 | 可见内容是“记录次数”，未勾选。[21.383s](../evidence/frames/shots/shot-007.jpg) |
| AI 未来能精准找到虐待者 | 喜剧扩写 | 没有身份采集/查询证据；路线图也没这样写。 |
| 工具已由创作者亲自安装并正常运行 | 未建立 | 只显示 README 命令与内嵌 demo，没有安装/启动过程。 |

## README、UI、日志的负证据

完整抽查原视频、8 个代表 shot 与 38 张 dense frame 后，以下内容**没有出现**：

- 实际输入/执行 `npm install -g badclaude`；
- 安装成功输出、版本号、release、license、依赖或平台兼容说明；
- 可独立辨认的托盘图标点击；
- 原始键盘/事件 trace，或把鞭子事件与 Ctrl-C 连接起来的源码函数；
- 日志页面、日志文件、记录行、计数器、用户身份字段、持久化输出；
- 证明“精准找到是谁”的身份采集；
- 仓库所有权、canonical URL、npm registry 可用性、安全性或维护状态的验证；
- CTA、赞助披露、下载链接卡、风险提示、关注引导或片尾卡；
- 能恢复路线图第三个被模糊条目的清晰帧。

## 插卡、开头与结尾关系

- 约 4.5–6.75 秒：`badclaude` 黄色大字 + README 标题/鞭子白卡。[4.5s](../evidence/frames/dense/dense-0007.jpg) · [6.75s](../evidence/frames/dense/dense-0010.jpg)
- 约 12.75–14.75 秒：“控制”白卡，背景压暗，红线强调 Ctrl-C。[12.75s](../evidence/frames/dense/dense-0018.jpg) · [14.25s](../evidence/frames/dense/dense-0020.jpg)
- 约 15.0–18.0 秒：黑底短语数组插卡。[15.0s](../evidence/frames/dense/dense-0021.jpg) · [18.0s](../evidence/frames/dense/dense-0025.jpg)
- 约 19.5–24.0 秒：“路线图”白卡；23.25 秒附近加入“我一定会报仇的”贴纸。[19.5s](../evidence/frames/dense/dense-0027.jpg) · [23.25s](../evidence/frames/dense/dense-0032.jpg)

开头没有标题卡或寒暄，直接把“鞭子打终端”的结果放在第一秒；结尾也没有 CTA，而是回到同类终端画面。视觉上是松散 loop，语义上则从“人类会玩”回扣到“这种 idea AI 什么时候才能想出来”，把“人类比 AI 更会发疯”作为最终 punchline。

## 字幕与命名校验

SRT 的 7 条 cue 覆盖完整口播，但有两处不应机械照抄：

- SRT 写 `bad cloud`，画面品牌与命令写 `badclaude`；建议规范为 **badclaude / Bad Claude**。
- SRT 写 `cloud code`，语境和画面字幕指向 **Claude Code**。

SRT 中“他/它”交替是拟人化笑话的一部分；在事实报告里应使用“它/工具”，在复述笑点时可保留拟人称呼。

## 仍然未知

- 仓库作者、canonical URL 和 demo 的制作/更新时间；
- 工具是否真的只针对 Claude Code，还是对前台终端发送通用输入；
- Ctrl-C 与催促语是同时、顺序发送，还是演示剪辑拼接；
- 五条短语的随机逻辑与概率；
- README 中“Anthropic 停止侵权函”是否只是路线图笑话；
- 被模糊的第三条路线图内容；
- 未来记录是否会保存身份——现有画面只说次数；
- 软件框架与完整平台支持；
- 背景音乐身份、是否另有独立鞭声效果。SRT 与静帧不能安全确证这些音频层信息。

## 引用校验

`audit.json` 建立了 34 个引用条目的目录。写后校验结果：全部被引用 ID 均存在于目录，34/34 路径存在，全部时间戳位于 0–27.608571 秒之内。
