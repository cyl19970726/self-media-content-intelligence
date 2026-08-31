#!/usr/bin/env node
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { ensureInputFile, parseArgs, ratio, readJson, requireArg, writeJson } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const evidencePath = requireArg(args, "evidence");
const probePath = requireArg(args, "probe");
const protocolPath = requireArg(args, "protocol");
const reconstructionPath = requireArg(args, "reconstruction");
const evaluationPath = requireArg(args, "evaluation");
const targetedPath = args.targeted && args.targeted !== true ? requireArg(args, "targeted") : null;
const ocrPath = args.ocr && args.ocr !== true ? requireArg(args, "ocr") : null;
const out = args.out && args.out !== true ? requireArg(args, "out") : join(process.cwd(), "gate-report.json");
[evidencePath, probePath, protocolPath, reconstructionPath, evaluationPath, targetedPath, ocrPath].filter(Boolean).forEach((path) => ensureInputFile(path, "input"));

const evidence = readJson(evidencePath);
const probe = readJson(probePath);
const protocol = readJson(protocolPath);
const reconstruction = readJson(reconstructionPath);
const evaluation = readJson(evaluationPath);
const targetedInputs = targetedPath ? [readJson(targetedPath)] : [];
const ocrInputs = ocrPath ? [readJson(ocrPath)] : [];
const derivedArtifacts = [];
const loadedDerivedPaths = new Set([targetedPath, ocrPath].filter(Boolean).map((path) => resolve(path)));
for (const source of reconstruction.derivedSources || []) {
  const sourcePath = source?.path;
  if (!sourcePath || !existsSync(sourcePath) || loadedDerivedPaths.has(resolve(sourcePath))) continue;
  let derived;
  try { derived = readJson(sourcePath); } catch { continue; }
  if (derived.schemaVersion === "targeted-evidence-1.0") targetedInputs.push(derived);
  if (derived.schemaVersion === "ocr-evidence-1.0") ocrInputs.push(derived);
  if (["targeted-evidence-1.0", "ocr-evidence-1.0"].includes(derived.schemaVersion)) derivedArtifacts.push({ path: sourcePath, data: derived });
  loadedDerivedPaths.add(resolve(sourcePath));
}
const targeted = {
  frames: targetedInputs.flatMap((item) => item.frames || []),
  actions: targetedInputs.flatMap((item) => item.actions || [])
};
const ocr = {
  schemaVersion: ocrInputs.length ? "ocr-evidence-1.0" : undefined,
  frames: ocrInputs.flatMap((item) => item.frames || [])
};
const gates = [];
const gate = (id, pass, detail, examples = []) => gates.push({ id, pass: Boolean(pass), detail, examples });
const inspectionStatus = (carrier) => carrier.inspectionStatus
  || (!carrier.available ? "absent" : carrier.inspected ? "checked_readable" : "unchecked");
const carrierIsClosed = (carrier) => ["checked_readable", "checked_unreadable"].includes(inspectionStatus(carrier));
const carrierContractProblems = (carriers, scope) => carriers.flatMap((carrier) => {
  if (!carrier.inspectionStatus) return [];
  const expected = carrier.inspectionStatus === "absent"
    ? { available: false, inspected: false }
    : carrier.inspectionStatus === "unchecked"
      ? { available: true, inspected: false }
      : { available: true, inspected: true };
  const inconsistent = carrier.available !== expected.available || carrier.inspected !== expected.inspected;
  const missingRationale = typeof carrier.inspectionRationale !== "string" || carrier.inspectionRationale.trim().length === 0;
  return inconsistent || missingRationale ? [`${scope}:${carrier.id}:${carrier.inspectionStatus}`] : [];
});

