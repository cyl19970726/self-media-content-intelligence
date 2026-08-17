# Candidate-to-ground-truth discrepancies

## Material discrepancies

| ID | Candidate | Ground truth / raw evidence | Gate impact |
|---|---|---|---|
| D-01 | Calls the demonstrated target “Word” throughout. | UI is WPS Writer. Narration uses “Word” generically, but Microsoft Word is not directly demonstrated. | Critical-question recall, evidence coverage, unsupported inference, unknown discipline, meta-gate |
| D-02 | Says filename and extension do not appear. | The WPS tab visibly reads `文字文稿(1).docx`. | Unsupported inference, meta-gate |
| D-03 | Describes the failure state as dense small text, weak hierarchy, and whitespace. | The decisive failure signature includes visible `###` and `**` Markdown traces. | Evidence coverage, meta-gate |
| D-04 | `article.md` says no failure comparison is shown. | The opening Markdown-marked WPS document and ending formatted WPS document form the video's explicit failure/result comparison. | Unsupported inference, meta-gate |
| D-05 | Omits the font-installation caveat. | The AI output visibly warns that 仿宋GB-2312 may need to be installed and may require a fallback. | Unknown discipline |
| D-06 | Six-step procedure puts the blank document switch after preview selection. | Edited visual order is HTML response → blank WPS document → back to HTML/run preview/select → back to WPS paste/result. | Process dependency completeness (one dependency missed) |
| D-07 | Preview window is cited through 24.4 seconds. | Raw targeted frames show stable selection through about 24.0 seconds and transition at 24.4 seconds. | Timestamp accuracy (one checked boundary miss) |
| D-08 | Carrier inventory omits the set/background as a semantic carrier. | Warm lamp, plants, blinds, monitor glow, desk lighting, and props establish the recurring creator-workspace/lifestyle frame. | Unchecked channels, meta-gate |

## Core evidence ledger

The evidence-coverage denominator is eleven deduplicated ground-truth core units.

| Core unit | Candidate status | Notes |
|---|---|---|
| Failure signature: Markdown residue and broken hierarchy | Not validly covered | Broad pain is captured; `###` and `**` are omitted. |
| Existing structured answer as input | Covered | Candidate identifies the Black Myth: Wukong answer and its role as input. |
| Exact HTML-formatting prompt and parameters | Covered | High-resolution frames and reviewed OCR support the values. |
| Generated HTML/CSS response and controls | Covered | Code block, copy control, and Run HTML control are captured. |
| Target application/document identity | Not validly covered | WPS Writer / `文字文稿(1).docx` is inverted into Word / “not shown.” |
| Rendered HTML preview | Covered | Candidate distinguishes preview from source code. |
| Selected rendered rich text | Covered | Blue selection is correctly identified as the copy source. |
| Paste-state handoff | Covered | Candidate preserves the unseen command/choice as unknown. |
| Final formatted result | Covered | Title, numbered sections, and clearer hierarchy are captured. |
| Single-example/generalizability boundary | Covered | Candidate correctly rejects universal success claims. |
| Non-speech-audio boundary | Covered | Candidate inspects audio and correctly abstains on faint/covered sounds. |

## Critical-question ledger

| Audit question | Status | Reason |
|---|---|---|
| Q-01 problem solved | Answered | Broad formatting-collapse problem is correctly recovered, though the Markdown signature is incomplete. |
| Q-02 tool/intermediate format | Answered | DeepSeek plus HTML/CSS is recovered. |
| Q-03 prompt contents | Answered | Required formatting parameters are recovered. |
| Q-04 source versus rendered copy | Answered | Correctly says rendered preview text. |
| Q-05 target application | Missed | WPS Writer / `.docx` is misidentified as Word and “not shown.” |
| Q-06 proof of success | Answered | Final formatted hierarchy and single-result limitation are described. |
| Q-07 visible limits | Answered | Candidate captures enough of the major limits to answer the question, despite omitting the font caveat. |

## Unsupported-claim ledger

The denominator is 55 distinct positive factual assertions normalized across `reconstruction.json` and `article.md`; repeated wording was deduplicated. Four are unsupported or contradicted:

1. The demonstrated application is Word.
2. The filename is not shown.
3. The extension is not shown.
4. The video does not show a failure comparison.

The resulting error rate is 4/55 (7.27%), above the 5% maximum.

## Raw-evidence correction to audit timing

The raw frames show that the selected HTML preview is still present at 24.0 seconds, a transition is underway at 24.4 seconds, WPS paste state is visible around 24.8–25.2 seconds, and formatted WPS content is visible by 25.6 seconds. Some broad ground-truth prose windows begin the formatted-result stage at 24.0 seconds even though its own cited `DENSE-0033` is still the selected preview. This audit-timing inconsistency was not charged against the candidate; timestamp scoring used raw evidence as the authority.

## JUDGE disposition

JUDGE was not run because the hard GATE failed. The schema-required numeric fields in `evaluation.json` are placeholders only, not quality scores.
