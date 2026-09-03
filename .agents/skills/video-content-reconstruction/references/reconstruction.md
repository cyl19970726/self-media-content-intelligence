# Reconstruction contract

## Order of work

1. Copy the verbatim transcript contract from the evidence pack.
2. Build core knowledge units from the capture protocol, not from a generic article outline.
3. Link units with the relationships discovered by the probe.
4. Add scoped coverage counts and unresolved items.
5. Run the meta-gate.
6. Generate prose only after the structured reconstruction validates.

Preserve every transcript cue exactly as supplied, including its representative frame and all overlapping shots. Host generates the complete `coverageMatrix.cueAccountability` ledger from cue/unit time overlap. Builder supplies only semantic overrides: `nonsemantic`, `uncertain`, boundary-spanning cues, or a deliberate mapping different from that mechanical candidate. Every final knowledge/context row must link unit IDs, while every other disposition must explain why it remains outside a knowledge unit. Reinspect the opening and final cue groups after drafting because hooks and closing reframes are common omission points.

## Knowledge units

Keep units atomic enough that one statement can have one provenance class and a bounded evidence range. Split a sentence that mixes observation, claim, and inference.

Mark importance as `core`, `supporting`, or `context`. Core units must be necessary for the intended viewer cognitive change.

Use optional `procedural` and `argument` blocks only when the probe-derived protocol requires them. An unfamiliar video may use neither and may define its own relations.

When `procedural` is present, use the canonical fields exactly: `input`, ordered `actions`, visible `parameters` (empty array when none), `output`, `beforeFrames`, `duringFrames`, `afterFrames`, and `unknowns`. Arrays preserve multiple necessary states; do not invent a frame to satisfy the shape.

When `argument` is present, use the canonical fields exactly: `claim`, `evidenceUnitIds`, `conditions`, `counterexamples`, `actions`, and `limits`. An empty list means the video supplies none; it does not mean none exist in reality.

Register every locally derived artifact used as `refType: "source"` in top-level `derivedSources` with an ID, path, kind, producing method, time range, and limitations. The evidence `ref` must equal that registered ID exactly; a path such as `media-preparation.json#audio` is not a valid source ref. Raw video/subtitle paths come from the evidence pack; unregistered labels are not evidence.

## Scope, identity, counts, and global structure

- Preserve all legible text on meaning-bearing cards and overlays, including descriptive sublines and promotional qualifiers. Keep text existence separate from external truth.
- State observable likeness, styling, logos, and symbols as visual observations; keep literal identity, authorization, and provenance unknown unless established.
- When a claim uses universal or causal language, state whether the shown examples support, merely illustrate, or fail to establish that scope.
- Count repeated sets conservatively. Distinguish an accessory change from a complete output, one grid from several grids, and visible thumbnails from claimed deliverables.
- Reconstruct global relationships across segments: repeated presenter or setting, parallel list versus pipeline, file handoffs or their absence, recurring layout, escalating proof, and final emotional or strategic reframing.
- Keep narration labels and visible identity as separate atomic units when they differ. Record the visible application, filename, extension, version, account/workspace, and status/progress only when readable; otherwise use `unknown`. Do not normalize a visible WPS document into Microsoft Word because the narrator says “Word.”
- Preserve literal before/failure/after signatures and visible qualifiers/disclaimers. “Formatting is broken” is not a substitute for visible Markdown residue; a generic safety paraphrase is not a substitute for the video's exact on-screen boundary text.
- Model recurring people, avatars, inserted footage, and settings with explicit referent relations when their role affects understanding. If an animated character appears to stand in for the presenter or intended user, state the evidence and keep the mapping unknown when the edit does not establish it.
- Separate edited screen chronology from operation/dependency order. If the video cuts to a blank document before returning to a preview, preserve that chronology; if a copy or paste command is not shown, do not invent it to make the procedure smoother.
- Treat absence as scoped evidence: say “not observed in the inspected full timeline/closing interval,” cite that inspected scope, and list what was sought. Do not turn a sampling miss into “the video contains no X.”
- Preserve consequential carrier conflicts as atomic units: raw SRT wording, burned-caption/UI/whiteboard wording, the supported interpretation, and what remains unresolved. Do not silently replace the source transcript with a corrected phrase in the article.
- Do not equate technical shot/scene-detection segments with semantic scenes, camera setups, or edits. State the observed continuity/discontinuity relation and retain hidden-edit uncertainty when appropriate.
- Reconstruct the final cue group's semantic function. If it repeats or strengthens the hook, add the closing unit and opening↔closing relation; cue accountability alone is insufficient.
- Relations must connect distinct semantic nodes unless the relation is explicitly reflexive and the reason is stated. A self-edge such as `KU-06 → KU-06 decomposes_into` is invalid; split the composite idea into nodes or link it to the actual component/result/condition unit.

## Coverage matrix

Report scoped counts, never a single global percentage:

- available vs inspected information carriers;
- detected vs captured meaning changes;
- proposed vs evidenced relationships;
- critical questions answered, unknown, or missed;
- every transcript cue's disposition and linked units;
- core units with valid evidence;
- unchecked channels and unresolved risks.

An explicit unknown can count as covered only when it correctly states that the video does not establish the answer and cites the inspected evidence scope.

Before setting the meta-gate to pass, run four adversarial checks:

1. **Identity inversion:** Did speech use a generic name while the UI exposed a different or more specific application, document, or entity?
2. **Boundary loss:** Did opening/closing cards, inserted-source labels, progress/status text, qualifiers, disclaimers, filenames/extensions, or literal failure marks disappear?
3. **Referent loss:** Did a recurring avatar, person, inserted clip, or environment carry a presenter, audience, example, credibility, mood, or continuity relation absent from the relation graph?
4. **Absence overclaim:** Does any “not shown/not present” statement lack a bounded full-scope inspection, or did the reconstruction fail to record a decision-relevant absent CTA/access/price/platform/account/region/support condition discovered by the probe?
5. **Carrier conflict loss:** Did the final units/article silently normalize any consequential disagreement among transcript, burned caption, speech, UI, or whiteboard?
6. **Segmentation illusion:** Did source-generated shot boundaries become claims about scene count, edit count, or setting changes without visual evidence?
7. **Closing loss:** Does the final cue group repeat, strengthen, reverse, or pay off the opening in a way absent from the final relation graph?

Use the canonical row forms required by the schema: relationship rows carry the probe `id`, `evidenced`, and `evidenceRefs`; critical-question rows carry `id`, `status` (`answered` or `unknown`), `unitIds`, and `evidenceRefs`. Do not replace IDs with aggregate prose or counts—the validator must be able to close every probe item exactly.

## Human-readable article

Build the article from validated units. Lead with the viewer's reconstructed knowledge, then show evidence, dependencies, and limits. Do not organize the article around arbitrary time segments when the video's information structure requires another order.

Make every key section traceable to timecodes and frames. Keep interpretation and downstream performance analysis in separate sections.
