#!/usr/bin/env node
import { basename, join } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import {
  detectSceneCuts, ensureInputFile, extractFrame, overlap, parseArgs, parseSrt,
  probeMedia, requireArg, round, uniqueTimes, writeJson
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const video = requireArg(args, "video");
const out = requireArg(args, "out");
const subtitles = args.subtitles && args.subtitles !== true ? requireArg(args, "subtitles") : null;
const subtitleOrigin = args["subtitle-origin"] && args["subtitle-origin"] !== true
  ? String(args["subtitle-origin"])
  : (subtitles ? "provided_subtitles" : "none");

ensureInputFile(video, "video");
if (subtitles) ensureInputFile(subtitles, "subtitles");
mkdirSync(out, { recursive: true });

const media = probeMedia(video);
const duration = media.duration;
const safeEnd = Math.max(0.04, duration - 0.12);
const cuts = detectSceneCuts(video, duration, Number(args["scene-threshold"] || 0.24));
const boundaries = uniqueTimes([0, ...cuts, duration], duration + 0.12);
if (boundaries.at(-1) < duration) boundaries.push(duration);

const shots = [];
for (let index = 0; index < boundaries.length - 1; index += 1) {
  const start = round(boundaries[index]);
  const end = round(boundaries[index + 1]);
  if (end - start < 0.04) continue;
  const id = `SHOT-${String(shots.length + 1).padStart(3, "0")}`;
  const representativeTime = round((start + end) / 2);
  const frame = `frames/shots/${id.toLowerCase()}.jpg`;
  extractFrame(video, Math.min(representativeTime, safeEnd), join(out, frame));
  shots.push({ id, start, end, representativeTime, representativeFrame: frame });
}

const cues = subtitles ? parseSrt(readFileSync(subtitles, "utf8")) : [];
const transcriptCues = cues.map((cue) => {
  const representativeTime = round((cue.start + cue.end) / 2);
  const frame = `frames/cues/${cue.id.toLowerCase()}.jpg`;
  extractFrame(video, Math.min(representativeTime, safeEnd), join(out, frame));
  return {
    ...cue,
    representativeTime,
    representativeFrame: frame,
    overlappingShots: shots.filter((shot) => overlap(cue, shot)).map((shot) => shot.id)
  };
});

const denseInterval = Number(args["dense-seconds"] || (duration <= 30 ? 0.75 : duration <= 120 ? 1.5 : duration <= 300 ? 2.5 : 4));
const denseTimes = [];
for (let time = 0; time <= safeEnd; time += denseInterval) denseTimes.push(time);
denseTimes.push(safeEnd);
const denseFrames = uniqueTimes(denseTimes, duration).map((time, index) => {
  const id = `DENSE-${String(index + 1).padStart(4, "0")}`;
  const frame = `frames/dense/${id.toLowerCase()}.jpg`;
  extractFrame(video, time, join(out, frame), 270, 480);
  return { id, time, frame };
});

const frameIndex = [
  ...shots.map((shot) => ({ id: `FRAME-${shot.id}`, time: shot.representativeTime, frame: shot.representativeFrame, purpose: "shot_representative" })),
  ...transcriptCues.map((cue) => ({ id: `FRAME-${cue.id}`, time: cue.representativeTime, frame: cue.representativeFrame, purpose: "cue_representative" })),
  ...denseFrames
];

const pack = {
  schemaVersion: "video-evidence-pack-1.0",
  generatedAt: new Date().toISOString(),
  source: {
    video,
    videoName: basename(video),
    subtitles,
    subtitleOrigin
  },
  media,
  sceneDetection: { threshold: Number(args["scene-threshold"] || 0.24), cuts },
  shots,
  transcript: {
    origin: subtitleOrigin,
    cueCount: transcriptCues.length,
    fullText: transcriptCues.map((cue) => cue.text).join(" "),
    cues: transcriptCues
  },
  denseProbe: { intervalSeconds: denseInterval, frames: denseFrames },
  frameIndex,
  contracts: {
    cueFrameShotMapping: transcriptCues.every((cue) => cue.representativeFrame && Array.isArray(cue.overlappingShots)),
    verbatimTranscriptPreserved: true
  }
};

const output = join(out, "evidence-pack.json");
writeJson(output, pack);
process.stdout.write(`${JSON.stringify({ output, duration, shots: shots.length, cues: transcriptCues.length, denseFrames: denseFrames.length })}\n`);
