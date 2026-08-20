# Research Learning Model

Status: **normative for schema, synthesis, revision, and promotion gates**

The workbench must learn from completed analyses without converting one persuasive example into a universal rule. Learning is represented by three versioned objects: `ResearchConcept`, `Observation`, and `Revision`.

## 1. ResearchConcept

A concept is an open, reusable analytical distinction, not a free-text tag.

```json
{
  "id": "rc_uuid",
  "slug": "result-first-proof",
  "kind": "content_mechanism|directing_device|visual_grammar|proof_mode|failure_mode|value_mode|condition",
  "name": "先展示结果再解释过程",
  "definition": "可判定的正例边界",
  "exclusions": ["不可算作该概念的近似现象"],
  "scope": "video_specific|creator_specific|conditional|track_wide",
  "status": "candidate|active|qualified|contradicted|invalidated|retired",
  "currentRevisionId": "rr_uuid"
}
```

Required invariants:

- `slug + kind` is unique; synonyms use aliases, not duplicate concepts.
- `definition` and at least one exclusion are mandatory before `active`.
- A concept never stores “causes virality” unless causal evidence exists; public performance supports association only.
- Scope is earned through observations and may move both upward and downward.

## 2. Observation

An observation is the smallest evidence-backed judgment connecting a concept to a subject.

```json
{
  "id": "ro_uuid",
  "conceptRevisionId": "rr_uuid",
  "subjectType": "video|creator|comparison",
  "subjectId": "uuid",
  "relation": "confirm|qualify|contradict",
  "condition": {"tier": "high|base|low", "topic": null, "format": null, "era": null},
  "statement": "what was observed",
  "evidenceRefs": [],
  "analysisRevisionId": "uuid",
  "confidence": "low|medium|high",
  "gateState": "eligible|quarantined|invalid"
}
```

Rules:

- `confirm` matches the concept definition within the stated condition.
- `qualify` confirms only under a narrower condition or changes its boundary; an empty condition cannot qualify.
- `contradict` is a valid counterexample inside the claimed scope, not merely absence of the pattern.
- One video contributes at most one independent vote per concept revision, even if multiple evidence references support it.
- An observation is `eligible` only when its source analysis revision passed the relevant lens/creator gate. Failed or stale evidence is quarantined and excluded from promotion counts.

## 3. Revision and decision ledger

Every change to definition, exclusions, scope, status, or evidence set creates an immutable `Revision`:

```json
{
  "id": "rr_uuid",
  "conceptId": "rc_uuid",
  "revision": 3,
  "parentRevisionId": "rr_prev",
  "changeType": "create|confirm|qualify|contradict|promote|demote|invalidate|restore|retire",
  "decision": "human-readable but testable reason",
  "eligibleObservationIds": [],
  "excludedObservationIds": [{"id": "...", "reason": "..."}],
  "scopeBefore": "creator_specific",
  "scopeAfter": "conditional",
  "createdAt": "ISO-8601"
}
```

The current pointer changes atomically only after `LEARN-REVISION-INTEGRITY` verifies the parent, observation resolution, counts, and decision rule. Earlier revisions remain readable.

## 4. Evidence effects

| Effect | Required system behavior |
| --- | --- |
| `confirm` | Add eligible support without widening scope automatically. Recompute support/counterexample counts. |
| `qualify` | Materialize the condition, narrow definition or scope, and re-evaluate all prior observations against the new revision. |
| `contradict` | Preserve the counterexample beside support; recompute confidence and promotion eligibility. Do not silently delete the concept. |
| `promotion` | Create a revision whose higher scope is justified by the quantitative rules below. |
| `invalidation` | Mark the affected revision unusable for synthesis because its evidence, mapping, or definition is unsound; cascade staleness to dependent conclusions. |

Contradiction concerns the truth boundary. Invalidation concerns the integrity of the research object or its evidence. They are not synonyms.

## 5. Promotion rules: video → creator → multi-creator

### 5.1 Video-specific candidate

A new concept begins `candidate/video_specific` with:

- at least 1 eligible observation;
- at least 1 resolvable evidence reference;
- a definition and exclusion boundary;
- the relevant three-lens gate passed for the evidence used.

### 5.2 Creator-specific

