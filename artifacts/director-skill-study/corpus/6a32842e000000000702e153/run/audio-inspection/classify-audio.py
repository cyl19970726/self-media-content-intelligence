import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from transformers import pipeline

HERE = Path(__file__).resolve().parent
rate, audio = wavfile.read(HERE / "full-audio-review.wav")
if audio.ndim > 1:
    audio = audio.mean(axis=1)
audio = audio.astype(np.float32)
peak = float(np.max(np.abs(audio))) or 1.0
audio /= peak

classifier = pipeline(
    "audio-classification",
    model="MIT/ast-finetuned-audioset-10-10-0.4593",
    top_k=10,
)

duration = len(audio) / rate
windows = []
start = 0.0
while start < duration:
    end = min(duration, start + 10.0)
    segment = audio[int(start * rate):int(end * rate)]
    predictions = classifier({"array": segment, "sampling_rate": rate})
    windows.append({
        "start": round(start, 3),
        "end": round(end, 3),
        "predictions": [
            {"label": row["label"], "score": round(float(row["score"]), 6)}
            for row in predictions
        ],
    })
    start += 5.0

output = {
    "method": "MIT AST AudioSet classifier on overlapping 10-second windows every 5 seconds",
    "source": "full-audio-review.wav",
    "sampleRate": rate,
    "duration": round(duration, 3),
    "modelLimitations": [
        "Automated acoustic labels are proposals and are not equivalent to human perceptual listening.",
        "Speech and background music may overlap; AudioSet labels do not establish editorial intent.",
        "The executing model cannot directly consume local audio as a perceptual input, so findings are limited to decoded waveform, silence analysis, spectrogram inspection and classifier proposals.",
    ],
    "windows": windows,
}
(HERE / "audio-classification.json").write_text(
    json.dumps(output, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps({"duration": output["duration"], "windows": len(windows)}, ensure_ascii=False))
