#!/usr/bin/env python3
import hashlib
import json
import math
import os
from pathlib import Path

import librosa
import numpy as np
import torch
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source-audio-0-18.137.wav"
OUT = ROOT / "machine-listening-raw.json"
MODEL_ID = "MIT/ast-finetuned-audioset-10-10-0.4593"
TARGET_SR = 16000


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def top_labels(model, extractor, audio, count=12):
    # AST accepts variable-length mono waveforms and pads/truncates through its feature extractor.
    inputs = extractor(audio, sampling_rate=TARGET_SR, return_tensors="pt")
    with torch.inference_mode():
        logits = model(**inputs).logits[0]
        # AudioSet is multi-label: independent sigmoid scores are more appropriate
        # than forcing 527 labels to compete through a softmax.
        probs = torch.sigmoid(logits)
    values, indices = torch.topk(probs, k=min(count, probs.numel()))
    return [
        {
            "label": model.config.id2label[int(i)],
            "probability": round(float(v), 6),
        }
        for v, i in zip(values, indices)
    ]


def slice_audio(y, start, end):
    a = max(0, int(round(start * TARGET_SR)))
    b = min(len(y), int(round(end * TARGET_SR)))
    return y[a:b]


def features(y):
    if len(y) == 0:
        return {}
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]
    zcr = librosa.feature.zero_crossing_rate(y, frame_length=1024, hop_length=256)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=TARGET_SR, n_fft=1024, hop_length=256)[0]
    onset_frames = librosa.onset.onset_detect(y=y, sr=TARGET_SR, hop_length=256, units="frames")
    onset_times = librosa.frames_to_time(onset_frames, sr=TARGET_SR, hop_length=256)
    return {
        "rmsMean": round(float(np.mean(rms)), 8),
        "rmsMax": round(float(np.max(rms)), 8),
        "zeroCrossingMean": round(float(np.mean(zcr)), 8),
        "spectralCentroidMeanHz": round(float(np.mean(centroid)), 3),
        "onsetTimesRelativeSeconds": [round(float(t), 3) for t in onset_times],
    }


def main():
    # Load both native stereo and mono. Mono is the actual full mix auditioned by AST.
    stereo, native_sr = librosa.load(SOURCE, sr=None, mono=False)
    mono = librosa.to_mono(stereo) if stereo.ndim == 2 else stereo
    mono = librosa.resample(mono, orig_sr=native_sr, target_sr=TARGET_SR)

    # A center-cancel residual is supplementary evidence for persistent off-center bed/SFX.
    # It is never treated as the original mix or as proof that a centered source is absent.
    if stereo.ndim == 2 and stereo.shape[0] >= 2:
        residual_native = 0.5 * (stereo[0] - stereo[1])
        residual = librosa.resample(residual_native, orig_sr=native_sr, target_sr=TARGET_SR)
    else:
        residual = np.zeros_like(mono)

    extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
    model = AutoModelForAudioClassification.from_pretrained(MODEL_ID)
    model.eval()

    duration = len(mono) / TARGET_SR
    regions = [
        {"id": "AUD-REG-01", "label": "opening comparisons", "start": 0.0, "end": 9.1},
        {"id": "AUD-REG-02", "label": "input, queue and prompt", "start": 9.1, "end": 13.35},
        {"id": "AUD-REG-03", "label": "result reveal and result pane", "start": 13.35, "end": 16.15},
        {"id": "AUD-REG-04", "label": "result playback and closing CTA", "start": 16.15, "end": duration},
    ]

    region_rows = []
    for region in regions:
        original = slice_audio(mono, region["start"], region["end"])
        cancelled = slice_audio(residual, region["start"], region["end"])
        region_rows.append(
            {
                **region,
                "originalMix": {
                    "topAudioSetLabels": top_labels(model, extractor, original),
                    "features": features(original),
                },
                "centerCancelledResidual": {
                    "topAudioSetLabels": top_labels(model, extractor, cancelled),
                    "features": features(cancelled),
                    "limitation": "L-R residual suppresses centered material; it cannot prove centered music, speech, effects, or embedded result audio absent.",
                },
            }
        )

    windows = []
    win = 2.0
    stride = 1.0
    start = 0.0
    while start < duration:
        end = min(duration, start + win)
        original = slice_audio(mono, start, end)
        cancelled = slice_audio(residual, start, end)
        windows.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "originalTopLabels": top_labels(model, extractor, original, count=8),
                "residualTopLabels": top_labels(model, extractor, cancelled, count=8),
                "features": features(original),
            }
        )
        start += stride

    output = {
        "schemaVersion": "machine-listening-raw-1.0",
        "source": str(SOURCE),
        "sourceSha256": sha256(SOURCE),
        "durationSeconds": round(duration, 6),
        "nativeSampleRate": int(native_sr),
        "nativeChannelCount": int(stereo.shape[0]) if stereo.ndim == 2 else 1,
        "auditionMethod": {
            "kind": "pretrained_audio_event_classification",
            "model": MODEL_ID,
            "ontology": "AudioSet",
            "scoreTransform": "sigmoid (multi-label)",
            "fullMixAuditioned": True,
            "windowSeconds": win,
            "strideSeconds": stride,
            "supplementaryResidual": "0.5*(left-right)",
            "limitations": [
                "Machine audition is not human listening.",
                "Speech can dominate AudioSet probabilities and mask low-level music/effects.",
                "No label can prove an embedded result clip's own audio absent when narration and the post mix overlap.",
                "Center cancellation is supplementary and may remove any centered event along with narration.",
            ],
        },
        "semanticRegions": region_rows,
        "slidingWindows": windows,
    }
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUT), "duration": duration, "regions": len(region_rows), "windows": len(windows)}))


if __name__ == "__main__":
    main()
