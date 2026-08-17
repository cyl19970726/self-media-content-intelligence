# Discrepancy closure — 67af1032000000001902d33d

## Closed: D-01 — non-speech audio semantic inspection

- Prior gap: `CAR-08` had been marked inspected from a spectrogram, which established energy but not music/effect semantics.
- Current evidence: five bounded playback files cover 0–26.733s without gaps; `segment-manifest.json` records source ranges and SHA-256 hashes, and every stored hash matches the current file. `listening-notes.md` makes a region-by-region `constant` decision for opening, early samples, UI, result montage/transition and closing.
- Candidate integration: the repair is carried into `probe.json`, `capture-protocol.json`, `KU-18`, `CQ-10`, `CAR-08`, DS-08/DS-09, `report.md` and the internal coverage/meta structures.
- Boundary discipline: track identity, author, source, ownership and licence remain unknown; no-effect observations are limited to “not confidently audible” in the bounded inspection.
- Gate impact: closed. `uncheckedChannels = []`; no audio carrier or audio meaning change remains unguarded.

## Closed: D-02 — closing visual boundary

- Prior gap: the candidate ended the battle montage at 25.267s and began a full presenter return too early.
- Current evidence: targeted frames show battle/composite imagery at 25.500s, overlap/transition through 25.767s, presenter-only after that point, and a conservative full close-up anchor at SHOT-011 / 26.217s.
- Candidate integration: the corrected boundary appears consistently in probe meaning changes, capture protocol, KU-11/KU-22, relations, cue accountability and `report.md`.
- Gate impact: closed. The 30 checked timestamp references are correct.

## Residual R-01 — stale targeted-frame count

- Severity: low; JUDGE precision/compression issue.
- Current fact: `targeted-evidence.json` contains 8 actions and 143 frames; OCR contains 143 processed frames, 0 failures and 330 line proposals.
- Candidate discrepancy: the final evidence index in `report.md` still says “132 帧定向证据”.
- Gate impact: none. The manifest itself is complete and all used references resolve.

## Residual R-02 — “four” versus three final result groups

- Severity: low; protocol/manifest label inconsistency.
- Audit and final reconstruction: the 20.967–25.500s montage is conservatively grouped into three units—fire-hand figure, beach anime figure, and white-haired-to-lightning/mechanical battle sequence.
- Candidate discrepancy: `ACT-05`'s `carrier` string says “four edited result clips”, while its own expected observation, `probe.json`, KU-11 and `report.md` all say three.
- Gate impact: none. Capture coverage and the final semantic grouping are correct; the stale label should be normalized to three.

## Residual R-03 — supporting aspect-ratio UI fact omitted from report

- Severity: low; supporting evidence omission, not a core-unit miss.
- Audit fact: the interface visibly lists 9:16, 3:4, 1:1, 4:3, 16:9 and 21:9, while the Keyframe panel indicates use of the attached media's aspect ratio; the example does not visibly show an active ratio selection.
- Candidate position: the report correctly records a later, continuity-uncertain `VIDEO · 16:9` empty state but does not retain the menu list or attached-media-ratio note.
- Gate impact: none. No false selected-ratio claim is made, and all independently defined core knowledge units remain covered.
