import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const researchRoot = path.resolve(appRoot, '..')
const libraryPath = path.resolve(researchRoot, '../video-library/library.json')
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'))

const externalEvidence = {
  '69129479000000000700ac96': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-tool-map/evidence-v2/evidence-pack.json'),
  '6928316c000000001e0397ba': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-workflow/evidence-v2/evidence-pack.json'),
  '66011c23000000000d00ed40': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-argument/evidence-v2/evidence-pack.json'),
  '663ac5da000000001e03437a': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/holdout2-3d/evidence/evidence-pack.json'),
}

const externalReconstruction = {
  '69129479000000000700ac96': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-tool-map/skill-run-v2/reconstruction.json'),
  '6928316c000000001e0397ba': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-workflow/skill-run-v2/reconstruction.json'),
  '66011c23000000000d00ed40': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-argument/skill-run-v2/reconstruction.json'),
  '663ac5da000000001e03437a': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/holdout2-3d/skill-run/reconstruction.json'),
}

const externalReports = {
  '69129479000000000700ac96': '/artifacts/video-content-reconstruction-eval/dev-tool-map/skill-run-v2/article.md',
  '6928316c000000001e0397ba': '/artifacts/video-content-reconstruction-eval/dev-workflow/skill-run-v2/article.md',
  '66011c23000000000d00ed40': '/artifacts/video-content-reconstruction-eval/dev-argument/skill-run-v2/article.md',
  '663ac5da000000001e03437a': '/artifacts/video-content-reconstruction-eval/holdout2-3d/skill-run/article.md',
}

const externalGates = {
  '69129479000000000700ac96': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-tool-map/evaluation-skill-v2/gate-report.json'),
  '6928316c000000001e0397ba': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-workflow/evaluation-skill-v2/gate-report.json'),
  '66011c23000000000d00ed40': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/dev-argument/evaluation-skill-v2/gate-report.json'),
  '663ac5da000000001e03437a': path.resolve(appRoot, '../../../../video-content-reconstruction-eval/holdout2-3d/evaluation-skill/gate-report.json'),
}

const featuredIds = new Set([
  // High: single-task save value, tool-map discovery, mass narrative.
  '6801c0750000000007037156',
  '690ac8730000000004014f67',
  '69424c0d000000001e039745',
  // Median: full workflow, visual demo, industry interpretation.
  '6928316c000000001e0397ba',
  '67af1032000000001902d33d',
  '6832e96a000000002100405d',
  // Low: short demo counterexample, finished-output causality gap, long viewpoint.
  '66ee9136000000001201188a',
  '6726eb1c000000003c0175f3',
  '66011c23000000000d00ed40',
])

const firstExisting = (files) => files.find((file) => fs.existsSync(file))

const mimeFor = (file) => file.endsWith('.png') ? 'image/png' : 'image/jpeg'
const asDataUrl = (file) => `data:${mimeFor(file)};base64,${fs.readFileSync(file).toString('base64')}`
const asWorkspaceUrl = (file) => file.replace('/Users/hhh0x/self-media', '')
const normalizeUnknown = (value) => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return String(value)
  const label = value.item ?? value.topic ?? value.claim ?? value.description ?? value.question ?? '未决问题'
  const scope = value.scope ?? value.status ?? value.reason ?? ''
  return scope ? `${label}（${scope}）` : label
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

