# Non-speech audio review

Scope: `0.000–162.752s`, the complete decoded AAC track.

Method:

- decoded the whole track to 16 kHz mono PCM;
- ran MIT AST/AudioSet classification on 33 overlapping 10-second windows starting every 5 seconds;
- ran `ffmpeg silencedetect` at `-42 dB` for gaps of at least `0.25s` plus `astats`;
- generated and visually inspected a full-timeline spectrogram.

Observed:

- all 33 windows classified both `Music` and `Speech` among the two dominant labels;
- `Music` was the highest-scoring label in 29 of 33 windows, with `Speech` highest in four;
- no silence interval met the configured `-42 dB / 0.25s` threshold;
- the spectrogram shows continuous energy across the timeline rather than a bounded isolated insert.

Supported reconstruction: a continuous background-music bed overlaps the narration across the video. No discrete sound effect or music change was reliably established as a meaning-changing event.

Tool boundary: the executing model cannot directly consume the local audio as a human perceptual input. This is a full machine-acoustic inspection, not a claim of human listening. AudioSet labels and spectrum continuity do not establish the exact track, genre, hidden low-level effects, emotional function, or editorial intent; those remain unknown.
