# Repaired candidate discrepancies — 6808e742000000001e000b85

## V2-01 — Non-speech audio is declared inspected without audio evidence

- Severity: **Hard GATE**.
- Audit/current evidence: the source has an AAC audio track.
- Candidate declaration: `probe.json` marks `CAR-07` available and `inspected=true`; `coverageMatrix.channels` repeats the closure and the internal meta-gate passes.
- Candidate evidence actually supplied: `SRC-MEDIA-METADATA` and `KU-21` establish only that an audio track exists. Their own limitation says they cannot identify background music, sound effects, inserted audio or narrative role. The capture protocol has no audio-specific inspection action or audio-derived artifact.
- Independent finding: carrier existence is not carrier inspection. `CAR-07` remains unchecked, and the internal meta-gate is self-proving on this point.
- Required closure: inspect the audio channel with evidence that can support a bounded conclusion about non-speech content and its relation to the visual edit, or explicitly keep the carrier unchecked. Metadata-only closure is insufficient.

## V2-02 — Resampled OCR execution is not registered in the reconstruction

- Severity: **Hard deterministic GATE**.
- Candidate evidence: `targeted-evidence/resampled-ocr-evidence.json` contains processed OCR rows for `RESAMPLED-0001`–`0003`.
- Contract problem: `reconstruction.json` registers the resampled frame manifest but not the resampled OCR artifact as a derived source. The canonical validator therefore reports all three `ACT-14` frames as `ocr_not_processed`.
- Independent finding: the full-resolution frames visually support D-01 through D-03, so those content repairs remain closed; nevertheless, OCR/UI execution provenance fails.
- Required closure: register the resampled OCR artifact as an `ocr-evidence-1.0` derived source with resolvable path/provenance, then rerun the canonical validator.

## V2-03 — `KU-23` cites comparison frames outside its declared time range

- Severity: **Hard deterministic GATE**.
- Candidate: `KU-23.timeRange` is `6.0–6.967`, but its evidence also cites `TARGET-0011` at 25.2s, `TARGET-0029` at 34.2s, and `TARGET-0042` at 38.92s.
- Independent finding: those three frames are correctly localized and relevant to the page-versus-playback comparison, but the knowledge-unit time range excludes them. Canonical `internal_timestamp_bounds` fails.
- Required closure: widen `KU-23.timeRange` to cover the comparison or split the 6.4-second page statement from the later playback comparison into separate units/relations.

## V2-04 — Live versus prerecorded interface status is not explicitly preserved

- Severity: residual process-dependency omission; the process gate still passes at 12/13.
- Audit: whether the visible interface was live or prerecorded is unknown and material to the claimed online workflow.
- Candidate: correctly says no end-to-end execution is shown, but does not explicitly retain this interface-state uncertainty.
- Required closure: add the bounded unknown that the shown interface may be live, prerecorded or a presentation capture; the video does not establish which.

## Prior repair-target closure

| Prior item | Status | Current evidence |
|---|---|---|
| D-01 missing direct release-page evidence | Closed | `KU-22`, `RESAMPLED-0001`, `RESAMPLED-0002` |
| D-02 missing page statement about 30-second demos | Closed | `KU-23`, `RESAMPLED-0003`, plus social-playback boundary frames |
| D-03 title transcription error | Closed | `KU-01` uses `无限长胶片生成模型` |
| D-04 self-reported coverage overclaim | Closed | repair notes limit self-coverage to own units; fresh audit coverage independently recounts 15/15 |

All four earlier content discrepancies are closed. They do not override V2-01: hard gates are conjunctive, and JUDGE cannot compensate for an uninspected available carrier.
