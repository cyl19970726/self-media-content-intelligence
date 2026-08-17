# Known limitations

- The bundled OCR pass uses macOS Vision. Other operating systems need an equivalent OCR adapter that preserves frame IDs, times, confidence, bounding boxes, and review status.
- OCR is a proposal, not ground truth. Small text, stylized fonts, low-resolution embedded screens, mixed languages, and brand fragments require visual review, cropping/resampling, or an explicit unknown.
- Supplied subtitles may contain ASR errors. The Skill preserves the verbatim source cue and separately records conflicts with burned captions, UI/whiteboard text, or audible speech; it does not silently rewrite the source transcript.
- Non-speech audio may be detectable without being semantically identifiable. Music, sound-effect, inserted-source, ownership, and narrative-role fields may correctly remain unknown.
- A frame sequence cannot always prove a continuous live operation. Hard cuts, hidden edits, missing clicks, network calls, file handoffs, model settings, and off-screen actions must remain unknown unless evidenced.
- Scene-detection shots are technical observation segments, not proof of semantic scenes or edit count.
- Evidence capture is bounded by default to 120 frames per action and 600 per protocol. Very long, fast, or text-dense videos may require justified action splitting, higher-resolution crops, or a raised cap.
- A validated reconstruction reports what the video contains. It does not externally verify prices, laws, medical claims, product performance, platform rules, identity, authorization, licensing, training data, security, causality, or success rates.
- Negative evidence is scope-bound. “Not observed in the inspected timeline” is valid; universal nonexistence is not.
- The method reduces omission risk but cannot prove metaphysical completeness. The meta-gate asks whether an entire carrier, meaning change, or relationship escaped inspection and must be independently audited.
- Human-readable articles remain compressions. Downstream editors should use `reconstruction.json`, evidence references, and unresolved items when precision matters.
