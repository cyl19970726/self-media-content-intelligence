# Creator Analysis OS V1 — Canonical Data Model

Status: **proposed logical model; physical SQL types and migrations follow confirmation**

## 1. Modeling rule

Separate five things that are currently easy to mix:

1. **Entity** — the stable creator or post identity.
2. **Snapshot** — what public data was observed at a time.
3. **Artifact** — immutable raw or derived evidence bytes/JSON.
4. **Revision** — one reproducible analytical interpretation pinned to inputs.
5. **Run** — mutable operational work used to produce snapshots, artifacts, and revisions.

## 2. Core relationships

```mermaid
classDiagram
    class Creator {
      uuid id
      string platform
      string externalId
      string canonicalUrl
    }
    class Post {
      uuid id
      uuid creatorId
      string externalId
      string mediaType
    }
    class Snapshot {
      uuid id
      string subjectType
      uuid subjectId
      datetime capturedAt
      string contentHash
    }
    class Artifact {
      uuid id
      string sha256
      string kind
      string schemaVersion
      string visibility
    }
    class AnalysisRevision {
      uuid id
      string subjectType
      uuid subjectId
      string analysisType
      string status
      string inputFingerprint
    }
    class ResearchRun {
      uuid id
      string objectType
      string status
      string readiness
    }
    class ComparisonProject {
      uuid id
      string name
      datetime alignedFrom
      datetime alignedTo
    }

    Creator "1" --> "n" Post : owns
    Creator "1" --> "n" Snapshot : observed_as
    Post "1" --> "n" Snapshot : observed_as
    Artifact "n" --> "n" Artifact : derived_from
    AnalysisRevision "n" --> "n" Artifact : pins_inputs_outputs
    ResearchRun "1" --> "n" Artifact : produces
    ResearchRun "1" --> "n" AnalysisRevision : publishes
    ComparisonProject "1" --> "n" AnalysisRevision : pins_creator_revisions
```

## 3. Identity model

### Internal IDs

Use UUIDs for internal identity. Never use creator display name, artifact directory, list position, or current URL token as the primary identity.

### Platform aliases

`external_identities` maps:

| Field | Meaning |
| --- | --- |
| `entity_type` | `creator` or `post` |
| `entity_id` | internal UUID |
| `platform` | `xiaohongshu`, later `x`, `youtube`, etc. |
| `external_id` | stable platform ID |
| `canonical_url` | sanitized canonical URL |
| `observed_alias` | display/user IDs when useful |
| `valid_from/valid_to` | historical alias range |

Unique constraint: `(platform, entity_type, external_id)`.

Short/share URLs are resolver inputs, never stable identity.

## 4. Operational relational catalog

### Registry

| Table | Role | Important fields |
| --- | --- | --- |
| `creators` | stable creator entity | `id`, `platform`, `external_id`, `created_at` |
| `posts` | stable post entity | `id`, `creator_id`, `platform`, `external_id`, `media_type` |
| `external_identities` | aliases and canonical URLs | entity key, platform key, URL, validity |

### Snapshots and public data

| Table | Role | Important fields |
| --- | --- | --- |
| `profile_snapshots` | append-only public profile state | creator, captured time, display fields, artifact ID |
| `post_snapshots` | append-only post metadata state | post, captured time, title/copy/date/duration, artifact ID |
| `metric_snapshots` | append-only public metric state | post, captured time, likes/collections/comments/shares nullable |
| `field_candidates` | conflicting extraction candidates | snapshot, field, value JSON, source, confidence, status |
| `comment_snapshots` | scoped public-comment capture | post, captured time, scope/denominator, artifact ID |

Metrics are nullable. `0` means a visible verified zero; `null` means unavailable.

### Artifacts and provenance

| Table | Role | Important fields |
| --- | --- | --- |
| `artifacts` | immutable artifact registry | ID, SHA-256, kind, schema, MIME, bytes, storage key, visibility |
| `artifact_edges` | dependency/invalidation graph | parent artifact, child artifact, edge kind |
| `artifact_subjects` | attaches artifact to creator/post/run/revision | subject type/ID, artifact ID, role |
| `evidence_index` | searchable typed evidence references | artifact ID, evidence type/ID, time range, selector |

`storage_key` is provider-relative. Local absolute paths and public URLs are not domain data.

### Research and selection

| Table | Role | Important fields |
| --- | --- | --- |
| `analysis_revisions` | immutable analysis publication | subject, type, input fingerprint, output artifact, status |
| `annotations` | open multi-label post annotations | post, taxonomy namespace, label, evidence, revision |
| `selection_sets` | one creator comparison selection revision | creator, corpus revision, rule version, status |
| `selection_items` | canonical 21 records and deep flags | selection set, post, tier, anchors, rank, reason, deep flag |
| `conclusions` | indexed claims from an analysis revision | scope class, provenance, confidence, text, reasoning |
| `conclusion_evidence` | typed evidence links for conclusions | conclusion, evidence reference |

