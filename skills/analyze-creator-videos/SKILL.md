---
name: analyze-creator-videos
description: Orchestrate a creator's complete public portfolio research from profile URL through acquisition, full-corpus annotation, high/median/mean-near/low selection, deep video reconstruction, creator synthesis, optional independent evaluation, and one evidence-backed Dashboard. Use for neutral creator research; keep the user's own copying or publishing strategy in content-strategy-workbench.
---

# Analyze Creator Videos

Build a creator operating system, not a decorative long report. Separate corpus facts, video-internal evidence, author claims, system inferences, external verification, and unknowns throughout.

This is the creator-research orchestrator. Route work to the canonical capability Skills instead of duplicating their judgment:

- `$xiaohongshu-creator-acquisition` for public identity, inventory, detail, comment, cover and media evidence;
- `$creator-portfolio-annotation` for every-post portfolio annotation;
- `$creator-sample-selection` for the shared comparison and deep set;
- `$video-content-reconstruction` for every selected deep video;
- `$creator-research-synthesis` for creator-level conclusions;
- `$creator-research-evaluator` for optional independent acceptance before formal Wiki promotion.

Use `$compare-creators` for a separate multi-creator study and `$content-strategy-workbench` for the user's own creation plan. Neither belongs inside a neutral Creator Dossier.

Read [session-derived-infrastructure.md](references/session-derived-infrastructure.md) before creating a new run or changing the pipeline. Its gates come from the real build history that produced the reference Dashboard.

## Agent-loop boundary

The normal production loop advances immutable stages and resumes only missing work. It must not change
its own Prompt, Skill, Schema, or quality threshold while a creator run is active. A retry of the same
revision is allowed only for a classified transient failure; a quality retry requires a changed input,
contract, evidence, or code fingerprint.

Use two completion levels:

- `DOSSIER_READY`: full-corpus surface coverage is explicit, the registered deep set has usable Builder
  artifacts or explicit blockers, creator synthesis passes deterministic integrity checks, and the
  Dashboard exposes provisional conclusions and unknowns. Independent evaluation may be skipped.
- `WIKI_READY`: the current creator synthesis revision also passes independent evaluation and formal
  knowledge gates. Only this level may be promoted as verified Wiki knowledge.

Evaluator findings do not delete a usable Builder or Dossier result and do not trigger automatic repair.
Use `$session-forensics` only in a separate optimization loop for retained representative traces when the
runtime is slow, repetitive, drifting, or falsely passing; it audits the process and must not solve or
modify the creator analysis itself.

## Core model

Run two connected layers:

1. **Portfolio layer:** inspect every visible post at metadata/annotation level to learn the account's baseline, positioning, content system, distribution, topics, formats, publishing rhythm, and outliers.
2. **Evidence layer:** deeply reconstruct a bounded representative set with `$video-content-reconstruction` before making claims about content mechanisms.

Default deep set: high, median, arithmetic-mean-near, and low performance, 3 videos per group. Use the full corpus for quantitative context, a comparison set of 5–7 per group for pattern induction, and 3 per group for evidence-grade reconstruction. Median and mean are separate because breakout posts can pull the mean far above the typical post. If no post lies within 25% of the mean, label `mean_gap` and compare its nearest lower/upper neighbors instead of inventing an average tier. Do not reconstruct every video unless the user explicitly requests it and accepts the cost.

## Inputs

Accept one or more:

- creator profile URL;
- normalized corpus JSON matching [creator-corpus.schema.json](schemas/creator-corpus.schema.json);
- existing local creator research directory;
- optional local videos, subtitles, covers, comments, and public metrics;
- optional target account or business strategy to inform the final launch plan.

Create a new run directory. Never overwrite an existing creator artifact unless the user explicitly asks to update it. Store authenticated URLs, session state, and login information outside public outputs.

## Workflow

### 1. Establish the analysis contract

Write `analysis-contract.json` and `run-manifest.json` before collecting or interpreting data:

- why the creator is being analyzed;
- decisions the result must support;
- available platforms and snapshot time;
- allowed public metrics;
- unavailable backend metrics;
- default full-corpus, comparison-set, and deep-set sizes;
- target account constraints, if any.

`run-manifest.json` is the single control plane for artifact paths, source revisions, stage status, validation status, and downstream invalidation. Never maintain a second canonical Dashboard or duplicate specification tree for the same creator run.

The Dashboard must answer why this creator is analyzed, what method was used, and which decisions can and cannot be made from the evidence.

### 2. Acquire or normalize the corpus

