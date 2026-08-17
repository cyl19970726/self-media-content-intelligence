#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { now, sha256File, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.input || !args.out) {
  console.error('Usage: verify-media.mjs --input <video> --out <verification.json> [--expected-duration <seconds>] [--subtitle-status available|absent|failed|unchecked]')
  process.exit(2)
}
const input = path.resolve(args.input)
const output = path.resolve(args.out)
const expectedDuration = args['expected-duration'] ? Number(args['expected-duration']) : null
const subtitleStatus = args['subtitle-status'] ?? 'unchecked'
const run = (command, commandArgs, options = {}) => spawnSync(command, commandArgs, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options })
const unknowns = []
const gates = []
const failReport = (status, message) => {
  const report = {
    schemaVersion: '1.0', checkedAt: now(), file: input, status,
    transport: { bytes: fs.existsSync(input) ? fs.statSync(input).size : 0, sha256: fs.existsSync(input) ? sha256File(input) : null },
    container: { durationSec: null, streams: [], decodePass: false, error: message },
    timeline: { probeTimes: [], frameHashes: [], allProbeFramesDecoded: false },
    contentContinuity: { freezeEvents: [], blackEvents: [], tailMotionStatus: 'unknown' },
    gates: [{ id: 'file_exists', pass: fs.existsSync(input), detail: message }], unknowns: [message]
  }
  writeJsonAtomic(output, report)
  console.log(JSON.stringify(report))
  process.exit(1)
}
if (!fs.existsSync(input) || !fs.statSync(input).isFile()) failReport('decode_failed', 'Input video does not exist or is not a regular file.')

const probe = run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', input])
if (probe.status !== 0) failReport('decode_failed', `ffprobe failed: ${(probe.stderr || '').trim()}`)
const probeJson = JSON.parse(probe.stdout)
const durationSec = Number(probeJson.format?.duration ?? probeJson.streams?.find((stream) => stream.codec_type === 'video')?.duration)
if (!Number.isFinite(durationSec) || durationSec <= 0) failReport('decode_failed', 'No positive media duration was reported.')
const streams = (probeJson.streams ?? []).map((stream) => ({
  index: stream.index, codecType: stream.codec_type, codecName: stream.codec_name,
  width: stream.width ?? null, height: stream.height ?? null, durationSec: Number(stream.duration) || null
}))
const videoStream = streams.find((stream) => stream.codecType === 'video')
gates.push({ id: 'video_stream', pass: Boolean(videoStream), detail: videoStream ? `${videoStream.codecName} ${videoStream.width}x${videoStream.height}` : 'missing' })

const decode = run('ffmpeg', ['-hide_banner', '-v', 'error', '-i', input, '-map', '0:v:0', '-f', 'null', '-'])
const decodePass = decode.status === 0
gates.push({ id: 'full_decode', pass: decodePass, detail: decodePass ? 'full video stream decoded' : (decode.stderr || '').trim().slice(0, 500) })

const clamp = (value) => Math.max(0.05, Math.min(durationSec - 0.05, value))
const probeTimes = [...new Set([0.1, durationSec * 0.25, durationSec * 0.5, durationSec * 0.75, durationSec - 5, durationSec - 2, durationSec - 0.25]
  .filter((value) => value > 0 && value < durationSec)
  .map((value) => Number(clamp(value).toFixed(3))))]
const frameHashes = probeTimes.map((time) => {
  const frame = run('ffmpeg', ['-hide_banner', '-v', 'error', '-ss', String(time), '-i', input, '-frames:v', '1', '-f', 'md5', '-'])
  const hash = frame.status === 0 ? frame.stdout.trim().replace(/^MD5=/, '') : null
  return { time, hash, decoded: Boolean(hash), error: hash ? null : (frame.stderr || '').trim().slice(0, 240) }
})
const allProbeFramesDecoded = frameHashes.every((item) => item.decoded)
gates.push({ id: 'timeline_probes', pass: allProbeFramesDecoded, detail: `${frameHashes.filter((item) => item.decoded).length}/${frameHashes.length}` })

