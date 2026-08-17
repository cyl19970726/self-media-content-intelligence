# 《3个宝藏AI，搞创意效率起飞！》内容重建

## 一句话还原

这是一条“三项并列推荐”，不是三步工作流：作者依次介绍 BAGEL、FLUX.1 Kontext 和 ThinkSound，用产品卡、提示词/界面、剪辑相邻的结果样例与一段声音对照说明各自用途。视频没有展示三者之间的文件交接，也没有建立真实端到端运行、外部性能、许可证或素材授权。结尾的“三个都开源”是作者主张；三项中只有 BAGEL 页面本身可见 open-source 自述。

## 1. BAGEL：自然语言改图、风格与 3D 主张（00:03.767–00:16.533）

产品卡可见名称是 `BAGEL`，副文案是 `The Open-Source Unified Multimodal Model`。卡片同时列出 `Edit`、`Motion`、`Style Transfer`、`3D Rotate`、`Outpainting` 五个功能入口。这是三项里唯一由页面本身作出 open-source 自述的工具。[TARGET-0006, TARGET-0012]

作者把它称为“国产开源的多模态大模型”“开源版的 GPT-4o”，并声称一句话就能 P 图改图。画面用同一男性石膏像依次展示：

- `Give a thumbs-up!` → 石膏像出现竖拇指动作。[TARGET-0018–0020]
- `Add a beret!` → 头上新增贝雷帽。[TARGET-0021]
- `Put on sunglasses` → 眼部出现黑色太阳镜。[TARGET-0023]
- `Put on a mink coat` → 肩部出现蓬松皮草外套。[TARGET-0024]
- `Laugh heartily` → 面部变成张嘴大笑；这个例子证明的是表情变化，不是身体动作变化。[TARGET-0025–0027]

风格卡还可读到 `Ghibli-style`、`Sketch-style`、`Picasso-style`、`Fluffy-style`、`Paper-cutting`、`3D model figurine`、`Live-action`、`Skeleton` 等标签。[TARGET-0028]

作者进一步声称“一键生成 3D 模型”。可见结果仅是一张石膏像半身置于盒状包装/展示柜中的二维手办效果图，不是已证明的 3D 资产。视频没有出现可旋转几何、网格、深度或多视角、3D 编辑器、文件格式、下载或导出，因此既不能确认它是可用的 3D 文件，也不能确认“一键”的实际操作。[TARGET-0032–0034]

## 2. FLUX.1 Kontext：单图编辑与三源合成（00:16.533–00:28.833）

第二项规范身份记为 `FLUX.1 Kontext`，这是对 16.53–27.00 秒跨载体身份链的归一，不是把段首某一帧当作完整正式名：SRT 写 `context`，编号卡写 `2. kontext`，段首产品页写 `Flux Kontext AI` 与“Flux Kontext 应用”，后续单图界面写 `Flux Kontext Model` / `Flux Kontext Pro`，ComfyUI 节点写 `Flux.1 Kontext [pro] Image`。其中段首产品页主标题是“上下文AI图像生成与编辑”，副文案是“使用Flux Kontext AI创建惊人的视觉效果。从文本到图像，释放你的创造力。”[TARGET-0036, TARGET-0040, TARGET-0047, TARGET-0059]

### 单图编辑例

界面标题是 `Flux Kontext Model`，选择项为 `Flux Kontext Pro`，副文案为 `Context-aware image editing with high quality results`。输入是一张白衣黑发女性正面肖像，提示词完整写：

> Put sunglasses on this character and change to a snow capped mountain background

同一界面还清楚显示 `prompt strength=3.5`、`Public` 已选而 `Private` 可选、模式 `Auto`、`Advanced Settings` 下的 `Content Filters`，以及标示 `16 credits` 的生成按钮。右侧 `Flux Kontext History` 处于空状态，写 `No images yet / Generated images will appear here`，上方同时可见 `12 Items`。[TARGET-0046–0048]

剪辑后的右侧结果保留相近发型、白衣、脸部构图和朝向，同时新增黑色太阳镜，把背景改成雪山；两图中间有 `Let's go` 箭头标识。[TARGET-0051–0053] 作者据此评价“角色一致性保持得非常不错”，但单个前后例不能证明普遍稳定性。视频虽显示了清晰参数和状态，却没有显示生成按钮被点击、credits 被扣除、生成进度、History 写入或该结果记录，因而不能把相邻剪辑升级为一次可核验的运行因果。

### 三源同场景例

视频随后切到 ComfyUI 节点工作流。界面明确显示三个 `Load Image` 来源：`girl.jpg`、`dog.jpg`、`sofa.jpg`，经 `Image Stitch` 进入 `Flux.1 Kontext [pro] Image`。提示词为：

> The character is sitting cross-legged on the sofa, and the Dalmatian is lying on the blanket sleeping.

