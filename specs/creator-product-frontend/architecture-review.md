# Architecture Review · Signal Room 完整架构审查 v1

> 2026-08-17。审查范围：产品/前端/后端/数据层/文档架构。
> 分级：A = 已修（本轮）· B = 计划修 · C = 接受（记录理由）。

## A 级（不合理，已修）

| # | 问题 | 证据 | 修法 |
|---|---|---|---|
| A1 | creators.ts / console.ts 重复解析层 | 两份 asRecord/asString/asNumber/readJson（4+5 处重复） | 提取 `src/server/creator-meta.ts` 共享 readers + helpers，两文件只写 loader 逻辑 |
| A2 | 硬编码数字与文案双份 | "19"/"21" 数字写死；positioning 文案在 creators/console 各写一遍 | 数字由 artifacts 计算（`videoEvidenceCount`/`redWitchFocusCount`）；positioning 常量唯一化（`positioningOf`） |
| A3 | contract-v1 无 DEAD 标记 | v1 头部仍写"草稿待 Owner 确认"，与 v2 取代事实矛盾 | v1 头部标 DEAD + "被 contract-v2 取代，仅存档" |
| A4 | montage 生成是手工 heredoc | scripts/ 只有 measure-design.py | `scripts/make-montage.py` 入仓，可复测 |

## B 级（不合理，计划修，不阻塞）

| # | 问题 | 计划 |
|---|---|---|
| B1 | 静态报告页（/research 的旧 HTML）与 React 研究台并存，两套入口体系 | 显式声明为"证据兼容层"：React 证据页逐步吸收（frames/cues 已吸收，knowledge 结构化后迁移），旧 HTML 保留到迁移完成 |
| B2 | styles.css 单文件 1200+ 行 | 拆分为 tokens / shell / console / benchmark / evidence 分片（CSS 变量已在 :root） |
| B3 | shared/schema.ts 单文件含 runs+creators 两域 schema | 按域拆分 schema-run / schema-creator |

## C 级（审查后接受）

| # | 项 | 理由 |
|---|---|---|
| C1 | benchmark 收藏/点赞比在 API 层每次现算（无缓存） | 数据量小（21+62+19 行），backend-contract 已声明"聚合读数允许现算"，缓存收益低于失效风险 |
| C2 | /api 无版本前缀 | 无外部消费者；backend-contract 已声明"首个破坏性变更引入 v1" |
| C3 | 张咋啦在对比台但不在总览 | 产品行为（Owner 决定），backend-contract §4 已显式声明 |
| C4 | knowledgeUnits 由 keyPoints 映射（title==statement） | 数据源局限；video schema v1.1 已标 needs-backend，不伪造置信度 |
| C5 | React 壳与 4321 静态服务并存 | README 明确 4310 为产品入口，4321 为遗留阅读流，暂不合并 |

## 审查后的架构定论

```
产品层   /creators → /creators/:id → /benchmark + /creators/:id/videos/:videoId（React 壳）
数据层   artifacts/creator-research/**（真相源，只读）
聚合层   server/creator-meta.ts（共享 readers）+ creators.ts（卡片 loader）+ console.ts（研究台/对比/证据 loader）
契约层   specs/creator-product-frontend/{contract-v2, backend-contract, visual-spec-v1, video-contract-schema.json}
兼容层   /research 静态（旧报告 HTML，B1 计划收敛）
```

## Changelog

- 2026-08-17 v1：A1-A4 修复落地；B/C 分级记录。
