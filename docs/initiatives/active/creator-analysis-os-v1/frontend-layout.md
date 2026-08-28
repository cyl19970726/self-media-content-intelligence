# Creator Analysis OS V1 — Frontend Layout Contract

Status: **textual layout confirmed; existing industrial-editorial visual baseline retained**

## 1. Global information architecture

```text
Research Home
├── Single-video analyses
├── Single-creator analyses
│   └── Video evidence
└── Multi-creator comparison projects

Creation Workspace                         [future, separate]
```

Research uses one shared shell and one evidence language. A drill-down changes analytical depth, not visual identity or truth source.

### Existing visual baseline

The current industrial-editorial research language is the baseline already accepted in principle: paper background, dark ink, restrained orange/green signals, condensed editorial headings, monospaced evidence metadata, real covers/frames, hairline separation, and high information density. This contract changes information structure; it does not authorize a decorative redesign. New multi-creator surfaces still require Owner acceptance on rendered screenshots.

## 2. Desktop shell

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Product / Research / Current project                       freshness · health │
├───────────────┬─────────────────────────────────────────────┬───────────────┤
│ Context rail  │ Main analytical reading flow                │ Evidence      │
│ 220–260 px    │ fluid, recommended 760–1120 px               │ drawer 320 px │
│               │                                             │               │
│ hierarchy     │ one primary question per section            │ source/time   │
│ filters       │ tables, matrices, lists, gallery             │ fact classes  │
│ section nav   │                                             │ unknowns      │
│ data health   │ page owns vertical scroll                   │ contextual    │
└───────────────┴─────────────────────────────────────────────┴───────────────┘
```

- The context rail is sticky and changes by analysis level.
- The main canvas owns page scrolling.
- The evidence drawer is contextual and closed by default on medium widths.
- Evidence links update the drawer without destroying main-page position.
- No equally weighted “card wall”; information follows a reading sequence.

## 3. First-viewport contract

### Single video

The first viewport must show source identity, one-sentence thesis, public metric snapshot, evidence health, and the beginning of the restored article.

### Single creator

The first viewport must show creator identity, values provided, lifecycle, corpus coverage, median, mean, maximum, and a concise High/Base/Low synopsis.

### Multiple creators

The first viewport must show comparison scope, aligned time window, data-health differences, comparability warning, and normalized overview—not a raw follower or likes leaderboard.

## 4. Single-video page

### Reading order

1. source and evidence health;
2. thesis and full content restoration;
3. content architecture;
4. information carriers and audiovisual form;
5. procedural/argument/other relationships;
6. performance context and mechanism hypotheses;
7. full transcript and frame evidence;
8. coverage, conflicts, and unknowns.

### Text wireframe

```text
┌ Video identity · publish time · duration · metrics · freshness ┐
│ Thesis                                                         │
│ Evidence health: transcript / frames / OCR / audio / baseline   │
└─────────────────────────────────────────────────────────────────┘

[Content restoration]
Readable full article with inline knowledge-unit anchors

[Architecture]
Time-based narrative/procedure/argument map

[Form]
orientation · composition · presenter/UI/assets · text · shots · audio

[Relationships]
dynamic renderer chosen by capture protocol

[Performance context]
public metrics · creator percentile · topic context · confounds

[Evidence]
Sparse | Dense frames
Transcript cue ↔ representative frame ↔ overlapping shots

[Coverage and unknowns]
```

### Interaction

- Selecting a knowledge-unit anchor highlights its transcript cues and representative frames.
- Sparse/Dense changes only frame sampling density; it does not change the underlying evidence set.
- Raw and normalized transcript are toggles over the same cue IDs.
- Unsupported creator claims are visually distinct from system inference and unknown.

## 5. Single-creator page

### Reading order

1. identity, positioning, values, trust, lifecycle;
2. data health and full-corpus baseline;
3. topic and format portfolios;
4. High/Base/Low interpretation;
5. canonical 21-record List/Gallery browser;
6. selected deep-video evidence;
7. rhythm and evolution;
8. audience/comment demand;
9. observed growth engines;
10. business path, boundaries, and unknowns.

### Text wireframe

```text
┌ Creator identity ──────────────┬ Values provided ───────────────┐
│ positioning · audience         │ practical · cognitive · ...    │
│ trust · lifecycle              │ evidence level                 │
└────────────────────────────────┴─────────────────────────────────┘

┌ Corpus health ┬ Median ┬ Mean ┬ Maximum ┬ Stability ┬ Coverage ┐
└─────────────────────────────────────────────────────────────────┘

[Topic portfolio]                             [Format portfolio]
count · share · median · mean · maximum        same metric contract

[High / Base / Low]
three concise conclusions; Base exposes median-near and mean-near

┌ 21-record browser ──────────────────────────────────────────────┐
│ filters: tier · topic · format · era · evidence                 │
│ view: LIST | GALLERY                                           │
│ deep 9 records carry an evidence-grade marker inside either view│
└─────────────────────────────────────────────────────────────────┘

