---
name: creator-portfolio-annotation
description: Annotate every observed creator post at portfolio depth using titles, covers, post copy, public metadata, and available evidence. Use to build open-ended topic, format, promise, audience-value, proof, and visual-language fields without pretending surface evidence is a full video reconstruction.
---

# Creator Portfolio Annotation

Turn a normalized corpus into comparable post-level observations. Preserve the difference between surface annotation and deep video evidence.

## Inputs

- normalized creator corpus and collection status;
- local covers, post copy, detail snapshots, and any validated reconstruction references;
- annotation revision and previous labels when updating.

## Annotate every observed post

- topic and user problem;
- content form and intent;
- hook and promised payoff;
- probable audience and use context;
- value offered;
- proof mode;
- presenter, composition, aspect ratio, screen/UI role, text density, and result visibility;
- content-architecture observations supported by visible evidence;
- confidence, evidence references, conflicts, and unknowns.

Use multi-label, open-ended concepts. Create a new label when the corpus demands it; do not force a post into a fixed taxonomy. Record `unclassified` when the evidence is insufficient.

## Evidence discipline

- Title, cover, copy, metrics, comments, transcript, frames, and reconstruction are distinct evidence scopes.
- A title can identify a candidate topic or promise but cannot establish the video's actual steps, argument, directing logic, visual sequence, or causal mechanism.
- A cover can support composition and promise observations but not unshown results.
- Reuse validated deep findings through references; do not copy them into unsupported surface rows.

## Output

Produce `portfolio-annotations.json` keyed by stable post ID, with annotation revision, source revision, evidence scope, confidence, conflicts, unknowns, and per-field evidence references. Every observed corpus ID must have exactly one row, including explicitly unclassified rows.

Return `ANNOTATION_READY` only when ID parity, evidence references, and unknown handling validate.
