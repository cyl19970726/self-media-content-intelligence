# 原帖事实层设计

```mermaid
flowchart LR
  A[主页卡片\n全量轻采集] --> F[Post Source Facts]
  B[详情页面\n21 条补全] --> F
  C[本地媒体证据] --> F
  F --> D[Builder]
  F --> E[单帖 / 单博主页面]

  classDef fact fill:#F3F0E8,stroke:#171713,color:#171713,stroke-width:2px;
  classDef process fill:#353630,stroke:#353630,color:#F3F0E8;
  classDef output fill:#E7EFE9,stroke:#2E6B4F,color:#171713;
  class F fact;
  class A,B,C process;
  class D,E output;
```

`PostSourceFacts` 是只读投影，不新增第二套存储：它由 inventory、detail 和 media manifest 的版本化 artifact 组合产生。

每个字段都有 `available / partial / missing`。其中只有话题标签而没有叙述正文时，caption 为 `partial`。封面只使用已校验的本地封面 artifact；关键帧、逐字稿和模型摘要都不能拿来填补原帖字段，缺失时保持未知。

前端使用一个共享事实卡：左侧封面，右侧依次显示标题、发布正文、话题、时间、公开指标和证据来源。Builder 报告、逐字稿和 OCR 位于事实卡之后。
