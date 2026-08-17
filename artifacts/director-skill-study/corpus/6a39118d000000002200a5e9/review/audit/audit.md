# Independent ground-truth audit

Corpus: `6a39118d000000002200a5e9`  
Scope: evidence pack, referenced video/SRT, and referenced shot/cue/dense frames only. No candidate, baseline, V0, observations, other corpus item, or prior report was read.

## Audit status

This audit defines denominators; it does not score any candidate.

- Critical questions: 18
- Core knowledge units: 25
- Consequential carrier conflicts: 15
- Meaning changes: 14
- Relations/dependencies: 15
- Unknown opportunities: 12
- Opening items: 5
- Closing items: 4
- Scoped absence claims: 7
- Challenge families: 10
- Available carrier families: 8

The video is a 141.804-second vertical talk in which a Spider-Man-masked presenter, visually identified by the account label `人类最强编导`, teaches an IP-story framework in front of a densely written whiteboard. The main cognitive movement is:

1. Ground the method in three claimed logics: content is human nature, self-media is `ta媒体` as displayed, and making video is making a product.
2. Explain IP as movement from knowing to trusting and liking to loving, with a claimed reduction in user decision cost.
3. Apply `只要你要，只要我有` first to a person: six audience-desire topics, then the person's achievements, process, setbacks, choices, summary, and advice.
4. Turn those materials into `1+2=3`: lead with results, then beginning/difficulty/turn/rise, adding family affection, romantic love, and loyalty to create warmth.
5. Reuse the same two-sided rule for brands: classify consumer product needs as `新 / 强 / 稳 / 故事 / 平`, then map six brand-personality directions and use culture/slogan/story examples as the brand's `只要我有`.

## Highest-risk evidence issues

The provided SRT is not a safe single source of truth. Burned-in captions, large overlays, pointing, and the whiteboard materially correct it:

- The opening SRT begins with the apparent edit note `开头展示坐姿`, while the video actually opens with a brief analytics/proof insert.
- The personal-topic sequence is split across cues; `刘向东` conflicts with visible `于东来`, and punctuation around `刘强东/曹德旺` is not safely recoverable from the SRT alone.
- `一个板块` conflicts with the explicit five-part overlay `新 强 稳 故事 平`.
- `压力强` should be segmented as `第二是强`; `第三是碗` conflicts with `第三是稳`.
- `shopping` conflicts with the burned caption `奢品`.
- `有个方向航/用先锋` conflicts with `依然是六个方向/行业先锋`.
- `space s`, `扶摇科技`, `群升突围`, and `胖高来何其都` conflict with `SpaceX`, `福耀科技`, `重生突围`, and `胖东来和京东`.
- `多形性物种` and `一篇汽车玻璃` conflict with `多行星物种` and `一片汽车玻璃`.
- The final `福耀科技 → 交个朋友 → 胖东来 → 京东` sequence crosses cue boundaries. The debt/earnings phrase must not be silently labeled an official slogan or assigned with false certainty.
- The closing SRT `人类最上边` conflicts with visible `人类最强编导`.

All 15 conflicts and their evidence windows are enumerated in `audit.json`.

## Required content coverage

A reconstruction should answer, with evidence or a correct unknown:

- What the video promises, who can use it, and what the opening analytics insert establishes or fails to establish.
- The three stated logics and the IP relationship conversion.
- The decision-cost/purchase claim and Xiaomi SU7 illustration, clearly marked as author claims rather than verified causality.
- The two-sided `只要你要 / 只要我有` rule.
- All six personal topic directions and example-person mappings, with uncertainty preserved where the carriers conflict.
- The personal asset prompts: achievement plus how/when; largest setback plus correct choice; one-line success summary; advice to young people.
- The ordered `1+2=3` outline and the separate warmth modifier of family affection, romantic love, and loyalty.
- The transition and structural parallel from personal story to brand story.
- All five product-demand traits and their example groups; category boundaries matter more than the SRT's local punctuation.
- All six brand-personality directions and brand mappings.
- The claimed relationship among founder personality, brand personality, culture, and slogan.
- The final culture/slogan/story mappings, including exact visible corrections and unresolved status around the `交个朋友` line.
- The creator identity, promotional framing, and closing signoff.

## Unknown discipline

The video does not establish the provenance or causality of the opening metrics; the speaker's real identity/credentials; how non-founder IP should adapt the method; evidence or conditions behind `必火`; causal support for lower decision cost or SU7 purchases; the basis for universalizing six Chinese life pursuits; definitions and overlap rules for the five brand traits; operational execution details; effectiveness or a worked before/after; official attribution of every final phrase; exact unreadable whiteboard wording; or the semantic role of non-speech audio.

Those are 12 audited unknown opportunities. Plausible completion is not correctness.

## Opening and closing

The opening contains more than the spoken question: it briefly shows analytics/social proof, establishes a persistent creator/promotion header, states the cross-industry IP trend, asks how to tell a founder-IP story, and qualifies that non-founder IP can also use it.

The closing is also not just a goodbye. It finishes a rapid, mapping-sensitive brand example sequence, identifies the presenter as `人类最强编导`, retains visual promotional framing, and signs off with `下期再见`. The opening promise is answered with frameworks and examples, but no finished story or tested result closes the loop to the opening proof insert.

## Scoped absences

Within all 46 transcript cues, all 58 dense frames, and all 16 shot representatives across 0.000–141.804, the inspected evidence contains no finished personal-IP story, no worked before/after, no empirical citation for the performance or causality claims, no failure cases or limiting conditions, no duration/platform/shot/edit/measurement specification, and no authoritative distinction between official slogans and author paraphrases in the final sequence. The closing speech contains no explicit buy/follow/comment CTA, but persistent account and discount overlays mean the video still has promotional framing.

These are bounded video-internal absence claims. They must not be expanded into claims about external truth or unreadable small whiteboard text.

## Challenge-family disposition

- Identity inversion: applicable. Spider-Man is a mask/persona; visible creator identity is `人类最强编导`.
- Literal failure/result signatures: not applicable as a process-demo family. Opening analytics are proof framing, not a demonstrated procedural result.
- Opening/closing qualifiers and disclaimers: applicable.
- Opening-to-closing semantic relation: applicable.
- UI progress/status: applicable only to the opening analytics insert; no procedural UI exists.
- Referent relations: strongly applicable across four rapid mapping sequences.
- Edited chronology versus dependency order: applicable conceptually; audience want precedes assets, inputs precede outline, and the personal half structurally precedes/parallels the brand half.
- Scoped negative evidence: applicable.
- Consequential carrier conflicts: strongly applicable.
- Technical segmentation versus semantic continuity: strongly applicable; cue-local matching will fail.

## Carrier closure and meta-gate

Eight carrier families are available: speech/SRT, burned captions, large overlays, opening analytics insert, persistent identity/promotion header, whiteboard/pointing, speaker/setting/gesture, and non-speech audio.

Small handwriting is not dependable at the supplied frame resolution unless corroborated or recaptured. The evidence pack confirms audio, but supplies no separate non-speech annotation; therefore any evaluated reconstruction must explicitly say whether it listened for meaning-bearing music/SFX. Treating the SRT as closure of the whole audio channel is insufficient.

Meta-gate question for the evaluator:

> 原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？

The detailed, countable audit ground truth is in `audit.json`.
