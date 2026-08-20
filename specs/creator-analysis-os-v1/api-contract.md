# Creator Analysis OS — API 与页面读模型合同

状态：**Confirmed；V1 read projections 已实现，command envelope 仍按迁移阶段兼容旧路径**
适用范围：单视频研究、单博主研究、多博主比较。发帖与复刻工作区不在本合同内。

## 1. 目标

API 不把文件夹结构直接暴露给前端，而是提供稳定的研究对象、分析版本、证据引用和任务状态。

前端应当能够回答：

- 当前看到的是哪个对象、哪次采集、哪版分析；
- 数据是否完整、是否过期、哪些结论仍是未知；
- 每个判断能否回到原帖、字幕、时间码、截图或指标快照；
- 后台任务进行到哪一步，是否需要用户接管登录；
- List 与 Gallery 是否来自同一份 21 条 canonical 数据，而不是两套结果。

## 2. API 原则

1. 公共接口使用 `/api/v1`，破坏性变更才升级版本。
2. 命令与查询分开：命令创建或推进工作；查询读取稳定投影。
3. 所有研究响应携带 `analysisRevisionId`、`sourceSnapshotIds`、`freshness` 与 `gateStatus`。
4. 不返回本地绝对路径、登录态、Cookie、密钥或浏览器配置。
5. 大媒体与大证据文件通过 Artifact Gateway 按 artifact ID 读取，不在 JSON 中内嵌。
6. 长任务返回 run ID；进度使用 SSE，不用前端高频轮询。
7. 列表采用 cursor pagination；筛选条件可写入 URL，便于分享和恢复。
8. 同一个 revision 下，Summary、List、Gallery、Evidence Drawer 必须由同一 read model 生成。

本地实现的 SSE 地址为 `GET /api/creator-runs/{runId}/events/stream`；Dashboard
收到追加事件后刷新同一 projection，断线不会改变任务本身，重新打开页面即可恢复。

## 3. 通用响应信封

```json
{
  "data": {},
  "meta": {
    "requestId": "req_...",
    "generatedAt": "2026-08-20T12:00:00+08:00",
    "analysisRevisionId": "ar_...",
    "sourceSnapshotIds": ["snap_..."],
    "freshness": {
      "state": "fresh",
      "observedAt": "2026-08-20T10:30:00+08:00",
      "staleReasons": []
    },
    "gateStatus": {
      "state": "ready",
      "failedGateIds": [],
      "unknownCount": 6
    }
  }
}
```

`freshness.state`：`fresh | stale | partial | unknown`。
`gateStatus.state`：`draft | blocked | failed | ready`。

## 4. 命令接口

### 4.1 创建研究任务

`POST /api/v1/research-runs`

```json
{
  "objectType": "creator",
  "platform": "xiaohongshu",
  "input": {
    "url": "https://www.xiaohongshu.com/user/profile/..."
  },
  "requestedDepth": "portfolio",
  "refreshPolicy": "reuse_if_fresh"
}
```

`objectType`：`video | creator | comparison`。
`requestedDepth`：视频使用 `metadata | reconstruction`；博主使用 `profile | corpus | portfolio`；多博主使用 `comparison`。

响应：

```json
{
  "data": {
    "runId": "run_...",
    "objectId": "creator_...",
    "state": "queued",
    "deduplicated": false
  }
}
```

同一 fingerprint 的有效任务存在时，不重复采集；返回已有 run，并将 `deduplicated` 设为 `true`。

### 4.2 刷新采集

`POST /api/v1/creators/{creatorId}/refreshes`

```json
{
  "scope": "metrics",
  "reason": "owner_requested"
}
```

`scope`：`profile | posts | metrics | comments | all`。刷新产生新 snapshot，不覆盖旧 snapshot。

### 4.3 创建多博主比较

`POST /api/v1/comparisons`

```json
{
  "name": "小红书 AI 职场内容样本",
  "creatorRevisionIds": ["car_1", "car_2", "car_3", "car_4"],
  "comparisonQuestionIds": [
    "positioning",
    "audience_value",
    "content_system",
    "performance_structure",
    "visual_language",
    "trust_and_commercialization"
  ]
}
```

比较必须固定到具体 creator revision；后续博主更新不会静默改写既有比较结果。

