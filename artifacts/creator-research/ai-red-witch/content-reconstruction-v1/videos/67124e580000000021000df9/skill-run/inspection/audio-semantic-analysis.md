# Final-audio semantic inspection

## Exact source inspected

- File: `inspection/final-audio.mp3`
- SHA-256: `74f835528e90df17e27f741d220d920417ed35df198b1df590a88109383afb3a`
- Duration: `7.500s`
- Size: `116,567 bytes`
- Extraction mapping: source video `51.500–59.000s`; therefore classifier time `t` maps to video time `51.500 + t`.

## Method

- macOS SoundAnalysis built-in classifier `.version1`.
- Window duration `0.500s`, overlap `0.5`, giving a decision every `0.250s` across the complete 7.5-second file.
- Full-window inspection, not a volume-only test. The classifier was queried for its top labels and all water/liquid/faucet/sink/stream/rain/ocean/wave-family labels.
- Script: `inspection/sound-classify.swift`.

## Semantic results

1. **Speech:** classifier time `0.000–1.000s` (video approximately `51.500–52.500s`) is dominated by `speech` (`0.77–0.91`) while music is also present. This matches the narrator's transition into the result excerpt.
2. **Music:** `music` is present in every post-speech analysis window through the end, normally around `0.48–0.84`. Piano/keyboard/plucked-string/percussion-family labels recur. The final excerpt therefore does contain a continuous musical bed; the file does not establish the track's title, creator, license, or whether this is the exact asset whose edit control shows `-1.8 dB`.
3. **Bird calls:** high-confidence `bird_chirp_tweet` / `bird_vocalization` / `bird` clusters occur at classifier times approximately `1.500–2.500s`, `4.500–5.500s`, and `6.750–7.250s`, mapping to video approximately `53.000–54.000s`, `56.000–57.000s`, and `58.250–58.750s`. Peak bird-chirp confidence is about `0.96`. Bird-call audio is therefore semantically supported in the actual final-audio, not merely by timeline labels.
4. **Water / running-water sound:** water-family labels are low and inconsistent, never the dominant class, and do not form a stable high-confidence cluster. The largest generic `water` confidence is about `0.124`; faucet/sink/stream/waterfall labels stay much lower than the simultaneous music/bird labels. This pass cannot confirm a distinct running-water or brushing-water layer, nor can it prove universal absence beneath the mix.
5. **Other sounds:** several isolated windows receive high but unstable `frog`, `dog`, `train`, or `telephone` labels. These labels do not persist coherently across neighboring windows and often co-occur with confident music/bird predictions. They are treated as classifier ambiguity rather than established additional sound events.

## Boundary

This is machine semantic classification of the exact complete 7.5-second `final-audio.mp3`; it is stronger than a signal/volume check but is not source separation. It supports **speech + continuous music + repeated bird calls**. It leaves **running water unconfirmed** and does not assign ownership, licensing, track identity, or mix provenance.
