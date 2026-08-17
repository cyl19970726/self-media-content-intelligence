# 独立审计：688445a10000000020019210

## 结论

素材可用于重建，但必须做实质纠偏。视频确实按 BAGEL → FLUX.1 Kontext → ThinkSound 的并列结构介绍三个工具；它不是三步串联工作流。主要风险来自旁白把“演示画面”扩大成了“已证实能力”，并把授权、开源许可和生成因果说成既成事实。

最关键的四点是：

1. 第二个工具规范名应写 **FLUX.1 Kontext**，不能把 `Kontext` 自动改成普通单词 `Context`。
2. 墨镜与雪山背景来自同一条提示词中的两个并列要求，不是先后执行的两次编辑。
3. 后一个 Kontext 案例实际加载了女孩、斑点狗、沙发场景三张图，不是“两张人物图融合”。
4. BAGEL 段只出现盒装手办的二维效果图，不能据此写成已验证的 3D 模型、可旋转网格或可导出 3D 文件。

## 可安全使用的卡片副文案

| 工具 | 建议副文案 |
|---|---|
| BAGEL | 统一多模态模型；画面展示参考图加文本的局部改图、风格示例与盒装手办效果图。 |
| FLUX.1 Kontext | 文本指令编辑参考图；同一条提示词同时加墨镜并换雪山背景，另展示女孩、斑点狗与沙发场景三图合成。 |
| ThinkSound | 网页自述可把视频、Caption 或 CoT 描述作为输入来生成音频；视频给出小提琴片段的前后对照，但未展示实际生成流程。 |

这些文案只复述画面能支撑的内容，没有把“开源版 GPT-4o”“一键 3D”“人物一致性很好”“三个工具都开源”等口播评价升级为客观事实。

## 逐工具核查

### 1. BAGEL（03.767–16.533）

页面明确显示 `BAGEL — The Open-Source Unified Multimodal Model`，并列出 `Edit / Motion / Style Transfer / 3D Rotate`。这只能证明页面对自身的描述；视频没有展示仓库、许可证、权重或允许用途。

可见输入与结果：

- `Give a thumbs-up` → 大卫雕像举起拇指。
- 仅能读到 `Put on sungla…` 的提示词片段 → 雕像戴上黑色墨镜；不应补写画面外不可见的完整原句。
- `Put on a mink coat` → 雕像穿上毛皮样外套。
- `Laugh heartily` → 雕像脸部变成大笑/微笑；此处中文字幕写“改动作”，但画面实际更接近改表情。
- 风格段出现 `Ghibli-style / Sketch-style / Picasso-style / 3D model figurine / Skeleton` 等标签，但没有展示具体提示词或生成参数。
- “一键生成 3D 模型”旁白对应的是盒装大卫手办的二维图。没有多视图、旋转、网格、3D 编辑器或 3D 文件导出证据。

因此，“一句话改图”有示例层面的可见支持；“开源版 GPT-4o”只是类比；“一键生成 3D 模型”未被画面证实。

### 2. FLUX.1 Kontext（16.533–28.833）

网站画面写有“上下文AI图像生成与编辑”“Flux Kontext 应用”，并展示 Age Progression、AI Baby Filter、Background Change 等 16 Credits 示例卡。真正的编辑界面显示：

- 模型：`Flux Kontext Pro`
- 模型说明：`Context-aware image editing with high quality results`
- 参考图：1 张；`More Image` 关闭
- 提示词：`Put sunglasses on this character and change to a snow capped mountain background`
- Translate：关闭
- 显示模式：`Auto`
- 提示强度：`3.5`
- 隐私：`Public` 已选，另有 `Private`
- Advanced Settings 收起，可见 `Content Filters`
- 生成按钮显示 `16 credits`

结果的确显示同一位女性戴墨镜并换成灰白雪山背景。但两个变化由 `and` 连接在同一条提示词中，是并列要求，不是两步串行编辑。“角色一致性非常不错”属于作者主观评价，没有身份相似度指标。

后一个 ComfyUI 节点图更关键。它加载的是三张图：

- `girl.jpg`：女孩角色，800×800
- `dog.jpg`：斑点狗，800×800
- `sofa.jpg`：客厅沙发场景

可见提示词为：`The character is sitting cross-legged on the sofa, and the Dalmatian is lying on the blanket sleeping.`

