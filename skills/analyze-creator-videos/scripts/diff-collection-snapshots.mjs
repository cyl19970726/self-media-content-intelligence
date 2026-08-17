#!/usr/bin/env node
import path from 'node:path'
import { diffInventories, readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.before || !args.after || !args.out) {
  console.error('Usage: diff-collection-snapshots.mjs --before <inventory.json> --after <inventory.json> --out <diff.json>')
  process.exit(2)
}
const diff = diffInventories(readJson(args.before), readJson(args.after))
writeJsonAtomic(path.resolve(args.out), diff)
console.log(JSON.stringify({ ok: true, output: path.resolve(args.out), new: diff.newIds.length, removed: diff.removedIds.length, changed: diff.changed.length, unchanged: diff.unchanged.length }))
