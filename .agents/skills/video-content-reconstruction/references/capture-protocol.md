# Dynamic capture protocol

Generate one protocol from one probe. The protocol is a testable plan for what to capture, at what resolution, and why.

## Required derivation

For every field or capture action, reference at least one probe carrier, meaning-change event, critical question, relationship hypothesis, or omission risk. Remove fields that are not justified by this video.

## Knowledge-unit shape

Define an open, video-specific schema using reusable primitives rather than closed categories. Common primitives include entity, operation, step, parameter, input, output, state, claim, evidence, example, counterexample, condition, decision rule, constraint, result, emotion, setup, and reversal.

Examples are illustrative, not routing templates:

- a visual workflow may require `input → action → state change → output`;
- a strategy explanation may require `claim → rationale → condition → example → action`;
- a tool montage may require `visible identity → stated capability → demonstrated result → unproven limits`;
- a comedic piece may require `setup → expectation → violation → reaction → payoff`.

Invent a different shape when the probe demands it.

## Capture actions

Each action must specify:

- interval and reason;
- evidence carrier to inspect;
- density or exact times;
- expected observation;
- probe finding it covers.

If `times` is present and non-empty, the capture script treats those timestamps as authoritative for every mode. Omit `times` only when interval sampling is intended. The script rejects more than 120 frames for one action or 600 frames in one protocol by default; split, crop, merge overlaps, or refine intervals instead of sampling an entire video at UI/OCR density. Raise the caps explicitly only when the omission risk justifies the cost.

Use denser capture around short overlays, UI transitions, parameter changes, steps, comparisons, and before/after reveals. For operations, capture before, during, and after states. For motion-dependent proof, capture a frame sequence rather than a single pose.

An `ocr_review` or `ui_state_review` action is complete only after the OCR evidence pass and human frame check. Merely generating frames does not establish that commands, parameters, filenames, directory state, status labels, card sublines, counts, or UI transitions were read. Capture the smallest interval that preserves the full text/state change, then resample or crop unreadable details.

If the probe finds a generic spoken label, visible software/document identity, failure/result comparison, qualifier, disclaimer, progress state, recurring avatar, semantic setting, or decision-relevant absence, give it a dedicated action or a precisely bounded action group. The expected observation must name the discriminating evidence to seek—not merely “inspect UI.”

Negative-evidence actions must state the claim whose absence matters, the inspected time scope, the visual/audio carriers checked, and plausible places the element could have appeared. They may conclude “not observed in inspected scope”; they may not conclude universal nonexistence. Referent actions must capture both the recurring subject and the context that supports or fails to support `stands_in_for` or another relation.

For an edited procedure, capture two parallel ledgers when needed: `(a)` observed screen chronology and `(b)` reconstructed operation/dependency order. Do not silently reorder the article into a clean tutorial. Every bridge that is not visibly executed—send, run, select, copy, switch app, paste, save, export—must be supported by before/during/after evidence or explicitly unknown.

When transcript, burned caption, speech, UI text, or whiteboard text disagree, add a conflict-resolution action that captures each available form. Preserve the raw conflict, state which reading the visual/context supports, and keep unresolved identity or wording unknown. Never silently repair the transcript in prose.

When a source evidence pack contains many scene-detection segments but the setting appears continuous, compare representative boundaries with wide shots or dense frames. Record whether segments track semantic scene changes, subject motion/occlusion, or an unresolved cause; keep hidden cuts unknown. Always capture the final semantic statement strongly enough to test whether it echoes or changes the opening promise.

## Stopping rules

Stop only when:

- every critical question is answerable or explicitly unknown;
- every meaning-changing event has been inspected;
- every available carrier is inspected or explicitly excluded with a reason;
- every core relation has evidence at both ends;
- ambiguity has been resampled or preserved as unknown;
- visible identity, qualifiers/disclaimers, referents, and literal failure/result signatures are reconciled;
- consequential carrier conflicts and the opening-to-closing meaning relation are represented in final units, not only in notes;
- technical shot segmentation has not been upgraded to semantic scenes or edit counts without evidence;
- every decision-relevant absence claim has a bounded inspected scope;
- the meta-gate finds no unchecked channel or relation.

Never use a generic completeness percentage as a stopping rule.
