# Discrepancies: independent audit vs skill-run candidate

Only the fresh evidence, independent audit, and current skill-run candidate were compared.

| Severity | Topic | Independent audit | Candidate | Evaluation impact |
|---|---|---|---|---|
| Critical | Queue microcopy | At about 9.25 seconds the panel says `In queue` and `Your video is in queue and will start in a few minutes.` | Captures `In queue` but says the subline is not fully readable and omits it from the report. | Loses the strongest literal counter-evidence to the one-minute headline; fails recall, coverage, unchecked-carrier, and meta gates. |
| Critical | Headline-to-UI relationship | `1分钟做科幻大片` is in direct tension with a status saying execution will start in a few minutes. | Correctly says one minute is unproven but only reasons from missing timing and existing queue state. | The conclusion is directionally right, but a decisive evidence relationship is absent. |
| Major | Result audio | Whether the displayed result contains usable audio is unknown. | KU-17 discusses the whole post's audio carrier and unidentified music/effects, not the result's own audio. | Missed unknown opportunity and delivery dependency. |
| Major | Lip Sync | `Lip Sync` is visibly available in the result pane; whether it was applied is unknown. | Does not record the control or the application unknown. | Missed visible carrier, critical question, unknown opportunity, and process branch. |
| Major | Live versus staged UI | It is unknown whether the shown interface is a live session or a prerecorded/staged display. | Questions same-operation causality but does not explicitly preserve live-versus-staged status. | Unknown-discipline deduction. |
| Major | Model-selection dependency | `Gen-3 Alpha` is visible on the result pane, but model selection is not shown. | Records the visible model label and general missing settings, but does not explicitly state that selecting the model was not shown. | Process-dependency deduction. |
| Moderate | Audio channel layout | Fresh evidence and audit establish audio presence and AAC. | KU-17 upgrades this to an AAC stereo track. | Unsupported positive claim; cited sources do not establish stereo. |
| Moderate | Silence analysis | No silence-analysis artifact is cited in the candidate's evidence list. | KU-17 says a tool check found no significant silence under its threshold. | Unsupported positive claim; DS-TARGET is visual-only. |
| Strength | Product identity | Spoken/on-screen context supports Runway, while UI authentication remains limited. | Separates author-stated Runway from UI-visible Gen-3 Alpha and does not invent a precise version. | Correct; no discrepancy penalty. |
| Strength | Edited chronology | The video shows edited states, not a continuous dependency chain. | Explicitly distinguishes edited order from execution/dependency order. | Correct and decision-useful. |
| Strength | Negative-evidence scope | Missing actions are claims about the inspected 0–18.133-second video, not about the product's capabilities. | Most negative claims are bounded to the inspected time range and carriers. | Correct unknown discipline for upload, typing, generation, timing, export, and CTA terms. |

## Required correction scope indicated by the discrepancies

This document does not modify the candidate. The evidence gap is narrow but consequential: preserve the full queue message and relate it directly to the one-minute headline; add the visible `Lip Sync` control and result-audio/application unknowns; state that model selection is not shown; remove or properly evidence `stereo` and the silence-analysis assertion; and make the live-versus-staged UI boundary explicit.
