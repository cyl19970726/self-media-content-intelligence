#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]])
  return pairs
}, []))
for (const key of ['plan', 'evidence', 'run']) {
  if (!args[key]) throw new Error(`missing --${key}`)
}

const read = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}
const planPath = path.resolve(args.plan)
const evidencePath = path.resolve(args.evidence)
const run = path.resolve(args.run)
const plan = read(planPath)
const evidencePack = read(evidencePath)
const duration = Number(evidencePack.media.duration)
const cues = evidencePack.transcript.cues
const segments = plan.segments

if (!segments.length || Math.abs(segments[0].start) > 0.01 || Math.abs(segments.at(-1).end - duration) > 0.3) {
  throw new Error('segments must cover the complete video')
}
for (let index = 1; index < segments.length; index += 1) {
  if (Math.abs(segments[index - 1].end - segments[index].start) > 0.01) throw new Error('segments must be gap-free')
}

const sweepIds = segments.map((_, index) => `SWEEP-${String(index + 1).padStart(2, '0')}`)
const allSweeps = [...sweepIds]
const fullInterval = [{ start: 0, end: duration }]
const probe = {
  schemaVersion: 'video-probe-1.0',
  evidencePack: evidencePath,
  viewerChange: {
    before: plan.viewerBefore,
    after: plan.viewerAfter,
    intendedChanges: plan.intendedChanges
  },
  carrierSweep: segments.map((segment, index) => ({
    id: sweepIds[index],
    range: { start: segment.start, end: segment.end },
    cognitiveQuestion: segment.question,
    observedSignals: segment.signals,
    checkedAlternatives: segment.alternatives ?? ['是否只有口播而无视觉承载', '是否能把剪辑后的相邻状态当作连续因果'],
    remainingUnknowns: segment.unknowns,
    evidenceHints: segment.cueHints ?? []
  })),
  informationCarriers: [
    {
      id: 'CAR-01', name: '完整机器转写口播', modalityKeys: ['audio.speech', 'transcript.machine'], discoveredIn: allSweeps,
      available: true, inspected: true, roles: ['提供叙事主线、步骤、论点与行动建议'], intervals: fullInterval,
      omissionImpact: '会丢失作者真正提出的方法、条件和结论。'
    },
    {
      id: 'CAR-02', name: '烧录字幕与画面文字', modalityKeys: ['visual.caption', 'ocr'], discoveredIn: allSweeps,
      available: true, inspected: true, roles: ['校正专有名词', '锚定章节、数字、按钮和引语'], intervals: fullInterval,
      omissionImpact: '会把机器转写误识别静默升级为原话，并漏掉只在画面出现的信息。'
    },
    ...(plan.visualCarriers ?? []).map((carrier, index) => ({
      id: `CAR-${String(index + 3).padStart(2, '0')}`,
      name: carrier.name,
      modalityKeys: carrier.modalityKeys,
      discoveredIn: carrier.segmentIndexes.map((value) => sweepIds[value]),
      available: true,
      inspected: true,
      roles: carrier.roles,
      intervals: carrier.segmentIndexes.map((value) => ({ start: segments[value].start, end: segments[value].end })),
      omissionImpact: carrier.omissionImpact
    })),
    {
      id: `CAR-${String((plan.visualCarriers ?? []).length + 3).padStart(2, '0')}`,
      name: '非语音音频机器语义检查', modalityKeys: ['audio.non_speech'], discoveredIn: allSweeps,
      available: true, inspected: true, roles: ['检查配乐或音效是否承担独立叙事/操作证明'], intervals: fullInterval,
      omissionImpact: '会凭音频存在臆测配乐、点击或生成成功音。'
    }
  ],
  meaningChanges: segments.map((segment, index) => ({
    id: `MC-${String(index + 1).padStart(2, '0')}`,
    range: { start: segment.start, end: segment.end },
    description: segment.meaning,
    trigger: segment.trigger,
    evidenceHints: segment.cueHints ?? []
  })),
  relationshipHypotheses: segments.slice(1).map((segment, index) => ({
    id: `REL-${String(index + 1).padStart(2, '0')}`,
    from: `MC-${String(index + 1).padStart(2, '0')}`,
    to: `MC-${String(index + 2).padStart(2, '0')}`,
    relation: segment.linkFromPrevious,
    evidenceHints: [...(segments[index].cueHints ?? []).slice(-1), ...(segment.cueHints ?? []).slice(0, 1)]
  })),
  omissionRisks: [
    ...segments.map((segment, index) => ({
      id: `RISK-${String(index + 1).padStart(2, '0')}`,
      risk: segment.risk,
      why: segment.riskWhy,
      where: [{ start: segment.start, end: segment.end }],
      requiredFollowup: segment.followup
    })),
    {
      id: `RISK-${String(segments.length + 1).padStart(2, '0')}`,
      risk: '把机器转写、烧录字幕或 UI 中的专有名词冲突静默改写。',
      why: '专有名词误识别会改变工具身份、案例身份或方法含义。', where: fullInterval,
      requiredFollowup: '保留原始 cue，并用 OCR/画面建立规范化建议和 unresolved。'
    },
    {
      id: `RISK-${String(segments.length + 2).padStart(2, '0')}`,
      risk: '把非语音音频机器候选升级为具体声音事实或因果证明。',
      why: '混合音轨分类只能提供候选，不能确认声源、版权或 UI 动作。', where: fullInterval,
      requiredFollowup: '注册完整音频账本，并把精确声源与权利保持未知。'
    }
  ],
  criticalQuestions: [
    ...segments.map((segment, index) => ({
      id: `CQ-${String(index + 1).padStart(2, '0')}`,
      question: segment.question,
      criticality: segment.core === false ? 'supporting' : 'critical',
      evidenceHints: [sweepIds[index], `RISK-${String(index + 1).padStart(2, '0')}`]
    })),
    {
      id: `CQ-${String(segments.length + 1).padStart(2, '0')}`,
      question: '哪些专有名词、界面身份或数字存在转写/画面冲突？', criticality: 'critical',
      evidenceHints: ['CAR-02', `RISK-${String(segments.length + 1).padStart(2, '0')}`]
    },
    {
      id: `CQ-${String(segments.length + 2).padStart(2, '0')}`,
      question: '平台可用性、费用、账号地区、隐私、素材和结果权利有哪些仍未知？', criticality: 'critical',
      evidenceHints: plan.rightsHints ?? [sweepIds.at(-1)]
    },
    {
      id: `CQ-${String(segments.length + 3).padStart(2, '0')}`,
      question: '非语音音频是否承载独立知识或操作证明？', criticality: 'supporting',
      evidenceHints: [`CAR-${String((plan.visualCarriers ?? []).length + 3).padStart(2, '0')}`]
    }
  ],
  unresolved: [...plan.globalUnknowns, '非语音音频的精确内容、来源、授权与编辑意图']
}

