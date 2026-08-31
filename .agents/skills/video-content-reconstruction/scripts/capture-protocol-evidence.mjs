#!/usr/bin/env node
import { join } from "node:path";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { ensureInputFile, extractFrame, parseArgs, probeMedia, readJson, requireArg, round, uniqueTimes, writeContactSheet, writeJson } from "./lib.mjs";

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
const actionFrameIds = new Map();
const frameByExactTime = new Map();
const frameByContentHash = new Map();
let exactTimeReuses = 0;
let exactContentReuses = 0;
const maxTotalFrames = Number(args["max-total-frames"] || 180);

function attach(actionId, frameId) {
  const ids = actionFrameIds.get(actionId) || [];
  if (!ids.includes(frameId)) ids.push(frameId);
  actionFrameIds.set(actionId, ids);
}

function timeKey(time) {
  return round(time, 2).toFixed(2);
}

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
  const maxFramesPerAction = Number(args["max-frames-per-action"] || 60);
  if (selected.length > maxFramesPerAction) throw new Error(`${action.id} requests ${selected.length} frames; refine the protocol or raise --max-frames-per-action explicitly`);
  const newExactTimes = selected.filter((time) => !frameByExactTime.has(timeKey(time)));
  if (frames.length + newExactTimes.length > maxTotalFrames) throw new Error(`Protocol exceeds ${maxTotalFrames} total unique times; merge overlaps or raise --max-total-frames explicitly`);
  selected.forEach((time, index) => {
    const existingAtTime = frameByExactTime.get(timeKey(time));
    if (existingAtTime) {
      attach(action.id, existingAtTime.id);
      exactTimeReuses += 1;
      return;
    }
    const id = `TARGET-${String(frames.length + 1).padStart(4, "0")}`;
    const filename = `${action.id}-${String(index + 1).padStart(3, "0")}.jpg`.replace(/[^a-zA-Z0-9._-]/g, "-");
    const frame = `frames/${filename}`;
    const absoluteFrame = join(out, frame);
    extractFrame(video, time, absoluteFrame);
    const contentHash = createHash("sha256").update(readFileSync(absoluteFrame)).digest("hex");
    const existingContent = frameByContentHash.get(contentHash);
    if (existingContent) {
      unlinkSync(absoluteFrame);
      frameByExactTime.set(timeKey(time), existingContent);
      attach(action.id, existingContent.id);
      exactContentReuses += 1;
      return;
    }
    const record = { id, actionId: action.id, time: round(time), frame, carrier: action.carrier, reason: action.reason, contentHash };
    frames.push(record);
    frameByExactTime.set(timeKey(time), record);
    frameByContentHash.set(contentHash, record);
    attach(action.id, id);
  });
}

const contactSheet = "contact-sheet.jpg";
writeContactSheet(frames.map((frame) => join(out, frame.frame)), join(out, contactSheet));
const manifest = {
  schemaVersion: "targeted-evidence-1.0",
  generatedAt: new Date().toISOString(),
  video,
  protocol: protocolPath,
  frames,
  actions: (protocol.captureActions || []).map((action) => ({ id: action.id, frameIds: actionFrameIds.get(action.id) || [] })),
  contactSheet,
  deduplication: { exactTimeReuses, exactContentReuses, uniqueFrames: frames.length }
};
const output = join(out, "targeted-evidence.json");
writeJson(output, manifest);
process.stdout.write(`${JSON.stringify({ output, actions: manifest.actions.length, frames: frames.length })}\n`);
