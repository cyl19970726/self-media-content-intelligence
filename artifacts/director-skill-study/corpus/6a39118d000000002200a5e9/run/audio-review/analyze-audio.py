import json
import subprocess
from pathlib import Path

import numpy as np
import torch
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / "run"
VIDEO = Path("/Users/hhh0x/self-media/artifacts/creator-research/human-director/media/6a39118d000000002200a5e9.mp4")
MODEL_DIR = Path("/Users/hhh0x/.cache/huggingface/hub/models--MIT--ast-finetuned-audioset-10-10-0.4593/snapshots")
snapshots = sorted(MODEL_DIR.glob("*"))
if not snapshots:
    raise SystemExit("cached AST AudioSet model not found")
model_path = snapshots[-1]

pcm = subprocess.check_output([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(VIDEO),
    "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"
])
audio = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
sr = 16000

extractor = AutoFeatureExtractor.from_pretrained(model_path, local_files_only=True)
model = AutoModelForAudioClassification.from_pretrained(model_path, local_files_only=True)
model.eval()

windows = []
window_seconds = 10.0
hop_seconds = 5.0
duration = len(audio) / sr
start = 0.0
while start < duration:
    end = min(duration, start + window_seconds)
    clip = audio[int(start * sr):int(end * sr)]
    if len(clip) < int(window_seconds * sr):
        clip = np.pad(clip, (0, int(window_seconds * sr) - len(clip)))
    inputs = extractor(clip, sampling_rate=sr, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits[0]
    probs = torch.softmax(logits, dim=-1)
    values, indices = torch.topk(probs, 12)
    labels = [
        {"label": model.config.id2label[int(i)], "score": round(float(v), 6)}
        for v, i in zip(values, indices)
    ]
    windows.append({"start": round(start, 3), "end": round(end, 3), "topLabels": labels})
    start += hop_seconds

music_terms = ("music", "song", "instrument", "guitar", "piano", "drum", "beat", "soundtrack")
sfx_terms = ("click", "ding", "whoosh", "bang", "impact", "sound effect", "noise")
speech_terms = ("speech", "narration", "monologue", "conversation", "male", "female", "voice")

def matches(labels, terms):
    return [x for x in labels if any(term in x["label"].lower() for term in terms)]

summary = {
    "schemaVersion": "audio-review-1.0",
    "source": str(VIDEO),
    "duration": round(duration, 3),
    "method": "Full-timeline 10-second AudioSet AST classifications at 5-second hops, using the locally cached MIT AST model; three 48-second low-bitrate review chunks were also prepared, but this model runtime cannot directly audition returned audio content.",
    "toolBoundary": "The runtime reports that direct audio input is unsupported. Classification can register probable categories but cannot replace human semantic audition or prove absence of quiet background music/SFX under speech.",
    "windows": windows,
    "detections": {
        "speechLike": [{"start": w["start"], "end": w["end"], "labels": matches(w["topLabels"], speech_terms)} for w in windows if matches(w["topLabels"], speech_terms)],
        "musicLike": [{"start": w["start"], "end": w["end"], "labels": matches(w["topLabels"], music_terms)} for w in windows if matches(w["topLabels"], music_terms)],
        "sfxLike": [{"start": w["start"], "end": w["end"], "labels": matches(w["topLabels"], sfx_terms)} for w in windows if matches(w["topLabels"], sfx_terms)]
    }
}

(RUN / "audio-review" / "audio-classification.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({
    "duration": summary["duration"],
    "windows": len(windows),
    "speechWindows": len(summary["detections"]["speechLike"]),
    "musicWindows": len(summary["detections"]["musicLike"]),
    "sfxWindows": len(summary["detections"]["sfxLike"])
}))
