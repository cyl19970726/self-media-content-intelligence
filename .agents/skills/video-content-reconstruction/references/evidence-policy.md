# Evidence and provenance policy

## Provenance classes

Use exactly one primary provenance class per statement:

- `raw_fact`: directly present in a supplied source, such as verbatim subtitle text or metadata.
- `visual_observation`: directly visible in a frame or motion sequence.
- `author_claim`: asserted by the video's author; it may be true or false.
- `system_inference`: derived by the reconstruction agent; state the reasoning and uncertainty.
- `unknown`: material information that available evidence does not establish.

Do not rewrite an author claim as a raw fact. Do not rewrite a visual resemblance as identity. Do not fill an unknown with general knowledge.

## Evidence references

Every core knowledge unit must cite at least one resolvable evidence reference. Use IDs from the evidence pack or targeted evidence manifest:

- cue IDs for speech/subtitle evidence;
- shot IDs for continuous visual intervals;
- frame IDs for visible states, OCR, UI, and parameters;
- OCR line IDs for machine-proposed text that was checked against its source frame;
- source IDs for optional post copy, comments, or external material.

Include a bounded time range for every core unit. A frame proves only what is visible at that instant. A midpoint frame does not prove an interval.

OCR is never self-validating. Keep the OCR text, confidence, frame, and time together; check high-impact commands, parameters, counts, card sublines, filenames, and UI status against the image. When the text cannot be read reliably, preserve partial text or unknown rather than silently completing it from context.

## Transcript contract

Preserve every verbatim cue with:

- cue ID;
- start and end;
- original text;
- representative frame;
- every overlapping shot ID.

Do not normalize or silently correct transcript text inside the verbatim layer. Put corrections in a separate annotation.

## Procedural evidence

When a unit depends on an operation or state transition, require:

- input or precondition;
- ordered action;
- parameters when visible or spoken;
- before frame;
- one or more during frames when the action matters;
- after/result frame;
- output and unresolved failure conditions.

If the video skips a required dependency, mark it unknown instead of inventing the step.

## Argument and strategy evidence

When a unit advances an argument or strategy, preserve:

- claim;
- author-provided evidence or rationale;
- conditions and audience assumptions;
- examples and counterexamples;
- limits or omitted alternatives;
- proposed action.

Separate “the author says this works” from “the video demonstrates this works.”
