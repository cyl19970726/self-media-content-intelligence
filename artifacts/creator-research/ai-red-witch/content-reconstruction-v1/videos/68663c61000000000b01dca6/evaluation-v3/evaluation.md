# Fresh independent evaluation v3

## Outcome

The content and unchecked-channel gates pass, but the hard independent meta-gate fails on one concrete provenance relationship. Both AST files presented as the Demucs non-vocal ledger contain `source: full-mono-16k.wav`, because their scripts hard-code that result field. The required relationship from `no-vocals-mono-16k.wav` to those classifications is therefore contradicted by the artifacts themselves.

Distinct waveform/result hashes, the reduced speech/RMS profile, and the first-window RMS fingerprint make separated input highly likely. They do not substitute for correct artifact-level source identity in an independently auditable two-ledger contract. JUDGE was not run; its numeric `1` values are schema-required sentinels rather than scores.

## GATE results

| Gate | Result | Independent count / basis |
|---|---:|---|
| Critical-question recall | PASS | 14/14, including the evaluator-added audio question |
| Evidence coverage | PASS | 22/22 core knowledge units |
| Unsupported inference | PASS | 0/28 positive unit statements |
| Timestamp accuracy | PASS | 29/29 primary localizations |
| Process-dependency completeness | PASS | 8/8 applicable dependencies or separations |
| Unknown discipline | PASS | 13/13 material unknown opportunities |
| Unchecked channels | PASS | 0 |
| Independent meta-gate | **FAIL** | separated-waveform-to-AST provenance relationship is contradicted |

## Semantic-audio verification

### Full duration and two ledgers

`AUDIO-NS-01` covers 0–93.601 seconds without gaps. It records two distinct waveform hashes: the original mixed-track analysis copy and the Demucs `htdemucs` two-stem non-vocal analysis copy. The mixed and separated AST outputs also have distinct hashes and materially different speech/RMS profiles.

The source-field defect in the separated AST JSON is independently diagnosable rather than silently accepted. For the first ten seconds, the mixed waveform and its ledger both give RMS approximately 0.246741 (-12.155 dB). The separated waveform measures -29.317 dB before the classifier script's documented global normalization; after the 4.454 dB normalization implied by its file peak, this is approximately -24.863 dB, matching the separated ledger's RMS 0.057130. That fingerprint strongly suggests the separate input, but the explicit source metadata still contradicts the required provenance relationship.

### 19 coarse windows and 47 fine windows

Both ledgers contain 19 overlapping coarse windows using 10-second windows and 5-second hops, starting at 0 and ending at 93.601 seconds. `Music` appears in all 19 mixed-track windows and ranks first in all 19 separated-track windows. This supports the bounded conclusion of a continuous background music bed.

Both ledgers also contain 47 overlapping fine windows using 4-second windows and 2-second hops. The separated fine ledger supplies the accepted transient clusters:

- 72–78 seconds: `Ding`, with weaker `Clang/Ping`, overlapping the notification card, group-reminder narration, and automation transition;
- 82–86 seconds: `Ding/Clang`, overlapping the ten-minute and 96% emphasis;
- 92–93.601 seconds: `Ding/Ping`, overlapping the final CTA and ending.

These are correctly described as chime-like effects or musical accents. The evidence does not distinguish independent sound effects from accents embedded in the music.

### Narrative role and abstention

`KU-26` and `REL-12` through `REL-15` accurately limit the audio's role to pacing, notification association, numerical emphasis, and closing punctuation. They explicitly refuse to treat sound packaging as proof that a message was delivered, automation completed, or the efficiency figures are true.

Unstable classifier suggestions—such as animal, bird, spray, mechanical, horn, and zipper labels—are rejected because they do not remain stable across tracks and windows. The reconstruction also keeps additional screen/location/inserted-source audio unknown rather than claiming it absent.

Track title, creator, source library, license, and ownership remain unknown. That is the correct decision boundary: acoustic classification cannot establish rights or attribution.

## Concrete blocker and closure

The blocker is limited to the two separated-track result files. Regenerate them so each result emits the actual selected input name (for example `WAV.name`) and preferably its SHA-256. The regenerated coarse result must still contain 19 gap-free windows and the regenerated fine result 47, both covering 0–93.601 seconds. Once the result metadata names and hashes `no-vocals-mono-16k.wav`, the two-ledger provenance relationship becomes directly auditable.

No additional open-ended investigation is required. JUDGE remains unrun until this hard meta-gate is closed.

No candidate files were modified, and no downstream status is declared by this evaluation.
