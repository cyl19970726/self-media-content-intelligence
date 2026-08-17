#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '..'))
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const brief = read(path.join(root, 'creator-analysis-brief.json'))
const selection = read(path.join(root, 'selection.json'))
const corpus = read(path.join(root, 'creator-corpus.json'))
const corpusById = new Map(corpus.posts.map((post) => [post.id, post]))
const fmt = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(value / 60)
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(value - minutes * 60)).padStart(2, '0')}`
}

const deepDives = selection.deepSet.map((selected) => {
  const run = path.join(root, 'videos', selected.id, 'skill-run')
  const reconstruction = read(path.join(run, 'reconstruction.json'))
  const targeted = read(path.join(run, 'targeted-evidence', 'targeted-evidence.json'))
  const frameById = new Map(targeted.frames.map((frame) => [frame.id, frame]))
  const chosen = []
  for (const unit of reconstruction.knowledgeUnits.filter((unit) => unit.importance === 'core')) {
    const evidence = unit.evidence.find((item) => item.refType === 'targeted_frame' && frameById.has(item.ref))
    if (!evidence) continue
    const frame = frameById.get(evidence.ref)
    if (chosen.some((item) => item.id === frame.id)) continue
    chosen.push({
      id: frame.id,
      path: `../videos/${selected.id}/skill-run/targeted-evidence/${frame.frame}`,
      timecode: fmt(frame.time),
      caption: unit.title
    })
    if (chosen.length >= 8) break
  }
  return {
    postId: selected.id,
    selectionReason: selected.mechanismQuestion,
    representedMechanism: brief.deepDiveMechanisms[selected.id],
    gateStatus: '结构与证据 Schema 通过；未做独立 reviewer，不声明 READY',
    reportPath: null,
    viewerChange: reconstruction.viewerChange,
    knowledgeUnits: reconstruction.knowledgeUnits.filter((unit) => unit.importance !== 'context').map((unit) => ({
      id: unit.id,
      title: unit.title,
      statement: unit.statement,
      timecode: `${fmt(unit.timeRange.start)}–${fmt(unit.timeRange.end)}`,
      provenance: unit.provenance,
      confidence: unit.confidence,
      unknowns: unit.unknowns
    })),
    sparseFrames: chosen,
    transcript: reconstruction.transcript.cues.map((cue) => ({ id: cue.id, start: fmt(cue.start), end: fmt(cue.end), text: cue.text, representativeFrame: cue.representativeFrame, overlappingShots: cue.overlappingShots })),
    unknowns: reconstruction.coverageMatrix.unknowns
  }
})

const output = {
  title: brief.title,
  analysisContract: {
    why: brief.analysisContract.purpose,
    method: brief.analysisContract.method,
    decisions: brief.analysisContract.decisionUse,
    nonDecisions: brief.analysisContract.notFor
  },
  positioning: {
    name: '非技术 AI Builder 的公开建造与翻译系统',
    sentence: brief.positioning.oneLiner,
    audience: brief.positioning.audience.join('；'),
    job: brief.positioning.jobsToBeDone.join('；'),
    promise: '一个可见结果 + 一条复现路径 + 一个明确边界',
    proofSystem: brief.positioning.credibilityAssets.join('；'),
    credibilityDebt: brief.positioning.strategicTension,
    full: brief.positioning
  },
  tierComparison: brief.tierComparison,
  crossTierFindings: brief.crossTierFindings,
  publishing: brief.publishing,
  visualLanguage: brief.visualLanguage.map((item) => `${item.pattern}：${item.value}（适合 ${item.bestFor}）`),
  launchSystem: {
    ...brief.launchSystem,
    lanes: brief.launchSystem.lanes.map((lane) => ({ ...lane, promise: `${lane.share} · ${lane.formula}` })),
    experiments: brief.launchSystem.experiments.map((experiment) => ({ ...experiment, method: `${experiment.variable}；主指标：${experiment.primaryMetric}；守护：${experiment.guardrail}` }))
  },
  deepDives,
  unknowns: brief.unknowns,
  evidenceBoundary: brief.evidenceBoundary,
  contentPillars: brief.positioning.contentPillars,
  sourcePostTitles: Object.fromEntries(selection.deepSet.map((item) => [item.id, corpusById.get(item.id)?.title ?? item.id]))
}

fs.writeFileSync(path.join(root, 'creator-analysis.json'), `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: path.join(root, 'creator-analysis.json'), deepDives: deepDives.length, transcriptCues: deepDives.reduce((sum, dive) => sum + dive.transcript.length, 0) }))
