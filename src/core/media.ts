import fs from "node:fs";
import path from "node:path";
import { artifactRef, externalSkills, runArtifactDir, runFile } from "../../packages/adapters/index.js";
import type { MediaBreakdown, SourceSnapshot } from "../shared/schema.js";

interface ProbeStream {
  codec_type?: string;
  width?: number;
  height?: number;
}

interface ProbeResult {
  format?: { duration?: string };
  streams?: ProbeStream[];
}

interface TranscriptFile {
  words?: Array<{ text?: string; start?: number; end?: number }>;
}

async function downloadVideo(url: string, target: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > 200 * 1024 * 1024) return null;
    fs.writeFileSync(target, buffer);
    return target;
  } catch {
    return null;
  }
}

export async function resolveVideo(
  runId: string,
  source: SourceSnapshot,
  explicitPath?: string | null
): Promise<string | null> {
  if (explicitPath && fs.existsSync(explicitPath)) return path.resolve(explicitPath);
  const local = source.media.find((item) => item.kind === "video" && item.localPath && fs.existsSync(item.localPath));
  if (local?.localPath) return local.localPath;
  const remote = source.media.find((item) => item.kind === "video" && item.url)?.url;
  if (!remote) return null;
  const target = path.join(runArtifactDir(runId), "source-video.mp4");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return downloadVideo(remote, target);
}

function transcriptSegments(file: TranscriptFile): MediaBreakdown["transcript"] {
  const words = Array.isArray(file.words) ? file.words : [];
  const result: MediaBreakdown["transcript"] = [];
  for (let index = 0; index < words.length; index += 12) {
    const chunk = words.slice(index, index + 12);
    const first = chunk[0];
    const last = chunk.at(-1);
    if (!first || !last) continue;
    result.push({
      start: Math.max(0, first.start ?? 0),
      end: Math.max(first.start ?? 0, last.end ?? last.start ?? 0),
      text: chunk.map((word) => word.text ?? "").join(" ").trim()
    });
  }
  return result.filter((segment) => segment.text);
}

async function tryTranscribe(videoPath: string, outputPath: string): Promise<MediaBreakdown["transcript"]> {
  if (!fs.existsSync(externalSkills.mediaTranscribe)) return [];
  try {
    await runFile(process.execPath, [externalSkills.mediaTranscribe, "--input", videoPath, "--out", outputPath, "--json"], { timeout: 30 * 60_000 });
    return transcriptSegments(JSON.parse(fs.readFileSync(outputPath, "utf8")) as TranscriptFile);
  } catch {
    return [];
  }
}

async function detectSceneBoundaries(videoPath: string, duration: number): Promise<number[]> {
  if (duration <= 0) return [0];
  try {
    const { stderr } = await runFile("ffmpeg", [
      "-hide_banner", "-loglevel", "info", "-i", videoPath,
      "-vf", "select=gt(scene\\,0.22),showinfo", "-an", "-f", "null", "-"
    ], { timeout: 120_000 });
    const changes = Array.from(stderr.matchAll(/pts_time:([0-9.]+)/g))
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value) && value > 0.35 && value < duration - 0.2)
      .sort((a, b) => a - b)
      .filter((value, index, values) => index === 0 || value - (values[index - 1] ?? 0) >= 0.35)
      .slice(0, 23);
    return [0, ...changes, duration];
  } catch {
    return [0, duration];
  }
}

async function detectSilenceRatio(videoPath: string, duration: number): Promise<number | null> {
  if (duration <= 0) return null;
  try {
    const { stderr } = await runFile("ffmpeg", [
      "-hide_banner", "-loglevel", "info", "-i", videoPath,
      "-af", "silencedetect=noise=-35dB:d=0.25", "-f", "null", "-"
    ], { timeout: 120_000 });
    const silentSeconds = Array.from(stderr.matchAll(/silence_duration:\s*([0-9.]+)/g))
      .reduce((sum, match) => sum + Number(match[1] ?? 0), 0);
    return Number(Math.min(1, silentSeconds / duration).toFixed(3));
  } catch {
    return null;
  }
}

