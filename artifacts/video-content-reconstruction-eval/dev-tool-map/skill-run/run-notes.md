# Skill run notes

## Scope and input discipline

- Canonical Skill: `/Users/hhh0x/.codex/skills/video-content-reconstruction/SKILL.md`
- Read in full before execution: `references/probe.md`, `references/evidence-policy.md`, `references/capture-protocol.md`, `references/reconstruction.md`, `references/evaluation.md`, plus the probe, capture-protocol, and reconstruction JSON schemas.
- Content inputs used only:
  - `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69129479000000000700ac96.mp4`
  - `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69129479000000000700ac96.srt`
  - `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-tool-map/evidence/evidence-pack.json` and its referenced frame assets
- No existing report, analysis, editorial note, or other agent output was read.
- All writes stayed inside `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-tool-map/skill-run/`.

## Execution

- Round-one probe inspected all 6 SRT cues, 10 evidence-pack shots, 23 present dense frames, cue frames, a direct 2 fps probe sheet from the supplied video, and the tool-card/result boundaries.
- `capture-protocol.json` derives all fields and actions from named carriers, meaning changes, omission risks, relations, or critical questions.
- Ran the canonical script:

  `node /Users/hhh0x/.codex/skills/video-content-reconstruction/scripts/capture-protocol-evidence.mjs --video ... --protocol ... --out .../targeted-evidence`

- Script result: 12 capture actions and 76 targeted frames.
- A local Whisper base-model pass checked the supplied audio channel and found six approximate speech spans in the expected order. It introduced lexical errors, so it is retained only under `asr-check/` as a channel-inspection record and never replaces the platform SRT verbatim layer.

## Deterministic self-checks completed

- `probe.json`, `capture-protocol.json`, and `reconstruction.json` parse as JSON.
- All three files validate against their canonical Skill schemas using local Ajv.
- Reconstruction transcript equals the evidence-pack cue contract exactly after projecting the required fields: 6/6 cue IDs, start/end times, original text, representative frames, and every overlapping shot.
- 30 knowledge units total: 26 core and 4 supporting.
- Coverage declaration matches the actual 26 core units; every core unit has evidence.
- All cue, shot, and targeted-frame references resolve; no broken reconstruction evidence references were found.
- All 25 relationship endpoints resolve to knowledge-unit IDs.
- Targeted-evidence manifest contains 76 resolvable frame IDs.
- Meta-gate answer is present exactly and reports no unchecked available carrier, missed meaning change, or missed relation after the checks above.

## Preserved issues and unknowns

1. The evidence pack references `DENSE-0024` at 16.516 s, but the corresponding JPEG is absent. The capture protocol explicitly resampled the ending from the supplied video; `TARGET-0076` is the replacement observation. The manifest inconsistency remains documented rather than hidden.
2. CUE-004 differs by source: the supplied platform SRT says `这个可以给你一键穿搭`, while the burned-in subtitle visibly reads `这个可以给你一键换穿搭`. The verbatim transcript preserves the SRT exactly; the visual wording is a separate supporting observation.
3. Local ASR confirms six speech spans but contains recognition errors (`把/帮`, `一件/一键`, and others). It is not treated as authoritative text.
4. The older man in the co-frame example has a recognizable appearance, but the video supplies no name. Identity remains unknown.
5. Small tool-card sublines and most PPT body text are partly truncated or too small for reliable verbatim extraction. Only clearly legible tool names and high-level visual structure are reported.
6. No product UI, prompt, source asset, parameter, generation run, output provenance, price, version, licensing, success rate, or usage condition is shown. None was inferred.
7. `evaluation.json` and `gate-report.json` were not produced because this assigned run requested the reconstruction artifacts only and provided no independent reviewer closure; the structured reconstruction was self-checked but was not allowed to prove an independent evaluation.

No `READY_FOR_DOWNSTREAM_USE` status is asserted in this run.