当前实现接受 `name + creatorRunIds`，服务端在创建时立即解析并固定对应的
`portfolioArtifactRef + selectionArtifactRef`，再由持久 Worker 生成不可变比较 artifact。
`/api/comparison-projects` 保留为本地旧客户端兼容别名。

### 4.4 任务控制

- `POST /api/v1/runs/{runId}/resume`
- `POST /api/v1/runs/{runId}/retry`
- `POST /api/v1/runs/{runId}/cancel`
- `POST /api/v1/runs/{runId}/handoff-complete`

`retry` 只重跑失败节点及其失效的下游。`cancel` 不删除既有 snapshot、artifact 或 revision。

## 5. 查询接口

### 5.1 研究首页

`GET /api/v1/research-home`

返回最近对象、进行中任务、被阻塞任务、过期提醒和已完成研究。它是控制面，不是分析报告。

### 5.2 单视频

`GET /api/v1/creators/{creatorId}/videos/{videoId}?run={creatorRunId}`

视频属于博主研究上下文，URL 保留返回博主的稳定路径；`run` 只用于固定历史重建版本。

核心 read model：

```ts
type VideoResearchView = {
  identity: VideoIdentity;
  sourceStatus: SourceStatus;
  contentUnderstanding: {
    oneSentence: string;
    audienceChange: string[];
    coreKnowledgeUnits: KnowledgeUnitView[];
    argumentGraph?: ArgumentGraphView;
    procedureGraph?: ProcedureGraphView;
    limitations: UnknownView[];
  };
  transcript: TranscriptCueView[];
  timeline: TimelineSegmentView[];
  frames: { sparse: FrameView[]; dense: FrameView[] };
  evidenceCoverage: CoverageView;
  annotations: AnnotationSummary;
};
```

单视频页只解释“这条视频说了什么、如何表达、证据是什么”；不输出“我们应复制什么”。

### 5.3 单博主总览

`GET /api/v1/creators/{creatorId}`

```ts
type CreatorResearchView = {
  identity: CreatorIdentity;
  positioning: {
    valueProposition: string;
    audience: string[];
    audienceValue: string[];
    problemsAddressed: string[];
    trustSources: TrustSource[];
    lifecycleStage: LifecycleStageAssessment;
    commercialPaths: CommercialPathAssessment[];
  };
  corpus: CorpusCoverage;
  performance: PerformanceOverview;
  contentSystem: ContentSystemView;
  formatSystem: FormatSystemView;
  publishingPattern: PublishingPatternView;
  portfolio: PortfolioView;
  conclusions: CreatorConclusionView[];
  limitations: UnknownView[];
};
```

### 5.4 21 条 canonical 表现集

`GET /api/v1/creators/{creatorId}/portfolio`

Query：

- `view=list|gallery`
- `tier=high|base|low`
- `anchor=all|median_near|mean_near`
- `topic=...`
- `format=...`
- `sort=likes_desc|published_desc|distance_to_anchor`

List 与 Gallery 返回相同的 `items`，只允许 presentation 不同。

```ts
type PortfolioItem = {
  postId: string;
  tier: "high" | "base" | "low";
  anchors: Array<"median_near" | "mean_near">;
  deepSample: boolean;
  title: string;
  coverArtifactId?: string;
  publishedAt?: string;
  durationMs?: number;
  metrics: MetricSnapshotView;
  topicMechanism: string;
  formatMechanism: string;
  hookMechanism: string;
  proofMechanism: string;
  contentArchitecture: string[];
  performanceExplanation: EvidenceBoundExplanation;
  evidenceRefs: EvidenceRef[];
  videoResearchRevisionId?: string;
};
```

`deepSample=true` 标记高／中／低各 3 条深度样本；它们仍是 21 条中的成员，不另建第二套选择逻辑。

### 5.5 多博主比较

`GET /api/v1/comparisons/{comparisonId}/dossier`

```ts
type ComparisonView = {
  members: ComparisonMemberView[];
  corpusCompatibility: CompatibilityAssessment;
  dimensions: ComparisonDimensionView[];
  archetypes: CreatorArchetypeView[];
  similarities: EvidenceBoundConclusion[];
  differences: EvidenceBoundConclusion[];
  marketMap: MarketMapView;
  blindSpots: UnknownView[];
};
```

