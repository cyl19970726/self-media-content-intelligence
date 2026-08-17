# Skill run notes — 6801c0750000000007037156

## Scope and input isolation

This fresh canonical run used only:

- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/6801c0750000000007037156.mp4`
- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/6801c0750000000007037156.srt`
- `../evidence/evidence-pack.json` and its referenced frames

The initial fresh run did not read any prior report, library, analysis, editorial note, development/holdout artifact, candidate, evaluation, or gate report. During the authorized discrepancy-repair pass, only `evaluation/discrepancies.md` and the readable `evaluation/evaluation.json` were additionally read so deterministic self-check could use the existing independent evaluation without modifying it. All generated or repaired artifacts remain contained in this `skill-run/` directory.

## Execution record

- Fully read the canonical `video-content-reconstruction` Skill, all seven direct references, and all five schemas.
- Read the verbatim 7-cue transcript and inspected the complete 0–29.067-second dense frame sweep, cue frames, shot representatives, UI states, burned captions, visible actions, people/environment, opening/closing, technical segmentation, and bounded absence opportunities.
- Wrote a gap-free 8-region `probe.json`; after discrepancy repair it contains 11 carriers, 9 meaning changes, 11 relationships, 11 omission risks, and 14 critical questions.
- Derived a video-specific `capture-protocol.json` with 9 actions. It specifically targets visible WPS/DeepSeek identity, Markdown residue, exact prompt parameters, HTML code/preview, edited operation chronology, result state, presenter/environment referents, full-scope negative evidence, and segmentation/continuity.
- Executed targeted capture: 9 actions, 103 frames.
- Executed macOS Vision OCR because the protocol contains OCR/UI review actions: 103 frames processed, 907 OCR lines, 0 failed frames.
- Human-reviewed the high-impact OCR proposals against their source frames before using them in reconstruction.
- Wrote `reconstruction.json`, then ran schema validation before generating `article.md`.

## Discrepancy repair pass

- Removed every `KU-*` pseudo-reference from `coverageMatrix.relationships[].evidenceRefs`. REL-01 through REL-11 now contain only resolvable cue, shot, targeted-frame, OCR, or registered source refs, with direct evidence for both relationship endpoints.
- Used the `media-use` audio workflow to decode the complete 0–29.067-second source audio rather than treating `hasAudio=true` as content inspection.
- Preserved `audio-evidence/source-audio.m4a` as the AAC extraction, `analysis-16k.wav` as the full-mix classifier input, `stereo-side-normalized.wav` as the quiet stereo-side inspection input, `source-stereo.wav` as the unaltered PCM measurement source, and `full-listen-normalized.mp3` as the no-cut review copy. SHA-256 values are recorded in `audio-evidence/audio-inspection.json`.
- Ran `MIT/ast-finetuned-audioset-10-10-0.4593` across ten contiguous 3-second/terminal windows of both the source mix and stereo-side residual. The ledger maps those windows into six video stages and records music/atmosphere as `constant` through the body, `change` at the bright closing accent, and step-related UI sound as `absent` in the named action windows.
- The audio finding is deliberately limited: low-level music/atmosphere and a ding-like closing accent are supported; exact music type, source and ownership remain unknown. No detected sound independently proves send, Run HTML, copy, application switch, paste, or menu confirmation.
- Added the previously under-specified bounded absence of privacy notice/data-processing terms across the inspected 0–29.067-second visual/subtitle scope.
- Added a cross-state text correspondence unit: failure document, DeepSeek source answer, HTML preview and final WPS result share the same topic and similar four-part structure, while verbatim identity remains unknown because no full-text diff is available.

## OCR review ledger

Accepted after frame review:

- `OCR-00804`, `OCR-00152`: burned caption uses `deepseek`; this conflicts with verbatim SRT `dipsick`/`dipstick` but does not overwrite it.
- `OCR-00360`–`OCR-00363`: prompt requires HTML output and gives three visible layout rules. OCR confusions such as `諭/排板` were not copied silently; the accepted reading was checked against `TARGET-0023` and `TARGET-0025`. The source-visible repetition `格式和排版排版` was preserved.
- `OCR-00370`, `OCR-00414`, `OCR-00449`, `OCR-00499`: burned captions for send, create document, copy into word, and result claim were visually confirmed.
- `OCR-00123`, `OCR-00130`, `OCR-00540`: section headings used only to establish the structured example/result, not to restore the entire underlying article.

Not upgraded to facts:

- Most low-confidence OCR of the long source article and generated code body.
- Product version, filename/extension, account/model state, and small toolbar text that remained unreadable.
- Any bridge action not visibly executed, including copy command, clicking Run HTML, file save/open, or paste option.

## Key reconstruction boundaries

- The provided subtitle layer remains verbatim: `dipsick` in CUE-001 and `dipstick` in CUE-003.
- Burned captions and UI support the semantic reading DeepSeek.
- Spoken/burned `word` is kept as a generic author label. The visible target is a WPS text-processing interface with a `WPS AI` entry; Microsoft Word is not visually established.
- The literal failure signature is visible Markdown-style residue (`####`, `**`, hyphen bullets), not random unreadable characters.
- Observed edit chronology is preserved separately from inferred operation dependency order.
- Non-speech audio is now closed by full-source machine listening, not metadata. It supports a quiet music/atmosphere bed and a brighter final accent; only exact type/source/ownership remains unknown.
- Full-timeline negative evidence is scope-bound to 0–29.067 seconds and the inspected subtitles/UI/file states; it is never stated as universal nonexistence.
- Privacy notice and input-data handling are named independently in that bounded absence ledger.
- Similar topic/four-part structure across source, failure, preview and result is separated from unproven word-for-word identity.

## Validation

`validate-schemas.py`, including the readable existing evaluation as an input, returned:

```json
{"pass": true, "validated": ["probe", "protocol", "reconstruction", "evaluation", "ocr"], "failures": []}
```

The deterministic validator was rerun to `deterministic-self-check.json` rather than to any audit/evaluation/gate-report path. Result: 20/22 gates passed. All 14 candidate-internal gates passed, including `full_timeline_carrier_sweep`, `coverage_matrix`, and `internal_meta_gate`. The two remaining failures are `eval_unchecked_channels` and `eval_meta_gate`, because the existing independent evaluation predates this repair and still records the old audio-channel finding. That evaluation was read but not edited or replaced.

No independent re-evaluation, self-score, readiness declaration, or `gate-report.json` was produced or modified.
