#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const runFlag = process.argv.indexOf('--run')
if (runFlag < 0 || !process.argv[runFlag + 1]) {
  console.error('Usage: validate-run.mjs --run <run-dir>')
  process.exit(2)
}
const runRoot = path.resolve(process.argv[runFlag + 1])
const failures = []
const warnings = []
const required = [
  'analysis-contract.json',
  'run-manifest.json',
  'collection-inventory.json',
  'creator-corpus.json',
  'collection-status.json',
  'corpus-analysis.json',
  'selection.json',
  'creator-analysis.json',
  'dashboard-data.json',
  'dashboard/index.html',
  'dashboard/styles.css',
  'dashboard/app.js'
]
for (const file of required) {
  if (!fs.existsSync(path.resolve(runRoot, file))) failures.push(`missing:${file}`)
}

const read = (file) => JSON.parse(fs.readFileSync(path.resolve(runRoot, file), 'utf8'))
if (!failures.includes('missing:collection-status.json')) {
  const collection = read('collection-status.json')
  if (!['inventory_ready', 'deep_media_ready'].includes(collection.readiness)) failures.push(`collection:not-inventory-ready:${collection.readiness ?? 'missing'}`)
  if (collection.counts?.selectedForDeep > 0 && collection.readiness !== 'deep_media_ready') failures.push('collection:selected-media-not-ready')
}
if (!failures.includes('missing:selection.json')) {
  const selection = read('selection.json')
  const deepSet = selection.deepSet ?? []
  if (!deepSet.length) failures.push('selection:empty-deep-set')
  for (const item of deepSet) {
    if (!item.id) failures.push('selection:item-missing-id')
    if (!item.selectionReason) failures.push(`selection:${item.id ?? 'unknown'}:missing-reason`)
    if (!item.representedMechanism) failures.push(`selection:${item.id ?? 'unknown'}:missing-mechanism`)
  }
}

if (!failures.includes('missing:dashboard-data.json')) {
  const dashboard = read('dashboard-data.json')
  const postIds = new Set((dashboard.posts ?? []).map((post) => post.id))
  for (const dive of dashboard.deepDives ?? []) {
    if (!postIds.has(dive.postId)) failures.push(`dashboard:deep-dive-without-post:${dive.postId}`)
    if (dive.gateStatus === 'ready' && !dive.reportPath) warnings.push(`dashboard:ready-without-report-link:${dive.postId}`)
  }
  if (!(dashboard.boundaries ?? []).length) failures.push('dashboard:missing-boundaries')
}

if (!failures.includes('missing:dashboard/index.html') && !failures.includes('missing:dashboard/app.js')) {
  const html = fs.readFileSync(path.resolve(runRoot, 'dashboard/index.html'), 'utf8')
  const js = fs.readFileSync(path.resolve(runRoot, 'dashboard/app.js'), 'utf8')
  if (!html.includes('data-view="list"') || !html.includes('data-view="gallery"')) failures.push('dashboard:missing-list-gallery-controls')
  if (!js.includes('renderPosts') || !js.includes('renderDeepDive')) failures.push('dashboard:missing-required-renderers')
}

const report = {
  schemaVersion: '1.0',
  checkedAt: new Date().toISOString(),
  runRoot,
  ready: failures.length === 0,
  failures,
  warnings,
  browserSmoke: 'required-separately'
}
fs.writeFileSync(path.resolve(runRoot, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report))
process.exit(failures.length ? 1 : 0)
