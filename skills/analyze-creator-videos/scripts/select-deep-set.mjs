#!/usr/bin/env node
import path from 'node:path'
import { readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.inventory || !args.selection) {
  console.error('Usage: select-deep-set.mjs --inventory <collection-inventory.json> --selection <selection.json>')
  process.exit(2)
}
const inventoryPath = path.resolve(args.inventory)
const inventory = readJson(inventoryPath)
const selection = readJson(args.selection)
const ids = new Set((selection.deepSet ?? selection.videos ?? selection.ids ?? []).map((item) => typeof item === 'string' ? item : item.id))
for (const item of inventory.items) {
  item.selectedForDeep = ids.has(item.id)
  if (!item.selectedForDeep) continue
  if (['verified_complete', 'verified_visual_short_no_subtitle'].includes(item.mediaStatus)) item.state = 'ready'
  else if (item.media?.videoPath) { item.mediaStatus = 'downloaded'; item.state = 'media_downloaded' }
  else { item.mediaStatus = 'pending'; item.state = 'media_pending' }
}
const missing = [...ids].filter((id) => !inventory.items.some((item) => item.id === id))
if (missing.length) throw new Error(`Selected IDs not found in inventory: ${missing.join(', ')}`)
writeJsonAtomic(inventoryPath, inventory)
console.log(JSON.stringify({ ok: true, selected: ids.size, inventory: inventoryPath }))
