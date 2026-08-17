# Independent discrepancies

Status: **NOT_READY**

1. **Invented 2026 visual reading (hard).** The candidate says the burned subtitle visibly says “2026年.” Audit CC-02/AC-08 finds that no year is visible there. Keep SRT “2020” as raw text and the spoken year unknown.
2. **Wrong fixed-format creator name (hard).** Candidate “梁桑” conflicts with audit CC-04, which supports “梁馨和小马.”
3. **Opening-to-closing gap omitted (hard).** The closing is described as an identity loop, but the reconstruction does not preserve that it neither demonstrates nor explicitly closes, qualifies, or guarantees the opening breakout-vlog promise.
4. **Missing 爆款 threshold unknown (hard).** The video never gives a numerical definition of 爆款; the candidate does not state this explicitly.
5. **Missing execution-proof boundary (hard).** The candidate does not explicitly state that no end-to-end filming/editing/testing workflow or before/after transformation demonstration is shown.
6. **Non-speech-audio validator key failure (hard).** CAR-08 is conceptually guarded, but `modalityKeys` lacks a validator-recognized `non_speech_audio` key, so `full_timeline_carrier_sweep` fails deterministically.

See `discrepancies.json` for audit references, candidate references, and exact repairs.
