# Fresh evaluation-v2 discrepancies

This report uses only the current audit, evidence, skill-run outputs, and canonical evaluation protocol/schema. Earlier evaluation and discrepancy artifacts were excluded.

## Material discrepancy

### V2-01 — Available non-speech audio is not semantically inspected

- **Severity:** hard-gate / meta-gate failure
- **Affected items:** `probe CAR-08`, `KU-26`, `DS-AUDIO-CHECK`
- **Observed state:** the technical check establishes an AAC stereo stream and the absence of long silence under its threshold.
- **Missing guard:** no semantic listening or classification identifies whether music, sound effects, transition cues, or emphasis exist and how they relate to the narrative.
- **Why the current closure is insufficient:** carrier availability plus a technical stream/silence check cannot answer the semantic carrier question. `KU-26` correctly labels the content/function unknown, but this remains an uninspected available channel under the canonical GATE.
- **Required closure:** semantically inspect the full non-speech audio timeline, preserve independently inspectable evidence, and record bounded findings about music/effects and their narrative relationships. If no such elements are present, establish that through semantic inspection rather than subtitle or silence inference.

## Focus checks with no material discrepancy

- **212 records and bulk paste:** current evidence and `KU-07` distinguish the existing 212-record table and in-table paste from the narration's Excel-upload claim.
- **Local causality:** `KU-13` stays within the observed paste-success-processing-fields sequence and does not overextend it to source, accuracy, complete automation, or downstream execution.
- **`1.负责人`:** `KU-17` correctly treats it as a personal dynamic recipient, retains the blank group selector, and records the administrator/bot dependency.
- **`空值`:** `KU-14` preserves the visible missing-value category and keeps its cause and data-quality implications unresolved.
- **96%:** `KU-20`, `KU-21`, and `KU-29` preserve the claim as unverified, separate the adjacent sales template from proof, and expose the inconsistent/undefined arithmetic basis.

No candidate files were changed. This discrepancy report does not declare a downstream status.