[Deep evidence]
open inline drawer or navigate to Single Video with return context

[Rhythm and evolution] [Audience demand] [Growth engines]
[Business path] [Boundaries and unknowns]
```

### List contract

Dense comparison columns:

- tier;
- title;
- topic and format;
- publish time;
- duration;
- likes and other available public metrics;
- relative-to-median value / percentile;
- core content;
- architecture summary;
- mechanism hypothesis;
- selection reason;
- evidence status.

### Gallery contract

Every card uses a real cover or verified frame and displays the same record ID, tier, title, form, core content, public metrics, mechanism hypothesis, and evidence status as List.

## 6. Multi-creator page

### Reading order

1. scope, sample rationale, time windows, and comparability;
2. normalized baselines;
3. creator identity/value/lifecycle overview;
4. user-value matrix;
5. topic and format matrices;
6. High/Base/Low mechanism comparison;
7. structure and expression differences;
8. audience demand;
9. rhythm and evolution;
10. business paths;
11. track-wide / creator-specific / conditional / anomaly / unknown ledger.

### Text wireframe

```text
┌ Comparison scope ───────────────────────────────────────────────┐
│ creators · platform · full history / aligned window · freshness │
│ comparable groups · special cases · missing channels            │
└─────────────────────────────────────────────────────────────────┘

[Normalized overview]
creator | median | mean | max | high share | concentration | stability
raw values + creator-relative percentile/multiple

[Identity and user value]
creator summaries + value matrix

[Topic matrix] [Format matrix] [Topic × Format matrix]

[High / Base / Low mechanisms]
rows = mechanisms; columns = creators; cells = evidence and stability

[Structure / expression] [Audience] [Rhythm / evolution] [Business]

[Conclusion ledger]
TRACK-WIDE | CREATOR-SPECIFIC | CONDITIONAL | ANOMALY | UNKNOWN
each row drills down to creator and video evidence
```

### Interaction

- A global time-window switch updates all comparable metrics together.
- Raw/normalized metric mode is explicit and persistent.
- Clicking a matrix cell filters the supporting records; it never jumps to an unexplained aggregate.
- Opening a creator preserves comparison filters in the return URL/state.
- A conclusion cannot display as “track-wide” without supporting evidence from more than one creator and more than one record.

## 7. Responsive layout

### 900–1199 px

- Context rail narrows to icon + short labels or becomes a top section navigator.
- Evidence drawer becomes an overlay opened from an evidence link.
- Main reading order remains unchanged.

### Below 900 px

- One-column document flow.
- Context becomes a sticky compact header with section menu.
- Evidence opens as a full-height bottom sheet/page.
- Dense tables become stacked comparison rows with explicit field labels; no forced horizontal overflow.
- List/Gallery remains available; Gallery moves to one column on narrow phones.
- First-viewport hierarchy remains source → conclusion → health.

## 8. Shared component registry

| Component | Purpose | Reuse rule | New variant allowed when |
| --- | --- | --- | --- |
| `DataHealthStrip` | freshness, coverage, missing channels | all three levels | evidence model genuinely differs |
| `ProvenanceBadge` | fact/observation/claim/inference/unknown | universal | never by page |
| `MetricCell` | raw value, normalized value, definition | creator and comparison | metric unit differs |
| `EvidenceLink` | open contextual evidence | universal | never by page |
| `ListGallerySwitch` | projection over same records | creator and future collections | underlying IDs remain identical |
| `TierBadge` | High/Base/Low | creator and comparison | thresholds remain creator-relative |
| `ConclusionLedger` | classified multi-level findings | creator and comparison | classification scheme differs by contract |
| `UnknownPanel` | explicit limits and unchecked channels | universal | never hidden or replaced by tooltip-only UI |

## 9. Element-to-data mapping

| UI element | Source | Status |
| --- | --- | --- |
| Video thesis/article/transcript/relationships | video reconstruction artifact | data field required |
| Video frames, OCR, shot overlap, audio evidence | evidence manifests | data field required |
| Creator identity/value/lifecycle | creator analysis with evidence class | needs normalized contract |
| Median/mean/max/distribution | full corpus analysis | existing pattern |
| 21 List/Gallery records | canonical selection/comparison dataset | needs unified data model |
| Deep evidence marker | reconstruction + evaluation status | needs unified data model |
| Multi-creator aligned window | comparison project scope | needs backend |
| Normalized metrics | corpus statistics per creator | needs backend |
| Value/topic/format matrices | normalized annotations + aggregation | needs backend |
| Conclusion classification and evidence links | comparison synthesis | needs backend |

No UI element may be implemented with invented sample metrics merely to complete a visual composition.

## 10. Explicit visual non-decisions

This document freezes structure and behavior and preserves the existing visual baseline. It does not yet approve:

- final density and spacing;
- exact colors or typography changes;
- chart visual forms;
- desktop reference mockup;
- mobile reference mockup;
- motion language.

Those belong to the next visual-direction phase and require Owner selection before implementation.
