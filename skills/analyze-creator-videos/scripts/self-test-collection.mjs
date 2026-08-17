#!/usr/bin/env node
import assert from 'node:assert/strict'
import { blankItem, diffInventories, ingestCrawlRound, mergeFieldEvidence, mergeObservation, summarizeInventory } from './lib/collection-core.mjs'

const at = '2026-08-16T00:00:00.000Z'
let item = blankItem('note-1', at)
item = mergeObservation(item, { title: '测试视频', mediaType: 'video', likes: '1.2万' }, 'visible_dom', at)
item = mergeObservation(item, { likes: 12000 }, 'structured_state', '2026-08-16T00:01:00.000Z')
assert.equal(item.metrics.likes, 12000)
assert.equal(item.fieldEvidence.likes.status, 'confirmed')
const conflict = mergeFieldEvidence(item.fieldEvidence.likes, 12500, 'network_response', '2026-08-16T00:02:00.000Z')
assert.equal(conflict.status, 'conflict')
assert.equal(conflict.chosen, 12000)

item.selectedForDeep = true
item.detailStatus = 'ready'
item.mediaStatus = 'verified_complete'
item.subtitleStatus = 'absent'
item.state = 'ready'
const inventory = {
  schemaVersion: '1.0', snapshotId: 's1', snapshotAt: at, platform: 'xiaohongshu',
  route: { adapter: 'ego-browser', mode: 'read_only', serverLabel: 'hhh-01', taskSpaceId: 1, ownership: 'released' },
  creator: { id: 'creator-1', name: '测试博主', profileUrl: null, identityStatus: 'confirmed', identityAnchors: [{ kind: 'stable_id', value: 'creator-1', source: 'structured_state' }, { kind: 'display_name', value: '测试博主', source: 'visible_dom' }], publicStats: {} },
  crawl: { rounds: 4, zeroGrowthRounds: 3, zeroGrowthRoundsRequired: 3, completed: true, stopReason: 'converged', declaredLimit: null, duplicateIds: [], lastScrollY: 1000, lastPageHeight: 1000 },
  items: [item]
}
const status = summarizeInventory(inventory)
assert.equal(status.readiness, 'deep_media_ready')
let crawling = structuredClone(inventory)
crawling.items = []
crawling.crawl = { ...crawling.crawl, rounds: 0, zeroGrowthRounds: 0, completed: false, stopReason: 'not_started' }
const round = (index, items) => ({ schemaVersion: '1.0', round: index, capturedAt: at, strategy: 'visible_dom', scroll: { y: index * 100, pageHeight: 1000 }, page: { url: 'https://example.test/profile', explicitEnd: false, needsUser: false, error: null }, items })
crawling = ingestCrawlRound(crawling, round(1, [{ id: 'a', likes: '1万' }])).inventory
crawling = ingestCrawlRound(crawling, round(2, [{ id: 'a', likes: 10000 }, { id: 'b', likes: 20 }])).inventory
crawling = ingestCrawlRound(crawling, round(3, [{ id: 'a' }, { id: 'b' }])).inventory
crawling = ingestCrawlRound(crawling, round(4, [{ id: 'a' }, { id: 'b' }])).inventory
crawling = ingestCrawlRound(crawling, round(5, [{ id: 'a' }, { id: 'b' }])).inventory
assert.equal(crawling.items.length, 2)
assert.equal(crawling.crawl.completed, true)
assert.equal(crawling.crawl.stopReason, 'converged')
const changed = structuredClone(inventory)
changed.snapshotId = 's2'
changed.items[0].metrics.likes = 13000
const diff = diffInventories(inventory, changed)
assert.deepEqual(diff.changed[0].invalidates, ['corpus_analysis', 'selection', 'creator_analysis', 'dashboard'])
console.log(JSON.stringify({ ok: true, tests: 11, readiness: status.readiness }))
