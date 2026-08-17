import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Usage: node scripts/analyze-high-like-set.mjs <selection-dir>");

const selection = JSON.parse(readFileSync(join(root, "selection.json"), "utf8"));
const mediaDir = join(root, "media");
const evidenceRoot = join(root, "evidence");
mkdirSync(evidenceRoot, { recursive: true });

const parseTimestamp = (raw) => {
  const match = raw.match(/(\d+):(\d+):(\d+),(\d+)/);
  if (!match) throw new Error(`Invalid SRT timestamp: ${raw}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
};

const parseSrt = (raw) => raw
  .replace(/\r/g, "")
  .trim()
  .split(/\n\s*\n/)
  .map((block, index) => {
    const lines = block.trim().split("\n");
    const timingIndex = lines.findIndex((line) => line.includes(" --> "));
    if (timingIndex < 0) return null;
    const [startRaw, endRaw] = lines[timingIndex].split(" --> ");
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    return {
      id: `CUE-${String(index + 1).padStart(3, "0")}`,
      index: index + 1,
      start,
      end,
      duration: Number((end - start).toFixed(3)),
      midpoint: Number(((start + end) / 2).toFixed(3)),
      text: lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "").trim()
    };
  })
  .filter(Boolean);

const probe = (file) => JSON.parse(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate",
  "-of", "json", file
], { encoding: "utf8" }));

const parseRate = (rate = "0/1") => {
  const [a, b] = rate.split("/").map(Number);
  return b ? a / b : 0;
};

const parseSceneCuts = (file) => {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-i", file,
    "-vf", "select='gt(scene,0.22)',showinfo",
    "-an", "-f", "null", "-"
  ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  return [...text.matchAll(/pts_time:([0-9.]+)/g)]
    .map((match) => Number(Number(match[1]).toFixed(3)))
    .filter((value, index, array) => value > 0.05 && value < 10_000 && (index === 0 || value - array[index - 1] > 0.08));
};

const makeFrame = (video, timestamp, output, width = 360, height = 640) => {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-ss", String(timestamp), "-i", video,
    "-frames:v", "1",
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    "-pix_fmt", "yuvj420p", "-strict", "unofficial", "-q:v", "3", "-y", output
  ]);
};

const makeTile = (pattern, output, columns, rows, width, height) => {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-framerate", "1", "-i", pattern,
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,tile=${columns}x${rows}:padding=4:margin=4:color=#111827`,
    "-frames:v", "1", "-pix_fmt", "yuvj420p", "-strict", "unofficial", "-q:v", "3", "-y", output
  ]);
};

const numeric = (value) => Number(value || 0);
const round = (value, digits = 3) => Number(value.toFixed(digits));
const reports = [];

