# Skill-run repair notes

Source of requested repairs: `evaluation/discrepancies.md`. This file records candidate-side evidence corrections only; it is not an evaluation or readiness gate.

## Benchmark corrections

- The 72B table is kept separate from the small-model table.
  - 72B columns: Qwen2-72B-Instruct / Llama3-70B-Instruct / Qwen1.5-72B-Chat.
  - Small-model columns: Qwen2-7B-Instruct / Llama3-8B-Instruct / GLM4-9B-Chat.
- Two visible direct counterexamples to “全面碾压” are now explicit:
  - MBPP: 80.2 / 82.3 / 71.9, so Llama3-70B-Instruct is higher than Qwen2-72B-Instruct.
  - GSM8K: 91.1 / 93.0 / 82.7, so Llama3-70B-Instruct is higher than Qwen2-72B-Instruct.
- The audit-side HumanEval 82.2 reading was rejected after checking the clear frame/crop:
  - Small-model HumanEval is 79.9 / 62.2 / 71.8.
  - 82.3 belongs to the upper 72B table's MBPP row, not HumanEval.
- Registered visual evidence:
  - `inspection/benchmark-72b-30.4.png`
  - `inspection/benchmark-7b-31.2.png`
  - `TARGET-0106`, `TARGET-0107` and checked OCR rows.

## Qwen2 family-scope correction

- The 16.5-second family page explicitly lists five sizes: 0.5B, 1.5B, 7B, 57B-A14B, 72B.
- The later specification card shows only four columns: 0.5B, 1.5B, 7B, 72B.
- Both scopes are preserved. The video does not explain why 57B-A14B is omitted from the later card, so the four-column card is not used to erase the five-size family listing or assign specifications to 57B-A14B.
- Registered evidence: `inspection/family-five-sizes-16.5.png`, `TARGET-0105`, `OCR-01822`–`OCR-01824`.

## Bounded non-speech audio inspection

- Amplitude-only silence detection was retained only for its valid claim: silence begins at about 63.689 seconds under the stated -45 dB threshold.
- A separate AudioSet semantic pass was run over contiguous bounded windows using `MIT/ast-finetuned-audioset-10-10-0.4593`:
  - 0–63.7 seconds: Music is a top-two label in every coarse window, supporting a recurrent background-music bed beneath narration.
  - 22–24 seconds: Ding is localized in a 2-second followup window and accepted as a brief transition/emphasis accent.
  - 63.7–86.567 seconds: Silence dominates and agrees with the amplitude boundary.
- Low or unstable camera/gunshot/chopping labels were rejected and not converted into literal events.
- Exact music genre, track identity, ownership, mix provenance, and effect source remain unknown.
- Registered evidence: `inspection/audio-semantic-listen.json` and `inspection/audio-silence-inspection.txt`.
- This is explicitly machine semantic listening, not human auditory confirmation.

## Files synchronized

- `probe.json`
- `capture-protocol.json`
- `targeted-evidence/targeted-evidence.json`
- `targeted-evidence/ocr-evidence.json`
- `reconstruction.json`
- `report.md`

No `audit/` or `evaluation/` file was modified, and no READY status is asserted.
