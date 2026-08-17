#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
for (const key of ['reconstruction', 'title', 'out']) {
  if (!args[key]) {
    console.error('Usage: render-reconstruction-report.mjs --reconstruction <reconstruction.json> [--targeted <targeted-evidence.json>] --title <title> --out <report.md>')
    process.exit(2)
  }
}

const reconstructionPath = path.resolve(args.reconstruction)
const reconstruction = JSON.parse(fs.readFileSync(reconstructionPath, 'utf8'))
const evidencePack = JSON.parse(fs.readFileSync(reconstruction.evidencePack, 'utf8'))
const targetedPath = args.targeted ? path.resolve(args.targeted) : null
const targeted = targetedPath ? JSON.parse(fs.readFileSync(targetedPath, 'utf8')) : { frames: [] }
const targetedRoot = targetedPath ? path.dirname(targetedPath) : null
const targetedMap = new Map((targeted.frames ?? []).map((frame) => [frame.id, frame]))
const evidenceRoot = path.dirname(reconstruction.evidencePack)
const fmt = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(value / 60)
  return `${String(minutes).padStart(2, '0')}:${(value - minutes * 60).toFixed(2).padStart(5, '0')}`
}
const esc = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', '<br>')
const provenance = { raw_fact: '原始事实', visual_observation: '画面观察', author_claim: '作者主张', system_inference: '系统推断', unknown: '未知' }
const unitImage = (unit) => {
  const ref = unit.evidence?.find((item) => item.refType === 'targeted_frame' && targetedMap.has(item.ref))
  if (!ref) return null
  return path.resolve(targetedRoot, targetedMap.get(ref.ref).frame)
}

const lines = []
lines.push(`# ${args.title}`)
lines.push('')
lines.push(`> ${reconstruction.scopeStatement}`)
lines.push('')
lines.push('## 一句话还原')
lines.push('')
lines.push(`- 看前：${reconstruction.viewerChange?.before ?? ''}`)
lines.push(`- 看后：${reconstruction.viewerChange?.after ?? ''}`)
for (const change of reconstruction.viewerChange?.intendedChanges ?? []) lines.push(`- 认知变化：${change}`)

for (const group of [
  { importance: 'core', title: '核心内容' },
  { importance: 'supporting', title: '支撑信息' },
  { importance: 'context', title: '证据边界与上下文' }
]) {
  const units = reconstruction.knowledgeUnits.filter((unit) => unit.importance === group.importance)
  if (!units.length) continue
  lines.push('', `## ${group.title}`, '')
  for (const unit of units) {
    lines.push(`### ${unit.title}`)
    lines.push('')
    lines.push(`时间：${fmt(unit.timeRange.start)}–${fmt(unit.timeRange.end)}　层级：${provenance[unit.provenance] ?? unit.provenance}　置信度：${unit.confidence}`)
    lines.push('')
    lines.push(unit.statement)
    const image = unitImage(unit)
    if (image) lines.push('', `![${esc(unit.title)}](${image})`)
    if (unit.procedural) {
      lines.push('', '**操作还原**', '')
      lines.push(`- 输入：${unit.procedural.input}`)
      unit.procedural.actions.forEach((action, index) => lines.push(`- 步骤 ${index + 1}：${action}`))
      if (unit.procedural.parameters.length) lines.push(`- 参数/选择：${unit.procedural.parameters.join('；')}`)
      lines.push(`- 输出：${unit.procedural.output}`)
      if (unit.procedural.unknowns.length) lines.push(`- 未展示：${unit.procedural.unknowns.join('；')}`)
    }
    if (unit.argument) {
      lines.push('', '**论证结构**', '')
      lines.push(`- 论点：${unit.argument.claim}`)
      if (unit.argument.conditions.length) lines.push(`- 条件：${unit.argument.conditions.join('；')}`)
      if (unit.argument.counterexamples.length) lines.push(`- 反例：${unit.argument.counterexamples.join('；')}`)
      if (unit.argument.actions.length) lines.push(`- 行动：${unit.argument.actions.join('；')}`)
      if (unit.argument.limits.length) lines.push(`- 限制：${unit.argument.limits.join('；')}`)
    }
    if (unit.unknowns.length) lines.push('', `未知：${unit.unknowns.join('；')}`)
    lines.push('')
  }
}

lines.push('## 内容关系', '')
for (const relation of reconstruction.relations ?? []) {
  const from = reconstruction.knowledgeUnits.find((unit) => unit.id === relation.from)?.title ?? relation.from
  const to = reconstruction.knowledgeUnits.find((unit) => unit.id === relation.to)?.title ?? relation.to
  lines.push(`- ${from} → ${to}：${relation.relation}`)
}
lines.push('', '## 明确不能从视频判断', '')
for (const item of reconstruction.coverageMatrix?.unknowns ?? []) lines.push(`- ${item}`)

lines.push('', '## 完整机器逐字稿与证据映射', '')
lines.push('> 这是本地机器转写，不是官方字幕。原始文本不静默修正；每条 cue 均对应代表帧和全部 overlapping shots。')
lines.push('')
lines.push('| Cue | 时间 | 原始机器转写 | 代表帧 | Overlapping shots |')
lines.push('|---|---:|---|---|---|')
for (const cue of reconstruction.transcript.cues) {
  const frame = path.resolve(evidenceRoot, cue.representativeFrame)
  lines.push(`| ${cue.id} | ${fmt(cue.start)}–${fmt(cue.end)} | ${esc(cue.text)} | [查看帧](${frame}) | ${cue.overlappingShots.join(', ')} |`)
}

lines.push('', '## 完整性自检', '')
lines.push(`- 核心知识证据：${reconstruction.coverageMatrix.coreEvidence.covered}/${reconstruction.coverageMatrix.coreEvidence.total}`)
lines.push(`- 未检查通道：${reconstruction.coverageMatrix.uncheckedChannels.length ? reconstruction.coverageMatrix.uncheckedChannels.join('、') : '无'}`)
lines.push(`- Meta-gate：${reconstruction.metaGate.pass ? '内部通过' : '未通过'}；${reconstruction.metaGate.rationale}`)
lines.push('- 注意：内部自检不等于独立 reviewer 验证。')

const outputPath = path.resolve(args.out)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`)
console.log(JSON.stringify({ ok: true, output: outputPath, units: reconstruction.knowledgeUnits.length, cues: reconstruction.transcript.cues.length }))
