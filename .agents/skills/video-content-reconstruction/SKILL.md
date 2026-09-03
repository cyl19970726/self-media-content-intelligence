---
name: video-content-reconstruction
description: Reconstruct a video's full content with an adaptive, evidence-backed two-round workflow. Use when Codex must understand, restore, analyze, convert to an article, document, or audit any video whose important information may live across speech, subtitles, on-screen text, interfaces, actions, parameters, before/after states, examples, claims, counterexamples, or visual transitions. First probe the viewer's intended cognitive change, information carriers, meaning changes, relationship structure, and omission risks; then derive and execute a video-specific capture protocol. Do not route by a closed content taxonomy.
---

# Video Content Reconstruction

Reconstruct what a viewer can know, do, decide, believe, or feel after watching a video. Preserve evidence and uncertainty before writing interpretation.

## Non-negotiable model

Do not begin from a fixed video category. Run two rounds:

1. **Probe** the video's information structure.
2. **Derive and execute** one merged capture protocol specific to this video, then read the same evidence through three Builder lenses.

Keep reconstruction separate from downstream analysis such as “why it went viral” or “what to copy.” A Builder result may support explicitly provisional downstream analysis after deterministic validation; only independently evaluated results may be promoted as verified Wiki knowledge.

## Roles and execution modes

This Skill owns both single-video roles:

- **Builder (required):** inspect the source, build evidence, reconstruct the content, and close the internal coverage/meta-gate.
- **Evaluator (optional):** run in a fresh process, independently inspect the source and Builder artifacts, and decide whether the candidate can be promoted as verified knowledge.

Runtime agents enter through the concise role contracts: [builder-operator.md](references/builder-operator.md) and [evaluator-operator.md](references/evaluator-operator.md). The host prepares and fingerprints media inputs before Builder starts. Builder does not own ASR/OCR provider discovery or transcription process lifecycle; Evaluator is one fresh independent process that performs the general gate and all three content/directing/visual lenses without pretending they were three processes.

Deterministic schema and reference validation is required in both modes. The Host owns immutable transcript/frame mappings and mechanical execution state, and assembles them with the Builder's semantic output before validation. The default fast path may stop after Builder validation and return `BUILT_UNEVALUATED`. Run the optional Evaluator to reach `VERIFIED`; when evaluation finds quality problems, preserve the usable candidate as `EVALUATED_WITH_FINDINGS`. Use `NOT_READY` only when the Host cannot assemble a minimum valid candidate.

Use `media-use` as the media capability dependency. Resolve the available transcription/OCR/media providers once at host or Worker startup; do not rediscover a known-unavailable provider inside every video run.

## Inputs

Require:

- one local video file or an already-built evidence pack;
- subtitles when available;
- a writable output directory.

Treat post copy, comments, metrics, and external sources as separate optional evidence channels. Never silently merge them with video-internal evidence.

## Step 1 — Build the initial evidence pack

Run:

```bash
node <SKILL_DIR>/scripts/build-evidence-pack.mjs \
  --video /absolute/path/video.mp4 \
  --subtitles /absolute/path/subtitles.srt \
  --out /absolute/path/run/evidence
```

The script produces media metadata, verbatim subtitle cues, scene-derived shots, representative frames, dense probe frames, and `cue ↔ representative frame ↔ all overlapping shots` mappings.

If no subtitles exist, transcribe with the available media/transcription capability first and mark its origin as machine transcription.

## Step 2 — Round-one probe: discover three kinds of unanswered questions

Read [probe.md](references/probe.md) and [evidence-policy.md](references/evidence-policy.md). Inspect the transcript, contact frames, shot boundaries, overlays, UI states, gestures, before/after states, and result shots.

Write `probe.json` against [probe.schema.json](schemas/probe.schema.json). The probe must discover:

- intended viewer cognitive change;
- a gap-free full-timeline carrier sweep, including an explicit non-speech-audio decision when the media has audio;
- available information carriers and their roles;
- meaning-changing events;
- relationships among candidate knowledge units;
- omission risks and unresolved areas;
- critical questions a reconstruction must answer.

Before closing the probe, run a **referent, boundary, and absence audit**. Resolve what each visible person/avatar, application, document, environment, inserted clip, disclaimer, and CTA element refers to; keep spoken generic labels separate from visible product identity; record meaning-bearing elements that are absent across the inspected timeline when their absence changes the viewer's decision. This is open-ended carrier discovery, not a category template.

The probe must not produce the final summary and must not choose a closed category template. It must leave three explicit question sets for round two:

