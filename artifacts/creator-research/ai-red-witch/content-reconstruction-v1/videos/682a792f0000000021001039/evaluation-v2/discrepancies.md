# Repaired-candidate discrepancies and closure audit

This fresh evaluation used only the current evidence, repaired `skill-run`, independent audit, canonical evaluation protocol/schema, evaluator-design rules, and the prior `evaluation/discrepancies.md` as a list of repair targets. The prior verdict and scores were not used.

## Prior repair-target closure

### D-01 — Sample continuity was reversed

**Status: CLOSED.**

The repair now consistently states that:

- the 0.00–3.23-second cold open is the beginning of the Labubu project later shown in the editor;
- editor project 0:00–0:04 repeats the same sales/growth sequence and provides the matching `3.68 亿 -> 30.4 亿 / 726.6%` script;
- the 25.97–30.53-second map/store segment matches the same project's 00:23 script and preview;
- only the duck after 30.53 seconds is a separate sample.

This correction is synchronized across `probe.json`, `capture-protocol.json`, `reconstruction.json`, its coverage matrix and relations, and `article.md`. The cited frames and editor crops visibly support the match.

### D-02 — Continuity meta-gate was self-confirming

**Status: CLOSED for the continuity relationship.**

`CA-12` now states a falsifiable invariant: matching visual sequence, numeric copy, or project-time position requires same-project continuity unless counter-evidence exists. The protocol executes it against the cold open, editor 0:00, the later 00:23 segment, and the duck switch. This closes the old referent/continuity blind spot.

The overall independent meta-gate still fails for the separate new discrepancy below.

## Remaining discrepancy

### D-V2-01 — Non-speech audio is registered but not semantically inspected

**Severity: Hard GATE.**

**Candidate state**

- `probe.json` marks `CAR-08` available and `inspected=true`.
- `capture-protocol.json` defines `CA-09` as full-track extraction plus spectrogram/silence inspection.
- `reconstruction.json` cites `SRC-AUDIO-WAV` and `SRC-AUDIO-SPECTROGRAM`, leaves music/effects/source/role unknown, but declares `uncheckedChannels: []` and internal `metaGate.pass: true`.
- `article.md` repeats that the existing evidence cannot reliably separate or attribute background music, effects, narration, or generated-project audio.

**Why this remains open**

The WAV file proves that an audio carrier is available. The spectrogram proves signal activity. Neither artifact, by itself, checks semantic content. The `CA-09` frame records are visual samples and cannot establish whether the track contains music, effects, pauses, audio transitions, or a change tied to the queue, editor reveal, result playback, or CTA.

Therefore the current `unknown` is not a result of an adequate inspection method. It is an unchecked available carrier mislabeled as inspected. This violates both the zero-unchecked-channels invariant and the independent meta-gate.

**Required correction**

Perform a listening-capable, time-localized inspection of the full track and record at least:

- whether background music is present and where it changes;
- whether meaning-bearing effects, pauses, or transition sounds occur;
- whether the editor/result windows introduce a distinct audible layer;
- which conclusions remain unknown after that inspection and why.

If that inspection cannot be performed, set `CAR-08.inspected=false`, list it in `coverageMatrix.uncheckedChannels`, and keep the meta-gate failed.

## Correct boundaries to preserve

- The demonstrated input is a Labubu article via WeChat URL; file upload is only a visible option.
- No continuous drag gesture or complete submission action is shown.
- The queue says 13/13 and may take over 10 minutes, so actual generation speed is unknown.
- The editor proves a project, script, captions, timeline, preview, and Export control, not successful export or a final delivered file.
- Automatic attribution of visuals, copy, voiceover, captions, and manual edits remains bounded.
- `全球首个`, `很快`, and `向所有人开放` remain author claims without sufficient proof in the video.
- Access, pricing, account, region, platform, version, support, provenance, permissions, and factual accuracy remain unknown.
- The SRT `告诉他` versus burned-caption `告诉它` conflict remains preserved.