Promote to `active/creator_specific` only when all are true:

- at least 3 eligible confirming/qualifying observations from 3 distinct videos by the same creator;
- observations span at least 2 performance tiers, or the revision explicitly limits the concept to one tier;
- at least 1 observation comes from a deep reconstruction;
- zero eligible contradictions within the claimed condition, or contradictions are incorporated into an explicit qualifying condition;
- denominator and inspected set are stored.

If the concept appears only in High, it may become `creator_specific` only as “High-associated within this inspected creator sample,” never as a creator-wide default.

### 5.3 Conditional cross-creator

Promote to `qualified/conditional` only when all are true:

- at least 2 creators each satisfy the creator-specific threshold;
- at least 6 distinct eligible videos total;
- a machine-readable condition names the shared topic, format, tier, audience problem, era, or proof context;
- eligible contradictions outside that condition are preserved as boundary evidence.

### 5.4 Track-wide

Promote to `active/track_wide` only when all are true:

- at least 3 comparable creators with pinned revisions;
- each creator contributes at least 3 distinct eligible videos and at least 1 deep reconstruction;
- at least 9 eligible videos total;
- support is present in at least two tiers across the comparison, unless the claim is explicitly tier-bound;
- contradiction rate within the claimed condition is at most 20%;
- the comparison declares platform, capture window, normalization, lifecycle differences, and denominator.

These are minimum evidence gates, not proof of causality. A track-wide concept remains an observed association unless stronger evidence is imported.

## 6. Demotion, contradiction, and invalidation

### Automatic re-evaluation triggers

- a source artifact hash changes;
- an analysis revision becomes failed, stale, or superseded;
- a parity or three-lens gate changes from pass to fail;
- a concept definition/condition changes;
- a new eligible `qualify` or `contradict` observation is added;
- creator comparability or aligned-window membership changes.

### Deterministic outcomes

- If a promotion threshold is no longer met, create `demote`; never mutate the old scope in place.
- If contradiction rate within scope exceeds 20% but evidence remains valid, set `status=contradicted` and block further promotion until qualification or demotion.
- If all supporting observations become quarantined/invalid, set `status=invalidated` and mark dependent creator/comparison conclusions `stale_available`.
- If a source mapping points to the wrong subject, evidence refs do not resolve, or a required gate was falsely recorded as passing, invalidate the affected revision regardless of support count.
- A later valid evidence repair creates `restore`; it does not erase the invalidation history.

## 7. Synthesis and UI contract

Single-video pages may show candidate concepts but label them “本视频观察.” Creator pages show creator-specific concepts with inspected-video and tier denominators. Multi-creator pages show conditional or track-wide concepts with creator/video support, contradiction count, scope, conditions, and current revision.

Every concept drawer displays:

1. definition and exclusions;
2. current scope/status/revision;
3. confirm / qualify / contradict counts;
4. creator, video, tier and time-window denominators;
5. supporting and counterexample observations;
6. promotion/demotion/invalidation decision history;
7. drill-down to original evidence.

Research synthesis may cite only `eligible` observations pinned to the current concept revision. Prompt memory, analyst intuition, and free-text labels are not valid hidden inputs.

## 8. Hard gates

| Gate | Pass rule |
| --- | --- |
| `LEARN-CONCEPT-SHAPE` | Unique identity, kind, definition, exclusions, scope and status are valid. |
| `LEARN-OBSERVATION-EVIDENCE` | Every eligible observation resolves subject, analysis revision, condition and evidence refs. |
| `LEARN-PROMOTION-THRESHOLD` | Scope satisfies §5 counts, tier/condition and comparability requirements. |
| `LEARN-CONTRADICTION-DISCLOSURE` | All eligible contradictions are counted and visible; no excluded counterexample lacks a reason. |
| `LEARN-REVISION-INTEGRITY` | Immutable parent chain, current pointer, included/excluded observations and decision are reproducible. |
| `LEARN-INVALIDATION-CASCADE` | Invalid source/revision makes all dependent conclusions stale or invalid before a new revision can publish. |

A creator analysis is not “learning-complete” until new observations are either linked to an existing concept revision or explicitly recorded as reviewed/no-new-concept. A multi-creator conclusion cannot publish from unversioned labels.
