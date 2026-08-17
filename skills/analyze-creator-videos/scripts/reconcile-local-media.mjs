#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.inventory || !args['media-dir']) {
  console.error('Usage: reconcile-local-media.mjs --inventory <collection-inventory.json> --media-dir <directory>')
  process.exit(2)
}
const inventoryPath = path.resolve(args.inventory)
const mediaDir = path.resolve(args['media-dir'])
if (!fs.existsSync(mediaDir) || !fs.statSync(mediaDir).isDirectory()) throw new Error(`Media directory is unavailable: ${mediaDir}`)
const inventory = readJson(inventoryPath)
let videos = 0
let subtitles = 0
for (const item of inventory.items) {
  const video = ['mp4', 'mov', 'mkv', 'webm'].map((extension) => path.join(mediaDir, `${item.id}.${extension}`)).find((file) => fs.existsSync(file) && fs.statSync(file).isFile())
  const subtitle = ['srt', 'vtt'].map((extension) => path.join(mediaDir, `${item.id}.${extension}`)).find((file) => fs.existsSync(file) && fs.statSync(file).isFile())
  if (video) {
    item.media.videoPath = video
    if (!['verified_complete', 'verified_visual_short_no_subtitle'].includes(item.mediaStatus)) item.mediaStatus = 'downloaded'
    if (!['ready', 'media_verified'].includes(item.state)) item.state = 'media_downloaded'
    videos += 1
  }
  if (subtitle) {
    item.media.subtitlePath = subtitle
    item.subtitleStatus = 'available'
    subtitles += 1
  } else if (video && item.subtitleStatus === 'unchecked' && args['missing-subtitle'] === 'absent') item.subtitleStatus = 'absent'
}
writeJsonAtomic(inventoryPath, inventory)
console.log(JSON.stringify({ ok: true, inventory: inventoryPath, mediaDir, videos, subtitles, unmatched: inventory.items.length - videos }))
