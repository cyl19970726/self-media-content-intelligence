# Audit-to-candidate discrepancies — 6808e742000000001e000b85

## D-01 — Missing direct open-release page evidence

- Severity: major; causes evidence-coverage loss.
- Independent audit: at `00:01.867-00:06.967`, the visible project page says model weights and inference code are provided.
- Candidate: describes SkyReels pages/interfaces and preserves license/ownership uncertainty, but never reconstructs this direct page statement.
- Why it matters: “a page says weights/code are provided” is stronger and more precise than merely repeating the presenter's “免费开源” claim, while still remaining distinct from verified license or zero-price status.

## D-02 — Missing page statement about 30-second demos

- Severity: major; causes evidence-coverage and critical-question loss.
- Independent audit: the same page describes its displayed demos as 30-second videos generated with the diffusion-forcing model.
- Candidate: correctly proves that the social video itself does not play a 30-second uncut result, but omits the embedded page's narrower provider-side statement.
- Why it matters: “the page claims 30-second demos” and “this video demonstrates a 30-second one-take” are different propositions. A faithful reconstruction should preserve both without conflating them.

## D-03 — Project-page title transcription error

- Severity: minor factual error; counted as one unsupported/inaccurate positive claim.
- Independent frame (`TARGET-0001`): `SkyReels V2：无限长胶片生成模型`.
- Candidate report: `SkyReels V2：无限长影片生成模型`.
- Candidate internal note: treats “胶片” as an OCR error, but the inspected image supports “胶片”.

## D-04 — Self-reported coverage overstates independent coverage

- Severity: methodological discrepancy.
- Candidate `coverageMatrix.coreEvidence`: `15/15`.
- Independent evaluation: `13/15`.
- Explanation: the candidate's matrix measures its own selected units and therefore cannot prove completeness. When mapped against the independent audit's core units, D-01 and D-02 are absent.

## Important agreements

The candidate and audit agree on the following high-impact findings:

- the visible identity is SkyReels V2, while `Skyrise/scarios` are SRT/ASR errors;
- the company attribution is narration-only within the inspected artifact;
- the longest clearly visible same-scene sample is about 8.8 seconds;
- the makeup-to-grassland transition and grassland-to-turtle change defeat the apparent one-take proof;
- “几乎无限长度” is a qualified embedded-text claim, not observed infinite playback;
- free access, license, commercial use, account/region availability and current service status remain unknown;
- the 620 万小时 claim, sample provenance, complete-short-drama workflow and source authorization are not established;
- the closing CTA strengthens the opening “industry event” framing;
- technical shot grouping must not be mistaken for semantic continuity.
