#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))

for (const required of ['input', 'rules', 'out']) {
  if (!args[required]) {
    console.error('Usage: apply-portfolio-annotations.mjs --input <inventory.json> --rules <annotation-rules.json> --out <annotated-inventory.json>')
    process.exit(2)
  }
}

const inputPath = path.resolve(args.input)
const rulesPath = path.resolve(args.rules)
const outputPath = path.resolve(args.out)
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const config = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))
const postsKey = Array.isArray(input.items) ? 'items' : Array.isArray(input.posts) ? 'posts' : null
if (!postsKey) throw new Error('Input must contain items or posts array')

const unique = (values) => [...new Set(values.filter(Boolean))]
const matches = (rule, text, post) => {
  if (rule.mediaTypes?.length && !rule.mediaTypes.includes(post.mediaType)) return false
  return (rule.patterns ?? []).some((pattern) => new RegExp(pattern, 'iu').test(text))
}
const addFields = (target, add = {}) => {
  for (const key of ['topicTags', 'formatTags', 'audienceTags', 'hookTypes', 'proofModes', 'visualPatterns', 'contentMechanisms', 'likelyAudienceActions']) {
    target[key] = unique([...(target[key] ?? []), ...(add[key] ?? [])])
  }
}

const selectedIds = new Set(config.deepSampleIds ?? [])
const posts = input[postsKey].map((post) => {
  const text = [post.title, post.postCopy, ...(post.hashtags ?? [])].filter(Boolean).join('\n')
  const annotations = {
    topicTags: [], formatTags: [], audienceTags: [], hookTypes: [], proofModes: [], visualPatterns: [],
    contentMechanisms: [], likelyAudienceActions: []
  }
  for (const rule of config.rules ?? []) {
    if (matches(rule, text, post)) addFields(annotations, rule.add)
  }
  addFields(annotations, config.overrides?.[post.id]?.add)
  if (!annotations.topicTags.length) annotations.topicTags = [config.defaults?.topicTag ?? '其他/未归类']
  if (!annotations.formatTags.length) annotations.formatTags = [config.defaults?.formatTag ?? '观点/解释']
  if (!annotations.contentMechanisms.length) annotations.contentMechanisms = [config.defaults?.mechanism ?? '观点价值']
  annotations.annotationEvidence = selectedIds.has(post.id)
    ? '标题与公开详情初标；需由深度视频还原继续校正。'
    : '仅依据公开标题、媒介类型与已采公开文案做轻量标注；不等于完整视频理解。'
  return { ...post, annotations }
})

const output = {
  ...input,
  [postsKey]: posts,
  annotationMethod: {
    schemaVersion: '1.0',
    rulesPath,
    generatedAt: new Date().toISOString(),
    scope: 'portfolio_light_annotation',
    deepSampleCount: selectedIds.size,
    boundaries: [
      'Non-deep posts are tagged from public titles, media type, and available public copy only.',
      'Overlapping labels are intentional; cluster totals are non-additive.',
      'Deep-sample labels remain provisional until reconstruction evidence is merged.'
    ]
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: outputPath, posts: posts.length, deepSampleCount: selectedIds.size }))