const detect = run('ffmpeg', ['-hide_banner', '-v', 'info', '-i', input, '-vf', 'freezedetect=n=-50dB:d=2,blackdetect=d=2:pix_th=0.10', '-an', '-f', 'null', '-'])
const detectorLog = `${detect.stdout ?? ''}\n${detect.stderr ?? ''}`
const freezeEvents = []
let currentFreeze = null
for (const line of detectorLog.split(/\r?\n/)) {
  const start = line.match(/freeze_start:\s*([0-9.]+)/)
  const duration = line.match(/freeze_duration:\s*([0-9.]+)/)
  const end = line.match(/freeze_end:\s*([0-9.]+)/)
  if (start) { currentFreeze = { start: Number(start[1]), end: null, duration: null }; freezeEvents.push(currentFreeze) }
  if (duration && currentFreeze) currentFreeze.duration = Number(duration[1])
  if (end && currentFreeze) { currentFreeze.end = Number(end[1]); if (currentFreeze.duration === null) currentFreeze.duration = currentFreeze.end - currentFreeze.start; currentFreeze = null }
}
if (currentFreeze) { currentFreeze.end = durationSec; currentFreeze.duration = durationSec - currentFreeze.start }
const blackEvents = [...detectorLog.matchAll(/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g)]
  .map((match) => ({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) }))
const extendedThreshold = Math.max(10, durationSec * 0.25)
const extendedTailFreeze = freezeEvents.find((event) => event.end >= durationSec - 0.75 && event.duration >= extendedThreshold)
const extendedTailBlack = blackEvents.find((event) => event.end >= durationSec - 0.75 && event.duration >= extendedThreshold)
const tailHashes = frameHashes.filter((item) => item.time >= Math.max(0, durationSec - 5) && item.hash).map((item) => item.hash)
const repeatedTailProbes = tailHashes.length >= 3 && new Set(tailHashes).size === 1
const tailMotionStatus = extendedTailFreeze || repeatedTailProbes ? 'frozen_extended' : extendedTailBlack ? 'black_extended' : tailHashes.length >= 2 && new Set(tailHashes).size > 1 ? 'active' : 'unknown'
gates.push({ id: 'no_extended_frozen_tail', pass: !extendedTailFreeze && !repeatedTailProbes, detail: extendedTailFreeze ? `${extendedTailFreeze.duration.toFixed(3)}s tail freeze` : repeatedTailProbes ? 'three identical near-end frame hashes' : tailMotionStatus })
gates.push({ id: 'no_extended_black_tail', pass: !extendedTailBlack, detail: extendedTailBlack ? `${extendedTailBlack.duration.toFixed(3)}s black tail` : 'none detected' })

const durationTolerance = expectedDuration === null ? null : Math.max(2, expectedDuration * 0.05)
const durationMatches = expectedDuration === null || Math.abs(durationSec - expectedDuration) <= durationTolerance
gates.push({ id: 'expected_duration', pass: durationMatches, detail: expectedDuration === null ? 'no page expectation supplied' : `expected ${expectedDuration}s; container ${durationSec.toFixed(3)}s; tolerance ${durationTolerance.toFixed(3)}s` })
if (expectedDuration === null) unknowns.push('No independent expected duration was supplied; completeness relies on decode and continuity checks.')
if (subtitleStatus === 'unchecked') unknowns.push('Subtitle availability was not checked.')

let status = 'verified_complete'
if (!videoStream || !decodePass || !allProbeFramesDecoded) status = 'decode_failed'
else if (!durationMatches) status = 'metadata_mismatch'
else if (extendedTailFreeze || extendedTailBlack || repeatedTailProbes) status = 'partial_or_frozen_tail'
else if (tailMotionStatus === 'unknown') status = 'unknown_completeness'
else if (subtitleStatus === 'absent' && durationSec <= Number(args['visual-short-max'] ?? 10)) status = 'verified_visual_short_no_subtitle'

const report = {
  schemaVersion: '1.0', checkedAt: now(), file: input, status,
  transport: { bytes: fs.statSync(input).size, sha256: sha256File(input) },
  container: { durationSec: Number(durationSec.toFixed(6)), streams, decodePass, decodeError: decodePass ? null : (decode.stderr || '').trim().slice(0, 1000) },
  timeline: { probeTimes, frameHashes, allProbeFramesDecoded },
  contentContinuity: { freezeEvents, blackEvents, tailMotionStatus, extendedThresholdSec: Number(extendedThreshold.toFixed(3)) },
  subtitleStatus, expectedDurationSec: expectedDuration, gates, unknowns
}
writeJsonAtomic(output, report)
console.log(JSON.stringify({ ok: ['verified_complete', 'verified_visual_short_no_subtitle'].includes(status), output, status, durationSec: report.container.durationSec, sha256: report.transport.sha256 }))
process.exit(['verified_complete', 'verified_visual_short_no_subtitle'].includes(status) ? 0 : 1)
