import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type EvidenceRef = { refType?: string; ref?: string };
type Carrier = {
  id?: string;
  name?: string;
  modalityKeys?: string[];
  discoveredIn?: string[];
  available?: boolean;
  inspected?: boolean;
  inspectionStatus?: "absent" | "unchecked" | "checked_readable" | "checked_unreadable";
  inspectionRationale?: string;
};
type ReconstructionLike = {
  schemaVersion?: string;
  transcript?: { cues?: Array<Record<string, unknown>> };
  knowledgeUnits?: Array<{
    id?: string;
    importance?: string;
    timeRange?: { start?: number; end?: number };
    evidence?: EvidenceRef[];
  }>;
  relations?: Array<{ from?: string; to?: string; evidence?: EvidenceRef[] }>;
  derivedSources?: Array<{ id?: string; path?: string }>;
  coverageMatrix?: {
    channels?: Carrier[];
    cueAccountability?: Array<{
      cueId?: string;
      disposition?: "knowledge" | "context" | "nonsemantic" | "uncertain";
      unitIds?: string[];
    }>;
    criticalQuestions?: Array<{ unitIds?: string[] }>;
    uncheckedChannels?: string[];
  };
  metaGate?: {
    pass?: boolean;
    uncheckedChannels?: string[];
    overlookedMeaningChanges?: string[];
    overlookedRelationships?: string[];
  };
  builderLenses?: {
    contentRestoration?: {
      summary?: string;
      blocks?: Array<{
        id?: string;
        type?: string;
        body?: string;
        evidenceRefs?: string[];
        frameRefs?: string[];
        visuals?: Array<{ ref?: string }>;
        beforeFrameRef?: string;
        afterFrameRef?: string;
        steps?: Array<{ frameRefs?: string[] }>;
      }>;
    };
    directingLogic?: {
      stages?: Array<{ label?: string; function?: string; cognitiveChange?: string; evidenceRefs?: string[] }>;
      informationDesign?: Array<{ evidenceRefs?: string[] }>;
      proofDesign?: Array<{ evidenceRefs?: string[] }>;
    };
    visualEditing?: {
      carriers?: Array<Record<string, unknown>>;
      claims?: Array<{ evidenceRefs?: string[] }>;
      shotSemantics?: Array<{ evidenceRefs?: string[] }>;
      uiProcedureStates?: Array<{ evidenceRefs?: string[] }>;
      transitions?: Array<{ evidenceRefs?: string[] }>;
      rhythm?: Array<{ evidenceRefs?: string[] }>;
      missingBridges?: Array<{ evidenceRefs?: string[] }>;
    };
  };
};

type EvidencePackLike = {
  media?: { duration?: number };
  shots?: Array<{ id?: string }>;
  frameIndex?: Array<{ id?: string; time?: number }>;
  transcript?: { cues?: Array<Record<string, unknown>> };
};

type ProbeLike = { informationCarriers?: Carrier[] };

function exists(file: string): boolean {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function fail(code: string, detail?: string): never {
  throw new Error(`BUILDER_INTEGRITY_${code}${detail ? `:${detail}` : ""}`);
}

function ids(values: Array<{ id?: string }> | undefined): Set<string> {
  return new Set((values ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)));
}

export function carrierInspectionStatus(carrier: Carrier): "absent" | "unchecked" | "checked_readable" | "checked_unreadable" {
  return carrier.inspectionStatus ?? (!carrier.available ? "absent" : carrier.inspected ? "checked_readable" : "unchecked");
}

function invalidCarrierInspectionContract(carrier: Carrier): boolean {
  if (!carrier.inspectionStatus) return false;
  const expected = carrier.inspectionStatus === "absent"
    ? { available: false, inspected: carrier.inspected }
    : carrier.inspectionStatus === "unchecked"
      ? { available: true, inspected: false }
      : { available: true, inspected: true };
  return carrier.available !== expected.available || carrier.inspected !== expected.inspected ||
    !carrier.inspectionRationale?.trim();
}

