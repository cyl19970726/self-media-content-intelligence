#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const pairs = process.argv.slice(2);
const args = Object.fromEntries(pairs.flatMap((value, index) => value.startsWith("--") ? [[value.slice(2), pairs[index + 1]]] : []));
if (!args.input || !args.out) process.exit(2);
const input = path.resolve(args.input);
const output = path.resolve(args.out);
const run = (command, commandArgs) => spawnSync(command, commandArgs, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const write = (report) => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
};
const fail = (message) => {
  write({ schemaVersion: "1.0", checkedAt: new Date().toISOString(), file: input, status: "decode_failed",
    transport: { bytes: fs.existsSync(input) ? fs.statSync(input).size : 0, sha256: null },
    container: { durationSec: null, streams: [], decodePass: false, error: message },
    timeline: { probeTimes: [], frameHashes: [], allProbeFramesDecoded: false },
    contentContinuity: { freezeEvents: [], blackEvents: [], tailMotionStatus: "unknown" },
    gates: [{ id: "file_exists", pass: fs.existsSync(input), detail: message }], unknowns: [message] });
  process.exit(1);
};
if (!fs.existsSync(input) || !fs.statSync(input).isFile()) fail("Input video is missing.");
const bytes = fs.readFileSync(input);
const probe = run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", input]);
if (probe.status !== 0) fail(`ffprobe failed: ${(probe.stderr ?? "").trim()}`);
const metadata = JSON.parse(probe.stdout);
const durationSec = Number(metadata.format?.duration ?? metadata.streams?.find((stream) => stream.codec_type === "video")?.duration);
if (!Number.isFinite(durationSec) || durationSec <= 0) fail("No positive duration was reported.");
const streams = (metadata.streams ?? []).map((stream) => ({ codecType: stream.codec_type, codecName: stream.codec_name,
  width: stream.width ?? null, height: stream.height ?? null }));
const videoStream = streams.find((stream) => stream.codecType === "video");
const decode = run("ffmpeg", ["-hide_banner", "-v", "error", "-i", input, "-map", "0:v:0", "-f", "null", "-"]);
const decodePass = decode.status === 0;
const clamp = (value) => Math.max(0.05, Math.min(durationSec - 0.05, value));
const probeTimes = [...new Set([0.1, durationSec * .25, durationSec * .5, durationSec * .75, durationSec - 5, durationSec - 2, durationSec - .25]
  .filter((value) => value > 0 && value < durationSec).map((value) => Number(clamp(value).toFixed(3))))];
const frameHashes = probeTimes.map((time) => {
  const frame = run("ffmpeg", ["-hide_banner", "-v", "error", "-ss", String(time), "-i", input, "-frames:v", "1", "-f", "md5", "-"]);
  const hash = frame.status === 0 ? frame.stdout.trim().replace(/^MD5=/, "") : null;
  return { time, hash, decoded: Boolean(hash) };
});
const allProbeFramesDecoded = frameHashes.every((item) => item.decoded);
const detect = run("ffmpeg", ["-hide_banner", "-v", "info", "-i", input, "-vf", "freezedetect=n=-50dB:d=2,blackdetect=d=2:pix_th=0.10", "-an", "-f", "null", "-"]);
const log = `${detect.stdout ?? ""}\n${detect.stderr ?? ""}`;
const freezeEvents = [];
let current = null;
for (const line of log.split(/\r?\n/)) {
  const start = line.match(/freeze_start:\s*([0-9.]+)/); const length = line.match(/freeze_duration:\s*([0-9.]+)/); const end = line.match(/freeze_end:\s*([0-9.]+)/);
  if (start) { current = { start: Number(start[1]), end: null, duration: null }; freezeEvents.push(current); }
  if (length && current) current.duration = Number(length[1]);
  if (end && current) { current.end = Number(end[1]); current.duration ??= current.end - current.start; current = null; }
}
if (current) { current.end = durationSec; current.duration = durationSec - current.start; }
const blackEvents = [...log.matchAll(/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g)]
  .map((match) => ({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) }));
const threshold = Math.max(10, durationSec * .25);
const frozenTail = freezeEvents.find((event) => event.end >= durationSec - .75 && event.duration >= threshold);
const blackTail = blackEvents.find((event) => event.end >= durationSec - .75 && event.duration >= threshold);
const tailHashes = frameHashes.filter((item) => item.time >= Math.max(0, durationSec - 5) && item.hash).map((item) => item.hash);
const repeatedTail = tailHashes.length >= 3 && new Set(tailHashes).size === 1;
const tailMotionStatus = frozenTail || repeatedTail ? "frozen_extended" : blackTail ? "black_extended"
  : tailHashes.length >= 2 && new Set(tailHashes).size > 1 ? "active" : "unknown";
const gates = [
  { id: "video_stream", pass: Boolean(videoStream) }, { id: "full_decode", pass: decodePass },
  { id: "timeline_probes", pass: allProbeFramesDecoded }, { id: "no_extended_frozen_tail", pass: !frozenTail && !repeatedTail },
  { id: "no_extended_black_tail", pass: !blackTail }
];
const complete = gates.every((gate) => gate.pass) && tailMotionStatus === "active";
const status = complete ? "verified_complete" : !videoStream || !decodePass || !allProbeFramesDecoded ? "decode_failed"
  : frozenTail || blackTail || repeatedTail ? "partial_or_frozen_tail" : "unknown_completeness";
write({ schemaVersion: "1.0", checkedAt: new Date().toISOString(), file: input, status,
  transport: { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") },
  container: { durationSec, streams, decodePass }, timeline: { probeTimes, frameHashes, allProbeFramesDecoded },
  contentContinuity: { freezeEvents, blackEvents, tailMotionStatus, extendedThresholdSec: threshold }, gates,
  unknowns: ["No independent page duration was supplied.", "Subtitle availability was not checked."] });
process.exit(complete ? 0 : 1);
