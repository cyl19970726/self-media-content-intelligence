# dev-workflow Skill candidate — discrepancy ledger

## 1. Independent critical-question accounting (15/15 checked)

| Audit question | Result | Candidate evidence | Independent discrepancy |
|---|---|---|---|
| CQ-01 core promise | Counted | KU-03, KU-04 | Three-hour/zero-code/template claims retained with qualification. |
| CQ-02 tool/model/provider | Counted | KU-02, KU-05, KU-07, KU-09 | Main relationship is right; Claude Code v2.0.31 omitted. |
| CQ-03 Claude install command | Counted | KU-06 | Exact npm command retained. |
| CQ-04 Kimi CLI command | Missed | KU-07 | `uv tool install --python 3.13 kimi-cli` is visible in SHOT-007 but declared unavailable. |
| CQ-05 Moonshot configuration | Counted | KU-09, KU-10 | Endpoint, token placeholder, and five model variables retained. |
| CQ-06 visible success criterion | Missed | KU-10 | Generic greeting is not the full criterion: v2.0.31, displayed K2 model, API Usage Billing, and hi/你好 response are omitted. |
| CQ-07 specification contents | Missed | KU-12, KU-13 | Candidate retains five spoken fields but loses the technical stack, SPA target, system architecture, UI, NPC/value/schedule/action detail. |
| CQ-08 project state before code | Missed | KU-13, KU-14 | Populated story/characters/assets and empty gameplay/image_pipeline state are omitted; output provenance is reversed. |
| CQ-09 art production/entry | Missed | KU-16, KU-17 | User-prepared dependency survives, but generation UI, selection/save/download, naming, and manual placement do not. |
| CQ-10 final deliverable | Missed | KU-18, KU-23, KU-24 | A preview is described without the local browser `index.html` SPA boundary. |
| CQ-11 layout revision | Counted | KU-21–KU-24 | Complete before/request/edit/after chain. |
| CQ-12 objective writing quality | Counted unknown | KU-19, KU-20 | Correctly kept as author judgment without independent validation. |
| CQ-13 three-hour boundary | Counted unknown | KU-03, KU-28 | Correctly unknown. |
| CQ-14 all systems/release quality | Counted unknown | KU-18, KU-23, KU-28 | Correctly not claimed as verified. |
| CQ-15 CTA | Counted | KU-27 | CTA retained; terms remain unknown. |

Total: **9/15**. The six misses are CQ-04, CQ-06, CQ-07, CQ-08, CQ-09, and CQ-10.

## 2. Atomic evidence coverage (40/40 checked)

Covered: `AE-001, 003–008, 010–013, 016, 026, 030, 032–040` = **23**.

Missed or materially incomplete: `AE-002, 009, 014–015, 017–025, 027–029, 031` = **17**.

The misses are not evenly distributed. They form three contiguous blind zones:

- `AE-017`–`AE-025`: high-density prompt, architecture, existing directory state, roles/values, and agent planning.
- `AE-027`–`AE-029`: external image-generation UI, save/download transition, Finder filenames.
- `AE-031`: exact local preview state and numeric values.

The candidate does especially well on `AE-032`–`AE-040`, which explains why the latter half of the article reads coherent even while the central engineering state is incomplete.

## 3. Workflow-stage contract (10 stages × 7 fields)

Legend: ✓ counted; — missed/materially incomplete. A parameter field with no parameter in the audit counts when the candidate correctly avoids invention.

| Stage | Input | Action | Parameter | Output | Before | During | After | Count |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---:|
| 0 前置环境 | — | — | — | — | — | — | — | 0/7 |
| 1 安装代理/替代 CLI | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | 6/7 |
| 2 创建 API key | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | 6/7 |
| 3 配置 K2 | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | 6/7 |
| 4 准备/提交规格 | — | — | — | — | — | — | — | 0/7 |
| 5 外部生成/整理美术 | — | ✓ | — | ✓ | ✓ | — | ✓ | 4/7 |
| 6 接入资产/运行初版 | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | 6/7 |
| 7 人工审阅 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 8 布局返修 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| 9 泛化/CTA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7/7 |
| **Total** |  |  |  |  |  |  |  | **49/70** |

