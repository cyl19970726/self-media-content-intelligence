# Issue 71: actual legacy `core_evidence_count` diagnosis

## Scope

This is a read-only diagnosis of the two failed v2 child Builder attempts. No
report was edited and no model was run.

The check derives `coverageMatrix.coreEvidence` from `knowledgeUnits`: `total`
is the number with `importance: "core"`; `covered` is the number of those with
at least one evidence entry.

## `6a61e8640000000022018372`

Failed Builder child: `c2c7dc63-ac49-460d-8b51-9e5b13df2202`.

The actual frozen report is:

- `.runtime/runs/ae713242-656f-48bf-8f2b-42aa16201e3d/workflow-reconstructions/c2c7dc63-ac49-460d-8b51-9e5b13df2202/22d77a18-9833-444b-90e0-5ed34f3338b8/6a61e8640000000022018372/reconstruction.json`
- SHA-256: `53e30a5102bcab7e415003d77f754914142aab8d802bdd3fce10c032c68af751`

It declares `4/4`. The report has five core units (`KU-HOOK`, `KU-MECHANISM`,
`KU-APPLICATIONS`, `KU-PARAMETERS-TEST`, `KU-THESIS-END`), all evidenced, and
one supporting unit (`KU-HISTORY`). The derived value is `5/5`.

## `6968c3c9000000000b013f4d`

Failed Builder child: `4b2c9ec6-782b-4c42-93fb-90025b95c213`.

The actual frozen report is:

- `.runtime/runs/ae713242-656f-48bf-8f2b-42aa16201e3d/workflow-reconstructions/4b2c9ec6-782b-4c42-93fb-90025b95c213/1e2255b1-fbf9-4d7e-b375-d80d9d5428eb/6968c3c9000000000b013f4d/reconstruction.json`
- SHA-256: `d81a14f768b6cf48e98f2a1608ed97bfc8ae85fea289f0c4e335fa04d0c4eeb3`

It declares `6/6`. The report has five core units (`KU-HOOK`, `KU-DIFFERENCE`,
`KU-CONSTRAINT`, `KU-PLATFORM`, `KU-PAYOFF`), all evidenced, and one supporting
unit (`KU-TEAM`). The derived value is `5/5`.

## Disposition

Both are Builder-authored metadata mismatches. The host must not replace either
declaration. Original candidates remain immutable audit evidence. Recovery must
create a new Builder attempt from the existing frozen evidence, validate the new
candidate, and then run the ordinary fresh independent evaluator before any
parent workflow can use it.

## 后续真实修订暴露的独立问题（2026-09-16）

飞行宠物的计数定向修订成功后，review 子任务 3deca7e4 的当前评估指出内容还原遗漏 8.4–20.94 秒团队/历史/公司段，引用 CUE-005/CUE-014/KU-TEAM。repair cb89fe65 却只收到 `[full_timeline_carrier_sweep, eval_meta_gate, CR-06]`，复制的候选目录携带旧评估。当前详细评估没有作为资产传入，属于资产交接缺陷。

随后 Builder 将 CUE-006/008/011/090/093/095 误写为 frame 引用；实际帧索引存在 FRAME-CUE-*。完整性检查逐个失败，两个自动修订回合仅修掉 CUE-006 与 CUE-008，剩余四个引用导致失败。应一次收集全部引用错误，并将准确绑定候选版本的当前评估内容与证据路径交给修订任务，而不是增加重试次数。原失败目录保留，不手改报告。
