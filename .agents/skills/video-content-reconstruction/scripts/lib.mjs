import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

export function requireArg(args, name) {
  const value = args[name];
  if (!value || value === true) throw new Error(`Missing --${name}`);
  return resolve(String(value));
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function ensureInputFile(path, label) {
  if (!existsSync(path)) throw new Error(`${label} does not exist: ${path}`);
}

export function round(value, digits = 3) {
  return Number(Number(value).toFixed(digits));
}

export function parseTimestamp(raw) {
  const match = String(raw).match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) throw new Error(`Invalid timestamp: ${raw}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4]}`);
}

export function parseSrt(raw) {
  const normalized = String(raw).replace(/\r/g, "").trim();
  if (!normalized) return [];
  return normalized.split(/\n\s*\n/).map((block, index) => {
    const lines = block.trim().split("\n");
    const timingIndex = lines.findIndex((line) => line.includes(" --> "));
    if (timingIndex < 0) return null;
    const [startRaw, endRaw] = lines[timingIndex].split(" --> ");
    const start = round(parseTimestamp(startRaw));
    const end = round(parseTimestamp(endRaw));
    return {
      id: `CUE-${String(index + 1).padStart(3, "0")}`,
      start,
      end,
      text: lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "").trim()
    };
  }).filter(Boolean);
}

export function probeMedia(video) {
  const raw = execFileSync("ffprobe", [
    "-v", "error", "-show_entries",
    "format=duration,size,format_name:stream=codec_type,codec_name,width,height,r_frame_rate,duration",
    "-of", "json", video
  ], { encoding: "utf8" });
  const data = JSON.parse(raw);
  const stream = data.streams.find((item) => item.codec_type === "video") || {};
  const audioStream = data.streams.find((item) => item.codec_type === "audio") || null;
  const formatDuration = Number(data.format.duration);
  const videoDuration = Number(stream.duration);
  return {
    // Frame extraction must stop at the video stream, not a longer audio tail.
    duration: round(Number.isFinite(videoDuration) ? videoDuration : formatDuration),
    sizeBytes: Number(data.format.size),
    format: data.format.format_name,
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    frameRate: stream.r_frame_rate,
    hasAudio: Boolean(audioStream),
    audioCodec: audioStream?.codec_name || null
  };
}

export function detectSceneCuts(video, duration, threshold = 0.24) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-i", video,
    "-vf", `select='gt(scene,${threshold})',showinfo`,
    "-an", "-f", "null", "-"
  ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const raw = `${result.stdout || ""}\n${result.stderr || ""}`;
  const cuts = [...raw.matchAll(/pts_time:([0-9.]+)/g)]
    .map((match) => round(Number(match[1])))
    .filter((time) => time > 0.05 && time < duration - 0.05)
    .sort((a, b) => a - b);
  return cuts.filter((time, index) => index === 0 || time - cuts[index - 1] > 0.08);
}

export function extractFrame(video, time, output, width = 360, height = 640) {
  mkdirSync(dirname(output), { recursive: true });
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-ss", String(time), "-i", video,
    "-frames:v", "1",
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    "-pix_fmt", "yuvj420p", "-strict", "unofficial", "-q:v", "3", "-y", output
  ]);
  if (!existsSync(output) || statSync(output).size === 0) throw new Error(`ffmpeg did not materialize frame at ${time}s: ${output}`);
}

export function writeContactSheet(framePaths, output, columns = 4) {
  if (framePaths.length === 0) return false;
  const temporary = mkdtempSync(join(tmpdir(), "video-contact-sheet-"));
  try {
    framePaths.forEach((frame, index) => {
      symlinkSync(resolve(frame), join(temporary, `frame-${String(index + 1).padStart(4, "0")}.jpg`));
    });
    mkdirSync(dirname(output), { recursive: true });
    const rows = Math.ceil(framePaths.length / columns);
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-framerate", "1",
      "-i", join(temporary, "frame-%04d.jpg"),
      "-vf", `scale=240:-1,tile=${columns}x${rows}:nb_frames=${framePaths.length}:padding=4:margin=4`,
      "-frames:v", "1", "-q:v", "3", "-y", output
    ]);
    return existsSync(output) && statSync(output).size > 0;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export function uniqueTimes(values, duration) {
  const safeEnd = Math.max(0, duration - 0.12);
  return [...new Set(values.map((value) => round(Math.max(0, Math.min(safeEnd, Number(value))))))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

export function overlap(rangeA, rangeB) {
  return Math.max(rangeA.start, rangeB.start) < Math.min(rangeA.end, rangeB.end)
    || (rangeA.start === rangeA.end && rangeA.start >= rangeB.start && rangeA.start <= rangeB.end);
}

export function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 1;
}