Stage 4 is the decisive collapse. The candidate's capture protocol labels the interval “framework output,” so its verification position already presupposes what should have been tested: whether the visible files were newly generated or already present. That is a fake-position plus self-proof failure. The audit establishes only that the project was already populated when shown; creation provenance remains unknown.

## 4. Author claims and unsupported inference

The candidate successfully separates the major author claims from visual facts:

- three hours and zero manual code;
- K2/agent capability and domestic convenience;
- dialogue naturalness/emotion/quality;
- multi-genre, low-skill generalization;
- template reusability.

These are consistently labeled `author_claim` and appropriately caveated. On a knowledge-unit basis, only **1/27 positive statements** is unsupported: `KU-13` treats the post-cut project/document state as generated framework output. That 3.7% rate passes the standalone inference threshold, but its causal importance is high and it also causes failures in CQ recall, process completeness, unknown discipline, and meta coverage.

## 5. Unknown discipline (20/20 checked)

Correctly preserved: `U-01, U-02, U-05, U-07, U-08, U-09, U-13, U-15, U-16, U-18, U-19, U-20` = **12**.

Missed or mishandled: `U-03, U-04, U-06, U-10, U-11, U-12, U-14, U-17` = **8**.

Key cases:

- `U-04`: project-file origin is unknown, but `KU-13` turns it into a positive generation story.
- `U-08`: actual image platform/model/prompt/cost remain unknown, but the candidate goes too far by saying the tool was not shown. An unbranded generation UI was shown.
- `U-14`: generic “testing unknown” does not preserve the audited feature inventory: save/load, bad endings, random events, character detail, and responsive behavior.
- `U-17`: the candidate notes editing gaps, but never preserves the sharper unknown of whether terminal, documents, assets, and previews are the same continuous project version/session.

## 6. Timestamp accounting

All 100 knowledge-unit evidence references resolve. Ninety-six overlap their unit time range with 0.75 s tolerance. Four are outside:

- KU-02 → TARGET-0029 at 19.48 s, while KU-02 is 4.58–6.75 s.
- KU-02 → TARGET-0083 at 40.0 s, while KU-02 is 4.58–6.75 s.
- KU-16 → TARGET-0137 at 69.0 s, while KU-16 ends at 68.2 s.
- KU-20 → TARGET-0150 at 81.5 s, while KU-20 starts at 82.51 s.

The first two are cross-time corroboration for the tool name, not fabricated evidence, but they are not correctly localized references for the knowledge unit's declared time range.

## 7. Unchecked carriers and meta-audit

The candidate says all nine generalized carrier categories were inspected. Independent audit finds three carrier slices that did not survive into the reconstruction:

1. Kimi CLI README installation block.
2. High-density prompt/project-directory screen text.
3. External image-generation UI and save/download/Finder sequence.

Four meaning reversals are unguarded:

- “说大白话” → detailed technical/product specification;
- “AI 从空白搞定” → populated project with unknown provenance;
- “AI 同时解决文字和美术” → external tool plus human asset work;
- “手游/独立文游” → local browser SPA prototype.

Four relationship closures are absent or distorted:

- existing project/docs → Claude Code reads → implementation;
- image tool → human selection/download/naming → assets directory → agent integration;
- project files → local `index.html` preview;
- human retains planning, asset operation, review, and revision ownership.

Because the candidate's meta-gate only audits its own probe-derived 11 meaning changes and nine relationships, its `pass: true` is self-certifying and does not constitute an independent coverage gate.

## 8. JUDGE

Not run. Hard GATE failure blocks JUDGE by protocol. The numeric judge keys in `evaluation.json` are schema-minimum placeholders only and must not be interpreted as quality scores.
