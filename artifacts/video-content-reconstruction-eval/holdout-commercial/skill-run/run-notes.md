# Skill run notes

## Scope and isolation

- Canonical skill: `/Users/hhh0x/.codex/skills/video-content-reconstruction/SKILL.md`
- Direct references read in full: `probe.md`, `evidence-policy.md`, `capture-protocol.md`, `reconstruction.md`, `evaluation.md`
- Direct schemas read in full: `probe.schema.json`, `capture-protocol.schema.json`, `reconstruction.schema.json`
- Inputs used only:
  - `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69424c0d000000001e039745.mp4`
  - `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/selected-high-like/media/69424c0d000000001e039745.srt`
  - `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/holdout-commercial/evidence-v2/evidence-pack.json`
- No dev set, holdout audit, baseline, prior report, prior analysis, editorial notes, or other skill-run was read.
- All writes were confined to `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/holdout-commercial/skill-run/`.

## Execution summary

1. Read the full 28-cue platform SRT verbatim and inspected evidence-pack metadata, shots and cue mappings.
2. Ran a full-timeline visual carrier sweep from the raw video, then denser probe observation around 0–10s, 37–73s, 73–90s and 89–105.6s.
3. Inspected the audio stream separately from speech: AAC HE-AAC, 44.1 kHz stereo, 105.63s. Mid-channel mean level was about -20.4 dB and L–R side-channel mean about -38.2 dB. A full-timeline side-channel spectrogram showed persistent non-central mixed audio after roughly 7s. Exact music/effect/source semantics remain unknown because no reliable source separation or listening label was available.
4. Wrote the video-specific `probe.json` and `capture-protocol.json`.
5. Executed the canonical targeted capture script: 8 actions, 186 frames.
6. Because the protocol contained `ocr_review` and `ui_state_review`, executed the canonical macOS Vision OCR pass: 186 processed frames, 2919 OCR proposal lines, 0 failed frames.
7. Human-checked high-impact OCR against the original targeted frames, including:
   - opening case card and persistent medical disclaimer;
   - Ant A-Fu branding and personal/health-history fields;
   - fatigue input, grouped answer, follow-up questions and seek-care section;
   - caffeine caution text;
   - body-plan values and transitions, with 168cm / 55kg / moderate activity treated as stable later values rather than all transient slider values;
   - separate body-management and sleep-task groups;
   - `今日还有任务未完成，快去打卡！` versus the author's `不会催你` claim;
   - `绝不制造恐慌`, `一整个靠谱`, `能确保隐私安全`, and the spoken `完全确保你隐私` claim.
8. Built `reconstruction.json`, accounting for all 28 cues and all probe carriers, meaning changes, relationships and critical questions.
9. Generated `article.md` only after schema validation succeeded.

## Schema validation

Command shape used:

```text
python3 <SKILL_DIR>/scripts/validate-schemas.py \
  --probe <run>/probe.json \
  --protocol <run>/capture-protocol.json \
  --reconstruction <run>/reconstruction.json \
  --ocr <run>/targeted-evidence/ocr-evidence.json
```

Result:

```json
{"pass": true, "validated": ["probe", "protocol", "reconstruction", "ocr"], "failures": []}
```

## Contract deviations intentionally not produced

- No independent `evaluation.json`: explicitly prohibited for this fresh-context skill-run.
- No independent `gate-report.json`: deterministic gate evaluation requires the separately owned evaluation closure, which was explicitly excluded here.
- No `READY_FOR_DOWNSTREAM_USE` or `NOT_READY` self-label: this runner does not evaluate its own readiness.

## Output inventory

- `probe.json`
- `capture-protocol.json`
- `targeted-evidence/targeted-evidence.json`
- `targeted-evidence/frames/` (186 targeted frames)
- `targeted-evidence/ocr-evidence.json`
- `targeted-evidence/review-sheets/` (human review aids)
- `reconstruction.json`
- `article.md`
- `run-notes.md`
- `probe-observation/` (probe contact frames and audio side-channel spectrogram)

