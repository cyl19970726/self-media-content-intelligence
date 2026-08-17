# Dev-workflow V2 run notes

## Scope and input isolation

This run wrote only inside:

`/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/`

Permitted/read inputs were limited to:

- source video: `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/6928316c000000001e0397ba.mp4`
- same-stem SRT: `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/6928316c000000001e0397ba.srt`
- V2 evidence pack: `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/evidence-v2/evidence-pack.json`
- required prior discrepancy list: `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/evaluation-skill/discrepancies.md`
- canonical Skill, its direct references, schemas, and bundled scripts under `/Users/hhh0x/.codex/skills/video-content-reconstruction/`

No prior `skill-run`, reconstruction, article, report, analysis, editorial notes, gate report, or other agent output was read. The discrepancy list was used only as a required miss checklist; all repaired facts were re-established from V2 evidence/source frames.

## Canonical workflow used

The current `video-content-reconstruction` Skill was read completely, along with:

- `references/probe.md`
- `references/evidence-policy.md`
- `references/capture-protocol.md`
- `references/reconstruction.md`
- `references/evaluation.md`
- current `probe`, `capture-protocol`, `reconstruction`, and `ocr-evidence` schemas

The reconstruction schema changed during the run. After canonical validation reported the new contract, it was re-read completely and the output was updated to include `derivedSources`, uniform `procedural` and `argument` objects, machine-readable coverage rows, exact probe relationship IDs, and source-reference provenance rules.

The initial reconstruction run did not produce an independent evaluation. During the reference-normalization follow-up, the already-existing independent V2 evaluation at `../evaluation-skill-v2/evaluation.json` was read and supplied to the canonical validators. No evaluation artifact was created or edited here, and no readiness wording was added to the content article.

## Probe and carrier sweep

- media duration: `111.061` seconds
- transcript cues: `32`
- detected shots: `26`
- audio: AAC stereo, 44.1 kHz, duration `111.061` seconds
- carrier-sweep regions: `13`
- sweep extent: `0.000–111.061`
- sweep continuity: gap-free and non-overlapping
- information carriers: `14`

The non-speech audio carrier uses modality key `audio.non_speech`. `ffmpeg` signal checks at `-45 dB` with a `0.25 s` minimum returned no qualifying silence segment; full and side-channel spectrograms contained persistent energy. Those tools could not reliably distinguish a separate music/SFX source from stereo narration mixture, so the non-speech role remains unknown and no specific music or effect is asserted.

## Protocol execution

The video-specific protocol contains `19` actions:

- README/code/OCR capture for Claude Code and Kimi CLI
- API creation and environment configuration
- full visible success state
- dense specification and existing-project-state reads
- external art UI, variant groups, Finder naming, and file handoff
- local browser boundary and preview review
- layout revision before/during/after
- closing generalization/CTA

The canonical capture script was executed as:

```bash
node /Users/hhh0x/.codex/skills/video-content-reconstruction/scripts/capture-protocol-evidence.mjs \
  --video /Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/6928316c000000001e0397ba.mp4 \
  --protocol /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/capture-protocol.json \
  --out /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/targeted-evidence
```

Result: `19` actions and `577` targeted frames.

## OCR execution and human verification

All `16` protocol actions whose mode is `ocr_review` or `ui_state_review` were present in the full OCR manifest. The three remaining before/during/after actions were also OCRed because the OCR tool processed the complete targeted manifest.

Canonical OCR command:

```bash
swift /Users/hhh0x/.codex/skills/video-content-reconstruction/scripts/ocr-frames.swift \
  --manifest /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/targeted-evidence/targeted-evidence.json \
  --out /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/targeted-evidence/ocr-evidence.json
```

Full pass result: `577/577` frames processed, `5,656` proposed OCR lines, `0` failures.

Because canonical targeted frames are downscaled to 360×640, ten critical frames were additionally re-extracted at source resolution, registered in `ocr-crops-manifest.json`, and passed through the same `ocr-frames.swift` script. Supplement result: `10/10` frames, `318` lines, `0` failures.

OCR was treated as a proposal. High-impact results were checked against the corresponding source-resolution image:

| Check | OCR result | Visual disposition |
|---|---|---|
| Kimi install | `uv tool install --python 3.13 kimi-cli` | exact match |
| Kimi verification | `kimi --help` | exact match |
| Kimi upgrade | OCR omitted the space before `--no-cache` | corrected from frame to `uv tool upgrade kimi-cli --no-cache` |
| Claude version | initial low-resolution OCR misread it | source-resolution OCR and frame read `Claude Code v2.0.31` |
| model/billing | `kimi-k2-thinking-turbo`, `API Usage Billing` | verified |
| greeting | `hi`, English reply, `你好`, Chinese reply | verified |
| technical spec | SPA, HTML5, Vanilla CSS/no Tailwind, ES6+, OOP, state management | verified against scrolling spec frames |
| systems/UI | GameEngine, localStorage, bad ending, CharacterManager/NPC, HUD, index.html/styles.css/game.js | verified where legible; requirements are not treated as tested features |
| project state | story/characters/assets populated; gameplay/image pipeline empty | verified; origin kept unknown |
| Finder files | `*_neutral.png` portrait and `bg_*.png` background conventions | verified; a few OCR filename fragments remain imperfect |
| local boundary | double-click `index.html` and run in browser | verified |
| revision | human prompt, `styles.css` edit, CSS parameters, changed preview | verified as before/during/after |

