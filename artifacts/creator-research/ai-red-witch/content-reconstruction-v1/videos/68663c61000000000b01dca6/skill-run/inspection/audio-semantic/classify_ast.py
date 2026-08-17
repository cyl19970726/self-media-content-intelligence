import json
import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification


HERE = Path(__file__).resolve().parent
WAV = HERE / os.environ.get("AUDIO_WAV", "full-mono-16k.wav")
OUT = HERE / os.environ.get("AUDIO_OUT", "ast-window-classification.json")
MODEL_ID = "MIT/ast-finetuned-audioset-10-10-0.4593"
WINDOW_SECONDS = 10.0
HOP_SECONDS = 5.0
TOP_K = 15


rate, samples = wavfile.read(WAV)
if samples.ndim > 1:
    samples = samples.mean(axis=1)
samples = samples.astype(np.float32)
if np.issubdtype(samples.dtype, np.integer):
    samples /= np.iinfo(samples.dtype).max
else:
    scale = max(float(np.max(np.abs(samples))), 1.0)
    samples /= scale

duration = len(samples) / rate
extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
model = AutoModelForAudioClassification.from_pretrained(MODEL_ID)
model.eval()

windows = []
start = 0.0
while start < duration:
    end = min(start + WINDOW_SECONDS, duration)
    clip = samples[int(start * rate): int(end * rate)]
    inputs = extractor(clip, sampling_rate=rate, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits[0]
    scores = torch.sigmoid(logits)
    values, indices = torch.topk(scores, k=min(TOP_K, scores.numel()))
    labels = [
        {
            "label": model.config.id2label[int(index)],
            "score": round(float(value), 6),
        }
        for value, index in zip(values, indices)
    ]
    rms = float(np.sqrt(np.mean(np.square(clip)))) if len(clip) else 0.0
    peak = float(np.max(np.abs(clip))) if len(clip) else 0.0
    windows.append({
        "start": round(start, 3),
        "end": round(end, 3),
        "rms": round(rms, 6),
        "peak": round(peak, 6),
        "topLabels": labels,
    })
    start += HOP_SECONDS

result = {
    "schemaVersion": "audio-semantic-classification-1.0",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "source": WAV.name,
    "sourceSha256": hashlib.sha256(WAV.read_bytes()).hexdigest(),
    "sourceDurationSeconds": round(duration, 3),
    "sampleRate": rate,
    "channels": 1,
    "model": MODEL_ID,
    "modelLabelSpace": "AudioSet",
    "method": {
        "windowSeconds": WINDOW_SECONDS,
        "hopSeconds": HOP_SECONDS,
        "topK": TOP_K,
        "scoreTransform": "sigmoid(logits)",
        "coverage": "gap-free through overlapping windows from 0 to source end",
    },
    "limitations": [
        "Mixed-track classification does not isolate narration from background audio.",
        "Scores are model proposals, not human listening or source attribution.",
        "Absence from top labels does not prove that a sound is absent.",
        "The model cannot establish ownership, licensing, or original source.",
    ],
    "windows": windows,
}
OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"out": str(OUT), "windows": len(windows), "duration": duration}))
