# Reconstruction notes

## Non-speech audio repair

The prior reconstruction registered the AAC stream but did not actually inspect its non-speech content. This repair closes that gap with source-audio evidence, not frames or subtitles.

### Bounded source artifacts

- `AR-SOURCE-01`: `audio-review/source-audio.m4a`, an AAC stream-copy of the MP4 audio, 48.653991 seconds, 44.1 kHz stereo.
- `AR-SEG-01`: 0.000—6.720, opening promise and initial result montage.
- `AR-SEG-02`: 6.720—15.520, quality claims and simple/free transition.
- `AR-SEG-03`: 15.520—25.680, tool entry, interface and prompt input.
- `AR-SEG-04`: 25.680—36.320, loading, result, adjustment and Logo transition.
- `AR-SEG-05`: 36.320—48.667, templates, broad claim, job-risk close and CTA.

The five segments are gap-free and cover the full source timeline. Each is stored as a compressed review copy and 16 kHz mono PCM analysis copy under `audio-review/segments/`.

### Actual audio inspection

Decoded waveform content was analyzed in overlapping bounded windows with two independent event classifiers:

- MIT AST AudioSet, 4-second windows with 2-second hop;
- Apple `SNClassifySoundRequest.version1`, 2-second windows with 1-second hop.

An independent signal scan used `silencedetect` at −50 dB for at least 0.10 seconds. It found no such silence from 0.000 through 48.470635 seconds, followed by a 0.208118-second silent tail.

### Findings

- Opening, 0.000—6.720: speech plus a broadly continuous background-music bed. No distinct one-shot effect is reliably established.
- Quality/tutorial promise, 6.720—15.520: music continues strongly under speech. Short transition/percussive proposals emerge near the end, but precise identity is unknown.
- Interface/prompt, 15.520—25.680: the audio bed changes. Music remains at entry but becomes much less dominant; both classifiers propose typing/typewriter/click-like or camera-like transients around approximately 17—22 seconds. Because exact labels disagree, only the broader UI/percussive transient description is accepted.
- Result/adjustment, 25.680—36.320: music is detected again throughout with changing prominence. No unique result chime or export sound is reliably separated.
- Closing, 36.320—48.667: music is sustained under speech, especially around 38.320—44.320, and continues through the CTA before the final ~0.2-second silent tail.

### Boundaries

The source video does not identify the music title, performer, composer, source library, owner, license or authorization. It also does not establish whether short transients are separate UI effects, edit accents, part of the music, or environmental sounds. Those fields remain unknown.

The source MP4 has no `creation_time` in its container or stream metadata. The actual recording date, platform publication date, interface run date, and whether the interface is contemporaneous or a historical/replayed screen capture remain unknown. Dates printed inside prompts or posters and the evidence pack's `generatedAt` are content/processing fields, not recording-date evidence.

Canonical structured evidence is in `audio-review/audio-review.json`. Reconstruction source reference: `DS-04`.
