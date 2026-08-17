# Round-one probe

The probe designs observation. It does not summarize the video and does not assign a fixed content category.

## Core question

Determine the minimum evidence and relationships that must survive compression so a reader can undergo the video's intended cognitive change without watching it.

## Inspect in this order

1. Read the full verbatim transcript once without summarizing.
2. Partition the entire timeline into contiguous cognitive regions and run a carrier sweep across every region, including the opening, transitions, and final beat.
3. Inspect the initial dense/contact frames for overlays, UI, diagrams, objects, before/after states, and result shots.
4. Inspect cue frames and all shots overlapping each cue.
5. Mark intervals where speech and visuals carry different information.
6. Mark rapid changes, hidden text, short-lived names or parameters, and transitions that change meaning.
7. Resample ambiguous intervals before proposing the protocol.
8. Run a referent audit: for every recurring person, avatar, inserted source, application, document, setting, prop, and symbol, ask “what does this stand for here, and what remains unidentified?”
9. Run a boundary audit: inspect visible app/file/version/account/workspace identity, source labels, qualifiers, disclaimers, and the literal before/failure/after signatures. Do not let a generic spoken noun overwrite a more specific visible identity.
10. Run an absence audit over the full timeline for decision-relevant elements implied by the video's goal. Record an absence only after inspecting the scope in which it could have appeared; examples include access path, platform, price, account requirement, region, owner/support entity, download/CTA controls, caveats, or proof of an asserted operation.
11. Build a carrier-conflict ledger. Compare supplied transcript, burned captions, readable UI/text, and audible speech wherever they disagree; never silently normalize a consequential conflict. The reconstructed meaning and the conflicting raw forms must both remain traceable.
12. Compare technical segmentation with semantic continuity. Scene-detection shots may be caused by motion, occlusion, or lighting in one continuous setup; preserve the residual possibility of hidden edits unless the video proves continuity.

For each `carrierSweep` region, record the cognitive question, observed signals, alternative modalities actually checked, remaining unknowns, and evidence hints. Sweep regions must cover the complete source timeline without gaps. This is an adversarial search for signals, not a content-category router.

## Probe dimensions

### Viewer cognitive change

Describe the viewer state before and after the video. Allow multiple simultaneous changes: know, do, decide, believe, compare, notice, or feel. Do not reduce these to a category label.

### Information carriers

Record each available carrier independently. Every carrier must trace to one or more sweep regions through `discoveredIn` and use open `modalityKeys`, so a novel carrier can be represented without adding a category:

- speech;
- subtitles;
- on-screen text or OCR;
- software/interface state;
- cursor, gesture, or physical action;
- parameter or value change;
- before/after visual state;
- chart, diagram, list, example, or comment;
- editing order, juxtaposition, reaction, or reversal;
- non-speech audio, including music, sound effects, and inserted-source audio;
- recognizable likeness, styling, logos, objects, and other symbols without upgrading resemblance to literal identity;
- layout, grouping, count, scale, and spatial composition;
- external post copy or comments, only when supplied as separate evidence.
- environment and set as semantic context when lighting, props, room, device arrangement, or repeated workspace framing changes identity, credibility, mood, audience alignment, or continuity;
- negative or absence evidence, only when the relevant full timeline or bounded opportunity window was actually inspected.

For each carrier, record where it appears, what role it serves, whether it was inspected, and what could be lost if omitted.

If the media has an audio stream, inspect non-speech audio separately from transcript-bearing speech. If the available tools cannot determine its role, register the channel and preserve it as unknown; do not omit it.

For every short card or overlay, capture all legible lines and their role, not only a headline or product name. For repeated grids, result sets, outfits, examples, or comparison items, count conservatively and state the grouping rule. Test whether universal, causal, and product-scope claims are supported by the number and kind of examples actually shown.

For software, documents, and services, create a visible-identity ledger whenever the screen supplies it: application/brand, filename, extension, tab or page title, version, account/workspace state, status/progress, and any embedded disclaimer. Keep each value `observed`, `author-stated`, `inferred`, or `unknown`. A narrated generic label such as “Word”, “Photoshop”, or “the app” must not overwrite a different or more specific visible identity.

For failure/result stories, preserve literal discriminating marks—not just “before looked bad, after looked good.” Search for residue tokens, status wording, file extensions, changed hierarchy, changed controls, exact disclaimers, and other marks that let a reader distinguish states. Inspect the opening and closing states together so an edited comparison is not mistaken for one continuous live operation.

Treat the final cue group as a possible semantic reframe, not merely a farewell. Test whether it repeats, narrows, strengthens, reverses, or pays off the opening promise. A transcript cue being listed in a ledger does not count as captured when its meaning disappears from the final knowledge units and article.

### Meaning-changing events

Create an event whenever the viewer's interpretation would change if that moment were removed. Examples include a tool-name overlay, a parameter edit, a result reveal, a causal connector, a counterexample, a UI state transition, or a punchline.

### Relationship hypotheses

Infer candidate relationships only when traceable to evidence. Use open relation names such as:

- precedes / depends_on;
- input_to / action_on / produces;
- claim_supported_by / claim_limited_by;
- example_of / counterexample_to;
- maps_to / compared_with / chosen_when;
- causes / correlated_with / framed_as;
- setup_to / reversal_of / payoff_for.

The relation vocabulary is open. Do not force the video into a predefined ontology.

Include referent relations when they change meaning: `stands_in_for`, `addresses`, `belongs_to`, `shown_as_source_of`, `contrasts_with`, or another evidence-traceable relation. A recurring avatar may stand in for the presenter, target user, example subject, or nobody identifiable; the correct answer may be unknown. Also distinguish edited visual order, author-described operation order, and system-inferred dependency order whenever they diverge.

### Omission risks

List how a plausible-looking summary could still be wrong. Prioritize information that appears only visually, briefly, between sampled frames, or as an unstated dependency.

Include risks caused by over-general names, unread small print, qualifiers on inserted footage, UI progress/status, service conditions, and negative evidence. A likely-but-unseen action such as send, copy, paste, save, export, download, or login must remain unknown even when surrounding states make it plausible.

Include conflicts among transcript, burned caption, speech, UI text, and whiteboard text, plus the risk of mistaking automatic shot boundaries for different semantic scenes. Treat source-provided shot IDs as observation aids, not proof of edit count or setting changes.

### Critical questions

Write questions a reader must answer after reconstruction. Questions are video-specific and become evaluation targets. Include questions whose correct answer is “the video does not establish this.”

When a product, service, or procedure affects the viewer's decision, ask only the boundary questions the probe makes material—such as visible product/document identity, access route, platform, price, region, account requirement, responsibility/support entity, caveat, or proof of execution. These are not a mandatory product checklist; every included question must cite the observed promise, omission risk, or decision change that makes it necessary.

## Probe acceptance

Reject the probe when the carrier sweep does not cover the full timeline, any available carrier is missing, an audio stream lacks explicit non-speech-audio handling, a meaning change lacks an evidence hint, a visible referent/identity/qualifier remains silently collapsed, a claimed absence lacks a documented inspection scope, the proposed protocol merely restates a generic checklist, or the probe claims final conclusions.
