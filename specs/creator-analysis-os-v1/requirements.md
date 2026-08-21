# Creator Analysis OS V1 — Product Requirements

Status: **confirmed by Owner**

## 1. Product purpose

Creator Analysis OS turns public creator and video evidence into a structured, auditable understanding at three levels:

1. one video;
2. one creator;
3. multiple creators.

The product answers what the content is, how it is constructed, how it performs, what mechanisms may explain the observed performance, what evidence supports each conclusion, and what remains unknown.

The authoritative analytical philosophy is defined in [research-methodology.md](research-methodology.md). Its executable contracts are [three-lens-video-contract.md](three-lens-video-contract.md), [creator-depth-parity.md](creator-depth-parity.md), [research-learning-model.md](research-learning-model.md), and [learning-loop-contract.md](learning-loop-contract.md). Page structure and schema compliance do not substitute for those contracts.

It does **not** decide what we should copy or publish. That belongs to a separate future Creation Workspace.

## 2. Shared principles

- Research and creation are separate product areas.
- Every conclusion must be traceable to public data or media evidence.
- Raw fact, visual observation, creator claim, system inference, and unknown remain distinct.
- Public likes, collections, comments, and shares do not prove impressions, retention, conversion, or follower growth.
- Missing values remain `unknown`; they are never silently converted to zero.
- Mean, median, maximum, distribution, and within-creator percentile have different meanings and must not be collapsed.
- List and Gallery are two projections of the same canonical records.
- Taxonomies are open-ended and derived from actual content rather than imposed in advance.
- Every deep video is analyzed through three non-substitutable lenses: content restoration, directing logic, and visual/editing logic.
- Every creator conclusion must be derived from full-corpus context plus High/Base/Low variance, not from profile copy or winners alone.
- Each completed creator must feed newly observed mechanisms and failure modes back into versioned, reusable research infrastructure.
- Learning-loop completion and promotion are separate: a bounded, valid evaluation may finish `completed_no_promotion`; candidate discovery remains distinct from verified creator/post identity.

## 3. Single-video analysis

### 3.1 User outcome

A user who does not play the original video can still understand all key information; a skeptical user can return to the exact transcript cue, timecode, frame, and overlapping shots.

### 3.2 Required analysis

1. **Source and snapshot** — creator, title, URL, publish label/time when available, duration, cover, public metrics, capture time, evidence health.
2. **Content restoration** — one-sentence thesis, full readable article, complete verbatim transcript, normalized transcript, knowledge units, examples, limitations, and CTA.
3. **Dynamic content protocol** — first probe viewer cognition, information carriers, meaning changes, relationships, and omission risks; then generate a video-specific capture protocol.
4. **Content architecture** — hook, promise, problem, development, proof, result, transition, and ending as actually present, without forcing every video into one template.
5. **Form and audiovisual language** — orientation, composition, presenter/UI/assets, on-screen text, shot density, meaningful visual changes, and non-speech audio role.
6. **Content-type-specific relationships** — procedure dependencies for tutorials; claim/evidence/condition/counterexample/action relationships for argument or strategy videos; corresponding open structures for other forms.
7. **Performance context** — public engagement and, when available, position relative to creator and topic baselines. Without a baseline, mechanism explanations remain hypotheses.
8. **Evidence boundary** — coverage matrix, checked and unchecked carriers, conflicts, unsupported claims, and explicit unknowns.

### 3.2 Three-lens completeness

- **Content restoration** must preserve the complete meaning, not merely a short summary.
- **Directing logic** must explain the designed sequence of viewer questions, promises, proof, cognitive changes, comprehension load, and payoff.
- **Visual/editing logic** must explain how composition, presenter, UI, text, shots, cuts, examples, and sound carry or weaken meaning.

A video with only one or two lenses is partial even if its transcript and metrics exist.

### 3.3 Explicit exclusions

- what we should copy;
- how to rewrite the title or script;
- what our next post should be;
- a production brief or publishing experiment.

