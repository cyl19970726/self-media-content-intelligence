#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { appendJsonLine, ingestCrawlRound, readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
const useStdin = process.argv.includes('--stdin')
const useStdinJsonl = process.argv.includes('--stdin-jsonl')
if (!args.inventory || (!args.round && !useStdin && !useStdinJsonl)) {
  console.error('Usage: ingest-crawl-round.mjs --inventory <collection-inventory.json> (--round <crawl-round.json> | --stdin | --stdin-jsonl) [--ledger <crawl-ledger.jsonl>] [--raw-dir <dir>]')
  process.exit(2)
}
const inventoryPath = path.resolve(args.inventory)
const stdin = useStdin || useStdinJsonl ? fs.readFileSync(0, 'utf8') : null
const observations = useStdinJsonl
  ? stdin.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line))
  : [useStdin ? JSON.parse(stdin) : readJson(args.round)]
const ledger = path.resolve(args.ledger ?? path.join(path.dirname(inventoryPath), 'crawl-ledger.jsonl'))
let inventory = readJson(inventoryPath)
const rawPaths = []
for (const observation of observations) {
  const result = ingestCrawlRound(inventory, observation)
  inventory = result.inventory
  writeJsonAtomic(inventoryPath, inventory)
  appendJsonLine(ledger, { type: 'crawl_round', ...result.round })
  if (args['raw-dir']) {
    const rawPath = path.join(path.resolve(args['raw-dir']), `crawl-round-${String(observation.round).padStart(4, '0')}.json`)
    writeJsonAtomic(rawPath, observation)
    rawPaths.push(rawPath)
  }
}
console.log(JSON.stringify({ ok: true, inventory: inventoryPath, ledger, rawPaths, ingestedRounds: observations.length, items: inventory.items.length, crawl: inventory.crawl }))
