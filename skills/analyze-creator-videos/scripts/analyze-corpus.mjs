#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.input || !args.out) {
  console.error('Usage: analyze-corpus.mjs --input <creator-corpus.json> --out <corpus-analysis.json>')
  process.exit(2)
}

const inputPath = path.resolve(args.input)
const outputPath = path.resolve(args.out)
const corpus = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const posts = corpus.posts ?? []
const rowsWithLikes = posts.filter((post) => Number.isFinite(post.metrics?.likes))
const likes = rowsWithLikes.map((post) => post.metrics.likes).sort((a, b) => a - b)

const quantile = (values, q) => {
  if (!values.length) return null
  const position = (values.length - 1) * q
  const base = Math.floor(position)
  const fraction = position - base
  return values[base + 1] === undefined ? values[base] : values[base] + fraction * (values[base + 1] - values[base])
}
const median = (values) => quantile([...values].sort((a, b) => a - b), 0.5)
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const rounded = (value) => value === null ? null : Math.round(value)
const stats = (items) => {
  const values = items.map((post) => post.metrics?.likes).filter(Number.isFinite).sort((a, b) => a - b)
  return {
    count: items.length,
    measuredCount: values.length,
    medianLikes: rounded(median(values)),
    meanLikes: rounded(mean(values)),
    maxLikes: values.length ? values.at(-1) : null,
    hits10k: values.filter((value) => value >= 10000).length
  }
}

const buckets = [
  { label: '<100', test: (value) => value < 100 },
  { label: '100–499', test: (value) => value >= 100 && value < 500 },
  { label: '500–999', test: (value) => value >= 500 && value < 1000 },
  { label: '1k–4,999', test: (value) => value >= 1000 && value < 5000 },
  { label: '5k–9,999', test: (value) => value >= 5000 && value < 10000 },
  { label: '≥10k', test: (value) => value >= 10000 }
].map((bucket) => {
  const count = likes.filter(bucket.test).length
  return { label: bucket.label, count, share: likes.length ? Number((count / likes.length * 100).toFixed(1)) : 0 }
})

const clusterStats = (field) => {
  const groups = new Map()
  for (const post of posts) {
    const tags = post.annotations?.[field]?.length ? post.annotations[field] : ['unclassified']
    for (const tag of tags) {
      if (!groups.has(tag)) groups.set(tag, [])
      groups.get(tag).push(post)
    }
  }
  return [...groups.entries()]
    .map(([name, items]) => ({ name, ...stats(items) }))
    .sort((a, b) => b.count - a.count || (b.medianLikes ?? -1) - (a.medianLikes ?? -1))
}

const q10 = quantile(likes, 0.1)
const q50 = quantile(likes, 0.5)
const q90 = quantile(likes, 0.9)
const meanLikes = mean(likes)
const ascendingPosts = [...rowsWithLikes].sort((a, b) => a.metrics.likes - b.metrics.likes)
const smallCorpus = likes.length < 30
const thirdSize = Math.max(1, Math.ceil(ascendingPosts.length / 3))
const lowPool = smallCorpus
  ? ascendingPosts.slice(0, thirdSize)
  : rowsWithLikes.filter((post) => post.metrics.likes <= q10).sort((a, b) => a.metrics.likes - b.metrics.likes)
const highPool = smallCorpus
  ? ascendingPosts.slice(-thirdSize).reverse()
  : rowsWithLikes.filter((post) => post.metrics.likes >= q90).sort((a, b) => b.metrics.likes - a.metrics.likes)
const medianCandidates = smallCorpus
  ? ascendingPosts.slice(thirdSize, Math.max(thirdSize + 1, ascendingPosts.length - thirdSize))
  : rowsWithLikes.filter((post) => post.metrics.likes >= quantile(likes, 0.4) && post.metrics.likes <= quantile(likes, 0.6))