- **内容问题：** 哪些知识、参数、操作、结果、边界还无法还原；
- **编导问题：** 哪些钩子、承诺、推进、证明、高潮或收束还无法解释观众认知变化；
- **画面与剪辑问题：** 哪些信息载体、切换、前后状态、结果出现、字幕/UI/口播分工或声音作用还无法解释。

## Step 3 — Derive the video-specific capture protocol

Read [capture-protocol.md](references/capture-protocol.md). Generate `capture-protocol.json` against [capture-protocol.schema.json](schemas/capture-protocol.schema.json).

Define for this video:

- the knowledge-unit fields needed to preserve its cognitive change;
- which intervals require denser observation;
- whether actions require before/during/after frames;
- whether arguments require claim/evidence/condition/counterexample/action links;
- which OCR, UI, parameter, example, or visual-result evidence must be captured;
- stopping rules and explicit unknowns.

Each V2 capture action must declare `consumers` and `presentationIntent`. Merge actions that ask for the same time range and carrier: one observation may feed content restoration, directing logic, and visual editing. Do not run three independent full-video capture sweeps.

Do not use a generic extraction checklist as the protocol. Every requested field and capture action must trace to a probe finding or omission risk.

## Step 4 — Execute targeted capture

Run:

```bash
node <SKILL_DIR>/scripts/capture-protocol-evidence.mjs \
  --video /absolute/path/video.mp4 \
  --protocol /absolute/path/run/capture-protocol.json \
  --out /absolute/path/run/targeted-evidence
```

Inspect the generated `contact-sheet.jpg` first, then open only the original frames needed to resolve remaining questions. Add OCR/visual observations as observations, not raw facts. If a frame hides the relevant action or text, resample; a midpoint frame is never proof of an entire interval.

When the protocol contains `ocr_review` or `ui_state_review`, run the macOS Vision OCR evidence pass:

```bash
node <SKILL_DIR>/scripts/run-ocr.mjs \
  --manifest /absolute/path/run/targeted-evidence/targeted-evidence.json \
  --out /absolute/path/run/targeted-evidence/ocr-evidence.json
```

Inspect OCR against the frames. OCR output is a proposal, not ground truth: preserve confidence, correct nothing silently, and cite accepted rows with `refType: "ocr"`. If OCR fails or small text remains unreadable, resample/crop or mark the field unknown. A sampled screenshot without an executed text/UI reading does not close that channel.

## Step 5 — Reconstruct through three Builder lenses

Read [reconstruction.md](references/reconstruction.md). Write `reconstruction.json` as `video-reconstruction-2.0` against [reconstruction.schema.json](schemas/reconstruction.schema.json).

For every core knowledge unit:

- distinguish `raw_fact`, `visual_observation`, `author_claim`, `system_inference`, and `unknown`;
- attach a valid time range and evidence references;
- preserve relationships and dependencies;
- include input/action/parameter/output and before/during/after evidence when procedural;
- include claim/evidence/condition/counterexample/action relations when argumentative or strategic;
- list what the video does not establish.

Account for the full verbatim transcript. The Host restores each cue's exact text, representative frame, and overlapping shots from the frozen evidence pack; Builder owns semantic cue accountability, not mechanical copying accuracy.
Account for every cue in `coverageMatrix.cueAccountability`; a cue may be knowledge, context, nonsemantic, or uncertain, but it may not silently disappear from the knowledge model. The Host generates the ordinary cue→knowledge-unit candidate map deterministically from frozen time ranges. Builder should spend judgment only on semantic exceptions such as nonsemantic/uncertain cues, boundary-spanning cues, or an intentional assignment that differs from the time-overlap candidate. Recheck the opening and closing cues, all short on-screen cards, observable likeness/symbols, counted result groups, claim scope, and global cross-segment relationships before writing the article.

Also reconcile speech labels with visible UI identity, literal failure signatures with result states, edited chronology with the claimed or inferred procedure, every visible qualifier/disclaimer, avatar or setting referents, and decision-relevant absences. A statement that something is absent requires a documented full-scope inspection; silence or a missed sample is not negative evidence.

After the shared knowledge model is stable, produce all three `builderLenses`:

1. **contentRestoration** — a readable, multimodal report. Put key frames, detail crops, before/after states and operation sequences next to the claim they establish. A separate frame gallery is only a secondary index.
2. **directingLogic** — explain the viewer's before/after state and the hook, problem, promise, progression, proof, payoff and ending. Every stage needs a distinct function, cognitive change and evidence; do not rephrase one generic sentence across stages.
3. **visualEditing** — explain what each visual carrier communicates, technical shot/meaning changes, subtitle/UI/voice division of labor, pacing, result timing, transitions, continuity gaps and readable non-speech audio. Do not infer editing technique from transcript alone.