## Reconstruction checks

- knowledge units: `24`
- core units: `18`
- transcript cues preserved: `32/32`
- cue-accountability rows: `32/32`
- duplicate/missing cue IDs: none
- probe meaning changes represented: `15/15`
- probe relationship hypotheses represented with exact IDs: `12/12`
- critical questions represented: `19/19`
- unchecked carriers: none
- derived sources registered: targeted manifest, full OCR, critical high-resolution OCR supplement, and audio signal inspection

Important bounded facts:

- Project documents and some assets were already present when the coding agent read the folder; their origin is unknown.
- The external image-generation UI is unbranded; platform/model/settings/licensing are unknown.
- The human performs or owns specification, API handling, external art selection/file placement, line review, layout critique, and revision direction.
- The observable deliverable is a local `index.html` browser SPA preview, not evidence of hosting, native/mobile packaging, a standalone executable, or release.
- Save/load, bad endings, random events, character details, affinity/date/gift logic, schedule/actions, responsive behavior, and deployment are specified or suggested but not operated in the shown preview.
- Hard cuts do not prove all terminal, document, asset, and preview states belong to one unchanged project version/session.
- Three-hour, absolute zero-code, cross-genre, and beginner-universality statements remain author claims.

## Schema validation

The canonical validator was run with probe, protocol, reconstruction, and full OCR artifacts:

```bash
python3 /Users/hhh0x/.codex/skills/video-content-reconstruction/scripts/validate-schemas.py \
  --probe /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/probe.json \
  --protocol /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/capture-protocol.json \
  --reconstruction /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/reconstruction.json \
  --ocr /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/targeted-evidence/ocr-evidence.json
```

Final schema result: `pass: true`; validated `probe`, `protocol`, `reconstruction`, and `ocr`; failures: none.

The high-resolution OCR supplement was also checked independently against the OCR schema.

## Reference-normalization follow-up

The latest deterministic validator requires every evidence reference to be a single resolvable ID. The follow-up therefore changed only `reconstruction.json` and this note:

- removed every ranged/pseudo reference such as `TARGET-0001..TARGET-0015`, `SHOT-009..SHOT-022`, and `path#OCR-range`;
- replaced each range with sufficient individual `CUE-*`, `SHOT-*`, `TARGET-*`, or canonical `OCR-*` IDs that exist in the supplied manifests;
- cited the registered `DS-03` derived source plus the corresponding actual `TARGET-*` frame when a fact depends on the separate high-resolution crop OCR, which is not part of the canonical full OCR manifest;
- made raw source references equal the evidence pack's exact video path, with no `#audio` suffix;
- added explicit reasoning to system-inference units `KU-22` and `KU-24`;
- replaced procedural `CROP-010` with actual targeted-manifest frames; `KU-17` now uses `TARGET-0438` → `TARGET-0443` → `TARGET-0445`, while the later explicit run instruction is localized to `TARGET-0526` and the unit range extends to that evidence;
- changed coverage-channel IDs to the exact probe carrier IDs `CAR-01` through `CAR-14`;
- changed relationship and critical-question `evidenceRefs` from knowledge-unit IDs to resolvable evidence/source IDs;
- recalculated core evidence as `20/20` core units with non-empty evidence.

The latest schema validation included the existing independent V2 evaluation and canonical OCR artifact:

```text
pass: true
validated: probe, protocol, reconstruction, evaluation, ocr
failures: []
```

The latest deterministic validator was run with evidence-v2, targeted evidence, canonical OCR, probe, protocol, normalized reconstruction, and `evaluation-skill-v2/evaluation.json`. Its report was directed to `/dev/stdout` so no out-of-scope `gate-report.json` was created or modified.

```text
ready: true
passed: 22
total: 22
failed: []
```

## Remaining issues, not invented

- The exact API secret is unavailable.
- A few character names and some small filename fragments remain OCR-ambiguous; the reconstruction only uses details that survive visual verification or labels them approximate.
- Signal tools cannot reliably identify a distinct non-speech music/SFX source.
- The independent evaluator artifact was supplied from `evaluation-skill-v2`; it was not produced or modified by this run. No persistent gate-report file was produced because the authorized write scope was limited to `reconstruction.json` and `run-notes.md`.