### Multi-creator comparison

| Table | Role | Important fields |
| --- | --- | --- |
| `comparison_projects` | comparison scope | name, platform, full-history flag, aligned window, status |
| `comparison_members` | pinned creator revisions | project, creator, creator-analysis revision, role/comparability |
| `comparison_revisions` | reproducible comparison result | project, member fingerprint, output artifact, status |
| `comparison_conclusions` | indexed classified findings | revision, class, text, confidence |

Conclusion class is one of:

- `track_wide`;
- `creator_specific`;
- `conditional`;
- `anomaly`;
- `unknown`.

### Orchestration

| Table | Role | Important fields |
| --- | --- | --- |
| `research_runs` | one requested research operation | object type/ID, requested revision, status, readiness |
| `workflow_nodes` | persisted DAG node state | run, node key, dependencies, state, input fingerprint |
| `jobs` | leased worker work item | kind, subject, idempotency key, lease, attempts, next run |
| `job_events` | append-only operational audit | job/run, event type, timestamp, safe payload |
| `blockers` | user/system blockers | run/node, code, action required, resolved time |
| `gate_results` | deterministic/independent gates | subject revision, gate, numerator/denominator, pass, evidence |

## 5. Rich artifact contracts

Do not flatten every transcript cue, frame, OCR line, or relationship into SQL. Keep rich domain artifacts as schema-validated immutable JSON and index only what UI/query needs.

### Video reconstruction artifact family

```text
evidence-pack
probe
capture-protocol
targeted-evidence
ocr/audio evidence
reconstruction
independent evaluation
gate report
readable article
```

### Creator artifact family

```text
collection inventory
collection status
normalized corpus
corpus statistics
canonical selection set
creator analysis
creator read projection
```

### Comparison artifact family

```text
comparison scope
pinned member revisions
normalization report
value/topic/format matrices
classified conclusion ledger
comparison read projection
```

## 6. Typed evidence reference

Every core conclusion uses this logical shape:

```json
{
  "artifactId": "uuid",
  "refType": "cue|shot|frame|ocr|source|metric|annotation|analysis",
  "refId": "CUE-014",
  "timeRangeMs": { "start": 23500, "end": 27100 },
  "selector": { "jsonPointer": "/transcript/13" },
  "role": "supports|contradicts|qualifies|scope|unknown_boundary"
}
```

Rules:

- `artifactId + refType + refId` must resolve.
- Time range is required for time-based video evidence.
- A path string alone is not evidence.
- Negative evidence also carries the inspected scope and sought carrier.
- OCR references include source frame and review state.

## 7. Revision model

An `analysis_revision` is immutable and contains:

- subject ID and analysis type;
- exact input artifact IDs/hashes;
- contract/schema versions;
- skill/model/tool versions when material;
- output artifact ID;
- validation/evaluation status;
- created time and producing run;
- readiness and explicit limitations.

The mutable subject record stores only `current_revision_id`. Publishing a new revision atomically changes that pointer after gates pass.

## 8. Input fingerprints and idempotency

Build deterministic fingerprints from sorted inputs:

```text
sha256(
  jobKind
  + subjectId
  + inputArtifactHashes
  + contractVersions
  + relevantParameters
)
```

The same fingerprint reuses the prior successful output. A failed/retry job can run again, but cannot create competing authoritative outputs for the same fingerprint.

## 9. High / Base / Low model

`selection_items.tier` is exactly `high | base | low`.

Base anchors are multi-valued:

- `median_near`;
- `mean_near`;
- `typical_form`;
- `mean_lower_boundary`;
- `mean_upper_boundary`.

If no post is within the accepted distance of the arithmetic mean, record `mean_gap=true` and use boundary anchors. Mean-near is not promoted into a fourth user-facing tier.

The canonical comparison set is one `selection_set`. `deep_selected=true` marks the nine deep records inside it.

## 10. Multi-creator reproducibility

A comparison revision pins:

- member creator IDs;
- exact creator-analysis revision IDs;
- metric snapshot cutoff;
- aligned time window and timezone;
- normalization version;
- annotation/taxonomy versions;
- excluded/special-case member reasons.

It never reads an unpinned “latest” creator analysis during computation. If a member publishes a newer revision, the comparison becomes `stale_available`, not silently different.

## 11. Data retention and visibility

Visibility classes:

- `private_transient` — signed URLs, download candidates, session-bound details; TTL and never public;
- `private_raw` — authenticated raw snapshots and source media;
- `internal_sanitized` — normalized evidence and analysis;
- `public_safe` — redacted projection/export safe for a public repository.

Garbage collection may remove unreferenced transient artifacts after TTL. Immutable evidence referenced by a published revision is retained until the revision is explicitly retired.
