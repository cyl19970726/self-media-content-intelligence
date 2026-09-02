# Wave 3 设计

## 1. 权威边界

```mermaid
flowchart LR
  R[Research\n冻结报告与证据] --> P[Contribution Proposal\n只读提案]
  P --> H{人工裁决}
  H -->|进入 Wiki| C[Compiler\n确定性闸门]
  H -->|保留| L[Research Local]
  H -->|等待| W[Awaiting Evidence]
  H -->|拒绝| X[Rejected]
  C --> K[Canonical Knowledge\n版本化概念]

  classDef research fill:#E9E4D8,stroke:#171713,color:#171713
  classDef review fill:#F2C14E,stroke:#171713,color:#171713
  classDef accepted fill:#2E6B4F,stroke:#171713,color:#fff
  classDef stopped fill:#F3F0E8,stroke:#E4572E,color:#171713
  class R,P research
  class H review
  class C,K accepted
  class L,W,X stopped
```

## 2. 单博主知识形成

```mermaid
flowchart TB
  A[21 条帖子分析] --> S[单博主综合报告]
  S --> M[重复结构 claims]
  M --> B[按 claim 的证据引用\n绑定到具体帖子]
  B --> G{3+ 不同帖子\n含深证据\n跨层或有明确条件}
  G -->|是| P[博主模式提案]
  G -->|否| W[等待证据 / 保留本地]
  P --> H{人工审核}
  H -->|通过| K[creator_specific Knowledge]
  H -->|不通过| W

  classDef source fill:#E9E4D8,stroke:#171713,color:#171713
  classDef gate fill:#F2C14E,stroke:#171713,color:#171713
  classDef yes fill:#2E6B4F,stroke:#171713,color:#fff
  classDef no fill:#F3F0E8,stroke:#E4572E,color:#171713
  class A,S,M,B source
  class G,H gate
  class P,K yes
  class W no
```

## 3. 核心组件

| 组件 | 只负责什么 |
|---|---|
| Proposal Store | 保存冻结提案和裁决，不写概念 |
| Creator Compiler | 把重复结构及其帖子证据翻译为候选观察 |
| Reviewer API | 校验输入指纹并记录人工裁决 |
| Knowledge Compiler | 执行既有证据闸门、写 manifest 与概念版本 |
| Activation Workbench | 展示待审、原因、证据和最终去向 |

## 4. 数据原则

- 提案保存完整编译输入，因此审核时不会重新猜测。
- `expectedFingerprint` 防止操作者审核旧页面时应用了新版本。
- 非进入 Wiki 的裁决也必须持久化，成为可解释的“没有晋升”。
- 正式 manifest 仍是 Knowledge 写入的唯一审计凭证。

