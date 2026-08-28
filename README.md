# Signal Room — Self-Media Intelligence

> 文档入口：[Signal Room Documentation](docs/index.md)。仓库架构重构由
> [GitHub Issue #13](https://github.com/cyl19970726/self-media-content-intelligence/issues/13)
> 分阶段跟踪；目标目录不代表当前代码已经完成迁移。

一个本地优先的小红书 / X 内容情报工作台。输入公开链接或博主主页后，系统按“采集 → 基本盘 → High / Base / Low 代表集 → 视频内容还原 → 跨档诊断”运行，保存可公开复核的证据，并生成可在 Dashboard 中审计的内容复盘档案。发帖与创作决策位于独立的 Creation Workspace，不混入客观研究页面。

当前仓库同时包含：

- 单条帖子、多条帖子和博主级分析前端；
- AI 红发魔女的 331 条公开作品盘面与 21 条逐条分析；
- 张咋啦的 62 条作品基本盘，以及高表现、中位、平均值附近、低表现各 3 条的证据级还原；
- 完整文字稿、字幕 cue、代表帧、重叠镜头、OCR、知识单元与未知边界；
- `analyze-creator-videos` 与 `video-content-reconstruction` 流程产物、PRD、数据模型、线框和评测记录。

三个正式 Skill 已镜像在 `skills/`，包含指令、数据契约、可复用脚本、Dashboard 模板、fixtures 与验证器：

- `analyze-creator-videos`：全量作品基本盘、分层选样、跨档比较与博主研究 Dashboard；
- `video-content-reconstruction`：两轮探针、动态捕捉协议、逐字稿/画面/OCR/流程/论证还原与硬闸评测；
- `deep-content-director`：把证据化研究转成选题、脚本、镜头、交付、实验与发布复盘指令。

Report v2 不把“高点赞”直接写成成功原因，而是拆成六层：

- **证据覆盖**：区分公开数据、同作者/同题材样本和账号后台数据，明确未知项。
- **相对表现**：计算作者基线与题材基线的中位数、样本内分位和样本量，不虚构全平台百分位。
- **数据观察台**：拆解互动构成、每千浏览、收藏/点赞、分享/点赞、评论/点赞、作者/题材提升倍数、粉丝触达和生命周期日均速度；每项显示公式与分子分母。
- **创意 X 光**：分析标题承诺、受众、冲突、脚本功能段、论点/证据密度、镜头边界与语速。
- **受众声音**：把评论聚为追更、质疑、执行反馈、提问和认可，并保留代表原话。
- **因果审计**：每个“为什么火”结论同时列出证据、反证、替代解释和置信度。
- **研究边界**：研究页只说明原内容、表现与证据，不生成“我们复制什么”或“下一条怎么发”；这些属于独立的 Creation Workspace。

## 启动

```bash
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:5173`。点击“填入完整演示样例”可在没有平台授权的情况下验证整条链路。

生产构建可使用 `npm run build && npm start`，随后打开 `http://127.0.0.1:4310`。详情页地址为 `http://127.0.0.1:4310/runs/<run-id>`。

**博主研究总览**：`http://127.0.0.1:4310/creators` —— 可直接粘贴小红书博主主页。服务器会把任务写入持久队列，由后台 ego-browser Worker 完成登录预检和公开作品清单采集；遇到登录或验证码时，任务停在 `needs_user` 并从同一页面恢复。现有已完成档案继续从 `/research/*` 只读提供，迁移期间不会被覆盖。

当前自动闭环覆盖“创建任务 → Worker 租约/心跳 → ego-browser 采集 → 冻结清单 → 全量统计 → High / Base / Low 统一 21 条 → 21 条详情与本地封面 → 9 条媒体校验 → 视频候选重建 → 独立评审与定向修复 → 博主综合 → 同一 Dashboard 的 List/Gallery 投影”。任一深度视频未通过硬闸时，博主综合不会发布。多博主比较使用独立持久 Worker，并在创建项目时固定每位博主的 Portfolio 与选择集 revision。运行只会在证据实际到位的阶段标为 `reviewable` 或 `ready`。

代码边界：

- `apps/web/`、`api/`、`worker/`、`cli/`：四个可执行入口；API 默认内嵌
  Worker 以保持现有启动行为，也可用 `npm run worker` 独立运行 Worker；
- `src/server/composition-root.ts`：当前唯一的持久服务、平台 Adapter 与
  Worker 组装入口；
- `src/server/routes/`：按 Publishing、Knowledge 和 Learning Loop 拆分的
  HTTP 路由注册；
- `packages/contracts/`：浏览器与服务端共享的 DTO、事件和 Zod schema；
- `packages/research/`：博主研究、组合比较、知识学习、Learning Loop、选样与视频硬闸；
- `packages/knowledge/`：知识贡献、概念关系、绑定、假设与实践验证；
- `packages/creation/`：内容包、平台版本、发布状态机、审批闸门与 Worker；
- `packages/runtime/`：Worker/Resource 生命周期与可靠关闭；
- `packages/adapters/`：SQLite、Artifact、Ego Browser、RedFox、媒体、模型与进程适配；
- `packages/testkit/`：内存 ports、确定性 Artifact Store 与合同测试工具；
- `src/core/creator-research-*`：迁移期兼容入口。

## CLI

```bash
# 完整可复现演示
npm run selfmedia -- analyze fixture://xiaohongshu/three-layer-demo

# 分析真实链接；本地视频可用于补充拉片
npm run selfmedia -- analyze "<小红书或 X 链接>" --video /absolute/path/video.mp4

# 查询档案
npm run selfmedia -- list
npm run selfmedia -- report <run-id> --json
npm run selfmedia -- retry <run-id>

# 从真实报告数据生成一份自包含的视觉验收页
npm run qa:report -- <run-id>
```

## 博主研究 Dashboard

配置外部 Evidence 并启动工作台：

```bash
SIGNAL_ROOM_EVIDENCE_ROOT=/absolute/path/to/self-media-evidence npm run dev
```

主要入口是 `http://127.0.0.1:5173/creators`。历史静态研究文件通过
API 的只读 `/research/...` 兼容路径提供，例如：

- `/research/ai-red-witch/selected-high-like/report.html`
- `/research/zhang-zala-v1/dashboard/index.html`

第一个入口已经把张咋啦作为“对标博主”模块合并进同一个 Dashboard。

## 创作发布工作台

打开 `http://127.0.0.1:5173/creation`。工作台支持内容包、小红书图文/视频、抖音视频、微信视频号视频、B 站视频和微信公众号一张图版本，以及稳定本地素材路径、发布任务和追加事件账本。所有平台统一使用 Ego Browser；公众号只保存带 `appmsgid` 验证的草稿，最终发表保持人工操作。

发布采用安全的两段式流程：Worker 先在继承用户登录态的独立 ego-browser TaskSpace 中上传素材并填写表单，然后把页面交给用户检查；只有用户在工作台确认冻结的 revision 后，Worker 才会恢复同一 TaskSpace 并点击一次最终发布按钮。登录、验证码和平台提示进入 `needs_user`；提交后无法验证结果时进入 `submission_unknown`，系统不会自动重试。

## 真实平台说明

- 小红书公开信息采集使用本机 `ego-browser` 的独立任务空间并复用用户登录状态；详情链接的临时签名与会话信息只保留在本地，不进入 Git 仓库。
- X 复用本机 `twitter-mcp` 的只读 API 配置，或环境变量 `TWITTER_API_KEY`；分析会尽力补采回复、作者时间线和同题材搜索样本。
- 采集不可用时任务会停在“待授权”，不会补造指标、评论或内容。
- 公开链接通常无法提供曝光、停留、完播、流量来源与关注转化。缺少这些账号后台指标时，报告会把“平台分发”和“真实留存”标为未知，不会把相关假设伪装成结论。
- 平台口径按可获得字段分别计算：小红书不把 X 的“引用”当缺失，X 也不把不可得的收藏字段计为零；旧版档案需要重新分析后才会进入新版数据视图。

数据默认写入 `.runtime/self-media.sqlite`，每次分析的原始响应、抽帧与报告位于 `.runtime/runs/<run-id>/`。Notion 只作为后续同步/阅读端，不是数据真相源。

## 仓库边界

原始视频、音轨、文字稿、OCR、关键帧、研究报告、平台临时签名、登录信息和模型权重都不会进入代码仓库。仓库只保留源码、Manifest、尺寸受控的 Fixtures、精选 Examples 和可复现脚本；研究 Evidence 由 `SIGNAL_ROOM_EVIDENCE_ROOT` 指向的独立存储持有。
