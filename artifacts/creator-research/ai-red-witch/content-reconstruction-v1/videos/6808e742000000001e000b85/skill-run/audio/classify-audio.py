#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: classify-audio.py input.wav output.json")
    input_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()
    sample_rate, waveform = wavfile.read(input_path)
    if waveform.ndim > 1:
        waveform = waveform.mean(axis=1)
    if np.issubdtype(waveform.dtype, np.integer):
        waveform = waveform.astype(np.float32) / max(abs(np.iinfo(waveform.dtype).min), np.iinfo(waveform.dtype).max)
    else:
        waveform = waveform.astype(np.float32)

    model_id = "MIT/ast-finetuned-audioset-10-10-0.4593"
    extractor = AutoFeatureExtractor.from_pretrained(model_id)
    model = AutoModelForAudioClassification.from_pretrained(model_id)
    model.eval()

    window_s = 10.0
    hop_s = 5.0
    duration_s = len(waveform) / sample_rate
    windows = []
    start_s = 0.0
    while start_s < duration_s:
        end_s = min(duration_s, start_s + window_s)
        start_i = int(start_s * sample_rate)
        end_i = int(end_s * sample_rate)
        chunk = waveform[start_i:end_i]
        inputs = extractor(chunk, sampling_rate=sample_rate, return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits[0]
            probabilities = torch.sigmoid(logits)
        values, indices = torch.topk(probabilities, k=12)
        labels = [
            {
                "label": model.config.id2label[int(index)],
                "score": round(float(value), 6),
            }
            for value, index in zip(values, indices)
        ]
        windows.append({
            "start": round(start_s, 3),
            "end": round(end_s, 3),
            "topLabels": labels,
        })
        if end_s >= duration_s:
            break
        start_s += hop_s

    output = {
        "schemaVersion": "audio-semantic-evidence-1.0",
        "source": str(input_path),
        "duration": round(duration_s, 6),
        "sampleRate": sample_rate,
        "model": model_id,
        "method": "Full-track overlapping 10-second AudioSet AST classification with 5-second hop; top 12 sigmoid labels retained per window.",
        "limitations": [
            "AudioSet labels are machine proposals and may confuse quiet background music with speech or environmental sound.",
            "The classifier does not identify track ownership, song title, license, or whether sound belongs to inserted footage.",
            "Window-level labels do not prove frame-exact onset or continuity."
        ],
        "windows": windows,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
