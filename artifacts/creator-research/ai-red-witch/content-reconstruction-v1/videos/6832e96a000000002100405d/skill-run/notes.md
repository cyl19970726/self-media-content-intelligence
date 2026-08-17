# Skill-run revision notes

## Scope

This revision only changes this video's `skill-run`. Audit/evaluation files were read only where explicitly requested (`evaluation/discrepancies.md`) and were not modified. No READY status is asserted.

## D1 — Full source-audio inspection

- Extracted the original MP4 audio to `audio-evidence/source-audio.wav`: 16 kHz mono PCM, 83.220313 seconds.
- Ran Whisper small over the complete mix with word timestamps. It identified one continuous Mandarin narration track from 0 to 83.02 seconds, with a 48.66–53.48 second ASR gap.
- Re-ran source audio 45–57 seconds with Whisper medium. It recovered the narration corresponding to the provided SRT's sports-pants mixing, different looks and easy-to-wear lines; the small-model gap was an ASR miss, not a demonstrated narration break.
- Ran MIT AST AudioSet classification over consecutive 5-second windows and 2-second event-review windows. Speech and Music were principal candidates throughout. The final 80–83.220313-second window additionally produced the clearest Ding/Ping-style transient candidate.
- Checked 5-second mixed-track RMS/peaks. RMS varied from about -14.37 to -11.59 dBFS, with a relative dip around 45–55 seconds; this is not used to infer track identity.
- Bounded conclusion: continuous narration and a persistent background-music bed are supported; a closing transient sound-effect candidate is supported; no stable second intelligible dialogue was detected. Same-track continuity, seamless music changes, faint/masked inserted source audio, exact sound identity, provenance and rights remain unknown.
- Registered evidence: `SRC-AUDIO-WAV`, `SRC-AUDIO-ASR`, `SRC-AUDIO-SEGMENT`, `SRC-AUDIO-INSPECTION`.

## D2 — Bounded reuse disposition

Reusable without copying concrete expression:

- high-level hook → source-context → capability ladder → case-example → viewer-decision structure;
- generic functions such as co-presence demonstration, outfit-motion demonstration, evidence/claim separation and question-led close.

Not cleared by this video:

- embedded livestream, conference/exhibition and promotional footage;
- persons, likenesses, voices and digital-human models;
- Anta/Balabala names, logos, cases and platform UI;
- brand count, sales value, livestream-room count and GMV figures;
- “industry first,” “high commercial usability,” naturalness and sales-effect language;
- music, sound effects and any inserted source audio.

Minimum conditions before direct reuse:

1. traceable provenance;
2. rights scope covering commercial use, derivatives, platform, territory and duration;
3. likeness/voice/model releases;
4. brand, trademark and platform-UI clearance;
5. written brand-case approval;
6. dated substantiation with definitions and responsible entity for commercial figures/claims;
7. current price/discount verification;
8. music, sound-effect and inserted-audio licensing.

If a relevant condition is not closed, only the abstract editorial/function layer is reusable.

## D3 — Conference identity qualifier

- Author claim: the narrator says they had just attended “京东云大会” (`CUE-001`).
- Visual observation: frames support a JD/JD Cloud-related event/exhibition context, including a zero-code challenge screen and digital-human display screens (`TARGET-0006`, `TARGET-0008`).
- Not established: exact conference identity, official name, date, credential or independent authentication.

## D4 — Meta authority

`reconstruction.json.metaGate` is retained because the schema and deterministic validator require the canonical internal field. After the read-only `evaluation-v2` independent meta audit confirmed that no carrier, meaning change, or relationship remains unguarded, the internal state is aligned to `pass: true` with all three exception arrays empty. This records the independently closed coverage state; it does not let the candidate prove its own completeness and is not a READY announcement.