function cueContract(cue: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(["id", "start", "end", "text", "representativeFrame", "overlappingShots"]
    .map((key) => [key, cue[key]]));
}

export type BuilderIntegrityReport = {
  transcriptCues: number;
  accountableCues: number;
  knowledgeUnits: number;
  coreUnits: number;
  evidenceReferences: number;
  availableChannels: number;
  inspectedChannels: number;
  builderLensEvidenceReferences: number;
};

function normalizedMeaning(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function builderLensRefs(reconstruction: ReconstructionLike): string[] {
  const lenses = reconstruction.builderLenses;
  if (!lenses) return [];
  const content = lenses.contentRestoration?.blocks ?? [];
  return [
    ...content.flatMap((block) => [
      ...(block.evidenceRefs ?? []), ...(block.frameRefs ?? []),
      ...(block.visuals ?? []).flatMap((visual) => visual.ref ? [visual.ref] : []),
      ...(block.beforeFrameRef ? [block.beforeFrameRef] : []),
      ...(block.afterFrameRef ? [block.afterFrameRef] : []),
      ...(block.steps ?? []).flatMap((step) => step.frameRefs ?? [])
    ]),
    ...(lenses.directingLogic?.stages ?? []).flatMap((stage) => stage.evidenceRefs ?? []),
    ...(lenses.directingLogic?.informationDesign ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.directingLogic?.proofDesign ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.visualEditing?.claims ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.visualEditing?.shotSemantics ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.visualEditing?.uiProcedureStates ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.visualEditing?.transitions ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.visualEditing?.rhythm ?? []).flatMap((item) => item.evidenceRefs ?? []),
    ...(lenses.visualEditing?.missingBridges ?? []).flatMap((item) => item.evidenceRefs ?? [])
  ];
}

export function validateBuilderIntegrity(outputDir: string, videoPath: string): BuilderIntegrityReport {
  const manifest = readJson<{
    sourceMedia?: { fingerprint?: string };
    transcript?: { path?: string | null; fingerprint?: string | null };
    evidencePack?: { path?: string; fingerprint?: string };
  }>(path.join(outputDir, "media-preparation.json"));
  const evidencePath = path.join(outputDir, "evidence/evidence-pack.json");
  const targetedPath = path.join(outputDir, "targeted-evidence/targeted-evidence.json");
  const ocrPath = path.join(outputDir, "targeted-evidence/ocr-evidence.json");
  const reconstructionPath = path.join(outputDir, "reconstruction.json");
  const probePath = path.join(outputDir, "probe.json");
  if (manifest.sourceMedia?.fingerprint !== sha256(videoPath)) fail("MEDIA_FINGERPRINT");
  if (manifest.evidencePack?.path !== evidencePath || manifest.evidencePack.fingerprint !== sha256(evidencePath)) {
    fail("EVIDENCE_FINGERPRINT");
  }
  if (manifest.transcript?.path && manifest.transcript.fingerprint !== sha256(manifest.transcript.path)) {
    fail("TRANSCRIPT_FINGERPRINT");
  }

  const pack = readJson<EvidencePackLike>(evidencePath);
  const targeted = readJson<{ frames?: Array<{ id?: string; time?: number }> }>(targetedPath);
  const ocr = exists(ocrPath) ? readJson<{
    frames?: Array<{ frameId?: string; time?: number; lines?: Array<{ id?: string }> }>
  }>(ocrPath) : null;
  const reconstruction = readJson<ReconstructionLike>(reconstructionPath);
  const probe = readJson<ProbeLike>(probePath);
  const sourceCues = pack.transcript?.cues ?? [];
  const outputCues = reconstruction.transcript?.cues ?? [];
  if (sourceCues.length !== outputCues.length) fail("CUE_COUNT", `${outputCues.length}/${sourceCues.length}`);
  for (let index = 0; index < sourceCues.length; index += 1) {
    if (JSON.stringify(cueContract(sourceCues[index] ?? {})) !== JSON.stringify(cueContract(outputCues[index] ?? {}))) {
      fail("CUE_DRIFT", String(index));
    }
  }

  const sourceCueIds = ids(sourceCues as Array<{ id?: string }>);
  const units = reconstruction.knowledgeUnits ?? [];
  const unitIds = ids(units);
  const accountability = reconstruction.coverageMatrix?.cueAccountability ?? [];
  const accountedIds = accountability.map((row) => row.cueId).filter((id): id is string => Boolean(id));
  if (accountedIds.length !== sourceCueIds.size || new Set(accountedIds).size !== sourceCueIds.size ||
      accountedIds.some((id) => !sourceCueIds.has(id))) fail("CUE_ACCOUNTABILITY");
  for (const row of accountability) {
    if ((row.unitIds ?? []).some((id) => !unitIds.has(id))) fail("CUE_UNIT_REFERENCE", row.cueId);
    if ((row.disposition === "knowledge" || row.disposition === "context") && !(row.unitIds ?? []).length) {
      fail("CUE_UNIT_LINK_MISSING", row.cueId);
    }
  }

  const shotIds = ids(pack.shots);
  const frameIds = ids(pack.frameIndex);
  const targetedIds = ids(targeted.frames);
  const ocrIds = new Set((ocr?.frames ?? []).flatMap((item) => item.lines ?? [])
    .map((item) => item.id).filter((id): id is string => Boolean(id)));
  const sourceIds = ids(reconstruction.derivedSources);
  const allEvidenceIds = new Set([...sourceCueIds, ...shotIds, ...frameIds, ...targetedIds, ...ocrIds, ...sourceIds]);
  const frameTimes = new Map<string, number>();
  for (const frame of pack.frameIndex ?? []) if (frame.id && Number.isFinite(frame.time)) frameTimes.set(frame.id, Number(frame.time));
  for (const frame of targeted.frames ?? []) if (frame.id && Number.isFinite(frame.time)) frameTimes.set(frame.id, Number(frame.time));
  for (const frame of ocr?.frames ?? []) for (const line of frame.lines ?? []) {
    if (line.id && Number.isFinite(frame.time)) frameTimes.set(line.id, Number(frame.time));
  }
  const references = [
    ...units.flatMap((unit) => unit.evidence ?? []),
    ...(reconstruction.relations ?? []).flatMap((relation) => relation.evidence ?? [])
  ];
  for (const reference of references) {
    const ref = reference.ref;
    if (!ref) fail("EMPTY_REFERENCE");
    const valid = reference.refType === "cue" ? sourceCueIds.has(ref)
      : reference.refType === "shot" ? shotIds.has(ref)
        : reference.refType === "frame" ? frameIds.has(ref)
          : reference.refType === "targeted_frame" ? targetedIds.has(ref)
            : reference.refType === "ocr" ? ocrIds.has(ref)
              : reference.refType === "source" ? sourceIds.has(ref) : false;
    if (!valid) fail("DANGLING_REFERENCE", `${reference.refType}:${ref}`);
  }
  for (const relation of reconstruction.relations ?? []) {
    if (!relation.from || !unitIds.has(relation.from) || !relation.to || !unitIds.has(relation.to)) {
      fail("RELATION_UNIT_REFERENCE");
    }
  }

  const lensReferences = builderLensRefs(reconstruction);
  if (reconstruction.schemaVersion === "video-reconstruction-2.0") {
    const lenses = reconstruction.builderLenses;
    if (!lenses?.contentRestoration?.blocks?.length || !lenses.directingLogic?.stages?.length ||
        !lenses.visualEditing?.carriers?.length || !lenses.visualEditing?.claims?.length ||
        !lenses.visualEditing?.shotSemantics?.length || !lenses.visualEditing?.rhythm?.length) fail("BUILDER_LENSES_INCOMPLETE");
    const danglingLensRefs = [...new Set(lensReferences.filter((ref) => !allEvidenceIds.has(ref)))];
    if (danglingLensRefs.length > 0) fail("BUILDER_LENS_DANGLING_REFERENCE", danglingLensRefs.join(","));
    const contentBlocks = lenses.contentRestoration.blocks;
    if (contentBlocks.some((block) => !(block.body?.trim()) || !(block.evidenceRefs?.length))) {
      fail("CONTENT_BLOCK_EVIDENCE");
    }
    const visualBlockTypes = new Set(["single_frame", "annotated_crop", "before_after", "operation_sequence", "frame_strip"]);
    if (contentBlocks.some((block) => visualBlockTypes.has(block.type ?? "") &&
      !(block.visuals?.length || block.frameRefs?.length || block.beforeFrameRef || block.afterFrameRef || block.steps?.length))) {
      fail("CONTENT_BLOCK_VISUAL_MISSING");
    }
    const stages = lenses.directingLogic.stages ?? [];
    const meanings = stages.map((stage) => normalizedMeaning(`${stage.function} ${stage.cognitiveChange}`));
    if (meanings.some((value) => !value) || new Set(meanings).size !== meanings.length) {
      fail("DIRECTING_STAGE_REPETITION");
    }
  }
  for (const question of reconstruction.coverageMatrix?.criticalQuestions ?? []) {
    if ((question.unitIds ?? []).some((id) => !unitIds.has(id))) fail("QUESTION_UNIT_REFERENCE");
  }

  const duration = Number(pack.media?.duration ?? 0);
  const evidenceTimeViolations: string[] = [];
  for (const unit of units) {
    const start = Number(unit.timeRange?.start);
    const end = Number(unit.timeRange?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end > duration + 0.5) {
      fail("UNIT_TIME_RANGE", unit.id);
    }
    for (const reference of unit.evidence ?? []) {
      const evidenceTime = reference.ref ? frameTimes.get(reference.ref) : undefined;
      if (evidenceTime !== undefined && (evidenceTime < start - 0.5 || evidenceTime > end + 0.5)) {
        evidenceTimeViolations.push(`${unit.id}:${reference.ref}`);
      }
    }
  }
  if (evidenceTimeViolations.length > 0) fail("EVIDENCE_TIME_RANGE", evidenceTimeViolations.join(","));
  for (const source of reconstruction.derivedSources ?? []) {
    if (!source.path) fail("DERIVED_SOURCE_PATH");
    const resolved = path.resolve(outputDir, source.path);
    const root = path.resolve(outputDir);
    if (!resolved.startsWith(`${root}${path.sep}`) || !exists(resolved)) fail("DERIVED_SOURCE_MISSING", source.path);
  }

  const channels = reconstruction.coverageMatrix?.channels ?? [];
  const invalidCarrierIds = [
    ...(probe.informationCarriers ?? []).filter(invalidCarrierInspectionContract)
      .map((carrier) => `probe:${carrier.id ?? "unknown"}`),
    ...channels.filter(invalidCarrierInspectionContract)
      .map((carrier) => `reconstruction:${carrier.id ?? "unknown"}`)
  ];
  if (invalidCarrierIds.length > 0) fail("CARRIER_STATUS", invalidCarrierIds.join(","));
  const availableChannels = channels.filter((channel) => channel.available);
  if (availableChannels.some((channel) => !["checked_readable", "checked_unreadable"].includes(carrierInspectionStatus(channel)))) {
    fail("UNCHECKED_AVAILABLE_CHANNEL");
  }
  if ((reconstruction.coverageMatrix?.uncheckedChannels ?? []).length > 0) fail("UNCHECKED_CHANNELS");
  const meta = reconstruction.metaGate;
  if (meta?.pass !== true || (meta.uncheckedChannels ?? []).length > 0 ||
      (meta.overlookedMeaningChanges ?? []).length > 0 || (meta.overlookedRelationships ?? []).length > 0) {
    fail("META_GATE");
  }

  return {
    transcriptCues: sourceCues.length,
    accountableCues: accountability.length,
    knowledgeUnits: units.length,
    coreUnits: units.filter((unit) => unit.importance === "core").length,
    evidenceReferences: references.length,
    availableChannels: availableChannels.length,
    inspectedChannels: availableChannels.filter((channel) => ["checked_readable", "checked_unreadable"].includes(carrierInspectionStatus(channel))).length,
    builderLensEvidenceReferences: lensReferences.length
  };
}
