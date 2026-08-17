# Fresh repaired-candidate discrepancies — 66ee9136000000001201188a

## Blocking discrepancy

### V2-01 — `KU-06` cites OCR evidence outside its declared time range

- Candidate range: `KU-06.timeRange = 9.75–10.75`.
- Cited evidence: `OCR-00139`, text `In queue`.
- Resolved evidence time: `OCR-00139` belongs to `TARGET-0028` at 9.20 seconds.
- Canonical rule: cited frame/OCR time must fall within the unit range with at most ±0.5 seconds tolerance.
- Result: the earliest allowed time is 9.25 seconds, so 9.20 seconds is 0.05 seconds too early.
- Deterministic failure: `internal_timestamp_bounds` → `KU-06:frame_outside_range:OCR-00139`.

This does not dispute the queue text itself. `TARGET-0161` at 9.25 seconds and the registered review crop independently support the same content. The defect is the candidate's machine-readable localization contract.

Required candidate-side correction: either align `KU-06.timeRange.start` with the evidence window or cite an equivalent OCR/frame reference that falls within the declared range. The evaluation does not make that correction.

## Verified non-discrepancies

- **Semantic non-narration audio:** the current run genuinely supplies listening-derived machine evidence rather than inferring semantic audio from AAC presence. It retains raw scores, four bounded regions, 19 windows, limitations, rejected labels, and unknown result-clip attribution.
- **One-minute causality:** the candidate explicitly says the workflow duration is not demonstrated and does not use the 18-second post length as generation time.
- **Queue tension:** the complete `In queue / ... will start in a few minutes` microcopy is captured and directly related to the “1分钟” headline.
- **Generation chain:** visible input, prompt, queue, result, Gen-3 Alpha label, Extend/Lip Sync controls, and absent execution/export bridges remain distinct.
- **Meta coverage:** no new unguarded available carrier, material meaning change, or audited relationship was found.

## Final discrepancy count

- Blocking: 1.
- Non-blocking: 0.

The candidate was not modified. This evaluation does not announce workflow readiness.
