#!/usr/bin/env node
import path from 'node:path'
import { readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.inventory || !args.id || !args.verification) {
  console.error('Usage: apply-media-verification.mjs --inventory <collection-inventory.json> --id <post-id> --verification <media-verification.json>')
  process.exit(2)
}
const inventoryPath = path.resolve(args.inventory)
const verificationPath = path.resolve(args.verification)
const inventory = readJson(inventoryPath)
const verification = readJson(verificationPath)
const item = inventory.items.find((candidate) => candidate.id === args.id)
if (!item) throw new Error(`Unknown inventory item: ${args.id}`)
item.media.videoPath = verification.file
item.media.verificationPath = verificationPath
item.media.sha256 = verification.transport?.sha256 ?? null
item.mediaStatus = verification.status
if (verification.subtitleStatus && verification.subtitleStatus !== 'unchecked') item.subtitleStatus = verification.subtitleStatus
item.updatedAt = verification.checkedAt
if (['verified_complete', 'verified_visual_short_no_subtitle'].includes(verification.status)) item.state = item.selectedForDeep && ['available', 'absent', 'failed'].includes(item.subtitleStatus) ? 'ready' : 'media_verified'
else if (verification.status === 'decode_failed') item.state = 'terminal_failed'
else item.state = 'retryable_failed'
if (!['verified_complete', 'verified_visual_short_no_subtitle'].includes(verification.status)) item.failures.push({ stage: 'media_verification', at: verification.checkedAt, status: verification.status, verificationPath })
writeJsonAtomic(inventoryPath, inventory)
console.log(JSON.stringify({ ok: true, id: item.id, state: item.state, mediaStatus: item.mediaStatus }))
