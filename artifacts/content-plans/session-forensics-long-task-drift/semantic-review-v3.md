# Session Forensics 长任务漂移视频：独立语义评审 V3

## 结论

`semanticReady=true`（仅指**编导规格**）。G0–G7 全部通过，因此已运行 JUDGE。V3 修复了 V2 的全部硬闸：事实未再把 #27588 与 #31351 拼接；`8 members / 7 adjacent restated` 表述准确；语音代理的逐段时长与 55.104s 总长相互一致；360×640 的 CSS 与四张实渲图符合 `source ≥12px`、其他说明/字幕/人物占位 `≥16px`；A/B 开场改为两个内部自洽、正文锁定的 opening-proof package。

这不是 `EDIT_ACCEPTED` 或发布批准。真人连续 take、授权/脱敏、真实媒体四态与关键转场仍是候选自己正确声明的**生产释放阻塞**；在它们解除前不得输出成片或发布。

```json
{
  "schemaVersion": "1.0",
  "candidateHash": "3b555f95996551283c90bfe42390377ae356ea16b6f7a8117f19cc34944596c1",
  "taskHash": "9e400dc6b929d05383b2280920e50d1e83b5b1c0196adc413437693c945904f1",
  "evidenceHashes": [
    "33e915602b62290166a30d4f7489229a01ad484acf72fb32113db862b7912a8a",
    "51180748deca812a12584d5b25d63e8d4998472f63760cd19396085783a05119",
    "6247a1bf0a8f2819d65a9e1eb4c95b49efdebb1404a710def07c6e19377b6a4e",
    "fa48e473a5ab0abc4045b5b157f42b04bc56687f0d626f8fec2d8d5690a2ab13",
    "28bc9ad1a31f17d43b5f88432832d3f4a90d9614892d9f221f0cdc2e91955fbe",
    "9a6cc4b6bcb7980c1851179b394e1063895c4ca4081ce32518efe59addfdda0f",
    "4643924f31e8e250a377a95d28a6a3905de0c586192953ee2272f0ca6525d629",
    "external primary pages inspected live 2026-08-16: GitHub issues #27588/#31351/#37600/#14120/#5957 and Claude Code troubleshooting; no immutable local capture supplied"
  ],
  "structuralReportHash": "not supplied: Markdown/HTML candidate; validation-v3.md is a deterministic auxiliary check, not a structured-validator report",
  "reviewer": {
    "id": "/root/review_v3_directing",
    "independenceStatement": "Did not author, repair, or render the V3 candidate; reviewed it independently against the original task, session evidence, prior reviews, source pages, wireframe, validation record, and four supplied renders."
  },
  "gates": [
    {"id":"G0","passed":true,"failures":[]},
    {"id":"G1","passed":true,"failures":[]},
    {"id":"G2","passed":true,"failures":[]},
    {"id":"G3","passed":true,"failures":[]},
    {"id":"G4","passed":true,"failures":[]},
    {"id":"G5","passed":true,"failures":[]},
    {"id":"G6","passed":true,"failures":[]},
    {"id":"G7","passed":true,"failures":[]}
  ],
  "failedGateIds": [],
  "requiredRevisions": [],
  "semanticReady": true,
  "humanApproval": {
    "owner": "content / publishing owner (not yet named)",
    "status": "pending",
    "note": "Semantic readiness does not clear the listed release blockers or replace human acceptance of publication risk."
  }
}
```

## Reviewed evidence and scope