## 4. Single-creator analysis

### 4.1 User outcome

The user can understand who the creator is, what value the account provides, what constitutes its baseline, what breaks out, what fails, how its content system changes over time, and which conclusions are supported or uncertain.

### 4.2 Identity and value

- account positioning and one-sentence value proposition;
- people served;
- problems addressed;
- values provided: practical, cognitive, emotional, social, decision, and trust value;
- trust sources: professional identity, cases, personality, demonstrated results, or information advantage;
- lifecycle: starting, growing, stable, commercializing, transitioning, declining, or unknown;
- observable or plausible product, service, and business paths, clearly marked by evidence level.

### 4.3 Full-corpus baseline

- visible post count and coverage status;
- median, arithmetic mean, maximum, percentiles, and distribution;
- high/base/low shares and head-contribution concentration;
- publishing frequency and performance stability;
- available collection, comment, and share signals;
- snapshot time, pagination state, failures, and unavailable backend metrics.

### 4.4 Topic and format portfolios

For every open-ended topic or format cluster, display:

- post count and share;
- median likes;
- mean likes;
- maximum likes;
- high-performance count/share;
- other available public ratios;
- user value served;
- annotation basis and uncertainty.

### 4.5 Three performance tiers

The canonical tiers are:

- **High** — clearly above the creator's own baseline.
- **Base** — typical content, explicitly containing median-near and mean-near examples.
- **Low** — clearly below the creator's own baseline.

Default research depth:

- full visible corpus for baseline statistics;
- 21 comparison records: approximately 7 High, 7 Base, and 7 Low when the corpus supports it;
- 9 deep reconstructions: 3 High, 3 Base, and 3 Low, marked inside the same 21 records rather than shown as a duplicate list;
- Base deep examples should cover median-near, mean-near, and the most typical stable form; overlap is allowed and must be disclosed.

If the corpus is too small, the system shrinks the sample and displays the denominator instead of filling invented slots.

Every comparison record includes tier, topic, format, publication time, duration, public metrics, core content, content architecture, mechanism hypothesis, selection reason, evidence status, and deep-reconstruction status.

### 4.6 Additional required analysis

- high/base/low differences in promise, hook, proof, comprehension cost, information density, audiovisual construction, user value, novelty, audience fit, CTA, and confounds;
- publishing rhythm and content evolution;
- comment and audience-demand evidence;
- growth engines described as observed content-system behavior, not copying advice;
- business path and lifecycle;
- boundaries and unknowns.

### 4.7 Knowledge-building requirement

The system shall preserve newly discovered content mechanisms, directing devices, visual grammars, proof modes, and failure modes as open, evidence-linked research concepts. A new creator may confirm, qualify, contradict, or invalidate earlier conclusions; prior conclusions must not remain silently unchanged.

### 4.8 Explicit exclusions

- what we can directly copy, adapt, or cannot copy;
- our positioning difference;
- our first 10/30 posts;
- next topic, title, cover, script, shot list, CTA, or experiment.

## 5. Multi-creator analysis

### 5.1 User outcome

The user can understand the structure of a creator set or track, explain differences among creators, and distinguish track-wide patterns, creator-specific capabilities, conditional patterns, and isolated anomalies.

### 5.2 Comparability contract

The project must state:

- included creators and inclusion rationale;
- platform and capture time;
- full-history and aligned-time-window views;
- corpus coverage and unavailable metrics per creator;
- differences in account age, size, lifecycle, content mix, pinned posts, and commercial content;
- which creators are directly comparable and which are contextual special cases.

Raw likes alone are insufficient. Comparison also uses creator-relative median multiples, within-creator percentiles, tier shares, head concentration, and stability.

### 5.3 Required comparative analysis

