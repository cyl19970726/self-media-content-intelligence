# Dev-workflow Skill run notes

## Scope and input isolation

This run used only:

- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/6928316c000000001e0397ba.mp4`
- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/6928316c000000001e0397ba.srt`
- `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/evidence/evidence-pack.json`

No existing report, analysis, editorial note, comment/metric source, external web source, or other agent output was read. All writes stayed under this `skill-run/` directory.

## Canonical Skill execution

The canonical Skill was read completely:

- `/Users/hhh0x/.codex/skills/video-content-reconstruction/SKILL.md`

The referenced instructions were also read before their stages:

- `references/probe.md`
- `references/evidence-policy.md`
- `references/capture-protocol.md`
- `references/reconstruction.md`
- `references/evaluation.md`
- `schemas/probe.schema.json`
- `schemas/capture-protocol.schema.json`
- `schemas/reconstruction.schema.json`

Round one read all 32 verbatim cues, inspected the 26 shot boundaries in the evidence pack, and inspected video-derived dense contact frames for overlays, UI states, prompt/config text, result previews, before/after states, gestures/actions, and editing reversals. The supplied evidence directory contained only `evidence-pack.json`; its listed `frames/...` paths were not materialized there, so initial visual inspection was derived directly from the supplied video inside the permitted output directory. This did not block the protocol stage.

## Video-specific protocol

The protocol was derived around this video's actual dependency chain, not a closed content category:

1. hook and three-hour/no-code/template claims;
2. Claude Code install and Kimi CLI alternative;
3. API Key creation;
4. Moonshot endpoint and Kimi K2 Thinking environment variables;
5. Claude Code success state;
6. game-prompt fields and framework output;
7. missing-art before state;
8. user-prepared asset folder, agent integration, and preview after state;
9. dialogue examples and author quality claim;
10. old layout, natural-language revision, CSS edit, and new layout;
11. multi-genre examples and low-skill generalization.

The protocol contains 13 capture actions. API creation, configuration success, missing-art transition, asset integration, and layout revision use explicit before/during/after frames. OCR-heavy configuration and prompt windows use 0.2–0.5 second density; the layout revision uses 19 exact samples across 89.3–98.8 seconds.

## Targeted evidence execution

The Skill's canonical script was executed:

```bash
node /Users/hhh0x/.codex/skills/video-content-reconstruction/scripts/capture-protocol-evidence.mjs \
  --video /Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/median-performance/media/6928316c000000001e0397ba.mp4 \
  --protocol /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run/capture-protocol.json \
  --out /Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run/targeted-evidence
```

Result: 13 actions and 188 targeted frames. Every action group was visually inspected.

Key observations retained as observations rather than externally verified facts:

- the install command shown is `npm install -g @anthropic-ai/claude-code`;
- the MacOS/Linux configuration screen shows `https://api.moonshot.cn/anthropic`, `${YOUR_MOONSHOT_API_KEY}`, and `kimi-k2-thinking-turbo` across the listed model variables;
- the API Key page shows an empty-list before state, new-key control, and confirmation dialog, but no usable secret value;
- the game prompt visibly has a long structured form, while only worldview, protagonist, plot, gameplay, and values are safely recoverable as required fields from speech;
- user-provided art assets appear in a folder before Claude Code is instructed to locate and place them in the game;
- the layout request asks to remove the large background character and retain only the thumbnail under the dialogue box;
- Claude Code reads `index.html` and `styles.css`, changes the character layer to `display: none`, reports completion, and the new preview matches the requested visible change.

## Deterministic self-checks

- `probe.json`, `capture-protocol.json`, and `reconstruction.json` parse as valid JSON.
- All three files satisfy the required canonical schema fields using the local AJV validator (the draft declaration was omitted only from the local AJV-6 compile step; the files retain the canonical schema versions).
- Transcript contract: 32/32 cues preserved. A sorted field-by-field diff of `id`, `start`, `end`, `text`, `representativeFrame`, and `overlappingShots` against the evidence pack produced no differences.
- Evidence resolution: 130 evidence references across knowledge units and relations were checked; 130/130 resolve to cue, shot, evidence-pack frame, or targeted-frame IDs.
- Knowledge units: 28 total; 22 core. Core units with at least one valid evidence reference: 22/22.
- Meaning changes: 11 detected, 11 captured.
- Relationship hypotheses: 9 proposed, 9 represented with evidence or an explicit “author framing / edited presentation” qualifier.
- Critical questions: 10 total; all answered, answered with bounded unknowns, or correctly marked unknown.
- Available information carriers: 9; inspected 9; unchecked 0.
- Meta-question was answered exactly in `reconstruction.json`; no unchecked carrier, meaning change, or relationship was found after targeted review.

## Preserved unknowns and remaining limitations

- No real API key, account condition, price, quota, region restriction, or security procedure is established.
- The full reusable game-prompt template is not completely legible in the video.
- The image-generation tool, prompt, model, parameters, consistency method, and rights handling are not shown.
- Installation failures, API failures, dependency versions, deployment, persistence, sharing, and automated tests are not shown.
- The edited video does not independently prove three continuous hours, zero manual code editing, universal beginner reproducibility, dialogue quality versus professional writers, or that all three closing genres were generated by the same complete process.
- The supplied evidence pack's referenced representative/dense frame files were absent from the supplied evidence directory. Targeted evidence was generated successfully from the source video, but this run did not alter or repair the supplied evidence directory.

No independent `evaluation.json` or `gate-report.json` was produced because this assigned run did not include a separate reviewer closure. No readiness token is asserted. `article.md` was written only after the structured reconstruction and the checks above.