比较页只能比较有共同定义的数据。样本窗口、指标时间和采集完整度不兼容时，必须显示 `not_comparable`，不能强行排名。

`GET /api/v1/comparisons/{comparisonId}` 保留项目状态与底层不可变比较 artifact；前端研究页只读取 `/dossier` 投影。

### 5.6 证据与来源

- `GET /api/v1/evidence/{evidenceId}`：返回证据元数据和安全展示入口。
- `GET /api/v1/artifacts/{artifactId}/content`：流式读取允许展示的 artifact。
- `GET /api/v1/revisions/{revisionId}/lineage`：返回 snapshots、上游 revisions、skill/model/schema 版本与 gates。

Artifact Gateway 必须校验 artifact visibility；浏览器 session、原始 Cookie、密钥和私有诊断文件永不通过该接口暴露。

### 5.7 任务状态

- `GET /api/v1/runs/{runId}`
- `GET /api/v1/runs/{runId}/events`（SSE）

SSE 事件：`run.started`、`node.started`、`node.progress`、`node.blocked`、`handoff.required`、`artifact.produced`、`gate.completed`、`run.completed`、`run.failed`。

每个事件都带单调递增 `sequence`，前端断线后可用 `Last-Event-ID` 恢复。

## 6. 错误合同

```json
{
  "error": {
    "code": "AUTH_HANDOFF_REQUIRED",
    "message": "需要在已打开的浏览器中完成登录后继续。",
    "retryable": true,
    "runId": "run_...",
    "details": {
      "platform": "xiaohongshu",
      "handoffState": "waiting_for_owner"
    }
  }
}
```

稳定错误码至少包括：`INVALID_INPUT`、`UNSUPPORTED_PLATFORM`、`AUTH_HANDOFF_REQUIRED`、`SOURCE_NOT_FOUND`、`SOURCE_RATE_LIMITED`、`SOURCE_ACCESS_DENIED`、`ARTIFACT_MISSING`、`ANALYSIS_BLOCKED`、`GATE_FAILED`、`REVISION_CONFLICT`、`NOT_COMPARABLE`。

错误消息面向普通用户说明“发生了什么、是否需要操作、从哪里继续”，技术栈追踪只进入受限日志。

## 7. 并发、幂等与版本

- 命令支持 `Idempotency-Key`。
- 可编辑资源使用 `ETag` / `If-Match`，避免覆盖他人标注。
- analysis revision 发布后不可原地修改；修订产生新 revision。
- API 返回 `schemaVersion`，前端只读取兼容版本。
- 删除对象默认做 archive；实际清理 artifact 需单独保留策略和明确确认。

## 8. 前端投影规则

页面不自行重算业务结论：

- 服务端生成 `VideoResearchView`、`CreatorResearchView`、`PortfolioView`、`ComparisonView`；
- 前端只做筛选、排序、折叠、List/Gallery 切换与 evidence drawer；
- 统计口径、High/Base/Low 分档、median/mean anchor、深度样本身份在 revision 内冻结；
- 导出的静态 HTML 也从同一 projection 生成，明确显示 revision 和生成时间；
- 静态导出是快照，不是新的事实来源，也不回流覆盖 canonical 数据。

## 8.1 当前 V1 路由收敛

| 研究层级 | 唯一页面 | 唯一 read projection |
| --- | --- | --- |
| 单视频 | `/creators/:creatorId/videos/:videoId` | `/api/v1/creators/:creatorId/videos/:videoId` |
| 单博主 | `/creators/:creatorId` | `/api/v1/creators/:creatorId` |
| 多博主 | `/comparisons/:comparisonId` | `/api/v1/comparisons/:comparisonId/dossier` |

`/creator-runs/:id` 与 `/benchmark` 仅做页面重定向，不再拥有独立 read model。旧静态 Artifact 只在服务端兼容适配器内转换为同一 V1 schema；旧 `/api/creators/:id`、旧视频 API 和旧 benchmark API 已移除，避免平行真相。

## 9. 暂不进入 V1 的接口

- “复制这个机制”或“一键生成下一条”；
- 发布、排期、评论互动；
- 自动替用户进行需要确认的浏览器登录；
- 无证据的跨博主综合评分；
- 公开分享私有原媒体或登录态证据。