- creator identity, positioning, user value, trust source, and lifecycle;
- normalized baseline table;
- creator × user-value matrix;
- creator × topic, creator × format, and topic × format matrices;
- high/base/low mechanism comparison based on each creator's own baseline;
- title, cover, hook, proof, information density, audiovisual, personality, CTA, and comment-response differences;
- audience and comment-demand differences;
- publishing rhythm and content evolution;
- business-path and lifecycle comparison;
- conclusion ledger separated into track-wide, creator-specific, conditional, anomaly, and unknown;
- drill-down from every aggregate claim to creators, representative videos, and original evidence.

### 5.4 Explicit exclusions

- which creator we should imitate;
- which post we should reproduce;
- our positioning opportunity or recommended account direction;
- our next topic, title, script, or publishing plan.

The analysis may describe under-covered values, topics, or formats in the selected sample, but it must not convert those observations into recommendations inside the research area.

## 6. Cross-level navigation

- Multi-creator conclusions drill into a single creator without losing comparison context.
- Single-creator records drill into a single video without opening a disconnected report system.
- Returning restores filters, tier, view mode, and scroll context.
- Evidence depth is visible everywhere: metadata-only, annotated, reconstructed, evaluated, or blocked.

## 7. EARS acceptance criteria

- WHEN a user opens a single-video analysis, THE SYSTEM SHALL present the restored content before detailed evidence and SHALL provide a route from each core unit to timecoded evidence.
- WHEN baseline evidence is unavailable, THE SYSTEM SHALL label performance mechanisms as hypotheses and SHALL NOT state a causal explanation for virality.
- WHEN a user opens a creator analysis, THE SYSTEM SHALL display full-corpus coverage and baseline health before high/base/low conclusions.
- WHEN mean and median differ, THE SYSTEM SHALL display both and SHALL preserve separate mean-near and median-near semantics inside the Base tier.
- WHEN the 21-record comparison set is shown, THE SYSTEM SHALL provide List and Gallery views over the same IDs, filters, labels, and evidence states.
- WHEN a record belongs to the deep set, THE SYSTEM SHALL mark it inside the comparison set and SHALL NOT create a second competing selection list.
- WHEN creators are compared, THE SYSTEM SHALL disclose time window and comparability constraints and SHALL provide normalized as well as raw metrics.
- WHEN an aggregate multi-creator conclusion is shown, THE SYSTEM SHALL provide drill-down evidence and SHALL identify it as track-wide, creator-specific, conditional, anomalous, or unknown.
- WHILE the user is in any research surface, THE SYSTEM SHALL NOT present copying advice, our next-post recommendations, rewritten scripts, or publishing experiments.
- WHEN data is stale, partial, blocked, or missing, THE SYSTEM SHALL preserve the last valid read-only view and visibly state the limitation.
- WHEN a deep video is presented, THE SYSTEM SHALL expose content restoration, directing logic, and visual/editing logic as distinct sections and SHALL mark any missing lens as incomplete.
- WHEN a creator conclusion is presented, THE SYSTEM SHALL identify whether it comes from full-corpus data, tier comparison, deep reconstruction, or inference and SHALL NOT use profile copy alone as analysis.
- WHEN a unified projection replaces a historical report, THE SYSTEM SHALL run depth-parity checks and SHALL NOT treat schema-valid placeholders as equivalent to populated source evidence.

### 7.1 Quantitative research gates

