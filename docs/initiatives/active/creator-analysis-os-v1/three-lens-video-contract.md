# Three-Lens Single-Video Contract

Status: **normative for schema, projection, gates, and UI acceptance**

This contract turns “内容还原 / 编导逻辑 / 画面与剪辑” into three independently testable views. A populated transcript cannot compensate for missing directing analysis; a contact sheet cannot compensate for missing content restoration.

## 1. Common envelope

Every lens is stored under a stable key and carries the same audit envelope:

```json
{
  "state": "ready|partial|blocked|missing",
  "coverage": {
    "required": 0,
    "covered": 0,
    "ratio": 0,
    "unchecked": [],
    "conflicts": []
  },
  "evidenceRefs": [],
  "unknowns": [],
  "evaluation": {
    "gateVersion": "three-lens-v1",
    "passedGateIds": [],
    "failedGateIds": []
  }
}
```

`ratio = covered / required`; `required` is derived from the capture protocol, never reduced after evidence collection merely to make a gate pass. Every evidence reference follows `data-model.md §6`. `state=partial` requires at least one substantive analytical result plus a named missing carrier or failed gate; empty arrays and placeholder prose are `missing`.

## 2. Lens A — content restoration

Canonical key: `content_restoration`.

### Required fields

| Field | Type | Contract |
| --- | --- | --- |
| `thesis` | statement | What the video asks the viewer to understand, believe, or do. |
| `viewerChange` | `{before, after}` | The knowledge/decision change, not an emotional adjective alone. |
| `article` | rich text | Standalone restoration preserving all consequential ideas. |
| `transcript.verbatim` | cue[] | Timecoded source wording; corrections remain traceable. |
| `transcript.normalized` | cue[] | Readable normalization linked to verbatim cues. |
| `knowledgeUnits` | unit[] | Claims, steps, examples, limits, counterexamples, results, and CTA with importance and evidence. |
| `relationships` | edge[] | Typed edges such as `depends_on`, `supports`, `qualifies`, `contradicts`, `demonstrates`, `leads_to`. |
| `omissions` | boundary[] | Unsaid prerequisites, unavailable proof, and unchecked carriers. |

### Minimum evidence and gate CR

- `CR-01`: thesis and both viewer-change fields contain non-placeholder analysis and each has at least one evidence reference.
- `CR-02`: at least 3 knowledge units; every `core` unit has a time range and at least one resolvable cue/frame/OCR/shot reference.
- `CR-03`: at least 5 ordered transcript cues covering the beginning and ending; if speech is absent, the capture protocol must explicitly substitute inspected visual/audio carriers.
- `CR-04`: the article is at least 160 Chinese characters (or 100 whitespace-delimited words) and every `core` knowledge unit is represented in it.
- `CR-05`: all applicable procedure or argument relationships are present; a relationship endpoint must resolve to a knowledge unit.
- `CR-06`: conflicts and unknowns are not silently reconciled.

`content_restoration.state=ready` only when CR-01–CR-06 pass and `coverage.ratio=1`. It may be `partial` when meaningful restoration exists but one or more disclosed carriers remain unchecked.

## 3. Lens B — directing logic

Canonical key: `directing_logic`.

### Required fields

| Field | Type | Contract |
| --- | --- | --- |
| `viewerBefore`, `viewerAfter` | statement | Cognitive starting and ending states. |
| `activatedQuestion` | statement[] | Question, desire, risk, or tension opened for the viewer. |
| `promise` | statement[] | Promised payoff and the time it becomes concrete. |
| `stages` | stage[] | Ordered intervals with label, viewer question, information revealed/withheld, function, proof, transition, and resulting cognitive state. |
| `proofDesign` | unit[] | How credibility is built and what remains an author claim. |
| `loadAndPayoff` | object | Information load, compression/repetition, payoff distance, and comprehension cost. |
| `endingResolution` | statement | Whether the opening promise is resolved, reframed, deferred, or abandoned. |

### Minimum evidence and gate DL

- `DL-01`: `viewerBefore` and `viewerAfter` are distinct, substantive, and evidence-linked.
- `DL-02`: at least 2 ordered stages; each stage has a non-zero time range, a directing function, a viewer-state change, and at least one evidence reference.
- `DL-03`: every stated promise maps to a payoff, explicit deferral, or unresolved boundary.
- `DL-04`: at least one proof-design assessment distinguishes visible proof, creator claim, and system inference.
- `DL-05`: load/payoff analysis names at least one concrete source of comprehension cost or explicitly records why none is observed.
- `DL-06`: stage ranges do not overlap incoherently and collectively cover every consequential meaning change identified by the capture protocol.

