# Discrepancies

1. **Question 10 carrier conflict — hard inference/unknown failure.** Audit CC-05 says the printed question shows `AI短片、[blank]和微纪录片`; the noisy SRT must not be converted into a fact. Candidate `KU-Q10` asserts `AI短片、纪录片和人间观察`.

2. **Closing identity inversion — hard inference/critical-question defect.** `CUE-069` says `我是雷自强编导`; `人类最强编导` is a visible account/document label. Candidate `KU-CLOSE` says the speaker signs off as `人类最强编导`.

3. **Opening carrier omitted — meta-gate failure.** The audit isolates a blurred inserted visual and burned caption `开头展示教程` at 0.000–1.133 s. Candidate `KU-SETUP` collapses the interval into the exam introduction and never preserves the insert's source/ownership unknown.

4. **Internal completeness claim contradicted.** Candidate `metaGate.pass=true` states that all editing and ownership boundaries were covered, but the independent audit identifies the omitted opening insert and the unsafe sign-off/account-label relation.

These discrepancies are reported only; the candidate run was not modified.
