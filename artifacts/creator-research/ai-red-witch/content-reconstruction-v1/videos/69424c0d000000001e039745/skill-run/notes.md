# Reconstruction notes

## Allowed inputs used

- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69424c0d000000001e039745.mp4`
- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69424c0d000000001e039745.srt`
- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/content-reconstruction-v1/videos/69424c0d000000001e039745/evidence/evidence-pack.json`
- Evidence-pack frames under the same `evidence/frames` directory

No project prior report, library, analysis, editorial note, dev/holdout directory, or other candidate was read. The only evaluation-side inputs read were this video's `evaluation/discrepancies.md` and `evaluation-v2/discrepancies.md`, each explicitly required for its repair round; no audit/evaluation file was modified. The canonical Skill and its directly linked reference/schema files were read as workflow instructions.

## Two-round observation record

Round one divided the complete 0–105.6s timeline into ten contiguous cognitive regions and separately registered speech, supplied subtitles, burned captions/overlays, news-style inserted footage, source qualifier, presenter/environment, animated referents, product/onboarding UI, chat/progress UI, goal forms/cards, disclaimers, edit order, bounded absence and non-speech audio.

Round two generated 344 targeted frames across 12 video-specific actions and ran macOS Vision OCR on all 344 frames (4,960 OCR proposals, zero processing failures). High-impact OCR rows were checked against full-resolution frames. A dedicated magnified crop was added for the opening vertical source qualifier because full-frame OCR missed it; the crop OCR also failed to read it, while human visual inspection could read `资料画面非本新闻事件`. That OCR failure is preserved in `crop-ocr-evidence.json` rather than silently repaired.

The non-speech-audio action was subsequently completed against the sound content itself. The complete source stream was decoded to `audio/non-speech-source.wav` (PCM s16le, 16kHz mono, 105.629s, SHA-256 `10d123f104b44124663fc9e890a4a740cc6fe00d587a11e98e39768568ea0a82`). A local MIT AST AudioSet classifier processed 22 contiguous five-second windows with no timeline gaps plus nine four-second windows centered on narrative boundaries. The auditable window scores, RMS values, model snapshot and limitations are in `audio/non-speech-analysis.json`.

## Accepted exact text and boundaries

- Opening headline: `经常熬夜、通宵 频繁点外卖` / `19岁大二学生突发脑梗` / `半边身体不能动，口齿不清` (`TARGET-0001`, `OCR-00001`–`OCR-00003`).
- Opening recovery-state screen claim: `大学生脑血栓已取出 / 能活动，正在恢复中` (`TARGET-0009`; first line `OCR-00047`, second line manually checked because `OCR-00048` misread one character). This is a news-style screen claim, not verified clinical outcome.
- Inserted-footage qualifier: `资料画面非本新闻事件` (human-reviewed magnified crop `SRC-CROP-OPENING`; OCR did not recognize it).
- Persistent bottom disclaimer: `*本内容为产品体验分享，身体不适请及时就医` (`OCR-00006`, `OCR-03306`; checked across ACT-09 full-scope frames).
- Brand card: `蚂蚁阿福`; slogan visually reads `健康是福 / 健康的事就找阿福` (`TARGET-0033`).
- Onboarding fields: member relationship, name/nickname, sex, birth year; then allergy/family/disease/pregnancy/smoking-alcohol history (`TARGET-0036`, `TARGET-0040`).
- Diagnostic UI framing: `补充健康史 获得更精准诊断` (`TARGET-0040`, `OCR-00223`) and `AI诊室•问诊中` (`TARGET-0063`, `OCR-00720`). These labels are recorded verbatim and are not treated as proof of diagnostic ability.
- Initial fatigue query: `我最近总感觉累，是怎么回事？` (`OCR-00270`).
- UI progress states: 10%, 20%, 30%, 40%; states occur in multiple edited question threads and are not one continuous medical progress meter.
- UI medical boundary: `内容由AI生成仅供参考，持续不适请及时就医` or `如有不适请及时就医` (`OCR-00819`, `OCR-01773`, `OCR-03076`).
- Coffee result conditions: 3 cups/day; no obvious discomfort, sleep disturbance or other adverse reactions; no potential health problem; only then `暂时不会直接导致身体透支` (`OCR-01187`–`OCR-01190`).
- Body-goal cards: `每天走8000步`, `记录3顿饭`, `划船机30分钟` (`OCR-01722`, `OCR-01725`, `OCR-01728`).
- Sleep-goal cards: `5分钟睡前放松冥想`, `3分钟专注呼吸`, `渐进式肌肉放松` (`OCR-02085`, `OCR-02088`, `OCR-02091`).
- Reminder state: `快添加任务吧，我将每天提醒你打卡`, `今日还有任务未完成，快去打卡！`, `任务添加成功` (`OCR-02094`, `OCR-02160`, `OCR-02167`).
- Closing overlays: `能看见你 / 能认真回应你 / 能确保隐私安全`; burned caption says `并且完全确保你隐私的健康搭子` (`OCR-03281`–`OCR-03284`).
- Final question: `你最想问的一个健康的问题是什么` (`OCR-03305`).

## Consequential carrier-conflict ledger

1. Narration/SRT: `你看他不会催你` (CUE-023). UI in the same semantic segment: `我将每天提醒你打卡` and `今日还有任务未完成，快去打卡！`. Supported reconstruction: the author frames the reminders as non-pressuring, but the literal UI does contain reminder/urge wording; the distinction is unexplained.
2. Narration/SRT: `再告诉我不加量就行` (CUE-017). UI: a conditional result tied to three cups/day, no obvious discomfort/sleep disturbance/other adverse reactions and no potential health issue, plus long-term-dependence warnings. Supported reconstruction: the narration compresses and drops material conditions.
3. SRT alternates `他` and `她` for the app across CUE-012–CUE-019. The visible product identity remains `阿福/智能体`; no gender identity is established. The verbatim pronouns are preserved and not normalized.
4. UI framing: `获得更精准诊断` and `AI诊室•问诊中`. UI/bottom limits: `内容由AI生成仅供参考，持续不适请及时就医` and `身体不适请及时就医`. Supported reconstruction: this is a consequential capability-boundary tension—diagnostic naming raises expectations while the disclaimers narrow use and direct users to seek care. It does not establish diagnostic accuracy, clinical review or regulatory status.

## Referent audit

- Presenter: recurring first-person experiencer in a stable indoor setup; identity and professional credentials remain unknown.
- Red-haired animated woman: repeated target-user/example-subject role across late-night phone use, coffee, exercise and fatigue; may stand in for the presenter or a generic working woman, but the video does not establish which.
- Black-haired cartoon face on hospital footage: visibly covers a patient face; it is not treated as the same referent as the red-haired avatar.
- News-style inserted footage: context for the claimed case, but one visible qualifier says the footage is not from the reported event.
- `阿福/智能体` UI: visible application/product interface. Narrated Ant Group attribution remains an author claim because no external/company identity page is shown.
- Fixed room/set: provides continuity and direct address; does not establish authenticity, location or expertise.

## Medical, privacy and commercial boundaries

- Medical: no causal proof for the opening brain-infarction story; no external validation of fatigue, caffeine, exercise, diet, weight-loss or sleep advice; UI and bottom disclaimers explicitly direct users to treat content as reference and seek care when unwell.
- Privacy: forms visibly solicit personal and health data. The closing absolute privacy promise is not accompanied by encryption, access-control, retention, sharing, deletion, audit, responsibility or remedy information.
- Commercial relationship: whether this is a paid advertisement is unknown. The permitted evidence does not establish or exclude payment, sponsorship, gifts, affiliate/referral benefit, brand approval/review, or brand editorial/creative control. The persistent `产品体验分享` wording is not proof that the content is non-commercial.
- Commercial/service: in the inspected 0–105.6s timeline, product-reveal interval and 96.51–105.6s closing interval, no download/register control, QR code, link, price, platform, region, account condition or support entity was observed. This is bounded negative evidence only.

## UI chronology and continuity

The evidence pack contains 58 technical shot segments. Dense adjacent-frame review shows many boundaries around 43–59s and 89–96.6s correspond to UI scroll positions, overlays or fast edits. The reconstruction therefore keeps an observed edit-state ledger and does not infer hidden clicks, sends, generation waits, saves or a continuous live workflow. `任务添加成功` is recorded as a visible result state, not proof of persistent saving or a delivered reminder.

## Non-speech audio decision

- Full-timeline coverage: 22 contiguous windows cover 0–105.629s without gaps; nine extra windows center on 7.49, 14.55, 31.958, 38.62, 44.58, 58.79, 73.74, 89.5 and 96.51s.
- Bounded model observation: Music and Speech co-occur in most five-second windows; Music is low-confidence only in the 10–15s window. No complete five-second window is silent (RMS range -17.64 to -23.70 dBFS).
- Transient candidates: the strongest non-speech proposals appear around 38.62–45s (`Ding`/`Beep`), 85–91.5s (`Ding`/`Ping`) and 95–105s (`Plop`/`Whack`). These are model labels, not human-confirmed literal sources.
- Supported role: widespread music-like content may provide cross-segment continuity, and transient candidates may accent transitions. No candidate independently carries a medical, privacy, commercial or CTA claim in the allowed evidence.
- Remaining unknowns: exact sound identity, title, creator, source, license, foreground/background placement, model-label accuracy and editorial intent.

## Deterministic-contract repairs

- `coverageMatrix.relationships[].evidenceRefs` now contains only resolvable cue, shot, targeted-frame, OCR or registered-source IDs. No `KU-*` value is used as an evidence reference.
- Relationship evidence was expanded where needed so both semantic endpoints are represented by direct evidence rather than by knowledge-unit IDs.
- Out-of-range direct references were removed from `KU-25` (`OCR-00006`), `KU-28` (`TARGET-0036`) and `KU-36` (`OCR-00006`). The cross-segment meanings remain in `KU-03→KU-25`, `KU-10→KU-28` and `KU-36→KU-25` relations, where both time endpoints have direct evidence.
- Canonical schema validation passes. The canonical deterministic checker passes all 14 internal/deterministic gates, including `full_timeline_carrier_sweep`, `internal_timestamp_bounds`, `coverage_matrix` and `internal_meta_gate`. Its two evaluation-side failures reflect the unchanged pre-repair `evaluation-v2` unchecked-channel/meta-audit fields; they were not rewritten or treated as a new independent evaluation.
