# Creator Analysis OS V1 — Product Contract

## 1. Confirmed decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-01 | Research has three levels: single video, single creator, multiple creators. | Confirmed |
| D-02 | Research and creation are separate areas. | Confirmed |
| D-03 | Replace “why users follow” with “what values the creator provides.” | Confirmed |
| D-04 | Single-creator performance uses High / Base / Low; Base includes median-near and mean-near. | Confirmed |
| D-05 | Use one canonical 21-record comparison dataset with List and Gallery projections. | Confirmed |
| D-06 | Mark the 9 deep records inside the 21 rather than creating a duplicate showcase. | Confirmed |
| D-07 | Multi-creator analysis uses aligned windows and creator-relative normalization, not raw-like ranking alone. | Confirmed |
| D-08 | Research surfaces contain no copying or next-post advice. | Confirmed |
| D-09 | Creation Workspace is a future independent module that may reference creators or posts. | Deferred |
| D-10 | Ideal backend and worker architecture is specified after product/front-end confirmation. | Proposed for confirmation |

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

Open a video record → read thesis and restored article → understand architecture and form → inspect performance context → expand transcript/frames/relationships → inspect conflicts and unknowns → return to the parent creator with context preserved.

### Journey B — single creator

Open creator → see identity, user value, lifecycle, and data health → understand baseline → inspect topic/format portfolios → compare High/Base/Low → switch the same 21 records between List/Gallery → drill into deep evidence → inspect rhythm, audience demand, growth engines, business path, and unknowns.

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
