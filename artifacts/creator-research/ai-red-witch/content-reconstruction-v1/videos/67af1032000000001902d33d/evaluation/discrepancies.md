# Discrepancies — 67af1032000000001902d33d

## D-01 — Available non-speech audio was not semantically inspected

- Severity: hard-gate failure.
- Candidate position: `CAR-08` is marked available and inspected; `KU-18` says continuous audio energy exists but music/effects type, source, and role cannot be determined.
- Independent finding: the only cited source is `DS-03`, a spectrogram. A spectrogram can establish signal energy but cannot substitute for listening to the available channel. There is no listening-derived evidence for music, effects, inserted-source audio, or audio meaning changes.
- Gate impact: `uncheckedChannels = 1`; meta audit finds one unguarded carrier. JUDGE must not run.
- Required closure evidence: a bounded listening inspection of 0–26.733s that records whether non-speech audio is absent, constant, or changes across the opening, UI demonstration, result montage, and closing, while keeping source/license unknown unless actually shown.

## D-02 — Closing boundary is early by roughly 0.23–0.50 seconds

- Severity: timestamp discrepancy; does not independently fail the 0.90 timestamp threshold.
- Candidate position: the final montage ends at `25.267s`, and `25.267–26.733s` is described as the presenter returning full-screen for the CTA.
- Independent finding: SHOT-009 at `25.383s` and SHOT-010 at `25.633s` still show the battle sample/composite. The independent audit places GROUP-F through `25.500s`, followed by a transition, with the creator close-up in SHOT-011 at `26.217s`.
- Gate impact: two of 30 checked timestamp uses are incorrect; timestamp accuracy remains 28 / 30.
- Required correction: retain the battle insert through approximately `25.5s`, treat `25.5–25.767s` as the transition/overlap, and place the full creator close-up after that boundary.

## No discrepancy found in the main causal reconstruction

The candidate correctly rejects a task-level causal link between the dragon/warrior configuration and the later anime montage, correctly separates author claims from verified facts, and correctly scopes access, price, account, region, attribution, rights, responsibility, and performance limits as unknown within the inspected video.