- **VID-LENS-01** — WHEN a deep video is evaluated, THE SYSTEM SHALL compute separate coverage numerators, denominators, unchecked carriers, conflicts, and gate results for `content_restoration`, `directing_logic`, and `visual_editing_logic`; THE SYSTEM SHALL mark the video ready only when all three ratios equal `1.0` and every lens gate passes.
- **VID-CONTENT-02** — WHEN content restoration is projected, THE SYSTEM SHALL expose at least 3 knowledge units, at least 5 ordered transcript cues (or an explicit no-speech substitution protocol), a substantive article of at least 160 Chinese characters or 100 words, and resolvable evidence for every core unit.
- **VID-DIRECTING-03** — WHEN directing logic is projected, THE SYSTEM SHALL expose distinct viewer-before/viewer-after states and at least 2 ordered, non-zero-duration stages, each with a function, cognitive change, and evidence reference.
- **VID-VISUAL-04** — WHEN visual/editing logic is projected, THE SYSTEM SHALL expose at least 3 sparse and 5 dense timecoded frames, shot/analyzed-duration denominators, and evidence roles for every consequential visual claim; THE SYSTEM SHALL keep unchecked non-speech audio visible.
- **VID-ORDER-05** — WHEN the single-video page renders, THE SYSTEM SHALL order source health → content restoration → directing logic → visual/editing logic → evidence explorer → conflicts/unknowns/gates and SHALL NOT merge the three lenses into one generic section.
- **PARITY-AIWITCH-01** — WHEN AI红发魔女 is migrated, THE SYSTEM SHALL retain a 331-post corpus with 318 known-like records, exactly 21 unique comparison records split 7/7/7 across High/Base/Low, and exactly 9 canonical deep markers split 3/3/3.
- **PARITY-ZHANG-02** — WHEN 张咋啦 is migrated, THE SYSTEM SHALL retain 62 corpus posts, exactly 21 unique canonical comparison records with both `median_near` and `mean_near`, register all 12 populated source deep packages, and mark exactly 9 canonical deep records without deleting or orphaning the other 3.
- **PARITY-DIRECTOR-03** — WHEN 人类最强编导 is migrated, THE SYSTEM SHALL retain 19 unique browseable posts and exactly 8 deep markers, and SHALL project every populated archetype into a numeric format cluster rather than a prose-only list.
- **PARITY-MAP-04** — WHEN any of the three parity projections publishes, THE SYSTEM SHALL produce a manifest mapping every populated source pointer to a canonical pointer or an explained exception and SHALL block publication on any count mismatch, unresolved evidence reference, placeholder substitution, or unexplained omission.
- **LEARN-OBS-01** — WHEN an analysis produces a reusable mechanism, device, grammar, proof mode, value mode, or failure mode, THE SYSTEM SHALL store a versioned ResearchConcept plus eligible `confirm|qualify|contradict` observations pinned to passed analysis revisions and SHALL NOT use hidden prompt memory as research evidence.
- **LEARN-PROMOTE-02** — WHEN a concept is promoted from video-specific to creator-specific, THE SYSTEM SHALL require at least 3 distinct videos, at least 1 deep reconstruction, and either 2 performance tiers or an explicit tier condition; WHEN promoted to track-wide, THE SYSTEM SHALL require at least 3 comparable creators, 3 videos and 1 deep reconstruction per creator, at least 9 videos total, and at most 20% contradictions inside the claimed condition.
- **LEARN-INVALIDATE-03** — WHEN a source, mapping, lens gate, analysis revision, or comparability decision becomes invalid, THE SYSTEM SHALL create an immutable demotion/invalidation revision and SHALL mark dependent creator/comparison conclusions stale before another current revision can publish.
- **LOOP-LINEAGE-04** — WHEN a learning-loop agent consumes or produces an artifact, THE SYSTEM SHALL persist its SHA-256 and `allowedInputArtifactIds`, SHALL reject non-allowlisted or hash-mismatched inputs, and SHALL NOT use prompt memory as evidence.
- **LOOP-EVAL-05** — WHEN a learning loop reaches blind evaluation, THE SYSTEM SHALL keep candidate producer, product blind user, concept holdout blind agent, and independent judge roles separated; the product blind user MAY see the published Dashboard including creator identity and public performance, while the concept holdout blind agent SHALL see only a sanitized evaluation bundle and SHALL test only understanding, evidence traceability, and unknowns. Neither blind role SHALL output creative or publishing advice.
- **LOOP-META-06** — WHEN a learning loop terminates, THE SYSTEM SHALL record old-three fixture, new-sample, and untouched-holdout regression results plus stop/failure reasons; THE SYSTEM SHALL promote only through the meta-gate and SHALL use `completed_no_promotion` for valid closure without justified scope promotion.
