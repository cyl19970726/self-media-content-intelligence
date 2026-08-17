# Fresh independent evaluation v4

## Outcome

The narrow provenance blocker is closed, all hard GATEs pass, and JUDGE ran afterward.

Both separated-track AST results now declare `source: no-vocals-mono-16k.wav`. The coarse result additionally embeds the actual waveform SHA-256, and both separated AST file hashes exactly match the updated entries in `audio-non-speech.json`. The repair preserves 19 coarse windows, 47 fine windows, and full 0–93.601-second coverage.

## Narrow provenance verification

| Check | Observed | Result |
|---|---|---:|
| Coarse AST source | `no-vocals-mono-16k.wav` | PASS |
| Fine AST source | `no-vocals-mono-16k.wav` | PASS |
| Actual no-vocals WAV SHA-256 | `dac4eba26cc588bf7897c9c3d0ed1fb51c8246ee12de492506c1ddbb4db17632` | PASS |
| Coarse embedded source SHA-256 | matches actual WAV | PASS |
| Actual coarse AST SHA-256 | `9fe99a316000ad7baf06cd2c0f0545785bc7f31ffa323c3ae767a9e0322b071c` | PASS |
| Coarse ledger SHA-256 | matches actual result | PASS |
| Actual fine AST SHA-256 | `2c04be12544bd4304ff3e7e116656abdcebf33867f37e5cd3973fbdd0a3336cf` | PASS |
| Fine ledger SHA-256 | matches actual result | PASS |
| Coarse coverage | 19 windows, 0–93.601 seconds | PASS |
| Fine coverage | 47 windows, 0–93.601 seconds | PASS |

The two-ledger chain is now directly auditable: the separated outputs identify the separated waveform, while the semantic ledger identifies the exact output artifacts by hash. No inference from acoustic fingerprints is needed to repair the source identity.

## Canonical GATE results

| Gate | Result | Independent count / basis |
|---|---:|---|
| Critical-question recall | PASS | 14/14 |
| Evidence coverage | PASS | 22/22 core knowledge units |
| Unsupported inference | PASS | 0/28 positive unit statements |
| Timestamp accuracy | PASS | 29/29 primary localizations |
| Process-dependency completeness | PASS | 8/8 |
| Unknown discipline | PASS | 13/13 |
| Unchecked channels | PASS | 0 |
| Independent meta-gate | PASS | no unguarded carrier, meaning change, or relationship |

## JUDGE scores

| Dimension | Score | Rationale |
|---|---:|---|
| Readability | 5/5 | Claims, observations, limitations, and unknowns remain clearly separated. |
| Knowledge prioritization | 5/5 | Decision-critical workflow limits remain ahead of contextual audio packaging. |
| Evidence usefulness | 5/5 | The repaired source identities and matching hashes make the two-ledger evidence directly auditable. |
| Execution value | 5/5 | Demonstrated steps, configuration, execution proof, claims, and unknowns remain actionable and distinct. |
| Compression without loss | 4/5 | Detail is necessarily high because the video contains multiple UI, narration, arithmetic, and carrier conflicts. |

No candidate files were modified, and no downstream status is declared by this evaluation.
