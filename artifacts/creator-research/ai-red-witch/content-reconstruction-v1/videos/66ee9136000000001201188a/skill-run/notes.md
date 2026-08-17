# Skill-run repair notes

Date: 2026-08-16

Status: `SCHEMA_VALIDATED_RECONSTRUCTION_ONLY`

This note records repairs made inside `skill-run` after reading the video-specific `evaluation/discrepancies.md`. No audit or evaluation file was edited, and no `READY_FOR_DOWNSTREAM_USE` claim is made.

## Evidence corrections

- At 9.25 seconds, a monitor-region crop confirms the full UI text: `In queue` and `Your video is in queue and will start in a few minutes.`
- The queue text is now preserved verbatim and linked directly to the simultaneous headline `1分钟做科幻大片`. The relationship is modeled as direct temporal tension, not merely missing timing proof.
- The 9.25-second frame also shows that the English prompt was already present below the input while the queue panel was visible. The reconstructed chronology now says the edit first emphasizes the queued input and later shows a closer prompt view; it no longer implies a clean blank-input-to-prompt page sequence.
- At 14.25 seconds, a result-pane crop confirms visible `Extend` and `Lip Sync` controls. No click or applied state is observed.
- `Gen-3 Alpha` remains a visible result label. Model selection is explicitly not shown.
- The filmed-monitor montage does not establish whether the UI is a live session, prerecorded screen content, or a staged display.

## Audio boundaries

- Fresh evidence establishes only that the post media has an AAC audio stream.
- The prior unsupported `stereo` and no-significant-silence assertions were removed.
- Channel layout and silence structure are now explicit unknowns because no supporting artifact is available.
- The post's AAC stream is separated from the displayed result clip's own audio. Whether the 10-second result has usable audio, what it contains, and whether lip sync was applied are all unknown.

## Regenerated evidence and validation

- The repaired protocol contains 10 capture actions.
- Targeted evidence was regenerated: 182 frames.
- macOS Vision OCR was regenerated: 1,138 line proposals, 0 failed frames.
- `probe.json`, `capture-protocol.json`, `ocr-evidence.json`, and `reconstruction.json` all pass their JSON schemas.
- All cited cue, source-frame, targeted-frame, OCR, and derived-source references resolve.
- Before the V2 audio closure, reconstruction contained 22 knowledge units, 19 core units, and 13 semantic relations.

No `evaluation.json` or `gate-report.json` was created or modified by this repair.

## V2 audio listening closure

- Decoded and bounded the source audio to 0–18.137 seconds in `audio-evidence/source-audio-0-18.137.wav`.
- Because the current model interface rejects direct audio input, used transparent machine listening rather than pretending human playback was heard: `MIT/ast-finetuned-audioset-10-10-0.4593` ingested the decoded waveform across 19 overlapping windows and four semantic regions; an L–R center-cancelled residual was supplementary only.
- Raw listening probabilities/features are in `audio-evidence/machine-listening-raw.json`; bounded segment decisions are in `audio-evidence/listening-segments.json`; human-readable limitations and observations are in `audio-evidence/listening-notes.md`.
- Accepted finding: music is detected in opening, input/queue, result and closing regions, with changing residual energy rather than constant level.
- Accepted finding: short effect-like/percussive candidates are intermittent; literal whoosh/ding/keyboard/etc. classifier labels are not treated as fact.
- Result-clip own audio remains `unknown_not_separately_attributable`: narration and music continue over the displayed result, and no new source can be tied to the embedded clip.
- Reconstruction now registers the decoded source, raw audition output, segment ledger and notes as derived sources.
- Final reconstruction contains 24 knowledge units, 19 core units, 14 semantic relations, and 8 registered derived sources. The audio ledger covers 0.000–18.137 seconds without gaps across four semantic regions and 19 overlapping windows.
- The four JSON deliverables still pass their schemas after the audio additions; all cited visual/audio evidence references and registered derived-source paths resolve.
- No evaluation-v2 file was read or modified during this closure, and no READY claim is made.

## V2 timestamp-bound correction

- `OCR-00139` belongs to `TARGET-0028` at 9.20 seconds and reads `In queue`.
- Visual inspection of that frame confirms the same queued-input page state represented by KU-06; this is not an unrelated early OCR hit. KU-06 therefore now begins at 9.20 seconds, while the 9.25-second targeted crop remains the stronger evidence for the complete queue subcopy.
- The unit statement, OCR support text and report timeline were synchronized to that observed onset. No unrelated unit range was widened and no audit or evaluation file was changed.
- Post-correction schema validation passes for probe, protocol, reconstruction and OCR. The deterministic validator run against `evaluation-v2/evaluation.json` passes all 22 gates, including `internal_timestamp_bounds`, with no failed gate IDs; its output was streamed rather than written as a gate-report artifact.