`directing_logic.state=ready` only when DL-01–DL-06 pass and `coverage.ratio=1`. A generic “hook → body → CTA” with no viewer-state transitions fails DL-02.

## 4. Lens C — visual and editing logic

Canonical key: `visual_editing_logic`.

### Required fields

| Field | Type | Contract |
| --- | --- | --- |
| `orientation`, `composition` | statement | Aspect/orientation and concrete spatial arrangement. |
| `carriers` | carrier[] | Presenter, UI, object, caption, graphic, example, result, non-speech audio; each with inspected range and meaning role. |
| `shots` | shot[] | Ordered shot intervals, representative frame, meaningful changes, and overlapping cues. |
| `editingRhythm` | object | shot count, analyzed duration, cut density, duration distribution, montage/continuity notes. |
| `sparseFrames`, `denseFrames` | frameRef[] | Navigation view and close inspection view; both map back to time. |
| `visualClaims` | observation[] | What an image proves, explains, demonstrates, decorates, distracts from, or contradicts. |
| `uiProcedureStates` | state[] | Before/during/after, input, parameter, output, success/failure signature when applicable. |
| `audioRoles` | audioEvent[] | Music, pause, emphasis, effect, or unchecked state. |

### Minimum evidence and gate VE

- `VE-01`: orientation and composition are concrete, non-placeholder observations.
- `VE-02`: at least 3 sparse frames and 5 dense frames with distinct valid timecodes; short videos may reuse a frame across views but not duplicate IDs within one view.
- `VE-03`: every consequential visual claim resolves to a frame/shot/OCR reference and states its evidentiary role.
- `VE-04`: every transcript cue used in a core conclusion maps to its overlapping shot(s), or the absence of a visual carrier is explicitly recorded.
- `VE-05`: shot metrics disclose analyzed duration and denominator; “fast editing” without shot or meaningful-change evidence fails.
- `VE-06`: applicable UI/procedure sequences contain before/during/after states; montage adjacency is never encoded as causality or continuity.
- `VE-07`: non-speech audio is either analyzed or named in `unchecked`; it cannot disappear from coverage.

`visual_editing_logic.state=ready` only when VE-01–VE-07 pass and `coverage.ratio=1`.

## 5. Independent coverage and publication gate

The projection exposes four gate results:

| Gate | Pass rule |
| --- | --- |
| `lens.content_restoration` | CR-01–CR-06 pass and content coverage is 100%. |
| `lens.directing_logic` | DL-01–DL-06 pass and directing coverage is 100%. |
| `lens.visual_editing_logic` | VE-01–VE-07 pass and visual/editing coverage is 100%. |
| `video.three_lens_ready` | All three lens gates pass independently and all evidence references resolve. |

Overall readiness is the logical AND, never an average. UI may render `partial` lenses, but must show the failed gate IDs beside that lens and must not label the video “深度分析完成.”

## 6. Page order and UI surfaces

The single-video page order is fixed for comprehension and audit:

1. source header, public metrics, snapshot and evidence health;
2. **内容还原** — thesis → viewer change → readable article → knowledge units/relationships;
3. **编导逻辑** — activated question/promise → stage sequence → proof/load/payoff → ending;
4. **画面与剪辑** — composition/carriers → sparse timeline → dense/shot inspection → editing/audio/UI states;
5. transcript and cue ↔ frame ↔ shot evidence explorer;
6. conflicts, unknowns, unchecked channels, and the four gate results.

The article comes before raw transcript. The three lens headings are always visible and cannot be merged into one generic “内容分析” card. Evidence drawers may be shared, but each opened reference must retain its originating lens and conclusion ID.

## 7. Mechanical acceptance fixture

At minimum, parity tests execute this contract against:

- `ai-red-witch/6801c0750000000007037156`;
- `zhang-zala/6a31edc300000000200387f4`;
- `human-director/6a2fcd940000000007021a9f`.

A fixture passes only when substantive text, minimum counts, reference resolution, independent lens gates, page projection keys, and explicit partial-state reasons all pass. Schema-valid placeholders fail.