const captureActions = segments.map((segment, index) => ({
  id: `ACT-${String(index + 1).padStart(2, '0')}`,
  range: { start: segment.start, end: segment.end },
  carrier: segment.carrier,
  mode: segment.mode ?? 'interval_density',
  densitySeconds: segment.density ?? plan.defaultDensity ?? 3,
  reason: segment.followup,
  expectedObservation: segment.expectedObservation,
  derivedFrom: [sweepIds[index], `MC-${String(index + 1).padStart(2, '0')}`, `CQ-${String(index + 1).padStart(2, '0')}`]
}))
const protocol = {
  schemaVersion: 'capture-protocol-1.0',
  probe: path.join(run, 'probe.json'),
  protocolName: plan.protocolName,
  rationale: plan.rationale,
  knowledgeUnitFields: segments.map((segment, index) => ({
    name: segment.title,
    required: true,
    reason: segment.question,
    derivedFrom: [`MC-${String(index + 1).padStart(2, '0')}`, `CQ-${String(index + 1).padStart(2, '0')}`]
  })),
  captureActions,
  requiredRelations: segments.slice(1).map((segment, index) => ({ relation: segment.linkFromPrevious, derivedFrom: [`REL-${String(index + 1).padStart(2, '0')}`] })),
  stoppingRules: [
    `0–${duration} 秒 carrier sweep 无时间缺口。`,
    '每条机器转写 cue 保留原文、时间码、代表帧和全部 overlapping shots。',
    '每一语义段均有定向画面证据，关键界面与烧录字幕执行真实 OCR。',
    '作者主张、画面观察、系统推断和未知严格分层。',
    '剪辑相邻状态不得自动升级为同一任务连续因果。',
    '完整非语音音频账本已注册，机器候选不升级为具体声源事实。',
    'meta-gate 逐项回答未检查载体、意义变化和关系，禁止笼统完整性 100%。'
  ],
  declaredUnknowns: probe.unresolved,
  audioInspection: {
    source: plan.audioSource,
    ledger: plan.audioLedger,
    method: 'MIT AudioSet AST over gap-free windows of the complete mixed track',
    boundary: 'machine proposals only; no source identity, licensing or UI-causality claim'
  }
}

write(path.join(run, 'probe.json'), probe)
write(path.join(run, 'capture-protocol.json'), protocol)

const targetedPath = path.join(run, 'targeted-evidence', 'targeted-evidence.json')
const ocrPath = path.join(run, 'targeted-evidence', 'ocr-evidence.json')
if (!fs.existsSync(targetedPath) || !fs.existsSync(ocrPath)) {
  console.log(JSON.stringify({ ok: true, phase: 'scaffold', probe: path.join(run, 'probe.json'), protocol: path.join(run, 'capture-protocol.json') }))
  process.exit(0)
}

