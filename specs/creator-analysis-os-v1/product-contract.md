# Creator Analysis OS V1 — Product Contract

The analytical decisions below are implemented by [three-lens-video-contract.md](three-lens-video-contract.md), [creator-depth-parity.md](creator-depth-parity.md), and [research-learning-model.md](research-learning-model.md).

## 1. Confirmed decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-01 | Research has three levels: single video, single creator, multiple creators. | Confirmed |
| D-02 | Research and creation are separate areas. | Confirmed |
| D-03 | Replace “why users follow” with “what values the creator provides.” | Confirmed |
| D-04 | Portfolio display uses High / Base / Low, while the deep-video contract separately requires High / median-near / arithmetic-mean-near / Low groups; median and mean may not be collapsed unless the selected posts actually overlap. | Confirmed |
| D-05 | Use one canonical 21-record comparison dataset with List and Gallery projections. | Confirmed |
| D-06 | Mark 3 deep videos per High / median-near / mean-near / Low group inside the canonical comparison records; overlapping posts are downloaded and reconstructed once, so the unique count is normally 12 but may be lower only with explicit overlap evidence. | Confirmed |
| D-07 | Multi-creator analysis uses aligned windows and creator-relative normalization, not raw-like ranking alone. | Confirmed |
| D-08 | Research surfaces contain no copying or next-post advice. | Confirmed |
| D-09 | Creation Workspace is a future independent module that may reference creators or posts. | Deferred |
| D-10 | Use the architecture defined by `architecture.md`, `data-model.md`, `pipeline-and-gates.md`, and `api-contract.md` as the confirmed implementation contract. | Confirmed |
| D-11 | Deep video analysis has three required lenses: content restoration, directing logic, and visual/editing logic. | Confirmed |
| D-12 | Creator positioning and value are derived from full-corpus context plus High/Base/Low variance and deep evidence, not profile copy alone. | Confirmed |
| D-13 | AI红发魔女's existing research depth is the minimum migration parity reference; unified information architecture may not silently discard populated evidence. | Confirmed |
| D-14 | Cross-analysis learning must be versioned into open taxonomies, mechanisms, failure modes, evaluation cases, and evidence queries. | Confirmed |
| D-15 | The three video lenses have separate canonical fields, coverage denominators, and hard gates; overall readiness is their logical AND, not an averaged score. | Confirmed |
| D-16 | The three historical creator studies are migration fixtures with explicit source→canonical→UI mappings and cannot lose populated evidence; legacy 9-record projections remain readable, but new or refreshed runs must use the four-group deep contract. | Confirmed |
| D-17 | Research learning uses versioned ResearchConcept, Observation, and Revision objects with quantitative promotion, contradiction disclosure, demotion, and invalidation cascade. | Confirmed |

## 2. Capability and user

### Target user

A content operator, researcher, editor, or product owner studying public creator content and needing a reliable understanding rather than a decorative report.

### Jobs to be done

- understand a video without losing its knowledge or evidence;
- understand a creator as a content system rather than a list of popular posts;
- understand a set of creators without confusing scale, identity, or isolated virality with track-wide rules;
- audit where every important conclusion came from;
- know what the current evidence cannot establish.

### Unacceptable failures

- summarizing away key procedural steps, claims, examples, or limitations;
- presenting montage adjacency as tool causality;
- treating public engagement as views, retention, conversion, or follower growth;
- calling a small selected sample “the creator's universal rule”;
- comparing raw likes across creators without normalization and scope disclosure;
- mixing creation recommendations into objective analysis;
- creating parallel dashboards with conflicting truth.

## 3. Journey map

### Journey A — single video

Open a video record → verify source/evidence health → read content restoration → inspect directing logic → inspect visual/editing logic → expand cue/frame/shot evidence → inspect conflicts, unknowns, unchecked carriers and independent lens gates → return to the parent creator with context preserved.

### Journey B — single creator

Open creator → see identity, user value, lifecycle, and data health → understand baseline → inspect topic/format portfolios → compare High/Base/Low → switch the canonical comparison records between List/Gallery → verify High/median/mean/Low deep coverage → drill into deep evidence → inspect rhythm, audience demand, growth engines, business path, and unknowns.

### Journey C — multiple creators

Open comparison project → verify scope and comparability → inspect normalized baselines and value/portfolio matrices → separate track patterns from creator-specific/conditional/anomalous findings → drill into creator/video evidence → return with filters and comparison context preserved.

### Journey D — interruption and recovery

If collection is stale, partial, throttled, challenged, or failed, show last-good evidence read-only, name the blocked stage, preserve the run, and state the required user or system action. Never show optimistic completion.

## 4. Surface inventory

| ID | Surface | Primary question | Why independent | Entry / return | Coverage |
| --- | --- | --- | --- | --- | --- |
| S-00 | Research Home | What is being analyzed and what state is it in? | Operational control plane | Main nav | existing-accepted, revise copy |
| S-01 | Single Video | What does this video fully communicate and how is that evidenced? | Different evidence and reading model | Creator record / direct link | pattern, extend existing |
| S-02 | Single Creator | What content system does this account operate? | Portfolio-level baseline and synthesis | Home / comparison | existing-accepted, restructure |
| S-03 | Multi-Creator | What is common, different, conditional, or anomalous across creators? | Requires aligned scope and normalized matrices | Home / creator | designed |
| S-04 | Evidence Drawer | What directly supports this conclusion? | Shared contextual drill-down without losing place | Any analysis surface | designed shared pattern |
| S-05 | Creation Workspace | What should we create using selected references? | Different job, permissions, and outputs | Future main nav | excluded from V1 research |

## 5. Data visibility and permissions

- V1 uses public profile, post, media, and engagement evidence plus locally derived analysis.
- Login state is used only by the acquisition boundary and never shown in the product or stored in project data.
- Private creator analytics, impressions, retention, conversion, follower attribution, and paid-distribution data are structurally absent until explicitly imported by an authorized owner.
- Public comments may be analyzed only within captured scope; removed/private comments remain unknown.
- Raw media, signed URLs, authentication artifacts, and private comments are excluded from public repository outputs.

## 6. UX behavior contract

- State is authoritative: writes wait for server acknowledgement; failures preserve input.
- Filters, view mode, selected tier, selected creator/video, and time window are URL-addressable.
- Loading uses structural skeletons, not invented metrics.
- Empty states explain why the surface is empty and what evidence is needed.
- Stale/error states retain last-good content read-only and show freshness visibly.
- A conclusion and its evidence boundary remain adjacent; methodology is not hidden in a distant appendix.
- Keyboard focus is visible; interactive rows support Enter/Space; drawers restore focus on close.
- Copy tone is factual and quiet: no “爆款密码”, “必抄”, “稳赢”, or unsupported certainty.
- Single-video pages keep the fixed three-lens order in [three-lens-video-contract.md](three-lens-video-contract.md); a partial lens remains visible with its failed gate IDs.
- Creator and comparison concept drawers show current revision, scope, conditions, support/contradiction denominators, and revision history from [research-learning-model.md](research-learning-model.md).

## 7. Research/creation boundary

### Allowed in research

- describe content and mechanisms;
- compare observed performance;
- identify under-covered values/topics/forms within the selected sample;
- distinguish stable, conditional, anomalous, and unknown findings.

### Not allowed in research

- “we should copy this”;
- “our account should position as…”;
- next-post ideas;
- title, cover, script, shot, CTA, or publishing rewrites;
- content-plan allocation or experiments.

These become explicit inputs and outputs of the future Creation Workspace, not hidden buttons inside analysis cards.
