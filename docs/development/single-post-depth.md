# 单帖深度分析扩展

本扩展沿用 video-reconstruction-2.0 与原三个 Builder Lens，以 depthContractVersion: single-post-depth@1 标记新增合同。旧报告仍可读；没有新增字段时显示未产出，不从探查、作者综合报告或旧知识单元补写 Builder 结论。

## 数据链路

视频任务把既有详情、选择和媒体 Manifest 引用交给执行器。宿主冻结 post-source-input.json，复制并指纹校验独立封面；缺失来源保持 missing。准备阶段把前 min(10, duration) 的 0.5 秒帧及标时联络图加入 evidence pack，再生成冻结指纹。复用机器字幕时保留机器来源。需要更精确的意义边界仍由 Builder 定向补取，不把固定采样点宣称为精确切点。

Builder 在 visualEditing.openingAnalysis 中逐段写出原口播/ASR提案、烧录字幕、构图、运动、音频作用、证据出现、观众问题、意义变化与时间冲突；在 directingLogic.packagingAnalysis 中分别分析标题、独立封面、首帧与正文兑现。API 仅投影原字段与引用，页面在对应结论旁展示帧条、字幕和来源链接。

机械检查拒绝空洞、重叠、越界帧、缺少连续帧支撑、缺失来源却写结论、首帧冒充封面、无证据的兑现。连续帧要求相邻引用不超过 1 秒且首尾距分段边界不超过 0.55 秒；这只是证据覆盖下限，不证明语义正确。BUILT_UNEVALUATED 明确表示未独立评估，不能代替真实源对照验收。

表现分析复用既有 Portfolio 分位数计算，新增逐条排除与每项指标分母：目标、自有、置顶、重复、非视频/类型未知，以及置顶或自有归属未核验者不纳入。旧库存没有这些标记时不会直接沿用旧中位数。收藏/点赞比与曝光互动率分别显示；题材样本、曝光、留存、年龄匹配缺失均保留未知，不推断因果。

## 本地复现入口

依赖现有 Node、FFmpeg、Python jsonschema，以及用于标时联络图的 Pillow。使用本地 Codex 登录态运行生产执行器，开发取证时显式保留会话：

```sh
SELF_MEDIA_CODEX_EPHEMERAL=false npx tsx scripts/reconstruct-local-video-depth.ts \
  --video /absolute/path/video.mp4 --subtitles /absolute/path/subtitles.srt \
  --subtitle-origin machine_transcription \
  --source-url 'https://www.xiaohongshu.com/explore/POST_ID' --post-id POST_ID \
  --source-facts /absolute/path/post-source-facts.json --cover /absolute/path/independent-cover.png
```

source-facts 使用现有 post-source-facts@1 合同。字幕、事实文件和封面均可省略；省略事实时来源类型也保持未知，不能从文件扩展名伪造平台类型。不要把首帧传作独立封面。

完成后，以输出的 runId/postId 登记到正常 SQLite/API；登记脚本会重新检查宿主完整性，并拒绝已有 development-qa 拒绝记录的候选：

```sh
npx tsx scripts/register-local-video-depth.ts --run-id RUN_ID --post-id POST_ID --creator-label '已核对的作者显示名'
SELF_MEDIA_PORT=4317 SELF_MEDIA_EMBED_WORKERS=false NODE_ENV=production npx tsx apps/api/src/main.ts
```

另一个终端运行 `SELF_MEDIA_API_URL=http://127.0.0.1:4317 npx vite --host 127.0.0.1 --port 5177`。页面地址由登记脚本输出，使用本机 5177 端口；4317 提供实际 API 和证据文件。单帖登记不代表取得作者主页，不启动全量采集。请保留登记说明中的身份和样本缺口。

## Trace 与审计边界

每次子进程保存私有 worker-traces 目录中的 prompt、JSONL 工具事件与错误输出，并在运行目录保存 trace 指针。临时会话模式仍可保存这些本地执行事件；完整 session-forensics rollout 需要 SELF_MEDIA_CODEX_EPHEMERAL=false。媒体、封面、机器产物与 trace 仅存忽略的运行目录，不提交仓库。

真实回归中的前两版均因视听分段问题被拒绝。第二版即使机械检查通过也未登记为合格样本；这是机械合同与语义验收之间的明确边界。最终样本、截图和运行结果见本地运行目录与交付记录。
