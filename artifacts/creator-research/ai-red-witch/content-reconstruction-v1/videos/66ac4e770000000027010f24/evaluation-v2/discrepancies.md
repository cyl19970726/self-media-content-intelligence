# Repaired candidate discrepancies and closure audit

This fresh closure audit used the prior `evaluation/discrepancies.md` only as a list of repair targets. The earlier evaluation verdict and scores were not used.

## D-01 — Closed: direct benchmark counterexamples

The repaired candidate now states that the visible 72B table directly contradicts the universal “全面碾压” wording:

- MBPP: Qwen2-72B-Instruct 80.2; Llama3-70B-Instruct 82.3.
- GSM8K: Qwen2-72B-Instruct 91.1; Llama3-70B-Instruct 93.0.

This is present in `KU-12`, `CQ-13`, `REL-04`, `report.md`, and the dedicated 72B benchmark crop. The conclusion is no longer supported only by missing methodology or selective-table caveats.

## D-02 — Closed: 72B and 7B table identities remain separate

`KU-10`, `capture-protocol.json` ACT-16, and the report now preserve the correct columns:

- 72B table: Qwen2-72B-Instruct / Llama3-70B-Instruct / Qwen1.5-72B-Chat.
- Small-model table: Qwen2-7B-Instruct / Llama3-8B-Instruct / GLM4-9B-Chat.

No GLM4-9B value is assigned to the 72B table, and no Qwen1.5-72B value is assigned to the 7B table.

## D-03 — Closed: 57B-A14B and the two visible product scopes

`KU-06`, `KU-07`, `KU-31`, `MC-03`, and `REL-11` preserve both source presentations:

- Five-size family listing: 0.5B, 1.5B, 7B, 57B-A14B, 72B.
- Later four-column card: 0.5B, 1.5B, 7B, 72B.

The candidate does not erase 57B-A14B and does not invent a reason for its omission or assign the later card's specifications to it.

## D-04 — Closed: semantic audio inspection replaces the amplitude-only overclaim

The prior mismatch is closed by `inspection/audio-semantic-listen.json`, retained bounded clips, `KU-32`, `CQ-14`, and updated carrier accounting. The candidate now distinguishes:

- machine semantic evidence for recurrent music in bounded 0–63.7 second windows;
- a localized 22–24 second ding-like accent;
- amplitude and semantic agreement on the silent tail from about 63.689 seconds;
- unresolved genre, track identity, ownership, exact effect source, and human auditory confirmation.

It also rejects low/unstable camera, gunshot, and chopping labels instead of converting classifier noise into literal events. The audio gate is therefore no longer an amplitude-only self-certification.

## D-05 — Preserved audit correction: HumanEval is not a third Llama 3 win

The repaired candidate correctly records the 7B-table HumanEval row as 79.9 / 62.2 / 71.8. It explicitly keeps 82.3 on the 72B-table MBPP row. This preserves the audit correction and prevents the earlier cross-row misread from entering the reconstruction.

## Residual discrepancies

None found. All four candidate repair targets are closed, the audit correction is preserved, and the independent meta-audit found no new unguarded carrier, meaning change, or relationship.

No candidate file was modified, and this document does not announce workflow readiness.
