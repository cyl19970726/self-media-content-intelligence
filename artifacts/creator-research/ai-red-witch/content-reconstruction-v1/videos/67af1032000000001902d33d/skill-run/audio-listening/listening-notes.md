# Bounded non-speech-audio listening notes

Source scope: `67af1032000000001902d33d.mp4`, 0–26.733s. The five bounded playback files and hashes are recorded in `segment-manifest.json`.

## Inspection method

- Each bounded segment was played back as extracted source audio, once for the whole mix and once with attention directed away from the spoken narration toward music, UI sounds, inserted-clip sounds, transitions, and ending treatment.
- The full timeline was then checked across the four requested semantic regions: opening, UI demonstration, result samples, and closing. The earlier sample/capability section was kept as its own interval so no 5.433–13.667s opportunity window disappeared.
- Demucs two-stem separation and an AudioSet AST classifier were used only as corroboration. They consistently proposed `Music`/`Electronic music` for the non-vocal residual in every bounded region. They are not treated as a substitute for listening and do not establish source or licence.

## Region ledger

| Region | Range | Absent / constant / change | Listening observation | Boundary |
|---|---:|---|---|---|
| Opening | 0–5.433s | `constant` | A low electronic instrumental music bed is audible underneath the presenter. Non-speech audio is not absent. No separately identifiable sound belonging to the opening fire-character insert is heard with enough confidence to treat it as an inserted-source track. | Music is already present at the beginning and continues across the Ray2 naming beat. |
| Early samples / capability claim | 5.433–13.667s | `constant` | The same low electronic instrumental bed continues under narration and the sheep/cyclist/fish samples. No sample-specific animal, bicycle, water, or fish sound is confidently distinguishable. | No semantic audio switch at the visible sample changes. |
| UI demonstration | 13.667–20.967s | `constant` | The same background music continues under the upload/parameter narration. No distinct click, upload-complete tone, model-selection sound, submit sound, queue sound, or success tone is confidently audible. | The visual hard cuts are not paired with a clearly separate non-speech audio event. |
| Result montage | 20.967–25.500s | `constant` | The same music bed continues under the author’s continuity/physics claim. No clearly separable fire, surf, lightning, impact, weapon, or mechanical source audio is heard from the inserted clips. | Non-speech audio does not independently prove that the result clips carry their original sound or belong to the shown task. |
| Battle-to-presenter transition | 25.500–25.767s | `constant` | Music continues through the visual overlap/transition; no distinct stinger or transition hit is confidently identifiable. | Battle/composite remains visible into this interval. |
| Presenter return and confirmed close-up | 25.767–26.733s | `constant` | The low music bed continues under “朋友们快去玩儿吧”. No separate CTA chime or end-card sound is confidently audible in this bounded ending. | Battle insert is gone after the transition; use SHOT-011’s representative time, 26.217s, as the confirmed full creator close-up anchor. |

## Meaning-change decision

Non-speech audio is present and inspected, but it does not introduce a separately evidenced meaning change across opening → samples → UI → result montage → closing. Its observed role is a continuous pacing/energy bed under the narration. Visual insert boundaries and UI state changes are not accompanied by confidently distinguishable source audio or UI effects.

## Unknowns retained

- Track title, composer, performer, uploader, source library, ownership and licence.
- Whether the music was added by the creator, template, platform, or another editor.
- Whether any very low-level effect is masked by narration/music; absence statements above mean “not confidently audible in the bounded inspection,” not universal nonexistence.
- Whether inserted clips originally had audio before this edit.
