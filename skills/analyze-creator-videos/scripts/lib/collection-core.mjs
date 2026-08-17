import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const now = () => new Date().toISOString()

export const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))

export const writeJsonAtomic = (file, value) => {
  const output = path.resolve(file)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  const temp = `${output}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(temp, output)
}

export const appendJsonLine = (file, value) => {
  const output = path.resolve(file)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.appendFileSync(output, `${JSON.stringify(value)}\n`)
}

export const sha256File = (file) => {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(path.resolve(file)))
  return hash.digest('hex')
}

export const parseCount = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  const raw = String(value).trim().replaceAll(',', '')
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(万|亿|[kKmM])?$/)
  if (!match) return null
  const unit = match[2]
  const scale = unit === '万' ? 1e4 : unit === '亿' ? 1e8 : /k/i.test(unit ?? '') ? 1e3 : /m/i.test(unit ?? '') ? 1e6 : 1
  return Math.round(Number(match[1]) * scale)
}

const strategyRank = {
  structured_state: 40,
  visible_dom: 30,
  network_response: 20,
  local_import: 15,
  fallback_evidence: 10,
  unknown: 0
}

const stableValue = (value) => JSON.stringify(value)

export const mergeFieldEvidence = (current, value, source, capturedAt, artifactRef = null) => {
  if (value === undefined) return current
  const base = current ?? { status: 'unknown', chosen: null, candidates: [] }
  const candidate = { value, source, capturedAt, artifactRef }
  const duplicate = base.candidates.some((item) => item.source === source && stableValue(item.value) === stableValue(value))
  const candidates = duplicate ? base.candidates : [...base.candidates, candidate]
  const distinct = new Set(candidates.map((item) => stableValue(item.value)))
  const chosenCandidate = [...candidates].sort((a, b) => (strategyRank[b.source] ?? 0) - (strategyRank[a.source] ?? 0) || String(b.capturedAt).localeCompare(String(a.capturedAt)))[0]
  return {
    status: candidates.length === 0 ? 'unknown' : distinct.size === 1 ? (candidates.length > 1 ? 'confirmed' : 'single_source') : 'conflict',
    chosen: chosenCandidate?.value ?? null,
    candidates
  }
}

export const blankItem = (id, capturedAt = now()) => ({
  id: String(id),
  title: '',
  postCopy: null,
  hashtags: [],
  topComments: [],
  sourceUrl: null,
  mediaType: 'unknown',
  state: 'detail_pending',
  detailStatus: 'pending',
  mediaStatus: 'not_selected',
  subtitleStatus: 'unchecked',
  selectedForDeep: false,
  publishedAt: null,
  publishedLabel: null,
  metrics: { likes: null, collections: null, comments: null, shares: null },
  media: { videoPath: null, subtitlePath: null, coverPath: null, verificationPath: null, expectedDurationSec: null, sha256: null },
  fieldEvidence: {},
  failures: [],
  updatedAt: capturedAt
})

const directFieldMap = {
  title: 'title',
  postCopy: 'postCopy',
  description: 'postCopy',
  hashtags: 'hashtags',
  topComments: 'topComments',
  sourceUrl: 'sourceUrl',
  mediaType: 'mediaType',
  publishedAt: 'publishedAt',
  publishedLabel: 'publishedLabel',
  cover: 'media.coverPath',
  coverPath: 'media.coverPath',
  videoPath: 'media.videoPath',
  subtitlePath: 'media.subtitlePath',
  expectedDurationSec: 'media.expectedDurationSec'
}

const setPath = (object, dotted, value) => {
  const parts = dotted.split('.')
  let cursor = object
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {}
  cursor[parts.at(-1)] = value
}

export const mergeObservation = (item, observation, source, capturedAt, artifactRef = null) => {
  const merged = structuredClone(item)
  const fields = observation.fields ?? observation
  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined) continue
    const evidenceKey = field.startsWith('metrics.') ? field : field
    const metricField = field === 'likes' || field === 'collections' || field === 'comments' || field === 'shares' || field.startsWith('metrics.')
    const evidenceValue = metricField ? parseCount(value) : value
    merged.fieldEvidence[evidenceKey] = mergeFieldEvidence(merged.fieldEvidence[evidenceKey], evidenceValue, source, capturedAt, artifactRef)
    const chosen = merged.fieldEvidence[evidenceKey].chosen
    if (field === 'likes' || field === 'collections' || field === 'comments' || field === 'shares') merged.metrics[field] = parseCount(chosen)
    else if (field.startsWith('metrics.')) merged.metrics[field.slice(8)] = parseCount(chosen)
    else if (directFieldMap[field]) setPath(merged, directFieldMap[field], chosen)
  }
  merged.updatedAt = capturedAt
  return merged
}

export const importCorpusItem = (post, capturedAt = now()) => {
  let item = blankItem(post.id, capturedAt)
  const observation = {
    title: post.title ?? '', sourceUrl: post.sourceUrl ?? null, mediaType: post.mediaType ?? 'unknown',
    publishedAt: post.publishedAt ?? null, publishedLabel: post.publishedLabel ?? null,
    likes: post.metrics?.likes ?? null, collections: post.metrics?.collections ?? null,
    comments: post.metrics?.comments ?? null, shares: post.metrics?.shares ?? null,
    videoPath: post.media?.videoPath ?? null, subtitlePath: post.media?.subtitlePath ?? null,
    coverPath: post.media?.coverPath ?? null, expectedDurationSec: post.durationSec ?? null
  }
  item = mergeObservation(item, observation, 'local_import', capturedAt, null)
  item.detailStatus = 'ready'
  item.subtitleStatus = observation.subtitlePath ? 'available' : 'unchecked'
  item.mediaStatus = observation.videoPath ? 'downloaded' : 'not_selected'
  item.state = observation.videoPath ? 'media_downloaded' : 'metadata_ready'
  return item
}

export const ingestCrawlRound = (inventoryInput, round) => {
  const inventory = structuredClone(inventoryInput)
  if (round.page?.error) {
    inventory.crawl.stopReason = round.page.needsUser ? 'needs_user' : 'retryable_error'
    inventory.crawl.completed = false
    return { inventory, round: { ...round, ingestResult: { newCount: 0, uniqueTotal: inventory.items.length, duplicateIds: [], zeroGrowthRounds: inventory.crawl.zeroGrowthRounds, completed: false, stopReason: inventory.crawl.stopReason } } }
  }
  const map = new Map(inventory.items.map((item) => [item.id, item]))
  const duplicateIds = []
  const seenRound = new Set()
  let newCount = 0
  for (const card of round.items ?? []) {
    const id = String(card.id)
    if (seenRound.has(id)) duplicateIds.push(id)
    seenRound.add(id)
    let item = map.get(id)
    if (!item) { item = blankItem(id, round.capturedAt); newCount += 1 }
    item = mergeObservation(item, {
      title: card.title ?? undefined, sourceUrl: card.sourceUrl ?? undefined, mediaType: card.mediaType ?? undefined,
      likes: card.likes ?? undefined, publishedLabel: card.publishedLabel ?? undefined, cover: card.cover ?? undefined
    }, round.strategy, round.capturedAt, round.artifactRef ?? null)
    map.set(id, item)
  }
  inventory.items = [...map.values()]
  inventory.crawl.rounds += 1
  inventory.crawl.zeroGrowthRounds = newCount === 0 ? inventory.crawl.zeroGrowthRounds + 1 : 0
  inventory.crawl.duplicateIds = [...new Set([...inventory.crawl.duplicateIds, ...duplicateIds])]
  inventory.crawl.lastScrollY = round.scroll?.y ?? null
  inventory.crawl.lastPageHeight = round.scroll?.pageHeight ?? null
  const hitLimit = inventory.crawl.declaredLimit && inventory.items.length >= inventory.crawl.declaredLimit
  if (round.page?.explicitEnd) { inventory.crawl.completed = true; inventory.crawl.stopReason = 'explicit_end' }
  else if (hitLimit) { inventory.crawl.completed = true; inventory.crawl.stopReason = 'declared_limit' }
  else if (inventory.crawl.zeroGrowthRounds >= inventory.crawl.zeroGrowthRoundsRequired) { inventory.crawl.completed = true; inventory.crawl.stopReason = 'converged' }
  else { inventory.crawl.completed = false; inventory.crawl.stopReason = 'not_started' }
  return {
    inventory,
    round: { ...round, ingestResult: { newCount, uniqueTotal: inventory.items.length, duplicateIds, zeroGrowthRounds: inventory.crawl.zeroGrowthRounds, completed: inventory.crawl.completed, stopReason: inventory.crawl.stopReason } }
  }
}

export const summarizeInventory = (inventory) => {
  const items = inventory.items ?? []
  const count = (predicate) => items.filter(predicate).length
  const metricFields = ['likes', 'collections', 'comments', 'shares']
  const missingness = Object.fromEntries(metricFields.map((field) => [field, count((item) => item.metrics?.[field] === null || item.metrics?.[field] === undefined)]))
  const selected = items.filter((item) => item.selectedForDeep)
  const verifiedStatuses = new Set(['verified_complete', 'verified_visual_short_no_subtitle'])
  const subtitleClosed = new Set(['available', 'absent', 'failed'])
  const gates = [
    { id: 'creator_identity', pass: inventory.creator?.identityStatus === 'confirmed', detail: inventory.creator?.identityStatus ?? 'missing' },
    { id: 'crawl_stop_reason', pass: Boolean(inventory.crawl?.completed && ['converged', 'explicit_end', 'declared_limit'].includes(inventory.crawl?.stopReason)), detail: inventory.crawl?.stopReason ?? 'missing' },
    { id: 'unique_ids', pass: new Set(items.map((item) => item.id)).size === items.length && !(inventory.crawl?.duplicateIds ?? []).length, detail: `${items.length} rows` },
    { id: 'snapshot_time', pass: Boolean(inventory.snapshotAt), detail: inventory.snapshotAt ?? 'missing' },
    { id: 'media_type_accounted', pass: items.every((item) => ['video', 'image', 'article', 'unknown'].includes(item.mediaType)), detail: `${count((item) => item.mediaType === 'unknown')} unresolved` },
    { id: 'deep_media_complete', pass: selected.length > 0 && selected.every((item) => verifiedStatuses.has(item.mediaStatus)), detail: `${selected.filter((item) => verifiedStatuses.has(item.mediaStatus)).length}/${selected.length}` },
    { id: 'deep_subtitle_accounted', pass: selected.length > 0 && selected.every((item) => subtitleClosed.has(item.subtitleStatus)), detail: `${selected.filter((item) => subtitleClosed.has(item.subtitleStatus)).length}/${selected.length}` }
  ]
  const inventoryReady = gates.slice(0, 5).every((gate) => gate.pass)
  const deepReady = inventoryReady && gates.slice(5).every((gate) => gate.pass)
  const blockingGates = selected.length ? gates : gates.slice(0, 5)
  const blockers = blockingGates.filter((gate) => !gate.pass).map((gate) => `${gate.id}:${gate.detail}`)
  const readiness = !gates[0].pass ? 'blocked' : deepReady ? 'deep_media_ready' : inventoryReady ? 'inventory_ready' : 'partial'
  return {
    schemaVersion: '1.0', generatedAt: now(), snapshotId: inventory.snapshotId,
    creator: { id: inventory.creator?.id, name: inventory.creator?.name, identityStatus: inventory.creator?.identityStatus },
    route: inventory.route,
    crawl: inventory.crawl,
    counts: {
      items: items.length, videos: count((item) => item.mediaType === 'video'), images: count((item) => item.mediaType === 'image'),
      articles: count((item) => item.mediaType === 'article'), unknownMediaType: count((item) => item.mediaType === 'unknown'),
      detailReady: count((item) => item.detailStatus === 'ready'), selectedForDeep: selected.length
    },
    missingness,
    media: {
      reusedOrDownloaded: count((item) => ['downloaded', ...verifiedStatuses].includes(item.mediaStatus)),
      verified: count((item) => verifiedStatuses.has(item.mediaStatus)),
      failed: count((item) => ['partial_or_frozen_tail', 'decode_failed', 'metadata_mismatch', 'unknown_completeness', 'failed'].includes(item.mediaStatus))
    },
    subtitles: {
      available: count((item) => item.subtitleStatus === 'available'), absent: count((item) => item.subtitleStatus === 'absent'),
      failed: count((item) => item.subtitleStatus === 'failed'), unchecked: count((item) => item.subtitleStatus === 'unchecked')
    },
    readiness, gates, blockers,
    nextActions: selected.length ? [] : ['Select the evidence-grade deep set before downloading media.']
  }
}

export const diffInventories = (before, after) => {
  const left = new Map((before.items ?? []).map((item) => [item.id, item]))
  const right = new Map((after.items ?? []).map((item) => [item.id, item]))
  const newIds = [...right.keys()].filter((id) => !left.has(id))
  const removedIds = [...left.keys()].filter((id) => !right.has(id))
  const changed = []
  const unchanged = []
  for (const [id, next] of right) {
    const prior = left.get(id)
    if (!prior) continue
    const fields = []
    for (const field of ['title', 'sourceUrl', 'mediaType', 'publishedAt']) if (stableValue(prior[field]) !== stableValue(next[field])) fields.push(field)
    for (const field of ['likes', 'collections', 'comments', 'shares']) if (stableValue(prior.metrics?.[field]) !== stableValue(next.metrics?.[field])) fields.push(`metrics.${field}`)
    if (stableValue(prior.media?.sha256) !== stableValue(next.media?.sha256)) fields.push('media.sha256')
    if (fields.length) changed.push({ id, fields, invalidates: fields.includes('media.sha256') ? ['reconstruction', 'creator_analysis', 'dashboard'] : ['corpus_analysis', 'selection', 'creator_analysis', 'dashboard'] })
    else unchanged.push(id)
  }
  return { schemaVersion: '1.0', generatedAt: now(), beforeSnapshotId: before.snapshotId, afterSnapshotId: after.snapshotId, newIds, removedIds, changed, unchanged }
}
