import fs from 'node:fs';
const b = '/Users/hhh0x/self-media/artifacts/director-skill-study/corpus/6a39118d000000002200a5e9';
const e = JSON.parse(fs.readFileSync(`${b}/evidence/evidence-pack.json`));
const p = JSON.parse(fs.readFileSync(`${b}/run/probe.json`));
const t = JSON.parse(fs.readFileSync(`${b}/run/targeted-evidence/targeted-evidence.json`));
const o = JSON.parse(fs.readFileSync(`${b}/run/targeted-evidence/ocr-evidence.json`));
const r = JSON.parse(fs.readFileSync(`${b}/run/reconstruction.json`));
const ids = {
  cue: new Set(e.transcript.cues.map(x => x.id)),
  shot: new Set(e.shots.map(x => x.id)),
  frame: new Set(e.frameIndex.map(x => x.id)),
  targeted_frame: new Set(t.frames.map(x => x.id)),
  ocr: new Set(o.frames.flatMap(x => x.lines.map(y => y.id))),
  source: new Set(r.derivedSources.map(x => x.id))
};
const evidenceRefs = [...r.knowledgeUnits.flatMap(x => x.evidence), ...r.relations.flatMap(x => x.evidence)];
const badRefs = evidenceRefs.filter(x => !ids[x.refType]?.has(x.ref));
const anyIds = new Set(Object.values(ids).flatMap(s => [...s]));
const coverageRefs = [...r.coverageMatrix.relationships.flatMap(x => x.evidenceRefs), ...r.coverageMatrix.criticalQuestions.flatMap(x => x.evidenceRefs)];
const badCoverageRefs = coverageRefs.filter(x => !anyIds.has(x));
const temporalIndex = new Map();
for (const x of e.transcript.cues) temporalIndex.set(x.id, {start: x.start, end: x.end});
for (const x of e.shots) temporalIndex.set(x.id, {start: x.start, end: x.end});
for (const x of e.frameIndex) temporalIndex.set(x.id, {start: x.time, end: x.time});
for (const x of t.frames) temporalIndex.set(x.id, {start: x.time, end: x.time});
for (const x of o.frames) for (const y of x.lines) temporalIndex.set(y.id, {start: x.time, end: x.time});
for (const x of r.derivedSources) temporalIndex.set(x.id, x.timeRange);
const epsilon = 0.05;
const overlaps = (a, b) => a.end + epsilon >= b.start && a.start - epsilon <= b.end;
const timestampViolations = r.knowledgeUnits.flatMap(unit => unit.evidence.flatMap(ref => {
  const span = temporalIndex.get(ref.ref);
  return span && !overlaps(span, unit.timeRange) ? [{unitId: unit.id, ref: ref.ref, unitRange: unit.timeRange, evidenceRange: span}] : [];
}));
const unitById = new Map(r.knowledgeUnits.map(x => [x.id, x]));
// Relationship coverage rows deliberately have no unitIds; their endpoints are
// validated separately in the relation graph. Critical-question rows carry the
// unit linkage needed for a meaningful timestamp-bound check.
const coverageRows = r.coverageMatrix.criticalQuestions;
const coverageTimestampViolations = coverageRows.flatMap(row => row.evidenceRefs.flatMap(ref => {
  const span = temporalIndex.get(ref);
  const linkedUnits = row.unitIds.map(id => unitById.get(id)).filter(Boolean);
  return span && linkedUnits.length && !linkedUnits.some(unit => overlaps(span, unit.timeRange))
    ? [{rowId: row.id, ref, evidenceRange: span, linkedUnitRanges: linkedUnits.map(x => ({unitId: x.id, timeRange: x.timeRange}))}]
    : [];
}));
const eq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const unitIds = new Set(r.knowledgeUnits.map(x => x.id));
const badEdges = r.relations.filter(x => x.from === x.to || !unitIds.has(x.from) || !unitIds.has(x.to));
const requiredAuditEdges = [
  ['KU-01', 'KU-02', 'goal_depends_on_foundation'],
  ['KU-02', 'KU-03', 'foundation_frames_relationship_conversion'],
  ['KU-07', 'KU-07A', 'topic_to_person_mapping']
];
const auditEdgeClosure = requiredAuditEdges.map(([from, to, relation]) => ({
  from, to, relation, found: r.relations.some(x => x.from === from && x.to === to && x.relation === relation)
}));
const audio = JSON.parse(fs.readFileSync(`${b}/run/audio-review/audio-classification.json`));
const sourcePaths = r.derivedSources.map(x => ({id: x.id, exists: fs.existsSync(`${b}/run/${x.path}`)}));
const checks = {
  actions: t.actions.length,
  frames: t.frames.length,
  ocrFrames: o.frames.length,
  refs: evidenceRefs.length,
  badRefs,
  badCoverageRefs,
  timestampViolations,
  coverageTimestampViolations,
  badEdges,
  auditEdgeClosure,
  audio: {
    duration: audio.duration,
    windows: audio.windows.length,
    speechWindows: audio.detections.speechLike.length,
    musicWindows: audio.detections.musicLike.length,
    sfxWindows: audio.detections.sfxLike.length,
    toolBoundary: audio.toolBoundary
  },
  sourcePaths,
  cues: r.transcript.cues.length,
  cueRows: r.coverageMatrix.cueAccountability.length,
  transcriptExact: JSON.stringify(r.transcript.cues) === JSON.stringify(e.transcript.cues.map(c => ({id:c.id,start:c.start,end:c.end,text:c.text,representativeFrame:c.representativeFrame,overlappingShots:c.overlappingShots}))),
  carriersClosed: eq(new Set(p.informationCarriers.map(x => x.id)), new Set(r.coverageMatrix.channels.map(x => x.id))),
  meaningClosed: eq(new Set(p.meaningChanges.map(x => x.id)), new Set(r.coverageMatrix.meaningChanges.map(x => x.id))),
  relationshipsClosed: eq(new Set(p.relationshipHypotheses.map(x => x.id)), new Set(r.coverageMatrix.relationships.map(x => x.id))),
  questionsClosed: eq(new Set(p.criticalQuestions.map(x => x.id)), new Set(r.coverageMatrix.criticalQuestions.map(x => x.id))),
  core: r.coverageMatrix.coreEvidence,
  unchecked: r.coverageMatrix.uncheckedChannels,
  meta: r.metaGate
};
console.log(JSON.stringify(checks, null, 2));
if (badRefs.length || badCoverageRefs.length || timestampViolations.length || coverageTimestampViolations.length || badEdges.length || auditEdgeClosure.some(x => !x.found) || sourcePaths.some(x => !x.exists) || !checks.transcriptExact || !checks.carriersClosed || !checks.meaningClosed || !checks.relationshipsClosed || !checks.questionsClosed || checks.cues !== checks.cueRows || checks.unchecked.length || !checks.meta.pass) process.exit(1);
