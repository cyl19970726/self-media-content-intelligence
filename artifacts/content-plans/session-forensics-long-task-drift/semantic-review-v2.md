# Session Forensics 长任务漂移视频：独立语义评审 V2

## 结论

`semanticReady=false`。候选已修复 V1 的关键事实边界：`8 members / 7 adjacent restated` 没有误写成八次额外重复；`#27588` 与 `#31351` 没有再拼成“3 小时 / 0 文件改动”；本会话判断、外部用户报告和 Claude Code 的不同故障状态也已分开。隐私、引用、音频权利和发布实验的条件已经被明确列为 gate。

但仍有五个硬闸失败：开场及前三个语义段无法按表内时长自然说完；新 360×640 原型的实际 CSS 字号低于它自己声明的硬下限；包装/受众/账号持续价值未闭合；A/B 的 B 首帧会与既定第一句的 #27588 叙述失配，令 promise 与单变量实验同时失真；因此该方案只能标记为 `DIRECTING_SPEC_PARTIAL / PRODUCTION_BLOCKED`，不能标记为 `DIRECTING_SPEC_READY` 或发布就绪。

任一 G 失败即不运行 JUDGE。本评审**未运行 JUDGE**。

```json
{
  "schemaVersion": "1.0",
  "candidateHash": "02c627bbc3a60a11a9075f034f16a842a131d754072f93dc0b2ab00c083d1f31",
  "taskHash": "9e400dc6b929d05383b2280920e50d1e83b5b1c0196adc413437693c945904f1",
  "evidenceHashes": [
    "33e915602b62290166a30d4f7489229a01ad484acf72fb32113db862b7912a8a",
    "a5a0ac01fabb2840101ed325cc9c4d55edc09ea86d39ae55b7bc6c776ec25b76",
    "2c48a3818946dabab2500799822931c2329a55c0949d2b99b07adf9729f5dc58",
    "31fc7f0457415b9f897153c8968a7130b53188e7b20e1d9d0255e976f4c630f6",
    "3ab22d51633b9443fe50102808b75a2d988f2f295d42371b93fe0d3c047b2e81",
    "d45cc4244536bf2eaea01d9a6005dea4693fe5cc78230c6bfe8d68a2b134625b",
    "4eb737b08ea23a91c5816da43901d9bbcf8023ad34da419ae10111df0416d4e8"
  ],
  "structuralReportHash": "not supplied: Markdown/HTML candidate; four 360x640 layout renders were supplied and reviewed",
  "reviewer": {
    "id": "/root/review_v2_directing",
    "independenceStatement": "Did not author or repair the candidate; reviewed V2 independently after V1."
  },
  "gates": [
    {"id":"G0","passed":false},
    {"id":"G1","passed":true},
    {"id":"G2","passed":false},
    {"id":"G3","passed":false},
    {"id":"G4","passed":false},
    {"id":"G5","passed":true},
    {"id":"G6","passed":false},
    {"id":"G7","passed":true}
  ],
  "failedGateIds": ["G0", "G2", "G3", "G4", "G6"],
  "requiredRevisions": [
    "Replace the seven timecoded voice beats with a timed natural read that fits every allocated segment.",
    "Make all rendered Chinese body text at least 16px and source labels at least 12px at 360x640, then re-render the four state proofs.",
    "Add audience, demand evidence, primary job, cover, title/cover/opening contract, and a truthful follow or save/comment contract.",
    "Define matched A/B opening packages so voice, claim card and source agree; keep all non-opening factors locked.",
    "After production blockers clear, verify real 360x640 source media and the two specified transitions before EDIT_ACCEPTED."
  ],
  "judgeScores": [],
  "semanticReady": false,
  "humanApproval": {
    "owner": "content owner / publishing owner",
    "status": "pending",
    "note": "The candidate itself correctly requires release consent and a second export-only redaction review."
  }
}
```

