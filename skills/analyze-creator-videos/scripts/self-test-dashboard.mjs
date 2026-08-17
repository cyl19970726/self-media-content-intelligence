#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const run = fs.mkdtempSync(path.join(os.tmpdir(), 'creator-dashboard-test-'))
const annotations = (topic, format, mechanism) => ({
  topicTags: [topic], formatTags: [format], audienceTags: ['AI入门者'], hookTypes: ['结果承诺'],
  proofModes: ['界面证据'], visualPatterns: ['竖屏真人加屏录'], contentMechanisms: [mechanism],
  likelyAudienceActions: ['收藏'], annotationEvidence: '测试夹具：标题、封面与可见界面。'
})
const likes = [40, 60, 80, 100, 130, 180, 8000, 20000]
const corpus = {
  schemaVersion: '1.0', snapshotAt: '2026-08-16T00:00:00+08:00',
  creator: { id: 'fixture-creator', name: '测试博主', platform: 'xiaohongshu', profileUrl: null, bio: '测试', publicStats: { followers: 10000, likesAndCollections: 50000 } },
  posts: likes.map((value, index) => ({
    id: `post-${index + 1}`, title: `测试视频 ${index + 1}`, sourceUrl: null, mediaType: 'video',
    publishedAt: `2026-08-${String(index + 1).padStart(2, '0')}T${String(9 + index).padStart(2, '0')}:00:00+08:00`, durationSec: 20 + index,
    postCopy: `用 AI 完成任务 ${index + 1}`, metrics: { likes: value, collections: null, comments: null, shares: null },
    annotations: annotations(index % 2 ? '职场提效' : 'AI工具', index % 3 ? '教程' : '效果展示', index >= 6 ? '结果可见' : '任务具体'),
    media: { videoPath: null, subtitlePath: null, coverPath: null }, raw: null
  }))
}
const contract = { why: '理解内容经营系统并形成起号决策。', method: '全量盘面、分层比较与证据级还原。', decisions: ['选题与形式'], nonDecisions: ['播放与转粉因果'] }
const tierComparison = ['high', 'median', 'average', 'low'].map((tier) => ({ tier, sampleSize: 2, observedPatterns: [`${tier} 观察`], mechanismHypotheses: [`${tier} 机制`], failureModes: [`${tier} 风险`], evidenceRefs: ['post-1'] }))
const analysis = {
  schemaVersion: '1.0', creatorId: 'fixture-creator', title: '测试博主｜内容操作系统', analysisContract: contract,
  positioning: { name: '任务翻译者', sentence: '把陌生 AI 变成普通人可完成的任务。', audience: 'AI入门者', job: '降低试错成本', promise: '给出可见结果', proofSystem: '真人解释与界面证据', credibilityDebt: '工具归因与时效需验证' },
  tierComparison, mechanisms: [{ id: 'M1', name: '任务具体', hypothesis: '任务越具体越易保存', evidenceRefs: ['post-1'], confidence: 'medium', experiment: '同题材只改任务表述' }],
  visualLanguage: ['竖屏真人建立信任', '屏录负责证明'],
  publishing: { conclusion: '样本只支持观察，不支持发布时间因果。' },
  launchSystem: { positioning: 'AI × 多平台自媒体工作流', lanes: [{ name: '教程线', promise: '可复现' }], firstTwelve: ['一条测试选题'], experiments: [{ name: '前3秒', method: '只改变结果披露' }] },
  unknowns: ['播放、留存与转粉未知'], evidenceBoundary: '公开互动仅是结果信号，不是因果证据。'
}
const deepSet = ['post-8', 'post-4', 'post-6', 'post-1'].map((id, index) => ({ id, tier: ['high', 'median', 'average', 'low'][index], selectionReason: '覆盖一种不同表现机制。', representedMechanism: '任务—证据结构', knownConfounds: ['发布时间'], gateStatus: 'pending', reportPath: null }))
const selection = { schemaVersion: '1.0', method: '分层后覆盖不同机制', averageAnchor: { status: 'mean_gap', decision: '使用均值上下边界，不伪造平均层。' }, comparisonSet: deepSet, deepSet }
const write = (name, value) => fs.writeFileSync(path.join(run, name), `${JSON.stringify(value, null, 2)}\n`)
write('creator-corpus.json', corpus); write('creator-analysis.json', analysis); write('selection.json', selection)
const exec = (command, args) => { const result = spawnSync(command, args, { encoding: 'utf8' }); if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`); return result.stdout.trim() }
exec('node', [path.join(root, 'scripts/analyze-corpus.mjs'), '--input', path.join(run, 'creator-corpus.json'), '--out', path.join(run, 'corpus-analysis.json')])
exec('node', [path.join(root, 'scripts/build-dashboard-data.mjs'), '--corpus', path.join(run, 'creator-corpus.json'), '--stats', path.join(run, 'corpus-analysis.json'), '--analysis', path.join(run, 'creator-analysis.json'), '--selection', path.join(run, 'selection.json'), '--out', path.join(run, 'dashboard-data.json')])
for (const [schema, file] of [['creator-corpus.schema.json','creator-corpus.json'],['creator-analysis.schema.json','creator-analysis.json'],['selection.schema.json','selection.json'],['dashboard-data.schema.json','dashboard-data.json']]) exec('python3', [path.join(root, 'scripts/validate-json.py'), '--schema', path.join(root, 'schemas', schema), '--data', path.join(run, file)])
exec('node', [path.join(root, 'scripts/render-dashboard.mjs'), '--data', path.join(run, 'dashboard-data.json'), '--out', path.join(run, 'dashboard')])
const html = fs.readFileSync(path.join(run, 'dashboard/index.html'), 'utf8')
const js = fs.readFileSync(path.join(run, 'dashboard/app.js'), 'utf8')
const dashboard = JSON.parse(fs.readFileSync(path.join(run, 'dashboard-data.json'), 'utf8'))
const checks = {
  listControl: html.includes('data-view="list"'), galleryControl: html.includes('data-view="gallery"'),
  renderPosts: js.includes('function renderPosts'), renderDeepDive: js.includes('function renderDeepDive'),
  fourTiers: dashboard.tiers.length === 4, meanGap: dashboard.tiers.find((x) => x.tier === 'average')?.diagnostic?.status === 'mean_gap',
  maxMetric: dashboard.overview.maxLikes === 20000, clusterMaximum: dashboard.topicClusters.every((x) => Object.hasOwn(x, 'maxLikes'))
}
if (Object.values(checks).some((value) => !value)) throw new Error(`Dashboard self-test failed: ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ ok: true, tests: Object.keys(checks).length, checks, run }))