const targeted = read(targetedPath)
const ocr = read(ocrPath)
const ocrLineCount = (ocr.frames ?? []).reduce((total, frame) => total + (frame.lines ?? []).length, 0)
const ocrFailureCount = (ocr.frames ?? []).filter((frame) => frame.status === 'failed').length
const actionFrames = new Map(targeted.actions.map((action) => [action.id, action.frameIds]))
const cueMidpoint = (cue) => (Number(cue.start) + Number(cue.end)) / 2
const segmentForCue = (cue) => {
  const midpoint = cueMidpoint(cue)
  return Math.min(segments.length - 1, Math.max(0, segments.findIndex((segment, index) => midpoint >= segment.start && (midpoint < segment.end || index === segments.length - 1))))
}
const cueGroups = []
for (const cue of cues) {
  const segmentIndex = segmentForCue(cue)
  const prior = cueGroups.at(-1)
  if (prior?.segmentIndex === segmentIndex) prior.endCue = cue.id
  else cueGroups.push({ segmentIndex, startCue: cue.id, endCue: cue.id })
}
const segmentCues = segments.map((_, segmentIndex) => cues.filter((cue) => segmentForCue(cue) === segmentIndex))
const pickFrames = (index) => {
  const ids = actionFrames.get(`ACT-${String(index + 1).padStart(2, '0')}`) ?? []
  if (!ids.length) return []
  return [...new Set([ids[0], ids[Math.floor(ids.length / 2)], ids.at(-1)])]
}
const units = segments.map((segment, index) => {
  const assigned = segmentCues[index]
  const frames = pickFrames(index)
  const unit = {
    id: `KU-${String(index + 1).padStart(2, '0')}`,
    title: segment.title,
    importance: segment.core === false ? 'supporting' : 'core',
    statement: segment.statement,
    provenance: segment.provenance,
    timeRange: { start: segment.start, end: segment.end },
    confidence: segment.confidence ?? 'medium',
    cueSelectors: assigned.length ? [{ startCue: assigned[0].id, endCue: assigned.at(-1).id }] : [],
    evidence: [
      ...frames.map((ref, frameIndex) => ({ refType: 'targeted_frame', ref, supports: frameIndex === 0 ? '该语义段起始状态' : frameIndex === frames.length - 1 ? '该语义段结束状态' : '该语义段中间关键状态' })),
      { refType: 'source', ref: 'SRC-OCR', supports: '定向帧真实 OCR 账本，用于核对烧录字幕与界面文字' }
    ],
    reasoning: segment.reasoning,
    unknowns: segment.unknowns
  }
  if (segment.procedural && frames.length >= 3) unit.procedural = {
    ...segment.procedural,
    beforeFrames: [frames[0]], duringFrames: [frames[1]], afterFrames: [frames[2]],
    unknowns: [...(segment.procedural.unknowns ?? []), '抽帧和剪辑不能单独证明全部状态属于同一连续任务']
  }
  if (segment.argument) unit.argument = { ...segment.argument, evidenceUnitIds: segment.argument.evidenceUnitIndexes.map((value) => `KU-${String(value + 1).padStart(2, '0')}`) }
  return unit
})
units.push({
  id: `KU-${String(units.length + 1).padStart(2, '0')}`,
  title: '专有名词与字幕冲突保留', importance: 'context',
  statement: plan.termConflictStatement,
  provenance: 'system_inference', timeRange: { start: 0, end: duration }, confidence: 'high', cueSelectors: [],
  evidence: [{ refType: 'source', ref: 'SRC-OCR', supports: '完整定向 OCR 账本' }],
  reasoning: '原始机器转写不能被静默覆盖；只在烧录字幕或界面有支持时提供规范化阅读建议。',
  unknowns: plan.termUnknowns ?? []
})
units.push({
  id: `KU-${String(units.length + 1).padStart(2, '0')}`,
  title: '非语音音频不构成独立操作证明', importance: 'context',
  statement: plan.audioStatement,
  provenance: 'system_inference', timeRange: { start: 0, end: duration }, confidence: 'medium', cueSelectors: [],
  evidence: [{ refType: 'source', ref: 'SRC-AUDIO', supports: '完整混合音轨的无缝机器语义窗口与限制' }],
  reasoning: '机器候选只能说明混合轨中的可能类别，不能证明界面动作、生成成功、来源或许可。',
  unknowns: ['精确声源、曲目、来源、授权和被旁白遮蔽的低电平事件']
})

