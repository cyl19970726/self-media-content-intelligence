# Discrepancies — 6832e96a000000002100405d

## D1 — Audio carrier is self-certified as inspected

**Severity:** hard-gate / meta-gate failure

- Candidate: `coverageMatrix.channels` marks `CAR-AUDIO` as `available: true, inspected: true`; `metaGate.pass` is true.
- Candidate elsewhere: KU-25 and the meta rationale say music, sound effects, insert audio, provenance and narrative role could not be identified; the only speech content used is the supplied SRT.
- Independent finding: source audio is available. Checking stream existence or reading SRT is not inspection of the actual spoken and non-speech audio carrier.
- Required correction: inspect the source audio directly, record what was checked and update the audio units; otherwise mark `CAR-AUDIO` unchecked and keep the meta-gate failed.

## D2 — Reuse unknowns do not close into a reuse disposition

**Severity:** evidence-coverage and critical-question miss

- Candidate: notes missing person/material authorization and unknown audio rights.
- Independent audit: reuse clearance is not established. By default, only high-level editorial structure and generic visual functions can be reconstructed; embedded third-party footage, identities, brand cases, figures and commercial-availability language cannot be treated as cleared. Minimum conditions include traceable provenance, rights scope, likeness/voice/model releases, brand/platform-UI clearance, dated substantiation and current-price checks.
- Discrepancy: listing unknown rights is not equivalent to answering what can be reused or stating the conditions that govern reuse.
- Required correction: add a bounded reuse section that separates reconstructable editorial function from non-cleared assets/claims and states the minimum clearance checklist.

## D3 — Exact conference identity loses its qualifier

**Severity:** unsupported inference / unknown-discipline miss

- Candidate: calls the setting “京东云大会” in the report and labels KU-03 as a visual observation.
- Independent audit: JD/JD Cloud-branded event or exhibition context is visually supported; exact conference identity is only asserted by the author and lacks credentials, date or independent authentication.
- Required correction: write “作者称其刚参加京东云大会；画面可确认京东/JD Cloud 相关会展语境，但不能独立认证具体大会身份.”

## D4 — Candidate meta-gate cannot prove its own completeness

**Severity:** meta-gate failure

- Candidate: `metaGate.pass=true` on the basis of its own coverage inventory.
- Independent meta audit: D1 leaves an available carrier uninspected; D2 leaves the rights/provenance → reuse-decision relationship unclosed; D3 loses a consequential qualifier.
- Required correction: keep the candidate's internal meta statement as a self-audit only. An independent meta auditor must determine the protocol-level pass/fail.

## Preserved strengths

These are not discrepancies and should remain intact in any revision:

- Do not infer real/digital identity from participant appearance.
- Do not infer live generation or interaction from a two-person layout.
- Do not infer exact lip synchronization from changing mouth shapes in a narrated edit.
- Keep commercial figures, deployment counts, “industry first,” subjective naturalness and sales causality as author claims without primary substantiation.
- Preserve CUE-017 verbatim while separately recording the burned-caption reading “高商业可用.”
- Keep negative evidence bounded to the inspected timeline and relevant carriers, with unreadable UI text left unknown.
