# Run notes

## Scope and input boundary

- Source video: `/Users/hhh0x/self-media/artifacts/creator-research/human-director/media/6a69d19c00000000090357d0.mp4`
- Provided transcript: the same-stem SRT, represented verbatim by the 68 cues in the allowed evidence pack
- Evidence pack: `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/holdout2-director/evidence/evidence-pack.json`
- Source duration: 213.809 seconds; 2160×3840, 30 fps, HEVC video with AAC stereo audio
- No pre-existing human-director dashboard, inventory, analysis, selection, report, audit, baseline, development set, other holdout or other evaluation artifact was consulted.

## Probe round 1: coarse carrier sweep

The complete duration was divided into ten contiguous cognitive sweeps rather than fixed equal chunks. The sweep boundaries follow the opening montage, promise, necessary conditions, three mechanism sections, example, topic selection, form selection, hidden hotspot shortcut, and closing.

The first round registered nine information carriers: speech; supplied SRT and burned subtitles; opening metrics montage; whiteboard text/layout; presenter gesture; masked-presenter referent and classroom-like setting; editing order; the non-speech audio channel; and full-timeline decision-relevant absences. It recorded 12 meaning changes, 16 relationship hypotheses, 9 omission risks and 13 critical questions in `probe.json`.

Visual inspection covered all 16 representative shot frames and all 87 dense frames at 2.5-second spacing, in addition to cue-level evidence. The full AAC track was checked technically with a `-45 dB`, `0.35 s` silence threshold; no qualifying silent interval was reported. That scan cannot separate continuous speech from possible music, ambience or effects, so the narrative role of non-speech audio remains unknown.

## Probe round 2: dynamic capture and OCR

The protocol was generated from round-1 uncertainty rather than a fixed frame count. Ten actions targeted:

1. the sub-second opening montage and its text/metrics;
2. the promise and necessary-condition board;
3. the empathy hierarchy;
4. the shock and rhythm branches;
5. the Fields-example name and combined-mechanism mapping;
6. the topic-selection branches;
7. the form-selection branches;
8. the horizontal boundary and hidden hotspot reveal;
9. the closing referent, subtitle and CTA scope;
10. full-timeline absence checks.

Execution produced 144 targeted stills. macOS Vision processed all 144 and proposed 1,544 OCR lines; OCR was treated only as a proposal layer. Because the first targeted set was 360×640 and whiteboard handwriting remained unreliable, 26 exact-time 2160×1900 crops were resampled from the original video and inspected manually. Accepted readings and explicit ambiguity boundaries are recorded in `targeted-evidence/visual-observations.json`.

The resampling resolved three consequential transcript conflicts inside the video:

- opening burned text `开头展示教资` versus SRT `开头展示饺子`;
- visible board/burned subtitle `王虹` versus SRT `王宏` and `王红`;
- closing burned subtitle `我是人类最强编导` versus SRT `我是人类最善变的`.

The SRT remains copied verbatim in `reconstruction.json`; visible-video corrections are stored as separate visual observations and are not used to infer external identity or factual truth.

## Reconstruction decisions

- Each knowledge unit has one provenance class only: raw fact, visual observation, author claim, system inference or unknown.
- Strong performance, universality, causal and threshold language is preserved as author claim.
- The whiteboard establishes hierarchy and boundary relationships independently of the speech, particularly the separation of the hotspot shortcut from the ordinary two-step branches.
- The video describes a decision procedure but does not demonstrate an end-to-end production run, so no procedural before/during/after block was invented.
- Case identity, award facts, metric ownership, account/platform conditions, BGM parameters/rights, publishing steps and reproduction results remain unknown where the source does not establish them.
- Absence statements are bounded to the complete 0–213.809-second visual scope and documented dense/targeted sampling.

## Output inventory

- `probe.json`
- `capture-protocol.json`
- `targeted-evidence/targeted-evidence.json` and 144 targeted frames
- `targeted-evidence/ocr-evidence.json`
- `targeted-evidence/hires-board/` with 26 resampled crops
- `targeted-evidence/visual-observations.json`
- `reconstruction.json`
- `article.md`
- `schema-validation.json`

No evaluation, self-score, gate report or readiness marker was produced.