- Candidate: `content-brief-v3.md`; SHA-256 `3b555f95996551283c90bfe42390377ae356ea16b6f7a8117f19cc34944596c1`.
- Layout source: `layout-wireframe-v3.html`; SHA-256 `6247a1bf0a8f2819d65a9e1eb4c95b49efdebb1404a710def07c6e19377b6a4e`.
- Static renders: four supplied 360×640 PNGs; their hashes are recorded above. I inspected the actual renders, not only the source CSS.
- Session measurement: `/tmp/session-019ff003-metrics.json`; SHA-256 `33e915602b62290166a30d4f7489229a01ad484acf72fb32113db862b7912a8a`. It directly reports 11,396 lines, 1,430 `exec`, 336 `wait`, 16 compactions, 102 patches and 39 touched files. Its recurring cluster contains eight members and seven adjacent `restated` pair verdicts. Its bounded evidence includes the later feedback that the narrowed recording was unreadable, the layout issue remained unresolved, and the original talking-head source should not be fragmented.
- Auxiliary reproducibility record: `validation-v3.md`; SHA-256 `51180748deca812a12584d5b25d63e8d4998472f63760cd19396085783a05119`. I treated it as a candidate assertion and independently recomputed the timing arithmetic from its listed segment durations and checked the CSS/render dimensions.
- Primary web-source boundary, checked 2026-08-16: [Codex #27588](https://github.com/openai/codex/issues/27588) is a reporter-authored 2–4+ hour, pre-write/no-file-edit report; [#31351](https://github.com/openai/codex/issues/31351) is a separate reporter-authored roughly-three-hour compaction/no-real-progress report; [Claude Code troubleshooting](https://code.claude.com/docs/en/troubleshooting) documents its own `Autocompact is thrashing` stop condition. #37600, #14120 and #5957 substantiate that other reporter-authored adjacent reports exist, but are not used to build a shared root-cause claim.

## G0–G7 hard gates

### G0 Coverage — PASS

The V3 brief names the audience, use moment, demand evidence and its limit, exactly one primary job, account future value, title/cover/first-frame/endpoint contracts, proof ledger, eight semantic voice beats, carrier and edit choices, packaging, experiment, review sequence and production/rights fallbacks. It also explicitly marks the remaining delivery state `DIRECTING_SPEC_CANDIDATE / PRODUCTION_BLOCKED`, instead of pretending an asset-free concept is a finished cut.

### G1 Evidence fidelity — PASS

C01 is consistently #27588's reporter claim: `2–4+ 小时 / 仍未进入文件编辑`. C02 is consistently #31351's different reporter claim and is intentionally kept out of the 60-second main film. The candidate does not create the prohibited `3 小时 / 0 文件改动` composite.

The own-session counts are labelled activity counts, the 39 changed files are shown as the counterweight to “zero work,” and the conclusion is visibly bounded as `本案例判断`. The exact recurring-ask wording is `8 次表达 / 7 组相邻重述`; it does not turn eight cluster members into eight additional demands or into identical quotations. The case's later “录屏不可读” feedback supports a still-open readability goal, not the much broader claim that the whole project made no progress. Cross-vendor language calls Claude's documented state a different product state and explicitly disclaims common cause.

### G2 Promise closure — PASS

The default title creates the tension, the cover and first spoken/visual proof stay with #27588, and the body pays it back by contrasting 1,430 activity events with 39 changed files, then resolving the actual case through `目标 → 后续不可读反馈 → 暂停新增/继续、分拆或停止`. The endpoint gives an immediately usable, bounded question rather than a deferred “follow the next episode” promise. The account’s declared future value—evidence-led `目标—操作—产物—纠正` reviews—provides a truthful reason for any account-level follow behaviour without making following the only CTA.

### G3 Executability — PASS

Every V1–V8 row has a time range, exact voice copy, layout state, top-zone content/ROI, person/cut treatment and an acceptance condition. The mapping respects the original request: content occupies the upper zone, people remain below in a stable real rectangular frame, and the only described person transitions occur at semantic boundaries rather than as arbitrary face cuts. It bans an unreadable squeezed desktop overview and specifies the move to semantic ROI.

The static acceptance is correctly narrow: four actual 360×640 renders show the F/E/S/P hierarchy and content legibility. The plan separately requires pre/mid/post evidence for S→E and F→E with real media; it does not call the present placeholders a finished edit.

### G4 Production feasibility — PASS (spec only)

The eight timing proxies are `4.957 / 7.988 / 6.246 / 4.725 / 6.293 / 6.049 / 9.195 / 5.700s`, totalling 51.153s by recomputation (the record's 51.154s is ordinary thousandth-second rounding). Adding 2.45s of seven gaps, a 0.5s opening hold and a 1.0s closing hold yields 55.103s, consistent with the stated 55.104s rounding and the table ending at 55.20s. Each voice asset fits its allocation (including the small rounding slack); it no longer asks for 6–7 spoken characters per second or chopped delivery.

Tingting at 190 wpm is appropriately treated only as a timing proxy. The brief imposes the right boundary: before final edit, a human must record an unsped continuous take; if it exceeds 60s, text is cut rather than accelerated or split into fragments. That is a production release condition, not a false claim that the unavailable human record has already been approved.

### G5 Original transfer — PASS

The specified learning is functional—fast tension, proof-first ordering and person/image division of labour—not the referenced creator's persona, visual signature, source footage, proprietary wording or claimed performance cause. Topic, audience, proof objects, visual grammar, title and action are independently reconstructed. The plan expressly excludes the red-haired identity, its visual system and reused footage.

### G6 Measurement — PASS

One intervention is pre-registered: the full 0–5.5s **opening proof package**. Each package is internally coherent:

- A is #27588's spoken and visual user-report claim with its source.
- B is the local case's activity-versus-closure claim, its local proof card and its own source boundary.

Thus the experiment does not repeat V2’s mismatch of #27588 audio against local-case visuals. The body from 5.85–55.20s, title, cover, CTA, later sound, duration window and publication timing are locked; the plan also admits that its neutral experimental title/cover are a distinct package from the default publication package and must not be mixed. It supplies a main metric and denominator, job-appropriate guardrails, at least 3,000 valid plays per variant, decision thresholds, two comparable directional batches, a multi-label comment coding process and a non-random-post/confound rule. It appropriately limits any outcome to association within comparable batches.

### G7 Safety and rights — PASS (spec only)

Release is blocked until the human image/voice consent, minimum-session-transcript redaction, sound/font permission and final-export recheck exist. The fallback is a self-made fact card whenever public or private source material cannot be authorized. The redaction checklist covers session ID, paths, usernames, email, secrets, unreleased work, irrelevant emotional text and screenshot metadata; a second reviewer checks the encoded final export. Music has an explicit no-license fallback, and cross-company attribution is constrained. These conditions address the relevant use boundaries without confusing a public issue with blanket rights clearance.

## 360×640 check

`layout-wireframe-v3.html` sets `.source` to 12px; `.sub`, `.caption`, and the person-placeholder text to 16px; primary card text is 24px. The four supplied images are exactly 360×640. At their actual rendered scale, the source tag, captions, explanatory body and main statements are visually legible and no source text is silently reduced to the V2 9–11px values. This passes the **static layout** test only; a placeholder image cannot establish readability of a real computer recording.

## JUDGE (run because every hard gate passed)

| Lens | Score | Evidence / remaining production concern |
|---|---:|---|
| Content lead | 4/5 | Narrow audience, non-universal promise and a reusable account method are clear. |
| Director | 4/5 | The case resolves through proof and action; the final human take still needs timing confirmation. |
| Visual/editor | 4/5 | Upper evidence/lower person, semantic ROI and non-fragmentation rules are directly actionable; static renders do not yet prove the real transitions. |
| Xiaohongshu operator | 4/5 | Title/cover/opening contracts and a non-randomized test protocol are coherent. |
| Target viewer | 4/5 | The final ten-minute question is concrete, saveable and avoids a fake next-episode dependency. |
| Experiment reviewer | 4/5 | The opening package is one defined variable with thresholds and guardrails; natural-distribution confounds remain recorded rather than erased. |

## Release blockers (not failed semantic gates)

1. Record and measure a no-speed-up, continuous human take; if it exceeds 60s, shorten copy first.
2. Obtain image/voice consent and source/media/font/music clearance; make and independently review the stated redactions.
3. Replace placeholders with authorized real material; verify F/E/S/P and pre/mid/post frames of S→E and F→E at 360×640, then have the named content owner mark `EDIT_ACCEPTED`.
4. Keep human publishing approval pending until the final encoded export passes the second privacy/fact review.

