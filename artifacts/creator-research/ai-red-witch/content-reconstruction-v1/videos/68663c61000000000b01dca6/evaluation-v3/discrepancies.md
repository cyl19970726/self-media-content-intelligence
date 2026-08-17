# Fresh evaluation-v3 discrepancies

This evaluation used only the current audit, evidence, skill-run artifacts, and canonical evaluation protocol/schema. Earlier evaluation and discrepancy outputs were excluded.

## Hard-gate discrepancy

### V3-01 — Separated-track AST files contain an incorrect literal source filename

- **Severity:** independent meta-gate failure
- **Affected files:** `ast-no-vocals-window-classification.json`, `ast-no-vocals-fine-classification.json`, `classify_ast.py`, `classify_ast_fine.py`
- **Observed state:** the two separated-track result files say `source: full-mono-16k.wav` because both scripts hard-code that result field, even when their input is selected through `AUDIO_WAV`.
- **Independent verification:** the mixed and separated WAV files have different hashes; all four AST result files have different hashes; the separated outputs have substantially lower speech/RMS characteristics; and the separated first-window RMS exactly matches the normalized `no-vocals-mono-16k.wav` waveform rather than the mixed waveform.
- **Impact:** the semantic carrier itself is inspected, but the required separated-waveform-to-classification provenance relationship is not independently closed. Acoustic fingerprints make the intended lineage likely but cannot override the files' explicit, contradictory source identity.
- **Required correction:** emit `WAV.name` and preferably the selected input SHA-256 into each AST result, then regenerate only the two separated-track classification files. Preserve 19 coarse and 47 fine gap-free windows over 0–93.601 seconds. No wider investigation is required.

## Audio hard-gate checks with no material discrepancy

- Full semantic coverage spans 0–93.601 seconds without gaps.
- Both mixed and separated ledgers have 19 coarse windows and 47 fine windows.
- `Music` is present in all mixed coarse windows and ranks first in all separated coarse windows, supporting a continuous music bed.
- Three bounded transient groups are supported at 72–78, 82–86, and 92–93.601 seconds.
- Their role is limited to notification association, emphasis, and closing punctuation; they are not treated as execution evidence.
- Independent-effect versus musical-accent attribution remains unknown.
- Additional source/screen/location audio remains unknown rather than asserted absent.
- Music/effect title, author, library, license, and ownership remain unknown.

No candidate files were changed. This discrepancy report does not declare a downstream status.
