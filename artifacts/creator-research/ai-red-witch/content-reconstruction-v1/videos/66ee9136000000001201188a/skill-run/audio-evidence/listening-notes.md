# Full-source audio listening notes

Scope: decoded source audio from 0.000 to 18.137 seconds, no gaps.

Method: machine listening with `MIT/ast-finetuned-audioset-10-10-0.4593` over the original mono full mix in 2-second windows with 1-second stride, plus four semantic-region auditions and an L–R center-cancelled residual as supplementary evidence. Raw probabilities and signal features are preserved in `machine-listening-raw.json`; accepted bounded observations are in `listening-segments.json`.

This is listening-derived evidence because the pretrained audio event model ingested the decoded waveform. It is not human auditory perception. Ambiguous AudioSet labels are not promoted to literal event identities.

## 0.000–9.100 — opening comparisons

- Narration: present.
- Music: present across all opening windows. The full region ranks `Music` behind `Speech`; the center-cancelled residual ranks `Music` first.
- Short effects: intermittent effect-like/percussive candidates occur. The 0–2 second residual includes generic `Sound effect` and low-confidence `Whoosh/swoosh/swish`; 4–6 seconds includes low-confidence `Ding/Ping`. These names are not accepted literally because they may be music percussion.
- Result-clip own sound: not applicable before the result.
- Boundary: music remains detected across the 9.1-second visual/UI transition; an effect-like candidate overlaps 8–10 seconds.

## 9.100–13.350 — input, queue and prompt

- Narration: present.
- Music: still present, with lower center-cancelled residual RMS than the opening.
- Short effects: generic `Sound effect` rises in the residual across the 9–12 second windows. Exact separate SFX versus musical percussion remains unknown.
- Result-clip own sound: not applicable before the result.
- Boundary: no music stop is detected at the result reveal.

## 13.350–16.150 — result reveal and result pane

- Narration: present.
- Music: present; this region has the lowest residual RMS of the four, so the bed/effect energy changes rather than staying level-constant.
- Short effects: a generic effect-like/percussive candidate remains, especially in the 14–16 second residual. Literal `keyboard/typing` classifier labels are rejected as uncorroborated timbre guesses.
- Result-clip own sound: no new audio source can be independently attributed to the displayed CG clip. Because narration/music continue and `Lip Sync` is visible but not applied on screen, the result file's own audio is unknown, not absent.

## 16.150–18.137 — result playback and closing CTA

- Narration: present.
- Music: present through the decoded endpoint; residual music energy rises relative to the result-reveal region.
- Short effects: intermittent generic effect-like/percussive candidates remain; exact identity is unknown.
- Result-clip own sound: still not independently attributable under the closing narration and music. Availability, content and lip-sync quality remain unknown.

## Accepted cross-segment conclusions

- Music: `present across all four regions with level/energy change`; not proven sample-continuous or from one track.
- Short effects: `intermittent/change`, not constant and not confidently nameable.
- Displayed result clip's own sound: `unknown, not separately attributable`; do not state absent or present.
- No claim is made about ownership, exact music style, literal SFX identity, or result audio usability.
