# Run notes

## Scope

本次只读取并使用以下任务输入：

- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/663ac5da000000001e03437a.mp4`
- 同 stem 的 `.srt`
- `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/holdout2-3d/evidence/evidence-pack.json` 及其帧
- `video-content-reconstruction` canonical skill、直接引用的 references 与 schemas

未读取既有报告、library、analysis、editorial-notes、audit、baseline、dev、其他 holdout 或 evaluation。

## Two-round workflow

Round one 完成 0–17.601 秒无间隙 carrier sweep，覆盖 8 个连续认知区段；另行执行 referent、boundary 与 absence audit。探针没有选择固定内容分类，而是从本视频的分屏头部、两套 UI、提示词、人物蒙太奇和评论区 CTA 生成协议。

Round two 初次执行 10 个 action，共得到 133 帧。ACT-005 原先使用 `before_during_after` 加 `densitySeconds`，捕捉脚本只生成三个锚点，不足以证明 8.4–12.1 秒的快速工具变化。协议随后把 ACT-005 改为 `motion_sequence`、0.15 秒密度并重跑；最终 manifest 含 10 个 action、156 帧。

## OCR and visual review

主 OCR 对 156 帧实际执行，得到 1246 行候选文本，0 个处理失败。因原始目标帧是 360×640，嵌入 UI 小字仍不可读，按协议从原视频生成 7 个放大裁剪并再次实际 OCR，得到 50 行候选文本，0 个处理失败。

高影响 OCR 复核记录：

- 主 OCR `OCR-00001` 提案为 `Ai实时画3D`（0.5）；画面字体采用大写样式，文章写作“AI实时画3D”。
- crop OCR `OCR-00007` 提案为 `Porsat of anoid man`（0.3）；放大帧人工读作 `Portrait of an old man`。
- crop OCR `OCR-00045` 提案为 `Porwat of an oid lacy/ with ckosed ipes.`（0.3）；放大帧人工读作 `Portrait of an old lady with closed eyes.`。
- crop OCR `OCR-00048` 与 `OCR-00050` 分别给出年轻男性提示词的两段错误提案（各 0.3）；放大帧人工读作 `Portrait of a strong young man with closed eyes and a red beard`。
- crop OCR `OCR-00023`/`OCR-00041` 把 `Generation successful!` 误识为 `Genetation successfull`/`Generation soccessfull`；人工核图修订。
- crop OCR `OCR-00042`/`OCR-00043` 把 `Refresh`/`Download` 误识为 `Reresh`/`Dwwnioal`；人工核图修订。
- crop OCR `OCR-00044` 为 `KRE`（0.5），与放大帧一致；画面被裁边，所以未补全为任何完整产品名。
- 左侧导航的 `Img to 3D`、`Text to 3D`、`Image AI`、`Texture AI`、`3D Library` 均由放大帧人工核图；对应 OCR 提案保留原误字，不静默替换。
- 绿色格式提示只能可靠读到 `Only use PNG or JP…`，全文保持未知。

## Audio-channel decision

媒体元数据显示 AAC、44.1 kHz、stereo 音轨。`silencedetect`（-45 dB、0.15 s）未输出静默段；`volumedetect` 得到 mean volume -16.3 dB、max volume 0.0 dB。该检查只确认全片有音频活动，不能可靠分离旁白、背景音乐或音效，因此非语音音轨被记录为已检查但语义角色未知。

## Referent, boundary, and absence audit

- 账号名、平台标识、右上栏目标签和 `AI FOR WORKERS` 属于外层编辑/账号语境，不等于工具品牌。
- 分屏界面只露出 `KRE` 残片；单头生成界面 Logo/站点名不可读。二者不能合并为同一产品。
- 英文人物提示词是可见输入条件，限制了“只画几笔”的更强表述。
- 单头界面确实显示 `Generation successful!`、Refresh、Download、Upgrade、Credits/Est. Time；因此 absence audit 没有声称“无下载控件”。未知的是点击、落盘、外部访问路线、价格和账户条件。
- 结尾格架/近景中至少四个可辨头部主体；前三个主要近景为年长女性、年轻女性和年长灰胡子男性，另有格架中的红胡子男性。人物身份、来源、授权和生成归因均未建立。
- 全片与收尾专门检查中未观察到评论区工具包的完整产品名、URL、二维码、外部下载入口、价格、明确平台要求、地区、支持责任或许可。此结论仅限所检视视频范围，不外推评论区或互联网。

## Output boundary

仅生成 probe、capture protocol、targeted evidence、实际 OCR、reconstruction、article、run notes 和 schema validation。未生成 evaluation、gate-report 或任何 readiness 宣告。

