# Signal Room 核心心智模型

Status: **Current mental model**  
Scope: **只解释“大目标、单帖、单博主”之间的关系；字段、运行状态与实现细节由 Schema、代码和架构文档负责。**

## 1. 我们最终在构建什么

> Signal Room 把可追溯的内容证据，逐层编译成可修订的知识，再用真实创作结果反过来校正知识。

```mermaid
flowchart LR
    E["内容证据"] --> P["单帖理解"]
    P --> C["单博主模式"]
    C --> X["跨博主机制"]
    X --> D["创作决策"]
    D --> R["发布与复盘"]
    R -->|支持 · 限定 · 反驳| X

    classDef evidence fill:#E8F1FF,stroke:#3478C0,color:#153B66,stroke-width:2px;
    classDef research fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef knowledge fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    classDef action fill:#FFF0D5,stroke:#C77800,color:#603B00,stroke-width:2px;
    class E evidence;
    class P,C research;
    class X knowledge;
    class D,R action;
```

不是“报告越来越多”，而是“下一次判断不再从零开始”。

## 2. 三种对象，不是三种页面

```mermaid
flowchart TB
    POST["单帖<br/>最小证据对象"]
    CREATOR["单博主<br/>局部内容模型"]
    KNOWLEDGE["内容知识<br/>条件化机制"]

    POST -->|重复、差异、反例| CREATOR
    CREATOR -->|跨博主比较| KNOWLEDGE

    classDef post fill:#E8F1FF,stroke:#3478C0,color:#153B66,stroke-width:2px;
    classDef creator fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef wiki fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    class POST post;
    class CREATOR creator;
    class KNOWLEDGE wiki;
```

- 单帖回答：**这条内容具体做了什么？**
- 单博主回答：**这个人在当前样本中稳定地会什么？**
- 内容知识回答：**什么机制在什么条件下可能跨个案复用？**

## 3. 单帖的心智模型

### 3.1 单帖不是摘要，是证据化重建

```mermaid
flowchart LR
    SOURCE["原帖 · 原视频"] --> BUILDER["Builder<br/>还原实际发生了什么"]
    BUILDER --> ARTIFACT[("版本化单帖 Artifact")]
    ARTIFACT -. 可选 .-> EVALUATOR["Evaluator<br/>独立找错"]
    EVALUATOR --> GATE{"证据闸门"}
    ARTIFACT --> GATE
    GATE -->|通过| VERIFIED["可验证单帖证据"]
    GATE -->|跳过或未通过| REVIEWABLE["可复核 · 不晋升"]

    classDef source fill:#E8F1FF,stroke:#3478C0,color:#153B66,stroke-width:2px;
    classDef builder fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef artifact fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    classDef gate fill:#FFE3E6,stroke:#C83F52,color:#681D29,stroke-width:2px;
    classDef review fill:#FFF0D5,stroke:#C77800,color:#603B00,stroke-width:2px;
    class SOURCE source;
    class BUILDER builder;
    class ARTIFACT,VERIFIED artifact;
    class EVALUATOR,GATE gate;
    class REVIEWABLE review;
```

### 3.2 Builder 同时看三件事

```mermaid
flowchart LR
    VIDEO["一条视频"] --> CR["内容还原<br/>讲了什么"]
    VIDEO --> DL["编导逻辑<br/>怎样改变理解"]
    VIDEO --> VE["视觉剪辑<br/>画面怎样承载意义"]
    CR --> REPORT["完整可读重建"]
    DL --> REPORT
    VE --> REPORT

    classDef input fill:#E8F1FF,stroke:#3478C0,color:#153B66,stroke-width:2px;
    classDef lens fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef output fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    class VIDEO input;
    class CR,DL,VE lens;
    class REPORT output;
```

单帖只能产生观察与候选机制，不能因为点赞高就生成“通用规律”。

## 4. 单博主的心智模型

### 4.1 三层漏斗

```mermaid
flowchart TB
    ALL["全量公开作品<br/>建立真实基本盘"]
    COMPARE["21 条比较集<br/>寻找重复、差异与反例"]
    DEEP["12 条深度样本<br/>打开视频内部证据"]
    SYNTHESIS["博主级 Synthesis<br/>形成局部内容模型"]

    ALL --> COMPARE --> DEEP --> SYNTHESIS

    classDef corpus fill:#E8F1FF,stroke:#3478C0,color:#153B66,stroke-width:2px;
    classDef compare fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef evidence fill:#DDF7F2,stroke:#168172,color:#104D44,stroke-width:2px;
    classDef synthesis fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    class ALL corpus;
    class COMPARE compare;
    class DEEP evidence;
    class SYNTHESIS synthesis;
```

