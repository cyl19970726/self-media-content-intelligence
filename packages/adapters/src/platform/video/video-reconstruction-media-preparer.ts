import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runFile } from "../../core/process.js";

type FileRunner = typeof runFile;

type EvidencePackLike = {
  media?: { duration?: number; hasAudio?: boolean; streams?: Array<{ codecType?: string; codec_type?: string }> };
  source?: { subtitleOrigin?: string; subtitles?: string | null };
};

export type MediaPreparationManifest = {
  schemaVersion: "video-media-preparation@1";
  preparedAt: string;
  sourceMedia: { algorithm: "sha256"; fingerprint: string; path: string };
  audio: { present: boolean; durationSeconds: number | null };
  transcript: {
    path: string | null;
    origin: "provided_subtitles" | "reused_subtitles" | "machine_transcription" | "none";
    provider: string | null;
    language: string | null;
    fingerprint: string | null;
  };
  evidencePack: { path: string; fingerprint: string; reused: boolean };
};

export type PrepareBuilderInputsOptions = {
  videoPath: string;
  outputDir: string;
  skillDir: string;
  language?: string;
  whisperCli?: string;
  whisperModel?: string;
  pythonWhisper?: string;
  executeFile?: FileRunner;
  now?: () => Date;
};

function exists(file: string): boolean {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function configured(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function readJson(file: string): unknown {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return null; }
}

function mediaSummary(pack: EvidencePackLike | null): { present: boolean; durationSeconds: number | null } | null {
  if (!pack?.media) return null;
  const streams = pack.media.streams ?? [];
  const present = pack.media.hasAudio === true || streams.some((stream) =>
    stream.codecType === "audio" || stream.codec_type === "audio");
  const duration = Number(pack.media.duration);
  return { present, durationSeconds: Number.isFinite(duration) ? duration : null };
}

async function probeAudio(videoPath: string, executeFile: FileRunner): Promise<{ present: boolean; durationSeconds: number | null }> {
  const result = await executeFile("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", videoPath
  ], { timeout: 60_000 });
  const parsed = JSON.parse(result.stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string }>;
  };
  const duration = Number(parsed.format?.duration);
  return {
    present: parsed.streams?.some((stream) => stream.codec_type === "audio") ?? false,
    durationSeconds: Number.isFinite(duration) ? duration : null
  };
}

export function reusableSubtitleCandidates(videoPath: string, outputDir: string): string[] {
  return [
    path.join(outputDir, "source-video.srt"),
    path.join(outputDir, "evidence", "source-video.srt"),
    path.join(outputDir, "evidence", "transcription", "source-video.srt"),
    path.join(path.dirname(videoPath), "source-video.srt")
  ];
}

function publishFile(source: string, target: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.copyFileSync(source, temporary);
  fs.renameSync(temporary, target);
}

async function transcribe(
  videoPath: string,
  target: string,
  options: Required<Pick<PrepareBuilderInputsOptions, "language" | "whisperCli" | "whisperModel" | "pythonWhisper">>,
  executeFile: FileRunner
): Promise<string> {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "self-media-asr-"));
  try {
    const audioPath = path.join(temporaryDir, "audio.wav");
    await executeFile("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", videoPath,
      "-ar", "16000", "-ac", "1", audioPath
    ], { timeout: 10 * 60_000 });
    const outputPrefix = path.join(temporaryDir, "source-video");
    try {
      await executeFile(options.whisperCli, [
        "-m", options.whisperModel, "-l", options.language,
        "-osrt", "-of", outputPrefix, "-np", audioPath
      ], { timeout: 30 * 60_000 });
      if (!exists(`${outputPrefix}.srt`)) throw new Error("whisper-cli produced no SRT");
      publishFile(`${outputPrefix}.srt`, target);
      return `whisper.cpp:${path.basename(options.whisperModel)}`;
    } catch (primaryError) {
      const pythonOutput = path.join(temporaryDir, "python");
      fs.mkdirSync(pythonOutput, { recursive: true });
      try {
        await executeFile(options.pythonWhisper, [
          videoPath, "--model", "base", "--language", options.language === "zh" ? "Chinese" : options.language,
          "--task", "transcribe", "--output_dir", pythonOutput, "--output_format", "srt", "--fp16", "False"
        ], { timeout: 60 * 60_000 });
      } catch {
        throw primaryError;
      }
      const produced = path.join(pythonOutput, `${path.basename(videoPath, path.extname(videoPath))}.srt`);
      if (!exists(produced)) throw new Error("MEDIA_PREPARATION_TRANSCRIPT_MISSING");
      publishFile(produced, target);
      return "openai-whisper:base";
    }
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  }
}

