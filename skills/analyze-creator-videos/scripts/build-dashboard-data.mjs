#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
for (const required of ['corpus', 'stats', 'analysis', 'selection', 'out']) {
  if (!args[required]) {
    console.error('Usage: build-dashboard-data.mjs --corpus <creator-corpus.json> --stats <corpus-analysis.json> --analysis <creator-analysis.json> --selection <selection.json> --out <dashboard-data.json>')
    process.exit(2)
  }
}
const read = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
const corpus = read(args.corpus)
const stats = read(args.stats)
const analysis = read(args.analysis)
const selection = read(args.selection)
const deepSet = selection.deepSet ?? selection.videos ?? []
const selectedById = new Map(deepSet.map((item) => [typeof item === 'string' ? item : item.id, typeof item === 'string' ? { id: item } : item]))
const poolMembership = new Map()
for (const tier of ['high', 'median', 'average', 'low']) {
  for (const item of stats.candidatePools?.[tier] ?? []) {
    if (!poolMembership.has(item.id)) poolMembership.set(item.id, [])
    poolMembership.get(item.id).push(tier)
  }
}
const chooseTier = (post) => {
  const selected = selectedById.get(post.id)
  if (selected?.tier && ['high', 'median', 'average', 'low'].includes(selected.tier)) return selected.tier
  const memberships = poolMembership.get(post.id) ?? []
  if (memberships.includes('high')) return 'high'
  if (memberships.includes('low')) return 'low'
  if (memberships.includes('median')) return 'median'
  if (memberships.includes('average')) return 'average'
  return 'other'
}
const first = (values, fallback = '') => Array.isArray(values) && values.length ? values[0] : fallback
const tierLabel = { high: '高表现', median: '中位数附近', average: '平均值附近', low: '低表现' }
const tierAnalysis = new Map((analysis.tierComparison ?? []).map((tier) => [tier.tier, tier]))
const candidatePool = (tier) => stats.candidatePools?.[tier] ?? []
const tiers = ['high', 'median', 'average', 'low'].map((tier) => {
  const detail = tierAnalysis.get(tier) ?? {}
  const pool = candidatePool(tier)
  return {
    tier, label: tierLabel[tier], sampleSize: detail.sampleSize ?? pool.length,
    medianLikes: detail.medianLikes ?? (tier === 'median' ? stats.candidatePools?.thresholds?.median : tier === 'average' ? stats.candidatePools?.thresholds?.mean : null),
    patterns: detail.observedPatterns ?? [], mechanisms: detail.mechanismHypotheses ?? [], failures: detail.failureModes ?? [],
    evidenceRefs: detail.evidenceRefs ?? pool.map((item) => item.id),
    diagnostic: tier === 'average' ? stats.candidatePools?.averageAnchor ?? null : null
  }
})
const posts = (corpus.posts ?? []).map((post) => {
  const selected = selectedById.get(post.id)
  return {
    id: post.id, title: post.title, tier: chooseTier(post), likes: post.metrics?.likes ?? null,
    collections: post.metrics?.collections ?? null, comments: post.metrics?.comments ?? null, shares: post.metrics?.shares ?? null,
    publishedAt: post.publishedAt ?? post.publishedLabel ?? null, durationSec: post.durationSec ?? null,
    cover: post.media?.coverPath ?? null, sourceUrl: post.sourceUrl ?? null,
    topicTags: post.annotations?.topicTags ?? [], formatTags: post.annotations?.formatTags ?? [],
    coreMessage: post.coreMessage ?? post.contentIntent ?? post.postCopy?.slice(0, 180) ?? '尚未完成逐条内容主旨标注。',
    mechanism: selected?.representedMechanism ?? first(post.annotations?.contentMechanisms, '待验证'),
    evidenceStatus: selected?.gateStatus === 'ready' ? 'ready' : selected ? 'selected' : 'portfolio'
  }
})
const deepDives = (analysis.deepDives ?? deepSet).map((item) => ({
  postId: item.postId ?? item.id,
  selectionReason: item.selectionReason ?? '已进入深度样本，但尚未补充选择理由。',
  representedMechanism: item.representedMechanism ?? '待验证机制',
  gateStatus: item.gateStatus ?? 'pending',
  reportPath: item.reportPath ?? item.reconstructionPath ?? null,
  viewerChange: item.viewerChange ?? {}, knowledgeUnits: item.knowledgeUnits ?? [],
  sparseFrames: item.sparseFrames ?? [], denseFrames: item.denseFrames ?? [], transcript: item.transcript ?? [], unknowns: item.unknowns ?? []
}))
const output = {
  schemaVersion: '1.0', title: analysis.title ?? `${corpus.creator.name}｜博主视频研究台`, generatedAt: new Date().toISOString(),
  creator: corpus.creator,
  analysisContract: analysis.analysisContract,
  overview: {
    postCount: stats.coverage?.posts ?? corpus.posts.length, videoCount: stats.coverage?.videos ?? corpus.posts.filter((post) => post.mediaType === 'video').length,
    medianLikes: stats.overview?.medianLikes ?? null, meanLikes: stats.overview?.meanLikes ?? null, maxLikes: stats.overview?.maxLikes ?? null,
    distribution: stats.overview?.distribution ?? []
  },
  positioning: analysis.positioning,
  topicClusters: stats.topicClusters ?? [], formatClusters: stats.formatClusters ?? [], tiers, posts, deepDives,
  publishing: { conclusion: analysis.publishing?.conclusion ?? '公开发布时间与内容变量同时变化，仅用于观察。', weekdays: stats.publishing?.weekdays ?? [], dayparts: stats.publishing?.dayparts ?? [] },
  visualLanguage: analysis.visualLanguage ?? [],
  launchPlan: analysis.launchSystem ?? { positioning: '', lanes: [], firstTwelve: [], experiments: [] },
  boundaries: [...new Set([...(stats.boundaries ?? []), ...(analysis.unknowns ?? []), analysis.evidenceBoundary].filter(Boolean))]
}
const outputPath = path.resolve(args.out)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: outputPath, posts: posts.length, deepDives: deepDives.length, meanAnchor: stats.candidatePools?.averageAnchor?.status ?? null }))
