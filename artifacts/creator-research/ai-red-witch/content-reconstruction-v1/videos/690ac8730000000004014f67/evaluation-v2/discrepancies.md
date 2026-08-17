# Evaluation v2 discrepancies — 690ac8730000000004014f67

## Remaining discrepancy

### V2-D-01 | Low | Non-blocking | stale reviewed-frame provenance count

- **Candidate statement:** `skill-run/reconstruction.json` registers `SRC-OCR-REVIEW.producedBy` as “manual review of 103 targeted source frames against OCR proposals.”
- **Current evidence:** the refreshed `targeted-evidence/targeted-evidence.json` contains 108 frames, and the refreshed `targeted-evidence/ocr-evidence.json` contains 108 processed frames.
- **Difference:** the exact value `103` is stale after the capture/manifest refresh.
- **Impact:** provenance metadata is internally inconsistent. The error does not change any audit-critical card reading, visual count, timestamp, causality boundary, audio conclusion, or relationship; it is one unsupported assertion out of 38 checked assertions and remains below the 5% hard-gate ceiling.
- **Suggested later repair:** change the provenance string to `manual review of 108 targeted source frames against OCR proposals`, if that is the intended complete-review claim, or remove the exact count and describe the bounded review scope precisely.

## Prior discrepancy closure check

- **D-01 closed:** full non-speech audio is represented by 29 overlapping windows over 0–15 seconds and ten stages bounded to 0–14.9 seconds.
- **D-02 closed:** audio coverage no longer relies on still frames or AAC metadata; those limitations are explicit.
- **D-03 closed:** all 14 current protocol actions are present in the refreshed manifest; all 108 frame-level `carrier` and `reason` values match the protocol, with zero mismatches.
- **D-04 closed:** no stale five-segment wording remains in current JSON/Markdown candidate artifacts; all relevant statements use six segments.

No blocking audit-to-candidate discrepancy remains. This file reports findings only and does not modify the candidate.