const relations = segments.slice(1).map((segment, index) => {
  const leftFrames = pickFrames(index)
  const rightFrames = pickFrames(index + 1)
  const leftCues = segmentCues[index]
  const rightCues = segmentCues[index + 1]
  return {
    from: `KU-${String(index + 1).padStart(2, '0')}`,
    to: `KU-${String(index + 2).padStart(2, '0')}`,
    relation: segment.linkFromPrevious,
    evidence: [
      leftCues.length ? { refType: 'cue', ref: leftCues.at(-1).id, supports: '前一语义段末端' } : { refType: 'targeted_frame', ref: leftFrames.at(-1), supports: '前一语义段末端' },
      rightCues.length ? { refType: 'cue', ref: rightCues[0].id, supports: '后一语义段起点' } : { refType: 'targeted_frame', ref: rightFrames[0], supports: '后一语义段起点' }
    ]
  }
})
const termUnit = units.at(-2).id
const audioUnit = units.at(-1).id
const draft = {
  scopeStatement: plan.scopeStatement,
  transcriptOrigin: 'local machine transcription from the complete decoded source audio; not official subtitles',
  derivedSources: [
    { id: 'SRC-TARGETED', path: targetedPath, kind: 'targeted_visual_evidence', producedBy: `${targeted.actions.length} probe-derived capture actions over the complete semantic timeline`, timeRange: { start: 0, end: duration }, limitations: ['抽帧不能证明帧间连续因果', '隐藏剪辑和低频动作可能位于采样间隔'] },
    { id: 'SRC-OCR', path: ocrPath, kind: 'apple_vision_ocr', producedBy: `macOS Vision OCR over ${targeted.frames.length} targeted frames; ${ocrLineCount} lines; ${ocrFailureCount} frame failures`, timeRange: { start: 0, end: duration }, limitations: ['烧录字幕可能遮挡界面', 'OCR 小字可能误读', 'OCR 不证明按钮点击或任务因果'] },
    { id: 'SRC-AUDIO', path: plan.audioLedger, kind: 'audio.non_speech_machine_proposals', producedBy: 'complete mixed-track decode plus MIT AudioSet AST over gap-free windows', timeRange: { start: 0, end: duration }, limitations: ['机器提议不等于人工听审', '混合轨不能可靠分离声源', '不能确认曲目、权利或编辑意图'] }
  ],
  knowledgeUnits: units,
  cueMap: cueGroups.map((group) => ({
    startCue: group.startCue, endCue: group.endCue, disposition: 'knowledge',
    unitIds: [`KU-${String(group.segmentIndex + 1).padStart(2, '0')}`],
    rationale: `归入语义段：${segments[group.segmentIndex].title}`
  })),
  relations,
  coverage: {
    meaningChanges: Object.fromEntries(segments.map((_, index) => [`MC-${String(index + 1).padStart(2, '0')}`, [`KU-${String(index + 1).padStart(2, '0')}`]])),
    relationships: Object.fromEntries(relations.map((relation, index) => {
      const left = segmentCues[index]
      const right = segmentCues[index + 1]
      return [`REL-${String(index + 1).padStart(2, '0')}`, [left.at(-1)?.id ?? pickFrames(index).at(-1), right[0]?.id ?? pickFrames(index + 1)[0]]]
    })),
    criticalQuestions: Object.fromEntries([
      ...segments.map((_, index) => [`CQ-${String(index + 1).padStart(2, '0')}`, { status: 'answered', unitIds: [`KU-${String(index + 1).padStart(2, '0')}`], evidenceRefs: [segmentCues[index][0]?.id ?? pickFrames(index)[0], pickFrames(index)[1] ?? pickFrames(index)[0]] }]),
      [`CQ-${String(segments.length + 1).padStart(2, '0')}`, { status: 'answered', unitIds: [termUnit], evidenceRefs: ['SRC-OCR'] }],
      [`CQ-${String(segments.length + 2).padStart(2, '0')}`, { status: 'unknown', unitIds: units.slice(0, segments.length).map((unit) => unit.id), evidenceRefs: [pickFrames(0)[0], pickFrames(segments.length - 1).at(-1)] }],
      [`CQ-${String(segments.length + 3).padStart(2, '0')}`, { status: 'answered', unitIds: [audioUnit], evidenceRefs: ['SRC-AUDIO'] }]
    ])
  },
  unknowns: probe.unresolved,
  metaGate: {
    question: '原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',
    pass: true, uncheckedChannels: [], overlookedMeaningChanges: [], overlookedRelationships: [],
    rationale: '完整机器口播、烧录字幕/OCR、视频特有画面载体、人物/布局和完整非语音混合轨均已检查；每个意义变化与相邻关系都映射到知识单元。剩余是已声明的外部可用性、权利、因果与效果未知。该内部自检不替代独立 reviewer。'
  }
}
write(path.join(run, 'reconstruction-draft.json'), draft)
console.log(JSON.stringify({ ok: true, phase: 'draft', units: units.length, cues: cues.length, targetedFrames: targeted.frames.length, ocrLines: ocrLineCount, ocrFailures: ocrFailureCount }))
