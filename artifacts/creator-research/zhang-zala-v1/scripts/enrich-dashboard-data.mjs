#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '..'))
const dashboardPath = path.resolve(process.argv[3] ?? path.join(root, 'dashboard', 'dashboard-data.json'))
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const data = read(dashboardPath)
const analysis = read(path.join(root, 'creator-analysis.json'))
const corpus = read(path.join(root, 'creator-corpus.json'))
const corpusById = new Map(corpus.posts.map((post) => [post.id, post]))
const diveById = new Map(analysis.deepDives.map((dive) => [dive.postId, dive]))

data.crossTierFindings = analysis.crossTierFindings
data.contentPillars = analysis.contentPillars
data.launchPlan.doNotCopy = analysis.launchSystem.doNotCopy
data.publishing.experimentRule = analysis.publishing.experimentRule

for (const post of data.posts) {
  const source = corpusById.get(post.id)
  const dive = diveById.get(post.id)
  if (dive) {
    post.cover = dive.sparseFrames[0]?.path ?? null
    post.coreMessage = dive.knowledgeUnits.find((unit) => unit.provenance !== 'context')?.statement ?? post.coreMessage
    post.mechanism = dive.representedMechanism
  } else {
    post.coreMessage = source?.postCopy?.split('\n').find(Boolean)?.trim() || source?.title || post.coreMessage
    post.mechanism = source?.annotations?.contentMechanisms?.slice(0, 2).join(' + ') || post.mechanism
  }
}

fs.writeFileSync(dashboardPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: dashboardPath, covers: data.posts.filter((post) => post.cover).length, findings: data.crossTierFindings.length }))