### 4.2 博主级综合回答什么

```mermaid
mindmap
  root((单博主局部模型))
    他是谁
      定位
      受众
      信任来源
    他提供什么
      用户问题
      价值模式
      内容支柱
    他怎样表达
      编导结构
      证明方式
      视觉语言
    什么表现不同
      高表现关联
      基本盘
      低表现与反例
    我们还不知道什么
      数据缺口
      替代解释
      因果边界
```

博主结论只在“这个博主 + 当前样本 + 当前时间窗口”内成立。

### 4.3 一个博主怎样完成

```mermaid
flowchart LR
    HOST["单博主 Host"] --> RUN["唯一研究 Run"]
    RUN --> WORKERS["采集 · 标注 · 选样<br/>单帖 Builder · 博主 Synthesis"]
    WORKERS --> DOSSIER["唯一 Creator Dossier"]
    DOSSIER -. 可选正式验收 .-> CE["Creator Evaluator"]
    DOSSIER --> REVIEWABLE["REVIEWABLE<br/>内部可用"]
    CE -->|通过| READY["READY<br/>允许贡献正式知识"]
    CE -->|未通过| REVIEWABLE

    classDef control fill:#DCE7FF,stroke:#284B9B,color:#102B5C,stroke-width:2px;
    classDef work fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef artifact fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    classDef gate fill:#FFE3E6,stroke:#C83F52,color:#681D29,stroke-width:2px;
    classDef review fill:#FFF0D5,stroke:#C77800,color:#603B00,stroke-width:2px;
    class HOST,RUN control;
    class WORKERS work;
    class DOSSIER,READY artifact;
    class CE gate;
    class REVIEWABLE review;
```

## 5. Host、Builder、Evaluator

```mermaid
flowchart LR
    H["Host<br/>决定做什么、做到哪一步"]
    B["Builder<br/>生产候选理解与证据"]
    E["Evaluator<br/>独立检查能否晋升"]

    H --> B
    B --> E
    E -->|结论与问题| H

    classDef host fill:#DCE7FF,stroke:#284B9B,color:#102B5C,stroke-width:2px;
    classDef builder fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef evaluator fill:#FFE3E6,stroke:#C83F52,color:#681D29,stroke-width:2px;
    class H host;
    class B builder;
    class E evaluator;
```

| 角色 | 只负责 |
| --- | --- |
| Host | 合同、编排、版本、恢复、最终状态 |
| Builder | 基于证据生产候选 Artifact |
| Evaluator | 独立找错与判断是否晋升，不自动修复 |

## 6. 知识晋升边界

```mermaid
flowchart LR
    FACT["原始事实"] --> POST["单帖观察"]
    POST --> CREATOR["博主级模式"]
    CREATOR --> CONDITIONAL["跨博主条件性规律"]
    CONDITIONAL --> HYPOTHESIS["创作假设"]
    HYPOTHESIS --> PRACTICE["自有验证结果"]

    classDef evidence fill:#E8F1FF,stroke:#3478C0,color:#153B66,stroke-width:2px;
    classDef research fill:#E6F7FB,stroke:#1687A7,color:#164B59,stroke-width:2px;
    classDef knowledge fill:#E3F6E8,stroke:#2C8A4B,color:#174D2A,stroke-width:2px;
    classDef action fill:#FFF0D5,stroke:#C77800,color:#603B00,stroke-width:2px;
    class FACT evidence;
    class POST,CREATOR research;
    class CONDITIONAL knowledge;
    class HYPOTHESIS,PRACTICE action;
```

每一层都需要自己的证据门槛；页面位置和模型语气不能代替晋升。

## 7. 唯一权威

| 问题 | 唯一权威 |
| --- | --- |
| 长期为什么做 | [LLM Wiki Vision](signal-room-llm-wiki-vision.md) |
| 核心对象怎样理解 | 本文 |
| 当前产品已经做到什么 | [Current Product](../product/current-product.md) |
| 博主流水线怎样实现 | [博主研究与视频重建架构](../architecture/creator-research-pipeline.md) |
| 字段与可执行状态 | Schema、代码与测试 |

## Read next

- 想理解长期方向：[Signal Room LLM Wiki Vision](signal-room-llm-wiki-vision.md)
- 想理解运行系统：[博主研究与视频重建架构](../architecture/creator-research-pipeline.md)
- 想确认当前能力：[Signal Room Current Product](../product/current-product.md)
