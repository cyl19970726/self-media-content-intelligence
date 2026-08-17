# V2 Skill run notes

## Scope and allowed inputs

- Canonical Skill read in full: `/Users/hhh0x/.codex/skills/video-content-reconstruction/SKILL.md`
- Updated references read in full: `probe.md`, `evidence-policy.md`, `capture-protocol.md`, `reconstruction.md`, `evaluation.md`
- Updated schemas read in full: probe, capture-protocol, reconstruction, OCR-evidence, and evaluation schemas
- Content inputs:
  - `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69129479000000000700ac96.mp4`
  - `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69129479000000000700ac96.srt`
  - `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-tool-map/evidence-v2/evidence-pack.json` and its referenced frames
- Development feedback explicitly allowed and read:
  - `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-tool-map/evaluation-skill/discrepancies.md`
- The discrepancies file was used to design adversarial probe questions and closure requirements, not as a reconstruction evidence reference.
- All writes stayed inside `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-tool-map/skill-run-v2/`.
- V2 JSON files were built from scratch; V1 JSON was not patched or used as an input.

## New-contract execution

- `probe.json` contains 10 contiguous `carrierSweep` regions covering exactly `0–16.556` seconds with no gaps.
- Eleven carrier rows use open `modalityKeys` and `discoveredIn` links. Ten carriers are available and inspected; the absent application-UI/parameter channel is explicitly checked and marked unavailable.
- Non-speech audio was handled independently from the transcript:
  - evidence pack reports AAC audio;
  - a mono review track and full spectrogram were generated;
  - silence detection at `-35 dB` for `0.2 s` found only a final silence from about `16.255–16.557 s`;
  - continuous audio energy through narration gaps is established, while exact music/effect semantics remain unknown.
- `capture-protocol.json` contains 16 video capture actions and one separate audio-inspection action.
- Canonical targeted-capture script produced 77 frames.
- Nine actions use `ocr_review` or `ui_state_review`: all six cards plus all three PPT grids.
- Canonical `ocr-frames.swift` was executed after capture:
  - 77/77 frames processed;
  - 166 OCR lines proposed;
  - 0 frames failed.

## OCR human-check decisions

- Accepted all six card headlines and all six card sublines after checking against source frames.
- Corrected OCR proposals only with visible frame evidence:
  - `视領/视领` → `视频` on the PixVerse subline;
  - `視頻` → `视频` and displayed ellipsis on the 通义 card;
  - `Al Agent` → `AI Agent` on the Manus card;
  - punctuation/ellipsis on the Runway subline.
- Preserved the first card's visible truncation: `通义万相AI视频是阿里推出的...`; no hidden completion was invented.
- Accepted OCR-00068 for the burned-in Runway subtitle `这个可以给你一键换穿搭`, while keeping the platform SRT verbatim as `这个可以给你一键穿搭`.
- PPT thumbnail-body OCR proposals such as `0003` and isolated symbols were rejected. Grid counts and layouts use targeted visual frames, not OCR guesses.
- `reconstruction.json` includes the full OCR review ledger with proposal text, confidence, source frame, decision, accepted text, and human-check note.

## Required reconstruction closures

- Six complete card texts and text roles are present with OCR line references.
- All 6/6 transcript cues are verbatim and each has exactly one `coverageMatrix.cueAccountability` row linked to knowledge units.
- Vidu preserves Steve Jobs-like observable resemblance, black turtleneck/glasses, Apple logo, literal identity unknown, authorization unknown, and the conclusion that one example does not establish `任何人`.
- Runway uses the conservative rule “complete coordinated look, not individual accessory/wipe state” and supports two complete looks beyond baseline.
- Manus preserves three distinct result groups:
  - group 1: 4×3 = 12 thumbnails;
  - group 2: 3×4 = 12 thumbnails;
  - group 3: 3×4 = 12 thumbnails;
  - 36 visible thumbnail instances total, not 36 deliverable files.
- Manus unknowns include theme input, source materials, content accuracy, citations, editability, export format, and generation attribution.
- 即梦 preserves the complete `抖音旗下免费AI图片创作工具` card scope, the `做动漫` claim, the moving illustration, and the unshown image-to-animation bridge.
- Gesture/gaze/reaction, PPT/final layout, same-presenter/same-room continuity, parallel-list/not-pipeline structure, and absent cross-tool handoffs are explicit.

## Validation and self-check

- Ran the updated canonical validator:

  `python3 /Users/hhh0x/.codex/skills/video-content-reconstruction/scripts/validate-schemas.py --probe ... --protocol ... --reconstruction ... --ocr ...`

- Validator result: `pass: true`; validated `probe`, `protocol`, `reconstruction`, and `ocr`; no failures.
- Transcript contract: 6/6 cues exactly equal to evidence-v2 after projecting required fields.
- Carrier sweep: starts at `0`, ends at `16.556`, no gaps, and all `discoveredIn` IDs resolve.
- OCR/UI actions: 9/9 present in OCR evidence; 77 frames, 0 failed.
- Targeted capture: 16 actions, 77 frames.
- Knowledge units: 37 total; 30 core; 30/30 core units have evidence and match the declared coverage count.
- Relations: 27; all endpoints resolve.
- Evidence references: all cue, shot, targeted-frame, OCR-line, and derived-source references resolve.
- Cue accountability: each of CUE-001 through CUE-006 appears exactly once.
- `uncheckedChannels` is empty after the carrier closures above.

## Preserved limitations

1. The exact semantic role of non-speech audio remains unknown; technical continuity is not treated as proof of music or particular sound effects.
2. The first card subline is visibly truncated by the source; hidden text is not reconstructed.
3. PPT thumbnail body text remains mostly unreadable and rejected OCR is not promoted to fact.
4. Product promotions, identity, authorization, workflow, causality, editability, accuracy, citations, exports, and output provenance remain unverified where the video does not establish them.
5. No independent reviewer evaluation or deterministic gate report was produced in this assigned V2 run. The run does not self-assert downstream readiness.

## Latest schema-normalization pass

- Re-read the current reconstruction reference and schema, then normalized `reconstruction.json` without changing `article.md` or its content judgments.
- Registered `AUDIO-TECH-001` as the real local `audio-spectrum.png` derivative with production method, full-video time range, and explicit technical limitations.
- Confirmed the probe retains the canonical `audio.non_speech` modality key.
- Converted every procedural block to the canonical `input/actions/parameters/output/beforeFrames/duringFrames/afterFrames/unknowns` shape and every argument block to the current canonical shape.
- Converted meaning-change coverage to probe IDs plus knowledge-unit links, relationship coverage to all 11 probe `REL-*` IDs plus evidence references, and critical-question coverage to all 17 probe `CQ-*` IDs with canonical status, unit links, and evidence references.
- Re-ran the latest schema validator without an evaluation input. Result: `pass: true`; `probe`, `protocol`, `reconstruction`, and `ocr` validated with zero failures. The deterministic validator remains intentionally unrun because no evaluation artifact exists in this assigned run.
