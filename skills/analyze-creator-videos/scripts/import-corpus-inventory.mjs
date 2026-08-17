#!/usr/bin/env node
import path from 'node:path'
import { importCorpusItem, now, readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.input || !args.out) {
  console.error('Usage: import-corpus-inventory.mjs --input <creator-corpus.json> --out <collection-inventory.json>')
  process.exit(2)
}
const corpus = readJson(args.input)
const capturedAt = corpus.snapshotAt ?? now()
const inventory = {
  schemaVersion: '1.0', snapshotId: args['snapshot-id'] ?? `import-${String(capturedAt).replace(/[:.]/g, '-')}`,
  snapshotAt: capturedAt, platform: corpus.creator?.platform ?? 'unknown',
  route: { adapter: 'ego-browser', mode: 'read_only', serverLabel: args.server ?? 'hhh-01', taskSpaceId: null, ownership: 'released', imported: true },
  creator: {
    id: corpus.creator?.id ?? 'unknown', name: corpus.creator?.name ?? 'unknown', profileUrl: corpus.creator?.profileUrl ?? null,
    xiaohongshuId: corpus.creator?.xiaohongshuId ?? null, bio: corpus.creator?.bio ?? null,
    identityStatus: corpus.creator?.id && corpus.creator?.name ? 'confirmed' : 'unverified',
    identityAnchors: [
      ...(corpus.creator?.id ? [{ kind: 'stable_id', value: corpus.creator.id, source: 'local_import' }] : []),
      ...(corpus.creator?.name ? [{ kind: 'display_name', value: corpus.creator.name, source: 'local_import' }] : [])
    ],
    publicStats: corpus.creator?.publicStats ?? {}
  },
  crawl: { rounds: 1, zeroGrowthRounds: 0, zeroGrowthRoundsRequired: 3, completed: true, stopReason: 'declared_limit', declaredLimit: (corpus.posts ?? []).length, duplicateIds: [], lastScrollY: null, lastPageHeight: null, imported: true },
  items: (corpus.posts ?? []).map((post) => importCorpusItem(post, capturedAt))
}
writeJsonAtomic(path.resolve(args.out), inventory)
console.log(JSON.stringify({ ok: true, output: path.resolve(args.out), items: inventory.items.length }))
