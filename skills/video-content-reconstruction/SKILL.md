---
name: video-content-reconstruction
description: Reconstruct a video's full content with an adaptive, evidence-backed two-round workflow. Use when Codex must understand, restore, analyze, convert to an article, document, or audit any video whose important information may live across speech, subtitles, on-screen text, interfaces, actions, parameters, before/after states, examples, claims, counterexamples, or visual transitions. First probe the viewer's intended cognitive change, information carriers, meaning changes, relationship structure, and omission risks; then derive and execute a video-specific capture protocol. Do not route by a closed content taxonomy.
---

# Video Content Reconstruction

Reconstruct what a viewer can know, do, decide, believe, or feel after watching a video. Preserve evidence and uncertainty before writing interpretation.

## Non-negotiable model

Do not begin from a fixed video category. Run two rounds:

1. **Probe** the video's information structure.
2. **Derive and execute** a capture protocol specific to this video.

Keep reconstruction separate from downstream analysis such as “why it went viral” or “what to copy.” Do not perform downstream analysis until reconstruction passes every hard gate.

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

## Step 2 — Round-one probe

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

The probe must not produce the final summary and must not choose a closed category template.

## Step 3 — Derive the video-specific capture protocol

Read [capture-protocol.md](references/capture-protocol.md). Generate `capture-protocol.json` against [capture-protocol.schema.json](schemas/capture-protocol.schema.json).

Define for this video:

- the knowledge-unit fields needed to preserve its cognitive change;
- which intervals require denser observation;
- whether actions require before/during/after frames;
- whether arguments require claim/evidence/condition/counterexample/action links;
- which OCR, UI, parameter, example, or visual-result evidence must be captured;
- stopping rules and explicit unknowns.

Do not use a generic extraction checklist as the protocol. Every requested field and capture action must trace to a probe finding or omission risk.

## Step 4 — Execute targeted capture

Run:

```bash
node <SKILL_DIR>/scripts/capture-protocol-evidence.mjs \
  --video /absolute/path/video.mp4 \
  --protocol /absolute/path/run/capture-protocol.json \
  --out /absolute/path/run/targeted-evidence
```

Inspect the generated frames. Add OCR/visual observations as observations, not raw facts. If a frame hides the relevant action or text, resample; a midpoint frame is never proof of an entire interval.

When the protocol contains `ocr_review` or `ui_state_review`, run the macOS Vision OCR evidence pass:

```bash
swift <SKILL_DIR>/scripts/ocr-frames.swift \
  --manifest /absolute/path/run/targeted-evidence/targeted-evidence.json \
  --out /absolute/path/run/targeted-evidence/ocr-evidence.json
```

Inspect OCR against the frames. OCR output is a proposal, not ground truth: preserve confidence, correct nothing silently, and cite accepted rows with `refType: "ocr"`. If OCR fails or small text remains unreadable, resample/crop or mark the field unknown. A sampled screenshot without an executed text/UI reading does not close that channel.

## Step 5 — Reconstruct

Read [reconstruction.md](references/reconstruction.md). Write `reconstruction.json` against [reconstruction.schema.json](schemas/reconstruction.schema.json).

For every core knowledge unit:

- distinguish `raw_fact`, `visual_observation`, `author_claim`, `system_inference`, and `unknown`;
- attach a valid time range and evidence references;
- preserve relationships and dependencies;
- include input/action/parameter/output and before/during/after evidence when procedural;
- include claim/evidence/condition/counterexample/action relations when argumentative or strategic;
- list what the video does not establish.

Include the full verbatim transcript with each cue's representative frame and every overlapping shot.
Account for every cue in `coverageMatrix.cueAccountability`; a cue may be knowledge, context, nonsemantic, or uncertain, but it may not silently disappear from the knowledge model. Recheck the opening and closing cues, all short on-screen cards, observable likeness/symbols, counted result groups, claim scope, and global cross-segment relationships before writing the article.

Also reconcile speech labels with visible UI identity, literal failure signatures with result states, edited chronology with the claimed or inferred procedure, every visible qualifier/disclaimer, avatar or setting referents, and decision-relevant absences. A statement that something is absent requires a documented full-scope inspection; silence or a missed sample is not negative evidence.

## Step 6 — Coverage matrix and meta-gate

Build a coverage matrix by channel, meaning change, relationship, critical question, and unresolved item. Use scoped numerators and denominators; never emit a single “completeness 100%.”

Answer the meta-gate exactly:

> 原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？

If any available channel remains unchecked, the reconstruction fails.

## Step 7 — Validate and evaluate

Validate schemas first:

```bash
python3 <SKILL_DIR>/scripts/validate-schemas.py \
  --probe /absolute/path/run/probe.json \
  --protocol /absolute/path/run/capture-protocol.json \
  --reconstruction /absolute/path/run/reconstruction.json \
  --evaluation /absolute/path/run/evaluation.json \
  --ocr /absolute/path/run/targeted-evidence/ocr-evidence.json
```

Omit `--ocr` only when the protocol contains no `ocr_review` or `ui_state_review` action.

Run deterministic validation:

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

Read [evaluation.md](references/evaluation.md) before running independent evaluation. Hard GATE results are binary; readability and execution value are JUDGE scores and cannot compensate for a failed gate.

Do not announce completion until all applicable hard gates pass. On failure, return to the failed closure: probe, capture protocol, evidence, reconstruction, or independent evaluation.

## Required output contract

Deliver:

- `evidence/evidence-pack.json` and generated frames;
- `probe.json`;
- `capture-protocol.json`;
- `targeted-evidence/targeted-evidence.json`;
- `targeted-evidence/ocr-evidence.json` when OCR/UI capture was requested;
- `reconstruction.json`;
- `evaluation.json` from an independent reviewer;
- `gate-report.json`;
- a human-readable article or report generated only from the validated reconstruction.

Use `READY_FOR_DOWNSTREAM_USE` only when `gate-report.json.ready` is `true`. Otherwise use `NOT_READY` and report failed gates.

## Boundaries

- Reconstruct what the video contains; do not silently verify product claims against the internet.
- Mark external verification as a separate optional stage.
- Do not copy private media, login data, or authenticated URLs into a public repository.
- Do not use an existing human-authored report as hidden ground truth during forward tests.
- Do not infer missing UI actions, parameters, prices, versions, causality, or success rates.

## Validation evidence

Read [evaluation-report.md](references/evaluation-report.md) for the real-video development/holdout results and [known-limitations.md](references/known-limitations.md) before high-stakes downstream use.