These are three readings of the same frozen evidence, not three unrelated summaries. Builder produces them before any optional Evaluator starts.

## Step 6 — Coverage matrix and meta-gate

Build a coverage matrix by channel, meaning change, relationship, critical question, and unresolved item. Use scoped numerators and denominators; never emit a single “completeness 100%.”

Answer the meta-gate using stable ID `uncovered_information_audit`; the human-readable question may be localized:

> 原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？

If any available channel remains unchecked, the reconstruction fails. A carrier that was checked but cannot be read semantically is `checked_unreadable`, not unchecked; it closes coverage only when the limitation and resulting unknown are explicit and no semantic claim is made from it.

## Step 7 — Validate Builder, then optionally evaluate

Validate schemas first:

```bash
python3 <SKILL_DIR>/scripts/validate-schemas.py \
  --probe /absolute/path/run/probe.json \
  --protocol /absolute/path/run/capture-protocol.json \
  --reconstruction /absolute/path/run/reconstruction.json \
  --ocr /absolute/path/run/targeted-evidence/ocr-evidence.json
```

Omit `--ocr` only when the protocol contains no `ocr_review` or `ui_state_review` action.

After Builder schema, reference, media fingerprint, and required-channel checks pass, the fast path may stop with `BUILT_UNEVALUATED`. Do not create placeholder evaluation artifacts.

When the task requests formal verification, run the Evaluator in a fresh process, then validate the complete result:

```bash
python3 <SKILL_DIR>/scripts/validate-schemas.py \
  --probe /absolute/path/run/probe.json \
  --protocol /absolute/path/run/capture-protocol.json \
  --reconstruction /absolute/path/run/reconstruction.json \
  --evaluation /absolute/path/run/evaluation.json \
  --ocr /absolute/path/run/targeted-evidence/ocr-evidence.json
```

Run the full deterministic evaluation gate:

```bash
node <SKILL_DIR>/scripts/validate-reconstruction.mjs \
  --evidence /absolute/path/run/evidence/evidence-pack.json \
  --targeted /absolute/path/run/targeted-evidence/targeted-evidence.json \
  --ocr /absolute/path/run/targeted-evidence/ocr-evidence.json \
  --probe /absolute/path/run/probe.json \
  --protocol /absolute/path/run/capture-protocol.json \
  --reconstruction /absolute/path/run/reconstruction.json \
  --evaluation /absolute/path/run/evaluation.json \
  --out /absolute/path/run/gate-report.json
```

Read [evaluation.md](references/evaluation.md) before running independent evaluation. Hard GATE results are binary; readability and execution value cannot compensate for a failed gate. On failure, return to the failed closure: probe, capture protocol, evidence, reconstruction, or independent evaluation.

## Required output contract

Builder fast path must deliver:

- `evidence/evidence-pack.json` and generated frames;
- `probe.json`;
- `capture-protocol.json`;
- `targeted-evidence/targeted-evidence.json`;
- `targeted-evidence/ocr-evidence.json` when OCR/UI capture was requested;
- `reconstruction.json` using `video-reconstruction-2.0`, including `builderLenses.contentRestoration`, `builderLenses.directingLogic`, and `builderLenses.visualEditing`;
- `builder-validation.json` from the host-side deterministic validator.

Verified mode additionally delivers:

- `evaluation.json` from an independent reviewer;
- `gate-report.json`;
- the required independent lens artifacts.

A human-readable report is a deterministic renderer output generated from the fixed multimodal content blocks. It embeds the selected evidence near the relevant explanation and is required after Builder validation, but is not authored as a separate source of truth.

Use `BUILT_UNEVALUATED` after Builder validation passes without evaluation or when the optional Evaluator itself fails; distinguish the two with `evaluationMode`. Use `EVALUATED_WITH_FINDINGS` when evaluation completes with quality findings, and `VERIFIED` only when its gate passes. Both non-verified states remain visible in the workbench but cannot enter the formal Wiki. Use `NOT_READY` only when no minimum valid candidate can be assembled.

## Boundaries

- Reconstruct what the video contains; do not silently verify product claims against the internet.
- Mark external verification as a separate optional stage.
- Do not copy private media, login data, or authenticated URLs into a public repository.
- Do not use an existing human-authored report as hidden ground truth during forward tests.
- Do not infer missing UI actions, parameters, prices, versions, causality, or success rates.

## Validation evidence

Read [evaluation-report.md](references/evaluation-report.md) for the real-video development/holdout results and [known-limitations.md](references/known-limitations.md) before high-stakes downstream use.
