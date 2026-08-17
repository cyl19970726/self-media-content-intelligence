# V0 holdout generalization contract

预注册于 V0 冻结之后、读取任何保留集 reconstruction/article 之前。V0 hash：`5266b285afdb8b23d05a433e1a7f34b177ae6f93a78acaf53ccf4761748c95db`。

## Evaluation order

1. 每条保留视频先独立重建；
2. 独立 audit 只看 evidence，不看 candidate/V0；
3. 独立 reconstruction evaluator 只用 audit + candidate，22/22 才能进入泛化测试；
4. 泛化 evaluator 才允许同时读取冻结 V0 与已通过的 holdout reconstruction；
5. 输出写入独立 `holdout-generalization/`，不得改 V0。

## Denominator

对每条保留视频，独立列出以下十个 closure dimension 是否适用及审计问题数：

1. account/identity purpose;
2. audience, situation and demand;
3. single-post job and portfolio role;
4. opening, delivery and closing contracts;
5. narrative/process/story relations;
6. proof objects and causal scope;
7. speech/image/text/audio carrier functions;
8. follow/series/CTA handoff;
9. publishing, metrics and review logic;
10. rights, safety and unknowns.

不能因为 V0 有一个宽泛标签就算命中。`recalled` 必须指出具体 P/C/closure 条款如何恢复该问题；`missed` 和 `false_positive` 必须单列。

## Per-video gates

- H0：holdout reconstruction 22/22 ready；
- H1：适用审计问题 recall ≥ 85%；
- H2：critical proof/causal/safety questions recall = 100%；
- H3：unsupported causal upgrade = 0；
- H4：V0 不适用项被正确标 N/A，不硬套；
- H5：至少指出一个该视频对 V0 的 `confirmation / limitation / contradiction / novelty`，不能全部写“已覆盖”；
- H6：能从理解转成一个原创、可执行、可测的创作动作，而不是复述原视频。

任一 hard gate 失败，该条不通过；评分不能覆盖。

## Corpus decision

五条均通过 H0/H2/H3。至少四条通过全部 H0–H6。若只有一条因 H1 或 H4/H5 失败，可以形成明确 V1 限制并重新前向测试；两条以上失败说明 V0 泛化不足，必须回到方法设计，不得发布 Skill 为 ready。

## Delta vocabulary

- `confirmed`：V0 条款直接且具体地恢复未见结构；
- `limited`：方向正确，但需加入适用条件或更细闭包；
- `contradicted`：保留集提供了真实反例，原条款需降级；
- `novel`：V0 没有足够具体的节点；
- `unresolved`：证据不足，不能用 holdout 强行决定。

V1 只在 `holdout-delta.md` 中记录修改及原因；保留 V0 原文与 hash。

