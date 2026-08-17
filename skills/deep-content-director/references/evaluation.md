# Evaluation contract

Run machine structure validation, then an independent semantic GATE, then JUDGE. Any failed semantic hard gate means `ready=false`; quality scores cannot rescue it. The authoring agent may fix discrepancies but must not grade its own repair.

The semantic reviewer receives the original user task, available source evidence, production constraints and candidate artifact. It must not trust self-declared `clear`, `verified`, `original` or `feasible` fields without checking their referenced basis. A structurally valid JSON is only `structuralReady`; it remains `semanticReviewRequired`.

## Hard gates

### G0 Coverage

All required closure fields are present or explicitly unknown: account role, audience, demand, job, contracts, narrative, proof, carriers, shots/edit, packaging, experiment, review and rights.

### G1 Evidence fidelity

Consequential claims have a source/class and proof scope. Source conflicts and unknowns are preserved. Public metrics are not upgraded to causality.

### G2 Promise closure

Title, cover and opening agree; the body repays them; ending closes rather than merely asserting success. Follow/CTA is connected to actual future value.

### G3 Executability

The team can identify what to say, show, capture, source, edit, cut, publish and measure. Tasks have owners or explicit assumptions, resources, deadlines/fallbacks where relevant.

### G4 Production feasibility

People, locations, footage, tools, rights, budget and time are realistic. Complex or high-risk work has adequate written specification.

### G5 Original transfer

Reference learning is reconstructed for this audience/account. It does not copy signature identity, unverifiable proof, proprietary wording or a causal claim.

### G6 Measurement

Exactly one primary test variable is declared; main and guardrail metrics match the job; window, minimum evidence, confounds and stop/change rule exist.

### G7 Safety and rights

Privacy, copyright, likeness, music/footage, health/commercial claims and platform rules are addressed. Missing authorization blocks use of the asset or triggers a safe fallback.

## Judge lenses

Only after all gates pass, score 1–5 with evidence:

- content lead: audience value, account fit, distinct promise;
- director: cognitive/narrative progression, proof and transfer;
- visual/editor: carrier function, load, rhythm and cut decisions;
- Xiaohongshu operator: packaging, search/feed fit, series/comment action;
- target viewer: willingness to enter, understand, trust, save/follow/act;
- experiment reviewer: ability to learn from the next publication.

Scores below 4 require a concrete revision. Average score does not matter if the plan fails its primary audience or proof responsibility.

## Review diagnosis

Diagnose in order; do not jump straight to changing the topic:

1. data availability and distribution confounds;
2. title/cover/first-frame entry;
3. early retention and orientation;
4. promise delivery and comprehension;
5. proof/trust;
6. follow/profile/series handoff;
7. intended action/business result;
8. negative feedback, safety and rights.

Then answer separately:

- Was execution compliant with the plan?
- Is the underlying direction supported?

Output `keep / compress / remove / add`, a single primary next change, and what remains unknowable.
