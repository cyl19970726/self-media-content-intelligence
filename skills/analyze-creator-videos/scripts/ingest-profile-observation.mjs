#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { mergeFieldEvidence, parseCount, readJson, writeJsonAtomic } from './lib/collection-core.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
const useStdin = process.argv.includes('--stdin')
if (!args.inventory || (!args.profile && !useStdin)) {
  console.error('Usage: ingest-profile-observation.mjs --inventory <collection-inventory.json> (--profile <profile-observation.json> | --stdin) [--raw-dir <dir>]')
  process.exit(2)
}
const inventoryPath = path.resolve(args.inventory)
const inventory = readJson(inventoryPath)
const observation = useStdin ? JSON.parse(fs.readFileSync(0, 'utf8')) : readJson(args.profile)
inventory.creator.fieldEvidence ??= {}
inventory.route.taskSpaceId = observation.taskSpaceId ?? inventory.route.taskSpaceId
inventory.route.ownership = observation.ownership ?? inventory.route.ownership
if (observation.error || observation.needsUser) {
  inventory.creator.identityStatus = observation.needsUser ? 'needs_user' : 'unverified'
  writeJsonAtomic(inventoryPath, inventory)
  console.log(JSON.stringify({ ok: false, identityStatus: inventory.creator.identityStatus, error: observation.error ?? 'needs_user' }))
  process.exit(1)
}
const values = {
  id: observation.fields?.id ?? null,
  name: observation.fields?.name ?? null,
  xiaohongshuId: observation.fields?.xiaohongshuId ?? null,
  bio: observation.fields?.bio ?? null,
  profileUrl: observation.profileUrl,
  followers: parseCount(observation.fields?.followers),
  likesAndCollections: parseCount(observation.fields?.likesAndCollections)
}
for (const [field, value] of Object.entries(values)) {
  if (value === null || value === '') continue
  inventory.creator.fieldEvidence[field] = mergeFieldEvidence(inventory.creator.fieldEvidence[field], value, observation.strategy, observation.capturedAt, observation.artifactRef ?? null)
}
for (const field of ['id', 'name', 'xiaohongshuId', 'bio', 'profileUrl']) {
  const evidence = inventory.creator.fieldEvidence[field]
  if (evidence?.chosen !== undefined && evidence?.chosen !== null) inventory.creator[field] = evidence.chosen
}
inventory.creator.publicStats.followers = inventory.creator.fieldEvidence.followers?.chosen ?? inventory.creator.publicStats.followers ?? null
inventory.creator.publicStats.likesAndCollections = inventory.creator.fieldEvidence.likesAndCollections?.chosen ?? inventory.creator.publicStats.likesAndCollections ?? null
inventory.creator.identityAnchors = [
  ...(inventory.creator.fieldEvidence.id?.chosen ? [{ kind: 'stable_id', value: inventory.creator.fieldEvidence.id.chosen, source: observation.strategy }] : []),
  ...(inventory.creator.fieldEvidence.xiaohongshuId?.chosen ? [{ kind: 'xiaohongshu_id', value: inventory.creator.fieldEvidence.xiaohongshuId.chosen, source: observation.strategy }] : []),
  ...(inventory.creator.fieldEvidence.name?.chosen ? [{ kind: 'display_name', value: inventory.creator.fieldEvidence.name.chosen, source: observation.strategy }] : [])
]
const conflicts = Object.entries(inventory.creator.fieldEvidence).filter(([, evidence]) => evidence.status === 'conflict').map(([field]) => field)
inventory.creator.identityStatus = conflicts.length ? 'conflict' : inventory.creator.identityAnchors.length >= 2 ? 'confirmed' : 'unverified'
inventory.creator.identityConflicts = conflicts
writeJsonAtomic(inventoryPath, inventory)
let rawPath = null
if (args['raw-dir']) {
  rawPath = path.join(path.resolve(args['raw-dir']), 'profile-observation.json')
  writeJsonAtomic(rawPath, observation)
}
console.log(JSON.stringify({ ok: inventory.creator.identityStatus === 'confirmed', identityStatus: inventory.creator.identityStatus, anchors: inventory.creator.identityAnchors.length, conflicts, rawPath }))
process.exit(inventory.creator.identityStatus === 'confirmed' ? 0 : 1)