Candidate: `content-brief-v2.md`, `layout-wireframe-v2.html`, and four supplied 360×640 PNG layout renders. Prior independent review: `semantic-review-v1.md` (read as historical evidence, not treated as an approval). Session evidence was measured through `session_metrics.py` and drilled only in bounded windows; no full rollout JSONL was opened. External page check on 2026-08-16 was limited to [Codex #27588](https://github.com/openai/codex/issues/27588), [Codex #31351](https://github.com/openai/codex/issues/31351), and [Claude Code troubleshooting](https://code.claude.com/docs/en/troubleshooting).

## Evidence audit

- **Own session.** Metrics support 11,396 lines, 1,430 `exec`, 336 `wait`, 16 compactions, 102 patches and 39 files. The recurring-ask cluster has exactly eight members and seven adjacent `restated` verdicts. Bounded drills at L9614 and L10240 preserve the materially relevant feedback: the screen recording was reported unreadable after narrowing, and the layout issue was later reported unresolved. Bounded drill at L10646 preserves the separate complaint that talking-head audio/visual cutting was too fragmented. These facts support “this content-readability goal was later still reported unresolved”; they do **not** prove zero work or that all activity was futile.
- **External boundaries.** #27588 is a reporter-authored public issue describing a 2–4+ hour pre-write loop and no file edits in that reporter’s cases. #31351 is a separate reporter-authored report of around three hours of repeated auto-compaction without real progress; it does not establish zero edits. The Claude page says its own product stops retrying when repeated refills follow successful compaction; it is not a common-cause finding for Codex. V2 represents all three boundaries correctly.
- **Claim → proof → screen object.** C01–C07 now name claim class, supporting source, non-supporting scope, visible card and fallback. This is materially better than V1. In particular, C04 is activity measurement and C07 is visibly constrained to “本案例判断”.
- **Rights and blockers.** The plan blocks publication pending participant consent, session redaction, permissions for source material/audio/font/screen recordings, and a second export-only review. This satisfies a directing-spec gate, not publication approval.

## 60-second and 360×640 verification

### 60-second natural-read check — FAIL

The total count can plausibly fit roughly one minute in isolation, but its **assigned segments** cannot. Counting Han characters plus spoken Latin letters/digits in the locked voice copy gives:

| Timed row | Spoken text | Count | Allocated time | Why it fails |
|---|---:|---:|---:|---|
| 0.0–3.5 | first sentence | 25 | 3.5 s | 7.1 spoken characters/s before any opening pause. |
| 3.5–9.5 | #27588 sentence | 42 | 6.0 s | 7.0/s while reading product name, source context and numbers. |
| 9.5–17.0 | session metrics sentence | 49 | 7.5 s | 6.5/s while presenting four numbers. |
| 23.5–30.5 | Session Forensics sentence | 44 | 7.0 s | 6.3/s because English product terms are included. |

This requires either speed-up, chopped delivery or overlap that the table does not specify—each contradicts §3 and the original anti-fragmentation requirement. The 30.5–47.5 row also labels only the start of a 44-character sentence but allocates the following action sentence to 47.5–55; the spoken-to-row mapping is therefore not an executable take sheet.

### 360×640 layout check — FAIL

The four new PNGs are genuinely 360×640 and successfully prove the **state proportions and hierarchy** only. They cannot prove a full edit, which V2 now correctly discloses. However, the asserted typography gate is false for the prototype that generated them:

- §7 says Chinese body text must be `≥16px` and source labels `≥12px` at 360×640.
- The wireframe sets `.source{font-size:9px}`, `.sub{font-size:11px}`, `.caption{font-size:11px}`, and the person placeholder to `11px`. The E render’s `Codex issue #27588` source label is therefore 9px; the F render’s explanatory body line is 11px.

Thus `LAYOUT_PROTOTYPE_ACCEPTED` is not supportable under V2’s own hard standard. Correct all relevant 360px render CSS/content to the declared minima, re-render the four states, and keep the later real-media/transition acceptance separate.

## G0–G7 gates

### G0 Coverage — FAIL

The plan has an excellent proof ledger, minimal value closure, timecoded edit decisions, fallback/rights list, experiment and review sequence. Missing as decisions or explicit unknowns: target audience/person and use moment, demand evidence, one declared primary job, cover specification, and a follow contract or an intentionally save/comment-only contract tied to account future value. The H1 title and final “截图收藏” instruction do not by themselves specify title–cover–account behavior. Add those fields; do not imply a follow reason the account cannot yet deliver.

### G1 Evidence fidelity — PASS

V2’s C01–C07 preserve source class and limits. It correctly prevents cross-issue assembly, does not convert the eight cluster members into eight extra requests, and explicitly calls the conclusion a case inference. The source pages and bounded metrics/drills support the limited assertions described above.

### G2 Promise closure — FAIL

The core body now repays the useful promise through a same-case goal → feedback → judgment → action loop. Yet a title/cover opening contract is still absent, and the proposed experiment breaks the established opening contract: fixed first audio says “两小时，一个文件都没改” (C01/#27588), while B shows “1,430 次执行 / 目标仍未闭合 / 本地会话个案” (C04/C06). If only the card changes, sight and sound refer to different proof objects; if narration also changes, that change has not been specified. Define matched A and B opening packages, then make title, cover, source card, voice and first-frame claim agree for each.

### G3 Executability — FAIL

The per-row table is substantially more executable than V1: it gives state, screen object, source/rights, transition and local acceptance for every section, and it avoids comma-level face cuts. But it cannot be executed as written until each row maps to a naturally timed recorded line. Nor can the team accept its supplied layout reference because the actual rendered font sizes violate the declared test. Production blockers are responsibly recorded; retaining them is correct, but they do not cure these internal mismatches.

### G4 Production feasibility — FAIL

“No 1.2× speed / no fragmented cutting” cannot coexist with the first, second, third and fifth timed rows at 6.3–7.1 spoken characters per second. The V2 fallback to one continuous re-record is good, but a re-record cannot solve a time allocation that is already over-dense. The current static render also fails the literal 360px type requirements. Reduce/re-time the copy first, then run one natural uncut read with pauses and validate the corrected 360px artifacts. Real-person footage, consent and source cards remain valid listed blockers after that.

### G5 Original transfer — PASS

The source mechanism has been transferred as functional directing principles—immediate tension, proof-first and a person carrying relationship/emotion—while subject, audience situation, proof, visual treatment and production structure all differ. V2 expressly excludes the red-haired persona, palette, subtitle template and source footage. No causal success claim is imported from the reference.

### G6 Measurement — FAIL

The design correctly names a single intended intervention, denominator, guardrails, minimum 3,000 valid plays per version, effect thresholds, two comparable batches, non-random-post caveat and stop rules. It fails because its actual A/B treatment is under-specified: B’s card changes proof object while the locked copy still states the #27588 result, and the plan does not state whether voice, source card, title/cover or only the visual card changes in 0–3.5s. That creates a promise-confound and prevents attribution to one defined opening variable. Pre-register two internally coherent 0–3.5s packages (voice + card + source treatment), call that one variable “opening proof package,” and lock everything else exactly as V2 already proposes.

### G7 Safety and rights — PASS (directing spec only)

V2 has adequate no-release conditions and safe fallbacks: private-session material may be replaced by self-made summaries; public sources are minimal attributed extracts; music, effects, font, screen recording and likeness require rights; the cross-vendor distinction is explicit; a second reviewer checks the encoded export. The human approval is still pending and no actual asset is cleared for publication.

## Exact blockers before a new independent review

1. Replace the locked timing table with one natural measured read. No beat may require accelerated delivery, sentence fragmentation or undefined voice overlap; report actual duration per row.
2. Change the 360px prototype CSS and all render content so body text is at least 16px and source labels at least 12px; regenerate P/S/E/F at exactly 360×640.
3. State audience, use moment, demand evidence/hypothesis, primary job, cover, and either a real follow contract or an explicit save/comment-only endpoint.
4. Write the A/B opening packages in full, each with matching voice, visual claim and source boundary. Keep `3.5–61s`, title, cover, caption, CTA, duration, sound and time window fixed, or log the exact exception.
5. Only after source footage, consent and redaction clear: capture the four real-media state frames plus pre/mid/post frames for the two key transitions; have the named content owner mark `EDIT_ACCEPTED` or record the concrete failure.

## JUDGE

Not run: G0, G2, G3, G4 and G6 failed. No quality score can override these hard gates.