const medianPool = [...(medianCandidates.length ? medianCandidates : rowsWithLikes)].sort((a, b) => Math.abs(a.metrics.likes - q50) - Math.abs(b.metrics.likes - q50))
const meanPool = [...rowsWithLikes].sort((a, b) => Math.abs(a.metrics.likes - meanLikes) - Math.abs(b.metrics.likes - meanLikes))
const nearestMeanDistance = meanPool.length && meanLikes !== null ? Math.abs(meanPool[0].metrics.likes - meanLikes) : null
const nearestMeanRelativeDistance = nearestMeanDistance === null || !meanLikes ? null : nearestMeanDistance / meanLikes
const lowerMeanNeighbor = [...rowsWithLikes].filter((post) => post.metrics.likes <= meanLikes).sort((a, b) => b.metrics.likes - a.metrics.likes)[0] ?? null
const upperMeanNeighbor = [...rowsWithLikes].filter((post) => post.metrics.likes >= meanLikes).sort((a, b) => a.metrics.likes - b.metrics.likes)[0] ?? null
const percentileRank = (value) => likes.length ? Number((likes.filter((candidate) => candidate <= value).length / likes.length * 100).toFixed(1)) : null
const candidate = (post) => ({
  id: post.id,
  title: post.title,
  likes: post.metrics.likes,
  percentileRank: percentileRank(post.metrics.likes),
  distanceFromMedian: q50 === null ? null : Math.round(Math.abs(post.metrics.likes - q50)),
  distanceFromMean: meanLikes === null ? null : Math.round(Math.abs(post.metrics.likes - meanLikes)),
  durationSec: post.durationSec,
  publishedAt: post.publishedAt,
  topicTags: post.annotations?.topicTags ?? [],
  formatTags: post.annotations?.formatTags ?? [],
  mechanisms: post.annotations?.contentMechanisms ?? []
})

const dated = posts.map((post) => ({ post, date: post.publishedAt ? new Date(post.publishedAt) : null }))
  .filter(({ date }) => date && !Number.isNaN(date.getTime()))
const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const dayparts = [
  { name: '凌晨', test: (hour) => hour < 6 },
  { name: '早间', test: (hour) => hour >= 6 && hour < 12 },
  { name: '午后', test: (hour) => hour >= 12 && hour < 18 },
  { name: '晚间', test: (hour) => hour >= 18 }
]
const timeGroup = (names, selector) => names.map((name) => {
  const items = dated.filter(({ date }) => selector(date) === name).map(({ post }) => post)
  return { name, ...stats(items) }
})

const output = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  source: inputPath,
  creator: corpus.creator,
  coverage: {
    posts: posts.length,
    videos: posts.filter((post) => post.mediaType === 'video').length,
    likesMeasured: likes.length,
    likesMissing: posts.length - likes.length
  },
  overview: {
    ...stats(posts),
    p10: rounded(q10),
    p25: rounded(quantile(likes, 0.25)),
    p75: rounded(quantile(likes, 0.75)),
    p90: rounded(q90),
    distribution: buckets
  },
  topicClusters: clusterStats('topicTags'),
  formatClusters: clusterStats('formatTags'),
  candidatePools: {
    method: smallCorpus ? 'equal thirds plus separate nearest-mean anchor' : 'top decile, 40th–60th percentile near median, nearest arithmetic mean, bottom decile',
    thresholds: { q10: rounded(q10), median: rounded(q50), mean: rounded(meanLikes), q90: rounded(q90) },
    high: highPool.slice(0, Math.min(7, highPool.length)).map(candidate),
    median: medianPool.slice(0, Math.min(7, medianPool.length)).map(candidate),
    average: meanPool.slice(0, Math.min(7, meanPool.length)).map(candidate),
    low: lowPool.slice(0, Math.min(7, lowPool.length)).map(candidate),
    overlap: {
      medianAndAverage: medianPool.slice(0, Math.min(7, medianPool.length)).map((post) => post.id).filter((id) => meanPool.slice(0, Math.min(7, meanPool.length)).some((post) => post.id === id))
    },
    averageAnchor: {
      status: nearestMeanRelativeDistance !== null && nearestMeanRelativeDistance <= 0.25 ? 'natural_cluster' : 'mean_gap',
      nearestDistance: rounded(nearestMeanDistance),
      nearestRelativeDistance: nearestMeanRelativeDistance === null ? null : Number(nearestMeanRelativeDistance.toFixed(3)),
      lowerNeighbor: lowerMeanNeighbor ? candidate(lowerMeanNeighbor) : null,
      upperNeighbor: upperMeanNeighbor ? candidate(upperMeanNeighbor) : null,
      interpretation: nearestMeanRelativeDistance !== null && nearestMeanRelativeDistance <= 0.25
        ? 'Posts exist within 25% of the arithmetic mean.'
        : 'No post is close to the arithmetic mean; treat the mean as a synthetic long-tail anchor and compare the nearest lower/upper posts instead of inventing an average tier.'
    }
  },
  publishing: {
    weekdays: timeGroup(weekdayNames, (date) => weekdayNames[date.getDay()]),
    dayparts: timeGroup(dayparts.map((item) => item.name), (date) => dayparts.find((item) => item.test(date.getHours()))?.name)
  },
  boundaries: [
    'Public engagement snapshots are not views, retention, conversion, or follower growth.',
    'Accumulated likes are confounded by post age, account stage, packaging, distribution, and unknown promotion.',
    'Overlapping annotation labels make cluster totals non-additive.'
  ]
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: outputPath, posts: posts.length, likesMeasured: likes.length }))