export async function prepareBuilderInputs(options: PrepareBuilderInputsOptions): Promise<MediaPreparationManifest> {
  const executeFile = options.executeFile ?? runFile;
  const now = options.now ?? (() => new Date());
  const language = configured(options.language ?? process.env.SELF_MEDIA_TRANSCRIPTION_LANGUAGE, "zh");
  const whisperCli = configured(options.whisperCli ?? process.env.SELF_MEDIA_WHISPER_CLI, "whisper-cli");
  const whisperModel = configured(options.whisperModel ?? process.env.SELF_MEDIA_WHISPER_MODEL,
    path.join(os.homedir(), ".cache", "whisper", "ggml-base.bin"));
  const pythonWhisper = configured(options.pythonWhisper ?? process.env.SELF_MEDIA_PYTHON_WHISPER, "whisper");
  const sourceFingerprint = sha256(options.videoPath);
  const manifestPath = path.join(options.outputDir, "media-preparation.json");
  const evidencePath = path.join(options.outputDir, "evidence", "evidence-pack.json");

  const previous = readJson(manifestPath) as MediaPreparationManifest | null;
  if (previous?.schemaVersion === "video-media-preparation@1" &&
      previous.sourceMedia.fingerprint === sourceFingerprint && exists(evidencePath) &&
      previous.evidencePack.fingerprint === sha256(evidencePath)) return previous;
  if (previous?.sourceMedia.fingerprint && previous.sourceMedia.fingerprint !== sourceFingerprint) {
    throw new Error("MEDIA_PREPARATION_SOURCE_REVISION_MISMATCH");
  }

  fs.mkdirSync(options.outputDir, { recursive: true });
  const pack = exists(evidencePath) ? readJson(evidencePath) as EvidencePackLike | null : null;
  const summary = mediaSummary(pack) ?? await probeAudio(options.videoPath, executeFile);
  let subtitle = reusableSubtitleCandidates(options.videoPath, options.outputDir).find(exists) ?? null;
  let origin: MediaPreparationManifest["transcript"]["origin"] = subtitle
    ? (subtitle.startsWith(path.dirname(options.videoPath)) ? "provided_subtitles" : "reused_subtitles")
    : "none";
  let provider: string | null = null;

  if (!subtitle && summary.present) {
    subtitle = path.join(options.outputDir, "source-video.srt");
    provider = await transcribe(options.videoPath, subtitle, {
      language, whisperCli, whisperModel, pythonWhisper
    }, executeFile);
    origin = "machine_transcription";
  }

  const reusedEvidence = exists(evidencePath);
  if (!reusedEvidence) {
    const args = [
      path.join(options.skillDir, "scripts", "build-evidence-pack.mjs"),
      "--video", options.videoPath,
      "--out", path.join(options.outputDir, "evidence")
    ];
    if (subtitle) args.push(
      "--subtitles", subtitle,
      "--subtitle-origin", origin === "machine_transcription"
        ? `machine_transcription_${provider}_${language}`
        : origin
    );
    await executeFile(process.execPath, args, { cwd: options.outputDir, timeout: 30 * 60_000 });
  }
  if (!exists(evidencePath)) throw new Error("MEDIA_PREPARATION_EVIDENCE_PACK_MISSING");

  const manifest: MediaPreparationManifest = {
    schemaVersion: "video-media-preparation@1",
    preparedAt: now().toISOString(),
    sourceMedia: { algorithm: "sha256", fingerprint: sourceFingerprint, path: options.videoPath },
    audio: summary,
    transcript: {
      path: subtitle,
      origin,
      provider,
      language: subtitle ? language : null,
      fingerprint: subtitle ? sha256(subtitle) : null
    },
    evidencePack: { path: evidencePath, fingerprint: sha256(evidencePath), reused: reusedEvidence }
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}
