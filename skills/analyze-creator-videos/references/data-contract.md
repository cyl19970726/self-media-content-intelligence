# Creator corpus data contract

`creator-corpus.json` is the normalized source of truth for portfolio analysis. Keep raw acquisition evidence in `raw/`.

## Post identity

Every post requires a stable `id`, `title`, `sourceUrl`, `mediaType`, and metrics object. Use `null` for unknown values. Do not invent dates or counts.

## Public metrics

Store only public values under `metrics`: `likes`, `collections`, `comments`, and `shares`. These are snapshot values. They do not establish views, impressions, retention, conversion, organic distribution, or followers gained.

## Open annotations

Annotations are multi-label and extendable: `topicTags`, `formatTags`, `audienceTags`, `hookTypes`, `proofModes`, `visualPatterns`, `contentMechanisms`, and `likelyAudienceActions`.

Every non-trivial annotation includes a short `annotationEvidence` statement. Use `unclassified` when the evidence cannot support a label. Do not make one fixed taxonomy mandatory across creators.

## Media and evidence

Local media fields may point to `videoPath`, `subtitlePath`, and `coverPath`. These are inputs for the deep set, not proof that reconstruction succeeded.

Keep post copy, comments, video-internal evidence, external verification, and backend analytics as separate channels.

## Snapshot semantics

Record `snapshotAt`. A current snapshot cannot prove the exact engagement level at publication time. Where publish dates are relative or unavailable, preserve the raw label and leave normalized time unknown.