const videos = library.videos.map((video) => {
  const localHour = (new Date(video.publishedAt).getUTCHours() + 8) % 24
  const localDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(video.publishedAt))

  const localBase = path.resolve(researchRoot, 'videos', video.id)
  const localGate = externalGates[video.id] ?? firstExisting([
    path.resolve(localBase, 'evaluation-v4/gate-report.json'),
    path.resolve(localBase, 'evaluation-v3/gate-report.json'),
    path.resolve(localBase, 'evaluation-v2/gate-report.json'),
    path.resolve(localBase, 'evaluation/gate-report.json'),
  ])
  const gate = localGate ? JSON.parse(fs.readFileSync(localGate, 'utf8')) : null
  const evidencePath = externalEvidence[video.id] ?? path.resolve(localBase, 'evidence/evidence-pack.json')
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  const reconstructionPath = externalReconstruction[video.id] ?? path.resolve(localBase, 'skill-run/reconstruction.json')
  const reconstruction = JSON.parse(fs.readFileSync(reconstructionPath, 'utf8'))
  const cutCount = evidence.sceneDetection?.cuts?.length ?? Math.max(0, (evidence.shots?.length ?? 1) - 1)
  const cueCount = evidence.transcript?.cues?.length ?? 0
  const shotFrames = (evidence.frameIndex ?? []).filter((frame) => frame.purpose === 'shot_representative')
  const frameFromIndex = (index) => {
    const frame = shotFrames[index]
    const file = path.resolve(path.dirname(evidencePath), frame.frame)
    return { id: frame.id, time: frame.time, src: asDataUrl(file) }
  }
  const frameChoices = [...new Set([0, Math.floor((shotFrames.length - 1) / 2), shotFrames.length - 1])]
    .filter((index) => index >= 0 && shotFrames[index])
    .map(frameFromIndex)
  const denseCount = Math.min(12, shotFrames.length)
  const denseFrames = [...new Set(Array.from({ length: denseCount }, (_, index) => Math.round(index * (shotFrames.length - 1) / Math.max(1, denseCount - 1))))]
    .filter((index) => shotFrames[index])
    .map(frameFromIndex)
  const coreUnits = reconstruction.knowledgeUnits.filter((unit) => unit.importance === 'core')
  const claims = coreUnits.filter((unit) => unit.provenance === 'author_claim').slice(0, 4)
  const observations = coreUnits.filter((unit) => ['visual_observation', 'raw_fact'].includes(unit.provenance)).slice(0, 5)
  const inferences = coreUnits.filter((unit) => unit.provenance === 'system_inference').slice(0, 3)

  const reportFile = firstExisting([
    path.resolve(localBase, 'skill-run/report.md'),
    path.resolve(localBase, 'skill-run/article.md'),
    path.resolve(localBase, 'skill-run/reconstruction-report.md'),
  ])
  const reportPath = externalReports[video.id] ?? (reportFile
    ? `/artifacts/creator-research/ai-red-witch/content-reconstruction-v1/videos/${video.id}/skill-run/${path.basename(reportFile)}`
    : null)

  return {
    id: video.id,
    featured: featuredIds.has(video.id),
    title: video.title,
    tier: video.tier,
    duration: video.duration,
    publishedAt: video.publishedAt,
    publishedLocal: localDate,
    publishHour: localHour,
    engagement: video.engagement,
    cutCount,
    cutsPerMinute: Number((cutCount * 60 / video.duration).toFixed(1)),
    cueCount,
    cuesPerMinute: Number((cueCount * 60 / video.duration).toFixed(1)),
    content: {
      viewerChange: {
        before: reconstruction.viewerChange?.before ?? reconstruction.viewerChange?.from,
        after: reconstruction.viewerChange?.after ?? reconstruction.viewerChange?.to,
      },
      coreUnits: coreUnits.map(({ id, title, statement, provenance, confidence, timeRange }) => ({ id, title, statement, provenance, confidence, timeRange })),
      transcript: (reconstruction.transcript?.cues ?? []).map((cue) => {
        const cueFrame = cue.representativeFrame ? path.resolve(path.dirname(evidencePath), cue.representativeFrame) : null
        return {
          id: cue.id,
          start: cue.start,
          end: cue.end,
          text: cue.text,
          overlappingShots: cue.overlappingShots ?? [],
          frame: cueFrame && fs.existsSync(cueFrame) ? asWorkspaceUrl(cueFrame) : null,
        }
      }),
      claims: claims.map(({ id, title, statement, confidence, timeRange }) => ({ id, title, statement, confidence, timeRange })),
      observations: observations.map(({ id, title, statement, confidence, timeRange }) => ({ id, title, statement, confidence, timeRange })),
      inferences: inferences.map(({ id, title, statement, confidence, timeRange }) => ({ id, title, statement, confidence, timeRange })),
      unknowns: (reconstruction.coverageMatrix?.unknowns ?? []).slice(0, 8).map(normalizeUnknown),
    },
    frames: frameChoices,
    denseFrames,
    reportPath,
    ready: gate?.ready === true,
  }
})

const tiers = Object.fromEntries(['high', 'median', 'low'].map((tier) => {
  const rows = videos.filter((video) => video.tier === tier)
  return [tier, {
    count: rows.length,
    medianLikes: median(rows.map((row) => row.engagement.likes)),
    averageLikes: Math.round(average(rows.map((row) => row.engagement.likes))),
    medianDuration: Number(median(rows.map((row) => row.duration)).toFixed(1)),
    averageDuration: Number(average(rows.map((row) => row.duration)).toFixed(1)),
    medianCollectionToLike: Number(median(rows.map((row) => row.engagement.collectionToLike)).toFixed(3)),
    medianShareToLike: Number(median(rows.map((row) => row.engagement.shareToLike)).toFixed(3)),
    under30Seconds: rows.filter((row) => row.duration < 30).length,
    medianCutsPerMinute: Number(median(rows.map((row) => row.cutsPerMinute)).toFixed(1)),
    medianCuesPerMinute: Number(median(rows.map((row) => row.cuesPerMinute)).toFixed(1)),
    publishHours: rows.map((row) => row.publishHour),
  }]
}))

const output = {
  generatedAt: new Date().toISOString(),
  sourceGeneratedAt: library.generatedAt,
  creator: library.creator,
  sampleSize: videos.length,
  featuredCount: videos.filter((video) => video.featured).length,
  readyCount: videos.filter((video) => video.ready).length,
  tiers,
  videos,
}

fs.writeFileSync(path.resolve(appRoot, 'src/generated-metadata.json'), `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${videos.length} videos; ${output.readyCount} have local gate-report.ready=true`)
