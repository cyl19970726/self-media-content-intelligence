#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
for (const key of ['evidence', 'probe', 'protocol', 'draft', 'out']) {
  if (!args[key]) {
    console.error('Usage: assemble-reconstruction.mjs --evidence <evidence-pack.json> --probe <probe.json> --protocol <capture-protocol.json> --draft <draft.json> --out <reconstruction.json>')
    process.exit(2)
  }
}

const read = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
const evidencePath = path.resolve(args.evidence)
const probePath = path.resolve(args.probe)
const protocolPath = path.resolve(args.protocol)
const draftPath = path.resolve(args.draft)
const evidencePack = read(evidencePath)
const probe = read(probePath)
const protocol = read(protocolPath)
const draft = read(draftPath)
const cues = evidencePack.transcript?.cues ?? []
const cueIndex = new Map(cues.map((cue, index) => [cue.id, index]))

const expandCueSelector = (selector) => {
  if (selector.cueIds) return selector.cueIds
  const start = cueIndex.get(selector.startCue)
  const end = cueIndex.get(selector.endCue)
  if (start === undefined || end === undefined || end < start) throw new Error(`Invalid cue selector ${selector.startCue}..${selector.endCue}`)
  return cues.slice(start, end + 1).map((cue) => cue.id)
}

const units = (draft.knowledgeUnits ?? []).map((unit) => {
  const cueIds = [...new Set((unit.cueSelectors ?? []).flatMap(expandCueSelector))]
  const cueEvidence = cueIds.map((id) => ({ refType: 'cue', ref: id, supports: '对应时间段的机器转写原文；专有名词以画面/OCR冲突账本另行限定。' }))
  const { cueSelectors, evidence: extraEvidence = [], ...rest } = unit
  return { ...rest, evidence: [...cueEvidence, ...extraEvidence] }
})
const unitMap = new Map(units.map((unit) => [unit.id, unit]))

const cueAssignments = new Map()
for (const rule of draft.cueMap ?? []) {
  for (const cueId of expandCueSelector(rule)) {
    if (cueAssignments.has(cueId)) throw new Error(`Cue assigned twice: ${cueId}`)
    for (const unitId of rule.unitIds ?? []) if (!unitMap.has(unitId)) throw new Error(`Unknown unit in cueMap: ${unitId}`)
    cueAssignments.set(cueId, {
      cueId,
      disposition: rule.disposition,
      unitIds: rule.unitIds ?? [],
      rationale: rule.rationale
    })
  }
}
for (const cue of cues) {
  if (!cueAssignments.has(cue.id)) throw new Error(`Cue missing from cueMap: ${cue.id}`)
}

const relations = draft.relations ?? []
for (const relation of relations) {
  if (!unitMap.has(relation.from) || !unitMap.has(relation.to)) throw new Error(`Relation has unknown endpoint: ${relation.from} -> ${relation.to}`)
  if (relation.from === relation.to) throw new Error(`Relation self-edge: ${relation.from}`)
}
const core = units.filter((unit) => unit.importance === 'core')
const coveredCore = core.filter((unit) => unit.evidence?.length).length
const mapping = (draft.coverage ?? {})
const questionMap = mapping.criticalQuestions ?? {}
const meaningMap = mapping.meaningChanges ?? {}
const relationshipMap = mapping.relationships ?? {}
const carrierIsClosed = (carrier) => ["checked_readable", "checked_unreadable"].includes(
  carrier.inspectionStatus ?? (!carrier.available ? "absent" : carrier.inspected ? "checked_readable" : "unchecked")
)

const output = {
  schemaVersion: 'video-reconstruction-1.0',
  evidencePack: evidencePath,
  probe: probePath,
  protocol: protocolPath,
  scopeStatement: draft.scopeStatement,
  viewerChange: draft.viewerChange ?? probe.viewerChange,
  derivedSources: draft.derivedSources ?? [],
  transcript: {
    origin: draft.transcriptOrigin ?? evidencePack.transcript?.origin ?? 'machine transcript',
    cues: cues.map(({ id, start, end, text, representativeFrame, overlappingShots }) => ({ id, start, end, text, representativeFrame, overlappingShots }))
  },
  knowledgeUnits: units,
  relations,
  coverageMatrix: {
    channels: probe.informationCarriers.map(({ id, available, inspected, inspectionStatus, inspectionRationale }) => ({
      id, available, inspected, inspectionStatus, inspectionRationale
    })),
    meaningChanges: probe.meaningChanges.map((item) => ({ id: item.id, captured: Boolean(meaningMap[item.id]?.length), unitIds: meaningMap[item.id] ?? [] })),
    relationships: probe.relationshipHypotheses.map((item) => ({ id: item.id, evidenced: Boolean(relationshipMap[item.id]?.length), evidenceRefs: relationshipMap[item.id] ?? [] })),
    criticalQuestions: probe.criticalQuestions.map((item) => ({
      id: item.id,
      status: questionMap[item.id]?.status ?? 'unknown',
      unitIds: questionMap[item.id]?.unitIds ?? [],
      evidenceRefs: questionMap[item.id]?.evidenceRefs ?? []
    })),
    cueAccountability: cues.map((cue) => cueAssignments.get(cue.id)),
    coreEvidence: { covered: coveredCore, total: core.length },
    unknowns: draft.unknowns ?? probe.unresolved ?? [],
    uncheckedChannels: probe.informationCarriers.filter((carrier) => carrier.available && !carrierIsClosed(carrier)).map((carrier) => carrier.id)
  },
  metaGate: { questionId: 'uncovered_information_audit', ...draft.metaGate }
}

const outputPath = path.resolve(args.out)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: outputPath, cues: cues.length, units: units.length, core: `${coveredCore}/${core.length}`, relations: relations.length }))