For Xiaohongshu, read [acquisition-xhs.md](references/acquisition-xhs.md) and [collection-infrastructure.md](references/collection-infrastructure.md), then use `$ego-browser`. Reuse the authenticated `hhh-01` session when available. Respect handoff and user-control rules. Do not use Chrome, Google browser automation, or hidden credential extraction.

When the user asks for broad platform discovery through Xiaohongshu's in-site AI, also read [xhs-site-ai-discovery.md](references/xhs-site-ai-discovery.md). Treat its answer as a candidate generator only; independently open and verify cited creators/posts before they enter the canonical corpus.

Initialize and maintain the resumable collection control plane:

```bash
node <SKILL_DIR>/scripts/init-collection.mjs \
  --out /absolute/path/run/collection-inventory.json \
  --creator-id <known-or-provisional-id> \
  --creator-name <creator-name> \
  --profile-url <profile-url> \
  --server hhh-01
```

Ingest sanitized profile, crawl-round, and detail observations with the bundled ingestion scripts. Never call a timeout or extraction error “end of profile.”

For local input, normalize it directly. Preserve raw snapshots separately from normalized data.

```bash
node <SKILL_DIR>/scripts/normalize-corpus.mjs \
  --input /absolute/path/raw-or-normalized.json \
  --out /absolute/path/run/creator-corpus.json
```

Do not silently convert missing values to zero. Record capture failures and incomplete pagination in `collection-status.json`.

Before portfolio analysis, build the collection gate:

```bash
node <SKILL_DIR>/scripts/build-collection-status.mjs \
  --inventory /absolute/path/run/collection-inventory.json \
  --out /absolute/path/run/collection-status.json
```

Require `inventory_ready`. Before deep reconstruction, require selected media to pass `scripts/verify-media.mjs` and the status to become `deep_media_ready`.

### 3. Annotate every post at portfolio depth

Read [data-contract.md](references/data-contract.md). For every post, add open-ended, multi-label annotations grounded in title, cover, post copy, and available video evidence:

- topic and user problem;
- content form and intent;
- hook and promised payoff;
- target audience and use context;
- proof mode;
- presenter, composition, aspect ratio, screen/UI role, text density, and result visibility;
- content mechanism and likely audience action;
- uncertainty and annotation evidence.

Do not force posts into a closed taxonomy. Add new labels when the corpus demands them. Keep `unclassified` when evidence is insufficient.
Write a versioned `portfolio-annotations.json`. Every observed corpus ID must appear exactly once. A field-level
unknown is a valid annotation; silently omitting a post is not. This full-corpus artifact feeds creator synthesis,
while the canonical 21 selection remains the smaller comparison and deep-research index.

### 4. Compute the full-corpus baseline

```bash
node <SKILL_DIR>/scripts/analyze-corpus.mjs \
  --input /absolute/path/run/creator-corpus.json \
  --out /absolute/path/run/corpus-analysis.json
```

Calculate count, video count, mean, median, percentiles, maximum, distribution, weekday/daypart statistics, topic and format clusters, and candidate pools for high/median/low comparison.

Prefer median and distribution over mean. Display maximum alongside median and mean. Treat likes, comments, collections, and shares as public engagement signals—not exposure, retention, conversion, or follower growth.

### 5. Build the comparison set and choose the deep set

Read [selection-method.md](references/selection-method.md).

- Compare 5–7 videos per high/median/average/low group when available.
- Select 3 videos per group for deep reconstruction, reusing an overlapping median/average item only once.
- Cover distinct mechanisms, content forms, durations, eras, and evidence modes.
- Do not choose nine videos solely by ranking.
- Record `selectionReason`, represented mechanism, alternatives considered, and known confounds for every selected item.

If the corpus is small, shrink tiers and disclose the denominator. Never label a three-video sample “the creator's universal rule.”

### 6. Reconstruct selected videos

Use `$video-content-reconstruction` for each deep-set video. Require Builder integrity before using a
reconstruction in a provisional Dossier; require independent evaluation before treating it as verified
Wiki evidence. Preserve the distinction in every downstream claim.

For every selected video preserve:

- complete verbatim transcript;
- cue ↔ representative frame ↔ all overlapping shots;
- sparse and dense frame views;
- content architecture and core knowledge units;
- viewer cognitive change;
- procedural or argument relationships;
- claims, observations, inferences, and unknowns;
- full readable article that restores the video's key information.

Do not infer tool causality, product capabilities, commercial rights, performance, or success from montage adjacency.

### 7. Synthesize across videos

Generate `creator-analysis.json` matching [creator-analysis.schema.json](schemas/creator-analysis.schema.json). Read [analysis-method.md](references/analysis-method.md).