可见参数为：`Flux.1 Kontext [pro] Image`、比例 `1:1`、guidance `3.0`、steps `50`、seed `957601647357878`、生成后 `randomize`、prompt upsampling `false`，输出显示 `1024×1024`。结果把女孩与睡着的狗放进沙发场景。因此准确关系是“三图、两个主体加场景的合成”，而不是“两张图的两个人物融合”。

### 3. ThinkSound（28.833–44.833）

页面标题为“ThinkSound：革命性的视频转音频AI生成平台”。页面自述其把视频转换为同步音效、语音和沉浸式音景；Demo 说明写明可输入 video、caption 或 CoT，并自动与原始静音视频合并。界面可见：

- `Upload Video`
- `Caption (optional)`
- `CoT Description (optional)`
- `Clear / Submit / Share via Link`

但视频没有展示实际上传文件名、填入的 Caption/CoT、任何生成参数、任务状态、完成结果页或输出文件。

31.867–35.633 秒是第一份小提琴画面，作者称“没有音效”；原视频音轨并非真正静音，因为仍有讲解人声。35.633 秒切到第二份小提琴画面；约 35.69–39.7 秒在人声退出后，音轨出现持续的谐波/音调段，听觉类型与小提琴声相符。39.8–44.833 秒又出现倒液体、持枪者、壁炉三段画面，并叠有讲解人声。

这足以证明成片做了“无小提琴音效/有小提琴音效”的编辑式对照，但不足以证明该音频一定由 ThinkSound 生成：画面没有显示上传、处理或结果记录。后续环境音是否逐项匹配也是作者的定性判断，且旁白覆盖了大部分蒙太奇，无法从成片隔离每条音效来源。

## 指代与并列关系

- 三个工具是平行推荐项，没有工具之间的输入输出传递。
- Kontext 单图编辑里的 `this character` 指向唯一上传的人像；墨镜和雪山背景是同一条提示词中的并列宾语。
- ComfyUI 提示词中的 `The character` 指 `girl.jpg`，`the Dalmatian` 指 `dog.jpg`，`the sofa` 指 `sofa.jpg`。
- 两段小提琴画面由剪辑建立“前/后”关系；画面没有建立第二段音轨来自网页所示 ThinkSound 任务的可复现因果链。

## 能力、因果、许可与授权边界

- 能力：成片只证明这些示例在视频中出现，不能外推稳定性、速度、成功率、可用性或普遍质量。
- 因果：BAGEL 与 Kontext 均未展示完整无剪切生成过程；ThinkSound 连实际上传和结果页也没有展示。
- 开源：只有 BAGEL 页面明确自称 open-source；FLUX.1 Kontext 和 ThinkSound 的开源状态在本视频内没有证据。
- 许可：三个工具都未展示确切许可证、权重条款、商业使用条件、托管服务条款或署名要求。
- 素材权利：人像、大卫雕像照片、风格示例、生成视频、音效等素材的来源与授权均未知。
- 肖像/表演者：画面没有展示被摄者同意、肖像许可或表演者授权。
- 作者说“这是我生成的视频”只能记为作者陈述，无法据此确认生成来源、所有权或再利用授权。
- 即使某模型开源，也不自动覆盖输入素材、输出素材或第三方形象的权利。

## Evidence pack 校验

- 15 个 shots、12 条字幕 cue、33 张 dense frame、60 条 frameIndex，60 个引用帧路径全部存在。
- 12 条字幕文本与提供的 SRT 保持一致。
- 编码、分辨率、帧率、音频存在性和文件大小与源视频探测一致。
- evidence pack 写时长 47.567 秒；源文件探测为 47.577778 秒，SRT 结束于 47.577 秒。约 0.011 秒差异很小，但不能写成完全一致。
- 抽帧可支持可见内容核查，不能证明许可证、作者身份、产品普遍能力或剪辑后输出的生成因果。

## 必改项

1. 规范名用 `FLUX.1 Kontext`。
2. 墨镜与雪山背景写成一条提示词里的并列要求。
3. “两张人物图融合”改成“女孩、斑点狗、沙发场景三图合成”。
4. BAGEL 3D 只能写“盒装手办效果图”，不能写已生成可用 3D 模型。
5. `Laugh heartily` 写成表情变化，不写身体动作变化。
6. ThinkSound 写成编辑式前后对照，明确未展示端到端生成流程。
7. 开源、许可证、素材授权、肖像许可、输出权利和生成来源均保持未知，除非另有独立来源。
