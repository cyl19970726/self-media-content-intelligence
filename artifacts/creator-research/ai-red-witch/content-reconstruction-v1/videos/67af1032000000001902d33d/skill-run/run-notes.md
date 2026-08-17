# Skill-run notes

## Inputs and scope

- Raw video and supplied SRT from `median-performance/media/67af1032000000001902d33d.*`.
- Fresh evidence pack at `evidence/evidence-pack.json`.
- This run’s own `probe.json`, `capture-protocol.json`, targeted frames/OCR, `reconstruction.json`, and `report.md`.
- Repair input: `evaluation/discrepancies.md`. Evaluation and audit files were read-only and were not modified.

## Repair 1 — non-speech audio closure

The previous run used a spectrogram only. That was insufficient to mark `CAR-08` inspected. The full 0–26.733s audio was divided into five bounded playback files with source ranges and SHA-256 hashes in `audio-listening/segment-manifest.json`.

Listening result: a low electronic instrumental music bed is audible throughout opening, early sample section, UI demonstration, result montage/transition, and closing. It remains semantically constant; no independent UI click/success tone or inserted-clip fire/surf/battle/animal source audio is confidently distinguishable. Source and licence remain unknown. Full evidence and the `absent / constant / change` ledger are in `audio-listening/listening-notes.md`.

Demucs non-vocal separation and AudioSet AST labels were used only to corroborate the listening result; the non-vocal residual’s top label was `Music` in all five regions. These derived model outputs do not establish authorship, ownership, licence, or exact genre.

## Repair 2 — final visual boundary

Frame review around the ending establishes:

- battle insert/composite continues through approximately 25.500s;
- 25.500–25.767s is an overlap/transition window in which battle imagery remains visible before the full creator return;
- after 25.767s the battle insert is gone and the presenter-only return has begun; the full creator close-up is anchored conservatively at SHOT-011’s representative time, 26.217s;
- the spoken closing cue begins at 25.675s, so its first words overlap the visual transition rather than beginning on a fully restored creator close-up.

`probe.json`, `capture-protocol.json`, `reconstruction.json`, and `report.md` were synchronized to these boundaries. New boundary frames are under `probe-frames/boundary-*.jpg` and `probe-frames/boundary-contact.jpg`.

## Validation

After the repaired protocol was executed, the targeted manifest contained 8 actions and 143 frames. macOS Vision OCR processed all 143 frames, produced 330 line proposals, and reported 0 failed frames.

Schema validation was rerun for `probe.json`, `capture-protocol.json`, `reconstruction.json`, and `ocr-evidence.json`; all passed. A separate cross-reference check found no unresolved cue/shot/frame/targeted-frame/OCR/source IDs, and the carrier sweep still covers 0–26.733s without gaps. No independent evaluation or gate status is asserted by this skill-run.
