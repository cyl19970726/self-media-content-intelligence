#!/usr/bin/env node
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { ensureInputFile, extractFrame, parseArgs, probeMedia, readJson, requireArg, round, uniqueTimes, writeJson } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const video = requireArg(args, "video");
const protocolPath = requireArg(args, "protocol");
const out = requireArg(args, "out");
ensureInputFile(video, "video");
ensureInputFile(protocolPath, "protocol");
mkdirSync(out, { recursive: true });

const protocol = readJson(protocolPath);
if (protocol.schemaVersion !== "capture-protocol-1.0") throw new Error("Unsupported protocol schemaVersion");
const media = probeMedia(video);
const frames = [];
const maxTotalFrames = Number(args["max-total-frames"] || 600);

for (const action of protocol.captureActions || []) {
  const start = Number(action.range?.start ?? 0);
  const end = Number(action.range?.end ?? start);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end > media.duration + 0.25) throw new Error(`Invalid range for ${action.id}`);
  let times = [];
  if (action.times?.length) times = action.times;
  else if (action.mode === "exact_times") throw new Error(`exact_times action ${action.id} requires times`);
  else if (action.mode === "before_during_after") times = [start, (start + end) / 2, end];
  else {
    const fallback = action.mode === "motion_sequence" ? 0.2 : action.mode === "ocr_review" || action.mode === "ui_state_review" ? 0.25 : 0.5;
    const density = Number(action.densitySeconds || fallback);
    for (let time = start; time <= end + 0.0001; time += density) times.push(time);
    times.push(end);
  }
  const selected = uniqueTimes(times, media.duration);
  const maxFramesPerAction = Number(args["max-frames-per-action"] || 120);
  if (selected.length > maxFramesPerAction) throw new Error(`${action.id} requests ${selected.length} frames; refine the protocol or raise --max-frames-per-action explicitly`);
  if (frames.length + selected.length > maxTotalFrames) throw new Error(`Protocol exceeds ${maxTotalFrames} total frames; merge overlaps or raise --max-total-frames explicitly`);
  selected.forEach((time, index) => {
    const id = `TARGET-${String(frames.length + 1).padStart(4, "0")}`;
    const filename = `${action.id}-${String(index + 1).padStart(3, "0")}.jpg`.replace(/[^a-zA-Z0-9._-]/g, "-");
    const frame = `frames/${filename}`;
    extractFrame(video, time, join(out, frame));
    frames.push({ id, actionId: action.id, time: round(time), frame, carrier: action.carrier, reason: action.reason });
  });
}

const manifest = {
  schemaVersion: "targeted-evidence-1.0",
  generatedAt: new Date().toISOString(),
  video,
  protocol: protocolPath,
  frames,
  actions: (protocol.captureActions || []).map((action) => ({ id: action.id, frameIds: frames.filter((frame) => frame.actionId === action.id).map((frame) => frame.id) }))
};
const output = join(out, "targeted-evidence.json");
writeJson(output, manifest);
process.stdout.write(`${JSON.stringify({ output, actions: manifest.actions.length, frames: frames.length })}\n`);
