# Backend Contract · Signal Room API 与数据层契约 v1

> 2026-08-17。与 `contract-v2.md`（前端产品合同）同级的后端真源文档。
> 记录 API 契约、数据模型、真相源边界与已收口的实现分叉。
> 变更留 changelog；实现与本文档分叉时，改文档或改实现必须二选一并留痕。

## 1. 真相源边界（谁是 authority）

| 域 | 真相源 | 说明 |
|---|---|---|
| 单帖分析（runs） | `.runtime/self-media.sqlite`（AnalysisService） | 有状态任务，走 DB |
| 博主研究（creators/console/benchmark/evidence） | `artifacts/creator-research/**` 文件 | 分析产物即证据，只读聚合，绝不写回 |
| 设计真源 | `specs/creator-product-frontend/`（Notion 接入前） | 图/合同/spec |
| 运行时媒体 | `.runtime/runs/<id>`（git 忽略） | 原始响应/抽帧 |

**规则**：研究台 API 是 artifacts 的只读投影；任何"补数据"必须产生新的 artifacts 文件（脚本入 `scripts/`），不许 API 层内计算后即弃（benchmark 的收藏/点赞比是聚合读数，允许在 API 层现算，但口径必须写进响应体）。

## 2. API 契约

版本前缀：**当前无**。首个破坏性变更引入 `/api/v1` 并保留旧前缀一个发布周期。

```
GET /api/creators                总览卡片（2 个活跃 IP；张咋啦按 Owner 决定不在总览）
GET /api/creators/:id            研究台数据（见 §3 数据健康）
GET /api/creators/:id/videos/:videoId   视频证据（见 §4 契约分叉收口）
GET /api/benchmark               跨 IP 对比（含 metricNote 口径声明）
GET /api/runs*                   单帖分析（既有，不在此次范围）
静态 /research/*  /designs/*     artifacts 与设计图（JSON no-cache；SPA index no-cache）
```

响应约定：资源不存在 → 404 `{error}`；数据缺失 ≠ 404——缺失是资源的一部分（§3）。

## 3. 数据健康（状态是一等公民）

研究台每节携带健康对象，前端状态徽标由它渲染，后端不发明自由文本状态：

```ts
type DataHealth = { status: "full" | "partial" | "missing"; reason: string; capturedAt: string | null }
```

| 节 | full | partial | missing |
|---|---|---|---|
| baseline | 数字+分布+均值诊断齐全 | 有数字但分布口径受限（如 21 条分层样本非全量） | 无任何可算数据 |
| tiers | 分档+结论+视频列表 | 分档有但视频明细缺失 | 未分档 |
| rhythm | 星期+时段齐全 | 仅星期或仅时段 | 无发布时间字段 |
| launch | 方案数据齐全 | 仅链接到原报告 | 无 |

前端契约：`Missing` 组件只消费 `DataHealth`；新增"部分覆盖"徽标用 `partial` + reason。

## 4. 已收口的实现分叉（不再假装 schema 是权威）

**视频证据契约**：`video-contract-schema.json` v1 的 `transcript.cues` 假设来自
reconstruction/evidence-pack，实际实现从**官方字幕 .srt** 解析（两个 IP 都有，
红发魔女 7 句/样本、人类最强编导 53 句/样本）。**决定：以真实数据源为准**——
schema 已更新为 v1.1：`cues.source = "srt"`，frames.source 标注 video-library 帧目录；
reconstruction 的 cue↔帧对齐作为 future 字段（needs-backend），不虚构。

**张咋啦在对比台但不在总览**：显式声明为产品行为（对比台是全量已分析 IP，
总览是 Owner 选定的活跃研究集），不是 bug。

## 5. 债清单（本轮执行状态）

| # | 项 | 状态 |
|---|---|---|
| 1 | 数据健康字段化（baseline/rhythm 的 xxxMissing 字符串 → DataHealth） | 本轮做 |
| 2 | creators.ts / console.ts 读取合并为单一 loader 注册表 | 待做 |
| 3 | 视频 schema v1.1 对齐实现（§4） | 本轮做 |
| 4 | artifacts 读取 mtime 缓存 | 待做（量小，收益低，不阻塞） |
| 5 | /api/v1 前缀 | 不做（无破坏性变更需求，见 §2） |

## Changelog

- 2026-08-17 v1：初版。收口视频契约分叉（srt 为准）；张咋啦对比台行为显式声明。
