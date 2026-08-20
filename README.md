# Signal Room — Self-Media Intelligence

一个本地优先的小红书 / X 内容情报工作台。输入公开链接或博主主页后，系统按“采集 → 基本盘 → High / Base / Low 代表集 → 视频内容还原 → 跨档诊断”运行，保存可公开复核的证据，并生成可在 Dashboard 中审计的内容复盘档案。发帖与创作决策属于未来独立工作区，不混入客观研究页面。

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

- `src/modules/orchestration/`：任务、租约、事件和执行器合同；
- `src/modules/creator-research/`：博主研究状态机和 Worker；
- `src/modules/portfolio/`：可复算的全量统计、平均/中位锚点与 21 条选择合同；
- `src/modules/video-analysis/`：对接 `video-content-reconstruction` 的输入、阻塞与硬闸结果合同；
- `src/modules/media-resolution/`：临时媒体地址消费、本地完整性校验与无签名清单；
- `src/modules/creator-synthesis/`：21 条与 9 条硬闸后的研究归纳合同；
- `src/modules/comparison/`：固定 revision 的比较项目、后台 Worker 与账号内部归一化分析；
- `src/platform/database/`：SQLite 持久账本；
- `src/platform/artifacts/`：可替换的本地 Artifact Store；
- `src/platform/browser/`：ego-browser 适配器；
- `src/platform/media/`、`video/`、`synthesis/`：媒体、重建/独立评审、账号归纳适配器；
- `src/platform/network/`：只读取当前系统代理并传给子进程，不改变系统设置；
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

在仓库根目录启动一个静态服务：

```bash
python3 -m http.server 4321
```

主要入口：

- `artifacts/creator-research/ai-red-witch/selected-high-like/report.html`
- `artifacts/creator-research/zhang-zala-v1/dashboard/index.html`

第一个入口已经把张咋啦作为“对标博主”模块合并进同一个 Dashboard。

## 真实平台说明

- 小红书公开信息采集使用本机 `ego-browser` 的独立任务空间并复用用户登录状态；详情链接的临时签名与会话信息只保留在本地，不进入 Git 仓库。
- X 复用本机 `twitter-mcp` 的只读 API 配置，或环境变量 `TWITTER_API_KEY`；分析会尽力补采回复、作者时间线和同题材搜索样本。
- 采集不可用时任务会停在“待授权”，不会补造指标、评论或内容。
- 公开链接通常无法提供曝光、停留、完播、流量来源与关注转化。缺少这些账号后台指标时，报告会把“平台分发”和“真实留存”标为未知，不会把相关假设伪装成结论。
- 平台口径按可获得字段分别计算：小红书不把 X 的“引用”当缺失，X 也不把不可得的收藏字段计为零；旧版档案需要重新分析后才会进入新版数据视图。

数据默认写入 `.runtime/self-media.sqlite`，每次分析的原始响应、抽帧与报告位于 `.runtime/runs/<run-id>/`。Notion 只作为后续同步/阅读端，不是数据真相源。

## 仓库边界

原始视频、音轨、平台临时签名、登录信息、模型权重与可重新安装的依赖不会提交。仓库保留源码、结构化数据、文字稿、OCR、关键帧、报告和可复现脚本。