function shotFunction(index: number, total: number): MediaBreakdown["shots"][number]["function"] {
  if (index === 0) return "hook";
  if (index === total - 1) return "payoff";
  const progress = index / Math.max(1, total - 1);
  if (progress < 0.34) return "context";
  if (progress < 0.72) return "proof";
  return "turn";
}

export async function analyzeMedia(runId: string, videoPath: string): Promise<MediaBreakdown> {
  const directory = runArtifactDir(runId);
  fs.mkdirSync(directory, { recursive: true });
  const probePath = path.join(directory, "probe.json");
  const contactSheetPath = path.join(directory, "contact-sheet.jpg");
  const { stdout } = await runFile("ffprobe", [
    "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", videoPath
  ]);
  fs.writeFileSync(probePath, stdout, "utf8");
  const probe = JSON.parse(stdout) as ProbeResult;
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const hasAudio = Boolean(probe.streams?.some((stream) => stream.codec_type === "audio"));
  const duration = Number(probe.format?.duration ?? 0);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

  await runFile("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", videoPath,
    "-vf", "fps=1/1,scale=240:-1,tile=3x3:padding=6:margin=6:color=#171C1B",
    "-frames:v", "1", contactSheetPath
  ], { timeout: 90_000 });

  const boundaries = await detectSceneBoundaries(videoPath, safeDuration);
  const sceneCount = Math.max(1, boundaries.length - 1);
  const sceneMethod = sceneCount > 1 ? "ffmpeg-scene-change@0.22" : "single-scene-no-threshold-crossing";
  const shots: MediaBreakdown["shots"] = [];
  for (let index = 0; index < sceneCount; index += 1) {
    const start = boundaries[index] ?? 0;
    const end = boundaries[index + 1] ?? safeDuration;
    const filename = `frame-${index + 1}.jpg`;
    const framePath = path.join(directory, filename);
    await runFile("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-ss", String((start + end) / 2),
      "-i", videoPath, "-frames:v", "1", "-vf", "scale=720:-2", framePath
    ], { timeout: 60_000 });
    shots.push({
      id: `shot-${index + 1}`, start, end,
      frameRef: artifactRef(runId, filename), transcript: "",
      function: shotFunction(index, sceneCount),
      observation: sceneCount > 1
        ? `画面在 ${start.toFixed(1)} 秒附近发生显著视觉切换；本镜头持续 ${(end - start).toFixed(1)} 秒。`
        : `全片未检测到超过阈值的显著画面切换；这是一段持续 ${safeDuration.toFixed(1)} 秒的单场景素材。`,
      boundaryReason: sceneCount > 1 ? "scene-change" : "single-scene",
      onScreenText: []
    });
  }
  const transcriptPath = path.join(directory, "transcript.json");
  const transcript = hasAudio ? await tryTranscribe(videoPath, transcriptPath) : [];
  for (const shot of shots) {
    shot.transcript = transcript.filter((segment) => segment.end >= shot.start && segment.start <= shot.end)
      .map((segment) => segment.text).join(" ");
  }
  const wordCount = transcript.reduce((sum, segment) => sum + segment.text.split(/\s+|(?=[\u4e00-\u9fff])/).filter(Boolean).length, 0);
  const cutsPerMinute = safeDuration > 0 ? Number((((sceneCount - 1) / safeDuration) * 60).toFixed(2)) : null;
  const averageShotSeconds = safeDuration > 0 ? Number((safeDuration / sceneCount).toFixed(2)) : null;
  const speechWordsPerMinute = safeDuration > 0 && wordCount > 0 ? Number(((wordCount / safeDuration) * 60).toFixed(1)) : null;
  const silenceRatio = hasAudio ? await detectSilenceRatio(videoPath, safeDuration) : null;
  return {
    durationSeconds: safeDuration || null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    hasAudio,
    contactSheetRef: artifactRef(runId, "contact-sheet.jpg"),
    transcript, shots,
    sceneDetectionMethod: sceneMethod,
    cutsPerMinute,
    averageShotSeconds,
    speechWordsPerMinute,
    silenceRatio
  };
}
