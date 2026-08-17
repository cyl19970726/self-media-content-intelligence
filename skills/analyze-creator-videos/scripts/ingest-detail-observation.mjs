#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { mergeObservation, readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
const useStdin = process.argv.includes('--stdin')
const useStdinJsonl = process.argv.includes('--stdin-jsonl')
if (!args.inventory || (!args.detail && !useStdin && !useStdinJsonl)) {
  console.error('Usage: ingest-detail-observation.mjs --inventory <collection-inventory.json> (--detail <detail-observation.json> | --stdin | --stdin-jsonl) [--raw-dir <dir>]')
  process.exit(2)
}
const inventoryPath = path.resolve(args.inventory)
const inventory = readJson(inventoryPath)
const rawPaths = []
const summary = { processed: 0, ready: 0, failed: 0, unknownInventoryIds: [] }
const processDetail = (detail) => {
  const index = inventory.items.findIndex((item) => item.id === detail.id)
  if (index < 0) {
    summary.unknownInventoryIds.push(detail.id)
    return
  }
  let item = mergeObservation(inventory.items[index], detail.fields ?? {}, detail.strategy, detail.capturedAt, detail.artifactRef ?? null)
  if (detail.error) {
    summary.failed += 1
    item.detailStatus = 'failed'
    item.state = detail.error === 'needs_user' ? 'needs_user' : 'retryable_failed'
    item.failures.push({ stage: 'detail', at: detail.capturedAt, error: detail.error })
  } else {
    summary.ready += 1
    item.detailStatus = 'ready'
    item.subtitleStatus = detail.subtitleStatus
    const videoCandidate = (detail.mediaCandidates ?? []).find((candidate) => candidate.kind === 'video' && candidate.availability === 'available')
    if (videoCandidate) {
      item.media.expectedDurationSec = videoCandidate.expectedDurationSec ?? item.media.expectedDurationSec
      item.mediaStatus = item.selectedForDeep ? 'pending' : item.mediaStatus
      item.state = item.selectedForDeep ? 'media_pending' : 'metadata_ready'
    } else item.state = 'metadata_ready'
  }
  inventory.items[index] = item
  summary.processed += 1
  if (args['raw-dir']) {
    const rawPath = path.join(path.resolve(args['raw-dir']), `${detail.id}.json`)
    writeJsonAtomic(rawPath, detail)
    rawPaths.push(rawPath)
  }
  writeJsonAtomic(inventoryPath, inventory)
}
if (useStdinJsonl) {
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    processDetail(JSON.parse(line))
  }
} else {
  const stdin = useStdin ? fs.readFileSync(0, 'utf8') : null
  processDetail(useStdin ? JSON.parse(stdin) : readJson(args.detail))
}
console.log(JSON.stringify({ ok: summary.failed === 0, ...summary, rawPaths }))