Separate observed portfolio facts, sample associations, mechanism hypotheses, optional external verification, and unknowns. Explain high vs median vs low through user value, content promise, proof strength, comprehension cost, information density, visual structure, novelty, audience fit, and CTA—not likes alone.

### 8. Optionally evaluate the creator run for formal promotion

Use `$creator-research-evaluator` when formal Wiki promotion or an explicit quality audit is requested.
Keep producer and evaluator reasoning independent. Require explicit acquisition, corpus, annotation,
selection, CR/DL/VE, synthesis, and projection gates. A partial section may remain visible with its blocker,
but cannot be promoted to validated creator knowledge. Findings remain attached to the current revision;
do not automatically repair or repeatedly rerun the candidate.

### 9. Build or update the Dashboard

Read [dashboard-contract.md](references/dashboard-contract.md). Produce `dashboard-data.json` matching [dashboard-data.schema.json](schemas/dashboard-data.schema.json), then run:

```bash
node <SKILL_DIR>/scripts/build-dashboard-data.mjs \
  --corpus /absolute/path/run/creator-corpus.json \
  --stats /absolute/path/run/corpus-analysis.json \
  --analysis /absolute/path/run/creator-analysis.json \
  --selection /absolute/path/run/selection.json \
  --out /absolute/path/run/dashboard-data.json

node <SKILL_DIR>/scripts/render-dashboard.mjs \
  --data /absolute/path/run/dashboard-data.json \
  --out /absolute/path/run/dashboard
```

Use the bundled template. When updating an existing Dashboard, preserve its URL, navigation, visual system, and working interactions; add new evidence into the existing page rather than creating a weaker parallel Dashboard.

Treat `dashboard/` as generated output. Change source data, schemas, scripts, or the template; do not hand-patch a delivered Dashboard as the only source of truth.

Required surfaces:

1. analysis purpose and account positioning;
2. full-corpus baseline and public-metric boundaries;
3. topic and format portfolios with count, median, mean, and maximum likes;
4. high/median/average/low comparison and success/failure mechanisms;
5. all-post List and Gallery views;
6. selected-video evidence with transcript, frames, content architecture, and unknowns;
7. publishing rhythm and video language;
8. evidence boundaries, research method, and exact missing stages.

### 10. Validate

```bash
python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/analysis-contract.schema.json \
  --data /absolute/path/run/analysis-contract.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/run-manifest.schema.json \
  --data /absolute/path/run/run-manifest.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/collection-inventory.schema.json \
  --data /absolute/path/run/collection-inventory.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/collection-status.schema.json \
  --data /absolute/path/run/collection-status.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/creator-corpus.schema.json \
  --data /absolute/path/run/creator-corpus.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/selection.schema.json \
  --data /absolute/path/run/selection.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/creator-analysis.schema.json \
  --data /absolute/path/run/creator-analysis.json

python3 <SKILL_DIR>/scripts/validate-json.py \
  --schema <SKILL_DIR>/schemas/dashboard-data.schema.json \
  --data /absolute/path/run/dashboard-data.json

node <SKILL_DIR>/scripts/validate-run.mjs --run /absolute/path/run
```

Browser-smoke the final Dashboard on desktop and mobile. Check console errors, navigation, List/Gallery switching, selected-video switching, image loading, transcript links, overflow, and evidence-boundary visibility.

## Completion gate

Do not announce `DOSSIER_READY` unless:

- corpus coverage and collection failures are explicit;
- full-corpus statistics are reproducible from `creator-corpus.json`;
- `portfolio-annotations.json` has exact ID parity with `creator-corpus.json` and preserves surface-only boundaries;
- all selected videos have selection reasons;
- every mechanism claim points to comparison or reconstruction evidence;
- no Builder-only or failed reconstruction is presented as independently validated;
- unknown backend metrics remain unknown;
- Dashboard List and Gallery both work;
- validation and browser smoke pass.

If any condition fails, report `NOT_READY` with the failed closure. Otherwise report `DOSSIER_READY` and
provide the canonical run path and Dashboard URL. Report `WIKI_READY` only when the current creator
synthesis revision also passes independent evaluation and the formal promotion gate.

## Output contract

```text
analysis-contract.json
run-manifest.json
raw/                         # immutable collection snapshots
collection-inventory.json
crawl-ledger.jsonl
creator-corpus.json
collection-status.json
corpus-analysis.json
selection.json
videos/<post-id>/            # deep reconstructions and evidence
media-verification/<post-id>.json
creator-analysis.json
dashboard-data.json
dashboard/index.html
dashboard/styles.css
dashboard/app.js
validation-report.json
```

Do not publish raw media, private comments, authentication data, or signed URLs to a public repository.