const banned = [];
const scan = (value, path = "$") => {
  if (Array.isArray(value)) value.forEach((item, index) => scan(item, `${path}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => {
    if (/completenessPercent|overallCompleteness|overallCoveragePercent/i.test(key)) banned.push(`${path}.${key}`);
    scan(item, `${path}.${key}`);
  });
  else if (typeof value === "string" && /(完整性|completeness)\s*[:：]?\s*100\s*%/i.test(value)) banned.push(path);
};
scan(reconstruction);
gate("no_global_completeness_score", banned.length === 0, banned.length ? "Found banned global completeness claims" : "No global completeness percentage", banned);

const schemaPass = evidence.schemaVersion === "video-evidence-pack-1.0"
  && probe.schemaVersion === "video-probe-1.0"
  && protocol.schemaVersion === "capture-protocol-1.0"
  && reconstruction.schemaVersion === "video-reconstruction-1.0"
  && evaluation.schemaVersion === "reconstruction-evaluation-1.0"
  && (!ocrPath || ocr.schemaVersion === "ocr-evidence-1.0")
  && evaluation.independent === true;
gate("schema_contract", schemaPass, schemaPass ? "All schema versions and independent evaluation flag are valid" : "Schema contract mismatch");

const packCues = evidence.transcript?.cues || [];
const outputCues = reconstruction.transcript?.cues || [];
const transcriptProblems = [];
if (packCues.length !== outputCues.length) transcriptProblems.push(`cue count ${outputCues.length}/${packCues.length}`);
for (const cue of packCues) {
  const outputCue = outputCues.find((item) => item.id === cue.id);
  if (!outputCue) { transcriptProblems.push(`missing ${cue.id}`); continue; }
  if (outputCue.text !== cue.text || outputCue.start !== cue.start || outputCue.end !== cue.end) transcriptProblems.push(`verbatim mismatch ${cue.id}`);
  if (outputCue.representativeFrame !== cue.representativeFrame) transcriptProblems.push(`frame mismatch ${cue.id}`);
  if (JSON.stringify(outputCue.overlappingShots) !== JSON.stringify(cue.overlappingShots)) transcriptProblems.push(`shot overlap mismatch ${cue.id}`);
}
gate("verbatim_transcript_and_overlap", transcriptProblems.length === 0, transcriptProblems.length ? "Transcript contract failed" : "Every cue, representative frame, and overlapping shot is preserved", transcriptProblems.slice(0, 20));

const availableCarriers = (probe.informationCarriers || []).filter((item) => item.available);
const uncheckedProbeCarriers = availableCarriers.filter((item) => !carrierIsClosed(item)).map((item) => item.id);
gate("probe_inspects_available_carriers", uncheckedProbeCarriers.length === 0, uncheckedProbeCarriers.length ? "Probe left available carriers unchecked" : "All available carriers inspected", uncheckedProbeCarriers);

const sweep = [...(probe.carrierSweep || [])].sort((a, b) => (a.range?.start || 0) - (b.range?.start || 0));
const sweepIds = new Set(sweep.map((item) => item.id));
const sweepProblems = [];
let sweepCursor = 0;
for (const region of sweep) {
  const start = Number(region.range?.start);
  const end = Number(region.range?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > sweepCursor + 0.25 || end < start) sweepProblems.push(`${region.id}:range_or_gap`);
  sweepCursor = Math.max(sweepCursor, end || 0);
  if (!region.checkedAlternatives?.length || !region.evidenceHints?.length) sweepProblems.push(`${region.id}:unsubstantiated_sweep`);
}
if (!sweep.length || sweepCursor < (evidence.media?.duration || 0) - 0.25) sweepProblems.push(`timeline_coverage:${sweepCursor}/${evidence.media?.duration || 0}`);
for (const carrier of probe.informationCarriers || []) {
  if (!carrier.modalityKeys?.length || !carrier.discoveredIn?.length || carrier.discoveredIn.some((id) => !sweepIds.has(id))) sweepProblems.push(`${carrier.id}:missing_sweep_trace`);
}
if (evidence.media?.hasAudio === true) {
  const audioCarrier = (probe.informationCarriers || []).find((item) => item.modalityKeys?.some((key) => /(^|[._-])non[._-]?speech($|[._-])|non[._-]?speech[._-]?audio|audio[._-]?non[._-]?speech/i.test(key)));
  if (!audioCarrier || !carrierIsClosed(audioCarrier)) sweepProblems.push("non_speech_audio:not_explicitly_inspected");
}
gate("full_timeline_carrier_sweep", sweepProblems.length === 0, sweepProblems.length ? "Carrier discovery did not close the full timeline or audio channel" : "Carrier sweep covers the source and traces every discovered carrier", sweepProblems);

const probeIds = new Set([
  ...(probe.carrierSweep || []).map((item) => item.id),
  ...(probe.informationCarriers || []).map((item) => item.id),
  ...(probe.meaningChanges || []).map((item) => item.id),
  ...(probe.relationshipHypotheses || []).map((item) => item.id),
  ...(probe.omissionRisks || []).map((item) => item.id),
  ...(probe.criticalQuestions || []).map((item) => item.id)
]);
const derivationProblems = [];
for (const field of protocol.knowledgeUnitFields || []) {
  if (!field.derivedFrom?.length || field.derivedFrom.some((id) => !probeIds.has(id))) derivationProblems.push(`field:${field.name}`);
}
for (const action of protocol.captureActions || []) {
  if (!action.derivedFrom?.length || action.derivedFrom.some((id) => !probeIds.has(id))) derivationProblems.push(`action:${action.id}`);
}
gate("protocol_is_probe_derived", derivationProblems.length === 0, derivationProblems.length ? "Protocol contains generic or unresolved derivations" : "Every protocol field and action traces to the probe", derivationProblems);

const cueIds = new Set(packCues.map((item) => item.id));
const shotIds = new Set((evidence.shots || []).map((item) => item.id));
const frameTimes = new Map((evidence.frameIndex || []).map((item) => [item.id, item.time]));
for (const frame of targeted.frames || []) frameTimes.set(frame.id, frame.time);
for (const artifact of derivedArtifacts.filter((item) => item.data.schemaVersion === "targeted-evidence-1.0")) {
  for (const frame of artifact.data.frames || []) frameTimes.set(`${basename(artifact.path)}#${frame.id}`, frame.time);
}
const derivedSourceIds = new Set((reconstruction.derivedSources || []).map((item) => item.id));
const sourceRefs = new Set([evidence.source?.video, evidence.source?.subtitles, ...derivedSourceIds].filter(Boolean));
const targetedActionMap = new Map((targeted.actions || []).map((item) => [item.id, item.frameIds || []]));
for (const frame of targeted.frames || []) {
  if (!targetedActionMap.has(frame.actionId)) targetedActionMap.set(frame.actionId, []);
  if (!targetedActionMap.get(frame.actionId).includes(frame.id)) targetedActionMap.get(frame.actionId).push(frame.id);
}
const captureExecutionProblems = [];
for (const action of protocol.captureActions || []) {
  const frameIds = targetedActionMap.get(action.id) || [];
  if (frameIds.length === 0) captureExecutionProblems.push(`${action.id}:no_targeted_frames`);
  for (const frameId of frameIds) if (!frameTimes.has(frameId)) captureExecutionProblems.push(`${action.id}:missing_frame:${frameId}`);
}
gate("targeted_capture_execution", captureExecutionProblems.length === 0, captureExecutionProblems.length ? "One or more probe-derived capture actions were not executed" : "Every capture action produced resolvable evidence", captureExecutionProblems);
const ocrActionIds = new Set((protocol.captureActions || []).filter((item) => ["ocr_review", "ui_state_review"].includes(item.mode)).map((item) => item.id));
const ocrFrameMap = new Map((ocr.frames || []).map((item) => [item.frameId, item]));
const ocrIds = new Set((ocr.frames || []).flatMap((item) => (item.lines || []).map((line) => line.id)));
for (const frame of ocr.frames || []) for (const line of frame.lines || []) frameTimes.set(line.id, frame.time);
for (const artifact of derivedArtifacts.filter((item) => item.data.schemaVersion === "ocr-evidence-1.0")) {
  for (const frame of artifact.data.frames || []) for (const line of frame.lines || []) {
    const alias = `${basename(artifact.path)}#${line.id}`;
    ocrIds.add(alias);
    frameTimes.set(alias, frame.time);
  }
}
const ocrExecutionProblems = [];
for (const actionId of ocrActionIds) {
  const frameIds = targetedActionMap.get(actionId) || [];
  for (const frameId of frameIds) {
    const record = ocrFrameMap.get(frameId);
    if (!record || !["processed", "failed"].includes(record.status)) ocrExecutionProblems.push(`${actionId}:${frameId}:ocr_not_executed`);
  }
}
gate("ocr_and_ui_evidence_execution", ocrExecutionProblems.length === 0, ocrExecutionProblems.length ? "OCR/UI actions have frames without an executed recognition pass" : (ocrActionIds.size ? "Every OCR/UI frame has a terminal recognition result" : "Not applicable: protocol requested no OCR/UI action"), ocrExecutionProblems);
const units = reconstruction.knowledgeUnits || [];
const evidenceProblems = [];
const unsupportedProblems = [];
const timestampProblems = [];
const duration = evidence.media?.duration || 0;
const resolveRef = (ref) => {
  if (ref.refType === "cue") return cueIds.has(ref.ref);
  if (ref.refType === "shot") return shotIds.has(ref.ref);
  if (ref.refType === "frame") return frameTimes.has(ref.ref);
  if (ref.refType === "targeted_frame") return frameTimes.has(ref.ref);
  if (ref.refType === "ocr") return ocrIds.has(ref.ref);
  return ref.refType === "source" && sourceRefs.has(ref.ref);
};
for (const unit of units) {
  const evidenceRefs = unit.evidence || [];
  if (unit.importance === "core" && evidenceRefs.length === 0) evidenceProblems.push(`${unit.id}:core_without_evidence`);
  for (const ref of evidenceRefs) if (!resolveRef(ref)) evidenceProblems.push(`${unit.id}:bad_ref:${ref.refType}:${ref.ref}`);
  if (!unit.timeRange || unit.timeRange.start < 0 || unit.timeRange.end < unit.timeRange.start || unit.timeRange.end > duration + 0.25) timestampProblems.push(`${unit.id}:bad_range`);
  for (const ref of evidenceRefs) {
    const time = frameTimes.get(ref.ref);
    if (time !== undefined && (time < unit.timeRange.start - 0.5 || time > unit.timeRange.end + 0.5)) timestampProblems.push(`${unit.id}:frame_outside_range:${ref.ref}`);
  }
  if (unit.provenance === "system_inference" && (!unit.reasoning || evidenceRefs.length === 0)) unsupportedProblems.push(`${unit.id}:inference_without_reasoning_or_evidence`);
  if (unit.provenance !== "unknown" && !unit.statement) unsupportedProblems.push(`${unit.id}:positive_unit_without_statement`);
}
gate("core_evidence_references", evidenceProblems.length === 0, evidenceProblems.length ? "Core evidence references are missing or invalid" : "All core evidence references resolve", evidenceProblems.slice(0, 30));
gate("internal_unsupported_inference", unsupportedProblems.length === 0, unsupportedProblems.length ? "Unsupported internal inferences found" : "Inference provenance and reasoning are explicit", unsupportedProblems);
gate("internal_timestamp_bounds", timestampProblems.length === 0, timestampProblems.length ? "Time ranges or frame localization are invalid" : "All unit ranges and frame references fit the source timeline", timestampProblems.slice(0, 30));

const proceduralUnits = units.filter((unit) => unit.procedural);
const procedureProblems = [];
for (const unit of proceduralUnits) {
  const item = unit.procedural;
  if (!item.input || !Array.isArray(item.actions) || item.actions.length === 0 || !Array.isArray(item.parameters) || !item.output || !Array.isArray(item.beforeFrames) || item.beforeFrames.length === 0 || !Array.isArray(item.duringFrames) || item.duringFrames.length === 0 || !Array.isArray(item.afterFrames) || item.afterFrames.length === 0 || !Array.isArray(item.unknowns)) procedureProblems.push(unit.id);
  for (const id of [...(item.beforeFrames || []), ...(item.duringFrames || []), ...(item.afterFrames || [])].filter(Boolean)) if (!frameTimes.has(id)) procedureProblems.push(`${unit.id}:${id}`);
}
gate("internal_process_dependencies", procedureProblems.length === 0, proceduralUnits.length ? (procedureProblems.length ? "Procedural dependencies incomplete" : `Validated ${proceduralUnits.length} procedural units`) : "Not applicable: no procedural units declared", procedureProblems);

const channelRows = reconstruction.coverageMatrix?.channels || [];
const carrierInspectionProblems = [
  ...carrierContractProblems(probe.informationCarriers || [], "probe"),
  ...carrierContractProblems(channelRows, "reconstruction")
];
gate("carrier_inspection_contract", carrierInspectionProblems.length === 0,
  carrierInspectionProblems.length ? "Carrier inspection status conflicts with compatibility fields or lacks rationale" : "Carrier inspection statuses are coherent",
  carrierInspectionProblems);
const coveredChannelIds = new Set(channelRows.filter(carrierIsClosed).map((item) => item.id));
const uncoveredChannels = availableCarriers.map((item) => item.id).filter((id) => !coveredChannelIds.has(id));
const meaningRows = reconstruction.coverageMatrix?.meaningChanges || [];
const capturedMeaningIds = new Set(meaningRows.filter((item) => item.captured).map((item) => item.id));
const missingMeaning = (probe.meaningChanges || []).map((item) => item.id).filter((id) => !capturedMeaningIds.has(id));
const relationshipRows = reconstruction.coverageMatrix?.relationships || [];
const evidencedRelationshipIds = new Set(relationshipRows.filter((item) => item.evidenced).map((item) => item.id));
const missingRelationships = (probe.relationshipHypotheses || []).map((item) => item.id).filter((id) => !evidencedRelationshipIds.has(id));
const criticalRows = reconstruction.coverageMatrix?.criticalQuestions || [];
const criticalIds = (probe.criticalQuestions || []).filter((item) => item.criticality === "critical").map((item) => item.id);
const coveredQuestions = new Set(criticalRows.filter((item) => ["answered", "unknown"].includes(item.status) && Array.isArray(item.evidenceRefs) && item.evidenceRefs.length).map((item) => item.id));
const missingQuestions = criticalIds.filter((id) => !coveredQuestions.has(id));
const invalidQuestionEvidence = criticalRows.flatMap((item) => (item.evidenceRefs || []).filter((id) => !cueIds.has(id) && !shotIds.has(id) && !frameTimes.has(id) && !sourceRefs.has(id)).map((id) => `${item.id}:${id}`));
const unitIds = new Set(units.map((item) => item.id));
const coverageRefResolves = (id) => cueIds.has(id) || shotIds.has(id) || frameTimes.has(id) || sourceRefs.has(id);
const invalidRelationshipEvidence = relationshipRows.flatMap((item) => {
  const refs = item.evidenceRefs || [];
  if (item.evidenced && refs.length === 0) return [`${item.id}:no_evidence`];
  return refs.filter((id) => !coverageRefResolves(id)).map((id) => `${item.id}:${id}`);
});
const invalidCoverageUnitIds = [
  ...meaningRows.flatMap((item) => (item.unitIds || []).filter((id) => !unitIds.has(id)).map((id) => `${item.id}:${id}`)),
  ...criticalRows.flatMap((item) => (item.unitIds || []).filter((id) => !unitIds.has(id)).map((id) => `${item.id}:${id}`))
];
const cueRows = reconstruction.coverageMatrix?.cueAccountability || [];
const cueRowIds = cueRows.map((item) => item.cueId);
const cueAccountabilityProblems = [
  ...packCues.filter((cue) => cueRowIds.filter((id) => id === cue.id).length !== 1).map((cue) => `${cue.id}:row_count`),
  ...cueRows.filter((row) => !cueIds.has(row.cueId)).map((row) => `${row.cueId}:unknown_cue`),
  ...cueRows.flatMap((row) => (row.unitIds || []).filter((id) => !unitIds.has(id)).map((id) => `${row.cueId}:unknown_unit:${id}`)),
  ...cueRows.filter((row) => ["knowledge", "context"].includes(row.disposition) && !(row.unitIds || []).length).map((row) => `${row.cueId}:missing_unit_link`),
  ...cueRows.filter((row) => !row.rationale).map((row) => `${row.cueId}:missing_rationale`)
];
const coreUnits = units.filter((item) => item.importance === "core");
const evidencedCoreUnits = coreUnits.filter((item) => (item.evidence || []).length > 0);
const declaredCore = reconstruction.coverageMatrix?.coreEvidence || {};
const coreCountMismatch = declaredCore.covered !== evidencedCoreUnits.length || declaredCore.total !== coreUnits.length;
const coverageProblems = [
  ...uncoveredChannels.map((id) => `channel:${id}`),
  ...missingMeaning.map((id) => `meaning:${id}`),
  ...missingRelationships.map((id) => `relationship:${id}`),
  ...invalidRelationshipEvidence.map((id) => `relationship_evidence:${id}`),
  ...missingQuestions.map((id) => `question:${id}`),
  ...invalidQuestionEvidence.map((id) => `question_evidence:${id}`),
  ...invalidCoverageUnitIds.map((id) => `coverage_unit:${id}`),
  ...cueAccountabilityProblems.map((id) => `cue_accountability:${id}`),
  ...(reconstruction.relations || []).filter((item) => item.from === item.to).map((item) => `self_relation:${item.from}:${item.relation}`),
  ...(coreCountMismatch ? [`core_evidence_count:${declaredCore.covered}/${declaredCore.total}!=${evidencedCoreUnits.length}/${coreUnits.length}`] : []),
  ...((reconstruction.coverageMatrix?.uncheckedChannels || []).map((id) => `declared_unchecked:${id}`))
];
gate("coverage_matrix", coverageProblems.length === 0, coverageProblems.length ? "Coverage matrix has gaps" : "Channels, meaning changes, relationships, critical questions, and core evidence are accounted for", coverageProblems);

const meta = reconstruction.metaGate || {};
const metaQuestionMatches = meta.questionId === "uncovered_information_audit"
  || (typeof meta.question === "string" && meta.question.trim().length > 0);
const metaPass = metaQuestionMatches && meta.pass === true && !(meta.uncheckedChannels || []).length && !(meta.overlookedMeaningChanges || []).length && !(meta.overlookedRelationships || []).length;
gate("internal_meta_gate", metaPass, metaPass ? "Internal meta-gate found no unchecked closure" : "Internal meta-gate failed", [...(meta.uncheckedChannels || []), ...(meta.overlookedMeaningChanges || []), ...(meta.overlookedRelationships || [])]);

const eg = evaluation.gates || {};
const metric = (item) => ratio(item?.numerator || 0, item?.denominator || 0);
const errorMetric = (item) => ratio(item?.errors || 0, item?.total || 0);
gate("eval_critical_question_recall", metric(eg.criticalQuestionRecall) >= 0.85, `ratio=${metric(eg.criticalQuestionRecall).toFixed(3)}`, eg.criticalQuestionRecall?.examples || []);
gate("eval_evidence_coverage", metric(eg.evidenceCoverage) >= 0.90, `ratio=${metric(eg.evidenceCoverage).toFixed(3)}`, eg.evidenceCoverage?.examples || []);
gate("eval_unsupported_inference", errorMetric(eg.unsupportedInference) <= 0.05, `error_ratio=${errorMetric(eg.unsupportedInference).toFixed(3)}`, eg.unsupportedInference?.examples || []);
gate("eval_timestamp_accuracy", metric(eg.timestampAccuracy) >= 0.90, `ratio=${metric(eg.timestampAccuracy).toFixed(3)}`, eg.timestampAccuracy?.examples || []);
const processMetric = eg.processDependencyCompleteness || {};
const processPass = processMetric.applicable === false || (processMetric.denominator > 0 && ratio(processMetric.numerator, processMetric.denominator) >= 0.85);
gate("eval_process_dependency_completeness", processPass, processMetric.applicable === false ? `not_applicable:${processMetric.rationale || ""}` : `ratio=${ratio(processMetric.numerator, processMetric.denominator).toFixed(3)}`);
gate("eval_unknown_discipline", metric(eg.unknownDiscipline) >= 0.90, `ratio=${metric(eg.unknownDiscipline).toFixed(3)}`, eg.unknownDiscipline?.examples || []);
gate("eval_unchecked_channels", Array.isArray(eg.uncheckedChannels) && eg.uncheckedChannels.length === 0, eg.uncheckedChannels?.length ? "Independent evaluator found unchecked channels" : "No unchecked channels", eg.uncheckedChannels || []);
const em = evaluation.metaAudit || {};
const independentMetaPass = em.pass === true && !(em.unguardedCarriers || []).length && !(em.unguardedMeaningChanges || []).length && !(em.unguardedRelationships || []).length;
gate("eval_meta_gate", independentMetaPass, independentMetaPass ? "Independent meta-audit passed" : "Independent meta-audit found unguarded closures", [...(em.unguardedCarriers || []), ...(em.unguardedMeaningChanges || []), ...(em.unguardedRelationships || [])]);

const ready = gates.every((item) => item.pass);
const report = { schemaVersion: "reconstruction-gate-report-1.0", generatedAt: new Date().toISOString(), ready, gates, judges: evaluation.judges || {}, failedGateIds: gates.filter((item) => !item.pass).map((item) => item.id) };
writeJson(out, report);
process.stdout.write(`${JSON.stringify({ out, ready, passed: gates.filter((item) => item.pass).length, total: gates.length, failed: report.failedGateIds })}\n`);
if (!ready) process.exitCode = 2;
