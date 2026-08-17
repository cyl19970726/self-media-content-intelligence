#!/usr/bin/env node
import path from 'node:path'
import { readJson, summarizeInventory, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.inventory || !args.out) {
  console.error('Usage: build-collection-status.mjs --inventory <collection-inventory.json> --out <collection-status.json>')
  process.exit(2)
}
const status = summarizeInventory(readJson(args.inventory))
writeJsonAtomic(path.resolve(args.out), status)
console.log(JSON.stringify({ ok: true, output: path.resolve(args.out), readiness: status.readiness, blockers: status.blockers }))
process.exit(status.readiness === 'blocked' ? 1 : 0)
