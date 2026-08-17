# Reconstruction discrepancies

Status: **NOT_READY**

| ID | Severity | Audit target | Candidate location | Discrepancy | Required repair |
|---|---|---|---|---|---|
| D-001 | hard-gate | `CAR-09`, `UO-015`, meta-gate | probe `CAR-08`; reconstruction `KU-29`, `coverageMatrix.channels`, `metaGate` | An AAC track exists, but no full auditory pass inspected music/effects. The candidate correctly says their role is unknown, then incorrectly marks the carrier inspected and the meta-gate passed. | Perform a full-timeline auditory review and document music/effect intervals and function, or leave the carrier unchecked and keep meta-gate failed. Unknown is not equivalent to inspected. |
| D-002 | factual evidence reading | `CC-005`, `UO-004` | `KU-13`, `Q-04`, article | Burned caption is `fjj`; candidate states `flj`. | Correct the literal caption reading to `fjj`; keep its expansion, identity, incident and truth unknown. Re-check the cited source frame, not OCR alone. |
| D-003 | factual evidence reading | `CC-008`, `KU-021`, `CQ-011` | `KU-19`, relation evidence, article | Burned caption is `于瀚`; candidate states `于灏`. | Correct to visible text `于瀚`, retain SRT `宇浩` as the conflicting raw form, and keep external spelling/identity unknown. |
| D-004 | coverage gap | `KU-001`, `CQ-014`, `OP-001`–`OP-003` | `KU-01`, `KU-02` | Opening metrics and the spoken 30k/three-day claim are present, but the visible Xiaohongshu profile labeled `人类最强编导` with approximately 30k followers is not clearly reconstructed as a bounded result-state observation. | Add an atomic visual-observation unit for the profile state and explicitly separate what it shows from the unproven three-day interval, ownership, authenticity and causality. |
| D-005 | relationship gap | `REL-022`, `OC-REL-003`, `ABS-007` | relations around `KU-30` | The candidate describes closing echo/payoff but does not explicitly preserve that the closing does **not** re-show or validate the opening three-day/30k result. | Add the bounded closing-to-opening no-payoff relation using the audited closing interval and relevant cue/shot/dense-frame scope. |
| D-006 | hard-gate | available-carrier closure | probe `CAR-02`, `CAR-03`, `CAR-05` | Burned captions/overlays, opening screenshots and whiteboard are available but remain `inspected:false` in the probe, even though later protocol outputs attempt to inspect them. | Reconcile the completed reviews back into probe closure with traceable evidence; do not leave available carriers unchecked. |

No substantive JUDGE was performed because D-001 and D-006 make the hard GATE fail. D-002 and D-003 also push unsupported positive claims above the 5% threshold under the stated 30-unit claim denominator.
