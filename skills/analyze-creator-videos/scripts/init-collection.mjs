#!/usr/bin/env node
import path from 'node:path'
import { now, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.out || !args['creator-id'] || !args['creator-name']) {
  console.error('Usage: init-collection.mjs --out <inventory.json> --creator-id <id> --creator-name <name> [--profile-url <url>] [--server hhh-01] [--snapshot-id <id>]')
  process.exit(2)
}
const capturedAt = now()
const inventory = {
  schemaVersion: '1.0', snapshotId: args['snapshot-id'] ?? capturedAt.replace(/[:.]/g, '-'), snapshotAt: capturedAt,
  platform: args.platform ?? 'xiaohongshu',
  route: { adapter: 'ego-browser', mode: 'read_only', serverLabel: args.server ?? 'hhh-01', taskSpaceId: null, ownership: 'unknown' },
  creator: {
    id: args['creator-id'], name: args['creator-name'], profileUrl: args['profile-url'] ?? null,
    xiaohongshuId: null, bio: null, identityStatus: 'unverified', identityAnchors: [], publicStats: {}
  },
  crawl: { rounds: 0, zeroGrowthRounds: 0, zeroGrowthRoundsRequired: Number(args['zero-growth-rounds'] ?? 3), completed: false, stopReason: 'not_started', declaredLimit: args.limit ? Number(args.limit) : null, duplicateIds: [], lastScrollY: null, lastPageHeight: null },
  items: []
}
writeJsonAtomic(path.resolve(args.out), inventory)
console.log(JSON.stringify({ ok: true, output: path.resolve(args.out), snapshotId: inventory.snapshotId }))
