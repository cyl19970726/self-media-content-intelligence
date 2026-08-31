#!/usr/bin/env python3
"""Create a bounded, auditable AudioSet proposal ledger for a complete WAV timeline."""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification


MODEL_ID = "MIT/ast-finetuned-audioset-10-10-0.4593"


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--window", type=float, default=10.0)
    parser.add_argument("--hop", type=float, default=10.0)
    parser.add_argument("--top-k", type=int, default=12)
    return parser.parse_args()


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    args = parse_args()
    wav_path = Path(args.wav).resolve()
    out_path = Path(args.out).resolve()
    if args.window <= 0 or args.hop <= 0 or args.hop > args.window:
        raise SystemExit("--window and --hop must be positive; hop cannot exceed window")

    rate, raw = wavfile.read(wav_path)
    if raw.ndim > 1:
        raw = raw.mean(axis=1)
    if np.issubdtype(raw.dtype, np.integer):
        samples = raw.astype(np.float32) / max(float(np.iinfo(raw.dtype).max), 1.0)
    else:
        samples = raw.astype(np.float32)
        peak = max(float(np.max(np.abs(samples))), 1.0)
        samples = samples / peak
    duration = len(samples) / rate

    extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
    model = AutoModelForAudioClassification.from_pretrained(MODEL_ID)
    model.eval()

    windows = []
    start = 0.0
    while start < duration:
        end = min(start + args.window, duration)
        clip = samples[int(start * rate): int(end * rate)]
        inputs = extractor(clip, sampling_rate=rate, return_tensors="pt")
        with torch.inference_mode():
            scores = torch.sigmoid(model(**inputs).logits[0])
        values, indices = torch.topk(scores, k=min(args.top_k, scores.numel()))
        windows.append({
            "start": round(start, 3),
            "end": round(end, 3),
            "rms": round(float(np.sqrt(np.mean(np.square(clip)))) if len(clip) else 0.0, 7),
            "peak": round(float(np.max(np.abs(clip))) if len(clip) else 0.0, 7),
            "topLabels": [
                {"label": model.config.id2label[int(index)], "score": round(float(value), 6)}
                for value, index in zip(values, indices)
            ]
        })
        start += args.hop

    result = {
        "schemaVersion": "audio-carrier-proposals-1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(wav_path),
        "sourceSha256": sha256(wav_path),
        "durationSeconds": round(duration, 6),
        "sampleRate": rate,
        "model": MODEL_ID,
        "labelSpace": "AudioSet",
        "method": {
            "windowSeconds": args.window,
            "hopSeconds": args.hop,
            "coverage": "gap-free; overlapping when hop is smaller than window",
            "scoreTransform": "sigmoid(logits)"
        },
        "limitations": [
            "Labels and scores are machine proposals, not human listening or source attribution.",
            "Mixed-track classification does not isolate speech, music, UI sounds, or inserted-clip audio.",
            "Absence from top labels does not prove a sound is absent.",
            "The model cannot establish track identity, ownership, licensing, or editorial intent."
        ],
        "windows": windows
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "out": str(out_path), "duration": duration, "windows": len(windows)}))


if __name__ == "__main__":
    main()
