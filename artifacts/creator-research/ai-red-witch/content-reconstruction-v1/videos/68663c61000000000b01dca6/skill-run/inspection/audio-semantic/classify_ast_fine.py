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
OUT = HERE / os.environ.get("AUDIO_OUT", "ast-fine-classification.json")
MODEL_ID = "MIT/ast-finetuned-audioset-10-10-0.4593"

rate, samples = wavfile.read(WAV)
samples = samples.astype(np.float32)
samples /= max(float(np.max(np.abs(samples))), 1.0)
duration = len(samples) / rate
extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
model = AutoModelForAudioClassification.from_pretrained(MODEL_ID)
model.eval()

windows = []
for start in np.arange(0.0, duration, 2.0):
    end = min(float(start + 4.0), duration)
    clip = samples[int(start * rate): int(end * rate)]
    inputs = extractor(clip, sampling_rate=rate, return_tensors="pt")
    with torch.no_grad():
        scores = torch.sigmoid(model(**inputs).logits[0])
    values, indices = torch.topk(scores, k=12)
    windows.append({
        "start": round(float(start), 3),
        "end": round(end, 3),
        "topLabels": [
            {"label": model.config.id2label[int(i)], "score": round(float(v), 6)}
            for v, i in zip(values, indices)
        ],
    })

OUT.write_text(json.dumps({
    "schemaVersion": "audio-semantic-classification-1.0",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "source": WAV.name,
    "sourceSha256": hashlib.sha256(WAV.read_bytes()).hexdigest(),
    "sourceDurationSeconds": round(duration, 3),
    "model": MODEL_ID,
    "modelLabelSpace": "AudioSet",
    "method": {"windowSeconds": 4.0, "hopSeconds": 2.0, "topK": 12, "scoreTransform": "sigmoid(logits)", "coverage": "gap-free overlapping windows"},
    "limitations": ["Mixed-track classifier proposals only; no source separation or ownership inference.", "Short-window inputs are padded by the feature extractor and may produce false-positive effect labels."],
    "windows": windows,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"out": str(OUT), "windows": len(windows), "duration": duration}))