可见参数包括：`aspect_ratio=1:1`、`guidance=3.0`、`steps=50`、`seed=957601647357878`、`control after generate=randomize`、`prompt_upsampling=false`。拼接预览标示 `2428×1608`；结果窗标示 `1024×1024`，画面把女孩与斑点狗安排进 `sofa.jpg` 对应的室内沙发场景。[TARGET-0059–0063]

这里存在重要的载体冲突：旁白/SRT 说“让两张图的人物融合迁移到同一个场景”，更具体的 UI 却显示 `girl.jpg + dog.jpg + sofa.jpg` 三个来源。重建保留旁白原词，但按 UI 将可见操作描述为“两主体加场景”的三源合成；人物有两个，不等于来源只有两张。界面没有展示队列/执行动作、进度、耗时或错误处理。单图例与三源例也是同一推荐下的两个并列例子，前者输出没有成为后者输入。[CUE-007, TARGET-0059]

## 3. ThinkSound：视频转音频页面与成片式对照（00:28.833–00:44.880）

编号卡写 `3. thinksound`，网页标题是“ThinkSound：革命性的视频转音频AI生成平台”。页面副文案称它能把视频转换为同步音效、语音和沉浸式音景，并称由 ThinkSound 的先进神经网络和逐步推理能力驱动；还写“从无声视频到丰富的音效体验——通过智能视频音效合成革命化内容创作。”[TARGET-0065–0069]

`ThinkSound Demo` 页面写明可上传 `video`、`caption` 或 `CoT` 来生成音频，会把生成音频自动合并到原始静音视频，并支持灵活音频长度。界面可见 `Upload Video`、拖放/点击上传、`Status`、`Result` 和 `Share via Link`。[TARGET-0071] 但视频没有真实上传文件，也没有填写 caption/CoT、点击生成、显示进度、产出结果文件、下载或分享成功；这些页面文字和控件只建立页面自述的能力范围。

作者随后用同一位小提琴演奏者素材口头设置“没有音效”→“配完音效以后”的对照。对最终成片音轨做有界听检与语义分类后，可确认实际声音语义发生变化：

- 31.91–34.07 秒“前态”和 34.08–35.69 秒转折段以语音/音乐为主。
- 35.69–39.72 秒仍是小提琴演奏画面，且没有 SRT 语音；此段转为小提琴/弓弦主导，能听到持续音高和谐波随演奏变化。分类提案中 `Violin/fiddle=0.3914`、`Musical instrument=0.2502`、`Bowed string=0.0197`，而 `Speech=0.0075`。
- 39.72–44.88 秒快速切换液体入杯、持枪/火焰等样例，混音重新以语音/音乐为主，并出现 `bang`、`breaking`、`burst/pop` 以及较低置信的 `water`、`glass` 语义提案。[SRC-AUDIO, TARGET-0085, TARGET-0092, TARGET-0098]

这比“音轨非静音”更具体地建立了最终成片里的声音变化，也与小提琴后段的可见动作相符；但它仍不能证明作者所说的前态原始素材确实无声，不能确认任一声音来自 ThinkSound，也不能排除旁白、背景音乐或后期混音。视频没有分离音轨、原始/处理文件或生成日志，因此 ThinkSound 的生成因果、每段声音来源、同步精度与可泛化质量均保持未知。

## 全局关系与边界

三个工具只是按“第一、第二、第三”依次列出：BAGEL 展示自然语言图像编辑、风格标签与 3D 主张；FLUX.1 Kontext 展示单图编辑和三源同场景合成；ThinkSound 展示页面能力说明和成片式声音对照。没有 BAGEL → FLUX.1 Kontext → ThinkSound 的跨段输入输出或文件交接，因此不能把它们写成一条创作流水线。

结尾作者声称“三个 AI 都是开源的”并号召“赶紧冲”。这是 44.88 秒之后的作者全局主张；另对不同时间点已展示的产品页面作全片载体比较后，只有 BAGEL 页面本身写 `The Open-Source Unified Multimodal Model`，所见 FLUX.1 Kontext 与 ThinkSound 页面帧没有 open-source 自述。两类证据分属不同时间和载体，均不能替代许可证证据。完整 0–47.567 秒时间线也未观察到可点击链接、二维码、代码仓库、许可证、价格、账号/地区/硬件要求、支持实体或成功下载/导出证明。[TARGET-0006, TARGET-0036, TARGET-0065, CUE-012, TARGET-0110–0122]

视频中可见的石膏像、女性肖像、卡通女孩/狗、`sofa.jpg` 场景、小提琴演奏者、液体与持枪/火焰素材，以及 BAGEL、FLUX.1 Kontext 的各界面变体、ThinkSound、ComfyUI、`Let's go` 等标识，只能按可见角色记录；人物身份、素材来源、训练/输出授权和商用许可均未由视频建立。

## 开场到结尾

开场用“3个创意工具”承诺数量与用途；结尾用作者的“三个都开源”主张补充共同属性，再以“赶紧冲”把信息介绍转为行动号召。结尾强化了开场，但行动路径本身仍缺失。
