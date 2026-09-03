#!/usr/bin/env node
import crypto from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ensureInputFile, extractFrame, parseArgs, probeMedia, requireArg, round, writeContactSheet, writeJson
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const video = requireArg(args, "video");
const out = requireArg(args, "out");
ensureInputFile(video, "video");
mkdirSync(dirname(out), { recursive: true });

const media = probeMedia(video);
const count = Math.max(4, Math.min(16, Number(args.count ?? 12)));
const safeEnd = Math.max(0, media.duration - 0.12);
const times = Array.from({ length: count }, (_, index) => round(safeEnd * index / Math.max(1, count - 1)));
const framesDir = join(dirname(out), "frames");
const frames = times.map((time, index) => {
  const frame = join(framesDir, `source-${String(index + 1).padStart(2, "0")}.jpg`);
  extractFrame(video, time, frame, 270, 480);
  return { id: `EVAL-SOURCE-${String(index + 1).padStart(2, "0")}`, time, frame };
});
if (!writeContactSheet(frames.map((frame) => frame.frame), out, 4)) throw new Error("Evaluator overview was not created");

const manifest = {
  schemaVersion: "evaluator-source-overview@1",
  generatedAt: new Date().toISOString(),
  sourceVideo: video,
  sourceVideoSha256: crypto.createHash("sha256").update(readFileSync(video)).digest("hex"),
  duration: media.duration,
  overview: out,
  frames
};
writeJson(join(dirname(out), "manifest.json"), manifest);
process.stdout.write(`${JSON.stringify({ overview: out, frames: frames.length, sourceVideoSha256: manifest.sourceVideoSha256 })}\n`);