for (const item of selection.videos) {
  const video = join(mediaDir, `${item.id}.mp4`);
  const srt = join(mediaDir, `${item.id}.srt`);
  if (!existsSync(video) || !existsSync(srt)) throw new Error(`Missing media for ${item.id}`);

  const outDir = join(evidenceRoot, item.id);
  const samplesDir = join(outDir, "sample-frames");
  const cueDir = join(outDir, "transcript-frames");
  mkdirSync(samplesDir, { recursive: true });
  mkdirSync(cueDir, { recursive: true });

  const mediaProbe = probe(video);
  const videoStream = mediaProbe.streams.find((stream) => stream.codec_type === "video") || {};
  const duration = Number(mediaProbe.format.duration);
  const fps = parseRate(videoStream.r_frame_rate);
  const cues = parseSrt(readFileSync(srt, "utf8"));
  const sceneCuts = parseSceneCuts(video).filter((time) => time < duration);
  const shotBoundaries = [0, ...sceneCuts, duration];
  const shotDurations = shotBoundaries.slice(1).map((end, index) => end - shotBoundaries[index]);

  const sampleCount = 20;
  const sampleTimes = Array.from({ length: sampleCount }, (_, index) => {
    const edgeSafeDuration = Math.max(0.1, duration - 0.08);
    return round((edgeSafeDuration * index) / (sampleCount - 1));
  });
  sampleTimes.forEach((time, index) => makeFrame(
    video,
    time,
    join(samplesDir, `frame-${String(index + 1).padStart(3, "0")}.jpg`)
  ));
  makeTile(join(samplesDir, "frame-%03d.jpg"), join(outDir, "contact-sheet.jpg"), 5, 4, 216, 384);

  cues.forEach((cue, index) => makeFrame(
    video,
    Math.min(cue.midpoint, Math.max(0.01, duration - 0.08)),
    join(cueDir, `cue-${String(index + 1).padStart(3, "0")}.jpg`)
  ));
  if (cues.length) {
    makeTile(
      join(cueDir, "cue-%03d.jpg"),
      join(outDir, "transcript-contact-sheet.jpg"),
      5,
      Math.ceil(cues.length / 5),
      180,
      320
    );
  }

  const transcriptChars = cues.reduce((sum, cue) => sum + cue.text.replace(/\s/g, "").length, 0);
  const report = {
    id: item.id,
    title: item.title,
    archetype: item.archetype,
    sourceUrl: item.sourceUrl,
    media: {
      file: `media/${basename(video)}`,
      subtitle: `media/${basename(srt)}`,
      durationSeconds: round(duration),
      width: videoStream.width,
      height: videoStream.height,
      fps: round(fps),
      codec: videoStream.codec_name,
      bytes: Number(mediaProbe.format.size)
    },
    engagement: {
      likes: numeric(item.likes),
      collections: numeric(item.collections),
      comments: numeric(item.comments),
      shares: numeric(item.shares),
      collectionToLike: round(numeric(item.collections) / numeric(item.likes)),
      commentToLike: round(numeric(item.comments) / numeric(item.likes)),
      shareToLike: round(numeric(item.shares) / numeric(item.likes))
    },
    transcript: {
      cueCount: cues.length,
      totalCharacters: transcriptChars,
      charactersPerMinute: round(transcriptChars / (duration / 60), 1),
      first3Seconds: cues.filter((cue) => cue.start < 3).map((cue) => cue.text).join(" "),
      first6Seconds: cues.filter((cue) => cue.start < 6).map((cue) => cue.text).join(" "),
      fullText: cues.map((cue) => cue.text).join(" "),
      cues: cues.map((cue, index) => ({
        ...cue,
        frame: `evidence/${item.id}/transcript-frames/cue-${String(index + 1).padStart(3, "0")}.jpg`
      }))
    },
    editing: {
      sceneThreshold: 0.22,
      detectedSceneCuts: sceneCuts,
      detectedShotCount: shotDurations.length,
      cutsPerMinute: round(sceneCuts.length / (duration / 60), 1),
      medianShotSeconds: round([...shotDurations].sort((a, b) => a - b)[Math.floor(shotDurations.length / 2)] || duration),
      shortestShotSeconds: round(Math.min(...shotDurations)),
      longestShotSeconds: round(Math.max(...shotDurations))
    },
    evidence: {
      contactSheet: `evidence/${item.id}/contact-sheet.jpg`,
      transcriptContactSheet: `evidence/${item.id}/transcript-contact-sheet.jpg`,
      sampleTimes
    }
  };

  writeFileSync(join(outDir, "analysis.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, "transcript.json"), `${JSON.stringify({ id: item.id, cues }, null, 2)}\n`);
  reports.push(report);
  process.stdout.write(`analyzed ${item.id}: ${duration.toFixed(1)}s, ${cues.length} cues, ${sceneCuts.length} cuts\n`);
}

const summary = {
  schemaVersion: "creator-high-like-set-1.0",
  creator: selection.creator,
  coverage: selection.coverage,
  selectionLogic: selection.selectionLogic,
  generatedAt: new Date().toISOString(),
  videos: reports
};

writeFileSync(join(root, "analysis.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`wrote ${reports.length} reports -> ${join(root, "analysis.json")}\n`);
