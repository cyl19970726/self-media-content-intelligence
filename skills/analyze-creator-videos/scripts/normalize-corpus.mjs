#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))

if (!args.input || !args.out) {
  console.error('Usage: normalize-corpus.mjs --input <json> --out <creator-corpus.json>')
  process.exit(2)
}

const inputPath = path.resolve(args.input)
const outputPath = path.resolve(args.out)
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const resolveInputPath = (value) => value ? (path.isAbsolute(value) ? value : path.resolve(path.dirname(inputPath), value)) : null

const parseCount = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  const raw = String(value).trim().replaceAll(',', '')
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(万|亿|[kKmM])?$/)
  if (!match) return null
  const scale = match[2] === '万' ? 1e4 : match[2] === '亿' ? 1e8 : /k/i.test(match[2] ?? '') ? 1e3 : /m/i.test(match[2] ?? '') ? 1e6 : 1
  return Math.round(Number(match[1]) * scale)
}

const uniqueStrings = (values) => [...new Set((Array.isArray(values) ? values : values ? [values] : [])
  .map((value) => String(value).trim())
  .filter(Boolean))]

const rawPosts = input.posts ?? input.videos ?? input.notes ?? input.items ?? []
if (!Array.isArray(rawPosts)) throw new Error('Input must contain posts, videos, notes, or items array')

const seen = new Set()
const posts = rawPosts.map((post, index) => {
  const id = String(post.id ?? post.noteId ?? post.note_id ?? post.awemeId ?? `row-${index + 1}`)
  if (seen.has(id)) throw new Error(`Duplicate post id: ${id}`)
  seen.add(id)

  const sourceMetrics = post.metrics ?? post.engagement ?? post.interactInfo ?? {}
  const sourceAnnotations = post.annotations ?? {}
  const mediaPath = resolveInputPath(post.mediaPath ?? post.videoPath ?? post.media?.videoPath ?? post.media?.file ?? null)
  const duration = post.durationSec ?? post.duration ?? post.media?.durationSeconds ?? post.media?.expectedDurationSec ?? null
  const inferredMediaType = post.mediaType
    ?? post.type
    ?? (mediaPath || duration ? 'video' : 'unknown')
  const mediaType = ['video', 'image', 'article', 'unknown'].includes(inferredMediaType) ? inferredMediaType : 'unknown'

  const topicTags = uniqueStrings(sourceAnnotations.topicTags ?? post.topicTags ?? post.secondaryTags)
  const formatTags = uniqueStrings(sourceAnnotations.formatTags ?? post.formatTags ?? post.primaryCategory)
  const contentMechanisms = uniqueStrings(sourceAnnotations.contentMechanisms ?? post.contentMechanisms)
  const likelyAudienceActions = uniqueStrings(sourceAnnotations.likelyAudienceActions ?? post.likelyAudienceActions)

  return {
    id,
    title: String(post.title ?? post.noteTitle ?? ''),
    sourceUrl: post.sourceUrl ?? post.url ?? post.noteUrl ?? null,
    mediaType,
    publishedAt: post.publishedAt ?? post.publishTime ?? post.published ?? null,
    publishedLabel: post.publishedLabel ?? post.publishLabel ?? null,
    durationSec: duration === null ? null : Number(duration),
    postCopy: post.postCopy ?? post.desc ?? post.description ?? null,
    hashtags: uniqueStrings(post.hashtags),
    topComments: Array.isArray(post.topComments) ? post.topComments : [],
    metrics: {
      likes: parseCount(sourceMetrics.likes ?? sourceMetrics.likedCount ?? sourceMetrics.liked_count),
      collections: parseCount(sourceMetrics.collections ?? sourceMetrics.collectedCount ?? sourceMetrics.collected_count),
      comments: parseCount(sourceMetrics.comments ?? sourceMetrics.commentCount ?? sourceMetrics.comment_count),
      shares: parseCount(sourceMetrics.shares ?? sourceMetrics.shareCount ?? sourceMetrics.share_count)
    },
    annotations: {
      topicTags: topicTags.length ? topicTags : ['unclassified'],
      formatTags: formatTags.length ? formatTags : ['unclassified'],
      audienceTags: uniqueStrings(sourceAnnotations.audienceTags ?? post.audienceTags),
      hookTypes: uniqueStrings(sourceAnnotations.hookTypes ?? post.hookTypes),
      proofModes: uniqueStrings(sourceAnnotations.proofModes ?? post.proofModes),
      visualPatterns: uniqueStrings(sourceAnnotations.visualPatterns ?? post.visualPatterns),
      contentMechanisms,
      likelyAudienceActions,
      annotationEvidence: sourceAnnotations.annotationEvidence
        ?? post.annotationEvidence
        ?? (post.primaryCategory || post.secondaryTags ? 'Imported from existing creator research annotations.' : '')
    },
    media: {
      videoPath: mediaPath,
      subtitlePath: resolveInputPath(post.subtitlePath ?? post.media?.subtitlePath ?? post.media?.subtitle ?? null),
      coverPath: resolveInputPath(post.coverPath ?? post.cover ?? post.media?.coverPath ?? null)
    }
  }
})

const sourceCreator = input.creator ?? input.author ?? {}
const creatorId = String(sourceCreator.id ?? sourceCreator.userId ?? sourceCreator.user_id ?? 'unknown-creator')
const output = {
  schemaVersion: '1.0',
  snapshotAt: input.snapshotAt ?? input.generatedAt ?? new Date().toISOString(),
  creator: {
    id: creatorId,
    name: String(sourceCreator.name ?? sourceCreator.nickname ?? creatorId),
    platform: String(sourceCreator.platform ?? input.platform ?? 'xiaohongshu'),
    profileUrl: sourceCreator.profileUrl ?? sourceCreator.url ?? null,
    bio: sourceCreator.bio ?? sourceCreator.desc ?? null,
    publicStats: {
      followers: parseCount(sourceCreator.publicStats?.followers ?? sourceCreator.followers),
      likesAndCollections: parseCount(sourceCreator.publicStats?.likesAndCollections ?? sourceCreator.likesAndCollections)
    }
  },
  collectionStatus: input.collectionStatus ?? null,
  posts
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: outputPath, posts: posts.length, videos: posts.filter((post) => post.mediaType === 'video').length }))
