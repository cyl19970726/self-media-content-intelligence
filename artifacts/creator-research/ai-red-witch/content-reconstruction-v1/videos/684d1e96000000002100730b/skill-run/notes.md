# Reconstruction repair notes

These notes register the bounded changes applied to this skill-run only.

## Audio inspection

- The source AAC track was stream-copied to `audio-evidence/source-audio.m4a` and divided into six contiguous listening excerpts covering 00:00–01:25 without intentional gaps.
- Every excerpt was listened through. Segment-level observations, durations, paths, and SHA-256 identifiers are in `audio-evidence/listening-observations.json`.
- `audio-evidence/source-audio.json`, `full-waveform.png`, and `full-spectrogram.png` are supporting cross-checks, not substitutes for listening.
- The audio is narration-dominant with a light produced background-music bed. No non-speech cue changes the reconstructed problem → cause → method → cases → limits → CTA relationship.
- No precise silence interval is asserted; pauses are described only at the bounded listening-segment level.

## Scope corrections

- The report title now scopes the reconstruction to what this author/video claims; it does not assert that a viewer's AI search universally “always fabricates.”
- In the image-edit example, the input asks to remove the background crowd. The before/after frames only clearly establish that one man behind and to the left of the main subject is no longer visible. They do not establish that every background person was removed.
- The source image's copyright and the permissions/portrait rights of visible people are not established.
- Across the inspected 00:00–01:25 video, no conditions were observed for privacy, uploaded-data use, content/material copyright, latency, or performance variability. This is a video-scope absence, not a claim that the product lacks such policies or behavior.
- The visible presenter is the source of spoken evaluations and the CTA. Her professional qualifications, relationship to the product, and whether she personally performed every screen recording/test are not established.

No audit/evaluation artifacts were edited by this repair.

## Deterministic contract closure

- `CAR-AUDIO-NONSPEECH.modalityKeys` now includes canonical `audio.non_speech` while retaining the bounded-listening descriptors.
- `KU-24` now states the reasoning from six contiguous full-coverage listening observations to its video-scoped inference, while preserving music identity/licensing and masked-effect uncertainty.
- `KU-03` is localized to `CUE-004`/`CUE-005` at 15.19–24.55 seconds. The later `CUE-014` claim remains in its correctly localized `KU-10` unit and was removed from `KU-03` and its cue-accountability link.
- Schema validation passed, and the deterministic reconstruction self-check passed all 22 checks. The self-check output was written to a temporary path, not to audit/evaluation or this skill-run.
